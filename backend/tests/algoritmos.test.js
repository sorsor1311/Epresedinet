/** Pruebas unitarias de los algoritmos del sistema (no requieren base de datos). Ejecutar: npm test */
const test = require('node:test');
const assert = require('node:assert/strict');
const { elegirAsesor, interpretarFechaHora, aMinutos, aHora, sumarDias } = require('../src/services/agendaService');
const { puntuar, sinAcentos } = require('../src/services/catalogoService');

const horarios = [
  { fk_agente: 1, nombre: 'Ana', hora_inicio: '08:00:00', hora_fin: '12:00:00' },
  { fk_agente: 2, nombre: 'Luis', hora_inicio: '08:00:00', hora_fin: '12:00:00' },
  { fk_agente: 3, nombre: 'Marta', hora_inicio: '14:00:00', hora_fin: '18:00:00' }
];
const ctx = (ocupados = []) => ({ fecha: '2026-11-16', horarios, ocupados });

test('asigna al asesor con menos citas ese día (balanceo de carga)', () => {
  const c = ctx([{ fk_agente: 1, inicio: '2026-11-16 08:00:00' }, { fk_agente: 1, inicio: '2026-11-16 10:00:00' }, { fk_agente: 2, inicio: '2026-11-16 08:00:00' }]);
  assert.equal(elegirAsesor(c, '11:00'), 2);
});
test('a igual carga diaria desempata por carga semanal y luego por id', () => {
  assert.equal(elegirAsesor(ctx(), '09:00'), 1);
  assert.equal(elegirAsesor(ctx([{ fk_agente: 1, inicio: '2026-11-13 09:00:00' }]), '09:00'), 2);
});
test('no asigna a quien tiene una cita que se solapa (duración 60 min)', () => {
  const c = ctx([{ fk_agente: 1, inicio: '2026-11-16 09:00:00' }, { fk_agente: 2, inicio: '2026-11-16 09:30:00' }]);
  assert.equal(elegirAsesor(c, '09:30'), null);
  assert.equal(elegirAsesor(c, '10:30'), 1);
});
test('la cita debe caber completa dentro de la franja del asesor', () => {
  assert.equal(elegirAsesor(ctx(), '11:00'), 1);      // 11:00-12:00 cabe
  assert.equal(elegirAsesor(ctx(), '11:30'), null);   // 11:30-12:30 no cabe
  assert.equal(elegirAsesor(ctx(), '13:00'), null);   // hora de almuerzo
  assert.equal(elegirAsesor(ctx(), '14:00'), 3);
});
test('al reprogramar se ignora la propia cita', () => {
  const c = ctx([{ fk_agente: 1, inicio: '2026-11-16 09:00:00', id_solicitud: 7 }]);
  assert.equal(elegirAsesor(c, '09:00', { excluirSolicitud: 7, soloAgente: 1 }), 1);
  assert.equal(elegirAsesor(c, '09:00', { soloAgente: 1 }), null);
});
test('interpreta fecha y hora en ambos formatos y rechaza basura', () => {
  assert.deepEqual(interpretarFechaHora('2026-11-16T09:30'), { fecha: '2026-11-16', hora: '09:30' });
  assert.deepEqual(interpretarFechaHora('2026-11-16', '09:30'), { fecha: '2026-11-16', hora: '09:30' });
  assert.throws(() => interpretarFechaHora('mañana', '9'), /inválida/);
});
test('utilidades de tiempo', () => {
  assert.equal(aMinutos('09:30'), 570); assert.equal(aHora(570), '09:30'); assert.equal(sumarDias('2026-12-30', 3), '2027-01-02');
});

test('compatibilidad: precio 50 + zona 30 + tipo 20', () => {
  const p = { zona: 'El Poblado', direccion: 'Calle 10', precio_venta: 380e6, precio_arrendamiento: 0 };
  assert.equal(puntuar(p, { modalidad: 'compra', presupuesto: 400e6, zona: 'poblado' }).compatibilidad, 100);
  assert.equal(puntuar(p, { modalidad: 'compra', presupuesto: 400e6, zona: 'Bello' }).compatibilidad, 70);
  const sobre = puntuar(p, { modalidad: 'compra', presupuesto: 350e6, zona: '', tolerancia: 1.15 });
  assert.equal(sobre.dentro_presupuesto, false); assert.ok(sobre.compatibilidad < 100 && sobre.compatibilidad >= 50);
});
test('la zona ignora tildes y mayúsculas', () => { assert.equal(sinAcentos('  MEDELLÍN '), 'medellin'); });
