/**
 * Homeowner Management API Routes
 * CRM for tracking homeowners / clients.
 *
 * Routes:
 *   GET    /api/homeowners           — List all homeowners
 *   GET    /api/homeowners/:id       — Get single homeowner
 *   POST   /api/homeowners           — Create homeowner
 *   PUT    /api/homeowners/:id       — Update homeowner
 *   DELETE /api/homeowners/:id       — Delete homeowner (only if no jobs)
 */

import { Router } from 'express';
import { createStore } from '../lib/data-store.js';

const router = Router();
const homeowners = createStore('homeowners');
const jobStore = createStore('jobs');

// List all homeowners
router.get('/', async (req, res) => {
  try {
    let records = await homeowners.getAll();

    if (req.query.search) {
      const term = req.query.search.toLowerCase();
      records = records.filter(
        h =>
          h.name.toLowerCase().includes(term) ||
          h.email?.toLowerCase().includes(term) ||
          h.address?.toLowerCase().includes(term) ||
          h.phone?.includes(term)
      );
    }

    records.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load homeowners' });
  }
});

// Get single homeowner with their jobs
router.get('/:id', async (req, res) => {
  try {
    const hw = await homeowners.getById(req.params.id);
    if (!hw) return res.status(404).json({ error: 'Homeowner not found' });

    // Attach their jobs
    const allJobs = await jobStore.getAll();
    hw.jobs = allJobs.filter(
      j =>
        j.homeowner_name?.toLowerCase() === hw.name?.toLowerCase() &&
        j.property_address?.toLowerCase() === hw.address?.toLowerCase()
    );

    res.json(hw);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load homeowner' });
  }
});

// Create homeowner
router.post('/', async (req, res) => {
  try {
    const { name, phone, email, address, city, zip, year_built, source, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const hw = await homeowners.create({
      name: String(name).trim(),
      phone: phone ? String(phone).trim() : '',
      email: email ? String(email).trim() : '',
      address: address ? String(address).trim() : '',
      city: city ? String(city).trim() : '',
      zip: zip ? String(zip).trim() : '',
      year_built: year_built ? Number(year_built) : null,
      source: source ? String(source).trim() : 'direct', // referral, website, google, direct
      notes: notes ? String(notes).trim() : '',
      total_jobs: 0,
      total_spent: 0,
    });

    res.status(201).json(hw);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create homeowner' });
  }
});

// Update homeowner
router.put('/:id', async (req, res) => {
  try {
    const existing = await homeowners.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Homeowner not found' });

    // Sanitize input
    const updates = {};
    const allowedFields = [
      'name',
      'phone',
      'email',
      'address',
      'city',
      'zip',
      'year_built',
      'source',
      'notes',
    ];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] =
          field === 'year_built' ? Number(req.body[field]) || null : String(req.body[field]).trim();
      }
    }

    const updated = await homeowners.update(req.params.id, updates);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update homeowner' });
  }
});

// Delete homeowner (only if no associated jobs)
router.delete('/:id', async (req, res) => {
  try {
    const existing = await homeowners.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Homeowner not found' });

    // Check for associated jobs
    const allJobs = await jobStore.getAll();
    const hasJobs = allJobs.some(
      j =>
        j.homeowner_name?.toLowerCase() === existing.name?.toLowerCase() &&
        j.property_address?.toLowerCase() === existing.address?.toLowerCase()
    );

    if (hasJobs) {
      return res.status(400).json({
        error: 'Cannot delete homeowner with associated jobs. Delete or reassign jobs first.',
      });
    }

    const deleted = await homeowners.remove(req.params.id);
    res.json({ success: true, deleted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete homeowner' });
  }
});

export default router;
