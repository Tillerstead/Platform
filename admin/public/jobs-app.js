/**
 * Jobs Admin Page — Frontend Application
 * Manages jobs, estimates, and homeowners tabs.
 */

(function () {
  'use strict';

  // ── Init ──────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupTabs();
    setupModals();
    setupMobileMenu();
    loadStats();
    loadJobs();
  });

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/check');
      const data = await res.json();
      if (!data.authenticated) {
        window.location.href = '/login';
        return;
      }
      const el = document.getElementById('username');
      if (el) el.textContent = data.username || 'Admin';
    } catch {
      window.location.href = '/login';
    }
  }

  // ── Mobile Menu ───────────────────────────────────────
  function setupMobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    if (btn && sidebar) {
      btn.addEventListener('click', () => sidebar.classList.toggle('open'));
    }
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    });
  }

  // ── Tabs ──────────────────────────────────────────────
  function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('.tab-panel').forEach(p => {
          p.classList.remove('active');
          p.hidden = true;
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        const panel = document.getElementById('tab-' + btn.dataset.tab);
        if (panel) {
          panel.classList.add('active');
          panel.hidden = false;
        }
        // Lazy-load tab data
        if (btn.dataset.tab === 'estimates') loadEstimates();
        if (btn.dataset.tab === 'homeowners') loadHomeowners();
      });
    });

    // Status filter
    document.getElementById('statusFilter')?.addEventListener('change', () => loadJobs());

    // Homeowner search
    let searchTimeout;
    document.getElementById('hwSearch')?.addEventListener('input', e => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => loadHomeowners(e.target.value), 300);
    });
  }

  // ── Modal helpers ─────────────────────────────────────
  function setupModals() {
    // Job modal
    document.getElementById('newJobBtn')?.addEventListener('click', () => openJobModal());
    document
      .getElementById('cancelJobBtn')
      ?.addEventListener('click', () => closeModal('jobModal'));
    document.getElementById('jobForm')?.addEventListener('submit', saveJob);
    document
      .querySelector('#jobModal .modal-close')
      ?.addEventListener('click', () => closeModal('jobModal'));

    // Homeowner modal
    document.getElementById('newHomeownerBtn')?.addEventListener('click', () => openHwModal());
    document.getElementById('cancelHwBtn')?.addEventListener('click', () => closeModal('hwModal'));
    document.getElementById('hwForm')?.addEventListener('submit', saveHomeowner);
    document
      .querySelector('#hwModal .modal-close')
      ?.addEventListener('click', () => closeModal('hwModal'));
  }

  function closeModal(id) {
    const dialog = document.getElementById(id);
    if (dialog) dialog.close();
  }

  // ── Stats ─────────────────────────────────────────────
  async function loadStats() {
    try {
      const res = await fetch('/api/jobs/stats');
      const stats = await res.json();
      setText('stat-total', stats.total || 0);
      const active =
        (stats.by_status?.contracted || 0) +
        (stats.by_status?.permitted || 0) +
        (stats.by_status?.scheduled || 0) +
        (stats.by_status?.in_progress || 0) +
        (stats.by_status?.punch_list || 0);
      setText('stat-active', active);
      setText('stat-value', '$' + (stats.active_value || 0).toLocaleString());
      setText('stat-leads', stats.by_status?.lead || 0);
    } catch {
      setText('stat-total', '?');
    }
  }

  // ── Jobs ──────────────────────────────────────────────
  async function loadJobs() {
    const filter = document.getElementById('statusFilter')?.value || '';
    const url = filter ? '/api/jobs?status=' + encodeURIComponent(filter) : '/api/jobs';
    try {
      const res = await fetch(url);
      const jobs = await res.json();
      renderJobs(jobs);
    } catch {
      document.getElementById('jobsBody').innerHTML =
        '<tr><td colspan="7" class="empty-state">Failed to load jobs</td></tr>';
    }
  }

  function renderJobs(jobs) {
    const body = document.getElementById('jobsBody');
    if (!jobs.length) {
      body.innerHTML =
        '<tr><td colspan="7" class="empty-state">No jobs found. Click "+ New Job" to create one.</td></tr>';
      return;
    }
    body.innerHTML = jobs
      .map(
        j => `
      <tr>
        <td><strong>${esc(j.homeowner_name)}</strong></td>
        <td>${esc(j.property_address)}${j.property_city ? ', ' + esc(j.property_city) : ''}</td>
        <td><span class="status-badge status-${j.status}">${formatStatus(j.status)}</span></td>
        <td>$${(j.total_price || 0).toLocaleString()}</td>
        <td>$${(j.amount_due || 0).toLocaleString()}</td>
        <td class="hide-mobile">${j.lead_paint_disclosure_required ? '<span class="warning-badge">Yes</span>' : 'No'}</td>
        <td>
          <button class="btn btn-sm" onclick="window._editJob('${j.id}')">Edit</button>
          ${['lead', 'cancelled'].includes(j.status) ? `<button class="btn btn-sm btn-danger" onclick="window._deleteJob('${j.id}')">Delete</button>` : ''}
        </td>
      </tr>
    `
      )
      .join('');
  }

  function openJobModal(job) {
    const modal = document.getElementById('jobModal');
    document.getElementById('jobModalTitle').textContent = job ? 'Edit Job' : 'New Job';
    document.getElementById('jobId').value = job?.id || '';
    document.getElementById('jfName').value = job?.homeowner_name || '';
    document.getElementById('jfPhone').value = job?.homeowner_phone || '';
    document.getElementById('jfEmail').value = job?.homeowner_email || '';
    document.getElementById('jfAddress').value = job?.property_address || '';
    document.getElementById('jfCity').value = job?.property_city || '';
    document.getElementById('jfZip').value = job?.property_zip || '';
    document.getElementById('jfYearBuilt').value = job?.year_built || '';
    document.getElementById('jfStatus').value = job?.status || 'lead';
    document.getElementById('jfTotal').value = job?.total_price || '';
    document.getElementById('jfDeposit').value = job?.deposit_collected || '';
    document.getElementById('jfPaid').value = job?.amount_paid || '';
    document.getElementById('jfScope').value = job?.scope_of_work || '';
    modal.showModal();
  }

  async function saveJob(e) {
    e.preventDefault();
    const id = document.getElementById('jobId').value;
    const payload = {
      homeowner_name: document.getElementById('jfName').value,
      homeowner_phone: document.getElementById('jfPhone').value,
      homeowner_email: document.getElementById('jfEmail').value,
      property_address: document.getElementById('jfAddress').value,
      property_city: document.getElementById('jfCity').value,
      property_zip: document.getElementById('jfZip').value,
      year_built: document.getElementById('jfYearBuilt').value || null,
      status: document.getElementById('jfStatus').value,
      total_price: Number(document.getElementById('jfTotal').value) || 0,
      deposit_collected: Number(document.getElementById('jfDeposit').value) || 0,
      amount_paid: Number(document.getElementById('jfPaid').value) || 0,
      scope_of_work: document.getElementById('jfScope').value,
    };

    try {
      const url = id ? '/api/jobs/' + id : '/api/jobs';
      const method = id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to save job');
        return;
      }
      closeModal('jobModal');
      loadJobs();
      loadStats();
    } catch {
      alert('Failed to save job');
    }
  }

  // Global handlers for inline onclick
  window._editJob = async function (id) {
    const res = await fetch('/api/jobs/' + id);
    if (res.ok) openJobModal(await res.json());
  };

  window._deleteJob = async function (id) {
    if (!confirm('Delete this job? This cannot be undone.')) return;
    const res = await fetch('/api/jobs/' + id, { method: 'DELETE' });
    if (res.ok) {
      loadJobs();
      loadStats();
    } else {
      const d = await res.json();
      alert(d.error || 'Delete failed');
    }
  };

  // ── Estimates ─────────────────────────────────────────
  async function loadEstimates() {
    try {
      const res = await fetch('/api/estimates');
      const estimates = await res.json();
      renderEstimates(estimates);
    } catch {
      document.getElementById('estimatesBody').innerHTML =
        '<tr><td colspan="7" class="empty-state">Failed to load estimates</td></tr>';
    }
  }

  function renderEstimates(estimates) {
    const body = document.getElementById('estimatesBody');
    if (!estimates.length) {
      body.innerHTML =
        '<tr><td colspan="7" class="empty-state">No estimates yet. Create estimates from the Jobs tab.</td></tr>';
      return;
    }
    body.innerHTML = estimates
      .map(
        e => `
      <tr>
        <td><strong>${esc(e.estimate_number)}</strong></td>
        <td>${esc(e.homeowner_name)}</td>
        <td><span class="status-badge status-${e.status}">${e.status}</span></td>
        <td>$${(e.total || 0).toLocaleString()}</td>
        <td>$${(e.max_deposit || 0).toLocaleString()}</td>
        <td class="hide-mobile">${e.valid_until ? new Date(e.valid_until).toLocaleDateString() : '-'}</td>
        <td>
          ${e.status === 'draft' ? `<button class="btn btn-sm" onclick="window._sendEstimate('${e.id}')">Send</button>` : '<span class="status-badge status-sent">Sent</span>'}
        </td>
      </tr>
    `
      )
      .join('');
  }

  window._sendEstimate = async function (id) {
    if (!confirm('Mark this estimate as sent to homeowner?')) return;
    const res = await fetch('/api/estimates/' + id + '/send', { method: 'POST' });
    if (res.ok) loadEstimates();
  };

  // ── Homeowners ────────────────────────────────────────
  async function loadHomeowners(search) {
    const url = search ? '/api/homeowners?search=' + encodeURIComponent(search) : '/api/homeowners';
    try {
      const res = await fetch(url);
      const hws = await res.json();
      renderHomeowners(hws);
    } catch {
      document.getElementById('homeownersBody').innerHTML =
        '<tr><td colspan="6" class="empty-state">Failed to load homeowners</td></tr>';
    }
  }

  function renderHomeowners(hws) {
    const body = document.getElementById('homeownersBody');
    if (!hws.length) {
      body.innerHTML =
        '<tr><td colspan="6" class="empty-state">No homeowners found. Click "+ New Homeowner" to add one.</td></tr>';
      return;
    }
    body.innerHTML = hws
      .map(
        h => `
      <tr>
        <td><strong>${esc(h.name)}</strong></td>
        <td>${esc(h.phone)}</td>
        <td>${esc(h.email)}</td>
        <td>${esc(h.address)}${h.city ? ', ' + esc(h.city) : ''}</td>
        <td class="hide-mobile">${esc(h.source)}</td>
        <td>
          <button class="btn btn-sm" onclick="window._editHw('${h.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="window._deleteHw('${h.id}')">Delete</button>
        </td>
      </tr>
    `
      )
      .join('');
  }

  function openHwModal(hw) {
    document.getElementById('hwModalTitle').textContent = hw ? 'Edit Homeowner' : 'New Homeowner';
    document.getElementById('hwId').value = hw?.id || '';
    document.getElementById('hwName').value = hw?.name || '';
    document.getElementById('hwPhone').value = hw?.phone || '';
    document.getElementById('hwEmail').value = hw?.email || '';
    document.getElementById('hwAddr').value = hw?.address || '';
    document.getElementById('hwCity').value = hw?.city || '';
    document.getElementById('hwZip').value = hw?.zip || '';
    document.getElementById('hwYearBuilt').value = hw?.year_built || '';
    document.getElementById('hwSource').value = hw?.source || 'direct';
    document.getElementById('hwNotes').value = hw?.notes || '';
    document.getElementById('hwModal').showModal();
  }

  async function saveHomeowner(e) {
    e.preventDefault();
    const id = document.getElementById('hwId').value;
    const payload = {
      name: document.getElementById('hwName').value,
      phone: document.getElementById('hwPhone').value,
      email: document.getElementById('hwEmail').value,
      address: document.getElementById('hwAddr').value,
      city: document.getElementById('hwCity').value,
      zip: document.getElementById('hwZip').value,
      year_built: document.getElementById('hwYearBuilt').value || null,
      source: document.getElementById('hwSource').value,
      notes: document.getElementById('hwNotes').value,
    };

    try {
      const url = id ? '/api/homeowners/' + id : '/api/homeowners';
      const method = id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to save homeowner');
        return;
      }
      closeModal('hwModal');
      loadHomeowners();
    } catch {
      alert('Failed to save homeowner');
    }
  }

  window._editHw = async function (id) {
    const res = await fetch('/api/homeowners/' + id);
    if (res.ok) openHwModal(await res.json());
  };

  window._deleteHw = async function (id) {
    if (!confirm('Delete this homeowner?')) return;
    const res = await fetch('/api/homeowners/' + id, { method: 'DELETE' });
    if (res.ok) loadHomeowners();
    else {
      const d = await res.json();
      alert(d.error || 'Delete failed');
    }
  };

  // ── Utilities ─────────────────────────────────────────
  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatStatus(status) {
    return (status || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
})();
