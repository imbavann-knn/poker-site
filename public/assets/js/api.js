// =============================================
// WHOLESOME ALL IN — Shared API Helper
// =============================================

const API = {
  base: '/api',

  async get(path) {
    const res = await fetch(`${this.base}${path}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async post(path, body) {
    const res = await fetch(`${this.base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Request failed');
    }
    return res.json();
  },

  async put(path, body) {
    const res = await fetch(`${this.base}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Request failed');
    }
    return res.json();
  },

  async delete(path, body = {}) {
    const res = await fetch(`${this.base}${path}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};

// =============================================
// SHARED UTILITIES
// =============================================

function formatMoney(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '$0';
  const abs = Math.abs(n).toFixed(2);
  return (n >= 0 ? '+$' : '-$') + abs;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-SG', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return formatDate(ts.slice(0, 10));
}

function profitClass(val) {
  const n = parseFloat(val);
  if (n > 0) return 'profit';
  if (n < 0) return 'loss';
  return 'neutral';
}

function actionIcon(action) {
  const icons = { create: '✦', update: '✎', delete: '✕' };
  return icons[action] || '•';
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = type ? `show ${type}` : 'show';
  setTimeout(() => { t.className = ''; }, 3000);
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// Close modal on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

// Mark active nav link
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (href !== '/' && path.startsWith(href))) {
      a.classList.add('active');
    }
  });
});

const BLINDS_OPTIONS = [
  '0.05/0.10',
  '0.10/0.20',
  '0.25/0.50',
  '0.50/1.00',
  '1/2',
  '2/5',
  '5/10',
];

function blindsSelect(selected = '0.10/0.20') {
  return BLINDS_OPTIONS.map(b =>
    `<option value="${b}" ${b === selected ? 'selected' : ''}>$${b}</option>`
  ).join('') + `<option value="custom" ${!BLINDS_OPTIONS.includes(selected) ? 'selected' : ''}>Custom...</option>`;
}
