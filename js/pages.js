/* ═══════════════════════════════════════════════════════════════════════════
   js/pages.js  — All page render functions
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── DASHBOARD ───────────────────────────────────────────────────────────── */
function renderDashboard() {
  const user   = Store.Auth.current();
  const citas  = Store.Citas.all();
  const pacs   = Store.Pacientes.activos();
  const hoy    = DateUtils.today();
  const citasHoy   = citas.filter(c => c.fecha === hoy && c.estado !== 'cancelada');
  const pendientes = citas.filter(c => c.fecha >= hoy && c.estado === 'programada');
  const realizadas = citas.filter(c => c.estado === 'realizada');

  const recentCitas = citas.filter(c=>c.estado!=='cancelada').sort((a,b)=>b.fecha.localeCompare(a.fecha)||b.hora.localeCompare(a.hora)).slice(0,5);

  const canSeeCitas = ['administrador','recepcionista','psicologo'].includes(user.rol);

  App.setContent(`
  <div class="page-header">
    <div><h1>Bienvenido, ${escHtml(user.nombre.split(' ')[0])}</h1>
    <p class="text-muted text-sm">${DateUtils.fmtFull(hoy)}</p></div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon teal">${Icons.calendar}</div>
      <div><div class="stat-value">${citasHoy.length}</div><div class="stat-label">Citas hoy</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon amber">${Icons.users}</div>
      <div><div class="stat-value">${pacs.length}</div><div class="stat-label">Pacientes activos</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon green">${Icons.check}</div>
      <div><div class="stat-value">${realizadas.length}</div><div class="stat-label">Sesiones realizadas</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon teal">${Icons.clipboard}</div>
      <div><div class="stat-value">${pendientes.length}</div><div class="stat-label">Citas pendientes</div></div>
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <div class="card-header"><h3>Citas de hoy</h3><button class="btn btn-secondary btn-sm" onclick="Router.go('citas')">Ver todas</button></div>
      <div class="card-body">
        ${citasHoy.length === 0 ? `<div class="empty-state"><p>Sin citas para hoy</p></div>` :
          citasHoy.sort((a,b)=>a.hora.localeCompare(b.hora)).map(c => {
            const p = Store.Pacientes.get(c.idPaciente);
            const ps = Store.Usuarios.get(c.idPsicologo);
            return `<div class="flex items-center gap-3 mb-3">
              <div class="avatar ${avatarColor(p?.nombre||'')}">${initials(p?.nombre)}</div>
              <div class="flex-1">
                <div class="font-medium text-sm">${escHtml(p?.nombre||'?')}</div>
                <div class="text-xs text-muted">${c.hora} · ${escHtml(ps?.nombre||'')}</div>
              </div>
              ${estadoBadge(c.estado)}
            </div>`;
          }).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Próximas citas</h3></div>
      <div class="card-body">
        ${pendientes.length === 0 ? `<div class="empty-state"><p>Sin citas pendientes</p></div>` :
          pendientes.sort((a,b)=>a.fecha.localeCompare(b.fecha)||a.hora.localeCompare(b.hora)).slice(0,5).map(c => {
            const p = Store.Pacientes.get(c.idPaciente);
            return `<div class="flex items-center gap-3 mb-3">
              <div class="avatar ${avatarColor(p?.nombre||'')}">${initials(p?.nombre)}</div>
              <div class="flex-1">
                <div class="font-medium text-sm">${escHtml(p?.nombre||'?')}</div>
                <div class="text-xs text-muted">${DateUtils.fmt(c.fecha)} · ${c.hora}</div>
              </div>
              ${estadoBadge(c.estado)}
            </div>`;
          }).join('')}
      </div>
    </div>
  </div>`);
}

/* ─── PACIENTES ───────────────────────────────────────────────────────────── */
function renderPacientes(filter = '') {
  const user = Store.Auth.current();
  const todos = Store.Pacientes.activos();
  const q = filter.toLowerCase();
  const lista = q ? todos.filter(p => p.nombre.toLowerCase().includes(q) || p.ci.includes(q) || (p.email||'').toLowerCase().includes(q)) : todos;

  App.setContent(`
  <div class="page-header">
    <h1>Pacientes</h1>
    ${user.rol !== 'psicologo' ? `<button class="btn btn-primary" onclick="showModalPaciente()">${Icons.plus} Nuevo paciente</button>` : ''}
  </div>
  <div class="card">
    <div class="card-header">
      <div class="search-bar" style="flex:1;max-width:340px">${Icons.search}
        <input class="form-control" id="search-pac" placeholder="Buscar por nombre, CI o correo…" value="${escHtml(filter)}" oninput="renderPacientes(this.value)">
      </div>
      <span class="text-sm text-muted">${lista.length} paciente(s)</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Paciente</th><th>CI</th><th>Edad</th><th>Teléfono</th><th>Motivo de consulta</th><th>Acciones</th>
        </tr></thead>
        <tbody>
          ${lista.length === 0 ? `<tr><td colspan="6"><div class="empty-state"><p>Sin resultados</p></div></td></tr>` :
            lista.map(p => `
            <tr>
              <td><div class="flex items-center gap-2">
                <div class="avatar avatar-sm ${avatarColor(p.nombre)}">${initials(p.nombre)}</div>
                <div><div class="font-medium">${escHtml(p.nombre)}</div><div class="td-sub">${escHtml(p.email||'')}</div></div>
              </div></td>
              <td>${escHtml(p.ci)}</td>
              <td>${DateUtils.age(p.fnac)} años</td>
              <td>${escHtml(p.telefono)}</td>
              <td><span class="text-sm">${escHtml(p.motivoConsulta||'—')}</span></td>
              <td><div class="flex gap-2">
                <button class="btn btn-ghost btn-sm" title="Ver historial" onclick="Router.go('historial/${p.id}')">${Icons.clipboard}</button>
                ${user.rol !== 'psicologo' ? `<button class="btn btn-ghost btn-sm" title="Editar" onclick="showModalPaciente('${p.id}')">${Icons.edit}</button>` : ''}
                ${user.rol === 'administrador' ? `<button class="btn btn-ghost btn-sm" title="Dar de baja" onclick="bajaPaciente('${p.id}')">${Icons.trash}</button>` : ''}
              </div></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`);
}

function showModalPaciente(id = null) {
  const p = id ? Store.Pacientes.get(id) : {};
  const v = f => escHtml(p[f]||'');
  const overlay = Modal.open({
    title: id ? 'Editar paciente' : 'Registrar nuevo paciente',
    size: 'modal-lg',
    body: `
    <form id="form-paciente" autocomplete="off">
      <div class="form-row">
        <div class="form-group"><label>Nombre completo *</label>
          <input class="form-control" name="nombre" value="${v('nombre')}" placeholder="Ej: María García López">
          <div class="form-error"></div></div>
        <div class="form-group"><label>Carnet de Identidad *</label>
          <input class="form-control" name="ci" value="${v('ci')}" placeholder="1234567">
          <div class="form-error"></div></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Fecha de nacimiento *</label>
          <input type="date" class="form-control" name="fnac" value="${v('fnac')}">
          <div class="form-error"></div></div>
        <div class="form-group"><label>Sexo</label>
          <select class="form-control" name="sexo">
            <option value="">Seleccionar…</option>
            <option value="M" ${p.sexo==='M'?'selected':''}>Masculino</option>
            <option value="F" ${p.sexo==='F'?'selected':''}>Femenino</option>
            <option value="Otro" ${p.sexo==='Otro'?'selected':''}>Otro / Prefiero no decir</option>
          </select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Teléfono *</label>
          <input class="form-control" name="telefono" value="${v('telefono')}" placeholder="71234567">
          <div class="form-error"></div></div>
        <div class="form-group"><label>Correo electrónico</label>
          <input type="email" class="form-control" name="email" value="${v('email')}" placeholder="paciente@mail.com">
          <div class="form-error"></div></div>
      </div>
      <div class="form-group"><label>Dirección</label>
        <input class="form-control" name="direccion" value="${v('direccion')}" placeholder="Av. Ejemplo 123, La Paz"></div>
      <div class="form-group"><label>Ocupación</label>
        <input class="form-control" name="ocupacion" value="${v('ocupacion')}" placeholder="Docente, Estudiante…"></div>
      <div class="form-group"><label>Motivo de consulta *</label>
        <textarea class="form-control" name="motivoConsulta" rows="2" placeholder="Descripción breve del motivo de consulta…">${v('motivoConsulta')}</textarea>
        <div class="form-error"></div></div>
      <div class="form-group"><label>Contacto de emergencia</label>
        <input class="form-control" name="contactoEmergencia" value="${v('contactoEmergencia')}" placeholder="Nombre - 71234567"></div>
    </form>`,
    footer: `<button class="btn btn-ghost" onclick="Modal.close()">Cancelar</button>
             <button class="btn btn-primary" onclick="guardarPaciente('${id||''}')">Guardar paciente</button>`,
  });
}

function guardarPaciente(id) {
  const form = document.getElementById('form-paciente');
  const valid = Form.validate([
    { el: form.nombre,        rules: { required: true } },
    { el: form.ci,            rules: { required: true } },
    { el: form.fnac,          rules: { required: true } },
    { el: form.telefono,      rules: { required: true, phone: true } },
    { el: form.motivoConsulta,rules: { required: true } },
  ]);
  if (!valid) return;
  const data = Form.data(form);
  if (id) data.id = id;
  data.activo = true;
  Store.Pacientes.save(data);
  Store.Auth.log(Store.Auth.current().id, 'PACIENTE_' + (id?'EDIT':'CREATE'), `Paciente: ${data.nombre}`);
  Modal.close();
  Toast.success(id ? 'Paciente actualizado.' : 'Paciente registrado correctamente.');
  renderPacientes();
}

function bajaPaciente(id) {
  const p = Store.Pacientes.get(id);
  Modal.confirm({
    title: 'Dar de baja paciente',
    message: `¿Dar de baja lógica a <strong>${escHtml(p.nombre)}</strong>? El registro se conservará en el sistema.`,
    danger: true,
    onConfirm() {
      Store.Pacientes.baja(id);
      Store.Auth.log(Store.Auth.current().id, 'PACIENTE_BAJA', `Paciente: ${p.nombre}`);
      Toast.success('Paciente dado de baja.');
      renderPacientes();
    },
  });
}

/* ─── CITAS ───────────────────────────────────────────────────────────────── */
function renderCitas() {
  const user  = Store.Auth.current();
  const today = DateUtils.today();
  let citas   = Store.Citas.all().sort((a,b)=>b.fecha.localeCompare(a.fecha)||a.hora.localeCompare(b.hora));
  if (user.rol === 'psicologo') citas = citas.filter(c => c.idPsicologo === user.id);

  App.setContent(`
  <div class="page-header">
    <h1>Gestión de Citas</h1>
    ${user.rol !== 'psicologo' ? `<button class="btn btn-primary" onclick="showModalCita()">${Icons.plus} Nueva cita</button>` : ''}
  </div>
  <div class="tabs">
    <div class="tab active" data-tab="lista" onclick="switchCitaTab('lista',this)">Lista</div>
    <div class="tab" data-tab="calendario" onclick="switchCitaTab('calendario',this)">Calendario</div>
  </div>
  <div id="cita-tab-content">
    ${renderCitasList(citas, user)}
  </div>`);
}

function renderCitasList(citas, user) {
  const today = DateUtils.today();
  return `<div class="card">
    <div class="table-wrap"><table>
      <thead><tr><th>Paciente</th><th>Fecha y hora</th><th>Psicólogo</th><th>Motivo</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>
        ${citas.length===0 ? `<tr><td colspan="6"><div class="empty-state"><p>Sin citas registradas</p></div></td></tr>` :
          citas.slice(0,50).map(c => {
            const p  = Store.Pacientes.get(c.idPaciente);
            const ps = Store.Usuarios.get(c.idPsicologo);
            const past = c.fecha < today;
            return `<tr>
              <td><div class="flex items-center gap-2">
                <div class="avatar avatar-sm ${avatarColor(p?.nombre||'')}">${initials(p?.nombre)}</div>
                <div class="font-medium text-sm">${escHtml(p?.nombre||'?')}</div>
              </div></td>
              <td><div class="font-medium text-sm">${DateUtils.fmt(c.fecha)}</div><div class="td-sub">${c.hora} · ${c.duracion} min</div></td>
              <td class="text-sm">${escHtml(ps?.nombre||'?')}</td>
              <td class="text-sm">${escHtml(c.motivo||'—')}</td>
              <td>${estadoBadge(c.estado)}</td>
              <td><div class="flex gap-1">
                ${c.estado==='programada' && !past ? `
                  ${user.rol !== 'psicologo' ? `<button class="btn btn-ghost btn-sm" title="Editar" onclick="showModalCita('${c.id}')">${Icons.edit}</button>` : ''}
                  <button class="btn btn-ghost btn-sm" title="Marcar realizada" onclick="marcarRealizada('${c.id}')">${Icons.check}</button>
                  ${user.rol !== 'psicologo' ? `<button class="btn btn-ghost btn-sm" title="Cancelar" onclick="cancelarCita('${c.id}')">${Icons.trash}</button>` : ''}
                ` : ''}
                <button class="btn btn-ghost btn-sm" title="Ver historial" onclick="Router.go('historial/${c.idPaciente}')">${Icons.clipboard}</button>
              </div></td>
            </tr>`;
          }).join('')}
      </tbody>
    </table></div></div>`;
}

function switchCitaTab(tab, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const user = Store.Auth.current();
  let citas = Store.Citas.all().sort((a,b)=>b.fecha.localeCompare(a.fecha)||a.hora.localeCompare(b.hora));
  if (user.rol === 'psicologo') citas = citas.filter(c => c.idPsicologo === user.id);
  const content = document.getElementById('cita-tab-content');
  if (tab === 'lista') { content.innerHTML = renderCitasList(citas, user); }
  else { content.innerHTML = renderCalendario(); }
}

function showModalCita(id = null) {
  const c   = id ? Store.Citas.get(id) : {};
  const pacs = Store.Pacientes.activos();
  const psis = Store.Usuarios.psicologos();
  const v    = f => escHtml(c[f]||'');
  Modal.open({
    title: id ? 'Reprogramar cita' : 'Agendar nueva cita',
    body: `
    <form id="form-cita" autocomplete="off">
      <div class="form-group"><label>Paciente *</label>
        <select class="form-control" name="idPaciente" required>
          <option value="">Seleccionar paciente…</option>
          ${pacs.map(p=>`<option value="${p.id}" ${c.idPaciente===p.id?'selected':''}>${escHtml(p.nombre)} — CI: ${p.ci}</option>`).join('')}
        </select><div class="form-error"></div></div>
      <div class="form-row">
        <div class="form-group"><label>Fecha *</label>
          <input type="date" class="form-control" name="fecha" value="${v('fecha')}" min="${DateUtils.today()}">
          <div class="form-error"></div></div>
        <div class="form-group"><label>Hora *</label>
          <select class="form-control" name="hora">
            ${['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00'].map(h=>`<option value="${h}" ${c.hora===h?'selected':''}>${h}</option>`).join('')}
          </select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Psicólogo *</label>
          <select class="form-control" name="idPsicologo">
            <option value="">Seleccionar…</option>
            ${psis.map(p=>`<option value="${p.id}" ${c.idPsicologo===p.id?'selected':''}>${escHtml(p.nombre)}</option>`).join('')}
          </select><div class="form-error"></div></div>
        <div class="form-group"><label>Duración (min)</label>
          <select class="form-control" name="duracion">
            <option value="40" ${c.duracion==40?'selected':''}>40 min</option>
            <option value="50" ${!c.duracion||c.duracion==50?'selected':''}>50 min</option>
            <option value="60" ${c.duracion==60?'selected':''}>60 min</option>
            <option value="75" ${c.duracion==75?'selected':''}>75 min (evaluación)</option>
          </select></div>
      </div>
      <div class="form-group"><label>Motivo / notas</label>
        <textarea class="form-control" name="motivo" rows="2" placeholder="Tipo de sesión, observaciones…">${v('motivo')}</textarea></div>
    </form>`,
    footer: `<button class="btn btn-ghost" onclick="Modal.close()">Cancelar</button>
             <button class="btn btn-primary" onclick="guardarCita('${id||''}')">Guardar cita</button>`,
  });
}

function guardarCita(id) {
  const form = document.getElementById('form-cita');
  const sel  = f => form.querySelector(`[name="${f}"]`);
  const valid = Form.validate([
    { el: sel('idPaciente'),  rules: { required: true } },
    { el: sel('fecha'),       rules: { required: true } },
    { el: sel('idPsicologo'), rules: { required: true } },
  ]);
  if (!valid) return;
  const data = Form.data(form);
  if (id) data.id = id;
  data.estado = 'programada';
  const res = Store.Citas.save(data);
  if (!res.ok) { Toast.error(res.error); return; }
  Store.Auth.log(Store.Auth.current().id, 'CITA_' + (id?'EDIT':'CREATE'), `${data.fecha} ${data.hora}`);
  Modal.close();
  Toast.success(id ? 'Cita reprogramada.' : 'Cita agendada correctamente.');
  renderCitas();
}

function cancelarCita(id) {
  const c = Store.Citas.get(id);
  const p = Store.Pacientes.get(c.idPaciente);
  Modal.confirm({
    title: 'Cancelar cita',
    message: `¿Cancelar la cita de <strong>${escHtml(p?.nombre)}</strong> del ${DateUtils.fmt(c.fecha)} a las ${c.hora}?`,
    danger: true,
    onConfirm() {
      Store.Citas.cancelar(id);
      Store.Auth.log(Store.Auth.current().id, 'CITA_CANCELAR', `Cita ${id}`);
      Toast.success('Cita cancelada.');
      renderCitas();
    },
  });
}

function marcarRealizada(id) {
  Store.Citas.realizarCita(id);
  Toast.success('Cita marcada como realizada.');
  renderCitas();
}

/* ─── CALENDARIO ──────────────────────────────────────────────────────────── */
let calYear, calMonth;
function renderCalendario(yearIn, monthIn) {
  const now   = new Date();
  calYear     = yearIn  ?? now.getFullYear();
  calMonth    = monthIn ?? now.getMonth();
  const user  = Store.Auth.current();
  let citas   = Store.Citas.activas();
  if (user.rol === 'psicologo') citas = citas.filter(c => c.idPsicologo === user.id);

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const todayStr = DateUtils.today();

  // build cells
  let cells = '';
  const dayNames = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  for (const d of dayNames) cells += `<div class="cal-day-name">${d}</div>`;

  // empty cells
  for (let i = 0; i < firstDay; i++) cells += `<div class="cal-cell other-month"></div>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const dayCitas = citas.filter(c => c.fecha === dateStr);
    const isToday  = dateStr === todayStr;
    cells += `<div class="cal-cell${isToday?' today':''}" onclick="Router.go('citas')">
      <div class="cal-date">${day}</div>
      ${dayCitas.slice(0,3).map(c => {
        const p = Store.Pacientes.get(c.idPaciente);
        return `<div class="cal-event ${c.estado}" title="${escHtml(p?.nombre||'')} ${c.hora}">${c.hora} ${escHtml((p?.nombre||'').split(' ')[0])}</div>`;
      }).join('')}
      ${dayCitas.length > 3 ? `<div class="cal-event">+${dayCitas.length-3} más</div>` : ''}
    </div>`;
  }

  return `<div class="card">
    <div class="card-header">
      <div class="cal-nav">
        <button class="btn btn-ghost btn-sm" onclick="changeMonth(-1)">${Icons.chevLeft}</button>
        <h3>${DateUtils.monthName(calMonth)} ${calYear}</h3>
        <button class="btn btn-ghost btn-sm" onclick="changeMonth(1)">${Icons.chevRight}</button>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="changeMonth(0,true)">Hoy</button>
    </div>
    <div class="card-body" style="padding:0">
      <div class="cal-grid">${cells}</div>
    </div>
  </div>`;
}

function changeMonth(delta, reset=false) {
  const now = new Date();
  if (reset) { calYear = now.getFullYear(); calMonth = now.getMonth(); }
  else { calMonth += delta; if (calMonth < 0) { calMonth = 11; calYear--; } else if (calMonth > 11) { calMonth = 0; calYear++; } }
  document.getElementById('cita-tab-content').innerHTML = renderCalendario(calYear, calMonth);
}

/* ─── HISTORIAL ───────────────────────────────────────────────────────────── */
function renderHistorial(pacienteId) {
  const user = Store.Auth.current();
  if (!pacienteId) { renderPacientes(); return; }
  const p     = Store.Pacientes.get(pacienteId);
  if (!p) { Toast.error('Paciente no encontrado.'); Router.go('pacientes'); return; }
  const hists = Store.Historiales.dePaciente(pacienteId);
  const citas = Store.Citas.all().filter(c => c.idPaciente === pacienteId).sort((a,b)=>b.fecha.localeCompare(a.fecha));

  // restrict psicologo to own patients
  if (user.rol === 'psicologo') {
    const hasCita = citas.some(c => c.idPsicologo === user.id);
    if (!hasCita && hists.length === 0) { Toast.warning('No tienes acceso al historial de este paciente.'); Router.go('dashboard'); return; }
  }

  App.setContent(`
  <div class="page-header">
    <div class="flex items-center gap-3">
      <button class="btn btn-ghost btn-sm" onclick="Router.go('pacientes')">${Icons.chevLeft}</button>
      <div class="avatar ${avatarColor(p.nombre)}">${initials(p.nombre)}</div>
      <div><h1>${escHtml(p.nombre)}</h1><p class="text-muted text-sm">CI: ${p.ci} · ${DateUtils.age(p.fnac)} años · ${p.sexo==='M'?'Masculino':p.sexo==='F'?'Femenino':'Otro'}</p></div>
    </div>
    ${user.rol === 'psicologo' ? `<button class="btn btn-primary" onclick="showModalHistorial('${pacienteId}')">${Icons.plus} Nueva nota de sesión</button>` : ''}
  </div>

  <div class="grid-2" style="align-items:start">
    <div>
      <div class="card mb-4">
        <div class="card-header"><h3>Datos del paciente</h3>
          ${user.rol !== 'psicologo' ? `<button class="btn btn-ghost btn-sm" onclick="showModalPaciente('${p.id}')">${Icons.edit}</button>` : ''}
        </div>
        <div class="card-body">
          <div class="grid-2">
            ${[['Teléfono',p.telefono],['Correo',p.email||'—'],['Dirección',p.direccion||'—'],['Ocupación',p.ocupacion||'—'],['Motivo',p.motivoConsulta||'—'],['Emergencia',p.contactoEmergencia||'—']].map(([k,v])=>`
            <div><div class="text-xs text-muted">${k}</div><div class="text-sm font-medium">${escHtml(v)}</div></div>`).join('')}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>Citas registradas</h3></div>
        <div class="card-body">
          ${citas.length===0 ? '<p class="text-sm text-muted">Sin citas.</p>' :
            citas.slice(0,8).map(c => {
              const ps = Store.Usuarios.get(c.idPsicologo);
              return `<div class="flex items-center gap-3 mb-3">
                <div class="avatar avatar-sm ${avatarColor(ps?.nombre||'')}">${initials(ps?.nombre)}</div>
                <div class="flex-1"><div class="text-sm font-medium">${DateUtils.fmt(c.fecha)} · ${c.hora}</div>
                <div class="td-sub">${escHtml(ps?.nombre||'')} · ${escHtml(c.motivo||'')}</div></div>
                ${estadoBadge(c.estado)}
              </div>`;
            }).join('')}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>Historial clínico <span class="badge badge-teal">${hists.length} sesiones</span></h3>
      </div>
      <div class="card-body">
        ${hists.length===0 ? `<div class="empty-state">${Icons.clipboard}<h3>Sin registros clínicos</h3><p>Las notas de sesión aparecerán aquí.</p></div>` :
          `<div class="timeline">
            ${hists.map(h => {
              const ps = Store.Usuarios.get(h.idPsicologo);
              return `<div class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-card">
                  <div class="timeline-meta">
                    <div class="flex items-center gap-2">
                      <span class="badge badge-teal">Sesión ${h.sesion}</span>
                      <span class="text-xs text-muted">${DateUtils.fmt(h.fecha)}</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <span class="text-xs text-muted">${escHtml(ps?.nombre||'')}</span>
                      ${user.rol==='psicologo' && h.idPsicologo===user.id ? `<button class="btn btn-ghost btn-sm" onclick="showModalHistorial('${pacienteId}','${h.id}')">${Icons.edit}</button>` : ''}
                    </div>
                  </div>
                  ${h.diagnostico ? `<div class="mb-2"><div class="text-xs text-muted">Diagnóstico</div><div class="text-sm font-medium">${escHtml(h.diagnostico)}</div></div>` : ''}
                  ${h.tratamiento ? `<div class="mb-2"><div class="text-xs text-muted">Tratamiento</div><div class="text-sm">${escHtml(h.tratamiento)}</div></div>` : ''}
                  ${h.observaciones ? `<div class="mb-2"><div class="text-xs text-muted">Observaciones</div><div class="text-sm">${escHtml(h.observaciones)}</div></div>` : ''}
                  ${h.estadoEmocional ? `<div class="text-xs text-muted">Estado emocional: <strong>${estadoEmocionalLabel(h.estadoEmocional)}</strong></div>` : ''}
                </div>
              </div>`;
            }).join('')}
          </div>`}
      </div>
    </div>
  </div>`);
}

function showModalHistorial(pacienteId, id = null) {
  const user = Store.Auth.current();
  const h    = id ? Store.Historiales.get(id) : {};
  if (id && h.idPsicologo !== user.id) { Toast.error('Solo puedes editar tus propias notas.'); return; }
  const v = f => escHtml(h[f]||'');
  Modal.open({
    title: id ? 'Editar nota de sesión' : 'Registrar nueva sesión',
    size: 'modal-lg',
    body: `
    <form id="form-hist" autocomplete="off">
      <div class="form-row">
        <div class="form-group"><label>Fecha de sesión *</label>
          <input type="date" class="form-control" name="fecha" value="${v('fecha')||DateUtils.today()}">
          <div class="form-error"></div></div>
        <div class="form-group"><label>Estado emocional del paciente</label>
          <select class="form-control" name="estadoEmocional">
            <option value="">Seleccionar…</option>
            ${['1','2','3','4','5'].map(n=>`<option value="${n}" ${h.estadoEmocional===n?'selected':''}>${estadoEmocionalLabel(n)}</option>`).join('')}
          </select></div>
      </div>
      <div class="form-group"><label>Diagnóstico *</label>
        <input class="form-control" name="diagnostico" value="${v('diagnostico')}" placeholder="CIE-10 o descripción clínica…">
        <div class="form-error"></div></div>
      <div class="form-group"><label>Hipótesis diagnóstica</label>
        <textarea class="form-control" name="hipotesis" rows="2" placeholder="Hipótesis sobre el origen o mantenimiento del problema…">${v('hipotesis')}</textarea></div>
      <div class="form-group"><label>Plan de tratamiento</label>
        <input class="form-control" name="tratamiento" value="${v('tratamiento')}" placeholder="Tipo de terapia, enfoque…"></div>
      <div class="form-group"><label>Técnicas aplicadas en sesión</label>
        <input class="form-control" name="tecnicas" value="${v('tecnicas')}" placeholder="Psicoeducación, exposición, reestructuración cognitiva…"></div>
      <div class="form-group"><label>Observaciones clínicas *</label>
        <textarea class="form-control" name="observaciones" rows="3" placeholder="Notas de la sesión, comportamiento del paciente, temas trabajados…">${v('observaciones')}</textarea>
        <div class="form-error"></div></div>
      <div class="form-row">
        <div class="form-group"><label>Avances</label>
          <input class="form-control" name="avances" value="${v('avances')}" placeholder="Logros observados en esta sesión…"></div>
        <div class="form-group"><label>Cambios / ajustes</label>
          <input class="form-control" name="cambios" value="${v('cambios')}" placeholder="Modificaciones al plan de tratamiento…"></div>
      </div>
    </form>`,
    footer: `<button class="btn btn-ghost" onclick="Modal.close()">Cancelar</button>
             <button class="btn btn-primary" onclick="guardarHistorial('${pacienteId}','${id||''}')">Guardar sesión</button>`,
  });
}

function guardarHistorial(pacienteId, id) {
  const user = Store.Auth.current();
  const form = document.getElementById('form-hist');
  const sel  = f => form.querySelector(`[name="${f}"]`);
  const valid = Form.validate([
    { el: sel('fecha'),        rules: { required: true } },
    { el: sel('diagnostico'),  rules: { required: true } },
    { el: sel('observaciones'),rules: { required: true } },
  ]);
  if (!valid) return;
  const data = Form.data(form);
  if (id) data.id = id;
  data.idPaciente  = pacienteId;
  data.idPsicologo = user.id;
  Store.Historiales.save(data);
  Store.Auth.log(user.id, 'HISTORIAL_' + (id?'EDIT':'CREATE'), `Paciente ${pacienteId}`);
  Modal.close();
  Toast.success(id ? 'Nota actualizada.' : 'Sesión registrada correctamente.');
  renderHistorial(pacienteId);
}

/* ─── USUARIOS ────────────────────────────────────────────────────────────── */
function renderUsuarios() {
  const users = Store.Usuarios.all();
  App.setContent(`
  <div class="page-header">
    <h1>Gestión de Usuarios</h1>
    <button class="btn btn-primary" onclick="showModalUsuario()">${Icons.plus} Nuevo usuario</button>
  </div>
  <div class="card">
    <div class="table-wrap"><table>
      <thead><tr><th>Usuario</th><th>Rol</th><th>Especialidad</th><th>Creado</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>
        ${users.map(u => `<tr>
          <td><div class="flex items-center gap-2">
            <div class="avatar avatar-sm ${avatarColor(u.nombre)}">${initials(u.nombre)}</div>
            <div><div class="font-medium text-sm">${escHtml(u.nombre)}</div><div class="td-sub">${escHtml(u.email)}</div></div>
          </div></td>
          <td>${roleLabel(u.rol)}</td>
          <td class="text-sm text-muted">${escHtml(u.especialidad||'—')}</td>
          <td class="text-sm">${DateUtils.fmt(u.creado)}</td>
          <td>${u.activo ? '<span class="badge badge-green">Activo</span>' : '<span class="badge badge-red">Inactivo</span>'}</td>
          <td><div class="flex gap-1">
            <button class="btn btn-ghost btn-sm" onclick="showModalUsuario('${u.id}')">${Icons.edit}</button>
            ${u.activo ? `<button class="btn btn-ghost btn-sm" title="Dar de baja" onclick="bajaUsuario('${u.id}')">${Icons.trash}</button>` : ''}
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table></div>
  </div>`);
}

function showModalUsuario(id = null) {
  const u = id ? Store.Usuarios.get(id) : {};
  const v = f => escHtml(u[f]||'');
  Modal.open({
    title: id ? 'Editar usuario' : 'Crear nuevo usuario',
    body: `
    <form id="form-user" autocomplete="off">
      <div class="form-group"><label>Nombre completo *</label>
        <input class="form-control" name="nombre" value="${v('nombre')}"><div class="form-error"></div></div>
      <div class="form-group"><label>Correo electrónico *</label>
        <input type="email" class="form-control" name="email" value="${v('email')}"><div class="form-error"></div></div>
      ${!id ? `<div class="form-group"><label>Contraseña *</label>
        <input type="password" class="form-control" name="password" placeholder="Mín. 8 caracteres, mayús. y números">
        <div class="form-error"></div></div>` : ''}
      <div class="form-row">
        <div class="form-group"><label>Rol *</label>
          <select class="form-control" name="rol">
            <option value="recepcionista" ${u.rol==='recepcionista'?'selected':''}>Recepcionista</option>
            <option value="psicologo"     ${u.rol==='psicologo'?'selected':''}>Psicólogo</option>
            <option value="administrador" ${u.rol==='administrador'?'selected':''}>Administrador</option>
          </select></div>
        <div class="form-group"><label>Especialidad</label>
          <input class="form-control" name="especialidad" value="${v('especialidad')}" placeholder="Solo para psicólogos"></div>
      </div>
    </form>`,
    footer: `<button class="btn btn-ghost" onclick="Modal.close()">Cancelar</button>
             <button class="btn btn-primary" onclick="guardarUsuario('${id||''}')">Guardar</button>`,
  });
}

function guardarUsuario(id) {
  const form = document.getElementById('form-user');
  const sel  = f => form.querySelector(`[name="${f}"]`);
  const rules = [
    { el: sel('nombre'), rules: { required: true } },
    { el: sel('email'),  rules: { required: true, email: true } },
  ];
  if (!id) rules.push({ el: sel('password'), rules: { required: true, minLen: 8 } });
  if (!Form.validate(rules)) return;
  const data = Form.data(form);
  if (id) { data.id = id; if (!data.password) delete data.password; }
  data.activo = true;
  Store.Usuarios.save(data);
  Store.Auth.log(Store.Auth.current().id, 'USER_' + (id?'EDIT':'CREATE'), data.email);
  Modal.close();
  Toast.success(id ? 'Usuario actualizado.' : 'Usuario creado.');
  renderUsuarios();
}

function bajaUsuario(id) {
  const u = Store.Usuarios.get(id);
  Modal.confirm({
    title: 'Dar de baja usuario',
    message: `¿Dar de baja a <strong>${escHtml(u.nombre)}</strong>? No podrá iniciar sesión.`,
    danger: true,
    onConfirm() {
      Store.Usuarios.baja(id);
      Store.Auth.log(Store.Auth.current().id, 'USER_BAJA', u.email);
      Toast.success('Usuario dado de baja.');
      renderUsuarios();
    },
  });
}

/* ─── REPORTES ────────────────────────────────────────────────────────────── */
function renderReportes() {
  const citas   = Store.Citas.all();
  const pacs    = Store.Pacientes.activos();
  const hists   = Store.Historiales.all();
  const today   = DateUtils.today();
  const mes     = today.slice(0,7);

  const porEstado = {};
  citas.forEach(c => { porEstado[c.estado] = (porEstado[c.estado]||0)+1; });

  const porPsicologo = {};
  Store.Usuarios.psicologos().forEach(ps => {
    porPsicologo[ps.id] = { nombre: ps.nombre, citas: citas.filter(c=>c.idPsicologo===ps.id).length, sesiones: hists.filter(h=>h.idPsicologo===ps.id).length };
  });

  App.setContent(`
  <div class="page-header"><h1>Reportes y Estadísticas</h1></div>

  <div class="stats-grid">
    <div class="stat-card"><div class="stat-icon teal">${Icons.calendar}</div>
      <div><div class="stat-value">${citas.length}</div><div class="stat-label">Total citas registradas</div></div></div>
    <div class="stat-card"><div class="stat-icon green">${Icons.check}</div>
      <div><div class="stat-value">${porEstado['realizada']||0}</div><div class="stat-label">Sesiones realizadas</div></div></div>
    <div class="stat-card"><div class="stat-icon red">${Icons.x}</div>
      <div><div class="stat-value">${porEstado['cancelada']||0}</div><div class="stat-label">Citas canceladas</div></div></div>
    <div class="stat-card"><div class="stat-icon amber">${Icons.clipboard}</div>
      <div><div class="stat-value">${hists.length}</div><div class="stat-label">Notas clínicas</div></div></div>
  </div>

  <div class="grid-2">
    <div class="card">
      <div class="card-header"><h3>Citas por estado</h3></div>
      <div class="card-body">
        ${Object.entries(porEstado).map(([e,n]) => `
        <div class="flex items-center justify-between mb-3">
          ${estadoBadge(e)}<span class="font-semibold">${n}</span>
        </div>
        <div style="background:var(--slate-100);border-radius:4px;height:6px;margin-bottom:1rem">
          <div style="background:var(--teal-500);height:6px;border-radius:4px;width:${Math.round(n/citas.length*100)}%"></div>
        </div>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Actividad por psicólogo</h3></div>
      <div class="card-body">
        ${Object.values(porPsicologo).map(ps => `
        <div class="flex items-center gap-3 mb-3">
          <div class="avatar ${avatarColor(ps.nombre)}">${initials(ps.nombre)}</div>
          <div class="flex-1">
            <div class="font-medium text-sm">${escHtml(ps.nombre)}</div>
            <div class="td-sub">${ps.citas} citas · ${ps.sesiones} notas clínicas</div>
          </div>
        </div>`).join('')}
      </div>
    </div>
  </div>

  <div class="card mt-4">
    <div class="card-header"><h3>Listado de citas programadas</h3>
      <span class="text-sm text-muted">${citas.filter(c=>c.estado==='programada').length} citas activas</span></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Paciente</th><th>Fecha</th><th>Hora</th><th>Psicólogo</th><th>Estado</th></tr></thead>
      <tbody>
        ${citas.filter(c=>c.estado==='programada').sort((a,b)=>a.fecha.localeCompare(b.fecha)).slice(0,20).map(c => {
          const p  = Store.Pacientes.get(c.idPaciente);
          const ps = Store.Usuarios.get(c.idPsicologo);
          return `<tr>
            <td class="font-medium text-sm">${escHtml(p?.nombre||'?')}</td>
            <td class="text-sm">${DateUtils.fmt(c.fecha)}</td>
            <td class="text-sm">${c.hora}</td>
            <td class="text-sm">${escHtml(ps?.nombre||'?')}</td>
            <td>${estadoBadge(c.estado)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>
  </div>`);
}

/* ─── AUDITORÍA ───────────────────────────────────────────────────────────── */
function renderAuditoria() {
  const logs = Store.Auditoria.all();
  App.setContent(`
  <div class="page-header">
    <h1>Registro de Auditoría</h1>
    <span class="badge badge-slate">${Icons.shield} ${logs.length} eventos</span>
  </div>
  <div class="card">
    <div class="table-wrap"><table>
      <thead><tr><th>Fecha / hora</th><th>Usuario</th><th>Acción</th><th>Detalle</th><th>IP</th></tr></thead>
      <tbody>
        ${logs.length===0 ? `<tr><td colspan="5"><div class="empty-state"><p>Sin registros aún.</p></div></td></tr>` :
          logs.slice(0,100).map(l => {
            const u = Store.Usuarios.get(l.userId);
            const d = new Date(l.fecha);
            return `<tr>
              <td class="text-sm">${d.toLocaleDateString('es-BO')} ${d.toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'})}</td>
              <td><div class="font-medium text-sm">${escHtml(u?.nombre||'?')}</div><div class="td-sub">${escHtml(u?.email||'')}</div></td>
              <td><span class="badge badge-teal">${escHtml(l.accion)}</span></td>
              <td class="text-sm">${escHtml(l.detalle||'')}</td>
              <td class="text-xs text-muted font-medium">${escHtml(l.ip||'')}</td>
            </tr>`;
          }).join('')}
      </tbody>
    </table></div>
  </div>`);
}
