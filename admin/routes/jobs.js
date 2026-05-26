/**
 * Job Management API Routes
 * CRUD for contractor jobs with NJ HIC compliance enforcement.
 *
 * Routes:
 *   GET    /api/jobs           — List all jobs (filterable by status)
 *   GET    /api/jobs/stats     — Dashboard statistics
 *   GET    /api/jobs/:id       — Get single job
 *   POST   /api/jobs           — Create job
 *   PUT    /api/jobs/:id       — Update job
 *   DELETE /api/jobs/:id       — Delete job (only if status is 'lead' or 'cancelled')
 *   POST   /api/jobs/:id/notes — Add a note to a job
 */

import { Router } from 'express';
import { createStore } from '../lib/data-store.js';
import { JOB_STATUSES, NJ_HIC, requiresLeadPaintDisclosure } from '../lib/nj-compliance.js';

const router = Router();
const jobs = createStore('jobs');

// List all jobs, optionally filtered by status
router.get('/', async (req, res) => {
  try {
    let records = await jobs.getAll();

    if (req.query.status) {
      const status = req.query.status;
      if (!JOB_STATUSES.includes(status)) {
        return res
          .status(400)
          .json({ error: `Invalid status. Must be one of: ${JOB_STATUSES.join(', ')}` });
      }
      records = records.filter(j => j.status === status);
    }

    // Sort by updated_at descending (most recent first)
    records.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load jobs' });
  }
});

// Dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const all = await jobs.getAll();
    const stats = {
      total: all.length,
      by_status: {},
      total_value: 0,
      active_value: 0,
    };

    for (const status of JOB_STATUSES) {
      stats.by_status[status] = 0;
    }

    const activeStatuses = ['contracted', 'permitted', 'scheduled', 'in_progress', 'punch_list'];

    for (const job of all) {
      if (stats.by_status[job.status] !== undefined) {
        stats.by_status[job.status]++;
      }
      const price = Number(job.total_price) || 0;
      stats.total_value += price;
      if (activeStatuses.includes(job.status)) {
        stats.active_value += price;
      }
    }

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute stats' });
  }
});

// Get single job
router.get('/:id', async (req, res) => {
  try {
    const job = await jobs.getById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load job' });
  }
});

// Create job
router.post('/', async (req, res) => {
  try {
    const {
      homeowner_name,
      homeowner_phone,
      homeowner_email,
      property_address,
      property_city,
      property_zip,
      year_built,
      scope_of_work,
      estimated_total,
      notes,
    } = req.body;

    if (!homeowner_name || !property_address) {
      return res.status(400).json({ error: 'homeowner_name and property_address are required' });
    }

    const job = await jobs.create({
      // Homeowner info
      homeowner_name: String(homeowner_name).trim(),
      homeowner_phone: homeowner_phone ? String(homeowner_phone).trim() : '',
      homeowner_email: homeowner_email ? String(homeowner_email).trim() : '',

      // Property
      property_address: String(property_address).trim(),
      property_city: property_city ? String(property_city).trim() : '',
      property_zip: property_zip ? String(property_zip).trim() : '',
      year_built: year_built ? Number(year_built) : null,

      // NJ compliance flags
      lead_paint_disclosure_required: requiresLeadPaintDisclosure(
        year_built ? Number(year_built) : null
      ),
      permit_required: null, // To be determined during estimate phase
      hic_number: NJ_HIC.LICENSE_NUMBER,

      // Job details
      status: 'lead',
      scope_of_work: scope_of_work ? String(scope_of_work).trim() : '',
      estimated_total: estimated_total ? Number(estimated_total) : 0,
      total_price: 0, // Set when contract is signed
      deposit_collected: 0,
      amount_paid: 0,
      amount_due: 0,

      // Dates
      estimated_start: null,
      estimated_completion: null,
      actual_start: null,
      actual_completion: null,

      // Notes log (append-only within the job)
      notes: notes ? [{ text: String(notes).trim(), date: new Date().toISOString() }] : [],

      // Change orders
      change_orders: [],
    });

    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// Update job
router.put('/:id', async (req, res) => {
  try {
    const existing = await jobs.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Job not found' });

    // Validate status transition if changing status
    if (req.body.status && req.body.status !== existing.status) {
      if (!JOB_STATUSES.includes(req.body.status)) {
        return res
          .status(400)
          .json({ error: `Invalid status. Must be one of: ${JOB_STATUSES.join(', ')}` });
      }
    }

    // Validate deposit against NJ max (1/3 rule)
    if (req.body.deposit_collected !== undefined && req.body.total_price !== undefined) {
      const total = Number(req.body.total_price);
      const deposit = Number(req.body.deposit_collected);
      const maxAllowed = Math.floor(total * NJ_HIC.MAX_DEPOSIT_RATIO * 100) / 100;
      if (deposit > maxAllowed && total > 0) {
        return res.status(400).json({
          error: `Deposit ($${deposit}) exceeds NJ maximum of 1/3 ($${maxAllowed}) per ${NJ_HIC.STATUTE}`,
        });
      }
    }

    // Recalculate amount_due
    const totalPrice = Number(req.body.total_price ?? existing.total_price) || 0;
    const amountPaid = Number(req.body.amount_paid ?? existing.amount_paid) || 0;
    const updates = {
      ...req.body,
      amount_due: Math.max(0, totalPrice - amountPaid),
    };

    // Refresh lead paint flag if year_built changed
    if (req.body.year_built !== undefined) {
      updates.lead_paint_disclosure_required = requiresLeadPaintDisclosure(
        Number(req.body.year_built)
      );
    }

    // Prevent mutation of notes array via PUT (use POST /:id/notes)
    delete updates.notes;
    delete updates.change_orders;

    const updated = await jobs.update(req.params.id, updates);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// Delete job (only leads and cancelled jobs)
router.delete('/:id', async (req, res) => {
  try {
    const existing = await jobs.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Job not found' });

    if (!['lead', 'cancelled'].includes(existing.status)) {
      return res.status(400).json({
        error: 'Only jobs with status "lead" or "cancelled" can be deleted. Change status first.',
      });
    }

    const deleted = await jobs.remove(req.params.id);
    res.json({ success: true, deleted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// Add note to job (append-only)
router.post('/:id/notes', async (req, res) => {
  try {
    const existing = await jobs.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Job not found' });

    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Note text is required' });
    }

    const notes = [
      ...(existing.notes || []),
      { text: text.trim(), date: new Date().toISOString() },
    ];
    const updated = await jobs.update(req.params.id, { notes });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add note' });
  }
});

export default router;
