// frontend/js/app.js asdasdas
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

// Helper api robusto (reemplaza la función api existente)
async function api(method, path, body = null) {
  const token = (function() {
    try { return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken'); }
    catch (e) { return sessionStorage.getItem('accessToken'); }
  })();

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch('/api' + path, opts);
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

    await api('POST', '/auditoria', {
      modulo,
      accion,
      descripcion
    });
  } catch (err) {
    console.warn('No se pudo registrar auditoría:', err.message);
  }
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-BO', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
}

function fmtDateOnly(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-BO');
}

function rolBadge(rol) {
  const map = {
    administrador: 'badge-blue',
    psicologo: 'badge-green',
    recepcionista: 'badge-yellow'
  };

  return `<span class="badge ${map[rol] || 'badge-gray'}">${rol}</span>`;
}

function estadoBadge(e) {
  const map = {
    programada: 'badge-blue',
    realizada: 'badge-green',
    cancelada: 'badge-red'
  };

  return `<span class="badge ${map[e] || 'badge-gray'}">${e}</span>`;
}

function activoBadge(a) {
  return a
    ? '<span class="badge badge-green">Activo</span>'
    : '<span class="badge badge-gray">Inactivo</span>';
}

function jsString(value) {
  return JSON.stringify(String(value || ''));
}

// ── PERMISOS POR ROL ───────────────────────────
const permisosPorRol = {
  administrador: [
    'dashboard',
    'citas',
    'calendario',
    'pacientes',
    'historial',
    'sesiones',
    'horarios',
    'recordatorios',
    'reportes',
    'auditoria',
    'psicologos',
    'usuarios'
  ],
  recepcionista: [
    'dashboard',
    'citas',
    'calendario',
    'pacientes',
    'recordatorios'
  ],
  psicologo: [
    'dashboard',
    'citas',
    'calendario',
    'pacientes',
    'historial',
    'sesiones'
  ]
};

function tienePermiso(section) {
  if (!currentUser) return false;
  return permisosPorRol[currentUser.rol]?.includes(section) || false;
}

function esAdmin() {
  return currentUser && currentUser.rol === 'administrador';
}

function esRecepcionista() {
  return currentUser && currentUser.rol === 'recepcionista';
}

function esPsicologo() {
  return currentUser && currentUser.rol === 'psicologo';
}

function puedeGestionarUsuarios() {
  return esAdmin();
}

function puedeGestionarPsicologos() {
  return esAdmin();
}

function puedeGestionarPacientes() {
  return esAdmin() || esRecepcionista();
}

function puedeGestionarCitas() {
  return esAdmin() || esRecepcionista();
}

function puedeGestionarHistorial() {
  return esAdmin() || esPsicologo();
}

function aplicarPermisosUI() {
  if (!currentUser) return;

  document.querySelectorAll('[data-nav]').forEach(link => {
    const section = link.dataset.nav;
    link.style.display = tienePermiso(section) ? 'flex' : 'none';
  });

  if ($('btn-nuevo-usuario')) {
    $('btn-nuevo-usuario').style.display =
      puedeGestionarUsuarios() ? 'inline-flex' : 'none';
  }

  if ($('btn-nuevo-psicologo')) {
    $('btn-nuevo-psicologo').style.display =
      puedeGestionarPsicologos() ? 'inline-flex' : 'none';
  }

  if ($('btn-nuevo-paciente')) {
    $('btn-nuevo-paciente').style.display =
      puedeGestionarPacientes() ? 'inline-flex' : 'none';
  }

  if ($('btn-nueva-cita')) {
    $('btn-nueva-cita').style.display =
      puedeGestionarCitas() ? 'inline-flex' : 'none';
  }

  if ($('btn-nuevo-historial')) {
    $('btn-nuevo-historial').style.display =
      puedeGestionarHistorial() ? 'inline-flex' : 'none';
  }

  if ($('btn-nueva-sesion')) {
    $('btn-nueva-sesion').style.display =
      tienePermiso('sesiones') ? 'inline-flex' : 'none';
  }

  if ($('btn-nuevo-recordatorio')) {
    $('btn-nuevo-recordatorio').style.display =
      tienePermiso('recordatorios') ? 'inline-flex' : 'none';
  }
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
    if (token) localStorage.setItem('accessToken', token);
    localStorage.setItem('user', JSON.stringify(currentUser));
    sessionStorage.setItem('sigch_user', JSON.stringify(currentUser));
    $('login-screen').style.display = 'none';
    $('sidebar').style.display = 'flex';
    $('main').style.display = 'block';
    $('user-name').textContent = currentUser.nombre_completo || currentUser.email || '—';
    $('user-role').textContent = currentUser.rol || '—';
    aplicarPermisosUI();
    navigate('dashboard');
    if (window.calendar && typeof window.calendar.refetchEvents === 'function') window.calendar.refetchEvents();
  } catch (err) {
    showAlert(err.message || (err.error || 'Error de autenticación'), 'error', 'login-alert');
  }
});

$('logout-btn').addEventListener('click', () => {
  currentUser = null;
  sessionStorage.removeItem('sigch_user');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  $('login-screen').style.display = 'flex';
  $('sidebar').style.display = 'none';
  $('main').style.display = 'none';
  $('login-pass').value = '';
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

  document.querySelectorAll('.section').forEach(s => {
    s.classList.remove('active');
  });

  document.querySelectorAll('#sidebar nav a').forEach(a => {
    a.classList.remove('active');
  });

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

// ── MODAL HELPERS ──────────────────────────────
function openModal(id) {
  $(id).classList.add('open');
}

function closeModal(id) {
  $(id).classList.remove('open');
}

document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
  btn.addEventListener('click', () => {
    const modal = btn.closest('.modal-overlay');
    if (modal) modal.classList.remove('open');
  });
});

// ── DASHBOARD ──────────────────────────────────
async function loadDashboard() {
  try {
    const stats = await api('GET', '/citas/stats/resumen');

    $('stat-total-citas').textContent = stats.total_citas;
    $('stat-programadas').textContent = stats.programadas;
    $('stat-realizadas').textContent = stats.realizadas;
    $('stat-canceladas').textContent = stats.canceladas;
    $('stat-pacientes').textContent = stats.total_pacientes;
    $('stat-psicologos').textContent = stats.total_psicologos;

    const citas = await api('GET', '/citas?estado=programada');
    const tbody = $('dashboard-citas');

    if (!citas.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty">
            <div class="icon">📅</div>
            No hay citas programadas
          </td>
        </tr>`;
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
  if (!puedeGestionarUsuarios()) {
    alert('No tiene permiso para ver usuarios.');
    return;
  }

  try {
    const rows = await api('GET', '/usuarios');
    const tbody = $('usuarios-tbody');

    if (!rows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty">
            <div class="icon">👤</div>
            Sin usuarios
          </td>
        </tr>`;
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
          <button class="btn btn-edit btn-sm" onclick="editUsuario(${u.id_usuario})">✏ Editar</button>
          <button class="btn btn-danger btn-sm" onclick="deleteUsuario(${u.id_usuario}, ${jsString(u.nombre_completo)})">✕</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

window.editUsuario = async id => {
  if (!puedeGestionarUsuarios()) {
    alert('No tiene permiso para editar usuarios.');
    return;
  }

  editingUsuario = id;

  try {
    const u = await api('GET', `/usuarios/${id}`);

    $('u-nombre').value = u.nombre_completo;
    $('u-email').value = u.email;
    $('u-rol').value = u.rol;
    $('u-pass').value = '';

    $('modal-usuario-title').textContent = 'Editar Usuario';
    openModal('modal-usuario');
  } catch (err) {
    alert(err.message);
  }
};

window.deleteUsuario = async (id, nombre) => {
  if (!puedeGestionarUsuarios()) {
    alert('No tiene permiso para eliminar usuarios.');
    return;
  }

  if (currentUser && Number(id) === Number(currentUser.id_usuario)) {
    alert('No puedes desactivar el usuario con el que iniciaste sesión.');
    return;
  }

  if (!confirm(`¿Desactivar al usuario "${nombre}"?`)) return;

  try {
    await api('DELETE', `/usuarios/${id}`);
    loadUsuarios();
  } catch (err) {
    alert(err.message);
  }
};

$('btn-nuevo-usuario').addEventListener('click', () => {
  if (!puedeGestionarUsuarios()) {
    alert('No tiene permiso para crear usuarios.');
    return;
  }

  editingUsuario = null;
  $('form-usuario').reset();
  $('modal-usuario-title').textContent = 'Nuevo Usuario';
  openModal('modal-usuario');
});

$('form-usuario').addEventListener('submit', async e => {
  e.preventDefault();

  if (!puedeGestionarUsuarios()) {
    alert('No tiene permiso para guardar usuarios.');
    return;
  }

  const body = {
    nombre_completo: $('u-nombre').value,
    email: $('u-email').value,
    rol: $('u-rol').value
  };

  const pass = $('u-pass').value;

  if (pass) body.contrasena = pass;

  if (!editingUsuario && !pass) {
    return showAlert('La contraseña es obligatoria para nuevos usuarios');
  }

  try {
    if (editingUsuario) {
      await api('PUT', `/usuarios/${editingUsuario}`, body);
    } else {
      await api('POST', '/usuarios', { ...body, contrasena: pass });
    }

    closeModal('modal-usuario');
    loadUsuarios();
  } catch (err) {
    showAlert(err.message);
  }
});

// ── PSICÓLOGOS ─────────────────────────────────
let editingPsicologo = null;

async function loadPsicologos() {
  if (!puedeGestionarPsicologos()) {
    alert('No tiene permiso para gestionar psicólogos.');
    return;
  }

  try {
    const rows = await api('GET', '/psicologos');
    const tbody = $('psicologos-tbody');

    if (!rows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty">
            <div class="icon">🩺</div>
            Sin psicólogos
          </td>
        </tr>`;
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
          <button class="btn btn-edit btn-sm" onclick="editPsicologo(${p.id_psicologo})">✏ Editar</button>
          <button class="btn btn-danger btn-sm" onclick="deletePsicologo(${p.id_psicologo})">✕</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

window.editPsicologo = async id => {
  if (!puedeGestionarPsicologos()) {
    alert('No tiene permiso para editar psicólogos.');
    return;
  }

  editingPsicologo = id;

  try {
    const p = await api('GET', `/psicologos/${id}`);

    await populatePsicologoUsers();

    $('ps-id-usuario').value = p.id_usuario;
    $('ps-nombre').value = p.nombre_completo;
    $('ps-especialidad').value = p.especialidad;
    $('ps-registro').value = p.registro_profesional;

    $('modal-psicologo-title').textContent = 'Editar Psicólogo';
    openModal('modal-psicologo');
  } catch (err) {
    alert(err.message);
  }
};

window.deletePsicologo = async id => {
  if (!puedeGestionarPsicologos()) {
    alert('No tiene permiso para eliminar psicólogos.');
    return;
  }

  if (!confirm('¿Desactivar este psicólogo?')) return;

  try {
    const respuesta = await api('DELETE', `/psicologos/${id}`);
    alert(respuesta.message || 'Psicólogo desactivado correctamente.');
    await loadPsicologos();
  } catch (err) {
    alert('Error al desactivar psicólogo: ' + err.message);
  }
};


$('btn-nuevo-psicologo').addEventListener('click', async () => {
  if (!puedeGestionarPsicologos()) {
    alert('No tiene permiso para crear psicólogos.');
    return;
  }

  editingPsicologo = null;
  $('form-psicologo').reset();
  $('modal-psicologo-title').textContent = 'Nuevo Psicólogo';

  await populatePsicologoUsers();
  openModal('modal-psicologo');
});

async function populatePsicologoUsers() {
  try {
    const [usuarios, psicologos] = await Promise.all([
      api('GET', '/usuarios'),
      api('GET', '/psicologos')
    ]);

    const usuariosYaAsignados = psicologos
      .filter(p => p.activo)
      .map(p => Number(p.id_usuario));

    const sel = $('ps-id-usuario');

    sel.innerHTML = '<option value="">— Seleccionar usuario —</option>' +
      usuarios
        .filter(u => {
          if (u.rol !== 'psicologo' || !u.activo) return false;

          // Si estamos editando, dejamos que aparezca su usuario actual.
          if (editingPsicologo) return true;

          // Si es nuevo, no mostrar usuarios que ya tienen perfil de psicólogo.
          return !usuariosYaAsignados.includes(Number(u.id_usuario));
        })
        .map(u => `<option value="${u.id_usuario}">${u.nombre_completo}</option>`)
        .join('');
  } catch (err) {
    console.error(err);
  }
}

$('form-psicologo').addEventListener('submit', async e => {
  e.preventDefault();

  if (!puedeGestionarPsicologos()) {
    alert('No tiene permiso para guardar psicólogos.');
    return;
  }

  const body = {
    id_usuario: parseInt($('ps-id-usuario').value),
    nombre_completo: $('ps-nombre').value,
    especialidad: $('ps-especialidad').value,
    registro_profesional: $('ps-registro').value
  };

  try {
    if (editingPsicologo) {
      await api('PUT', `/psicologos/${editingPsicologo}`, body);
    } else {
      await api('POST', '/psicologos', body);
    }

    closeModal('modal-psicologo');
    loadPsicologos();
  } catch (err) {
    showAlert(err.message, 'error', 'modal-alert-ps');
  }
});

// ── PACIENTES ──────────────────────────────────
let editingPaciente = null;

async function loadPacientes(q = '') {
  try {
    const rows = await api('GET', `/pacientes${q ? '?q=' + encodeURIComponent(q) : ''}`);
    const tbody = $('pacientes-tbody');

    if (!rows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty">
            <div class="icon">🧑‍⚕️</div>
            No se encontraron pacientes
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = rows.map(p => {
      const acciones = puedeGestionarPacientes()
        ? `
          <button class="btn btn-edit btn-sm" onclick="editPaciente(${p.id_paciente})">✏ Editar</button>
          <button class="btn btn-danger btn-sm" onclick="deletePaciente(${p.id_paciente})">✕</button>
        `
        : '<span class="badge badge-gray">Solo lectura</span>';

      return `
        <tr>
          <td>${p.id_paciente}</td>
          <td>${p.nombre_completo}</td>
          <td>${p.ci}</td>
          <td>${fmtDateOnly(p.fecha_nacimiento)}</td>
          <td>${p.telefono}</td>
          <td>${activoBadge(p.activo)}</td>
          <td>${acciones}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
  }
}

window.editPaciente = async id => {
  if (!puedeGestionarPacientes()) {
    alert('No tiene permiso para editar pacientes.');
    return;
  }

  editingPaciente = id;

  try {
    const p = await api('GET', `/pacientes/${id}`);

    $('p-nombre').value = p.nombre_completo;
    $('p-ci').value = p.ci;
    $('p-fnac').value = p.fecha_nacimiento?.split('T')[0] || '';
    $('p-tel').value = p.telefono;
    $('p-email').value = p.email || '';
    $('p-direccion').value = p.direccion || '';

    $('modal-paciente-title').textContent = 'Editar Paciente';
    openModal('modal-paciente');
  } catch (err) {
    alert(err.message);
  }
};

window.deletePaciente = async id => {
  if (!puedeGestionarPacientes()) {
    alert('No tiene permiso para eliminar pacientes.');
    return;
  }

  if (!confirm('¿Desactivar este paciente?')) return;

  try {
    const respuesta = await api('DELETE', `/pacientes/${id}`);
    await registrarAuditoria('Pacientes', 'Eliminar', 'Se desactivó un paciente.');
    alert(respuesta.message || 'Paciente desactivado correctamente.');
    await loadPacientes();
  } catch (err) {
    alert('Error al desactivar paciente: ' + err.message);
  }
};

$('btn-nuevo-paciente').addEventListener('click', () => {
  if (!puedeGestionarPacientes()) {
    alert('No tiene permiso para registrar pacientes.');
    return;
  }

  editingPaciente = null;
  $('form-paciente').reset();
  $('modal-paciente-title').textContent = 'Nuevo Paciente';
  openModal('modal-paciente');
});

$('search-paciente').addEventListener('input', e => {
  loadPacientes(e.target.value);
});

$('form-paciente').addEventListener('submit', async e => {
  e.preventDefault();

  if (!puedeGestionarPacientes()) {
    alert('No tiene permiso para guardar pacientes.');
    return;
  }

  const body = {
    nombre_completo: $('p-nombre').value,
    ci: $('p-ci').value,
    fecha_nacimiento: $('p-fnac').value,
    telefono: $('p-tel').value,
    email: $('p-email').value || null,
    direccion: $('p-direccion').value || null
  };

  try {
if (editingPaciente) {
  await api('PUT', `/pacientes/${editingPaciente}`, body);
  await registrarAuditoria('Pacientes', 'Editar', 'Se editó la información de un paciente.');
} else {
  await api('POST', '/pacientes', body);
  await registrarAuditoria('Pacientes', 'Crear', 'Se registró un nuevo paciente.');
}

    closeModal('modal-paciente');
    loadPacientes();
  } catch (err) {
    showAlert(err.message, 'error', 'modal-alert-pac');
  }
});

// ── CITAS ──────────────────────────────────────
let editingCita = null;

async function loadCitas() {
  try {
    const rows = await api('GET', '/citas');
    const tbody = $('citas-tbody');

    if (!rows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty">
            <div class="icon">📅</div>
            Sin citas registradas
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = rows.map(c => {
      const acciones = puedeGestionarCitas()
        ? `
          <button class="btn btn-edit btn-sm" onclick="editCita(${c.id_cita})">✏ Editar</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCita(${c.id_cita})">✕ Cancelar</button>
        `
        : '<span class="badge badge-gray">Solo lectura</span>';

      return `
        <tr>
          <td>${c.id_cita}</td>
          <td>${fmtDate(c.fecha_hora)}</td>
          <td>${c.paciente_nombre}</td>
          <td>${c.psicologo_nombre}</td>
          <td>${c.motivo || '—'}</td>
          <td>${estadoBadge(c.estado)}</td>
          <td>${acciones}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
  }
}

async function populateCitaSelects() {
  try {
    const [pacientes, psicologos] = await Promise.all([
      api('GET', '/pacientes'),
      api('GET', '/psicologos')
    ]);

    $('c-paciente').innerHTML = '<option value="">— Seleccionar —</option>' +
      pacientes
        .filter(p => p.activo)
        .map(p => `<option value="${p.id_paciente}">${p.nombre_completo} (${p.ci})</option>`)
        .join('');

    $('c-psicologo').innerHTML = '<option value="">— Seleccionar —</option>' +
      psicologos
        .filter(p => p.activo)
        .map(p => `<option value="${p.id_psicologo}">${p.nombre_completo}</option>`)
        .join('');
  } catch (err) {
    console.error(err);
  }
}

window.editCita = async id => {
  if (!puedeGestionarCitas()) {
    alert('No tiene permiso para editar citas.');
    return;
  }

  editingCita = id;
  await populateCitaSelects();

  try {
    const c = await api('GET', `/citas/${id}`);

    $('c-paciente').value = c.id_paciente;
    $('c-psicologo').value = c.id_psicologo;
    $('c-fecha').value = c.fecha_hora?.slice(0, 16) || '';
    $('c-motivo').value = c.motivo || '';
    $('c-estado').value = c.estado;

    $('modal-cita-title').textContent = 'Editar Cita';
    $('c-estado-group').style.display = 'block';

    openModal('modal-cita');
  } catch (err) {
    alert(err.message);
  }
};

window.deleteCita = async id => {
  if (!puedeGestionarCitas()) {
    alert('No tiene permiso para cancelar citas.');
    return;
  }

  if (!confirm('¿Cancelar esta cita?')) return;

  try {
    await api('DELETE', `/citas/${id}`);
    loadCitas();
    loadDashboard();
    loadCalendar();
  } catch (err) {
    alert(err.message);
  }
};

$('btn-nueva-cita').addEventListener('click', async () => {
  if (!puedeGestionarCitas()) {
    alert('No tiene permiso para crear citas.');
    return;
  }

  editingCita = null;
  $('form-cita').reset();
  $('modal-cita-title').textContent = 'Nueva Cita';
  $('c-estado-group').style.display = 'none';

  await populateCitaSelects();
  openModal('modal-cita');
});

$('form-cita').addEventListener('submit', async e => {
  e.preventDefault();

  if (!puedeGestionarCitas()) {
    alert('No tiene permiso para guardar citas.');
    return;
  }

  const body = {
    id_paciente: parseInt($('c-paciente').value),
    id_psicologo: parseInt($('c-psicologo').value),
    fecha_hora: $('c-fecha').value.replace('T', ' '),
    motivo: $('c-motivo').value || null
  };

  if (editingCita) body.estado = $('c-estado').value;

  try {
    if (editingCita) {
      await api('PUT', `/citas/${editingCita}`, body);
    } else {
      await api('POST', '/citas', body);
    }

    closeModal('modal-cita');
    loadCitas();
    loadDashboard();
    loadCalendar();
  } catch (err) {
    showAlert(err.message, 'error', 'modal-alert-cita');
  }
});
// ── HISTORIAL CLÍNICO ──────────────────────────
let editingHistorial = null;

async function loadHistorial() {
  if (!puedeGestionarHistorial()) {
    alert('No tiene permiso para acceder al historial clínico.');
    return;
  }

  try {
    const rows = await api('GET', '/historial');
    const tbody = $('historial-tbody');

    if (!rows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty">
            <div class="icon">📋</div>
            Sin historiales clínicos registrados
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = rows.map(h => `
      <tr>
        <td>${h.id_historial}</td>
        <td>${fmtDateOnly(h.fecha)}</td>
        <td>${h.paciente_nombre}</td>
        <td>${h.psicologo_nombre}</td>
        <td>${h.diagnostico || '—'}</td>
        <td>${activoBadge(h.activo)}</td>
        <td>
          <button class="btn btn-edit btn-sm" onclick="editHistorial(${h.id_historial})">✏ Editar</button>
          <button class="btn btn-danger btn-sm" onclick="deleteHistorial(${h.id_historial})">✕</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

async function populateHistorialSelects() {
  try {
    const [pacientes, psicologos] = await Promise.all([
      api('GET', '/pacientes'),
      api('GET', '/psicologos')
    ]);

    $('h-paciente').innerHTML = '<option value="">— Seleccionar paciente —</option>' +
      pacientes
        .filter(p => p.activo)
        .map(p => `<option value="${p.id_paciente}">${p.nombre_completo} (${p.ci})</option>`)
        .join('');

    $('h-psicologo').innerHTML = '<option value="">— Seleccionar psicólogo —</option>' +
      psicologos
        .filter(p => p.activo)
        .map(p => `<option value="${p.id_psicologo}">${p.nombre_completo}</option>`)
        .join('');
  } catch (err) {
    console.error(err);
  }
}

window.editHistorial = async id => {
  if (!puedeGestionarHistorial()) {
    alert('No tiene permiso para editar historiales.');
    return;
  }

  editingHistorial = id;
  await populateHistorialSelects();

  try {
    const h = await api('GET', `/historial/${id}`);

    $('h-paciente').value = h.id_paciente;
    $('h-psicologo').value = h.id_psicologo;
    $('h-fecha').value = h.fecha?.split('T')[0] || '';
    $('h-diagnostico').value = h.diagnostico || '';
    $('h-tratamiento').value = h.tratamiento || '';
    $('h-observaciones').value = h.observaciones || '';

    $('modal-historial-title').textContent = 'Editar Historial Clínico';
    openModal('modal-historial');
  } catch (err) {
    alert(err.message);
  }
};

window.deleteHistorial = async id => {
  if (!puedeGestionarHistorial()) {
    alert('No tiene permiso para eliminar historiales.');
    return;
  }

  if (!confirm('¿Desactivar este historial clínico?')) return;

  try {
    await api('DELETE', `/historial/${id}`);
    loadHistorial();
  } catch (err) {
    alert(err.message);
  }
};

$('btn-nuevo-historial').addEventListener('click', async () => {
  if (!puedeGestionarHistorial()) {
    alert('No tiene permiso para crear historiales.');
    return;
  }

  editingHistorial = null;
  $('form-historial').reset();
  $('modal-historial-title').textContent = 'Nuevo Historial Clínico';

  $('h-fecha').value = new Date().toISOString().slice(0, 10);

  await populateHistorialSelects();
  openModal('modal-historial');
});

$('form-historial').addEventListener('submit', async e => {
  e.preventDefault();

  if (!puedeGestionarHistorial()) {
    alert('No tiene permiso para guardar historiales.');
    return;
  }

  const body = {
    id_paciente: parseInt($('h-paciente').value),
    id_psicologo: parseInt($('h-psicologo').value),
    fecha: $('h-fecha').value,
    diagnostico: $('h-diagnostico').value,
    tratamiento: $('h-tratamiento').value || null,
    observaciones: $('h-observaciones').value || null
  };

  try {
    if (editingHistorial) {
      await api('PUT', `/historial/${editingHistorial}`, body);
    } else {
      await api('POST', '/historial', body);
    }

    closeModal('modal-historial');
    loadHistorial();
  } catch (err) {
    showAlert(err.message, 'error', 'modal-alert-historial');
  }
});

// ── CALENDAR ───────────────────────────────────
let calDate = new Date();

async function loadCalendar() {
  const year = calDate.getFullYear();
  const month = calDate.getMonth();

  const names = [
    'Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'
  ];

  // Actualiza título
  const calTitleEl = $('cal-title');
  if (calTitleEl) calTitleEl.textContent = `${names[month]} ${year}`;

  try {
    // Trae todas las citas programadas y agrupa por fecha (YYYY-MM-DD)
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

    // Contenedor principal (usa #calendar como contenedor único)
    const container = document.getElementById('calendar');
    if (!container) {
      console.warn('No se encontró #calendar en el DOM.');
      return;
    }

    // Limpia y crea la grid internamente
    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.id = 'cal-grid';
    grid.className = 'calendar-grid';

    // Cabeceras de días
    const headers = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    headers.forEach(h => {
      const el = document.createElement('div');
      el.className = 'cal-header';
      el.textContent = h;
      grid.appendChild(el);
    });

    // Cálculos de mes
    const first = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date().toISOString().slice(0, 10);

    // Casillas vacías del mes anterior
    for (let i = 0; i < first; i++) {
      const div = document.createElement('div');
      div.className = 'cal-day other-month';
      grid.appendChild(div);
    }

    // Días del mes
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      const div = document.createElement('div');
      div.className = 'cal-day' + (key === today ? ' today' : '');
      div.setAttribute('data-date', key);

      // Contenido del día: número y puntos si hay citas
      const dotsHtml = citaMap[key]
        ? `<div class="dot-row">${'<div class="dot"></div>'.repeat(Math.min(citaMap[key], 4))}</div>`
        : '';

      div.innerHTML = `<span class="cal-day-number">${d}</span>${dotsHtml}`;
      div.title = citaMap[key] ? `${citaMap[key]} cita(s)` : '';

      // Click en día: abrir modal y listar citas de ese día
      div.addEventListener('click', async () => {
        const dateStr = key;
        openDayModal(dateStr, citasByDate[dateStr] || []);
      });

      grid.appendChild(div);
    }

    container.appendChild(grid);
  } catch (err) {
    console.error('Error en loadCalendar:', err);
  }
}

// Funciones del modal (usa los elementos que ya tienes en el HTML)
function openDayModal(dateStr, events) {
  const modal = document.getElementById('dayModal');
  const modalDateTitle = document.getElementById('modalDateTitle');
  const eventsList = document.getElementById('eventsList');
  const noEvents = document.getElementById('noEvents');

  if (!modal || !modalDateTitle || !eventsList || !noEvents) {
    console.warn('Modal o elementos del modal no encontrados.');
    return;
  }

  modal.style.display = 'block';
  modalDateTitle.textContent = new Date(dateStr).toLocaleDateString();
  eventsList.innerHTML = '';

  if (!events || events.length === 0) {
    noEvents.style.display = 'block';
    return;
  }
  noEvents.style.display = 'none';

  events.forEach(e => {
    const li = document.createElement('li');
    li.className = 'event-item';

    const left = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'event-title';
    title.textContent = e.titulo || e.proposito || 'Sin título';

    const time = document.createElement('div');
    time.className = 'event-time';
    const inicio = e.fecha_hora || e.inicio || e.start;
    const fin = e.fin || e.end;
    time.textContent = inicio ? formatTime(inicio) + (fin ? ' — ' + formatTime(fin) : '') : '';

    left.appendChild(title);
    left.appendChild(time);

    const actions = document.createElement('div');
    actions.className = 'event-actions';

    const viewBtn = document.createElement('button');
    viewBtn.textContent = 'Ver';
    viewBtn.addEventListener('click', () => {
      alert((e.titulo || e.proposito || '') + '\n\n' + (e.descripcion || e.detalle || 'Sin descripción'));
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Eliminar';
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Eliminar esta cita?')) return;
      try {
        await api('DELETE', `/citas/${e.id || e.id_cita || e.id_cita_evento}`);
        // refrescar calendario
        loadCalendar();
        closeDayModal();
      } catch (err) {
        console.error('Error eliminando cita:', err);
        alert('No se pudo eliminar la cita.');
      }
    });

    actions.appendChild(viewBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(left);
    li.appendChild(actions);
    eventsList.appendChild(li);
  });
}

function closeDayModal() {
  const modal = document.getElementById('dayModal');
  const eventsList = document.getElementById('eventsList');
  const noEvents = document.getElementById('noEvents');
  if (modal) modal.style.display = 'none';
  if (eventsList) eventsList.innerHTML = '';
  if (noEvents) noEvents.style.display = 'none';
}

function formatTime(iso) {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch (e) { return ''; }
}

// Conectar botones del modal (si existen)
const closeModalBtn = document.getElementById('closeModal');
if (closeModalBtn) closeModalBtn.addEventListener('click', closeDayModal);
window.addEventListener('click', (e) => { const modal = document.getElementById('dayModal'); if (e.target === modal) closeDayModal(); });

// Navegación del calendario
const calPrevBtn = document.getElementById('cal-prev');
const calNextBtn = document.getElementById('cal-next');

if (calPrevBtn) {
  calPrevBtn.addEventListener('click', () => {
    calDate.setMonth(calDate.getMonth() - 1);
    loadCalendar();
  });
}
if (calNextBtn) {
  calNextBtn.addEventListener('click', () => {
    calDate.setMonth(calDate.getMonth() + 1);
    loadCalendar();
  });
}

// Inicializa al cargar el script
document.addEventListener('DOMContentLoaded', () => {
  // carga inicial
  loadCalendar();
});

// ── HORARIOS ───────────────────────────────────
let editingHorario = null;

async function loadHorarios() {
  if (!tienePermiso('horarios')) {
    alert('No tiene permiso para ver horarios.');
    return;
  }

  try {
    const rows = await api('GET', '/horarios');
    const tbody = $('horarios-tbody');

    if (!rows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty">
            <div class="icon">⏰</div>
            No hay horarios registrados
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = rows.map(h => `
      <tr>
        <td>${h.id_horario}</td>
        <td>${h.psicologo_nombre}</td>
        <td>${h.dia_semana}</td>
        <td>${h.hora_inicio}</td>
        <td>${h.hora_fin}</td>
        <td>${activoBadge(h.activo)}</td>
        <td>
          <button class="btn btn-edit btn-sm" onclick="editHorario(${h.id_horario})">✏ Editar</button>
          <button class="btn btn-danger btn-sm" onclick="deleteHorario(${h.id_horario})">✕</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    alert(err.message);
    console.error(err);
  }
}
async function populateHorarioPsicologos() {
  try {
    const psicologos = await api('GET', '/psicologos');
    const sel = $('ho-psicologo');

    sel.innerHTML = '<option value="">— Seleccionar psicólogo —</option>' +
      psicologos
        .filter(p => p.activo)
        .map(p => `<option value="${p.id_psicologo}">${p.nombre_completo}</option>`)
        .join('');
  } catch (err) {
    console.error(err);
  }
}

window.editHorario = async id => {
  if (!tienePermiso('horarios')) {
    alert('No tiene permiso para editar horarios.');
    return;
  }

  editingHorario = id;
  await populateHorarioPsicologos();

  try {
    const h = await api('GET', `/horarios/${id}`);

    $('ho-psicologo').value = h.id_psicologo;
    $('ho-dia').value = h.dia_semana;
    $('ho-inicio').value = String(h.hora_inicio).slice(0, 5);
    $('ho-fin').value = String(h.hora_fin).slice(0, 5);

    $('modal-horario-title').textContent = 'Editar Horario';
    openModal('modal-horario');
  } catch (err) {
    alert(err.message);
  }
};

window.deleteHorario = async id => {
  if (!tienePermiso('horarios')) {
    alert('No tiene permiso para eliminar horarios.');
    return;
  }

  if (!confirm('¿Desactivar este horario?')) return;

  try {
    const respuesta = await api('DELETE', `/horarios/${id}`);
    alert(respuesta.message || 'Horario desactivado correctamente.');
    await registrarAuditoria('Horarios', 'Eliminar', 'Se desactivó un horario de atención.');
    loadHorarios();
  } catch (err) {
    alert('Error al desactivar horario: ' + err.message);
  }
};

if ($('btn-nuevo-horario')) {
  $('btn-nuevo-horario').addEventListener('click', async () => {
    if (!tienePermiso('horarios')) {
      alert('No tiene permiso para crear horarios.');
      return;
    }

    editingHorario = null;
    $('form-horario').reset();
    $('modal-horario-title').textContent = 'Nuevo Horario';

    await populateHorarioPsicologos();
    openModal('modal-horario');
  });
}

if ($('form-horario')) {
  $('form-horario').addEventListener('submit', async e => {
    e.preventDefault();

    if (!tienePermiso('horarios')) {
      alert('No tiene permiso para guardar horarios.');
      return;
    }

    const body = {
      id_psicologo: parseInt($('ho-psicologo').value),
      dia_semana: $('ho-dia').value,
      hora_inicio: $('ho-inicio').value,
      hora_fin: $('ho-fin').value
    };

    try {
      if (editingHorario) {
        await api('PUT', `/horarios/${editingHorario}`, body);
        await registrarAuditoria('Horarios', 'Editar', 'Se editó un horario de atención.');
      } else {
        await api('POST', '/horarios', body);
        await registrarAuditoria('Horarios', 'Crear', 'Se registró un nuevo horario de atención.');
      }

      closeModal('modal-horario');
      loadHorarios();
    } catch (err) {
      showAlert(err.message, 'error', 'modal-alert-horario');
    }
  });
}
// ── SESIONES CLÍNICAS ──────────────────────────
async function loadSesiones() {
  if (!tienePermiso('sesiones')) {
    alert('No tiene permiso para ver sesiones clínicas.');
    return;
  }

  try {
    const rows = await api('GET', '/sesiones');
    const tbody = $('sesiones-tbody');

    if (!rows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty">
            <div class="icon">🧠</div>
            No hay sesiones clínicas registradas
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = rows.map(s => `
      <tr>
        <td>${s.id_sesion}</td>
        <td>${fmtDateOnly(s.fecha)}</td>
        <td>${s.paciente_nombre}</td>
        <td>${s.psicologo_nombre}</td>
        <td>${s.numero_sesion}</td>
        <td>${s.resumen || '—'}</td>
        <td>${activoBadge(s.activo)}</td>
      </tr>
    `).join('');
  } catch (err) {
    alert(err.message);
    console.error(err);
  }
}

// ── RECORDATORIOS ──────────────────────────────
async function loadRecordatorios() {
  if (!tienePermiso('recordatorios')) {
    alert('No tiene permiso para ver recordatorios.');
    return;
  }

  try {
    const rows = await api('GET', '/recordatorios');
    const tbody = $('recordatorios-tbody');

    if (!rows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="empty">
            <div class="icon">🔔</div>
            No hay recordatorios registrados
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${r.id_recordatorio}</td>
        <td>${fmtDate(r.fecha_hora)}</td>
        <td>${r.paciente_nombre}</td>
        <td>${r.psicologo_nombre}</td>
        <td>${r.tipo}</td>
        <td>${fmtDate(r.fecha_programada)}</td>
        <td>${r.enviado ? '<span class="badge badge-green">Enviado</span>' : '<span class="badge badge-yellow">Pendiente</span>'}</td>
        <td>
          ${
            r.enviado
              ? '<span class="badge badge-gray">Sin acciones</span>'
              : `<button class="btn btn-edit btn-sm" onclick="marcarRecordatorioEnviado(${r.id_recordatorio})">Marcar enviado</button>`
          }
        </td>
      </tr>
    `).join('');
  } catch (err) {
    alert(err.message);
    console.error(err);
  }
}

window.marcarRecordatorioEnviado = async id => {
  if (!tienePermiso('recordatorios')) {
    alert('No tiene permiso para modificar recordatorios.');
    return;
  }

  try {
    await api('PUT', `/recordatorios/${id}/enviado`);
    loadRecordatorios();
  } catch (err) {
    alert(err.message);
  }
};

// ── REPORTES ───────────────────────────────────
async function loadReportes() {
  if (!tienePermiso('reportes')) {
    alert('No tiene permiso para ver reportes.');
    return;
  }

  await cargarReporteResumen();
}

async function cargarReporteResumen() {
  try {
    const rows = await api('GET', '/reportes/resumen');

    $('reportes-head').innerHTML = `
      <tr>
        <th>Indicador</th>
        <th>Total</th>
      </tr>
    `;

    $('reportes-tbody').innerHTML = rows.map(r => `
      <tr>
        <td>${r.indicador}</td>
        <td>${r.total}</td>
      </tr>
    `).join('');
  } catch (err) {
    alert(err.message);
    console.error(err);
  }
}

async function cargarReporteCitas() {
  try {
    const rows = await api('GET', '/reportes/citas');

    $('reportes-head').innerHTML = `
      <tr>
        <th>#</th>
        <th>Fecha y Hora</th>
        <th>Paciente</th>
        <th>Psicólogo</th>
        <th>Motivo</th>
        <th>Estado</th>
      </tr>
    `;

    if (!rows.length) {
      $('reportes-tbody').innerHTML = `
        <tr>
          <td colspan="6" class="empty">
            <div class="icon">📊</div>
            No hay citas registradas
          </td>
        </tr>`;
      return;
    }

    $('reportes-tbody').innerHTML = rows.map(c => `
      <tr>
        <td>${c.id_cita}</td>
        <td>${fmtDate(c.fecha_hora)}</td>
        <td>${c.paciente_nombre}</td>
        <td>${c.psicologo_nombre}</td>
        <td>${c.motivo || '—'}</td>
        <td>${estadoBadge(c.estado)}</td>
      </tr>
    `).join('');
  } catch (err) {
    alert(err.message);
    console.error(err);
  }
}

if ($('btn-reporte-resumen')) {
  $('btn-reporte-resumen').addEventListener('click', cargarReporteResumen);
}

if ($('btn-reporte-citas')) {
  $('btn-reporte-citas').addEventListener('click', cargarReporteCitas);
}

// ── AUDITORÍA ──────────────────────────────────
async function loadAuditoria() {
  if (!tienePermiso('auditoria')) {
    alert('No tiene permiso para ver auditoría.');
    return;
  }

  try {
    const rows = await api('GET', '/auditoria');
    const tbody = $('auditoria-tbody');

    if (!rows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty">
            <div class="icon">🛡️</div>
            No hay registros de auditoría
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = rows.map(a => `
      <tr>
        <td>${a.id_auditoria}</td>
        <td>${a.usuario_nombre || '—'}</td>
        <td>${a.rol || '—'}</td>
        <td>${a.modulo}</td>
        <td>${a.accion}</td>
        <td>${a.descripcion || '—'}</td>
        <td>${fmtDate(a.fecha)}</td>
      </tr>
    `).join('');
  } catch (err) {
    alert(err.message);
    console.error(err);
  }
}
// ── CREAR SESIONES CLÍNICAS ────────────────────
async function populateSesionCitas() {
  try {
    const citas = await api('GET', '/citas');
    const sel = $('s-cita');

    sel.innerHTML = '<option value="">— Seleccionar cita —</option>' +
      citas
        .filter(c => c.activo && c.estado !== 'cancelada')
        .map(c => `
          <option 
            value="${c.id_cita}"
            data-paciente="${c.id_paciente}"
            data-psicologo="${c.id_psicologo}">
            ${fmtDate(c.fecha_hora)} — ${c.paciente_nombre} / ${c.psicologo_nombre}
          </option>
        `)
        .join('');
  } catch (err) {
    console.error(err);
  }
}

if ($('btn-nueva-sesion')) {
  $('btn-nueva-sesion').addEventListener('click', async () => {
    if (!tienePermiso('sesiones')) {
      alert('No tiene permiso para crear sesiones.');
      return;
    }

    $('form-sesion').reset();
    $('s-fecha').value = new Date().toISOString().slice(0, 10);
    await populateSesionCitas();
    openModal('modal-sesion');
  });
}

if ($('form-sesion')) {
  $('form-sesion').addEventListener('submit', async e => {
    e.preventDefault();

    if (!tienePermiso('sesiones')) {
      alert('No tiene permiso para guardar sesiones.');
      return;
    }

    const option = $('s-cita').selectedOptions[0];

    const body = {
      id_cita: parseInt($('s-cita').value),
      id_paciente: parseInt(option.dataset.paciente),
      id_psicologo: parseInt(option.dataset.psicologo),
      numero_sesion: parseInt($('s-numero').value),
      fecha: $('s-fecha').value,
      resumen: $('s-resumen').value,
      tecnicas_aplicadas: $('s-tecnicas').value || null,
      tareas_asignadas: $('s-tareas').value || null,
      evolucion: $('s-evolucion').value || null
    };

    try {
      await api('POST', '/sesiones', body);
      closeModal('modal-sesion');
      loadSesiones();
    } catch (err) {
      showAlert(err.message, 'error', 'modal-alert-sesion');
    }
  });
}

// ── CREAR RECORDATORIOS ────────────────────────
async function populateRecordatorioCitas() {
  try {
    const citas = await api('GET', '/citas');
    const sel = $('r-cita');

    sel.innerHTML = '<option value="">— Seleccionar cita —</option>' +
      citas
        .filter(c => c.activo && c.estado === 'programada')
        .map(c => `
          <option value="${c.id_cita}">
            ${fmtDate(c.fecha_hora)} — ${c.paciente_nombre} / ${c.psicologo_nombre}
          </option>
        `)
        .join('');
  } catch (err) {
    console.error(err);
  }
}

if ($('btn-nuevo-recordatorio')) {
  $('btn-nuevo-recordatorio').addEventListener('click', async () => {
    if (!tienePermiso('recordatorios')) {
      alert('No tiene permiso para crear recordatorios.');
      return;
    }

    $('form-recordatorio').reset();

    const fecha = new Date();
    fecha.setHours(fecha.getHours() + 1);
    $('r-fecha').value = fecha.toISOString().slice(0, 16);

    await populateRecordatorioCitas();
    openModal('modal-recordatorio');
  });
}

if ($('form-recordatorio')) {
  $('form-recordatorio').addEventListener('submit', async e => {
    e.preventDefault();

    if (!tienePermiso('recordatorios')) {
      alert('No tiene permiso para guardar recordatorios.');
      return;
    }

    const body = {
      id_cita: parseInt($('r-cita').value),
      tipo: $('r-tipo').value,
      mensaje: $('r-mensaje').value,
      fecha_programada: $('r-fecha').value.replace('T', ' ')
    };

    try {
      await api('POST', '/recordatorios', body);
      closeModal('modal-recordatorio');
      loadRecordatorios();
    } catch (err) {
      showAlert(err.message, 'error', 'modal-alert-recordatorio');
    }
  });
}

// ── LOADERS MAP ────────────────────────────────
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

// ── CLOSE MODALS ON OVERLAY CLICK ──────────────
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ── RESTAURAR SESIÓN AL RECARGAR ───────────────
document.addEventListener('DOMContentLoaded', () => {
  const saved = sessionStorage.getItem('sigch_user');

  if (saved) {
    currentUser = JSON.parse(saved);

    $('login-screen').style.display = 'none';
    $('sidebar').style.display = 'flex';
    $('main').style.display = 'block';

    $('user-name').textContent = currentUser.nombre_completo;
    $('user-role').textContent = currentUser.rol;

    aplicarPermisosUI();
    navigate('dashboard');
      if ($('btn-nuevo-horario')) {
    $('btn-nuevo-horario').style.display =
      tienePermiso('horarios') ? 'inline-flex' : 'none';
  }
  }

  // Inicializador FullCalendar y modal de día
document.addEventListener('DOMContentLoaded', function() {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;

  const modal = document.getElementById('dayModal');
  const closeModal = document.getElementById('closeModal');
  const modalDateTitle = document.getElementById('modalDateTitle');
  const eventsList = document.getElementById('eventsList');
  const noEvents = document.getElementById('noEvents');

  function openModal(dateStr) {
    modal.style.display = 'block';
    modalDateTitle.textContent = new Date(dateStr).toLocaleDateString();
  }
  function closeModalFn() {
    modal.style.display = 'none';
    eventsList.innerHTML = '';
    noEvents.style.display = 'none';
  }
  closeModal.addEventListener('click', closeModalFn);
  window.addEventListener('click', (e) => { if (e.target === modal) closeModalFn(); });

  async function fetchEventsForDate(dateStr) {
    const start = dateStr + 'T00:00:00Z';
    const end = dateStr + 'T23:59:59Z';
    const token = localStorage.getItem('accessToken') || '';
    const res = await fetch(`/api/eventos?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) throw new Error('Error cargando eventos');
    return await res.json();
  }

  function formatTime(iso) {
    try { const d = new Date(iso); return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return ''; }
  }

  function renderEventsList(events) {
    eventsList.innerHTML = '';
    if (!events || events.length === 0) { noEvents.style.display = 'block'; return; }
    noEvents.style.display = 'none';
    events.forEach(e => {
      const li = document.createElement('li'); li.className = 'event-item';
      const left = document.createElement('div');
      const title = document.createElement('div'); title.className = 'event-title'; title.textContent = e.titulo || 'Sin título';
      const time = document.createElement('div'); time.className = 'event-time'; time.textContent = formatTime(e.inicio) + (e.fin ? ' — ' + formatTime(e.fin) : '');
      left.appendChild(title); left.appendChild(time);
      const actions = document.createElement('div'); actions.className = 'event-actions';
      const viewBtn = document.createElement('button'); viewBtn.textContent = 'Ver';
      viewBtn.addEventListener('click', () => { alert((e.titulo || '') + '\n\n' + (e.descripcion || 'Sin descripción') + '\n\nAsignado a: ' + (e.asignado_a || 'N/A')); });
      const deleteBtn = document.createElement('button'); deleteBtn.textContent = 'Eliminar';
      deleteBtn.addEventListener('click', async () => {
        if (!confirm('Eliminar evento?')) return;
        const token = localStorage.getItem('accessToken') || '';
        const r = await fetch('/api/eventos/' + e.id_evento, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
        if (r.ok) { li.remove(); if (!eventsList.children.length) noEvents.style.display = 'block'; }
        else alert('No autorizado o error');
      });
      actions.appendChild(viewBtn); actions.appendChild(deleteBtn);
      li.appendChild(left); li.appendChild(actions);
      eventsList.appendChild(li);
    });
  }

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
    selectable: true,
    editable: true,
    eventDisplay: 'block',
    dateClick: async function(info) {
      const dateStr = info.dateStr;
      openModal(dateStr);
      try {
        const events = await fetchEventsForDate(dateStr);
        renderEventsList(events);
      } catch (err) {
        eventsList.innerHTML = '';
        noEvents.style.display = 'block';
      }
    },
    events: async function(fetchInfo, successCallback, failureCallback) {
      try {
        const start = fetchInfo.startStr;
        const end = fetchInfo.endStr;
        const token = localStorage.getItem('accessToken') || '';
        const res = await fetch(`/api/eventos?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) throw new Error('Error cargando eventos');
        const data = await res.json();
        const events = data.map(e => ({ id: e.id_evento, title: e.titulo, start: e.inicio, end: e.fin }));
        successCallback(events);
      } catch (err) { failureCallback(err); }
    }
  });

  calendar.render();
  window.calendar = calendar;
});

});






// --- Debug + helper para rellenar modal de edición/creación ---
function fillFormFields(prefix, data) {
  // prefix: '' o 'edit-' si tus inputs son edit-nombre, edit-fecha, etc.
  Object.keys(data || {}).forEach(key => {
    const id = prefix + key;
    const el = document.getElementById(id);
    if (el) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
        el.value = data[key] == null ? '' : data[key];
      } else {
        el.textContent = data[key];
      }
    } else {
      // log para depuración
      console.debug('fillFormFields: no existe', id);
    }
  });
}

function openEditModal(cita) {
  // Asegura que el modal se muestre y se rellenen campos
  const modal = document.getElementById('dayModal') || document.getElementById('editModal');
  if (!modal) { console.warn('openEditModal: modal no encontrado'); return; }
  // Ejemplo de mapeo: adapta claves según tu API
  const payload = {
    id_cita: cita.id_cita || cita.id,
    paciente_id: cita.id_paciente || cita.paciente_id,
    psicologo_id: cita.id_psicologo || cita.psicologo_id,
    fecha_hora: cita.fecha_hora || cita.inicio || cita.start,
    motivo: cita.motivo || cita.title || cita.titulo
  };
  // Rellena inputs con ids: edit-id_cita, edit-paciente_id, edit-psicologo_id, edit-fecha_hora, edit-motivo
  fillFormFields('edit-', payload);
  // muestra modal
  modal.style.display = 'block';
  // asegúrate que el contenido sea visible
  const content = modal.querySelector('.modal-content');
  if (content) { content.style.display = 'block'; content.style.zIndex = 10001; }
  console.log('openEditModal: modal abierto y rellenado', payload);
}

// Handler para crear nuevo (limpia campos y abre modal)
function openCreateModal() {
  const modal = document.getElementById('dayModal') || document.getElementById('editModal');
  if (!modal) return;
  // limpia campos con prefijo 'edit-'
  ['id_cita','paciente_id','psicologo_id','fecha_hora','motivo'].forEach(k => {
    const el = document.getElementById('edit-' + k);
    if (el) el.value = '';
  });
  modal.style.display = 'block';
  const content = modal.querySelector('.modal-content');
  if (content) { content.style.display = 'block'; content.style.zIndex = 10001; }
  console.log('openCreateModal: modal abierto (nuevo)');
}

// Delegación: si hay botones con data-action, los manejamos
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (action === 'editCita') {
    // pide la cita y abre modal
    api('GET', `/citas/${id}`).then(cita => openEditModal(cita)).catch(err => {
      console.error('Error cargando cita para editar', err);
      alert('No se pudo cargar la cita: ' + (err.message || err.status));
    });
  } else if (action === 'createCita') {
    openCreateModal();
  }
});







// Debug: overlay de errores y logs para modal y peticiones
(function() {
  // pequeño panel de debug
  const dbg = document.createElement('div');
  dbg.id = 'debugPanel';
  dbg.style = 'position:fixed;right:10px;bottom:10px;z-index:99999;background:rgba(0,0,0,0.7);color:#fff;padding:8px;border-radius:6px;font-size:12px;max-width:320px;max-height:200px;overflow:auto;';
  dbg.innerHTML = '<b>Debug</b><div id="dbgContent"></div>';
  document.body.appendChild(dbg);

  function dbgLog(msg) {
    const c = document.getElementById('dbgContent');
    if (!c) return;
    const p = document.createElement('div');
    p.textContent = (new Date()).toLocaleTimeString() + ' — ' + msg;
    c.prepend(p);
  }

  // Wrap api to log requests/responses
  const _origApi = window.api;
  window.api = async function(method, path, body = null) {
    dbgLog(`API ${method} ${path} body=${body ? JSON.stringify(body) : 'null'}`);
    try {
      const res = await _origApi(method, path, body);
      dbgLog(`OK ${method} ${path} -> ${JSON.stringify(res).slice(0,200)}`);
      return res;
    } catch (err) {
      dbgLog(`ERR ${method} ${path} -> ${err.message || err.status}`);
      // muestra alerta modal si falla
      try {
        const modal = document.getElementById('dayModal');
        if (modal) {
          modal.style.display = 'block';
          const title = document.getElementById('modalDateTitle');
          const list = document.getElementById('eventsList');
          const noEv = document.getElementById('noEvents');
          if (title) title.textContent = 'Error';
          if (list) list.innerHTML = `<li class="event-item">Error: ${err.message || err.status}</li>`;
          if (noEv) noEv.style.display = 'none';
        } else {
          alert('Error: ' + (err.message || err.status));
        }
      } catch(e) { console.error(e); }
      throw err;
    }
  };

  // Log cuando se abre el modal
  const origOpen = window.openDayModal;
  window.openDayModal = function(dateStr, events) {
    dbgLog('openDayModal ' + dateStr + ' events=' + (events ? events.length : 0));
    try { return origOpen(dateStr, events); } catch (e) { dbgLog('openDayModal error: ' + e.message); throw e; }
  };

  dbgLog('Debug panel inicializado');
})();
