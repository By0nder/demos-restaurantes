/* =====================================================================
   Datos de ejemplo + modelo de la obra.
   Montos, avances, personas y fechas son inventados. Las obras y las
   fotos son reales (de la web de BTS); el resto es de muestra.
   ===================================================================== */
'use strict';

const CLAVE = 'bts-portal-muestra-v1';
const VERSION_DATOS = 5;

const PERSONAS = {
  gerencia: { n: 'Gerencia general', corto: 'Gerencia', rol: 'Administrador', lado: 'bts' },
  carlos: { n: 'Ing. Carlos Huamán', corto: 'Ing. Huamán', rol: 'Residente de obra', lado: 'bts' },
  edwin: { n: 'Edwin Mamani', corto: 'Edwin', rol: 'Técnico de cableado y fibra', lado: 'bts', tec: true, sis: ['cab'] },
  jhon: { n: 'Jhon Quispe', corto: 'Jhon', rol: 'Técnico de CCTV', lado: 'bts', tec: true, sis: ['cctv', 'acc'] },
  luis: { n: 'Luis Condori', corto: 'Luis', rol: 'Técnico de comunicaciones', lado: 'bts', tec: true, sis: ['tel', 'per', 'lle'] },
  rosa: { n: 'Rosa Ccama', corto: 'Rosa', rol: 'Técnica de data center y BMS', lado: 'bts', tec: true, sis: ['dc', 'bms'] },
  rocio: { n: 'Ing. Rocío Paredes', corto: 'Supervisión', rol: 'Supervisión de obra', lado: 'cliente' },
  marco: { n: 'Ing. Marco Salas', corto: 'Ing. Salas', rol: 'Residente del Consorcio', lado: 'cliente' },
};
const persona = id => PERSONAS[id] || { n: id || 'Usuario', corto: id || 'Usuario', rol: '', lado: 'bts' };
const TECNICO_DEMO = 'edwin';

/* ---------- consultas al estado ---------- */
let S = null;  // estado de la muestra
const proy = id => S.proyectos.find(p => p.id === id);
const docPor = id => S.docs.find(d => d.id === id);
const obsPor = id => S.obs.find(o => o.id === id);
const partePor = id => S.partes.find(x => x.id === id);
const docsDe = pid => S.docs.filter(d => d.proy === pid);
const obsDe = pid => S.obs.filter(o => o.proy === pid);
const partesDe = pid => S.partes.filter(x => x.proy === pid);
const fotosDe = pid => S.fotos.filter(f => f.proy === pid);
const consultasDe = pid => S.consultas.filter(c => c.proy === pid);

/* ---------- modelo: avance programado vs real ---------- */
const pesoTotal = p => sum(p.sistemas, s => s.peso) || 1;
const planSistema = (s, w) => 100 * suave((w - s.v[0]) / Math.max(.5, s.v[1] - s.v[0]));
const planProyecto = (p, w) => sum(p.sistemas, s => s.peso * planSistema(s, w)) / pesoTotal(p);
const realProyecto = p => sum(p.sistemas, s => s.peso * clamp(s.real, 0, 100)) / pesoTotal(p);
const semanaHoy = p => (Date.now() - p.inicio) / SEMANA;
const finProyecto = p => laborable(sumarDias(p.inicio, p.semanas * 7 - 1), true);   // último día hábil del plazo
const semanaN = p => clamp(Math.floor(semanaHoy(p)) + 1, 0, 999);
const porIniciar = p => Date.now() < p.inicio;
/* etapa que se muestra como "actual": la más avanzada de las que están en curso con peso (25 % o más) */
function etapaPrincipal(p) {
  const et = p.etapas || {};
  const cursos = ETAPAS.filter(e => (et[e.k] || {}).e === 'curso');
  if (!cursos.length) { const ult = [...ETAPAS].reverse().find(e => (et[e.k] || {}).e === 'hecha'); return ult ? ult.k : 'ingenieria'; }
  const fuertes = cursos.filter(e => e.k === 'garantia' || (et[e.k].a || 0) >= 25);
  return (fuertes.length ? fuertes[fuertes.length - 1] : cursos[0]).k;
}
function avanceHoy(p) {
  const w = p.estado === 'cerrado' ? p.semanas : semanaHoy(p);
  const real = realProyecto(p), prog = p.estado === 'cerrado' ? 100 : planProyecto(p, w);
  return { real, prog, desvio: real - prog, w };
}
function generarHistoria(p) {
  const wFin = p.estado === 'cerrado' ? p.semanas : Math.floor(semanaHoy(p));
  const realHoy = realProyecto(p);
  const planFin = p.estado === 'cerrado' ? 100 : planProyecto(p, semanaHoy(p));
  const ratioFin = planFin > 0 ? realHoy / planFin : 1;
  const nudos = (p.perfilReal || [[0, 1]]).concat([[p.estado === 'cerrado' ? p.semanas : semanaHoy(p), ratioFin]]);
  const r = w => {
    for (let i = 1; i < nudos.length; i++) {
      const [w0, r0] = nudos[i - 1], [w1, r1] = nudos[i];
      if (w <= w1) return r0 + (r1 - r0) * clamp((w - w0) / Math.max(.01, w1 - w0), 0, 1);
    }
    return nudos[nudos.length - 1][1];
  };
  const serie = []; let prev = 0;
  for (let w = 0; w <= wFin; w++) {
    let v = planProyecto(p, w) * r(w);
    v = clamp(Math.max(prev, v), 0, realHoy);
    serie.push(Math.round(v * 100) / 100); prev = v;
  }
  if (p.estado === 'cerrado') serie[serie.length - 1] = 100;
  p.serieReal = serie;
}

/* ---------- modelo: dossier de cierre ---------- */
function estadoItem(it) {
  if (it.doc) { const d = docPor(it.doc); if (!d) return 'falta'; return d.estado === 'aprobado' ? 'listo' : d.estado === 'revision' ? 'revision' : 'falta'; }
  return it.estado || 'falta';
}
function dossierPct(p) {
  const items = p.dossier || [];
  const listos = items.filter(i => estadoItem(i) === 'listo').length;
  const revision = items.filter(i => estadoItem(i) === 'revision').length;
  return { listos, revision, total: items.length, faltan: items.length - listos, pct: items.length ? listos / items.length * 100 : 0 };
}
function origenItem(it) {
  if (it.doc) {
    const d = docPor(it.doc);
    if (d && d.estado === 'aprobado') return `Se agregó solo al aprobarse ${d.cod}, ${fCorta(d.aprobado || d.f)}`;
    if (d && d.estado === 'revision') return `${d.cod} espera la conformidad de la supervisión`;
  }
  return it.origen || '';
}

/* ---------- modelo: hitos de pago ---------- */
function reqsPara(nombre) {
  const n = nombre.toLowerCase();
  if (n.includes('adelanto')) return [{ t: 'Contrato firmado y carta fianza por el adelanto', ok: false, manual: true }];
  if (n.includes('ingenier')) return [{ t: 'Fichas técnicas aprobadas por la supervisión', calc: 'fichas' }];
  if (n.includes('equipos')) return [{ t: 'Acta de aprobación de materiales', item: 'act-materiales' }];
  if (n.includes('50')) return [{ t: 'Avance físico de 50 % o más', calc: 'avance50' }];
  if (n.includes('instalaci')) return [{ t: 'Avance físico al 100 %', calc: 'avance100' }, { t: 'Acta de término de instalación', item: 'act-termino' }];
  if (n.includes('protocolos aprobados')) return [{ t: 'Protocolos de prueba aprobados', calc: 'protocolos' }];
  return [{ t: 'Dossier de cierre completo', calc: 'dossier' }, { t: 'Acta de entrega y conformidad', item: 'act-entrega' }];
}
function evalReq(p, r) {
  if (r.ok !== undefined) return { ok: !!r.ok, det: r.det || '' };
  if (r.doc) { const d = docPor(r.doc); return { ok: !!d && d.estado === 'aprobado', det: d && d.estado === 'revision' ? 'en revisión de la supervisión' : '', doc: r.doc }; }
  if (r.item) { const it = (p.dossier || []).find(i => i.id === r.item); return { ok: !!it && estadoItem(it) === 'listo', det: '', item: r.item }; }
  const porCat = cat => { const its = (p.dossier || []).filter(i => i.cat === cat); const ok = its.filter(i => estadoItem(i) === 'listo').length; return { ok: its.length > 0 && ok === its.length, det: `${ok} de ${its.length}` }; };
  if (r.cat) return porCat(r.cat);
  switch (r.calc) {
    case 'avance50': { const v = realProyecto(p); return { ok: v >= 50, det: 'hoy ' + pct(v) }; }
    case 'avance100': { const v = realProyecto(p); return { ok: v >= 99.95, det: 'hoy ' + pct(v) }; }
    case 'protocolos': return porCat('protocolos');
    case 'fichas': return porCat('fichas');
    case 'dossier': { const d = dossierPct(p); return { ok: d.total > 0 && d.listos === d.total, det: `${d.listos} de ${d.total} documentos` }; }
  }
  return { ok: false, det: '' };
}
const montoPago = (p, g) => Math.round(p.monto * g.pct / 100);
function resumenCobros(p) {
  const r = { pagado: 0, aprobado: 0, revision: 0, detenido: 0, pendiente: 0 };
  (p.pagos || []).forEach(g => { r[g.estado] = (r[g.estado] || 0) + montoPago(p, g); });
  const ejecutado = p.monto * realProyecto(p) / 100;
  /* trabajo hecho que todavía no entra en ningún hito (sin contar lo que ya está en revisión, listo o detenido) */
  r.sinCobrar = Math.max(0, ejecutado - r.pagado - r.aprobado - r.revision - r.detenido);
  return r;
}
/* revisa si algún hito ya cumple todo lo que pide; devuelve los que cambiaron */
function actualizarPagos(p, quien) {
  const cambiaron = [];
  (p.pagos || []).forEach(g => {
    if (!['revision', 'pendiente', 'detenido'].includes(g.estado)) return;
    const reqs = g.req || [];
    if (reqs.length && reqs.every(r => evalReq(p, r).ok)) {
      g.estado = 'aprobado'; g.aprobado = Date.now(); cambiaron.push(g);
      registrar(p.id, 'sistema', `Hito de pago ${g.n} listo para facturar (${soles(montoPago(p, g))}): se cumplió lo último que pedía`, 'pago');
    }
  });
  return cambiaron;
}

/* ---------- registro de actividad y correos simulados ---------- */
function registrar(pid, quien, texto, tipo = 'nota', extra = {}) {
  S.actividad.unshift({ id: uid('a'), proy: pid, ts: Date.now(), quien, texto, tipo, ...extra });
  if (S.actividad.length > 300) S.actividad.length = 300;
}
function correoSimulado(pid, para, asunto, resumen) {
  S.correos.unshift({ id: uid('m'), proy: pid, ts: Date.now(), para, asunto, resumen });
}

/* ---------- textos con fechas que se recalculan ({d:+6} = 6 días después de la base) ---------- */
function conFechas(txt, base = HOY) {
  return String(txt || '').replace(/\{d:([+-]?\d+)\}/g, (_, n) => fCorta(sumarDias(base, +n))).replace(/\{hito:(\w+):(\w+)\}/g, (_, pid, hid) => {
    const p = proy(pid); const h = p && (p.hitos || []).find(x => x.id === hid); return h ? fLarga(h.f) : '';
  });
}

/* ---------- dossier armado desde la plantilla (proyectos nuevos y los de ejemplo) ---------- */
function dossierDesdeSistemas(sistemas) {
  const items = []; let n = 0;
  const add = (cat, nombre, extra = {}) => items.push({ id: extra.id || cat + '-' + (++n), cat, n: nombre, estado: 'falta', ...extra });
  sistemas.forEach(s => (PROTOCOLOS[s.k] || []).forEach(pr => add('protocolos', `${pr} — ${SIS[s.k].c}`, { sis: s.k })));
  if (sistemas.length >= 3) add('protocolos', 'Prueba integral de sistemas');
  sistemas.forEach(s => add('asbuilt', `Planos as-built — ${SIS[s.k].c}`, { sis: s.k }));
  sistemas.forEach(s => add('fichas', `Ficha técnica aprobada — ${SIS[s.k].c}`, { sis: s.k }));
  sistemas.forEach(s => add('garantias', `Certificado de garantía del fabricante — ${SIS[s.k].c}`, { sis: s.k }));
  sistemas.forEach(s => add('manuales', `Manual de operación y mantenimiento — ${SIS[s.k].c}`, { sis: s.k }));
  [['act-inicio', 'Acta de inicio de obra'], ['act-materiales', 'Acta de aprobación de materiales'], ['act-termino', 'Acta de término de instalación'], ['act-pruebas', 'Acta de pruebas y puesta en marcha'], ['act-capacitacion', 'Acta de capacitación'], ['act-entrega', 'Acta de entrega y conformidad']]
    .forEach(([id, nom]) => add('actas', nom, { id }));
  add('capacitacion', 'Constancia de capacitación — operadores del cliente');
  add('capacitacion', 'Constancia de capacitación — personal de mantenimiento');
  add('calibracion', 'Certificado de calibración — certificador de cableado');
  add('calibracion', 'Certificado de calibración — equipos de medición');
  return items;
}
const ventanaSemanas = (sem, f) => [Math.round(f[0] * sem * 10) / 10, Math.round(f[1] * sem * 10) / 10];
function hitosDesdePlantilla(p) {
  const s = p.semanas, w = f => laborable(sumarDias(p.inicio, Math.round(f * s * 7)) + 9 * HORA);
  return [
    { id: 'h1', t: 'Ingeniería de detalle aprobada', f: w(.14), tipo: 'documento' },
    { id: 'h2', t: 'Aprobación de fichas técnicas y materiales', f: w(.24), tipo: 'documento' },
    { id: 'h3', t: 'Llegada a obra de los equipos principales', f: w(.45), tipo: 'suministro' },
    { id: 'h4', t: 'Inicio de pruebas y protocolos', f: w(.7), tipo: 'prueba' },
    { id: 'h5', t: 'Capacitación al personal del cliente', f: w(.93), tipo: 'entrega' },
    { id: 'h6', t: 'Entrega de obra y acta de conformidad', f: finProyecto(p), tipo: 'entrega' },
  ];
}

/* =====================================================================
   SEMILLA: los cuatro proyectos de la cartera
   ===================================================================== */
function crearSemilla() {
  const st = { v: VERSION_DATOS, ancla: HOY, proyectos: [], partes: [], obs: [], docs: [], fotos: [], consultas: [], actividad: [], correos: [], tickets: [], imgs: {}, ui: { pista: true, tourVisto: false }, seq: { parte: 411, obs: 24, ticket: 31, consulta: 3, proy: 12, doc: 40 } };
  S = st;
  const L = lunesDe(HOY);

  /* ------------------------------------------------------------ 1. Hospital del Altiplano */
  /* inicio anclado a hoy (no al lunes): así el desvío es el mismo cualquier día que se abra */
  const ai = dia(-164, 0, 0);
  const yy = ts => String(new Date(ts).getFullYear()).slice(2);
  const alt = {
    id: 'altiplano', codigo: `BTS-${yy(ai)}-007`, nombre: 'Hospital del Altiplano', alcance: 'Sistemas especiales y de comunicaciones',
    cliente: 'Consorcio Hospital Altiplano', entidad: 'EsSalud', ubicacion: 'Puno', plantilla: 'hospital', monto: 1180000, rolBts: 'Subcontratista',
    inicio: ai, semanas: 40, estado: 'ejecucion', foto: 'alt-aerea', fotoF: habilAtras(5, 11, 20), residente: 'carlos',
    sistemas: [
      { k: 'cab', peso: 342000, real: 76, v: [4, 34], etapa: 'instalacion', det: '1,240 puntos de red · 288 hilos de fibra', med: { puntos: 1240, m: 2600, hilos: 288 } },
      { k: 'cctv', peso: 212400, real: 55, v: [8, 36], etapa: 'instalacion', det: '186 cámaras · 2 servidores de video', med: { puntos: 186, cámaras: 186 } },
      { k: 'lle', peso: 165200, real: 31, v: [9, 37], etapa: 'suministro', det: '212 camas · 9 estaciones de enfermería', med: { camas: 212, estaciones: 9 }, nota: { t: 'alerta', x: 'Equipos en la aduana del Callao. Llegan a obra el {hito:altiplano:h2}; el atraso se recupera con doble turno por dos semanas.' } },
      { k: 'tel', peso: 94400, real: 48, v: [10, 37], etapa: 'instalacion', det: '420 anexos IP', med: { anexos: 420 } },
      { k: 'per', peso: 70800, real: 52, v: [10, 35], etapa: 'instalacion', det: '310 parlantes · 38 zonas de audio', med: { parlantes: 310, zonas: 38 } },
      { k: 'bms', peso: 141600, real: 43, v: [11, 38], etapa: 'instalacion', det: '24 controladores · 2,100 puntos de control', med: { controladores: 24, puntos: 2100 } },
      { k: 'dc', peso: 153600, real: 76, v: [6, 32], etapa: 'pruebas', det: '2 cuartos de datos · 14 gabinetes', med: { gabinetes: 14 } },
    ],
    etapas: { ingenieria: { e: 'hecha' }, aprobacion: { e: 'hecha' }, suministro: { e: 'curso', a: 92 }, instalacion: { e: 'curso', a: 61 }, pruebas: { e: 'curso', a: 14 }, entrega: { e: 'pendiente' }, garantia: { e: 'pendiente' } },
    perfilReal: [[0, 1], [5, 1], [8, 1.05], [12, 1.03], [16, 1.0], [19, .985]],
    avisos: true, garantiaMeses: 24,
  };
  alt.hitos = [
    { id: 'h1', t: 'Certificación de cableado del Bloque B, piso 2', f: laborable(dia(2, 9)), tipo: 'prueba', sis: 'cab' },
    { id: 'h2', t: 'Llegada a obra de los equipos de llamada de enfermeras', f: laborable(dia(6, 10)), tipo: 'suministro', sis: 'lle', antes: laborable(dia(-12, 10), true) },
    { id: 'h3', t: 'Pruebas de aceptación de CCTV, Bloque A', f: laborable(dia(13, 9)), tipo: 'prueba', sis: 'cctv' },
    { id: 'h4', t: 'Presentación de la valorización n.º 5', f: laborable(dia(20, 9)), tipo: 'pago' },
    { id: 'h5', t: 'Inicio de pruebas integrales de sistemas', f: laborable(sumarSemanas(ai, 34) + 9 * HORA), tipo: 'prueba' },
    { id: 'h6', t: 'Capacitación al personal del hospital', f: laborable(sumarSemanas(ai, 37) + 9 * HORA), tipo: 'entrega' },
    { id: 'h7', t: 'Entrega de obra y acta de conformidad', f: finProyecto(alt), tipo: 'entrega' },
  ];
  alt.pagos = [
    { n: 1, t: 'Adelanto a la firma', pct: 15, estado: 'pagado', f: laborable(sumarDias(ai, 6), true) },
    { n: 2, t: 'Ingeniería de detalle y fichas aprobadas', pct: 10, estado: 'pagado', f: laborable(sumarSemanas(ai, 9), true) },
    { n: 3, t: 'Equipos y materiales en obra (primera entrega)', pct: 25, estado: 'pagado', f: laborable(sumarSemanas(ai, 17), true) },
    { n: 4, t: 'Avance de instalación al 50 %', pct: 15, estado: 'revision', f: habilAtras(4, 10), req: [{ t: 'Informe de valorización n.º 4 aprobado por el Consorcio', ok: true }, { t: 'Conformidad del protocolo PP-CAB-B1 (Bloque B, piso 1)', doc: 'd-pp-cab-b1' }, { t: 'Avance físico de 50 % o más', calc: 'avance50' }] },
    { n: 5, t: 'Instalación concluida', pct: 15, estado: 'pendiente', req: [{ t: 'Avance físico al 100 % en los 7 sistemas', calc: 'avance100' }, { t: 'Acta de término de instalación', item: 'act-termino' }] },
    { n: 6, t: 'Pruebas y protocolos aprobados', pct: 10, estado: 'pendiente', req: [{ t: 'Protocolos de prueba aprobados', calc: 'protocolos' }] },
    { n: 7, t: 'Entrega, dossier de cierre y conformidad', pct: 10, estado: 'pendiente', retiene: true, req: [{ t: 'Dossier de cierre completo', calc: 'dossier' }, { t: 'Constancias de capacitación', cat: 'capacitacion' }, { t: 'Acta de entrega y conformidad', item: 'act-entrega' }] },
  ];
  alt.usuarios = [
    { id: 'gerencia', estado: 'activo' }, { id: 'carlos', estado: 'activo' }, { id: 'edwin', estado: 'activo' }, { id: 'jhon', estado: 'activo' }, { id: 'luis', estado: 'activo' }, { id: 'rosa', estado: 'activo' },
    { id: 'rocio', estado: 'activo', desde: sumarDias(ai, 2) }, { id: 'marco', estado: 'activo', desde: sumarDias(ai, 2) },
    { id: 'u-ess', n: 'Jefatura de TI de la red asistencial', rol: 'Observador (EsSalud)', lado: 'cliente', estado: 'activo', permiso: 'Solo lectura', desde: sumarSemanas(ai, 6) },
  ];

  /* documentos del Altiplano */
  const Dc = (id, tipo, cod, n, extra) => st.docs.push({ id, proy: 'altiplano', tipo, cod, n, estado: 'aprobado', ...extra, f: laborable(extra.f, true) });
  Dc('d-pl-cab-01', 'plano', 'PL-CAB-01', 'Cableado estructurado — Bloque A', { rev: 'C', f: dia(-41, 16), lam: 8, sis: 'cab' });
  Dc('d-pl-cab-02', 'plano', 'PL-CAB-02', 'Cableado estructurado — Bloque B', { rev: 'B', f: dia(-33, 12), lam: 7, sis: 'cab' });
  Dc('d-pl-fo-01', 'plano', 'PL-FO-01', 'Backbone de fibra óptica', { rev: 'B', f: dia(-63, 11), lam: 3, sis: 'cab' });
  Dc('d-pl-cctv-01', 'plano', 'PL-CCTV-01', 'Ubicación de cámaras y cobertura', { rev: 'C', revAnt: 'B', f: habilAtras(3, 15, 10), lam: 9, sis: 'cctv', estado: 'revision', nota: 'Rev. C: cuatro cámaras más en UCI, a pedido de la supervisión.' });
  Dc('d-pl-lle-01', 'plano', 'PL-LLE-01', 'Llamada de enfermeras — hospitalización', { rev: 'A', f: dia(-76, 10), lam: 5, sis: 'lle' });
  Dc('d-pl-tel-01', 'plano', 'PL-TEL-01', 'Telefonía IP — distribución de anexos', { rev: 'A', f: dia(-70, 10), lam: 4, sis: 'tel' });
  Dc('d-pl-dc-01', 'plano', 'PL-DC-01', 'Cuartos de datos: planta y elevación de gabinetes', { rev: 'B', f: dia(-55, 10), lam: 4, sis: 'dc' });
  Dc('d-pl-bms-01', 'plano', 'PL-BMS-01', 'Arquitectura del BMS', { rev: 'A', f: dia(-68, 10), lam: 3, sis: 'bms' });
  Dc('d-pl-per-01', 'plano', 'PL-PER-01', 'Perifoneo y audio de evacuación por zonas', { rev: 'A', f: dia(-72, 10), lam: 4, sis: 'per' });
  Dc('d-ft-cab', 'ficha', 'FT-CAB-01', 'Cable U/FTP Cat 6A y conectividad', { marca: 'Siemon', f: dia(-135, 11), sis: 'cab' });
  Dc('d-ft-fo', 'ficha', 'FT-FO-01', 'Fibra óptica monomodo y ODF', { marca: 'Furukawa', f: dia(-135, 11), sis: 'cab' });
  Dc('d-ft-cctv1', 'ficha', 'FT-CCTV-01', 'Cámaras domo IP de 4 MP', { marca: 'Axis', f: dia(-131, 11), sis: 'cctv' });
  Dc('d-ft-cctv2', 'ficha', 'FT-CCTV-02', 'Software de video y servidores', { marca: 'Genetec · Dell', f: dia(-131, 11), sis: 'cctv' });
  Dc('d-ft-lle', 'ficha', 'FT-LLE-01', 'Sistema de llamada de enfermeras IP', { marca: 'Ibernex', f: dia(-127, 11), sis: 'lle' });
  Dc('d-ft-tel', 'ficha', 'FT-TEL-01', 'Teléfonos IP y central', { marca: 'Yealink', f: dia(-127, 11), sis: 'tel' });
  Dc('d-ft-per', 'ficha', 'FT-PER-01', 'Amplificadores y parlantes', { marca: 'Bosch', f: dia(-123, 11), sis: 'per' });
  Dc('d-ft-bms', 'ficha', 'FT-BMS-01', 'Controladores del BMS', { marca: 'Johnson Controls', f: dia(-123, 11), sis: 'bms' });
  Dc('d-ft-dc', 'ficha', 'FT-DC-01', 'Gabinetes de 42U, PDU y UPS', { marca: 'Panduit · APC', f: dia(-131, 11), sis: 'dc' });
  Dc('d-ac-inicio', 'acta', 'AC-001', 'Acta de inicio de obra', { f: sumarDias(ai, 1) });
  Dc('d-ac-mat1', 'acta', 'AC-004', 'Acta de aprobación de materiales n.º 1', { f: sumarSemanas(ai, 7) });
  Dc('d-ac-mat2', 'acta', 'AC-007', 'Acta de aprobación de materiales n.º 2', { f: sumarSemanas(ai, 10) });
  Dc('d-ac-23', 'acta', 'AC-031', 'Acta de reunión de coordinación n.º 23', { f: habilAtras(6, 12) });
  Dc('d-pp-cab-a1', 'protocolo', 'PP-CAB-A1', 'Certificación de cableado — Bloque A, piso 1', { res: '132 puntos · 132 pasan', f: dia(-52, 16), sis: 'cab' });
  Dc('d-pp-cab-a2', 'protocolo', 'PP-CAB-A2', 'Certificación de cableado — Bloque A, piso 2', { res: '128 puntos · 128 pasan', f: dia(-45, 16), sis: 'cab' });
  Dc('d-pp-cab-a3', 'protocolo', 'PP-CAB-A3', 'Certificación de cableado — Bloque A, piso 3', { res: '118 puntos · 118 pasan', f: dia(-38, 16), sis: 'cab' });
  Dc('d-pp-fo', 'protocolo', 'PP-FO-01', 'Prueba OTDR del backbone de fibra óptica', { res: '48 hilos · pérdidas dentro de norma', f: dia(-30, 16), sis: 'cab' });
  Dc('d-pp-dc-tierra', 'protocolo', 'PP-DC-01', 'Puesta a tierra de gabinetes', { res: '14 gabinetes · 2.1 Ω', f: dia(-14, 16), sis: 'dc' });
  Dc('d-pp-cab-b1', 'protocolo', 'PP-CAB-B1', 'Certificación de cableado — Bloque B, piso 1', { res: '120 puntos · 120 pasan', f: habilAtras(4, 17, 30), sis: 'cab', estado: 'revision', clave: true });
  Dc('d-val-04', 'informe', 'VAL-04', 'Informe de valorización n.º 4', { f: habilAtras(4, 10), nota: 'Aprobado por el Consorcio' });
  st.docs.filter(d => d.proy === 'altiplano' && d.estado === 'aprobado').forEach(d => { d.aprobado = laborable(d.f + 2 * DIA); });

  /* dossier del Altiplano (64 documentos; los que vienen de documentos aprobados se marcan solos) */
  const DI = (id, cat, n, extra = {}) => ({ id, cat, n, estado: 'falta', ...extra });
  alt.dossier = [
    DI('pp-cab-a1', 'protocolos', 'Certificación de cableado — Bloque A, piso 1', { doc: 'd-pp-cab-a1' }),
    DI('pp-cab-a2', 'protocolos', 'Certificación de cableado — Bloque A, piso 2', { doc: 'd-pp-cab-a2' }),
    DI('pp-cab-a3', 'protocolos', 'Certificación de cableado — Bloque A, piso 3', { doc: 'd-pp-cab-a3' }),
    DI('pp-cab-b1', 'protocolos', 'Certificación de cableado — Bloque B, piso 1', { doc: 'd-pp-cab-b1' }),
    DI('pp-cab-b2', 'protocolos', 'Certificación de cableado — Bloque B, piso 2'),
    DI('pp-cab-b3', 'protocolos', 'Certificación de cableado — Bloque B, piso 3'),
    DI('pp-fo', 'protocolos', 'Prueba OTDR del backbone de fibra óptica', { doc: 'd-pp-fo' }),
    DI('pp-cctv-1', 'protocolos', 'CCTV: imagen, enfoque y cobertura — Bloque A'),
    DI('pp-cctv-2', 'protocolos', 'CCTV: imagen, enfoque y cobertura — Bloque B'),
    DI('pp-cctv-3', 'protocolos', 'CCTV: grabación, retención y software de video'),
    DI('pp-lle-1', 'protocolos', 'Llamada de enfermeras: pulsadores de cama y baño'),
    DI('pp-lle-2', 'protocolos', 'Llamada de enfermeras: estaciones de enfermería'),
    DI('pp-lle-3', 'protocolos', 'Llamada de enfermeras: integración con telefonía'),
    DI('pp-tel-1', 'protocolos', 'Telefonía IP: anexos y troncales'),
    DI('pp-tel-2', 'protocolos', 'Telefonía IP: alimentación PoE'),
    DI('pp-per-1', 'protocolos', 'Perifoneo: niveles de audio por zona'),
    DI('pp-per-2', 'protocolos', 'Perifoneo: mensajes de evacuación'),
    DI('pp-bms-1', 'protocolos', 'BMS: puntos de control'),
    DI('pp-bms-2', 'protocolos', 'BMS: alarmas y tendencias'),
    DI('pp-dc-1', 'protocolos', 'Data center: puesta a tierra de gabinetes', { doc: 'd-pp-dc-tierra' }),
    DI('pp-dc-2', 'protocolos', 'Data center: UPS y climatización'),
    DI('pp-int', 'protocolos', 'Prueba integral de sistemas'),
    ...['cab', 'cctv', 'lle', 'tel', 'per', 'bms', 'dc'].map(k => DI('ab-' + k, 'asbuilt', `Planos as-built — ${SIS[k].c}`, { sis: k })),
    DI('ft-cab', 'fichas', 'Cable U/FTP Cat 6A y conectividad (Siemon)', { doc: 'd-ft-cab' }),
    DI('ft-fo', 'fichas', 'Fibra óptica monomodo y ODF (Furukawa)', { doc: 'd-ft-fo' }),
    DI('ft-cctv1', 'fichas', 'Cámaras domo IP de 4 MP (Axis)', { doc: 'd-ft-cctv1' }),
    DI('ft-cctv2', 'fichas', 'Software de video y servidores (Genetec · Dell)', { doc: 'd-ft-cctv2' }),
    DI('ft-lle', 'fichas', 'Llamada de enfermeras IP (Ibernex)', { doc: 'd-ft-lle' }),
    DI('ft-tel', 'fichas', 'Teléfonos IP y central (Yealink)', { doc: 'd-ft-tel' }),
    DI('ft-per', 'fichas', 'Amplificadores y parlantes (Bosch)', { doc: 'd-ft-per' }),
    DI('ft-bms', 'fichas', 'Controladores del BMS (Johnson Controls)', { doc: 'd-ft-bms' }),
    DI('ft-dc', 'fichas', 'Gabinetes, PDU y UPS (Panduit · APC)', { doc: 'd-ft-dc' }),
    DI('ga-cab', 'garantias', 'Garantía del sistema de cableado — Siemon, 25 años'),
    DI('ga-cctv', 'garantias', 'Garantía de cámaras y servidores — Axis · Dell'),
    DI('ga-lle', 'garantias', 'Garantía de llamada de enfermeras — Ibernex'),
    DI('ga-tel', 'garantias', 'Garantía de telefonía — Yealink'),
    DI('ga-per', 'garantias', 'Garantía de perifoneo — Bosch'),
    DI('ga-bms', 'garantias', 'Garantía del BMS — Johnson Controls'),
    DI('ga-dc', 'garantias', 'Garantía de gabinetes y UPS — Panduit · APC'),
    DI('ma-cab', 'manuales', 'Manual de operación y mantenimiento — Cableado y fibra'),
    DI('ma-cctv', 'manuales', 'Manual de operación y mantenimiento — CCTV / VMS', { estado: 'listo', origen: 'Cargado por el Ing. Huamán, ' + fCorta(dia(-20)) }),
    DI('ma-lle', 'manuales', 'Manual de operación y mantenimiento — Llamada de enfermeras'),
    DI('ma-tel', 'manuales', 'Manual de operación y mantenimiento — Telefonía IP', { estado: 'listo', origen: 'Cargado por el Ing. Huamán, ' + fCorta(dia(-20)) }),
    DI('ma-per', 'manuales', 'Manual de operación y mantenimiento — Perifoneo'),
    DI('ma-bms', 'manuales', 'Manual de operación y mantenimiento — BMS'),
    DI('ma-dc', 'manuales', 'Manual de operación y mantenimiento — Data center'),
    DI('act-inicio', 'actas', 'Acta de inicio de obra', { doc: 'd-ac-inicio' }),
    DI('act-materiales', 'actas', 'Acta de aprobación de materiales n.º 1', { doc: 'd-ac-mat1' }),
    DI('act-materiales-2', 'actas', 'Acta de aprobación de materiales n.º 2', { doc: 'd-ac-mat2' }),
    DI('act-termino', 'actas', 'Acta de término de instalación'),
    DI('act-pruebas', 'actas', 'Acta de pruebas y puesta en marcha'),
    DI('act-capacitacion', 'actas', 'Acta de capacitación'),
    DI('act-entrega', 'actas', 'Acta de entrega y conformidad'),
    DI('cap-cctv', 'capacitacion', 'Constancia de capacitación — operadores de CCTV'),
    DI('cap-enf', 'capacitacion', 'Constancia de capacitación — enfermería (llamada de enfermeras)'),
    DI('cap-mant', 'capacitacion', 'Constancia de capacitación — mantenimiento (BMS y data center)'),
    DI('cal-dsx', 'calibracion', 'Certificado de calibración — certificador Fluke DSX', { estado: 'listo', origen: 'Cargado por el Ing. Huamán, ' + fCorta(dia(-60)) }),
    DI('cal-otdr', 'calibracion', 'Certificado de calibración — OTDR', { estado: 'listo', origen: 'Cargado por el Ing. Huamán, ' + fCorta(dia(-34)) }),
  ];

  /* observaciones (punch list) del Altiplano */
  const O = (o) => st.obs.push({ proy: 'altiplano', origen: 'Supervisión', autor: 'rocio', ...o });
  O({ id: 'OBS-024', t: 'Bandeja portacables sin tapa en el pasillo de UCI', sis: 'cab', zona: 'Bloque B · piso 2', estado: 'abierta', creada: habilAtras(2, 10, 15), antes: 'cab-bandeja', asignado: 'edwin', prioridad: 'Media' });
  O({ id: 'OBS-023', t: 'La cámara del hall de admisión no cubre la puerta principal', sis: 'cctv', zona: 'Bloque A · piso 1', estado: 'abierta', creada: habilAtras(4, 15, 40), antes: 'ilus:camara-mal', asignado: 'jhon', prioridad: 'Alta' });
  O({ id: 'OBS-022', t: 'Patch panel del gabinete G-B1 sin rotular', sis: 'cab', zona: 'Bloque B · piso 1 · gabinete G-B1', estado: 'abierta', creada: habilAtras(6, 9, 30), antes: 'ilus:patch-sin', asignado: 'edwin', prioridad: 'Media' });
  O({ id: 'OBS-021', t: 'Tubería de llamada de enfermeras sin soportes en el falso cielo', sis: 'lle', zona: 'Hospitalización · piso 2', estado: 'levantada', creada: habilAtras(9, 11, 0), levantada: habilAtras(3, 16, 20), aprobadaBts: habilAtras(3, 17, 5), antes: 'ilus:tubo-suelto', despues: 'ilus:tubo-fijo', asignado: 'luis', prioridad: 'Media', nota: 'Se colocaron abrazaderas cada 1.5 m, fijadas al techo con varilla roscada.' });
  O({ id: 'OBS-020', t: 'Rejilla de ventilación del cuarto de datos tapada por la bandeja', sis: 'dc', zona: 'Cuarto de datos 1', estado: 'abierta', creada: habilAtras(1, 16, 5), antes: null, asignado: 'rosa', prioridad: 'Baja', origen: 'BTS', autor: 'carlos' });
  O({ id: 'OBS-019', t: 'Gabinete G-A2 sin conexión a tierra', sis: 'dc', zona: 'Bloque A · piso 2', estado: 'cerrada', creada: habilAtras(22, 10), levantada: habilAtras(18, 16), aprobadaBts: habilAtras(18, 17), cerrada: habilAtras(16, 11), antes: 'ilus:tierra-sin', despues: 'ilus:tierra-con', asignado: 'rosa', prioridad: 'Alta', nota: 'Se tendió el conductor de tierra desde la barra del cuarto y se midió 2.1 Ω.' });
  O({ id: 'OBS-018', t: 'Cámaras del estacionamiento instaladas más bajas que en el plano', sis: 'cctv', zona: 'Exteriores', estado: 'cerrada', creada: habilAtras(27, 9), levantada: habilAtras(24, 17), aprobadaBts: habilAtras(24, 18), cerrada: habilAtras(23, 10), antes: null, despues: null, asignado: 'jhon', prioridad: 'Media', nota: 'Se subieron a 4.5 m según PL-CCTV-01 Rev. B.' });
  O({ id: 'OBS-017', t: 'Etiquetas de fibra ilegibles en el ODF principal', sis: 'cab', zona: 'Cuarto de datos 1', estado: 'cerrada', creada: habilAtras(31, 9), levantada: habilAtras(29, 17), aprobadaBts: habilAtras(29, 18), cerrada: habilAtras(28, 10), asignado: 'edwin', prioridad: 'Baja', nota: 'Se reimprimieron las 48 etiquetas con rotuladora industrial.' });
  O({ id: 'OBS-016', t: 'Parlantes del pasillo 3 sin rejilla de protección', sis: 'per', zona: 'Bloque B · piso 1', estado: 'cerrada', creada: habilAtras(34, 9), levantada: habilAtras(31, 17), aprobadaBts: habilAtras(31, 18), cerrada: habilAtras(30, 10), asignado: 'luis', prioridad: 'Baja' });

  /* partes diarios del Altiplano: el técnico reporta cantidades; el avance sale del metrado de cada frente */
  const P = (x) => { const a = avancePorCantidad(alt, x.sis, x.act, x.n); st.partes.push({ proy: 'altiplano', estado: 'aprobado', aprobo: 'carlos', fotos: [], personal: 4, horas: 9, ...x, inc: a.inc, cant: `${num(x.n)} ${a.unidad}`, actN: a.nombre, total: a.total }); };
  P({ id: 'PD-0411', tec: 'jhon', f: habilAtras(1, 18, 10), sis: 'cctv', act: 'montaje', n: 14, zona: 'Bloque A · piso 3', t: 'Montaje y conexión de 14 cámaras domo al switch PoE del gabinete G-A3', nota: 'Las fotos van mañana: no hay señal en el piso 3.', estado: 'pendiente', aprobo: null });
  P({ id: 'PD-0410', tec: 'edwin', f: habilAtras(1, 17, 52), sis: 'cab', act: 'tendido', n: 96, zona: 'Bloque B · piso 2', t: 'Tendido y peinado de 96 puntos de red en la bandeja del pasillo de UCI', fotos: ['cab-varillas', 'cab-tendido'], personal: 5, estado: 'pendiente', aprobo: null });
  P({ id: 'PD-0409', tec: 'luis', f: habilAtras(1, 12, 30), sis: 'tel', act: 'instalacion', n: 22, zona: 'Bloque A · piso 1', t: 'Instalación de 22 teléfonos IP en estaciones de enfermería y consultorios', aprobado: habilAtras(1, 15, 5) });
  P({ id: 'PD-0408', tec: 'edwin', f: habilAtras(2, 17, 40), sis: 'cab', act: 'fusion', n: 48, zona: 'Cuarto de datos 1', t: 'Fusión de 48 hilos de fibra en el ODF del cuarto de datos 1', aprobado: habilAtras(1, 9, 10) });
  P({ id: 'PD-0407', tec: 'rosa', f: habilAtras(2, 16, 55), sis: 'dc', act: 'gabinetes', n: 4, zona: 'Cuarto de datos 2', t: 'Montaje de 4 gabinetes de 42U con ordenadores de cable', aprobado: habilAtras(1, 9, 12) });
  P({ id: 'PD-0406', tec: 'jhon', f: habilAtras(3, 17, 30), sis: 'cctv', act: 'tendido', n: 18, zona: 'Bloque A · piso 2', t: 'Tendido de cable a 18 puntos de cámara', aprobado: habilAtras(2, 9, 0) });
  P({ id: 'PD-0405', tec: 'luis', f: habilAtras(4, 17, 10), sis: 'per', act: 'parlantes', n: 30, zona: 'Bloque B · pasillos', t: 'Montaje de 30 parlantes de techo en los pasillos', aprobado: habilAtras(3, 9, 20) });
  P({ id: 'PD-0404', tec: 'edwin', f: habilAtras(5, 17, 45), sis: 'cab', act: 'cert', n: 120, zona: 'Bloque B · piso 1', t: 'Certificación de 120 puntos de red con el equipo Fluke DSX: pasan los 120', fotos: ['cab-bandeja'], aprobado: habilAtras(4, 9, 5) });
  P({ id: 'PD-0403', tec: 'rosa', f: habilAtras(6, 16, 30), sis: 'bms', act: 'controladores', n: 3, zona: 'Sótano · casa de fuerza', t: 'Montaje de 3 controladores del BMS en los tableros de casa de fuerza', aprobado: habilAtras(5, 9, 0) });
  P({ id: 'PD-0402', tec: 'jhon', f: habilAtras(7, 17, 0), sis: 'cctv', act: 'montaje', n: 6, zona: 'Exteriores', t: 'Postes, brazos y montaje de 6 cámaras perimetrales', aprobado: habilAtras(6, 9, 0) });
  P({ id: 'PD-0401', tec: 'edwin', f: habilAtras(8, 17, 20), sis: 'cab', act: 'bandeja', n: 85, zona: 'Bloque B · piso 1', t: 'Montaje de 85 m de bandeja y amarre de mazos cada 1.2 m', fotos: ['cab-mazos'], aprobado: habilAtras(7, 9, 0) });
  P({ id: 'PD-0400', tec: 'luis', f: habilAtras(9, 17, 0), sis: 'lle', act: 'tuberia', n: 24, zona: 'Hospitalización · piso 2', t: 'Cajas y tubería para 24 pulsadores de cama (los equipos siguen en aduana)', aprobado: habilAtras(8, 9, 0) });

  /* fotos aprobadas (lo que ve el cliente) */
  const F = (x) => st.fotos.push({ proy: 'altiplano', ...x });
  F({ id: 'f1', src: 'alt-aerea', f: habilAtras(5, 11, 20), zona: 'General', sis: null, t: 'Vista aérea del avance', origen: 'Registro fotográfico semanal' });
  F({ id: 'f2', src: 'alt-torre', f: habilAtras(5, 11, 25), zona: 'Bloque B', sis: null, t: 'Torre de hospitalización, frente norte', origen: 'Registro fotográfico semanal' });
  F({ id: 'f3', src: 'cab-bandeja', f: habilAtras(5, 17, 45), zona: 'Bloque B · piso 1', sis: 'cab', t: 'Bandeja del pasillo, lista para certificar', origen: 'PD-0404' });
  F({ id: 'f4', src: 'cab-mazos', f: habilAtras(8, 17, 20), zona: 'Bloque B · piso 1', sis: 'cab', t: 'Mazos peinados y amarrados cada 1.2 m', origen: 'PD-0401' });
  F({ id: 'f5', src: 'alt-cubierta', f: habilAtras(12, 11, 0), zona: 'Bloque A', sis: null, t: 'Cubierta del bloque A y salida de bandejas', origen: 'Registro fotográfico semanal' });
  F({ id: 'f6', src: 'cab-montaje', f: habilAtras(15, 16, 40), zona: 'Bloque A · piso 3', sis: 'cab', t: 'Montaje de bandeja en el falso cielo', origen: 'PD-0388' });

  /* consultas del Consorcio */
  st.consultas.push({ id: 'C-002', proy: 'altiplano', de: 'marco', tema: 'Suministro', texto: '¿Cuándo llegan los equipos de llamada de enfermeras? Necesitamos coordinar el cierre del falso cielo del piso 2.', ts: habilAtras(3, 9, 40), resp: { de: 'carlos', ts: habilAtras(3, 11, 5), texto: 'Están en la aduana del Callao. Según la agencia, llegan a obra el {hito:altiplano:h2}. Le confirmamos por aquí apenas salgan del almacén.' } });
  st.consultas.push({ id: 'C-003', proy: 'altiplano', de: 'rocio', tema: 'Documentos', texto: '¿Pueden adjuntar al PP-CAB-B1 los reportes del certificador (LinkWare)? Con eso doy la conformidad hoy.', ts: hoyA(9, 15, 170), resp: null });

  /* actividad previa */
  st.actividad.push(
    { id: 'a1', proy: 'altiplano', ts: habilAtras(4, 17, 35), quien: 'carlos', texto: 'subió el protocolo PP-CAB-B1 para la conformidad de la supervisión', tipo: 'documento' },
    { id: 'a2', proy: 'altiplano', ts: habilAtras(4, 10, 5), quien: 'carlos', texto: 'presentó el hito de pago 4 (avance de instalación al 50 %)', tipo: 'pago' },
    { id: 'a3', proy: 'altiplano', ts: habilAtras(3, 15, 10), quien: 'carlos', texto: 'subió la Rev. C del plano PL-CCTV-01', tipo: 'documento' },
  );
  st.correos.push(
    { id: 'm2', proy: 'altiplano', ts: sumarSemanas(ai, 10) + 15 * HORA, para: 'Consorcio Hospital Altiplano (3 personas)', asunto: 'Su obra pasó a la etapa: Instalación', resumen: 'Aviso de cambio de etapa' },
  );

  /* ------------------------------------------------------------ 2. Hospital de Yungay (en entrega, dinero detenido) */
  const yi = dia(-329, 0, 0);
  const yun = {
    id: 'yungay', codigo: `BTS-${yy(yi)}-011`, nombre: 'Hospital de Yungay', alcance: 'Sistemas de comunicaciones y TI', cliente: 'Consorcio Salud Yungay',
    entidad: '', sector: 'Salud · obra pública', ubicacion: 'Yungay, Áncash', plantilla: 'hospital', monto: 1045000, rolBts: 'Subcontratista', inicio: yi, semanas: 50, notaPlazo: 'Incluye la ampliación de plazo n.º 1 (+8 semanas)', estado: 'entrega', foto: 'yungay', fotoF: habilAtras(9, 10), residente: 'carlos',
    sistemas: [
      { k: 'cab', peso: 285000, real: 100, v: [3, 40], etapa: 'pruebas' }, { k: 'cctv', peso: 188000, real: 97, v: [6, 46], etapa: 'pruebas' },
      { k: 'acc', peso: 62000, real: 100, v: [10, 42], etapa: 'pruebas' }, { k: 'lle', peso: 150000, real: 100, v: [8, 44], etapa: 'pruebas' },
      { k: 'rel', peso: 28000, real: 90, v: [16, 48], etapa: 'pruebas', med: { relojes: 64 }, nota: { t: 'aviso', x: 'Falta la prueba de sincronización: los relojes del piso 3 se desfasan.' } },
      { k: 'per', peso: 66000, real: 94, v: [10, 47], etapa: 'pruebas' }, { k: 'bms', peso: 140000, real: 88, v: [12, 49], etapa: 'pruebas', med: { controladores: 18, puntos: 1800 }, nota: { t: 'aviso', x: 'Pruebas finales del BMS pendientes; faltan su as-built y su manual.' } },
      { k: 'dc', peso: 126000, real: 100, v: [4, 36], etapa: 'pruebas' },
    ],
    etapas: { ingenieria: { e: 'hecha' }, aprobacion: { e: 'hecha' }, suministro: { e: 'hecha' }, instalacion: { e: 'hecha' }, pruebas: { e: 'curso', a: 88 }, entrega: { e: 'curso', a: 40 }, garantia: { e: 'pendiente' } },
    perfilReal: [[0, 1], [10, 1], [20, .97], [32, .96], [44, .97]], avisos: true, garantiaMeses: 24,
  };
  yun.hitos = [
    { id: 'h1', t: 'Capacitación al personal de mantenimiento', f: laborable(dia(5, 9)), tipo: 'entrega' },
    { id: 'h2', t: 'Pruebas finales del BMS', f: laborable(dia(8, 9)), tipo: 'prueba', sis: 'bms' },
    { id: 'h3', t: 'Entrega del dossier de cierre', f: laborable(dia(15, 9)), tipo: 'entrega' },
  ];
  yun.pagos = PLANTILLA.hospital.pagos.map(([t, pc], i) => ({ n: i + 1, t, pct: pc, estado: i < 5 ? 'pagado' : 'detenido', f: i < 5 ? laborable(sumarSemanas(yi, [1, 9, 18, 26, 40][i]), true) : null, req: reqsPara(t), retiene: i === 6 }));
  yun.pagos[5].req = [{ t: 'Protocolos de prueba aprobados', calc: 'protocolos' }];
  yun.pagos[6].req = [{ t: 'Dossier de cierre completo', calc: 'dossier' }, { t: 'Constancias de capacitación', cat: 'capacitacion' }, { t: 'Acta de entrega y conformidad', item: 'act-entrega' }];
  yun.dossier = dossierDesdeSistemas(yun.sistemas);
  const faltanYungay = ['Prueba de sincronización de relojes — Relojes IP', 'Prueba de alarmas y tendencias — BMS', 'Prueba de niveles de audio por zona — Perifoneo', 'Prueba de grabación y retención — CCTV / VMS', 'Planos as-built — BMS', 'Planos as-built — Perifoneo', 'Planos as-built — Relojes IP', 'Certificado de garantía del fabricante — Cableado y fibra', 'Manual de operación y mantenimiento — BMS', 'Acta de pruebas y puesta en marcha', 'Prueba integral de sistemas', 'Acta de capacitación', 'Acta de entrega y conformidad', 'Constancia de capacitación — personal de mantenimiento'];
  yun.dossier.forEach(it => { if (!faltanYungay.includes(it.n)) { it.estado = 'listo'; it.origen = 'Cargado durante la obra'; } });
  st.obs.push({ id: 'OBS-Y12', proy: 'yungay', t: 'Relojes IP del piso 3 desfasados dos minutos', sis: 'rel', zona: 'Piso 3', estado: 'abierta', creada: habilAtras(5, 10), antes: null, asignado: 'luis', prioridad: 'Media', origen: 'Supervisión', autor: 'Supervisión de obra' });
  st.obs.push({ id: 'OBS-Y11', proy: 'yungay', t: 'Tableros del BMS sin rotulado de circuitos', sis: 'bms', zona: 'Casa de fuerza', estado: 'abierta', creada: habilAtras(8, 10), antes: null, asignado: 'rosa', prioridad: 'Baja', origen: 'Supervisión', autor: 'Supervisión de obra' });
  st.fotos.push({ id: 'fy1', proy: 'yungay', src: 'yungay', f: habilAtras(9, 10), zona: 'General', sis: null, t: 'Revisión de pruebas con el equipo de obra', origen: 'Registro fotográfico semanal' });
  const PY = (x) => { const a = avancePorCantidad(yun, x.sis, x.act, x.n); st.partes.push({ proy: 'yungay', estado: 'aprobado', aprobo: 'carlos', fotos: [], personal: 3, horas: 9, ...x, inc: a.inc, cant: `${num(x.n)} ${a.unidad}`, actN: a.nombre, total: a.total }); };
  PY({ id: 'PD-0398', tec: 'luis', f: habilAtras(2, 17, 15), sis: 'rel', act: 'sincro', n: 12, zona: 'Piso 2', t: 'Sincronización y prueba de 12 relojes IP del piso 2', aprobado: habilAtras(1, 9, 30) });
  PY({ id: 'PD-0397', tec: 'rosa', f: habilAtras(3, 16, 40), sis: 'bms', act: 'programacion', n: 180, zona: 'Casa de fuerza', t: 'Programación de 180 puntos de control en la central del BMS', aprobado: habilAtras(2, 9, 0) });
  yun.usuarios = [{ id: 'gerencia', estado: 'activo' }, { id: 'carlos', estado: 'activo' }, { id: 'luis', estado: 'activo' }, { id: 'rosa', estado: 'activo' }, { id: 'u-ys', n: 'Supervisión de obra', rol: 'Supervisión (Consorcio)', lado: 'cliente', estado: 'activo', permiso: 'Ve todo y da conformidades' }];

  /* ------------------------------------------------------------ 3. Matucana (recién iniciado: ingeniería) */
  const mi = dia(-24, 0, 0);
  const mat = {
    id: 'matucana', codigo: `BTS-${yy(mi)}-012`, nombre: 'Hospital de Contingencia de Matucana', alcance: 'Suministro e instalación de sistemas de comunicaciones', cliente: 'Consorcio Hospitalario Matucana',
    entidad: '', sector: 'Salud · obra pública', ubicacion: 'Matucana, Huarochirí', plantilla: 'hospital', monto: 960000, rolBts: 'Subcontratista', inicio: mi, semanas: 36, estado: 'ejecucion', foto: 'matucana', fotoF: laborable(dia(-17, 10), true), residente: 'carlos',
    sistemas: [
      { k: 'cab', peso: 300000, real: 4, v: [1, 30], etapa: 'ingenieria' }, { k: 'cctv', peso: 220000, real: 3, v: [2, 32], etapa: 'ingenieria' },
      { k: 'con', peso: 160000, real: 3, v: [2, 30], etapa: 'ingenieria' }, { k: 'tel', peso: 110000, real: 2, v: [3, 32], etapa: 'ingenieria' },
      { k: 'inc', peso: 170000, real: 2, v: [2, 33], etapa: 'ingenieria' },
    ],
    etapas: { ingenieria: { e: 'curso', a: 70 }, aprobacion: { e: 'curso', a: 33 }, suministro: { e: 'pendiente' }, instalacion: { e: 'pendiente' }, pruebas: { e: 'pendiente' }, entrega: { e: 'pendiente' }, garantia: { e: 'pendiente' } },
    perfilReal: [[0, 1]], avisos: true, garantiaMeses: 24,
  };
  mat.hitos = [
    { id: 'h1', t: 'Aprobación de 4 fichas técnicas por la supervisión', f: laborable(dia(-1, 12), true), tipo: 'documento' },
    { id: 'h2', t: 'Pedido de los equipos importados', f: laborable(dia(10, 9)), tipo: 'suministro' },
    { id: 'h3', t: 'Inicio de la instalación', f: laborable(sumarSemanas(mi, 9) + 9 * HORA), tipo: 'instalacion' },
    { id: 'h4', t: 'Entrega de obra y acta de conformidad', f: finProyecto(mat), tipo: 'entrega' },
  ];
  mat.pagos = PLANTILLA.hospital.pagos.map(([t, pc], i) => ({ n: i + 1, t, pct: pc, estado: i === 0 ? 'pagado' : i === 1 ? 'revision' : 'pendiente', f: i === 0 ? laborable(sumarDias(mi, 5), true) : i === 1 ? habilAtras(6, 10) : null, req: reqsPara(t), retiene: i === 6 }));
  mat.dossier = dossierDesdeSistemas(mat.sistemas);
  const fichasMat = [['d-m-ft1', 'FT-CAB-01', 'Cable U/FTP Cat 6A y conectividad', 'Panduit', 'aprobado', 'cab'], ['d-m-ft2', 'FT-CCTV-01', 'Cámaras IP y grabación', 'Hikvision', 'aprobado', 'cctv'], ['d-m-ft3', 'FT-CON-01', 'Switches de acceso y núcleo', 'Cisco', 'revision', 'con'], ['d-m-ft4', 'FT-TEL-01', 'Teléfonos IP', 'Yealink', 'revision', 'tel'], ['d-m-ft5', 'FT-INC-01', 'Detectores y panel de incendios', 'Notifier', 'revision', 'inc'], ['d-m-ft6', 'FT-FO-01', 'Fibra óptica y ODF', 'Furukawa', 'revision', 'cab']];
  fichasMat.forEach(([id, cod, n, marca, estado, sis]) => st.docs.push({ id, proy: 'matucana', tipo: 'ficha', cod, n, marca, estado, sis, f: estado === 'aprobado' ? laborable(dia(-9, 11), true) : habilAtras(6, 11), aprobado: estado === 'aprobado' ? laborable(dia(-7, 11), true) : null }));
  st.docs.push({ id: 'd-m-ac1', proy: 'matucana', tipo: 'acta', cod: 'AC-001', n: 'Acta de inicio de obra', estado: 'aprobado', f: laborable(sumarDias(mi, 1)), aprobado: laborable(sumarDias(mi, 1)) });
  st.fotos.push({ id: 'fm1', proy: 'matucana', src: 'matucana', f: laborable(dia(-17, 10), true), zona: 'General', sis: null, t: 'Vista aérea del terreno y de los módulos', origen: 'Registro fotográfico semanal' });
  const fichasItems = mat.dossier.filter(i => i.cat === 'fichas');
  fichasItems.forEach((it, i) => { it.doc = ['d-m-ft1', 'd-m-ft2', 'd-m-ft3', 'd-m-ft4', 'd-m-ft5'][i]; });
  mat.dossier.splice(mat.dossier.indexOf(fichasItems[fichasItems.length - 1]) + 1, 0, { id: 'fichas-fo', cat: 'fichas', n: 'Ficha técnica aprobada — Fibra óptica y ODF', estado: 'falta', doc: 'd-m-ft6' });
  mat.dossier.find(i => i.id === 'act-inicio').doc = 'd-m-ac1';
  st.actividad.push(
    { id: 'a-m1', proy: 'matucana', ts: laborable(sumarDias(mi, 1)) + 10 * HORA, quien: 'carlos', texto: 'registró el acta de inicio de obra (AC-001)', tipo: 'documento' },
    { id: 'a-m2', proy: 'matucana', ts: laborable(dia(-9, 11), true), quien: 'carlos', texto: 'subió las fichas FT-CAB-01 y FT-CCTV-01 para aprobación', tipo: 'documento' },
    { id: 'a-m3', proy: 'matucana', ts: laborable(dia(-7, 16), true), quien: 'Supervisión de obra', texto: 'aprobó las fichas FT-CAB-01 y FT-CCTV-01', tipo: 'ok' },
    { id: 'a-m4', proy: 'matucana', ts: habilAtras(6, 11), quien: 'carlos', texto: 'subió 4 fichas técnicas más para la aprobación de la supervisión', tipo: 'documento' },
    { id: 'a-m5', proy: 'matucana', ts: habilAtras(6, 10), quien: 'carlos', texto: 'presentó el hito de pago 2 (ingeniería y fichas aprobadas)', tipo: 'pago' },
    { id: 'a-y1', proy: 'yungay', ts: habilAtras(2, 16), quien: 'carlos', texto: 'cargó al dossier dos protocolos de prueba del CCTV', tipo: 'dossier' },
    { id: 'a-y2', proy: 'yungay', ts: habilAtras(9, 17), quien: 'gerencia', texto: 'pidió a Siemon el certificado de garantía de 25 años del cableado', tipo: 'nota' },
    { id: 'a-y3', proy: 'yungay', ts: laborable(dia(-20, 10), true), quien: 'carlos', texto: 'entregó los planos as-built de cableado, CCTV y data center', tipo: 'dossier' },
  );
  mat.usuarios = [{ id: 'gerencia', estado: 'activo' }, { id: 'carlos', estado: 'activo' }, { id: 'u-ms', n: 'Supervisión de obra', rol: 'Supervisión (Consorcio)', lado: 'cliente', estado: 'activo', permiso: 'Ve todo y da conformidades' }];

  /* ------------------------------------------------------------ 4. DRAT Tacna (cerrado: garantía y postventa) */
  const di = dia(-434, 0, 0);
  const drat = {
    id: 'drat', codigo: `BTS-${yy(di)}-003`, nombre: 'Dirección Regional de Agricultura Tacna', corto: 'DRAT Tacna', alcance: 'Videovigilancia y radioenlace entre sedes', cliente: 'Dirección Regional de Agricultura Tacna',
    entidad: 'Gobierno Regional de Tacna', ubicacion: 'Tacna', plantilla: 'cctv', monto: 612400, rolBts: 'Contratista', inicio: di, semanas: 26, estado: 'cerrado', foto: 'drat', fotoF: null, residente: 'carlos',
    sistemas: [{ k: 'cctv', peso: 286000, real: 100, v: [3, 22] }, { k: 'rad', peso: 148400, real: 100, v: [6, 20] }, { k: 'con', peso: 112000, real: 100, v: [2, 18] }, { k: 'cab', peso: 66000, real: 100, v: [2, 16] }],
    etapas: { ingenieria: { e: 'hecha' }, aprobacion: { e: 'hecha' }, suministro: { e: 'hecha' }, instalacion: { e: 'hecha' }, pruebas: { e: 'hecha' }, entrega: { e: 'hecha' }, garantia: { e: 'curso' } },
    perfilReal: [[0, 1], [8, 1.02], [16, 1.0]], avisos: true, garantiaMeses: 24,
  };
  drat.entrega = finProyecto(drat);
  drat.hitos = [];
  drat.pagos = PLANTILLA.cctv.pagos.map(([t, pc], i) => ({ n: i + 1, t, pct: pc, estado: 'pagado', f: laborable([sumarDias(di, 5), sumarSemanas(di, 9), sumarSemanas(di, 22), sumarDias(drat.entrega, 18)][i], true), req: reqsPara(t) }));
  drat.dossier = dossierDesdeSistemas(drat.sistemas);
  drat.dossier.forEach(it => { it.estado = 'listo'; it.origen = 'Entregado con el dossier'; });
  drat.dossierEntregado = sumarDias(drat.entrega, 0);
  const meses = (ts, m) => { const d = new Date(ts); d.setMonth(d.getMonth() + m); return d.getTime(); };
  drat.garantia = {
    hasta: meses(drat.entrega, 24),
    equipos: [
      { eq: 'Cámara PTZ exterior', marca: 'Axis', modelo: 'Q6075-E', serie: 'ACCC8EF2A31B', ubic: 'Patio de maniobras', hasta: meses(drat.entrega, 36) },
      { eq: 'Cámaras bullet 4 MP con infrarrojo (18)', marca: 'Hikvision', modelo: 'DS-2CD2T43G2-4I', serie: 'Lote L2410-18', ubic: 'Perímetro y accesos', hasta: meses(drat.entrega, 36) },
      { eq: 'Cámaras domo 4 MP (6)', marca: 'Hikvision', modelo: 'DS-2CD2147G2', serie: 'Lote L2410-06', ubic: 'Oficinas y archivo', hasta: meses(drat.entrega, 36) },
      { eq: 'Servidor de grabación', marca: 'Dell', modelo: 'PowerEdge R450', serie: '7HXK2Q3', ubic: 'Cuarto de datos', hasta: meses(drat.entrega, 36) },
      { eq: 'Soporte del software de video (25 cámaras)', marca: 'Genetec', modelo: 'Security Center', serie: 'SC-25-TAC-0915', ubic: 'Servidor de grabación', hasta: meses(drat.entrega, 12), renovable: true },
      { eq: 'Switch PoE de 24 puertos', marca: 'Cisco', modelo: 'CBS350-24FP', serie: 'PSZ2533R0KD', ubic: 'Gabinete principal', hasta: null, vida: true },
      { eq: 'Radioenlace microondas (par)', marca: 'Huawei', modelo: 'OptiX RTN 905', serie: '2102351704 / 2102351705', ubic: 'Sede central ↔ Agencia agraria', hasta: meses(drat.entrega, 24) },
      { eq: 'UPS de 3 kVA en línea', marca: 'APC', modelo: 'SRT3KXLI', serie: 'AS2214311875', ubic: 'Cuarto de datos', hasta: meses(drat.entrega, 24) },
    ],
    contrato: { n: 'Mantenimiento preventivo trimestral', monto: 14800, vence: laborable(dia(45, 9)) },
    visitas: [
      { id: 'MP-01', f: laborable(dia(-79, 9), true), estado: 'hecha', alcance: 'Mantenimiento preventivo: limpieza, enfoque y revisión del radioenlace' },
      { id: 'MP-02', f: laborable(dia(12, 9)), estado: 'programada', alcance: 'Limpieza de domos y lentes, enfoque, prueba de grabación de 30 días, alineamiento y potencia del radioenlace, revisión de UPS y baterías.' },
    ],
  };
  st.tickets.push(
    { id: 'TK-031', proy: 'drat', t: 'Cámara 14 (ingreso vehicular) sin imagen de noche', eq: 'Cámaras bullet 4 MP con infrarrojo (18)', prioridad: 'Alta', estado: 'atencion', creado: habilAtras(1, 19, 40), por: 'Jefatura de Logística', resp: 'jhon', notas: [{ ts: hoyA(8, 30, 60), quien: 'jhon', t: 'Revisión remota: el infrarrojo de la cámara no enciende. Visita programada con una cámara de reemplazo en garantía.' }] },
    { id: 'TK-027', proy: 'drat', t: 'Corte del radioenlace por viento fuerte', eq: 'Radioenlace microondas (par)', prioridad: 'Alta', estado: 'cerrado', creado: dia(-41, 7, 10), cerrado: dia(-41, 13, 25), por: 'Jefatura de Logística', resp: 'jhon', solucion: 'Se realineó la antena y se reforzó el mástil. Enlace restablecido en 6 horas.' },
    { id: 'TK-024', proy: 'drat', t: 'Alta de un usuario nuevo en el software de video', eq: 'Soporte del software de video (25 cámaras)', prioridad: 'Baja', estado: 'cerrado', creado: laborable(dia(-77, 10, 0), true), cerrado: laborable(dia(-77, 10, 0), true) + 130 * 6e4, por: 'Oficina de Informática', resp: 'jhon', solucion: 'Usuario creado con permisos de solo visualización. Atendido de forma remota.' },
  );
  drat.usuarios = [{ id: 'gerencia', estado: 'activo' }, { id: 'carlos', estado: 'activo' }, { id: 'jhon', estado: 'activo' }, { id: 'u-d1', n: 'Jefatura de Logística', rol: 'Responsable del contrato (DRAT)', lado: 'cliente', estado: 'activo', permiso: 'Ve todo y reporta fallas' }, { id: 'u-d2', n: 'Oficina de Informática', rol: 'Soporte interno (DRAT)', lado: 'cliente', estado: 'activo', permiso: 'Reporta fallas' }];

  st.proyectos.push(alt, yun, mat, drat);
  st.proyectos.forEach(generarHistoria);
  return st;
}

/* ---------- proyecto nuevo desde plantilla ---------- */
/* arma el proyecto completo sin guardarlo (sirve para la vista previa del asistente) */
function armarProyecto(d, id) {
  const pl = PLANTILLA[d.plantilla];
  const semanas = Math.max(4, Math.round((d.fin - d.inicio) / SEMANA));
  const elegidos = pl.sistemas.concat(pl.opcionales || []).filter(([k]) => d.sistemas.includes(k));
  const totalPeso = sum(elegidos, x => x[1]) || 1;
  const p = {
    id, codigo: `BTS-${String(new Date(d.inicio).getFullYear()).slice(2)}-${String(S.seq.proy + 1).padStart(3, '0')}`, nombre: d.nombre || 'Proyecto nuevo', alcance: d.alcance || pl.n,
    cliente: d.cliente, entidad: d.entidad || '', ubicacion: d.ubicacion || '', plantilla: pl.k, monto: d.monto, inicio: d.inicio, semanas, estado: 'ejecucion', rolBts: /^consorcio/i.test(d.cliente || '') ? 'Subcontratista' : 'Contratista',
    foto: null, fotoF: null, residente: 'carlos', nuevo: true, creado: Date.now(),
    sistemas: elegidos.map(([k, w, f]) => ({ k, peso: Math.round(d.monto * w / totalPeso), real: 0, v: ventanaSemanas(semanas, f), etapa: 'ingenieria' })),
    etapas: Object.fromEntries(ETAPAS.map((e, i) => [e.k, { e: i === 0 && !porIniciar({ inicio: d.inicio }) ? 'curso' : 'pendiente', a: 0 }])),
    perfilReal: [[0, 1]], avisos: true, garantiaMeses: 24,
  };
  p.hitos = hitosDesdePlantilla(p);
  p.pagos = pl.pagos.map(([t, pc], i) => ({ n: i + 1, t, pct: pc, estado: 'pendiente', f: null, req: reqsPara(t), retiene: i === pl.pagos.length - 1 }));
  p.dossier = dossierDesdeSistemas(p.sistemas);
  p.usuarios = [{ id: 'gerencia', estado: 'activo' }, { id: 'carlos', estado: 'activo' }].concat((d.invitados || []).map((u, i) => ({ id: 'inv-' + i + Date.now().toString(36), n: u.n, correo: u.correo, rol: u.rol, lado: 'cliente', estado: 'invitado', permiso: u.rol === 'Supervisión de obra' ? 'Ve todo y da conformidades' : 'Ve todo y escribe consultas', desde: Date.now() })));
  p.serieReal = [];
  return p;
}
function crearProyectoDesdePlantilla(d) {
  S.seq.proy++;
  const id = 'p' + S.seq.proy + Date.now().toString(36).slice(-3);
  const p = armarProyecto(d, id);
  p.codigo = `BTS-${String(new Date(d.inicio).getFullYear()).slice(2)}-${String(S.seq.proy).padStart(3, '0')}`;
  S.proyectos.push(p);
  registrar(id, 'gerencia', `creó el proyecto desde la plantilla «${PLANTILLA[d.plantilla].n}»`, 'proyecto');
  (d.invitados || []).forEach(u => correoSimulado(id, `${u.n} <${u.correo}>`, `BTS le dio acceso al portal de ${d.nombre}`, 'Invitación con enlace de acceso'));
  return p;
}
