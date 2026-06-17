/* PATCHED BY AI: EMERGENCY CSS & VISIBILITY FIX */
const API = '/api';
let currentUser = null;

// ── INYECCIÓN CSS DE EMERGENCIA PARA MODALES ──
// Esto obliga a la caja blanca a mostrarse sí o sí
const emergencyStyle = document.createElement('style');
emergencyStyle.innerHTML = `
  .modal.open {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    background: rgba(0,0,0,0.6) !important;
    z-index: 9999 !important;
  }
  .modal-content {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    background: #fff !important;
    z-index: 10000 !important;
    position: relative !important;
    padding: 20px !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2) !important;
    min-width: 300px !important;
  }
`;
document.head.appendChild(emergencyStyle);

// ── UTILS ──────────────────────────────────────
const $ = id => document.getElementById(id);
const qs = sel => document.querySelector(sel);

function showAlert(msg, type = 'error', containerId = 'modal-alert') {
  const el = $(containerId);
  if (!el) return;
  el.textContent = msg;
  el.className = `alert show alert-${type}`;
  setTimeout(() => el.className = 'alert', 4000);
}

// Helper API robusto con prevención de crasheo 500 HTML
async function api(method, path, body = null) {
  let token = null;
  try {
    token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  } catch (e) {
    token = sessionStorage.getItem('accessToken');
  }

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  
  try {
    const res = await fetch(API + path, opts);
    const text = await res.text();
    let data;
    
    try { data = text ? JSON.parse(text) : null; } 
    catch (e) { data = text; }
    
    if (!res.ok) {
      const err = new Error(data && data.error ? data.error : `HTTP ${res.status}`);
      err.status = res.status;
      err.raw = data;
      throw err;
    }
    return data;
  } catch (error) {
    console.error(`[API Error] ${method} ${path}:`, error.message || error.status);
    throw error;
  }
}

async function registrarAuditoria(modulo, accion, descripcion) {
  try {
    if (!currentUser) return;
    await api('POST', '/auditoria', { modulo, accion, descripcion });
  } catch (err) { console.warn('No se pudo registrar auditoría:', err.message); }
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });
}

function fmtDateOnly(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-BO');
}

function rolBadge(rol) {
  const map = { administrador: 'badge-blue', psicologo: 'badge-green', recepcionista: 'badge-yellow' };
  return `<span class="badge ${map[rol] || 'badge-gray'}">${rol}</span>`;
}

function estadoBadge(e) {
  const map = { programada: 'badge-blue', realizada: 'badge-green', cancelada: 'badge-red' };
  return `<span class="badge ${map[e] || 'badge-gray'}">${e}</span>`;
}

function activoBadge(a) {
  return a ? '<span class="badge badge-green">Activo</span>' : '<span class="badge badge-gray">Inactivo</span>';
}

// ── PERMISOS ───────────────────────────────────
const permisosPorRol = {
  administrador: ['dashboard','citas','calendario','pacientes','historial','sesiones','horarios','recordatorios','reportes','auditoria','psicologos','usuarios'],
  recepcionista: ['dashboard','citas','calendario','pacientes','recordatorios'],
  psicologo: ['dashboard','citas','calendario','pacientes','historial','sesiones']
};

function tienePermiso(section) {
  if (!currentUser) return false;
  return permisosPorRol[currentUser.rol]?.includes(section) || false;
}

function esAdmin() { return currentUser && currentUser.rol === 'administrador'; }
function esRecepcionista() { return currentUser && currentUser.rol === 'recepcionista'; }
function esPsicologo() { return currentUser && currentUser.rol === 'psicologo'; }

function puedeGestionarUsuarios() { return esAdmin(); }
function puedeGestionarPsicologos() { return esAdmin(); }
function puedeGestionarPacientes() { return esAdmin() || esRecepcionista(); }
function puedeGestionarCitas() { return esAdmin() || esRecepcionista(); }
function puedeGestionarHistorial() { return esAdmin() || esPsicologo(); }

function aplicarPermisosUI() {
  if (!currentUser) return;
  document.querySelectorAll('[data-nav]').forEach(link => {
    link.style.display = tienePermiso(link.dataset.nav) ? 'flex' : 'none';
  });

  const toggle = (id, condition) => { if ($(id)) $(id).style.display = condition ? 'inline-flex' : 'none'; };
  toggle('btn-nuevo-usuario', puedeGestionarUsuarios());
  toggle('btn-nuevo-psicologo', puedeGestionarPsicologos());
  toggle('btn-nuevo-paciente', puedeGestionarPacientes());
  toggle('btn-nueva-cita', puedeGestionarCitas());
  toggle('btn-nuevo-historial', puedeGestionarHistorial());
  toggle('btn-nueva-sesion', tienePermiso('sesiones'));
  toggle('btn-nuevo-recordatorio', tienePermiso('recordatorios'));
}

// ── AUTH ───────────────────────────────────────
if ($('login-form')) {
  $('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('login-email').value;
    const contrasena = $('login-pass').value;
    try {
      const data = await api('POST', '/usuarios/auth/login', { email, contrasena });
      const token = data.accessToken || data.token || data.access_token || data.access;
      currentUser = data.user;
      
      try {
        if (token) localStorage.setItem('accessToken', token);
        localStorage.setItem('user', JSON.stringify(currentUser));
      } catch (storageErr) {}
      sessionStorage.setItem('sigch_user', JSON.stringify(currentUser));
      if (token) sessionStorage.setItem('accessToken', token);

      if ($('login-screen')) $('login-screen').style.display = 'none';
      if ($('sidebar')) $('sidebar').style.display = 'flex';
      if ($('main')) $('main').style.display = 'block';
      if ($('user-name')) $('user-name').textContent = currentUser.nombre_completo || currentUser.email || '—';
      if ($('user-role')) $('user-role').textContent = currentUser.rol || '—';
      
      aplicarPermisosUI();
      navigate('dashboard');
    } catch (err) {
      showAlert(err.message || 'Error de autenticación', 'error', 'login-alert');
    }
  });
}

if ($('logout-btn')) {
  $('logout-btn').addEventListener('click', () => {
    currentUser = null;
    sessionStorage.removeItem('sigch_user');
    sessionStorage.removeItem('accessToken');
    try { localStorage.clear(); } catch(e) {}
    if ($('login-screen')) $('login-screen').style.display = 'flex';
    if ($('sidebar')) $('sidebar').style.display = 'none';
    if ($('main')) $('main').style.display = 'none';
  });
}

// ── NAVEGACIÓN ─────────────────────────────────
function navigate(section) {
  if (!currentUser) {
    if ($('login-screen')) $('login-screen').style.display = 'flex';
    return;
  }
  if (!tienePermiso(section)) section = 'dashboard';

  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('#sidebar nav a').forEach(a => a.classList.remove('active'));

  const sec = $('sec-' + section);
  if (sec) sec.classList.add('active');

  const link = document.querySelector(`[data-nav="${section}"]`);
  if (link) link.classList.add('active');

  if (loaders[section]) loaders[section]();
}

document.querySelectorAll('[data-nav]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    navigate(a.dataset.nav);
  });
});

// ── MODALES ────────────────────────────────────
function openModal(id) {
  const modal = $(id);
  if (modal) modal.classList.add('open');
}

function closeModal(id) {
  const modal = $(id);
  if (modal) modal.classList.remove('open');
}

document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
  btn.addEventListener('click', () => {
    const modal = btn.closest('.modal-overlay') || btn.closest('.modal');
    if (modal) modal.classList.remove('open');
  });
});

// ── DASHBOARD ──────────────────────────────────
async function loadDashboard() {
  try {
    const stats = await api('GET', '/citas/stats/resumen');
    if ($('stat-total-citas')) $('stat-total-citas').textContent = stats.total_citas;
    if ($('stat-programadas')) $('stat-programadas').textContent = stats.programadas;
    if ($('stat-realizadas')) $('stat-realizadas').textContent = stats.realizadas;
    if ($('stat-canceladas')) $('stat-canceladas').textContent = stats.canceladas;
    if ($('stat-pacientes')) $('stat-pacientes').textContent = stats.total_pacientes;
    if ($('stat-psicologos')) $('stat-psicologos').textContent = stats.total_psicologos;

    const citas = await api('GET', '/citas?estado=programada');
    const tbody = $('dashboard-citas');
    if (!tbody) return;
    if (!citas.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty">No hay citas programadas</td></tr>`;
      return;
    }
    tbody.innerHTML = citas.slice(0, 8).map(c => `
      <tr>
        <td>${fmtDate(c.fecha_hora)}</td><td>${c.paciente_nombre}</td><td>${c.psicologo_nombre}</td><td>${c.motivo || '—'}</td><td>${estadoBadge(c.estado)}</td>
      </tr>
    `).join('');
  } catch (err) { console.error(err); }
}

// ── USUARIOS ───────────────────────────────────
let editingUsuario = null;
async function loadUsuarios() {
  if (!puedeGestionarUsuarios()) return;
  try {
    const rows = await api('GET', '/usuarios');
    const tbody = $('usuarios-tbody');
    if (!tbody) return;
    if (!rows.length) { tbody.innerHTML = `<tr><td colspan="6" class="empty">Sin usuarios</td></tr>`; return; }
    tbody.innerHTML = rows.map(u => `
      <tr>
        <td>${u.id_usuario}</td><td>${u.nombre_completo}</td><td>${u.email}</td><td>${rolBadge(u.rol)}</td><td>${activoBadge(u.activo)}</td>
        <td>
          <button class="btn btn-edit btn-sm" data-action="editUsuario" data-id="${u.id_usuario}">✏ Editar</button>
          <button class="btn btn-danger btn-sm" data-action="deleteUsuario" data-id="${u.id_usuario}">✕</button>
        </td>
      </tr>
    `).join('');
  } catch (err) { console.error(err); }
}

window.editUsuario = async id => {
  editingUsuario = id;
  try {
    const u = await api('GET', `/usuarios/${id}`);
    if ($('u-nombre')) $('u-nombre').value = u.nombre_completo;
    if ($('u-email')) $('u-email').value = u.email;
    if ($('u-rol')) $('u-rol').value = u.rol;
    if ($('u-pass')) $('u-pass').value = '';
    if ($('modal-usuario-title')) $('modal-usuario-title').textContent = 'Editar Usuario';
    openModal('modal-usuario');
  } catch (err) { alert(err.message); }
};

window.deleteUsuario = async id => {
  if (!confirm('¿Desactivar al usuario?')) return;
  try { await api('DELETE', `/usuarios/${id}`); loadUsuarios(); } catch (err) { alert(err.message); }
};

if ($('btn-nuevo-usuario')) $('btn-nuevo-usuario').addEventListener('click', () => {
  editingUsuario = null;
  if ($('form-usuario')) $('form-usuario').reset();
  if ($('modal-usuario-title')) $('modal-usuario-title').textContent = 'Nuevo Usuario';
  openModal('modal-usuario');
});

if ($('form-usuario')) $('form-usuario').addEventListener('submit', async e => {
  e.preventDefault();
  const pass = $('u-pass') ? $('u-pass').value : '';
  const body = { nombre_completo: $('u-nombre').value, email: $('u-email').value, rol: $('u-rol').value };
  if (pass) body.contrasena = pass;
  try {
    if (editingUsuario) await api('PUT', `/usuarios/${editingUsuario}`, body);
    else await api('POST', '/usuarios', { ...body, contrasena: pass });
    closeModal('modal-usuario');
    loadUsuarios();
  } catch (err) { alert(err.message); }
});

// ── PACIENTES ──────────────────────────────────
let editingPaciente = null;
async function loadPacientes(q = '') {
  try {
    const rows = await api('GET', `/pacientes${q ? '?q=' + encodeURIComponent(q) : ''}`);
    const tbody = $('pacientes-tbody');
    if (!tbody) return;
    if (!rows.length) { tbody.innerHTML = `<tr><td colspan="7" class="empty">No hay pacientes</td></tr>`; return; }
    tbody.innerHTML = rows.map(p => `
      <tr>
        <td>${p.id_paciente}</td><td>${p.nombre_completo}</td><td>${p.ci}</td><td>${fmtDateOnly(p.fecha_nacimiento)}</td><td>${p.telefono}</td><td>${activoBadge(p.activo)}</td>
        <td>
          <button class="btn btn-edit btn-sm" data-action="editPaciente" data-id="${p.id_paciente}">✏ Editar</button>
          <button class="btn btn-danger btn-sm" data-action="deletePaciente" data-id="${p.id_paciente}">✕</button>
        </td>
      </tr>
    `).join('');
  } catch (err) { console.error(err); }
}

window.editPaciente = async id => {
  editingPaciente = id;
  try {
    const p = await api('GET', `/pacientes/${id}`);
    if ($('p-nombre')) $('p-nombre').value = p.nombre_completo;
    if ($('p-ci')) $('p-ci').value = p.ci;
    if ($('p-fnac')) $('p-fnac').value = p.fecha_nacimiento?.split('T')[0] || '';
    if ($('p-tel')) $('p-tel').value = p.telefono;
    if ($('p-email')) $('p-email').value = p.email || '';
    if ($('p-direccion')) $('p-direccion').value = p.direccion || '';
    if ($('modal-paciente-title')) $('modal-paciente-title').textContent = 'Editar Paciente';
    openModal('modal-paciente');
  } catch (err) { alert(err.message); }
};

window.deletePaciente = async id => {
  if (!confirm('¿Desactivar este paciente?')) return;
  try { await api('DELETE', `/pacientes/${id}`); loadPacientes(); } catch (err) { alert(err.message); }
};

if ($('btn-nuevo-paciente')) $('btn-nuevo-paciente').addEventListener('click', () => {
  editingPaciente = null;
  if ($('form-paciente')) $('form-paciente').reset();
  if ($('modal-paciente-title')) $('modal-paciente-title').textContent = 'Nuevo Paciente';
  openModal('modal-paciente');
});

if ($('form-paciente')) $('form-paciente').addEventListener('submit', async e => {
  e.preventDefault();
  const body = { nombre_completo: $('p-nombre').value, ci: $('p-ci').value, fecha_nacimiento: $('p-fnac').value, telefono: $('p-tel').value, email: $('p-email').value || null, direccion: $('p-direccion').value || null };
  try {
    if (editingPaciente) await api('PUT', `/pacientes/${editingPaciente}`, body);
    else await api('POST', '/pacientes', body);
    closeModal('modal-paciente');
    loadPacientes();
  } catch (err) { alert(err.message); }
});

// ── CITAS ──────────────────────────────────────
let editingCita = null;
async function loadCitas() {
  try {
    const rows = await api('GET', '/citas');
    const tbody = $('citas-tbody');
    if (!tbody) return;
    if (!rows.length) { tbody.innerHTML = `<tr><td colspan="7" class="empty">Sin citas registradas</td></tr>`; return; }
    tbody.innerHTML = rows.map(c => `
      <tr>
        <td>${c.id_cita}</td><td>${fmtDate(c.fecha_hora)}</td><td>${c.paciente_nombre}</td><td>${c.psicologo_nombre}</td><td>${c.motivo || '—'}</td><td>${estadoBadge(c.estado)}</td>
        <td>
          <button class="btn btn-edit btn-sm" data-action="editCita" data-id="${c.id_cita}">✏ Editar</button>
          <button class="btn btn-danger btn-sm" data-action="deleteCita" data-id="${c.id_cita}">✕</button>
        </td>
      </tr>
    `).join('');
  } catch (err) { console.error(err); }
}

async function populateCitaSelects() {
  try {
    const [pacientes, psicologos] = await Promise.all([api('GET', '/pacientes'), api('GET', '/psicologos')]);
    if ($('c-paciente')) $('c-paciente').innerHTML = '<option value="">— Seleccionar —</option>' + pacientes.filter(p => p.activo).map(p => `<option value="${p.id_paciente}">${p.nombre_completo}</option>`).join('');
    if ($('c-psicologo')) $('c-psicologo').innerHTML = '<option value="">— Seleccionar —</option>' + psicologos.filter(p => p.activo).map(p => `<option value="${p.id_psicologo}">${p.nombre_completo}</option>`).join('');
  } catch (err) { console.error(err); }
}

window.openEditModal = async (cita) => {
  editingCita = cita.id_cita || cita.id;
  await populateCitaSelects(); 
  
  const setValue = (id1, id2, val) => { if ($(id1)) $(id1).value = val; if ($(id2)) $(id2).value = val; };
  setValue('c-paciente', 'edit-paciente_id', cita.id_paciente || cita.paciente_id);
  setValue('c-psicologo', 'edit-psicologo_id', cita.id_psicologo || cita.psicologo_id);
  
  const fecha = (cita.fecha_hora || cita.inicio || cita.start || '').slice(0, 16);
  setValue('c-fecha', 'edit-fecha_hora', fecha);
  setValue('c-motivo', 'edit-motivo', cita.motivo || cita.title || cita.titulo || '');
  
  if ($('c-estado')) $('c-estado').value = cita.estado || 'programada';
  if ($('modal-cita-title')) $('modal-cita-title').textContent = 'Editar Cita';
  if ($('c-estado-group')) $('c-estado-group').style.display = 'block';

  if ($('modal-cita')) openModal('modal-cita');
  else if ($('editModal')) openModal('editModal');
  else openModal('dayModal');
};

window.editCita = async id => {
  try { const cita = await api('GET', `/citas/${id}`); await window.openEditModal(cita); } 
  catch (err) { alert(err.message); }
};

window.deleteCita = async id => {
  if (!confirm('¿Cancelar esta cita?')) return;
  try { await api('DELETE', `/citas/${id}`); loadCitas(); } catch (err) { alert(err.message); }
};

window.openCreateModal = async () => {
  editingCita = null;
  if ($('form-cita')) $('form-cita').reset();
  if ($('modal-cita-title')) $('modal-cita-title').textContent = 'Nueva Cita';
  if ($('c-estado-group')) $('c-estado-group').style.display = 'none';
  await populateCitaSelects();
  if ($('modal-cita')) openModal('modal-cita');
  else if ($('editModal')) openModal('editModal');
};

if ($('btn-nueva-cita')) $('btn-nueva-cita').addEventListener('click', window.openCreateModal);

if ($('form-cita')) $('form-cita').addEventListener('submit', async e => {
  e.preventDefault();
  const body = {
    id_paciente: parseInt($('c-paciente')?.value || $('edit-paciente_id')?.value),
    id_psicologo: parseInt($('c-psicologo')?.value || $('edit-psicologo_id')?.value),
    fecha_hora: ($('c-fecha')?.value || $('edit-fecha_hora')?.value || '').replace('T', ' '),
    motivo: $('c-motivo')?.value || $('edit-motivo')?.value || null
  };
  if (editingCita && $('c-estado')) body.estado = $('c-estado').value;
  try {
    if (editingCita) await api('PUT', `/citas/${editingCita}`, body);
    else await api('POST', '/citas', body);
    closeModal('modal-cita');
    closeModal('editModal');
    loadCitas();
  } catch (err) { alert(err.message); }
});

// ── CALENDARIO ─────────────────────────────────
let calDate = new Date();
async function loadCalendar() {
  const container = document.getElementById('calendar');
  if (!container) return; // Si FullCalendar logró cargar y ocupar el div, esto se detiene solo.

  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const names = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  if ($('cal-title')) $('cal-title').textContent = `${names[month]} ${year}`;

  try {
    const citas = await api('GET', '/citas?estado=programada') || [];
    const citaMap = {};
    const citasByDate = {};

    citas.forEach(c => {
      const key = c.fecha_hora ? c.fecha_hora.slice(0, 10) : null;
      if (!key) return;
      citaMap[key] = (citaMap[key] || 0) + 1;
      citasByDate[key] = citasByDate[key] || [];
      citasByDate[key].push(c);
    });

    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'calendar-grid';

    ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].forEach(h => {
      const el = document.createElement('div'); el.className = 'cal-header'; el.textContent = h; grid.appendChild(el);
    });

    const first = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date().toISOString().slice(0, 10);

    for (let i = 0; i < first; i++) grid.appendChild(Object.assign(document.createElement('div'), {className: 'cal-day other-month'}));

    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const div = document.createElement('div');
      div.className = 'cal-day' + (key === today ? ' today' : '');
      const dotsHtml = citaMap[key] ? `<div class="dot-row">${'<div class="dot"></div>'.repeat(Math.min(citaMap[key], 4))}</div>` : '';
      div.innerHTML = `<span class="cal-day-number">${d}</span>${dotsHtml}`;
      div.addEventListener('click', () => openDayModal(key, citasByDate[key] || []));
      grid.appendChild(div);
    }
    container.appendChild(grid);
  } catch (err) { console.error('Error manual calendar:', err); }
}

function openDayModal(dateStr, events) {
  if (!$('dayModal')) return;
  openModal('dayModal');
  if ($('modalDateTitle')) $('modalDateTitle').textContent = new Date(dateStr).toLocaleDateString();
  
  const list = $('eventsList');
  if (!list) return;
  list.innerHTML = '';

  if (!events.length) {
    if ($('noEvents')) $('noEvents').style.display = 'block';
    return;
  }
  if ($('noEvents')) $('noEvents').style.display = 'none';

  events.forEach(e => {
    const li = document.createElement('li'); li.className = 'event-item';
    li.innerHTML = `<div><div class="event-title">${e.titulo || e.motivo || 'Cita'}</div><div class="event-time">${e.fecha_hora.slice(11,16)}</div></div>`;
    list.appendChild(li);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if ($('cal-prev')) $('cal-prev').addEventListener('click', () => { calDate.setMonth(calDate.getMonth() - 1); loadCalendar(); });
  if ($('cal-next')) $('cal-next').addEventListener('click', () => { calDate.setMonth(calDate.getMonth() + 1); loadCalendar(); });
});

// ── HISTORIAL, SESIONES, HORARIOS (RESTO DE MÓDULOS) ──
async function loadHistorial() {
  try {
    const rows = await api('GET', '/historial');
    const tbody = $('historial-tbody');
    if (!tbody) return;
    if (!rows.length) { tbody.innerHTML = `<tr><td colspan="7" class="empty">Sin registros</td></tr>`; return; }
    tbody.innerHTML = rows.map(h => `<tr><td>${h.id_historial}</td><td>${fmtDateOnly(h.fecha)}</td><td>${h.paciente_nombre}</td><td>${h.psicologo_nombre}</td><td>${h.diagnostico || '—'}</td><td>${activoBadge(h.activo)}</td><td><button class="btn btn-edit btn-sm" data-action="editHistorial" data-id="${h.id_historial}">✏ Editar</button></td></tr>`).join('');
  } catch (err) { console.error(err); }
}

async function loadSesiones() {
  try {
    const rows = await api('GET', '/sesiones');
    if (!$('sesiones-tbody')) return;
    if (!rows.length) { $('sesiones-tbody').innerHTML = `<tr><td colspan="7" class="empty">Sin registros</td></tr>`; return; }
    $('sesiones-tbody').innerHTML = rows.map(s => `<tr><td>${s.id_sesion}</td><td>${fmtDateOnly(s.fecha)}</td><td>${s.paciente_nombre}</td><td>${s.psicologo_nombre}</td><td>${s.numero_sesion}</td><td>${s.resumen || '—'}</td><td>${activoBadge(s.activo)}</td></tr>`).join('');
  } catch (err) { console.error(err); }
}

async function loadHorarios() {
  try {
    const rows = await api('GET', '/horarios');
    if (!$('horarios-tbody')) return;
    if (!rows.length) { $('horarios-tbody').innerHTML = `<tr><td colspan="7" class="empty">Sin registros</td></tr>`; return; }
    $('horarios-tbody').innerHTML = rows.map(h => `<tr><td>${h.id_horario}</td><td>${h.psicologo_nombre}</td><td>${h.dia_semana}</td><td>${h.hora_inicio}</td><td>${h.hora_fin}</td><td>${activoBadge(h.activo)}</td><td><button class="btn btn-danger btn-sm" data-action="deleteHorario" data-id="${h.id_horario}">✕</button></td></tr>`).join('');
  } catch (err) { console.error(err); }
}

async function loadRecordatorios() {
  try {
    const rows = await api('GET', '/recordatorios');
    if (!$('recordatorios-tbody')) return;
    if (!rows.length) { $('recordatorios-tbody').innerHTML = `<tr><td colspan="8" class="empty">Sin registros</td></tr>`; return; }
    $('recordatorios-tbody').innerHTML = rows.map(r => `<tr><td>${r.id_recordatorio}</td><td>${fmtDate(r.fecha_hora)}</td><td>${r.paciente_nombre}</td><td>${r.psicologo_nombre}</td><td>${r.tipo}</td><td>${fmtDate(r.fecha_programada)}</td><td>${r.enviado ? 'Enviado' : 'Pendiente'}</td><td><button class="btn btn-edit btn-sm" data-action="marcarEnviado" data-id="${r.id_recordatorio}">Marcar</button></td></tr>`).join('');
  } catch (err) { console.error(err); }
}

async function loadReportes() {
  try {
    const rows = await api('GET', '/reportes/resumen');
    if ($('reportes-tbody')) {
      $('reportes-tbody').innerHTML = rows.length ? rows.map(r => `<tr><td>${r.indicador}</td><td>${r.total}</td></tr>`).join('') : `<tr><td colspan="2">Sin datos</td></tr>`;
    }
  } catch (err) { console.error(err); }
}

async function loadAuditoria() {
  try {
    const rows = await api('GET', '/auditoria');
    if (!$('auditoria-tbody')) return;
    if (!rows.length) { $('auditoria-tbody').innerHTML = `<tr><td colspan="7" class="empty">Sin registros</td></tr>`; return; }
    $('auditoria-tbody').innerHTML = rows.map(a => `<tr><td>${a.id_auditoria}</td><td>${a.usuario_nombre || '—'}</td><td>${a.modulo}</td><td>${a.accion}</td><td>${a.descripcion || '—'}</td><td>${fmtDate(a.fecha)}</td></tr>`).join('');
  } catch (err) { console.error(err); }
}

// ── DELEGACIÓN DE EVENTOS ──────────────────────
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  e.preventDefault(); // EVITA EL ERROR 500 DE VERCEL (Navegación accidental)
  
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  const name = btn.dataset.name;

  if (action === 'editUsuario') window.editUsuario(id);
  if (action === 'deleteUsuario') window.deleteUsuario(id, name);
  if (action === 'editPsicologo') window.editPsicologo(id);
  if (action === 'editPaciente') window.editPaciente(id);
  if (action === 'deletePaciente') window.deletePaciente(id);
  if (action === 'editCita') window.editCita(id);
  if (action === 'deleteCita') window.deleteCita(id);
});

// Cierra modal al hacer click fuera
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal')) {
    e.target.classList.remove('open');
  }
});

const loaders = {
  dashboard: loadDashboard,
  usuarios: loadUsuarios,
  psicologos: loadPsicologos,
  pacientes: loadPacientes,
  citas: loadCitas,
  calendario: loadCalendar,
  historial: loadHistorial,
  sesiones: loadSesiones,
  horarios: loadHorarios,
  recordatorios: loadRecordatorios,
  reportes: loadReportes,
  auditoria: loadAuditoria
};

// ── INICIO ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const saved = sessionStorage.getItem('sigch_user');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      if ($('login-screen')) $('login-screen').style.display = 'none';
      if ($('sidebar')) $('sidebar').style.display = 'flex';
      if ($('main')) $('main').style.display = 'block';
      if ($('user-name')) $('user-name').textContent = currentUser.nombre_completo;
      aplicarPermisosUI();
      navigate('dashboard');
    } catch(e) {}
  }
  if ($('calendar')) loadCalendar();
});
