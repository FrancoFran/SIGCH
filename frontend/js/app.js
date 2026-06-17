/* PATCHED BY AI: VERSIÓN DEFINITIVA Y SEGURA */
const API = '/api';
let currentUser = null;

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

// Helper API 100% blindado contra bloqueos de navegadores (Tracking Prevention)
async function api(method, path, body = null) {
  let token = null;
  // Intento súper seguro de obtener el token que NUNCA rompe el código
  try { token = localStorage.getItem('accessToken'); } catch (e) {}
  if (!token) {
    try { token = sessionStorage.getItem('accessToken'); } catch (e) {}
  }

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(API + path, opts);
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  
  if (!res.ok) {
    const err = new Error(data && data.error ? data.error : `HTTP ${res.status}`);
    err.status = res.status;
    err.raw = data;
    throw err;
  }
  return data;
}

async function registrarAuditoria(modulo, accion, descripcion) {
  try {
    if (!currentUser) return;
    await api('POST', '/auditoria', { modulo, accion, descripcion });
  } catch (err) {
    console.warn('No se pudo registrar auditoría:', err.message);
  }
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

function jsString(value) {
  return JSON.stringify(String(value || ''));
}

// ── PERMISOS POR ROL ───────────────────────────
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
    const section = link.dataset.nav;
    link.style.display = tienePermiso(section) ? 'flex' : 'none';
  });

  if ($('btn-nuevo-usuario')) $('btn-nuevo-usuario').style.display = puedeGestionarUsuarios() ? 'inline-flex' : 'none';
  if ($('btn-nuevo-psicologo')) $('btn-nuevo-psicologo').style.display = puedeGestionarPsicologos() ? 'inline-flex' : 'none';
  if ($('btn-nuevo-paciente')) $('btn-nuevo-paciente').style.display = puedeGestionarPacientes() ? 'inline-flex' : 'none';
  if ($('btn-nueva-cita')) $('btn-nueva-cita').style.display = puedeGestionarCitas() ? 'inline-flex' : 'none';
  if ($('btn-nuevo-historial')) $('btn-nuevo-historial').style.display = puedeGestionarHistorial() ? 'inline-flex' : 'none';
  if ($('btn-nueva-sesion')) $('btn-nueva-sesion').style.display = tienePermiso('sesiones') ? 'inline-flex' : 'none';
  if ($('btn-nuevo-recordatorio')) $('btn-nuevo-recordatorio').style.display = tienePermiso('recordatorios') ? 'inline-flex' : 'none';
}

// ── AUTH ───────────────────────────────────────
$('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const email = $('login-email').value;
  const contrasena = $('login-pass').value;
  try {
    const data = await api('POST', '/usuarios/auth/login', { email, contrasena });
    const token = data.accessToken || data.token || data.access_token || data.access;
    currentUser = data.user;
    
    // Guardado de tokens blindado
    try {
      if (token) localStorage.setItem('accessToken', token);
      localStorage.setItem('user', JSON.stringify(currentUser));
    } catch (e) {}
    try {
      sessionStorage.setItem('sigch_user', JSON.stringify(currentUser));
      if (token) sessionStorage.setItem('accessToken', token);
    } catch (e) {}

    $('login-screen').style.display = 'none';
    $('sidebar').style.display = 'flex';
    $('main').style.display = 'block';
    if ($('user-name')) $('user-name').textContent = currentUser.nombre_completo || currentUser.email || '—';
    if ($('user-role')) $('user-role').textContent = currentUser.rol || '—';
    
    aplicarPermisosUI();
    navigate('dashboard');
    if (window.calendar && typeof window.calendar.refetchEvents === 'function') window.calendar.refetchEvents();
  } catch (err) {
    showAlert(err.message || (err.error || 'Error de autenticación'), 'error', 'login-alert');
  }
});

$('logout-btn').addEventListener('click', () => {
  currentUser = null;
  try {
    sessionStorage.removeItem('sigch_user');
    sessionStorage.removeItem('accessToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  } catch(e) {}

  $('login-screen').style.display = 'flex';
  $('sidebar').style.display = 'none';
  $('main').style.display = 'none';
  if ($('login-pass')) $('login-pass').value = '';
});

// ── NAVIGATION ─────────────────────────────────
function navigate(section) {
  if (!currentUser) {
    $('login-screen').style.display = 'flex';
    $('sidebar').style.display = 'none';
    $('main').style.display = 'none';
    return;
  }

  if (!tienePermiso(section)) {
    alert('No tiene permiso para acceder a este módulo.');
    section = 'dashboard';
  }

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

// ── MODAL HELPERS (AQUÍ ESTÁ LA SOLUCIÓN DEL MODAL OCULTO) ──
function openModal(id) {
  const modal = $(id);
  if (modal) {
    modal.classList.add('open');
    modal.style.display = 'block'; // Fuerza a que se muestre el overlay
    
    const content = modal.querySelector('.modal-content');
    if (content) {
      content.style.display = 'block'; // Fuerza la caja blanca a mostrarse
      content.style.visibility = 'visible';
      content.style.opacity = '1';
    }
  }
}

function closeModal(id) {
  const modal = $(id);
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
}

document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
  btn.addEventListener('click', () => {
    const modal = btn.closest('.modal-overlay') || btn.closest('.modal');
    if (modal) {
      modal.classList.remove('open');
      modal.style.display = 'none';
    }
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
      tbody.innerHTML = `<tr><td colspan="5" class="empty"><div class="icon">📅</div>No hay citas programadas</td></tr>`;
      return;
    }

    tbody.innerHTML = citas.slice(0, 8).map(c => `
      <tr>
        <td>${fmtDate(c.fecha_hora)}</td>
        <td>${c.paciente_nombre}</td>
        <td>${c.psicologo_nombre}</td>
        <td>${c.motivo || '—'}</td>
        <td>${estadoBadge(c.estado)}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

// ── USUARIOS ───────────────────────────────────
let editingUsuario = null;

async function loadUsuarios() {
  if (!puedeGestionarUsuarios()) return;
  try {
    const rows = await api('GET', '/usuarios');
    const tbody = $('usuarios-tbody');
    if (!tbody) return;

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty"><div class="icon">👤</div>Sin usuarios</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(u => `
      <tr>
        <td>${u.id_usuario}</td>
        <td>${u.nombre_completo}</td>
        <td>${u.email}</td>
        <td>${rolBadge(u.rol)}</td>
        <td>${activoBadge(u.activo)}</td>
        <td>
          <button class="btn btn-edit btn-sm" data-action="editUsuario" data-id="${u.id_usuario}">✏ Editar</button>
          <button class="btn btn-danger btn-sm" data-action="deleteUsuario" data-id="${u.id_usuario}" data-name="${u.nombre_completo}">✕</button>
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

window.deleteUsuario = async (id, nombre) => {
  if (currentUser && Number(id) === Number(currentUser.id_usuario)) return alert('No puedes desactivar tu usuario.');
  if (!confirm(`¿Desactivar al usuario "${nombre}"?`)) return;
  try {
    await api('DELETE', `/usuarios/${id}`);
    loadUsuarios();
  } catch (err) { alert(err.message); }
};

if ($('btn-nuevo-usuario')) {
  $('btn-nuevo-usuario').addEventListener('click', () => {
    editingUsuario = null;
    if ($('form-usuario')) $('form-usuario').reset();
    if ($('modal-usuario-title')) $('modal-usuario-title').textContent = 'Nuevo Usuario';
    openModal('modal-usuario');
  });
}

if ($('form-usuario')) {
  $('form-usuario').addEventListener('submit', async e => {
    e.preventDefault();
    const pass = $('u-pass') ? $('u-pass').value : '';
    const body = {
      nombre_completo: $('u-nombre').value,
      email: $('u-email').value,
      rol: $('u-rol').value
    };
    if (pass) body.contrasena = pass;
    try {
      if (editingUsuario) await api('PUT', `/usuarios/${editingUsuario}`, body);
      else await api('POST', '/usuarios', { ...body, contrasena: pass });
      closeModal('modal-usuario');
      loadUsuarios();
    } catch (err) { showAlert(err.message); }
  });
}

// ── PSICÓLOGOS ─────────────────────────────────
let editingPsicologo = null;

async function loadPsicologos() {
  if (!puedeGestionarPsicologos()) return;
  try {
    const rows = await api('GET', '/psicologos');
    const tbody = $('psicologos-tbody');
    if (!tbody) return;

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty"><div class="icon">🩺</div>Sin psicólogos</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(p => `
      <tr>
        <td>${p.id_psicologo}</td>
        <td>${p.nombre_completo}</td>
        <td>${p.especialidad}</td>
        <td>${p.registro_profesional}</td>
        <td>${activoBadge(p.activo)}</td>
        <td>
          <button class="btn btn-edit btn-sm" data-action="editPsicologo" data-id="${p.id_psicologo}">✏ Editar</button>
          <button class="btn btn-danger btn-sm" data-action="deletePsicologo" data-id="${p.id_psicologo}">✕</button>
        </td>
      </tr>
    `).join('');
  } catch (err) { console.error(err); }
}

async function populatePsicologoUsers() {
  try {
    const [usuarios, psicologos] = await Promise.all([api('GET', '/usuarios'), api('GET', '/psicologos')]);
    const asignados = psicologos.filter(p => p.activo).map(p => Number(p.id_usuario));
    if ($('ps-id-usuario')) {
      $('ps-id-usuario').innerHTML = '<option value="">— Seleccionar usuario —</option>' + usuarios.filter(u => {
        if (u.rol !== 'psicologo' || !u.activo) return false;
        if (editingPsicologo) return true;
        return !asignados.includes(Number(u.id_usuario));
      }).map(u => `<option value="${u.id_usuario}">${u.nombre_completo}</option>`).join('');
    }
  } catch (err) { console.error(err); }
}

window.editPsicologo = async id => {
  editingPsicologo = id;
  try {
    const p = await api('GET', `/psicologos/${id}`);
    await populatePsicologoUsers();
    if ($('ps-id-usuario')) $('ps-id-usuario').value = p.id_usuario;
    if ($('ps-nombre')) $('ps-nombre').value = p.nombre_completo;
    if ($('ps-especialidad')) $('ps-especialidad').value = p.especialidad;
    if ($('ps-registro')) $('ps-registro').value = p.registro_profesional;
    if ($('modal-psicologo-title')) $('modal-psicologo-title').textContent = 'Editar Psicólogo';
    openModal('modal-psicologo');
  } catch (err) { alert(err.message); }
};

window.deletePsicologo = async id => {
  if (!confirm('¿Desactivar este psicólogo?')) return;
  try {
    await api('DELETE', `/psicologos/${id}`);
    loadPsicologos();
  } catch (err) { alert(err.message); }
};

if ($('btn-nuevo-psicologo')) {
  $('btn-nuevo-psicologo').addEventListener('click', async () => {
    editingPsicologo = null;
    if ($('form-psicologo')) $('form-psicologo').reset();
    if ($('modal-psicologo-title')) $('modal-psicologo-title').textContent = 'Nuevo Psicólogo';
    await populatePsicologoUsers();
    openModal('modal-psicologo');
  });
}

if ($('form-psicologo')) {
  $('form-psicologo').addEventListener('submit', async e => {
    e.preventDefault();
    const body = {
      id_usuario: parseInt($('ps-id-usuario').value),
      nombre_completo: $('ps-nombre').value,
      especialidad: $('ps-especialidad').value,
      registro_profesional: $('ps-registro').value
    };
    try {
      if (editingPsicologo) await api('PUT', `/psicologos/${editingPsicologo}`, body);
      else await api('POST', '/psicologos', body);
      closeModal('modal-psicologo');
      loadPsicologos();
    } catch (err) { showAlert(err.message, 'error', 'modal-alert-ps'); }
  });
}

// ── PACIENTES ──────────────────────────────────
let editingPaciente = null;

async function loadPacientes(q = '') {
  try {
    const rows = await api('GET', `/pacientes${q ? '?q=' + encodeURIComponent(q) : ''}`);
    const tbody = $('pacientes-tbody');
    if (!tbody) return;

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty"><div class="icon">🧑‍⚕️</div>No se encontraron pacientes</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(p => {
      const acciones = puedeGestionarPacientes()
        ? `<button class="btn btn-edit btn-sm" data-action="editPaciente" data-id="${p.id_paciente}">✏ Editar</button>
           <button class="btn btn-danger btn-sm" data-action="deletePaciente" data-id="${p.id_paciente}">✕</button>`
        : '<span class="badge badge-gray">Solo lectura</span>';

      return `<tr>
        <td>${p.id_paciente}</td>
        <td>${p.nombre_completo}</td>
        <td>${p.ci}</td>
        <td>${fmtDateOnly(p.fecha_nacimiento)}</td>
        <td>${p.telefono}</td>
        <td>${activoBadge(p.activo)}</td>
        <td>${acciones}</td>
      </tr>`;
    }).join('');
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
  try {
    await api('DELETE', `/pacientes/${id}`);
    loadPacientes();
  } catch (err) { alert(err.message); }
};

if ($('btn-nuevo-paciente')) {
  $('btn-nuevo-paciente').addEventListener('click', () => {
    editingPaciente = null;
    if ($('form-paciente')) $('form-paciente').reset();
    if ($('modal-paciente-title')) $('modal-paciente-title').textContent = 'Nuevo Paciente';
    openModal('modal-paciente');
  });
}

if ($('search-paciente')) {
  $('search-paciente').addEventListener('input', e => loadPacientes(e.target.value));
}

if ($('form-paciente')) {
  $('form-paciente').addEventListener('submit', async e => {
    e.preventDefault();
    const body = {
      nombre_completo: $('p-nombre').value,
      ci: $('p-ci').value,
      fecha_nacimiento: $('p-fnac').value,
      telefono: $('p-tel').value,
      email: $('p-email').value || null,
      direccion: $('p-direccion').value || null
    };

    try {
      if (editingPaciente) await api('PUT', `/pacientes/${editingPaciente}`, body);
      else await api('POST', '/pacientes', body);
      closeModal('modal-paciente');
      loadPacientes();
    } catch (err) { showAlert(err.message, 'error', 'modal-alert-pac'); }
  });
}

// ── CITAS ──────────────────────────────────────
let editingCita = null;

async function loadCitas() {
  try {
    const rows = await api('GET', '/citas');
    const tbody = $('citas-tbody');
    if (!tbody) return;

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty"><div class="icon">📅</div>Sin citas registradas</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(c => {
      const acciones = puedeGestionarCitas()
        ? `<button class="btn btn-edit btn-sm" data-action="editCita" data-id="${c.id_cita}">✏ Editar</button>
           <button class="btn btn-danger btn-sm" data-action="deleteCita" data-id="${c.id_cita}">✕</button>`
        : '<span class="badge badge-gray">Solo lectura</span>';

      return `<tr>
        <td>${c.id_cita}</td>
        <td>${fmtDate(c.fecha_hora)}</td>
        <td>${c.paciente_nombre}</td>
        <td>${c.psicologo_nombre}</td>
        <td>${c.motivo || '—'}</td>
        <td>${estadoBadge(c.estado)}</td>
        <td>${acciones}</td>
      </tr>`;
    }).join('');
  } catch (err) { console.error(err); }
}

async function populateCitaSelects() {
  try {
    const [pacientes, psicologos] = await Promise.all([api('GET', '/pacientes'), api('GET', '/psicologos')]);
    if ($('c-paciente')) {
      $('c-paciente').innerHTML = '<option value="">— Seleccionar —</option>' + pacientes.filter(p => p.activo).map(p => `<option value="${p.id_paciente}">${p.nombre_completo} (${p.ci})</option>`).join('');
    }
    if ($('c-psicologo')) {
      $('c-psicologo').innerHTML = '<option value="">— Seleccionar —</option>' + psicologos.filter(p => p.activo).map(p => `<option value="${p.id_psicologo}">${p.nombre_completo}</option>`).join('');
    }
  } catch (err) { console.error(err); }
}

window.editCita = async id => {
  editingCita = id;
  await populateCitaSelects();
  try {
    const c = await api('GET', `/citas/${id}`);
    
    // Asigna valor compatible con tu diseño HTML
    const setValue = (id1, val) => { if ($(id1)) $(id1).value = val; };
    setValue('c-paciente', c.id_paciente || c.paciente_id);
    setValue('edit-paciente_id', c.id_paciente || c.paciente_id);
    setValue('c-psicologo', c.id_psicologo || c.psicologo_id);
    setValue('edit-psicologo_id', c.id_psicologo || c.psicologo_id);

    const fecha = (c.fecha_hora || c.inicio || '').slice(0, 16);
    setValue('c-fecha', fecha);
    setValue('edit-fecha_hora', fecha);
    setValue('c-motivo', c.motivo || c.titulo || '');
    setValue('edit-motivo', c.motivo || c.titulo || '');
    
    if ($('c-estado')) $('c-estado').value = c.estado || 'programada';
    if ($('modal-cita-title')) $('modal-cita-title').textContent = 'Editar Cita';
    if ($('c-estado-group')) $('c-estado-group').style.display = 'block';

    if ($('modal-cita')) openModal('modal-cita');
    else if ($('editModal')) openModal('editModal');
  } catch (err) { alert(err.message); }
};

window.deleteCita = async id => {
  if (!confirm('¿Cancelar esta cita?')) return;
  try {
    await api('DELETE', `/citas/${id}`);
    loadCitas();
    loadDashboard();
    loadCalendar();
  } catch (err) { alert(err.message); }
};

if ($('btn-nueva-cita')) {
  $('btn-nueva-cita').addEventListener('click', async () => {
    editingCita = null;
    if ($('form-cita')) $('form-cita').reset();
    if ($('modal-cita-title')) $('modal-cita-title').textContent = 'Nueva Cita';
    if ($('c-estado-group')) $('c-estado-group').style.display = 'none';
    await populateCitaSelects();
    
    if ($('modal-cita')) openModal('modal-cita');
    else if ($('editModal')) openModal('editModal');
  });
}

if ($('form-cita')) {
  $('form-cita').addEventListener('submit', async e => {
    e.preventDefault();
    const body = {
      id_paciente: parseInt($('c-paciente') ? $('c-paciente').value : $('edit-paciente_id').value),
      id_psicologo: parseInt($('c-psicologo') ? $('c-psicologo').value : $('edit-psicologo_id').value),
      fecha_hora: ($('c-fecha') ? $('c-fecha').value : $('edit-fecha_hora').value).replace('T', ' '),
      motivo: $('c-motivo') ? $('c-motivo').value : ($('edit-motivo') ? $('edit-motivo').value : null)
    };

    if (editingCita && $('c-estado')) body.estado = $('c-estado').value;

    try {
      if (editingCita) await api('PUT', `/citas/${editingCita}`, body);
      else await api('POST', '/citas', body);

      closeModal('modal-cita');
      closeModal('editModal');
      loadCitas();
      loadDashboard();
      loadCalendar();
    } catch (err) { showAlert(err.message, 'error', 'modal-alert-cita'); }
  });
}

// ── CALENDARIO MANUAL ──────────────────────────
let calDate = new Date();

async function loadCalendar() {
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

    const container = document.getElementById('calendar');
    if (!container) return;

    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'calendar-grid';

    ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].forEach(h => {
      const el = document.createElement('div');
      el.className = 'cal-header';
      el.textContent = h;
      grid.appendChild(el);
    });

    const first = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date().toISOString().slice(0, 10);

    for (let i = 0; i < first; i++) {
      const div = document.createElement('div');
      div.className = 'cal-day other-month';
      grid.appendChild(div);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const div = document.createElement('div');
      div.className = 'cal-day' + (key === today ? ' today' : '');
      div.setAttribute('data-date', key);

      const dotsHtml = citaMap[key] ? `<div class="dot-row">${'<div class="dot"></div>'.repeat(Math.min(citaMap[key], 4))}</div>` : '';
      div.innerHTML = `<span class="cal-day-number">${d}</span>${dotsHtml}`;
      
      div.addEventListener('click', () => {
        openDayModal(key, citasByDate[key] || []);
      });
      grid.appendChild(div);
    }
    container.appendChild(grid);
  } catch (err) { console.error('Error en loadCalendar:', err); }
}

function openDayModal(dateStr, events) {
  const modalDateTitle = document.getElementById('modalDateTitle');
  const eventsList = document.getElementById('eventsList');
  const noEvents = document.getElementById('noEvents');

  if (modalDateTitle) modalDateTitle.textContent = new Date(dateStr).toLocaleDateString();
  openModal('dayModal');

  if (!eventsList) return;
  eventsList.innerHTML = '';

  if (!events.length) {
    if (noEvents) noEvents.style.display = 'block';
    return;
  }
  if (noEvents) noEvents.style.display = 'none';

  events.forEach(e => {
    const li = document.createElement('li');
    li.className = 'event-item';

    const left = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'event-title';
    title.textContent = e.titulo || e.motivo || 'Sin título';

    const time = document.createElement('div');
    time.className = 'event-time';
    const inicio = e.fecha_hora || e.inicio;
    time.textContent = inicio ? new Date(inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    left.appendChild(title);
    left.appendChild(time);

    const actions = document.createElement('div');
    actions.className = 'event-actions';

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Eliminar';
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Eliminar esta cita?')) return;
      try {
        await api('DELETE', `/citas/${e.id || e.id_cita}`);
        loadCalendar();
        closeModal('dayModal');
      } catch (err) { alert('No se pudo eliminar la cita.'); }
    });

    actions.appendChild(deleteBtn);
    li.appendChild(left);
    li.appendChild(actions);
    eventsList.appendChild(li);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if ($('cal-prev')) $('cal-prev').addEventListener('click', () => { calDate.setMonth(calDate.getMonth() - 1); loadCalendar(); });
  if ($('cal-next')) $('cal-next').addEventListener('click', () => { calDate.setMonth(calDate.getMonth() + 1); loadCalendar(); });
});

// ── HISTORIAL CLÍNICO ──────────────────────────
let editingHistorial = null;
async function loadHistorial() {
  try {
    const rows = await api('GET', '/historial');
    const tbody = $('historial-tbody');
    if (!tbody) return;
    if (!rows.length) { tbody.innerHTML = `<tr><td colspan="7" class="empty">Sin historiales</td></tr>`; return; }
    tbody.innerHTML = rows.map(h => `<tr><td>${h.id_historial}</td><td>${fmtDateOnly(h.fecha)}</td><td>${h.paciente_nombre}</td><td>${h.psicologo_nombre}</td><td>${h.diagnostico || '—'}</td><td>${activoBadge(h.activo)}</td><td><button class="btn btn-edit btn-sm" data-action="editHistorial" data-id="${h.id_historial}">✏ Editar</button> <button class="btn btn-danger btn-sm" data-action="deleteHistorial" data-id="${h.id_historial}">✕</button></td></tr>`).join('');
  } catch (err) { console.error(err); }
}

async function populateHistorialSelects() {
  try {
    const [pacientes, psicologos] = await Promise.all([api('GET', '/pacientes'), api('GET', '/psicologos')]);
    if ($('h-paciente')) $('h-paciente').innerHTML = '<option value="">— Seleccionar paciente —</option>' + pacientes.filter(p => p.activo).map(p => `<option value="${p.id_paciente}">${p.nombre_completo}</option>`).join('');
    if ($('h-psicologo')) $('h-psicologo').innerHTML = '<option value="">— Seleccionar psicólogo —</option>' + psicologos.filter(p => p.activo).map(p => `<option value="${p.id_psicologo}">${p.nombre_completo}</option>`).join('');
  } catch (err) { console.error(err); }
}

window.editHistorial = async id => {
  editingHistorial = id;
  await populateHistorialSelects();
  try {
    const h = await api('GET', `/historial/${id}`);
    if ($('h-paciente')) $('h-paciente').value = h.id_paciente;
    if ($('h-psicologo')) $('h-psicologo').value = h.id_psicologo;
    if ($('h-fecha')) $('h-fecha').value = h.fecha?.split('T')[0] || '';
    if ($('h-diagnostico')) $('h-diagnostico').value = h.diagnostico || '';
    if ($('h-tratamiento')) $('h-tratamiento').value = h.tratamiento || '';
    if ($('h-observaciones')) $('h-observaciones').value = h.observaciones || '';
    if ($('modal-historial-title')) $('modal-historial-title').textContent = 'Editar Historial Clínico';
    openModal('modal-historial');
  } catch (err) { alert(err.message); }
};

window.deleteHistorial = async id => {
  if (!confirm('¿Desactivar este historial?')) return;
  try { await api('DELETE', `/historial/${id}`); loadHistorial(); } catch (err) { alert(err.message); }
};

if ($('btn-nuevo-historial')) {
  $('btn-nuevo-historial').addEventListener('click', async () => {
    editingHistorial = null;
    if ($('form-historial')) $('form-historial').reset();
    if ($('modal-historial-title')) $('modal-historial-title').textContent = 'Nuevo Historial Clínico';
    if ($('h-fecha')) $('h-fecha').value = new Date().toISOString().slice(0, 10);
    await populateHistorialSelects();
    openModal('modal-historial');
  });
}

if ($('form-historial')) {
  $('form-historial').addEventListener('submit', async e => {
    e.preventDefault();
    const body = { id_paciente: parseInt($('h-paciente').value), id_psicologo: parseInt($('h-psicologo').value), fecha: $('h-fecha').value, diagnostico: $('h-diagnostico').value, tratamiento: $('h-tratamiento').value || null, observaciones: $('h-observaciones').value || null };
    try {
      if (editingHistorial) await api('PUT', `/historial/${editingHistorial}`, body);
      else await api('POST', '/historial', body);
      closeModal('modal-historial');
      loadHistorial();
    } catch (err) { showAlert(err.message, 'error', 'modal-alert-historial'); }
  });
}

// ── HORARIOS ───────────────────────────────────
let editingHorario = null;
async function loadHorarios() {
  try {
    const rows = await api('GET', '/horarios');
    const tbody = $('horarios-tbody');
    if (!tbody) return;
    if (!rows.length) { tbody.innerHTML = `<tr><td colspan="7" class="empty">Sin horarios</td></tr>`; return; }
    tbody.innerHTML = rows.map(h => `<tr><td>${h.id_horario}</td><td>${h.psicologo_nombre}</td><td>${h.dia_semana}</td><td>${h.hora_inicio}</td><td>${h.hora_fin}</td><td>${activoBadge(h.activo)}</td><td><button class="btn btn-edit btn-sm" data-action="editHorario" data-id="${h.id_horario}">✏ Editar</button> <button class="btn btn-danger btn-sm" data-action="deleteHorario" data-id="${h.id_horario}">✕</button></td></tr>`).join('');
  } catch (err) { console.error(err); }
}

async function populateHorarioPsicologos() {
  try {
    const psicologos = await api('GET', '/psicologos');
    if ($('ho-psicologo')) $('ho-psicologo').innerHTML = '<option value="">— Seleccionar psicólogo —</option>' + psicologos.filter(p => p.activo).map(p => `<option value="${p.id_psicologo}">${p.nombre_completo}</option>`).join('');
  } catch (err) { console.error(err); }
}

window.editHorario = async id => {
  editingHorario = id;
  await populateHorarioPsicologos();
  try {
    const h = await api('GET', `/horarios/${id}`);
    if ($('ho-psicologo')) $('ho-psicologo').value = h.id_psicologo;
    if ($('ho-dia')) $('ho-dia').value = h.dia_semana;
    if ($('ho-inicio')) $('ho-inicio').value = String(h.hora_inicio).slice(0, 5);
    if ($('ho-fin')) $('ho-fin').value = String(h.hora_fin).slice(0, 5);
    if ($('modal-horario-title')) $('modal-horario-title').textContent = 'Editar Horario';
    openModal('modal-horario');
  } catch (err) { alert(err.message); }
};

window.deleteHorario = async id => {
  if (!confirm('¿Desactivar horario?')) return;
  try { await api('DELETE', `/horarios/${id}`); loadHorarios(); } catch (err) { alert(err.message); }
};

if ($('btn-nuevo-horario')) {
  $('btn-nuevo-horario').addEventListener('click', async () => {
    editingHorario = null;
    if ($('form-horario')) $('form-horario').reset();
    if ($('modal-horario-title')) $('modal-horario-title').textContent = 'Nuevo Horario';
    await populateHorarioPsicologos();
    openModal('modal-horario');
  });
}

if ($('form-horario')) {
  $('form-horario').addEventListener('submit', async e => {
    e.preventDefault();
    const body = { id_psicologo: parseInt($('ho-psicologo').value), dia_semana: $('ho-dia').value, hora_inicio: $('ho-inicio').value, hora_fin: $('ho-fin').value };
    try {
      if (editingHorario) await api('PUT', `/horarios/${editingHorario}`, body);
      else await api('POST', '/horarios', body);
      closeModal('modal-horario');
      loadHorarios();
    } catch (err) { showAlert(err.message, 'error', 'modal-alert-horario'); }
  });
}

// ── SESIONES CLÍNICAS ──────────────────────────
async function loadSesiones() {
  try {
    const rows = await api('GET', '/sesiones');
    const tbody = $('sesiones-tbody');
    if (!tbody) return;
    if (!rows.length) { tbody.innerHTML = `<tr><td colspan="7" class="empty">Sin sesiones</td></tr>`; return; }
    tbody.innerHTML = rows.map(s => `<tr><td>${s.id_sesion}</td><td>${fmtDateOnly(s.fecha)}</td><td>${s.paciente_nombre}</td><td>${s.psicologo_nombre}</td><td>${s.numero_sesion}</td><td>${s.resumen || '—'}</td><td>${activoBadge(s.activo)}</td></tr>`).join('');
  } catch (err) { console.error(err); }
}

async function populateSesionCitas() {
  try {
    const citas = await api('GET', '/citas');
    if ($('s-cita')) $('s-cita').innerHTML = '<option value="">— Seleccionar cita —</option>' + citas.filter(c => c.activo && c.estado !== 'cancelada').map(c => `<option value="${c.id_cita}" data-paciente="${c.id_paciente}" data-psicologo="${c.id_psicologo}">${fmtDate(c.fecha_hora)} — ${c.paciente_nombre} / ${c.psicologo_nombre}</option>`).join('');
  } catch (err) { console.error(err); }
}

if ($('btn-nueva-sesion')) {
  $('btn-nueva-sesion').addEventListener('click', async () => {
    if ($('form-sesion')) $('form-sesion').reset();
    if ($('s-fecha')) $('s-fecha').value = new Date().toISOString().slice(0, 10);
    await populateSesionCitas();
    openModal('modal-sesion');
  });
}

if ($('form-sesion')) {
  $('form-sesion').addEventListener('submit', async e => {
    e.preventDefault();
    const option = $('s-cita').selectedOptions[0];
    const body = { id_cita: parseInt($('s-cita').value), id_paciente: parseInt(option.dataset.paciente), id_psicologo: parseInt(option.dataset.psicologo), numero_sesion: parseInt($('s-numero').value), fecha: $('s-fecha').value, resumen: $('s-resumen').value, tecnicas_aplicadas: $('s-tecnicas').value || null, tareas_asignadas: $('s-tareas').value || null, evolucion: $('s-evolucion').value || null };
    try { await api('POST', '/sesiones', body); closeModal('modal-sesion'); loadSesiones(); } catch (err) { showAlert(err.message, 'error', 'modal-alert-sesion'); }
  });
}

// ── RECORDATORIOS ──────────────────────────────
async function loadRecordatorios() {
  try {
    const rows = await api('GET', '/recordatorios');
    const tbody = $('recordatorios-tbody');
    if (!tbody) return;
    if (!rows.length) { tbody.innerHTML = `<tr><td colspan="8" class="empty">Sin recordatorios</td></tr>`; return; }
    tbody.innerHTML = rows.map(r => `<tr><td>${r.id_recordatorio}</td><td>${fmtDate(r.fecha_hora)}</td><td>${r.paciente_nombre}</td><td>${r.psicologo_nombre}</td><td>${r.tipo}</td><td>${fmtDate(r.fecha_programada)}</td><td>${r.enviado ? 'Enviado' : 'Pendiente'}</td><td>${r.enviado ? '—' : `<button class="btn btn-edit btn-sm" data-action="marcarEnviado" data-id="${r.id_recordatorio}">Marcar</button>`}</td></tr>`).join('');
  } catch (err) { console.error(err); }
}

window.marcarRecordatorioEnviado = async id => {
  try { await api('PUT', `/recordatorios/${id}/enviado`); loadRecordatorios(); } catch (err) { alert(err.message); }
};

async function populateRecordatorioCitas() {
  try {
    const citas = await api('GET', '/citas');
    if ($('r-cita')) $('r-cita').innerHTML = '<option value="">— Seleccionar cita —</option>' + citas.filter(c => c.activo && c.estado === 'programada').map(c => `<option value="${c.id_cita}">${fmtDate(c.fecha_hora)} — ${c.paciente_nombre}</option>`).join('');
  } catch (err) { console.error(err); }
}

if ($('btn-nuevo-recordatorio')) {
  $('btn-nuevo-recordatorio').addEventListener('click', async () => {
    if ($('form-recordatorio')) $('form-recordatorio').reset();
    const fecha = new Date(); fecha.setHours(fecha.getHours() + 1);
    if ($('r-fecha')) $('r-fecha').value = fecha.toISOString().slice(0, 16);
    await populateRecordatorioCitas();
    openModal('modal-recordatorio');
  });
}

if ($('form-recordatorio')) {
  $('form-recordatorio').addEventListener('submit', async e => {
    e.preventDefault();
    const body = { id_cita: parseInt($('r-cita').value), tipo: $('r-tipo').value, mensaje: $('r-mensaje').value, fecha_programada: $('r-fecha').value.replace('T', ' ') };
    try { await api('POST', '/recordatorios', body); closeModal('modal-recordatorio'); loadRecordatorios(); } catch (err) { showAlert(err.message, 'error', 'modal-alert-recordatorio'); }
  });
}

// ── REPORTES Y AUDITORÍA ───────────────────────
async function loadReportes() {
  try {
    const rows = await api('GET', '/reportes/resumen');
    if ($('reportes-head')) $('reportes-head').innerHTML = `<tr><th>Indicador</th><th>Total</th></tr>`;
    if ($('reportes-tbody')) $('reportes-tbody').innerHTML = rows.length ? rows.map(r => `<tr><td>${r.indicador}</td><td>${r.total}</td></tr>`).join('') : `<tr><td colspan="2">Sin datos</td></tr>`;
  } catch (err) { console.error(err); }
}

async function cargarReporteCitas() {
  try {
    const rows = await api('GET', '/reportes/citas');
    if ($('reportes-head')) $('reportes-head').innerHTML = `<tr><th>#</th><th>Fecha</th><th>Paciente</th><th>Psicólogo</th><th>Motivo</th><th>Estado</th></tr>`;
    if ($('reportes-tbody')) $('reportes-tbody').innerHTML = rows.length ? rows.map(c => `<tr><td>${c.id_cita}</td><td>${fmtDate(c.fecha_hora)}</td><td>${c.paciente_nombre}</td><td>${c.psicologo_nombre}</td><td>${c.motivo || '—'}</td><td>${estadoBadge(c.estado)}</td></tr>`).join('') : `<tr><td colspan="6">Sin citas</td></tr>`;
  } catch (err) { console.error(err); }
}

if ($('btn-reporte-resumen')) $('btn-reporte-resumen').addEventListener('click', loadReportes);
if ($('btn-reporte-citas')) $('btn-reporte-citas').addEventListener('click', cargarReporteCitas);

async function loadAuditoria() {
  try {
    const rows = await api('GET', '/auditoria');
    const tbody = $('auditoria-tbody');
    if (!tbody) return;
    if (!rows.length) { tbody.innerHTML = `<tr><td colspan="7" class="empty">Sin registros</td></tr>`; return; }
    tbody.innerHTML = rows.map(a => `<tr><td>${a.id_auditoria}</td><td>${a.usuario_nombre || '—'}</td><td>${a.rol || '—'}</td><td>${a.modulo}</td><td>${a.accion}</td><td>${a.descripcion || '—'}</td><td>${fmtDate(a.fecha)}</td></tr>`).join('');
  } catch (err) { console.error(err); }
}

// ── DELEGACIÓN GLOBAL DE EVENTOS (LA CLAVE CONTRA EL ERROR 500) ──
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  
  e.preventDefault(); // ¡BLOQUEA EL RECARGO DE LA PÁGINA (ERROR 500)!

  const action = btn.dataset.action;
  const id = btn.dataset.id;
  const name = btn.dataset.name;

  if (action === 'editUsuario') window.editUsuario(id);
  if (action === 'deleteUsuario') window.deleteUsuario(id, name);
  if (action === 'editPsicologo') window.editPsicologo(id);
  if (action === 'deletePsicologo') window.deletePsicologo(id);
  if (action === 'editPaciente') window.editPaciente(id);
  if (action === 'deletePaciente') window.deletePaciente(id);
  if (action === 'editCita') window.editCita(id);
  if (action === 'deleteCita') window.deleteCita(id);
  if (action === 'editHistorial') window.editHistorial(id);
  if (action === 'deleteHistorial') window.deleteHistorial(id);
  if (action === 'editHorario') window.editHorario(id);
  if (action === 'deleteHorario') window.deleteHorario(id);
  if (action === 'marcarEnviado') window.marcarRecordatorioEnviado(id);
});

// Cierra modal al hacer click fuera de la caja blanca
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal')) {
    e.target.classList.remove('open');
    e.target.style.display = 'none';
  }
});

// ── LOADERS MAP E INICIO ───────────────────────
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

document.addEventListener('DOMContentLoaded', () => {
  const saved = sessionStorage.getItem('sigch_user');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      if ($('login-screen')) $('login-screen').style.display = 'none';
      if ($('sidebar')) $('sidebar').style.display = 'flex';
      if ($('main')) $('main').style.display = 'block';
      if ($('user-name')) $('user-name').textContent = currentUser.nombre_completo;
      if ($('user-role')) $('user-role').textContent = currentUser.rol;
      aplicarPermisosUI();
      navigate('dashboard');
    } catch(e) {}
  }

  // Se fuerza a cargar el calendario si la vista lo requiere
  if ($('calendar')) loadCalendar();
});
