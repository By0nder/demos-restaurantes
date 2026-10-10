/* =====================================================================
   BTS · Portal de proyectos (muestra) — base: utilidades y catálogos
   Muestra preparada por Kallari. Todo corre en el navegador: datos de
   ejemplo en memoria + localStorage. Sin servidor, sin librerías.
   ===================================================================== */
'use strict';

/* ---------- utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ico = (n, cls = '') => `<svg class="ico ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const suave = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };   // curva S de una tarea
const sum = (arr, f = x => x) => arr.reduce((s, x) => s + (+f(x) || 0), 0);
const uid = (p = 'x') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const iniciales = n => String(n || '').replace(/^(Ing\.|Lic\.|Arq\.)\s*/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

/* ---------- tiempo (todo relativo a hoy, para que la muestra siempre esté al día) ---------- */
const HORA = 36e5, DIA = 864e5, SEMANA = 7 * DIA;
const inicioDia = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
const HOY = inicioDia(Date.now());
const dia = (n, h = 9, m = 0) => { const d = new Date(HOY); d.setDate(d.getDate() + n); d.setHours(h, m, 0, 0); return d.getTime(); };
const lunesDe = ts => { const d = new Date(inicioDia(ts)); const dw = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dw); return d.getTime(); };
const sumarDias = (ts, n) => { const d = new Date(ts); d.setDate(d.getDate() + n); return d.getTime(); };
const sumarSemanas = (ts, n) => sumarDias(ts, Math.round(n * 7));
/* n días hábiles (lunes a viernes) hacia atrás desde hoy */
function habilAtras(n, h = 17, m = 30) {
  let d = new Date(HOY), k = 0;
  while (k < n) { d.setDate(d.getDate() - 1); if (d.getDay() !== 0 && d.getDay() !== 6) k++; }
  d.setHours(h, m, 0, 0); return d.getTime();
}
/* corre al día hábil más cercano (lun-vie): hacia adelante para hitos futuros, hacia atrás para pasados */
function laborable(ts, atras = false) {
  const d = new Date(ts); let dw = d.getDay();
  while (dw === 0 || dw === 6) { d.setDate(d.getDate() + (atras ? -1 : 1)); dw = d.getDay(); }
  return d.getTime();
}
/* hoy a cierta hora, pero nunca en el futuro */
const hoyA = (h, m = 0, margenMin = 25) => Math.min(laborable(dia(0, h, m), true), Date.now() - margenMin * 6e4);

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
const MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_L = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const fCorta = ts => { const d = new Date(ts); return `${d.getDate()} ${MESES[d.getMonth()]}`; };
const fMedia = ts => { const d = new Date(ts); return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`; };
const fLarga = ts => { const d = new Date(ts); return `${DIAS_L[d.getDay()]} ${d.getDate()} de ${MESES_L[d.getMonth()]}`; };
const fMes = ts => { const d = new Date(ts); return `${MESES_L[d.getMonth()]} ${d.getFullYear()}`; };
const hora = ts => { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const fHora = ts => `${fCorta(ts)}, ${hora(ts)}`;
const fISO = ts => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const deISO = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1).getTime(); };
function hace(ts) {
  const s = Date.now() - ts;
  if (s < 6e4) return 'hace un momento';
  if (s < HORA) return `hace ${Math.floor(s / 6e4)} min`;
  const dd = Math.round((inicioDia(Date.now()) - inicioDia(ts)) / DIA);
  if (dd <= 0) return `hace ${Math.floor(s / HORA)} h`;
  if (dd === 1) return 'ayer, ' + hora(ts);
  if (dd < 7) return `hace ${dd} días`;
  return fCorta(ts);
}
function enDias(ts) {
  const dd = Math.round((inicioDia(ts) - HOY) / DIA);
  if (dd === 0) return 'hoy';
  if (dd === 1) return 'mañana';
  if (dd === -1) return 'ayer';
  return dd > 0 ? `en ${dd} días` : `hace ${-dd} días`;
}
const diasEntre = (a, b) => Math.round((inicioDia(b) - inicioDia(a)) / DIA);

/* ---------- formatos (soles con coma de miles, como en sus documentos) ---------- */
const NB = ' ';
const soles = n => 'S/' + NB + Math.round(+n || 0).toLocaleString('en-US');
const num = n => Math.round(+n || 0).toLocaleString('en-US');
const pct = (n, d = 1) => (+n || 0).toFixed(d) + NB + '%';
const pctE = n => Math.round(+n || 0) + NB + '%';
const signo = (n, d = 1) => { const v = Math.round((+n || 0) * 10 ** d) / 10 ** d; return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d); };

/* ---------- catálogos de la obra ---------- */
const ETAPAS = [
  { k: 'ingenieria', n: 'Ingeniería', d: [0, .15] },
  { k: 'aprobacion', n: 'Aprobación de materiales', d: [.08, .25] },
  { k: 'suministro', n: 'Suministro', d: [.15, .62] },
  { k: 'instalacion', n: 'Instalación', d: [.25, .86] },
  { k: 'pruebas', n: 'Pruebas y protocolos', d: [.45, .94] },
  { k: 'entrega', n: 'Entrega y capacitación', d: [.9, 1] },
  { k: 'garantia', n: 'Garantía', d: [1, 1] },
];
const ETAPA = Object.fromEntries(ETAPAS.map((e, i) => [e.k, { ...e, i }]));

const SIS = {
  cab: { n: 'Cableado estructurado y fibra óptica', c: 'Cableado y fibra' },
  cctv: { n: 'Videovigilancia CCTV / VMS', c: 'CCTV / VMS' },
  lle: { n: 'Llamada de enfermeras IP', c: 'Llamada de enfermeras' },
  tel: { n: 'Telefonía IP', c: 'Telefonía IP' },
  per: { n: 'Perifoneo y audio de evacuación', c: 'Perifoneo' },
  bms: { n: 'BMS · gestión del edificio', c: 'BMS' },
  dc: { n: 'Data center y gabinetes', c: 'Data center' },
  acc: { n: 'Control de acceso', c: 'Control de acceso' },
  rel: { n: 'Relojes IP', c: 'Relojes IP' },
  inc: { n: 'Detección y alarma de incendios', c: 'Detección de incendios' },
  con: { n: 'Conectividad y seguridad informática', c: 'Conectividad' },
  rad: { n: 'Radioenlace entre sedes', c: 'Radioenlace' },
  pla: { n: 'Reconocimiento de placas', c: 'Placas' },
  ene: { n: 'Energía y UPS', c: 'Energía y UPS' },
  cli: { n: 'Climatización de precisión', c: 'Climatización' },
  ext: { n: 'Extinción por agente limpio', c: 'Extinción' },
  eva: { n: 'Audio de evacuación', c: 'Audio de evacuación' },
  mon: { n: 'Monitoreo ambiental', c: 'Monitoreo' },
  cont: { n: 'Gabinetes y contención de pasillo', c: 'Gabinetes' },
  intg: { n: 'Integración con BMS', c: 'Integración BMS' },
};

/* actividades que el técnico reporta por cantidad: [id, nombre, unidad, peso dentro del sistema en %].
   El avance del frente sale del metrado, no de lo que el técnico estime. */
const ACTIVIDADES = {
  cab: [['tendido', 'Tendido de cable', 'puntos', 35], ['conector', 'Conectorizado y rotulado', 'puntos', 25], ['cert', 'Certificación', 'puntos', 15], ['bandeja', 'Montaje de bandeja', 'm', 15], ['fusion', 'Fusión de fibra', 'hilos', 10]],
  cctv: [['tendido', 'Tendido a puntos de cámara', 'puntos', 25], ['montaje', 'Montaje y conexión de cámaras', 'cámaras', 40], ['config', 'Configuración en el software de video', 'cámaras', 20], ['pruebas', 'Pruebas de cobertura', 'cámaras', 15]],
  lle: [['tuberia', 'Cajas y tubería', 'camas', 25], ['pulsadores', 'Pulsadores y terminales', 'camas', 45], ['estaciones', 'Estaciones de enfermería', 'estaciones', 30]],
  tel: [['instalacion', 'Instalación de teléfonos', 'anexos', 60], ['config', 'Configuración de anexos', 'anexos', 40]],
  per: [['parlantes', 'Montaje de parlantes', 'parlantes', 50], ['zonas', 'Cableado de zonas', 'zonas', 30], ['ajuste', 'Ajuste de niveles', 'zonas', 20]],
  bms: [['controladores', 'Montaje de controladores', 'controladores', 40], ['puntos', 'Cableado de puntos de control', 'puntos', 40], ['programacion', 'Programación', 'puntos', 20]],
  dc: [['gabinetes', 'Montaje de gabinetes', 'gabinetes', 40], ['energia', 'Energía y UPS', 'gabinetes', 30], ['orden', 'Ordenamiento y rotulado', 'gabinetes', 30]],
  acc: [['lectoras', 'Montaje de lectoras y cerraduras', 'puertas', 55], ['config', 'Enrolamiento y configuración', 'puertas', 45]],
  rel: [['montaje', 'Montaje de relojes', 'relojes', 60], ['sincro', 'Sincronización y pruebas', 'relojes', 40]],
  inc: [['detectores', 'Montaje de detectores y pulsadores', 'dispositivos', 55], ['lazos', 'Cableado de lazos', 'lazos', 25], ['panel', 'Panel y pruebas de lazo', 'lazos', 20]],
  con: [['equipos', 'Montaje de switches y access points', 'equipos', 55], ['config', 'Configuración de red', 'equipos', 45]],
  rad: [['enlaces', 'Montaje de enlaces y mástiles', 'enlaces', 60], ['alineamiento', 'Alineamiento y pruebas', 'enlaces', 40]],
};
const actividadesDe = k => ACTIVIDADES[k] || [['avance', 'Avance de instalación', 'unidades', 100]];
/* metrado por defecto (proyectos nuevos); cada obra puede traer el suyo en sistema.med */
const MED_BASE = {
  cab: { puntos: 800, m: 1600, hilos: 144 }, cctv: { puntos: 120, cámaras: 120 }, lle: { camas: 150, estaciones: 6 }, tel: { anexos: 300 },
  per: { parlantes: 200, zonas: 24 }, bms: { controladores: 16, puntos: 1500 }, dc: { gabinetes: 10 }, acc: { puertas: 40 }, rel: { relojes: 50 },
  inc: { dispositivos: 400, lazos: 12 }, con: { equipos: 60 }, rad: { enlaces: 4 },
};
function avancePorCantidad(p, k, actId, cant) {
  const s = (p.sistemas || []).find(z => z.k === k);
  const a = actividadesDe(k).find(x => x[0] === actId) || actividadesDe(k)[0];
  const total = ((s && s.med) || MED_BASE[k] || {})[a[2]] || 100;
  const n = Math.max(0, +cant || 0);
  return { inc: Math.round(Math.min(n, total) / total * a[3] * 10) / 10, total, unidad: a[2], peso: a[3], nombre: a[1], id: a[0], n };
}

/* protocolos de prueba que exige cada sistema (alimentan el dossier) */
const PROTOCOLOS = {
  cab: ['Certificación de cableado por piso', 'Prueba OTDR de la fibra óptica', 'Certificación de enlaces de backbone'],
  cctv: ['Prueba de cámaras: imagen, enfoque y cobertura', 'Prueba de grabación y retención', 'Prueba del software VMS y perfiles'],
  lle: ['Prueba de pulsadores de cama y baño', 'Prueba de estaciones de enfermería', 'Prueba de integración con telefonía'],
  tel: ['Prueba de anexos y troncales', 'Prueba de alimentación PoE'],
  per: ['Prueba de niveles de audio por zona', 'Prueba de mensajes de evacuación'],
  bms: ['Prueba de puntos de control', 'Prueba de alarmas y tendencias'],
  dc: ['Puesta a tierra de gabinetes', 'Prueba de UPS y climatización'],
  acc: ['Prueba de lectoras y cerraduras', 'Prueba de enrolamiento y reportes'],
  rel: ['Prueba de sincronización de relojes'],
  inc: ['Prueba de detectores y pulsadores', 'Prueba del panel y la secuencia de alarma'],
  con: ['Prueba de conectividad y VLAN', 'Prueba de cobertura Wi-Fi'],
  rad: ['Prueba de alineamiento y potencia del enlace'],
  pla: ['Prueba de lectura de placas'],
  ene: ['Prueba de transferencia de UPS', 'Prueba de autonomía de baterías'],
  cli: ['Prueba de climatización de precisión'],
  ext: ['Prueba de integridad del cuarto', 'Prueba del panel de extinción'],
  eva: ['Prueba de mensajes por zona'],
  mon: ['Prueba de sensores y alertas'],
  cont: ['Prueba de contención y flujo de aire'],
  intg: ['Prueba de integración con BMS'],
};

const CAT_DOSSIER = [
  { k: 'protocolos', n: 'Protocolos de prueba', d: 'Firmados por BTS y la supervisión' },
  { k: 'asbuilt', n: 'Planos as-built', d: 'Lo construido, sistema por sistema' },
  { k: 'fichas', n: 'Fichas técnicas aprobadas', d: 'Equipos y materiales aprobados' },
  { k: 'garantias', n: 'Certificados de garantía', d: 'Emitidos por los fabricantes' },
  { k: 'manuales', n: 'Manuales de operación y mantenimiento', d: 'Uno por sistema' },
  { k: 'actas', n: 'Actas', d: 'Inicio, materiales, término, pruebas y entrega' },
  { k: 'capacitacion', n: 'Constancias de capacitación', d: 'Personal del cliente capacitado' },
  { k: 'calibracion', n: 'Certificados de calibración', d: 'Equipos de medición usados en las pruebas' },
];
const CAT = Object.fromEntries(CAT_DOSSIER.map(c => [c.k, c]));

const PLANTILLAS = [
  {
    k: 'hospital', n: 'Sistemas especiales para hospital', ico: 'edificio', semanas: 40,
    d: 'Obras de salud con varios sistemas a la vez, supervisión de obra y dossier exigente.',
    sistemas: [['cab', 29, [.1, .85]], ['cctv', 18, [.2, .9]], ['lle', 14, [.22, .92]], ['tel', 8, [.25, .92]], ['per', 6, [.25, .88]], ['bms', 12, [.28, .95]], ['dc', 13, [.15, .8]]],
    opcionales: [['acc', 6, [.3, .9]], ['rel', 3, [.4, .9]], ['inc', 10, [.2, .9]]],
    pagos: [['Adelanto a la firma', 15], ['Ingeniería de detalle y fichas aprobadas', 10], ['Equipos y materiales en obra', 25], ['Avance de instalación al 50 %', 15], ['Instalación concluida', 15], ['Pruebas y protocolos aprobados', 10], ['Entrega, dossier de cierre y conformidad', 10]],
  },
  {
    k: 'cctv', n: 'CCTV y control de acceso', ico: 'camara', semanas: 16,
    d: 'Videovigilancia, accesos y su red: sedes, penales, bancos e industria.',
    sistemas: [['cctv', 48, [.1, .85]], ['acc', 27, [.15, .9]], ['con', 25, [.05, .75]]],
    opcionales: [['pla', 8, [.3, .9]], ['cab', 15, [.05, .7]]],
    pagos: [['Adelanto a la firma', 30], ['Equipos en obra', 30], ['Instalación concluida', 30], ['Pruebas, dossier y conformidad', 10]],
  },
  {
    k: 'dc', n: 'Data center', ico: 'capas', semanas: 20,
    d: 'Cuarto de datos o InRow: gabinetes, energía, clima, cableado y monitoreo.',
    sistemas: [['cont', 22, [.1, .8]], ['ene', 26, [.15, .85]], ['cli', 22, [.15, .85]], ['cab', 16, [.2, .8]], ['ext', 8, [.3, .9]], ['mon', 6, [.4, .9]]],
    opcionales: [['acc', 5, [.4, .9]], ['cctv', 5, [.4, .9]]],
    pagos: [['Adelanto a la firma', 20], ['Ingeniería aprobada', 10], ['Equipos en obra', 30], ['Instalación y puesta en marcha', 30], ['Pruebas, dossier y conformidad', 10]],
  },
  {
    k: 'incendios', n: 'Detección y extinción de incendios', ico: 'alerta', semanas: 18,
    d: 'Detección, alarma, audio de evacuación y extinción, con su integración.',
    sistemas: [['inc', 45, [.1, .85]], ['eva', 20, [.2, .9]], ['ext', 25, [.2, .9]], ['intg', 10, [.5, .95]]],
    opcionales: [['bms', 10, [.4, .95]]],
    pagos: [['Adelanto a la firma', 30], ['Equipos en obra', 30], ['Instalación concluida', 30], ['Pruebas, dossier y conformidad', 10]],
  },
];
const PLANTILLA = Object.fromEntries(PLANTILLAS.map(p => [p.k, p]));

/* ---------- fotos de la muestra (las reales de BTS, en versión liviana) ---------- */
const FOTOS = {
  'alt-aerea': { g: 'assets/img/alt-aerea-720.webp', m: 'assets/img/alt-aerea-360.webp', alt: 'Vista aérea del Hospital del Altiplano en obra' },
  'alt-torre': { g: 'assets/img/alt-torre-640.webp', m: 'assets/img/alt-torre-360.webp', alt: 'Torre de hospitalización del Hospital del Altiplano en obra, con grúa' },
  'alt-cubierta': { g: 'assets/img/alt-cubierta-640.webp', m: 'assets/img/alt-cubierta-360.webp', alt: 'Cubierta del bloque bajo del Hospital del Altiplano' },
  'cab-bandeja': { g: 'assets/img/cab-bandeja-720.webp', m: 'assets/img/cab-bandeja-360.webp', alt: 'Bandeja portacables con cable de red tendido y técnico trabajando' },
  'cab-mazos': { g: 'assets/img/cab-mazos-640.webp', m: 'assets/img/cab-mazos-360.webp', alt: 'Mazos de cable de red peinados y amarrados en bandeja' },
  'cab-montaje': { g: 'assets/img/cab-montaje-640.webp', m: 'assets/img/cab-montaje-360.webp', alt: 'Técnico montando la bandeja portacables en el falso cielo' },
  'cab-varillas': { g: 'assets/img/cab-varillas-640.webp', m: 'assets/img/cab-varillas-360.webp', alt: 'Cable de red tendido a lo largo de la bandeja del pasillo' },
  'cab-tendido': { g: 'assets/img/cab-tendido-640.webp', m: 'assets/img/cab-tendido-360.webp', alt: 'Mazos de cable de red recién tendidos y amarrados' },
  'drat': { g: 'assets/img/drat-720.webp', m: 'assets/img/drat-360.webp', alt: 'Sede de la Dirección Regional de Agricultura de Tacna' },
  'matucana': { g: 'assets/img/matucana-720.webp', m: 'assets/img/matucana-360.webp', alt: 'Vista aérea del Hospital de Contingencia de Matucana' },
  'yungay': { g: 'assets/img/yungay-720.webp', m: 'assets/img/yungay-360.webp', alt: 'Equipo de BTS en la obra del Hospital de Yungay' },
};
