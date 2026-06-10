/* ═══════════════════════════════════════════════════════════════════════════
   js/app.js  — App shell, auth, routing
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── APP SHELL ───────────────────────────────────────────────────────────── */
const App = {
  init() {
    const user = Store.Auth.current();
    if (user) { this.renderShell(user); this.startInactivity(); Router.init(); }
    else { this.renderAuth(); }
  },

  renderAuth(msg = '') {
    document.getElementById('root').innerHTML = `
    <div class="auth-screen">
      <div class="auth-brand">
        <div class="auth-brand-logo">
          <svg width="36" height="36" fill="none" stroke="white" stroke-width="1.5" viewBox="0 0 24 24">
            <path d="M12 2a7 7 0 0 1 7 7c0 3.87-3.13 7-7 7s-7-3.13-7-7a7 7 0 0 1 7-7z"/>
            <line x1="12" y1="16" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>
          </svg>
        </div>
        <h1>Centro de Servicios Psicológicos</h1>
        <p>Sistema de Gestión de Citas e Historiales Clínicos</p>
        <div class="auth-tagline"><p>"Cada sesión comienza con la confianza de que la información estará disponible, segura y organizada."</p></div>
      </div>
      <div class="auth-form-side">
        <div class="auth-form-box">
          <h2>Iniciar sesión</h2>
          <p class="text-muted">Ingresa tus credenciales para acceder al sistema.</p>
          ${msg ? `<div class="toast error" style="position:static;margin-bottom:1rem;animation:none">${escHtml(msg)}</div>` : ''}
          <div class="form-group"><label>Correo electrónico</label>
            <input type="email" class="form-control" id="login-email" placeholder="usuario@csplp.bo" autocomplete="username">
            <div class="form-error"></div></div>
          <div class="form-group"><label>Contraseña</label>
            <div style="position:relative">
              <input type="password" class="form-control" id="login-pass" placeholder="Tu contraseña" autocomplete="current-password" style="padding-right:2.5rem" onkeydown="if(event.key==='Enter')doLogin()">
              <button type="button" class="btn btn-ghost btn-sm" style="position:absolute;right:.25rem;top:50%;transform:translateY(-50%)" onclick="togglePass()">${Icons.eye}</button>
            </div>
            <div class="form-error" id="login-err"></div></div>
          <button class="btn btn-primary btn-block btn-lg mt-3" onclick="doLogin()" id="btn-login">Ingresar al sistema</button>
          <hr class="divider">
          <p class="text-xs text-muted">Credenciales de prueba:</p>
          <div class="chip-group mt-2">
            <span class="chip" style="cursor:pointer" onclick="fillCreds('admin@csplp.bo','Admin1234')">Admin</span>
            <span class="chip" style="cursor:pointer" onclick="fillCreds('recep@csplp.bo','Recep1234')">Recepción</span>
            <span class="chip" style="cursor:pointer" onclick="fillCreds('psi1@csplp.bo','Psico1234')">Psicólogo</span>
          </div>
        </div>
      </div>
    </div>`;
  },

  renderShell(user) {
    const nav = this._buildNav(user);
    document.getElementById('root').innerHTML = `
    <div class="app">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-logo">
          <div class="logo-mark">
            <svg width="18" height="18" fill="none" stroke="white" stroke-width="1.5" viewBox="0 0 24 24">
              <path d="M12 2a7 7 0 0 1 7 7c0 3.87-3.13 7-7 7s-7-3.13-7-7a7 7 0 0 1 7-7z"/>
              <line x1="12" y1="16" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>
            </svg>
          </div>
          <span>SIGCH<br><span style="font-weight:400;opacity:.6;font-size:.72rem">CSP La Paz</span></span>
        </div>
        <nav class="sidebar-nav">${nav}</nav>
        <div class="sidebar-user">
          <div class="user-avatar">${initials(user.nombre)}</div>
          <div class="user-info">
            <div class="name">${escHtml(user.nombre.split(' ').slice(0,2).join(' '))}</div>
            <div class="role">${roleLabel(user.rol)}</div>
          </div>
          <button class="user-logout" title="Cerrar sesión" onclick="doLogout()">${Icons.logout}</button>
        </div>
      </aside>
      <div class="main-area">
        <header class="topbar">
          <button class="btn btn-ghost" id="menu-btn" onclick="document.getElementById('sidebar').classList.toggle('open')" style="display:none">${Icons.menu}</button>
          <div class="topbar-title">
            <h2 id="page-title">Dashboard</h2>
            <p id="page-sub">Sistema Informático de Gestión</p>
          </div>
          <div class="topbar-actions">
            <span class="badge badge-teal">${roleLabel(user.rol)}</span>
          </div>
        </header>
        <main class="page-content" id="page-content"></main>
      </div>
    </div>
    <div id="toast-container" class="toast-container"></div>`;

    // show menu btn on mobile
    if (window.innerWidth <= 900) document.getElementById('menu-btn').style.display='flex';
    window.addEventListener('resize', ()=>{ const b=document.getElementById('menu-btn'); if(b)b.style.display=window.innerWidth<=900?'flex':'none'; });

    // close sidebar on outside click (mobile)
    document.addEventListener('click', e => {
      const sb = document.getElementById('sidebar');
      if(sb && !sb.contains(e.target) && !e.target.closest('#menu-btn')) sb.classList.remove('open');
    });
  },

  _buildNav(user) {
    const items = [
      { hash:'dashboard', icon:Icons.home,      label:'Inicio',         roles:['administrador','recepcionista','psicologo'] },
      { hash:'pacientes', icon:Icons.users,      label:'Pacientes',      roles:['administrador','recepcionista','psicologo'] },
      { hash:'citas',     icon:Icons.calendar,   label:'Citas',          roles:['administrador','recepcionista','psicologo'] },
      { hash:'historial', icon:Icons.clipboard,  label:'Historiales',    roles:['administrador','psicologo'] },
    ];
    const admin = [
      { hash:'usuarios',  icon:Icons.shield,     label:'Usuarios',       roles:['administrador'] },
      { hash:'reportes',  icon:Icons.chart,       label:'Reportes',       roles:['administrador'] },
      { hash:'auditoria', icon:Icons.file,        label:'Auditoría',      roles:['administrador'] },
    ];
    const filterItems = arr => arr.filter(i => i.roles.includes(user.rol));
    let html = filterItems(items).map(i => `<div class="nav-item" data-hash="${i.hash}" onclick="Router.go('${i.hash}')">${i.icon}<span>${i.label}</span></div>`).join('');
    const adminItems = filterItems(admin);
    if (adminItems.length) {
      html += `<div class="nav-section-label">Administración</div>`;
      html += adminItems.map(i => `<div class="nav-item" data-hash="${i.hash}" onclick="Router.go('${i.hash}')">${i.icon}<span>${i.label}</span></div>`).join('');
    }
    return html;
  },

  setContent(html) {
    const el = document.getElementById('page-content');
    if (el) el.innerHTML = html;
  },

  setActiveNav(hash) {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.hash === hash);
    });
    const titles = {
      dashboard:'Inicio', pacientes:'Pacientes', citas:'Gestión de Citas',
      historial:'Historial Clínico', usuarios:'Usuarios', reportes:'Reportes',
      auditoria:'Auditoría', '404':'Página no encontrada',
    };
    const title = document.getElementById('page-title');
    if (title) title.textContent = titles[hash] || hash;
  },

  startInactivity() {
    InactivityTimer.start(() => {
      Store.Auth.logout();
      // show lock screen
      const lock = document.createElement('div');
      lock.className = 'lock-overlay';
      lock.id = 'lock-overlay';
      lock.innerHTML = `
        <div class="lock-card">
          ${Icons.lock}
          <h2 style="margin-bottom:.5rem">Sesión bloqueada</h2>
          <p class="text-sm text-muted mb-3">Tu sesión se cerró por inactividad (15 min). Vuelve a iniciar sesión.</p>
          <button class="btn btn-primary btn-block" onclick="document.getElementById('lock-overlay').remove(); App.renderAuth('Sesión cerrada por inactividad.')">Volver al inicio</button>
        </div>`;
      document.body.appendChild(lock);
    });
  },
};

/* ─── AUTH ACTIONS ────────────────────────────────────────────────────────── */
function doLogin() {
  const email = document.getElementById('login-email')?.value.trim();
  const pass  = document.getElementById('login-pass')?.value;
  const errEl = document.getElementById('login-err');
  const btn   = document.getElementById('btn-login');

  if (!email || !pass) { if(errEl) errEl.textContent = 'Ingresa correo y contraseña.'; return; }
  if (btn) btn.textContent = 'Verificando…';

  setTimeout(() => {
    const res = Store.Auth.login(email, pass);
    if (res.ok) {
      App.renderShell(res.user);
      App.startInactivity();
      Router.init();
    } else {
      if (btn) btn.textContent = 'Ingresar al sistema';
      App.renderAuth(res.error);
    }
  }, 300);
}

function doLogout() {
  Modal.confirm({
    title: 'Cerrar sesión',
    message: '¿Seguro que deseas cerrar sesión?',
    onConfirm() { Store.Auth.logout(); InactivityTimer.stop(); location.hash = ''; App.renderAuth(); },
  });
}

function fillCreds(email, pass) {
  document.getElementById('login-email').value = email;
  document.getElementById('login-pass').value  = pass;
}

function togglePass() {
  const i = document.getElementById('login-pass');
  if (i) i.type = i.type === 'password' ? 'text' : 'password';
}

/* ─── ROUTER SETUP ────────────────────────────────────────────────────────── */
Router.on('dashboard', () => {
  if (!Store.Auth.current()) { App.renderAuth(); return; }
  App.setActiveNav('dashboard');
  renderDashboard();
});
Router.on('pacientes', () => {
  if (!Store.Auth.current()) { App.renderAuth(); return; }
  App.setActiveNav('pacientes');
  renderPacientes();
});
Router.on('citas', () => {
  if (!Store.Auth.current()) { App.renderAuth(); return; }
  App.setActiveNav('citas');
  renderCitas();
});
Router.on('historial', pacId => {
  if (!Store.Auth.current()) { App.renderAuth(); return; }
  App.setActiveNav('historial');
  if (pacId) renderHistorial(pacId);
  else renderPacientes(); // pick a patient first
});
Router.on('usuarios', () => {
  const user = Store.Auth.current();
  if (!user) { App.renderAuth(); return; }
  if (user.rol !== 'administrador') { Toast.error('Acceso restringido.'); Router.go('dashboard'); return; }
  App.setActiveNav('usuarios');
  renderUsuarios();
});
Router.on('reportes', () => {
  const user = Store.Auth.current();
  if (!user) { App.renderAuth(); return; }
  if (user.rol !== 'administrador') { Toast.error('Acceso restringido.'); Router.go('dashboard'); return; }
  App.setActiveNav('reportes');
  renderReportes();
});
Router.on('auditoria', () => {
  const user = Store.Auth.current();
  if (!user) { App.renderAuth(); return; }
  if (user.rol !== 'administrador') { Toast.error('Acceso restringido.'); Router.go('dashboard'); return; }
  App.setActiveNav('auditoria');
  renderAuditoria();
});
Router.on('404', () => { App.setContent('<div class="empty-state"><h3>Página no encontrada</h3></div>'); });

/* ─── BOOT ────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => App.init());
