/**
 * Estimate Management API Routes
 * CRUD for job estimates with NJ-compliant formatting.
 *
 * Estimates tie to jobs and use the calculator engine's material data.
 *
 * Routes:
 *   GET    /api/estimates           — List all estimates
 *   GET    /api/estimates/:id       — Get single estimate
 *   POST   /api/estimates           — Create estimate for a job
 *   PUT    /api/estimates/:id       — Update estimate
 *   DELETE /api/estimates/:id       — Delete draft estimate
 *   POST   /api/estimates/:id/send  — Mark estimate as sent to homeowner
 */

import { Router } from 'express';
import { createStore } from '../lib/data-store.js';
import { NJ_HIC, ESTIMATE_CATEGORIES, maxDeposit } from '../lib/nj-compliance.js';

const router = Router();
const estimates = createStore('estimates');

// List all estimates, optionally filtered by job_id or status
router.get('/', async (req, res) => {
  try {
    let records = await estimates.getAll();

    if (req.query.job_id) {
      records = records.filter(e => e.job_id === req.query.job_id);
    }
    if (req.query.status) {
      records = records.filter(e => e.status === req.query.status);
    }

    records.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load estimates' });
  }
});

// Get single estimate
router.get('/:id', async (req, res) => {
  try {
    const est = await estimates.getById(req.params.id);
    if (!est) return res.status(404).json({ error: 'Estimate not found' });
    res.json(est);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load estimate' });
  }
});

// Create estimate
router.post('/', async (req, res) => {
  try {
    const { job_id, homeowner_name, property_address, line_items, notes, valid_days } = req.body;

    if (!job_id) {
      return res.status(400).json({ error: 'job_id is required' });
    }

    // Validate and compute line items
    const items = Array.isArray(line_items) ? line_items : [];
    const validatedItems = items.map((item, i) => ({
      line: i + 1,
      category: ESTIMATE_CATEGORIES.includes(item.category) ? item.category : 'miscellaneous',
      description: String(item.description || '').trim(),
      quantity: Number(item.quantity) || 0,
      unit: String(item.unit || 'ea').trim(),
      unit_price: Number(item.unit_price) || 0,
      total: Math.round((Number(item.quantity) || 0) * (Number(item.unit_price) || 0) * 100) / 100,
    }));

    const subtotal = validatedItems.reduce((sum, item) => sum + item.total, 0);
    const tax_rate = 0.06625; // NJ sales tax (materials only, labor is exempt)
    const material_items = validatedItems.filter(
      i => i.category !== 'labor' && i.category !== 'demolition' && i.category !== 'disposal'
    );
    const material_subtotal = material_items.reduce((sum, i) => sum + i.total, 0);
    const tax = Math.round(material_subtotal * tax_rate * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    // Generate estimate number: EST-YYYY-NNNN
    const allEstimates = await estimates.getAll();
    const year = new Date().getFullYear();
    const yearEstimates = allEstimates.filter(e => e.estimate_number?.startsWith(`EST-${year}`));
    const seq = yearEstimates.length + 1;
    const estimate_number = `EST-${year}-${String(seq).padStart(4, '0')}`;

    const est = await estimates.create({
      estimate_number,
      job_id,
      status: 'draft',
      homeowner_name: homeowner_name ? String(homeowner_name).trim() : '',
      property_address: property_address ? String(property_address).trim() : '',
      line_items: validatedItems,
      subtotal,
      material_subtotal,
      tax_rate,
      tax,
      total,
      max_deposit: maxDeposit(total),
      valid_days: valid_days ? Number(valid_days) : 30,
      valid_until: new Date(Date.now() + (valid_days || 30) * 86400000).toISOString(),
      hic_number: NJ_HIC.LICENSE_NUMBER,
      notes: notes ? String(notes).trim() : '',
      sent_at: null,
    });

    res.status(201).json(est);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create estimate' });
  }
});

// Update estimate (only drafts)
router.put('/:id', async (req, res) => {
  try {
    const existing = await estimates.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Estimate not found' });

    if (existing.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft estimates can be edited' });
    }

    // Recalculate totals if line_items changed
    const updates = { ...req.body };
    if (updates.line_items) {
      const items = updates.line_items.map((item, i) => ({
        line: i + 1,
        category: ESTIMATE_CATEGORIES.includes(item.category) ? item.category : 'miscellaneous',
        description: String(item.description || '').trim(),
        quantity: Number(item.quantity) || 0,
        unit: String(item.unit || 'ea').trim(),
        unit_price: Number(item.unit_price) || 0,
        total:
          Math.round((Number(item.quantity) || 0) * (Number(item.unit_price) || 0) * 100) / 100,
      }));

      const subtotal = items.reduce((sum, i) => sum + i.total, 0);
      const material_items = items.filter(
        i => i.category !== 'labor' && i.category !== 'demolition' && i.category !== 'disposal'
      );
      const material_subtotal = material_items.reduce((sum, i) => sum + i.total, 0);
      const tax = Math.round(material_subtotal * (existing.tax_rate || 0.06625) * 100) / 100;

      updates.line_items = items;
      updates.subtotal = subtotal;
      updates.material_subtotal = material_subtotal;
      updates.tax = tax;
      updates.total = Math.round((subtotal + tax) * 100) / 100;
      updates.max_deposit = maxDeposit(updates.total);
    }

    const updated = await estimates.update(req.params.id, updates);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update estimate' });
  }
});

// Delete draft estimate
router.delete('/:id', async (req, res) => {
  try {
    const existing = await estimates.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Estimate not found' });

    if (existing.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft estimates can be deleted' });
    }

    const deleted = await estimates.remove(req.params.id);
    res.json({ success: true, deleted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete estimate' });
  }
});

// Mark estimate as sent
router.post('/:id/send', async (req, res) => {
  try {
    const existing = await estimates.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Estimate not found' });

    const updated = await estimates.update(req.params.id, {
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send estimate' });
  }
});

export default router;
