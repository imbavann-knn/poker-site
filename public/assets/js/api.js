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

// Mark active nav link + inject mobile hamburger
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (href !== '/' && path.startsWith(href))) {
      a.classList.add('active');
    }
  });

  // ——— Mobile hamburger ———
  const navInner = document.querySelector('.nav-inner');
  if (!navInner) return;

  // Hamburger button
  const burger = document.createElement('button');
  burger.className = 'hamburger';
  burger.setAttribute('aria-label', 'Menu');
  burger.innerHTML = '<span></span><span></span><span></span>';
  navInner.appendChild(burger);

  // Drawer
  const drawer = document.createElement('div');
  drawer.className = 'mobile-drawer';
  drawer.innerHTML =
    '<div class="mobile-drawer-backdrop"></div>' +
    '<div class="mobile-drawer-panel">' +
      '<div class="mobile-drawer-logo">♠ Wholesome ALL IN</div>' +
      '<ul class="mobile-drawer-links">' +
        '<li><a href="/">Home</a></li>' +
        '<li><a href="/sessions">Sessions</a></li>' +
        '<li><a href="/leaderboard">Leaderboard</a></li>' +
        '<li><a href="/players">Players</a></li>' +
        '<li><a href="/changelog">Changelog</a></li>' +
      '</ul>' +
    '</div>';
  document.body.appendChild(drawer);

  // Mark active link in drawer
  drawer.querySelectorAll('a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (href !== '/' && path.startsWith(href))) {
      a.classList.add('active');
    }
  });

  function openDrawer() {
    drawer.classList.add('open');
    burger.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    drawer.classList.remove('open');
    burger.classList.remove('open');
    document.body.style.overflow = '';
  }

  burger.addEventListener('click', () => drawer.classList.contains('open') ? closeDrawer() : openDrawer());
  drawer.querySelector('.mobile-drawer-backdrop').addEventListener('click', closeDrawer);
  drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', closeDrawer));
});

// =============================================
// CUSTOM DATE PICKER
// Week starts Monday. Call initDatePicker('input-id') after DOM ready.
// =============================================

(function() {
  // Inject styles once
  const style = document.createElement('style');
  style.textContent = `
    .dp-wrap { position: relative; display: block; }
    .dp-input {
      width: 100%; background: rgba(0,0,0,.3);
      border: 1px solid rgba(255,45,135,.35); color: #F0EEFF;
      padding: 10px 14px; font-family: 'Exo 2',sans-serif; font-size:.9rem;
      outline: none; cursor: pointer; box-sizing: border-box;
      transition: border-color .2s, box-shadow .2s;
    }
    .dp-input:focus { border-color: #00F5FF; box-shadow: 0 0 0 2px rgba(0,245,255,.12); }
    .dp-input::placeholder { color: rgba(240,238,255,.35); }
    .dp-cal {
      position: absolute; top: calc(100% + 6px); left: 0; z-index: 600;
      background: #140836; border: 1px solid rgba(255,45,135,.4);
      box-shadow: 0 12px 40px rgba(0,0,0,.6), 0 0 0 1px rgba(255,45,135,.1);
      width: 300px; user-select: none;
      animation: dpIn .15s ease;
    }
    @keyframes dpIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:none; } }
    .dp-nav {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 14px; border-bottom: 1px solid rgba(255,45,135,.15);
    }
    .dp-nav-btn {
      background: none; border: 1px solid rgba(255,45,135,.25); color: #F0EEFF;
      width: 28px; height: 28px; cursor: pointer; font-size: .85rem;
      display: flex; align-items: center; justify-content: center;
      transition: background .15s, border-color .15s;
    }
    .dp-nav-btn:hover { background: rgba(255,45,135,.15); border-color: rgba(255,45,135,.6); }
    .dp-month-label {
      font-family: 'Bebas Neue',cursive; font-size: 1.1rem; letter-spacing: .08em;
      color: #F0EEFF; cursor: pointer; padding: 2px 8px;
      transition: color .15s;
    }
    .dp-month-label:hover { color: #FF2D87; }
    .dp-grid { padding: 8px 10px 12px; }
    .dp-dow {
      display: grid; grid-template-columns: repeat(7,1fr);
      margin-bottom: 4px;
    }
    .dp-dow span {
      text-align: center; font-size: .6rem; font-weight: 700;
      letter-spacing: .08em; color: rgba(240,238,255,.4);
      padding: 4px 0; text-transform: uppercase;
    }
    .dp-dow span:last-child { color: rgba(255,45,135,.6); } /* Sun */
    .dp-days { display: grid; grid-template-columns: repeat(7,1fr); gap: 2px; }
    .dp-day {
      aspect-ratio: 1/1; display: flex; align-items: center; justify-content: center;
      font-size: .8rem; cursor: pointer; border-radius: 2px;
      color: #F0EEFF; transition: background .12s, color .12s;
      border: 1px solid transparent;
    }
    .dp-day:hover { background: rgba(255,45,135,.18); border-color: rgba(255,45,135,.3); }
    .dp-day.other-month { color: rgba(240,238,255,.2); }
    .dp-day.today {
      border-color: rgba(0,245,255,.5); color: #00F5FF;
      font-weight: 700;
    }
    .dp-day.selected {
      background: #FF2D87; color: #fff; font-weight: 700;
      box-shadow: 0 0 12px rgba(255,45,135,.5);
      border-color: transparent;
    }
    .dp-day.sunday { color: rgba(255,100,100,.8); }
    .dp-day.selected.sunday { color: #fff; }
    .dp-day.empty { cursor: default; }
    .dp-day.empty:hover { background: none; border-color: transparent; }
    .dp-today-btn {
      display: block; width: calc(100% - 20px); margin: 0 10px 10px;
      background: none; border: 1px solid rgba(0,245,255,.3);
      color: #00F5FF; font-family: 'Exo 2',sans-serif; font-size:.72rem;
      font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
      padding: 7px; cursor: pointer; transition: background .15s;
    }
    .dp-today-btn:hover { background: rgba(0,245,255,.1); }
    /* Year picker overlay */
    .dp-year-grid {
      display: grid; grid-template-columns: repeat(4,1fr); gap: 4px;
      padding: 10px;
    }
    .dp-year-item {
      padding: 8px 4px; text-align: center; cursor: pointer;
      font-size: .82rem; border: 1px solid transparent; border-radius: 2px;
      transition: all .12s; color: #F0EEFF;
    }
    .dp-year-item:hover { background: rgba(255,45,135,.15); border-color: rgba(255,45,135,.3); }
    .dp-year-item.current-year { color: #FF2D87; font-weight: 700; border-color: rgba(255,45,135,.4); }
    .dp-year-item.selected-year { background: #FF2D87; color: #fff; }
  `;
  document.head.appendChild(style);

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']; // Mon-first

  let activeCal = null; // currently open calendar instance

  function closeCal() {
    if (activeCal) { activeCal.remove(); activeCal = null; }
  }

  // Close on outside click
  document.addEventListener('click', e => {
    if (activeCal && !activeCal.contains(e.target) && !e.target.classList.contains('dp-input')) {
      closeCal();
    }
  }, true);

  window.initDatePicker = function(inputId, opts = {}) {
    const original = document.getElementById(inputId);
    if (!original) return;

    // Create wrapper
    const wrap = document.createElement('div');
    wrap.className = 'dp-wrap';
    original.parentNode.insertBefore(wrap, original);
    original.style.display = 'none';
    wrap.appendChild(original);

    // Visible display input
    const display = document.createElement('input');
    display.type = 'text';
    display.className = 'dp-input';
    display.placeholder = opts.placeholder || 'Select date';
    display.readOnly = true;
    wrap.insertBefore(display, original);

    let selectedDate = null; // Date object
    let viewYear, viewMonth;
    let showingYearPicker = false;

    function today() { const d = new Date(); d.setHours(0,0,0,0); return d; }

    function setDate(d) {
      selectedDate = d;
      const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
      original.value = y + '-' + m + '-' + day;
      display.value = d.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
    }

    // Pre-fill if original has value
    if (original.value) {
      const parts = original.value.split('-');
      if (parts.length === 3) setDate(new Date(+parts[0], +parts[1]-1, +parts[2]));
    }

    function buildCal() {
      closeCal();
      showingYearPicker = false;

      const now = today();
      if (!viewYear) viewYear = selectedDate ? selectedDate.getFullYear() : now.getFullYear();
      if (viewMonth === undefined) viewMonth = selectedDate ? selectedDate.getMonth() : now.getMonth();

      const cal = document.createElement('div');
      cal.className = 'dp-cal';
      activeCal = cal;

      // Nav row
      const nav = document.createElement('div');
      nav.className = 'dp-nav';

      const prevBtn = document.createElement('button');
      prevBtn.className = 'dp-nav-btn'; prevBtn.type = 'button'; prevBtn.textContent = '‹';
      prevBtn.onclick = e => { e.stopPropagation(); viewMonth--; if(viewMonth<0){viewMonth=11;viewYear--;} rebuildCal(); };

      const label = document.createElement('div');
      label.className = 'dp-month-label';
      label.textContent = MONTHS[viewMonth] + ' ' + viewYear;
      label.onclick = e => { e.stopPropagation(); toggleYearPicker(); };

      const nextBtn = document.createElement('button');
      nextBtn.className = 'dp-nav-btn'; nextBtn.type = 'button'; nextBtn.textContent = '›';
      nextBtn.onclick = e => { e.stopPropagation(); viewMonth++; if(viewMonth>11){viewMonth=0;viewYear++;} rebuildCal(); };

      nav.appendChild(prevBtn); nav.appendChild(label); nav.appendChild(nextBtn);
      cal.appendChild(nav);

      // Day-of-week headers
      const grid = document.createElement('div');
      grid.className = 'dp-grid';
      const dowRow = document.createElement('div');
      dowRow.className = 'dp-dow';
      DOW.forEach(d => { const s = document.createElement('span'); s.textContent = d; dowRow.appendChild(s); });
      grid.appendChild(dowRow);

      // Days
      const daysGrid = document.createElement('div');
      daysGrid.className = 'dp-days';

      // First day of month — shift so Mon=0
      const firstDay = new Date(viewYear, viewMonth, 1);
      let startDow = firstDay.getDay(); // 0=Sun,1=Mon,...
      startDow = startDow === 0 ? 6 : startDow - 1; // convert to Mon-first (Mon=0, Sun=6)

      const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
      const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

      // Prev month fill
      for (let i = startDow - 1; i >= 0; i--) {
        const d = document.createElement('div');
        d.className = 'dp-day other-month';
        d.textContent = daysInPrevMonth - i;
        daysGrid.appendChild(d);
      }

      // Current month
      for (let day = 1; day <= daysInMonth; day++) {
        const d = document.createElement('div');
        d.className = 'dp-day';
        d.textContent = day;

        const thisDate = new Date(viewYear, viewMonth, day);
        const dow = thisDate.getDay(); // 0=Sun
        if (dow === 0) d.classList.add('sunday');
        if (thisDate.getTime() === now.getTime()) d.classList.add('today');
        if (selectedDate && thisDate.getTime() === selectedDate.getTime()) d.classList.add('selected');

        d.onclick = e => {
          e.stopPropagation();
          setDate(new Date(viewYear, viewMonth, day));
          closeCal();
          // Trigger change event so forms can react
          original.dispatchEvent(new Event('change'));
        };
        daysGrid.appendChild(d);
      }

      // Next month fill
      const total = startDow + daysInMonth;
      const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
      for (let i = 1; i <= remaining; i++) {
        const d = document.createElement('div');
        d.className = 'dp-day other-month';
        d.textContent = i;
        daysGrid.appendChild(d);
      }

      grid.appendChild(daysGrid);
      cal.appendChild(grid);

      // Today button
      const todayBtn = document.createElement('button');
      todayBtn.type = 'button'; todayBtn.className = 'dp-today-btn'; todayBtn.textContent = 'Today';
      todayBtn.onclick = e => {
        e.stopPropagation();
        const t = today();
        viewYear = t.getFullYear(); viewMonth = t.getMonth();
        setDate(t); closeCal();
        original.dispatchEvent(new Event('change'));
      };
      cal.appendChild(todayBtn);

      wrap.appendChild(cal);
    }

    function toggleYearPicker() {
      showingYearPicker = !showingYearPicker;
      if (!activeCal) return;
      // Replace grid with year picker or vice versa
      const existing = activeCal.querySelector('.dp-grid, .dp-year-grid');
      const todayBtnEl = activeCal.querySelector('.dp-today-btn');
      if (showingYearPicker) {
        if (existing) existing.remove();
        const yg = document.createElement('div');
        yg.className = 'dp-year-grid';
        const startY = viewYear - 8;
        for (let y = startY; y <= startY + 15; y++) {
          const item = document.createElement('div');
          item.className = 'dp-year-item';
          if (y === new Date().getFullYear()) item.classList.add('current-year');
          if (y === viewYear) item.classList.add('selected-year');
          item.textContent = y;
          item.onclick = e => { e.stopPropagation(); viewYear = y; showingYearPicker = false; rebuildCal(); };
          yg.appendChild(item);
        }
        activeCal.insertBefore(yg, todayBtnEl);
      } else {
        rebuildCal();
      }
    }

    function rebuildCal() {
      if (!activeCal) return;
      const rect = wrap.getBoundingClientRect();
      buildCal();
    }

    display.addEventListener('click', e => {
      e.stopPropagation();
      if (activeCal) { closeCal(); return; }
      buildCal();
      // Position: open upward if near bottom of viewport
      const calEl = activeCal;
      const wrapRect = wrap.getBoundingClientRect();
      const spaceBelow = window.innerHeight - wrapRect.bottom;
      if (spaceBelow < 340) {
        calEl.style.top = 'auto';
        calEl.style.bottom = 'calc(100% + 6px)';
      }
    });
  };
})();

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
