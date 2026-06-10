/* ═══════════════════════════════════════════════════════════════════════════
   js/ui.js  — Shared UI primitives
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── ICONS (inline SVG strings) ──────────────────────────────────────────── */
const Icons = {
  home:        `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 12L12 3l9 9"/><path d="M9 21V12h6v9"/><path d="M3 12v9h6M15 21v-9h6v9"/></svg>`,
  users:       `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/></svg>`,
  calendar:    `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  clipboard:   `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>`,
  search:      `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  plus:        `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  edit:        `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash:       `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
  x:           `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  chevLeft:    `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>`,
  chevRight:   `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>`,
  check:       `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
  logout:      `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  shield:      `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  file:        `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  chart:       `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6"  y1="20" x2="6"  y2="14"/></svg>`,
  lock:        `<svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  psi:         `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 1 7 7c0 3.87-3.13 7-7 7s-7-3.13-7-7a7 7 0 0 1 7-7z"/><line x1="12" y1="16" x2="12" y2="22"/><line x1="8"  y1="22" x2="16" y2="22"/></svg>`,
  alert:       `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9"  x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  eye:         `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  menu:        `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="3" y1="6"  x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  download:    `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
};

/* ─── TOAST ───────────────────────────────────────────────────────────────── */
const Toast = {
  show(msg, type = 'default', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span>${msg}</span>`;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, duration);
  },
  success(m) { this.show(m, 'success'); },
  error(m)   { this.show(m, 'error'); },
  warning(m) { this.show(m, 'warning'); },
};

/* ─── MODAL ───────────────────────────────────────────────────────────────── */
const Modal = {
  _stack: [],
  open({ title, body, footer, size = '' }) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal ${size}" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h2>${title}</h2>
          <button class="btn btn-ghost btn-sm modal-close">${Icons.x}</button>
        </div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>`;
    overlay.querySelector('.modal-close').onclick = () => Modal.close(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) Modal.close(overlay); });
    document.body.appendChild(overlay);
    this._stack.push(overlay);
    return overlay;
  },
  close(overlay) {
    if (overlay) { overlay.remove(); this._stack = this._stack.filter(o => o !== overlay); }
    else if (this._stack.length) { this._stack.pop().remove(); }
  },
  confirm({ title, message, onConfirm, danger = false }) {
    const overlay = Modal.open({
      title,
      body: `<p>${message}</p>`,
      footer: `
        <button class="btn btn-ghost" id="modal-cancel">Cancelar</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modal-confirm">Confirmar</button>`,
    });
    overlay.querySelector('#modal-cancel').onclick  = () => Modal.close(overlay);
    overlay.querySelector('#modal-confirm').onclick = () => { Modal.close(overlay); onConfirm(); };
  },
};

/* ─── FORM HELPERS ────────────────────────────────────────────────────────── */
const Form = {
  validate(fields) {
    let valid = true;
    fields.forEach(({ el, rules }) => {
      const val = el.value.trim();
      let msg = '';
      if (rules.required && !val) msg = 'Campo requerido.';
      else if (rules.email && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) msg = 'Email inválido.';
      else if (rules.minLen && val.length < rules.minLen) msg = `Mínimo ${rules.minLen} caracteres.`;
      else if (rules.match && val !== rules.match.value) msg = 'Las contraseñas no coinciden.';
      else if (rules.phone && val && !/^\d{7,10}$/.test(val)) msg = 'Teléfono inválido.';
      const hint = el.closest('.form-group')?.querySelector('.form-error');
      if (msg) {
        valid = false;
        el.classList.add('error');
        if (hint) hint.textContent = msg;
      } else {
        el.classList.remove('error');
        if (hint) hint.textContent = '';
      }
    });
    return valid;
  },
  data(form) {
    const out = {};
    new FormData(form).forEach((v, k) => out[k] = v);
    return out;
  },
};

/* ─── ROUTER (hash-based) ──────────────────────────────────────────────────── */
const Router = {
  _routes: {},
  on(hash, handler) { this._routes[hash] = handler; },
  go(hash) { location.hash = hash; },
  init() {
    window.addEventListener('hashchange', () => this._dispatch());
    this._dispatch();
  },
  _dispatch() {
    const hash = location.hash.slice(1) || 'dashboard';
    const parts = hash.split('/');
    const base  = parts[0];
    const param = parts[1];
    const handler = this._routes[base] || this._routes['404'];
    if (handler) handler(param);
  },
};

/* ─── DATE UTILS ──────────────────────────────────────────────────────────── */
const DateUtils = {
  fmt(iso)    { if (!iso) return '—'; const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}`; },
  fmtFull(iso){ const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric' }; return new Date(iso+'T00:00').toLocaleDateString('es-BO', opts); },
  age(fnac)   { const d = new Date(fnac+'T00:00'), n = new Date(); let a = n.getFullYear()-d.getFullYear(); if (n<new Date(n.getFullYear(),d.getMonth(),d.getDate())) a--; return a; },
  today()     { return new Date().toISOString().split('T')[0]; },
  monthName(m){ return ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][m]; },
};

/* ─── MISC ─────────────────────────────────────────────────────────────────── */
function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function initials(name) { return (name||'?').split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase(); }
function avatarColor(name) { const colors = ['teal','amber','red','slate']; return colors[name.charCodeAt(0) % colors.length]; }
function roleLabel(r) { return { administrador:'Administrador', recepcionista:'Recepcionista', psicologo:'Psicólogo' }[r] || r; }
function estadoBadge(e) {
  const map = { programada:'badge-teal', realizada:'badge-green', cancelada:'badge-red', pendiente:'badge-amber' };
  const lbl = { programada:'Programada', realizada:'Realizada', cancelada:'Cancelada', pendiente:'Pendiente' };
  return `<span class="badge ${map[e]||'badge-slate'}">${lbl[e]||e}</span>`;
}
function estadoEmocionalLabel(v) {
  const map = { '1':'Muy mal 😟','2':'Mal 😕','3':'Regular 😐','4':'Bien 🙂','5':'Muy bien 😊' };
  return map[v] || v;
}

/* ─── INACTIVITY TIMER ─────────────────────────────────────────────────────── */
const InactivityTimer = {
  _t: null,
  _limit: 15 * 60 * 1000, // 15 min
  _onExpire: null,
  start(onExpire) {
    this._onExpire = onExpire;
    ['click','keydown','mousemove','touchstart'].forEach(e =>
      document.addEventListener(e, () => this.reset(), { passive: true })
    );
    this.reset();
  },
  reset() {
    clearTimeout(this._t);
    Store.Auth.resetActivity();
    this._t = setTimeout(() => { if (this._onExpire) this._onExpire(); }, this._limit);
  },
  stop() { clearTimeout(this._t); },
};
