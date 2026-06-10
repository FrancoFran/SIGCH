/* ═══════════════════════════════════════════════════════════════════════════
   SIGCH — Sistema de Gestión de Citas e Historiales Clínicos
   js/store.js  — Single source of truth, persistence helpers
   ═══════════════════════════════════════════════════════════════════════════ */

const Store = (() => {
  /* ─── helpers ─────────────────────────────────────────────────────────── */
  const get  = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const set  = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  /* ─── seed data ───────────────────────────────────────────────────────── */
  function seed() {
    if (get('sigch_seeded')) return;

    set('sigch_users', [
      { id:'u1', nombre:'Marcelo Quiroga', email:'admin@csplp.bo',    password:'Admin1234', rol:'administrador', activo:true, creado:'2024-01-10' },
      { id:'u2', nombre:'Carmen Rojas',    email:'recep@csplp.bo',    password:'Recep1234', rol:'recepcionista', activo:true, creado:'2024-01-10' },
      { id:'u3', nombre:'Dra. Ana Soliz',  email:'psi1@csplp.bo',     password:'Psico1234', rol:'psicologo',     activo:true, creado:'2024-01-10', especialidad:'Terapia Cognitivo-Conductual' },
      { id:'u4', nombre:'Dr. Carlos Yana', email:'psi2@csplp.bo',     password:'Psico1234', rol:'psicologo',     activo:true, creado:'2024-02-15', especialidad:'Neuropsicología Infantil' },
    ]);

    set('sigch_pacientes', [
      { id:'p1', nombre:'Laura Mamani',    ci:'1234567', fnac:'1990-05-12', telefono:'71234567', email:'laura@mail.com', direccion:'Av. 6 de Marzo 123', sexo:'F', ocupacion:'Docente',   motivoConsulta:'Ansiedad generalizada',    contactoEmergencia:'Rosa Mamani - 77654321', activo:true, creado:'2024-03-01' },
      { id:'p2', nombre:'Diego Flores',    ci:'2345678', fnac:'1985-11-20', telefono:'72345678', email:'diego@mail.com', direccion:'C. Murillo 45',       sexo:'M', ocupacion:'Ingeniero', motivoConsulta:'Depresión leve',            contactoEmergencia:'María Flores - 77123456', activo:true, creado:'2024-03-10' },
      { id:'p3', nombre:'Sofía Condo',     ci:'3456789', fnac:'2000-07-08', telefono:'73456789', email:'sofia@mail.com', direccion:'Villa Fátima Blq 5',  sexo:'F', ocupacion:'Estudiante','motivoConsulta':'Presión académica y autolesiones', contactoEmergencia:'Elena Condo - 77987654', activo:true, creado:'2024-04-05' },
      { id:'p4', nombre:'Juan Quispe',     ci:'4567890', fnac:'1975-02-28', telefono:'74567890', email:'juan@mail.com',  direccion:'El Alto Zona 1',      sexo:'M', ocupacion:'Comerciante','motivoConsulta':'Estrés laboral',         contactoEmergencia:'Ana Quispe - 77111222', activo:true, creado:'2024-05-20' },
      { id:'p5', nombre:'Valentina Cruz',  ci:'5678901', fnac:'1995-09-15', telefono:'75678901', email:'valen@mail.com', direccion:'Miraflores Sur',      sexo:'F', ocupacion:'Diseñadora', motivoConsulta:'Duelo por pérdida familiar', contactoEmergencia:'Pedro Cruz - 77333444', activo:true, creado:'2024-06-01' },
    ]);

    const today = new Date();
    const fmt = d => d.toISOString().split('T')[0];
    const d0 = fmt(today);
    const d1 = fmt(new Date(today.getTime() + 86400000));
    const d2 = fmt(new Date(today.getTime() + 2*86400000));
    const dm1= fmt(new Date(today.getTime() - 86400000));

    set('sigch_citas', [
      { id:'c1', idPaciente:'p1', idPsicologo:'u3', fecha:d0,   hora:'09:00', duracion:50, estado:'programada', motivo:'Sesión de seguimiento ansiedad', notas:'',      creado:dm1 },
      { id:'c2', idPaciente:'p2', idPsicologo:'u3', fecha:d0,   hora:'10:00', duracion:50, estado:'programada', motivo:'Evaluación inicial depresión',   notas:'',      creado:dm1 },
      { id:'c3', idPaciente:'p3', idPsicologo:'u4', fecha:d0,   hora:'11:00', duracion:50, estado:'programada', motivo:'Neuropsicología - evaluación',   notas:'',      creado:dm1 },
      { id:'c4', idPaciente:'p4', idPsicologo:'u3', fecha:d1,   hora:'09:00', duracion:50, estado:'programada', motivo:'Terapia estrés laboral',         notas:'',      creado:d0   },
      { id:'c5', idPaciente:'p5', idPsicologo:'u3', fecha:d2,   hora:'10:30', duracion:50, estado:'programada', motivo:'Trabajo de duelo',               notas:'',      creado:d0   },
      { id:'c6', idPaciente:'p1', idPsicologo:'u3', fecha:dm1,  hora:'09:00', duracion:50, estado:'realizada',  motivo:'Primer contacto',                notas:'Paciente receptiva, buen inicio', creado:dm1 },
    ]);

    set('sigch_historiales', [
      { id:'h1', idPaciente:'p1', idPsicologo:'u3', fecha:dm1, sesion:1, diagnostico:'Trastorno de Ansiedad Generalizada (TAG)', hipotesis:'Posible base en dinámica familiar y exigencias laborales', tratamiento:'TCC - reestructuración cognitiva', tecnicas:'Psicoeducación, registro de pensamientos automáticos', observaciones:'Paciente muy motivada, buen insight.', estadoEmocional:'4', avances:'Reconoce sus disparadores de ansiedad', cambios:'Disminución leve de síntomas somáticos', archivos:[], creado:dm1 },
      { id:'h2', idPaciente:'p2', idPsicologo:'u3', fecha:dm1, sesion:1, diagnostico:'Episodio depresivo leve (F32.0)',           hipotesis:'Relacionado con cambio de trabajo y aislamiento social', tratamiento:'TCC + activación conductual', tecnicas:'Programación de actividades, registro de humor', observaciones:'Paciente con poca energía pero colaborativo.',  estadoEmocional:'3', avances:'Acepta el diagnóstico', cambios:'Ninguno aún - primera sesión', archivos:[], creado:dm1 },
    ]);

    set('sigch_auditoria', []);
    set('sigch_sesion', null);
    set('sigch_intentos', {});
    set('sigch_seeded', true);
  }

  seed();

  /* ─── auth ─────────────────────────────────────────────────────────────── */
  const Auth = {
    login(email, password) {
      const intentos = get('sigch_intentos') || {};
      const key = email.toLowerCase();
      const bloqueo = intentos[key];
      if (bloqueo && bloqueo.hasta > Date.now()) {
        const mins = Math.ceil((bloqueo.hasta - Date.now()) / 60000);
        return { ok: false, error: `Cuenta bloqueada. Intenta en ${mins} min.` };
      }
      const users = get('sigch_users') || [];
      const user = users.find(u => u.email === email && u.password === password && u.activo);
      if (!user) {
        const count = (bloqueo?.count || 0) + 1;
        const hasta  = count >= 3 ? Date.now() + 15 * 60000 : 0;
        intentos[key] = { count, hasta };
        set('sigch_intentos', intentos);
        const restantes = 3 - count;
        if (count >= 3) return { ok: false, error: 'Cuenta bloqueada por 15 minutos.' };
        return { ok: false, error: `Credenciales incorrectas. ${restantes} intento(s) restante(s).` };
      }
      delete intentos[key];
      set('sigch_intentos', intentos);
      const sesion = { userId: user.id, inicio: Date.now(), expira: Date.now() + 8*3600000 };
      set('sigch_sesion', sesion);
      Auth.log(user.id, 'LOGIN', 'Inicio de sesión exitoso');
      return { ok: true, user };
    },
    logout() {
      const s = get('sigch_sesion');
      if (s) Auth.log(s.userId, 'LOGOUT', 'Cierre de sesión');
      set('sigch_sesion', null);
    },
    current() {
      const s = get('sigch_sesion');
      if (!s || Date.now() > s.expira) return null;
      const users = get('sigch_users') || [];
      return users.find(u => u.id === s.userId) || null;
    },
    resetActivity() {
      const s = get('sigch_sesion');
      if (s) { s.expira = Date.now() + 8*3600000; set('sigch_sesion', s); }
    },
    log(userId, accion, detalle) {
      const logs = get('sigch_auditoria') || [];
      logs.unshift({ id:'a'+Date.now(), userId, accion, detalle, fecha: new Date().toISOString(), ip:'192.168.1.' + Math.floor(Math.random()*50+10) });
      set('sigch_auditoria', logs.slice(0, 200));
    },
  };

  /* ─── CRUD helpers ─────────────────────────────────────────────────────── */
  const uid = () => '_' + Math.random().toString(36).slice(2, 9);
  const now = () => new Date().toISOString().split('T')[0];

  const Usuarios = {
    all()        { return get('sigch_users') || []; },
    activos()    { return Usuarios.all().filter(u => u.activo); },
    psicologos() { return Usuarios.activos().filter(u => u.rol === 'psicologo'); },
    get(id)      { return Usuarios.all().find(u => u.id === id); },
    save(data) {
      const all = Usuarios.all();
      const idx = all.findIndex(u => u.id === data.id);
      if (idx >= 0) { all[idx] = { ...all[idx], ...data }; }
      else { data.id = uid(); data.creado = now(); all.push(data); }
      set('sigch_users', all);
      return data;
    },
    baja(id) { Usuarios.save({ id, activo: false }); },
  };

  const Pacientes = {
    all()     { return get('sigch_pacientes') || []; },
    activos() { return Pacientes.all().filter(p => p.activo); },
    get(id)   { return Pacientes.all().find(p => p.id === id); },
    save(data) {
      const all = Pacientes.all();
      const idx = all.findIndex(p => p.id === data.id);
      if (idx >= 0) { all[idx] = { ...all[idx], ...data }; }
      else { data.id = uid(); data.creado = now(); all.push(data); }
      set('sigch_pacientes', all);
      return data;
    },
    baja(id) { Pacientes.save({ id, activo: false }); },
  };

  const Citas = {
    all()       { return get('sigch_citas') || []; },
    activas()   { return Citas.all().filter(c => c.estado !== 'cancelada'); },
    get(id)     { return Citas.all().find(c => c.id === id); },
    hoy()       { const h = now(); return Citas.all().filter(c => c.fecha === h && c.estado !== 'cancelada'); },
    save(data) {
      const all = Citas.all();
      const idx = all.findIndex(c => c.id === data.id);
      // conflict check
      if (!data.id || idx < 0) {
        const conflict = all.find(c =>
          c.id !== data.id &&
          c.idPsicologo === data.idPsicologo &&
          c.fecha === data.fecha &&
          c.hora === data.hora &&
          c.estado !== 'cancelada'
        );
        if (conflict) return { ok: false, error: 'El profesional ya tiene una cita en ese horario.' };
        data.id = uid(); data.creado = now(); all.push(data);
      } else {
        all[idx] = { ...all[idx], ...data };
      }
      set('sigch_citas', all);
      return { ok: true, data };
    },
    cancelar(id) {
      const all = Citas.all();
      const idx = all.findIndex(c => c.id === id);
      if (idx >= 0) { all[idx].estado = 'cancelada'; set('sigch_citas', all); }
    },
    realizarCita(id) {
      const all = Citas.all();
      const idx = all.findIndex(c => c.id === id);
      if (idx >= 0) { all[idx].estado = 'realizada'; set('sigch_citas', all); }
    },
  };

  const Historiales = {
    all()             { return get('sigch_historiales') || []; },
    dePaciente(pid)   { return Historiales.all().filter(h => h.idPaciente === pid).sort((a,b)=> b.fecha.localeCompare(a.fecha)); },
    dePsicologo(uid)  { return Historiales.all().filter(h => h.idPsicologo === uid); },
    get(id)           { return Historiales.all().find(h => h.id === id); },
    save(data) {
      const all = Historiales.all();
      const idx = all.findIndex(h => h.id === data.id);
      if (idx >= 0) { all[idx] = { ...all[idx], ...data }; }
      else {
        const sesiones = Historiales.dePaciente(data.idPaciente);
        data.id = uid(); data.creado = now();
        data.sesion = sesiones.length + 1;
        all.push(data);
      }
      set('sigch_historiales', all);
      return data;
    },
  };

  const Auditoria = {
    all() { return get('sigch_auditoria') || []; },
  };

  return { Auth, Usuarios, Pacientes, Citas, Historiales, Auditoria, uid, now };
})();
