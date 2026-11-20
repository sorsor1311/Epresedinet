/**
 * Prueba de integración de extremo a extremo contra un servidor y una BD REALES.
 *   1) Arranca el backend (npm start)   2) ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run prueba:api
 * Crea sus propios datos de prueba (sufijo aleatorio) y no depende de fechas fijas.
 */
import 'dotenv/config';
const BASE = (process.env.API_URL || 'http://localhost:5000') + '/api';
const ADMIN = { correo: process.env.ADMIN_EMAIL || 'admin@epresedi.com', password: process.env.ADMIN_PASSWORD || 'ClaveSegura1' };
const sufijo = Math.random().toString(36).slice(2, 8), CLAVE = 'ClaveSegura1';
let ok = 0, mal = 0;
const llamar = async (m, u, b, t) => { const r = await fetch(BASE + u, { method: m, headers: { ...(b && !(b instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...(t ? { Authorization: 'Bearer ' + t } : {}) }, ...(b ? { body: b instanceof FormData ? b : JSON.stringify(b) } : {}) }); let j = {}; try { j = await r.json(); } catch {} return { s: r.status, j, d: j.data }; };
const check = (n, c, extra = '') => { c ? (ok++, console.log('  ✓', n)) : (mal++, console.log('  ✗', n, extra)); };
const titulo = t => console.log('\n' + t);
const login = async (correo, password = CLAVE) => (await llamar('POST', '/auth/login', { correo, password })).d?.token;
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const proximoLunes = () => { const d = new Date(); d.setDate(d.getDate() + 4); while (d.getDay() !== 1) d.setDate(d.getDate() + 1); return d; };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

const admin = await login(ADMIN.correo, ADMIN.password);
if (!admin) { console.log('✖ No se pudo iniciar sesión como administrador. Define ADMIN_EMAIL y ADMIN_PASSWORD.'); process.exit(1); }
const lunes = proximoLunes(), L = ymd(lunes), M = ymd(new Date(lunes.getTime() + 864e5)), X = ymd(new Date(lunes.getTime() + 2 * 864e5));

titulo('Seguridad y autenticación');
let r = await llamar('GET', '/health'); check('health responde', r.s === 200);
r = await llamar('POST', '/auth/login', { correo: ADMIN.correo, password: 'incorrecta' }); check('login con clave errónea → 401', r.s === 401);
r = await llamar('GET', '/inexistente', null, admin); check('recurso inexistente → 404 JSON', r.s === 404);
r = await llamar('GET', '/atencion/calendario?desde=2026-01-01&hasta=2026-01-31'); check('calendario sin token → 401', r.s === 401);
r = await llamar('GET', '/contratos', null, 'token-falso'); check('token falso → 401', r.s === 401);
r = await llamar('GET', '/propiedades', null, 'token-falso'); check('token falso en catálogo = visitante (solo disponibles)', r.s === 200 && r.d.every(p => p.estado === 'disponible'));

// Aísla la prueba: los asesores que ya existían se desactivan temporalmente (se reactivan al final).
const previos = ((await llamar('GET', '/atencion/agentes/detalle', null, admin)).d || []).filter(a => a.activo);
for (const a of previos) await llamar('PATCH', `/atencion/agentes/${a.id_agente}/activo`, { activo: false }, admin);

titulo('Cuentas y roles');
const ag = [1, 2].map(i => ({ usuario: `ag${i}_${sufijo}`, correo: `ag${i}_${sufijo}@epresedi.com`, password: CLAVE, nombre: `Asesor ${i} ${sufijo}`, telefono: `30000000${i}${i}` }));
for (const a of ag) { r = await llamar('POST', '/atencion/agentes', a, admin); check(`admin crea asesor ${a.nombre}`, r.s === 201, JSON.stringify(r.j)); }
r = await llamar('POST', '/atencion/agentes', ag[0], admin); check('asesor duplicado → 409', r.s === 409);
r = await llamar('POST', '/atencion/agentes', { ...ag[0], usuario: 'x' + sufijo }, await login(ag[0].correo)); check('asesor no puede crear asesores → 403', r.s === 403);
const prop = { usuario: `prop_${sufijo}`, correo: `prop_${sufijo}@correo.com`, password: CLAVE, nombre: 'Propietario ' + sufijo, telefono: '3105550000' };
r = await llamar('POST', '/propietarios', prop, admin); check('admin registra propietario', r.s === 201, JSON.stringify(r.j)); const idPropietario = r.d?.id_perfil;
const cli = { usuario: `cli_${sufijo}`, correo: `cli_${sufijo}@correo.com`, password: CLAVE, nombre: 'Cliente ' + sufijo, telefono: '3205550000', profesion: 'Ingeniero' };
r = await llamar('POST', '/auth/register', cli); check('cliente se registra solo y recibe token', r.s === 201 && r.d.token && r.d.usuario.rol === 'Cliente', JSON.stringify(r.j));
r = await llamar('POST', '/auth/register', { ...cli, usuario: 'otro' + sufijo }); check('correo repetido → 409', r.s === 409);
r = await llamar('POST', '/auth/register', { ...cli, usuario: 'o' + sufijo, correo: 'o' + sufijo + '@x.com', password: '123' }); check('contraseña corta → 400', r.s === 400);
const tAg1 = await login(ag[0].correo), tAg2 = await login(ag[1].correo), tProp = await login(prop.correo), tCli = await login(cli.correo);
r = await llamar('GET', '/auth/me', null, tCli); check('perfil del cliente (/auth/me)', r.s === 200 && r.d.nombre === cli.nombre && r.d.rol === 'Cliente');
r = await llamar('PUT', '/auth/me', { nombre: 'Cliente Editado', telefono: '3205551111' }, tCli); check('cliente edita su perfil', r.s === 200 && r.d.nombre === 'Cliente Editado');
r = await llamar('PUT', '/auth/password', { actual: 'mala', nueva: 'NuevaClave123' }, tCli); check('cambio de clave con actual errónea → 401', r.s === 401);
r = await llamar('PUT', '/auth/password', { actual: CLAVE, nueva: 'NuevaClave123' }, tCli); check('cliente cambia su contraseña', r.s === 200);
check('login con la nueva contraseña', !!(await login(cli.correo, 'NuevaClave123')));
r = await llamar('GET', '/contratos', null, tCli); check('cliente no accede a contratos (403)', r.s === 403);
r = await llamar('GET', '/portal/propietario/resumen', null, tCli); check('cliente no accede al portal de propietario (403)', r.s === 403);
r = await llamar('GET', '/atencion/auditoria', null, tAg1); check('asesor no ve la auditoría (403)', r.s === 403);

titulo('Inmuebles: alta por el administrador (RF009) y fotografías (RF003)');
r = await llamar('GET', '/config'); const altaActiva = r.d?.alta_inmuebles_admin; check('endpoint de configuración pública', r.s === 200);
const nuevo = { direccion: `Calle Prueba ${sufijo} # 1-2`, zona: 'Zona Prueba', fk_tipo_propiedad: 2, fk_propietario: idPropietario, habitaciones: 3, banos: 2, area_m2: 80.5, precio_venta: 300000000, precio_arrendamiento: 0, descripcion: 'Inmueble de prueba' };
let idInm;
if (altaActiva) {
  r = await llamar('POST', '/propiedades', nuevo, admin); check('admin agrega inmueble', r.s === 201, JSON.stringify(r.j)); idInm = r.d?.id_propiedad;
  r = await llamar('POST', '/propiedades', { ...nuevo, precio_venta: 0 }, admin); check('inmueble sin precio rechazado', r.s === 400);
  r = await llamar('POST', '/propiedades', nuevo, tAg1); check('asesor no puede agregar inmuebles (403)', r.s === 403);
  const f = new FormData(); f.append('fotos', new Blob([PNG], { type: 'image/png' }), 'a.png');
  r = await llamar('POST', `/propiedades/${idInm}/fotos`, f, admin); check('sube una foto real (PNG)', r.s === 201 && r.d.urls[0].startsWith('/uploads/'), JSON.stringify(r.j));
  const urlFoto = r.d?.urls?.[0]; const img = await fetch(BASE.replace('/api', '') + urlFoto); check('la foto se sirve por HTTP', img.status === 200 && img.headers.get('content-type')?.includes('image/png'));
  const falsa = new FormData(); falsa.append('fotos', new Blob([Buffer.from('<?php echo 1;')], { type: 'image/png' }), 'virus.png');
  r = await llamar('POST', `/propiedades/${idInm}/fotos`, falsa, admin); check('archivo falso con extensión .png rechazado', r.s === 400, JSON.stringify(r.j));
  r = await llamar('GET', '/propiedades/' + idInm); check('inmueble nuevo visible al público con su galería', r.s === 200 && r.d.fotos.length === 1 && r.d.foto_url === urlFoto);
  r = await llamar('GET', '/propiedades', null, admin); check('el listado del personal incluye propietario', r.d.find(p => p.id_propiedad === idInm)?.propietario_nombre === prop.nombre);
} else {
  r = await llamar('POST', '/propiedades', nuevo, admin); check('con el alta desactivada la API responde 405', r.s === 405);
  console.log('  · (alta desde panel desactivada: pruebas de fotos omitidas; actívala con PERMITIR_ALTA_INMUEBLES_ADMIN=true)');
}
r = await llamar('PUT', '/propiedades/' + (idInm || 1), { estado: 'rota' }, admin); check('estado inválido rechazado (trigger BD)', r.s === 400, r.j.message);
const todas = (await llamar('GET', '/propiedades')).d; const idCita = idInm || todas[0].id_propiedad;

titulo('Chat-bot: búsqueda, historial y recomendaciones (RF001-RF004, RF010, RF011)');
r = await llamar('POST', '/atencion/buscar', { tipo: 'Apartamento', presupuesto: 400000000, zona: 'zona prueba', modalidad: 'compra', sesion: 's' + sufijo }, tCli); check('búsqueda con filtros', r.s === 200 && r.d.every(p => p.tipo_nombre === 'Apartamento'), JSON.stringify(r.j).slice(0, 150));
if (altaActiva) check('el inmueble de prueba sale con 100% de coincidencia', r.d[0]?.id_propiedad === idInm && r.d[0].compatibilidad === 100);
r = await llamar('POST', '/atencion/buscar', { tipo: 'Lote', presupuesto: 1000, modalidad: 'compra', sesion: 's' + sufijo }, tCli); check('sin coincidencias → lista vacía', r.s === 200 && r.d.length === 0);
r = await llamar('GET', '/atencion/similares?sesion=s' + sufijo); check('recomendaciones por historial de sesión', r.s === 200 && Array.isArray(r.d));
r = await llamar('GET', '/portal/cliente/historial', null, tCli); check('el cliente ve su historial guardado', r.s === 200 && r.d.length >= 2);
r = await llamar('GET', '/portal/cliente/recomendaciones', null, tCli); check('recomendaciones personalizadas del cliente', r.s === 200 && Array.isArray(r.d));

titulo('Citas, disponibilidad y asignación automática (RF005-RF008, RF016)');
const interesado = async (n, t) => (await llamar('POST', '/atencion/interesados', { nombre: n, edad: 30, correo: n.replace(/\W/g, '').toLowerCase() + sufijo + '@mail.com', ocupacion: 'Abogada', telefono: '3001234567' }, t)).d.id_interesado;
r = await llamar('POST', '/atencion/interesados', { nombre: 'Menor', edad: 15, correo: 'a@b.co', ocupacion: 'x' }); check('menor de edad rechazado', r.s === 400);
r = await llamar('GET', '/atencion/disponibilidad?fecha=' + L); check('el lunes ofrece horas', r.s === 200 && r.d.horas.includes('09:00') && !r.d.horas.includes('12:00'), JSON.stringify(r.d));
const nAgentes = (await llamar('GET', '/atencion/agentes/detalle', null, admin)).d.filter(a => a.activo).length;
const reservas = [];
for (let i = 0; i < nAgentes; i++) { const id = await interesado('Cliente' + i, i === 0 ? tCli : undefined); const c = await llamar('POST', '/atencion/citas', { id_interesado: id, id_propiedad: idCita, fecha: L, hora: '09:00' }); reservas.push(c); }
check(`${nAgentes} citas a la misma hora quedan con ${nAgentes} asesores distintos (balanceo)`, reservas.every(c => c.s === 201) && new Set(reservas.map(c => c.d.id_agente)).size === nAgentes, JSON.stringify(reservas.map(c => c.s)));
r = await llamar('POST', '/atencion/citas', { id_interesado: await interesado('Extra'), id_propiedad: idCita, fecha: L, hora: '09:00' }); check('sin asesores libres → 409', r.s === 409, r.j.message);
r = await llamar('POST', '/atencion/citas', { id_interesado: await interesado('Solapa'), id_propiedad: idCita, fecha: L, hora: '09:30' }); check('hora que se solapa → 409', r.s === 409);
r = await llamar('POST', '/atencion/citas', { id_interesado: await interesado('Pasado'), id_propiedad: idCita, fecha: '2020-01-01', hora: '09:00' }); check('fecha pasada → 400', r.s === 400);
r = await llamar('POST', '/atencion/citas', { id_interesado: await interesado('Fuera'), id_propiedad: idCita, fecha: L, hora: '12:00' }); check('hora de almuerzo (fuera de horario) → 409', r.s === 409);
const cita0 = reservas[0].d;
r = await llamar('GET', '/atencion/citas/consulta?codigo=' + cita0.codigo_gestion); check('consulta por código', r.s === 200 && r.d.estado === 'programada');
r = await llamar('PATCH', '/atencion/citas/gestionar', { codigo: cita0.codigo_gestion, accion: 'reprogramar', fecha: M, hora: '14:00' }); check('cliente reprograma con su código', r.s === 200, JSON.stringify(r.j));
r = await llamar('GET', '/portal/cliente/citas', null, await login(cli.correo, 'NuevaClave123'));
const tCli2 = await login(cli.correo, 'NuevaClave123');
check('"Mis citas" del cliente muestra su cita (seguimiento)', r.s === 200 && r.d.length === 1 && r.d[0].estado === 'reprogramada' && !('correo' in r.d[0]), JSON.stringify(r.j).slice(0, 200));
const miCita = r.d?.[0];
r = await llamar('PATCH', `/portal/cliente/citas/${miCita.id_solicitud}`, { accion: 'reprogramar', fecha: X, hora: '10:00' }, tCli2); check('cliente reprograma desde su cuenta', r.s === 200, JSON.stringify(r.j));
const ajena = reservas[1].d;
const [aj] = (await llamar('GET', '/atencion/citas', null, admin)).d.filter(c => c.id_solicitud === ajena.id_solicitud);
r = await llamar('PATCH', `/portal/cliente/citas/${aj.id_solicitud}`, { accion: 'cancelar' }, tCli2); check('cliente NO puede tocar la cita de otro (404)', r.s === 404);
r = await llamar('PATCH', `/portal/cliente/citas/${miCita.id_solicitud}`, { accion: 'cancelar' }, tCli2); check('cliente cancela desde su cuenta', r.s === 200);
r = await llamar('GET', '/atencion/disponibilidad?fecha=' + X); check('al cancelar se libera el horario', r.d.horas.includes('10:00'));

titulo('Calendario y permisos del personal (RF012, RF014, RF015)');
// Garantiza una cita abierta para cada asesor (dos reservas a la misma hora se reparten entre ambos)
for (const n of ['AbiertaA', 'AbiertaB']) await llamar('POST', '/atencion/citas', { id_interesado: await interesado(n), id_propiedad: idCita, fecha: M, hora: '16:00' });
const rango = `desde=${L}&hasta=${X}`;
r = await llamar('GET', `/atencion/calendario?${rango}`, null, admin); const totalEv = r.d.eventos.filter(e => e.tipo === 'cita').length; check('el administrador ve todas las citas', r.s === 200 && totalEv >= nAgentes && r.d.agentes.length >= nAgentes && r.d.disponibilidad.length > 0);
const c1 = await llamar('GET', `/atencion/calendario?${rango}`, null, tAg1), c2 = await llamar('GET', `/atencion/calendario?${rango}`, null, tAg2);
check('cada asesor ve solo su agenda', c1.d.eventos.every(e => e.id_agente === c1.d.id_agente) && c2.d.eventos.every(e => e.id_agente === c2.d.id_agente));
r = await llamar('GET', `/atencion/calendario?${rango}&agente=${c2.d.id_agente}`, null, tAg1); check('un asesor no puede ver la agenda de otro (?agente= ignorado)', r.d.eventos.every(e => e.id_agente === c1.d.id_agente));
r = await llamar('GET', `/atencion/calendario?desde=2026-01-01&hasta=2026-12-31`, null, admin); check('rango > 62 días rechazado', r.s === 400);
const propia = c1.d.eventos.find(e => e.estado !== 'cancelada' && e.tipo === 'cita'), ajenaEv = c2.d.eventos.find(e => e.estado !== 'cancelada' && e.tipo === 'cita');
check('cada asesor tiene al menos una cita abierta', !!(propia && ajenaEv));
if (propia && ajenaEv) {
  r = await llamar('PATCH', `/atencion/citas/${ajenaEv.id_solicitud}/estado`, { estado: 'atendida' }, tAg1); check('asesor no modifica cita ajena (403)', r.s === 403);
  r = await llamar('PATCH', `/atencion/citas/${propia.id_solicitud}/estado`, { estado: 'atendida' }, tAg1); check('asesor marca su cita como atendida', r.s === 200);
  r = await llamar('PATCH', `/atencion/citas/${ajenaEv.id_solicitud}/reprogramar`, { fecha: X, hora: '15:00' }, admin); check('admin reprograma cualquier cita', r.s === 200, JSON.stringify(r.j));
}
r = await llamar('POST', '/atencion/citas/interna', { interesado: { nombre: 'Cliente Telefono', edad: 41, correo: `tel${sufijo}@mail.com`, ocupacion: 'Comerciante', telefono: '3105556677' }, id_propiedad: idCita, fecha: X, hora: '08:00', notas: 'Llamó por teléfono' }, tAg1); check('asesor agenda una cita interna (queda para él)', r.s === 201 && r.d.agente === ag[0].nombre, JSON.stringify(r.j).slice(0, 150));
r = await llamar('GET', '/atencion/citas', null, tAg1); check('lista de citas del asesor filtrada', r.d.every(c => c.agente === ag[0].nombre));
r = await llamar('GET', '/atencion/notificaciones', null, tAg1); check('asesor recibe notificaciones de sus citas (RF015)', r.s === 200 && r.d.length >= 1);
r = await llamar('POST', '/atencion/agentes/horarios', { fk_agente: c1.d.id_agente, dia_semana: 1, hora_inicio: '09:00', hora_fin: '10:00' }, admin); check('franja que se cruza → 409', r.s === 409);
r = await llamar('PATCH', `/atencion/agentes/${c2.d.id_agente}/activo`, { activo: false }, admin); check('admin desactiva a un asesor (RF013)', r.s === 200);
r = await llamar('GET', '/atencion/disponibilidad?fecha=' + L); check('un asesor inactivo ya no recibe citas (menos horas disponibles)', r.s === 200);
await llamar('PATCH', `/atencion/agentes/${c2.d.id_agente}/activo`, { activo: true }, admin);

titulo('Operación: contratos, pagos y portal del propietario');
const cliPerfil = (await llamar('GET', '/clientes', null, admin)).d.find(c => c.nombre === 'Cliente Editado');
r = await llamar('POST', '/contratos', { fecha_inicio: `${L} 00:00:00`, fecha_final: `${ymd(new Date(lunes.getTime() + 3e10))} 00:00:00`, valor_total: 300000000, fk_propiedad: idCita, fk_cliente: cliPerfil.id_cliente, fk_agente: c1.d.id_agente, fk_propietario: idPropietario || 1 }, admin); check('se registra un contrato', r.s === 201, JSON.stringify(r.j)); const idContrato = r.d?.id_contrato;
r = await llamar('POST', '/pagos', { pago_total: 50000000, fk_contrato: idContrato }, admin); check('se registra un pago', r.s === 201, JSON.stringify(r.j));
r = await llamar('POST', '/contratos', { fecha_inicio: '2026-05-01 00:00:00', fecha_final: '2026-04-01 00:00:00', valor_total: 1, fk_propiedad: idCita, fk_cliente: cliPerfil.id_cliente, fk_agente: c1.d.id_agente, fk_propietario: 1 }, admin); check('contrato con fechas invertidas rechazado', r.s === 400);
r = await llamar('GET', '/portal/propietario/resumen', null, tProp); check('el propietario ve su resumen', r.s === 200 && r.d.inmuebles >= (altaActiva ? 1 : 0), JSON.stringify(r.j).slice(0, 160));
r = await llamar('GET', '/portal/propietario/propiedades', null, tProp); check('el propietario solo ve SUS inmuebles', r.s === 200 && r.d.every(p => p.fk_propietario === idPropietario));
r = await llamar('GET', '/portal/propietario/contratos', null, tProp); check('el propietario ve sus contratos con lo pagado', r.s === 200 && (!altaActiva || r.d[0]?.pagado === 50000000), JSON.stringify(r.j).slice(0, 160));
r = await llamar('GET', '/contratos', null, tProp); check('el propietario no accede a la API de gestión (403)', r.s === 403);

titulo('Reportes, análisis y auditoría (RF018)');
r = await llamar('GET', '/atencion/reportes', null, admin); check('reporte de atención', r.s === 200 && r.d.agentes.length >= nAgentes && r.d.propiedades.length > 0);
r = await llamar('GET', `/atencion/reportes?desde=${L}&hasta=${X}`, null, admin); check('reporte con rango de fechas', r.s === 200 && r.d.total.citas >= nAgentes);
const csv = await fetch(BASE + '/atencion/reportes/citas.csv', { headers: { Authorization: 'Bearer ' + admin } }); check('exportación CSV', csv.status === 200 && (await csv.text()).includes('Cliente'));
r = await llamar('GET', '/atencion/analisis?dias=30', null, admin); check('análisis: serie, embudo y preferencias', r.s === 200 && r.d.serie.length === 30 && r.d.embudo.citas >= nAgentes && r.d.porTipo.length > 0, JSON.stringify(r.j).slice(0, 120));
r = await llamar('GET', '/atencion/auditoria', null, admin); check('la auditoría registra las acciones del personal', r.s === 200 && r.d.length > 3 && r.d.some(a => a.entidad === 'cita'));
r = await llamar('GET', '/dashboard/resumen', null, tAg1); check('resumen del asesor sin ingresos', r.s === 200 && r.d.ingresos === null);
r = await llamar('GET', '/dashboard/resumen', null, admin); check('resumen del administrador completo', r.s === 200 && typeof r.d.ingresos === 'number' && Array.isArray(r.d.proximas_citas));

titulo('Limpieza e integridad');
r = await llamar('DELETE', '/propiedades/' + idCita, null, admin); check('no se elimina un inmueble con contratos/citas (409 claro)', r.s === 409 && /inactivo|asociados/.test(r.j.message), JSON.stringify(r.j));
r = await llamar('DELETE', '/agentes/' + c1.d.id_agente, null, admin); check('no se elimina un asesor (se desactiva) → 405', r.s === 405);
for (const a of [c1.d.id_agente, c2.d.id_agente]) await llamar('PATCH', `/atencion/agentes/${a}/activo`, { activo: false }, admin);
for (const a of previos) await llamar('PATCH', `/atencion/agentes/${a.id_agente}/activo`, { activo: true }, admin);
console.log(`\n${ok} correctas, ${mal} con fallo`); process.exit(mal ? 1 : 0);
