/* =====================================================================
   Componentes: piezas que comparten las tres caras del portal
   ===================================================================== */
'use strict';

/* ---------- fotos (reales, subidas en la sesión o ilustraciones de muestra) ---------- */
function imgFoto(ref, tam = 'm', alt = '') {
  if (!ref) return '';
  if (String(ref).startsWith('ilus:')) return ilus(ref.slice(5));
  if (String(ref).startsWith('img:')) {
    const src = (S.imgs || {})[ref.slice(4)];
    return src ? `<img src="${src}" alt="${esc(alt || 'Foto subida desde la obra')}" loading="lazy" decoding="async">`
      : `<span style="display:grid;place-items:center;width:100%;height:100%;min-height:60px;background:var(--papel);color:var(--gris);font-size:11.5px;text-align:center;padding:6px">Foto guardada en otro navegador</span>`;
  }
  if (String(ref).startsWith('data:')) return `<img src="${ref}" alt="${esc(alt || 'Foto subida desde la obra')}" loading="lazy" decoding="async">`;
  const f = FOTOS[ref]; if (!f) return '';
  return `<img src="${tam === 'g' ? f.g : f.m}" alt="${esc(alt || f.alt)}" loading="lazy" decoding="async">`;
}
const altFoto = ref => (FOTOS[ref] && FOTOS[ref].alt) || (String(ref).startsWith('ilus:') ? (ILUS[ref.slice(5)] || {}).alt : 'Foto subida desde la obra');

/* ilustraciones de muestra (para observaciones sin foto real), en el estilo de pictogramas de la web de BTS */
const T = '#0E1217', G = '#8893A0', C = '#00AFEF', R = '#D92D20', V = '#1C7C4A';
const marcaMala = (cx, cy, rx, ry, txt, tx, ty) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${R}" stroke-width="2.5" stroke-dasharray="7 5"/><text x="${tx}" y="${ty}" text-anchor="middle" font-family="Public Sans,Segoe UI,sans-serif" font-weight="700" font-size="13" fill="#B42318" paint-order="stroke" stroke="#EEF2F5" stroke-width="4">${txt}</text>`;
const marcaBuena = (cx, cy, txt, tx, ty, anchor = 'end') => `<circle cx="${cx}" cy="${cy}" r="13" fill="${V}"/><path d="M${cx - 6} ${cy} l4.5 4.5 8-9" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><text x="${tx}" y="${ty}" text-anchor="${anchor}" font-family="Public Sans,Segoe UI,sans-serif" font-weight="700" font-size="12.5" fill="${V}" paint-order="stroke" stroke="#EEF2F5" stroke-width="4">${txt}</text>`;
function patch(rotulado) {
  const puertos = y => Array.from({ length: 12 }, (_, i) => `<rect x="${66 + i * 16}" y="${y}" width="11" height="8" rx="1" fill="${T}"/>`).join('');
  const cables = Array.from({ length: 12 }, (_, i) => { const x = 71.5 + i * 16, dx = rotulado ? (i - 5.5) * 1.2 : ((i * 37) % 23 - 11) * 1.8; return `<path d="M${x} 108 C ${x} 140, ${x + dx} 150, ${x + dx * 1.7} 215" stroke="${i % 4 === 0 ? C : G}" stroke-width="2.6" fill="none"/>`; }).join('');
  const cablesArr = Array.from({ length: 12 }, (_, i) => { const x = 71.5 + i * 16, dx = rotulado ? 0 : ((i * 29) % 19 - 9) * 1.6; return `<path d="M${x} 82 C ${x} 60, ${x + dx} 50, ${x + dx * 1.4} 10" stroke="${i % 3 === 0 ? C : G}" stroke-width="2.6" fill="none"/>`; }).join('');
  const etiquetas = rotulado ? `<rect x="61" y="69" width="198" height="9" fill="#FFFDF0" stroke="${T}" stroke-width=".8"/>` + Array.from({ length: 12 }, (_, i) => `<text x="${71.5 + i * 16}" y="76" font-family="JetBrains Mono,monospace" font-size="5.6" text-anchor="middle" fill="${T}">B1-${String(i + 1).padStart(2, '0')}</text>`).join('') + `<rect x="61" y="109" width="198" height="9" fill="#FFFDF0" stroke="${T}" stroke-width=".8"/>` + Array.from({ length: 12 }, (_, i) => `<text x="${71.5 + i * 16}" y="116" font-family="JetBrains Mono,monospace" font-size="5.6" text-anchor="middle" fill="${T}">B1-${String(i + 13).padStart(2, '0')}</text>`).join('') : '';
  return `<rect x="34" y="0" width="14" height="240" fill="#C9D3DB" stroke="${T}" stroke-width="1.5"/><rect x="272" y="0" width="14" height="240" fill="#C9D3DB" stroke="${T}" stroke-width="1.5"/>
    ${cablesArr}${cables}<rect x="52" y="66" width="216" height="56" rx="3" fill="#fff" stroke="${T}" stroke-width="2"/>
    <circle cx="44" cy="74" r="2.5" fill="${T}"/><circle cx="44" cy="114" r="2.5" fill="${T}"/><circle cx="279" cy="74" r="2.5" fill="${T}"/><circle cx="279" cy="114" r="2.5" fill="${T}"/>
    ${puertos(80)}${puertos(98)}${etiquetas}
    ${rotulado ? marcaBuena(292, 150, 'Rotulado', 300, 180) : marcaMala(160, 94, 124, 40, 'Sin rotular', 160, 156)}`;
}
function camara(bien) {
  const cono = bien ? `<path d="M52 52 L136 206 L222 206 Z" fill="rgba(0,175,239,.2)" stroke="${C}" stroke-width="1.5"/>` : `<path d="M52 52 L290 34 L290 128 Z" fill="rgba(0,175,239,.2)" stroke="${C}" stroke-width="1.5"/>`;
  return `<rect x="26" y="26" width="268" height="184" fill="#fff"/>
    ${cono}
    <path d="M26 26 H294 V210 H212 M150 210 H26 Z" fill="none" stroke="${T}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M150 210 A 56 56 0 0 1 204 156" fill="none" stroke="${G}" stroke-width="1.5" stroke-dasharray="4 4"/><line x1="150" y1="210" x2="150" y2="156" stroke="${T}" stroke-width="2.5"/>
    <rect x="196" y="70" width="70" height="28" rx="2" fill="#E3E8EC" stroke="${T}" stroke-width="1.5"/><text x="231" y="88" text-anchor="middle" font-family="Public Sans,sans-serif" font-size="10.5" fill="${T}">Admisión</text>
    <circle cx="52" cy="52" r="8" fill="${T}"/><circle cx="52" cy="52" r="3" fill="${C}"/>
    <text x="181" y="236" text-anchor="middle" font-family="Public Sans,sans-serif" font-size="10.5" fill="${T}">Puerta principal</text>
    ${bien ? marcaBuena(268, 186, 'Puerta cubierta', 252, 154) : marcaMala(181, 202, 44, 18, 'Sin cobertura', 98, 186)}`;
}
function tubo(fijo) {
  const techo = `<rect x="0" y="0" width="320" height="38" fill="#DCE2E7"/><line x1="0" y1="38" x2="320" y2="38" stroke="${T}" stroke-width="2"/>
    <line x1="0" y1="176" x2="320" y2="176" stroke="${G}" stroke-width="1.5" stroke-dasharray="8 6"/><text x="306" y="194" text-anchor="end" font-family="Public Sans,sans-serif" font-size="10.5" fill="#56616C">Falso cielo</text>`;
  if (!fijo) return techo + `<line x1="40" y1="38" x2="40" y2="66" stroke="${T}" stroke-width="1.5"/><line x1="280" y1="38" x2="280" y2="66" stroke="${T}" stroke-width="1.5"/>
    <path d="M16 70 Q 160 200 304 70" stroke="${G}" stroke-width="8" fill="none" stroke-linecap="round"/>${marcaMala(160, 132, 70, 30, 'Sin soportes', 160, 96)}`;
  const xs = [48, 104, 160, 216, 272];
  return techo + xs.map(x => `<line x1="${x}" y1="38" x2="${x}" y2="80" stroke="${T}" stroke-width="1.6"/><path d="M${x - 9} 74 Q ${x} 95 ${x + 9} 74" stroke="${T}" stroke-width="2.6" fill="none"/>`).join('')
    + `<line x1="16" y1="80" x2="304" y2="80" stroke="${G}" stroke-width="8" stroke-linecap="round"/>${marcaBuena(160, 128, 'Abrazaderas cada 1.5 m', 160, 158, 'middle')}`;
}
function tierra(con) {
  const gab = `<rect x="64" y="22" width="112" height="196" rx="3" fill="#fff" stroke="${T}" stroke-width="2"/>` + Array.from({ length: 9 }, (_, i) => `<rect x="76" y="${34 + i * 19}" width="88" height="13" fill="${i % 3 === 1 ? '#D7DDE3' : '#EEF2F5'}" stroke="${G}" stroke-width=".8"/>`).join('') + `<circle cx="168" cy="120" r="3" fill="${T}"/>`;
  const barra = `<rect x="222" y="150" width="78" height="13" fill="#C98B3A" stroke="${T}" stroke-width="1.5"/>` + [234, 252, 270, 288].map(x => `<circle cx="${x}" cy="156.5" r="2.6" fill="${T}"/>`).join('') + `<text x="261" y="182" text-anchor="middle" font-family="Public Sans,sans-serif" font-size="10.5" fill="#56616C">Barra de tierra</text>`;
  if (!con) return gab + barra + marcaMala(196, 186, 96, 30, 'Sin tierra', 196, 236);
  return gab + barra + `<path d="M172 204 C 205 214, 228 196, 234 158" stroke="${V}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M172 204 C 205 214, 228 196, 234 158" stroke="#E8C400" stroke-width="5" fill="none" stroke-dasharray="7 7"/>` + marcaBuena(214, 110, '2.1 Ω', 232, 114, 'start');
}
function bandeja(tapa) {
  const cuerpo = `<path d="M18 132 L302 96 L302 140 L18 178 Z" fill="#C9D3DB" stroke="${T}" stroke-width="2" stroke-linejoin="round"/>`;
  const cables = Array.from({ length: 7 }, (_, i) => `<path d="M22 ${136 + i * 5} L298 ${100 + i * 5}" stroke="${i % 2 ? '#8E7CC3' : '#A391D0'}" stroke-width="4" stroke-linecap="round"/>`).join('');
  const varillas = [70, 250].map(x => `<line x1="${x}" y1="0" x2="${x}" y2="${x === 70 ? 126 : 104}" stroke="${T}" stroke-width="1.6"/>`).join('');
  const tapaSvg = tapa ? `<path d="M14 128 L306 91 L306 101 L14 139 Z" fill="#AEB8C1" stroke="${T}" stroke-width="2" stroke-linejoin="round"/>` + marcaBuena(160, 196, 'Tapa instalada', 186, 200, 'start') : marcaMala(160, 140, 130, 36, 'Sin tapa', 160, 210);
  return varillas + cuerpo + (tapa ? '' : cables) + tapaSvg;
}
const ILUS = {
  'patch-sin': { alt: 'Ilustración: patch panel sin rotular', f: () => patch(false) },
  'patch-con': { alt: 'Ilustración: patch panel rotulado puerto por puerto', f: () => patch(true) },
  'camara-mal': { alt: 'Ilustración: la cámara del hall no cubre la puerta principal', f: () => camara(false) },
  'camara-bien': { alt: 'Ilustración: la cámara reorientada cubre la puerta principal', f: () => camara(true) },
  'tubo-suelto': { alt: 'Ilustración: tubería colgando sin soportes sobre el falso cielo', f: () => tubo(false) },
  'tubo-fijo': { alt: 'Ilustración: tubería fijada con abrazaderas al techo', f: () => tubo(true) },
  'tierra-sin': { alt: 'Ilustración: gabinete sin conexión a la barra de tierra', f: () => tierra(false) },
  'tierra-con': { alt: 'Ilustración: gabinete conectado a la barra de tierra', f: () => tierra(true) },
  'bandeja-sin': { alt: 'Ilustración: bandeja portacables sin tapa', f: () => bandeja(false) },
  'bandeja-tapa': { alt: 'Ilustración: bandeja portacables con la tapa instalada', f: () => bandeja(true) },
};
function ilus(nombre) {
  const x = ILUS[nombre]; if (!x) return '';
  return `<svg viewBox="0 0 320 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(x.alt)}" preserveAspectRatio="xMidYMid slice"><rect width="320" height="240" fill="#EEF2F5"/>${x.f()}<text x="10" y="232" font-family="JetBrains Mono,monospace" font-size="8.5" letter-spacing=".06em" fill="#56616C" paint-order="stroke" stroke="#EEF2F5" stroke-width="3">ILUSTRACIÓN DE MUESTRA</text></svg>`;
}
/* "después" de muestra para cada observación, por si el visitante no tiene una foto a la mano */
const DESPUES_MUESTRA = { 'OBS-024': 'ilus:bandeja-tapa', 'OBS-023': 'ilus:camara-bien', 'OBS-022': 'ilus:patch-con', 'OBS-020': 'cab-varillas' };

/* ---------- pequeñas piezas ---------- */
const avatar = (id, cls = '') => { const pr = persona(id); return `<span class="avatar ${pr.lado === 'cliente' ? 'c' : ''} ${cls}" aria-hidden="true">${esc(iniciales(pr.n))}</span>`; };
const nombreUsuario = u => u.n || persona(u.id).n;
const rolUsuario = u => u.rol || persona(u.id).rol;
const ladoUsuario = u => u.lado || persona(u.id).lado;
function estadoProyectoTexto(p) {
  if (p.estado === 'cerrado') return 'Obra entregada · en garantía';
  if (p.estado === 'entrega') return 'Obra en entrega';
  if (porIniciar(p)) return 'Obra por iniciar';
  return ['ingenieria','aprobacion'].includes(etapaPrincipal(p)) ? 'Obra iniciada · ' + ETAPA[etapaPrincipal(p)].n.toLowerCase() : 'Obra en ejecución';
}
function desvioTexto(d) {
  if (d <= -5) return 'Atraso: revisar plan de recuperación';
  if (d <= -1) return 'Atraso leve';
  if (d < 1) return 'En plazo';
  return 'Adelantado al programa';
}
function insignia(cls, texto, icono) { return `<span class="insignia ${cls}">${icono ? ico(icono) : ''}${esc(texto)}</span>`; }

/* ---------- rótulo de obra (la cartela del plano) ---------- */
function rotuloHTML(p, { foto = true } = {}) {
  const a = avanceHoy(p), cerr = p.estado === 'cerrado';
  const fotoHTML = !foto ? '' : p.foto
    ? `<figure class="rotulo-foto"><img src="${FOTOS[p.foto].g}" alt="${esc(FOTOS[p.foto].alt)}" decoding="async"><figcaption>${p.fotoF ? 'Última toma · ' + fCorta(p.fotoF) : esc(p.ubicacion)}</figcaption><button type="button" data-a="ver-foto" data-ref="${p.foto}" data-titulo="${esc(p.nombre)}" aria-label="Ampliar la foto de la obra"></button></figure>`
    : `<figure class="rotulo-foto" style="background:var(--papel)"><div style="position:absolute;inset:0;display:grid;place-items:center;color:var(--gris);text-align:center;padding:16px;font-size:13.5px">${ico('camara', 'g')}<span style="display:block;margin-top:6px">Las fotos llegan con los primeros partes de obra</span></div></figure>`;
  const cifras = cerr
    ? `<div class="rc rc-cifra real"><span class="etq">Avance</span><div class="cifra">100<small>%</small></div><div class="rc-nota">Obra recibida</div></div>
       <div class="rc rc-cifra"><span class="etq">Garantía hasta</span><div class="cifra" style="font-size:22px">${fMedia(p.garantia.hasta)}</div><div class="rc-nota">${diasEntre(HOY, p.garantia.hasta)} días por delante</div></div>
       <div class="rc rc-cifra"><span class="etq">Dossier de cierre</span><div class="cifra">100<small>%</small></div><div class="rc-nota">Entregado el ${fCorta(p.dossierEntregado)}</div></div>`
    : `<div class="rc rc-cifra real"><span class="etq">Avance real</span><div class="cifra">${a.real.toFixed(1)}<small>%</small></div><div class="barra-avance" aria-hidden="true"><i style="width:${clamp(a.real, 0, 100)}%"></i></div></div>
       <div class="rc rc-cifra"><span class="etq">Programado a hoy</span><div class="cifra">${a.prog.toFixed(1)}<small>%</small></div><div class="rc-nota">${porIniciar(p) ? 'Inicia el ' + fCorta(p.inicio) : `Semana ${Math.min(semanaN(p), Math.max(p.semanas, semanaN(p)))} de ${p.semanas}`}</div></div>
       <div class="rc rc-cifra"><span class="etq">Desvío</span><div class="cifra ${a.desvio <= -1 ? 'texto-aviso' : a.desvio >= 1 ? 'texto-ok' : ''}">${signo(a.desvio)}<small> pts</small></div><div class="rc-nota">${desvioTexto(a.desvio)}</div></div>`;
  return `<section class="rotulo" aria-label="Datos de la obra">
    <div class="rotulo-datos">
      <div class="rc rc-obra"><span class="etq cian">${estadoProyectoTexto(p)}</span><h2>${esc(p.nombre)}</h2><p>${esc(p.alcance)}</p></div>
      <div class="rc rc-logo"><span class="etq">${esc(p.rolBts || 'Contratista')}</span><img src="assets/img/logo-480.webp" width="480" height="178" alt="BTS Perú"></div>
      <div class="rc rc-dos rc-ancho-m"><span class="etq">Cliente</span><div class="rc-v">${esc(p.cliente)}</div></div>
      <div class="rc"><span class="etq">${p.entidad ? 'Entidad' : 'Sector'}</span><div class="rc-v">${esc(p.entidad || p.sector || '—')}</div></div>
      <div class="rc"><span class="etq">Ubicación</span><div class="rc-v">${esc(p.ubicacion || '—')}</div></div>
      <div class="rc"><span class="etq">Código</span><div class="rc-v mono">${esc(p.codigo)}</div></div>
      <div class="rc"><span class="etq">${cerr ? 'Entregada' : 'Entrega prevista'}</span><div class="rc-v mono">${fMedia(cerr ? p.entrega : finProyecto(p))}</div>${p.notaPlazo && !cerr ? `<div class="rc-nota" style="font-size:12px;color:var(--gris);margin-top:3px">${esc(p.notaPlazo)}</div>` : ''}</div>
      ${cifras}
    </div>
    ${fotoHTML}
  </section>`;
}

/* ---------- etapas ---------- */
function fechasEtapa(p, k) {
  const e = ETAPA[k];
  if (k === 'garantia') return p.estado === 'cerrado' ? `hasta ${fCorta(p.garantia.hasta)} ${new Date(p.garantia.hasta).getFullYear()}` : `${p.garantiaMeses || 24} meses`;
  const ini = laborable(sumarDias(p.inicio, Math.round(e.d[0] * p.semanas * 7)));
  const fin = e.d[1] >= 1 ? finProyecto(p) : laborable(sumarDias(p.inicio, Math.round(e.d[1] * p.semanas * 7)), true);
  return `${fCorta(ini)} – ${fCorta(fin)}`;
}
function etapasHTML(p, { nota = true } = {}) {
  const prin = porIniciar(p) ? null : etapaPrincipal(p);
  const items = ETAPAS.map(e => {
    const st = (p.etapas || {})[e.k] || { e: 'pendiente' };
    const cls = st.e === 'hecha' ? 'hecha' : st.e === 'curso' ? 'curso' : 'pendiente';
    const barra = st.e === 'hecha' ? 100 : st.e === 'curso' ? (st.a || 4) : 0;
    const estadoSr = cls === 'hecha' ? 'completada' : cls === 'curso' ? 'en curso' : 'pendiente';
    return `<li class="etapa ${cls}${prin === e.k ? ' principal' : ''}">
      <div class="etapa-barra" aria-hidden="true"><i style="width:${barra}%"></i></div>
      <div class="etapa-cab"><span class="etapa-marca" aria-hidden="true">${cls === 'hecha' ? ico('check') : ''}</span><span class="etapa-n">${e.n}<span class="sr"> (${estadoSr})</span></span></div>
      <div class="etapa-f">${fechasEtapa(p, e.k)}</div>
      ${cls === 'curso' && st.a != null && e.k !== 'garantia' ? `<div class="etapa-p">${st.a} % avanzado</div>` : ''}
    </li>`;
  }).join('');
  const notaHTML = !nota ? '' : p.avisos
    ? `<p class="etapas-nota">${ico('correo')}<span>Cuando la obra cambia de etapa, BTS avisa por correo a ${plural(usuariosCliente(p).length, 'persona', 'personas')} del cliente.</span></p>` : '';
  return `<ol class="etapas" aria-label="Etapas de la obra">${items}</ol>${notaHTML}`;
}
const usuariosCliente = p => (p.usuarios || []).filter(u => ladoUsuario(u) === 'cliente');

/* ---------- avance por sistema ---------- */
function sistemasHTML(p, { detalle = true } = {}) {
  const w = semanaHoy(p), cerr = p.estado === 'cerrado';
  const filas = p.sistemas.map(s => {
    const prog = cerr ? 100 : planSistema(s, w);
    const dif = s.real - prog;
    const cls = dif <= -10 ? 'critico' : dif <= -5 ? 'atraso' : '';
    const nota = s.nota && s.real < 100 ? `<p class="sis-nota ${s.nota.t === 'alerta' ? 'alerta' : ''}">${ico('alerta')}<span>${esc(conFechas(s.nota.x))}</span></p>` : '';
    return `<div class="sis${p.recienSis === s.k && Date.now() - (p.recienTs || 0) < 15000 ? ' destacado' : ''}">
      <div class="sis-nombre">${esc(SIS[s.k].n)}${detalle && s.det ? `<small>${esc(s.det)}</small>` : ''}</div>
      <div class="sis-pista" role="img" aria-label="${esc(SIS[s.k].c)}: ${pctE(s.real)} real, ${pctE(prog)} programado a hoy"><i class="sis-real ${cls}" style="width:${clamp(s.real, 0, 100)}%"></i>${cerr ? '' : `<i class="sis-prog" style="left:${clamp(prog, 0, 100)}%"></i>`}</div>
      <div class="sis-v">${pctE(s.real)}${cerr ? '' : `<small>${Math.round(dif) === 0 ? 'en plazo' : (dif > 0 ? '+' : '−') + Math.abs(Math.round(dif)) + ' pts'}</small>`}</div>
      ${nota}
    </div>`;
  }).join('');
  const ley = cerr ? '' : `<div class="leyenda-sis" aria-hidden="true"><span><i class="k-real"></i>Avance real</span><span><i class="k-prog"></i>Programado a hoy</span><span><i class="k-atraso"></i>Atraso de 5 puntos o más</span></div>`;
  return `<div class="sistemas">${filas}</div>${ley}`;
}

/* ---------- curva S (SVG propio, se dibuja al ancho real del contenedor) ---------- */
const CURVAS_TEMP = {};
function curvaHTML(p, { alto = 250, mini = false, tabla = true } = {}) {
  const a = avanceHoy(p);
  const desc = p.estado === 'cerrado' ? `Curva S de ${p.nombre}: obra terminada al 100 %.` : `Curva S de ${p.nombre}: avance real ${pct(a.real)} contra ${pct(a.prog)} programado a hoy.`;
  let t = '';
  if (tabla) {
    const filas = [];
    const ultimo = p.estado === 'cerrado' ? p.semanas : Math.max(p.semanas, Math.ceil(semanaHoy(p)));
    for (let w = 1; w <= ultimo; w++) {
      const real = w < (p.serieReal || []).length ? p.serieReal[w] : null;
      filas.push(`<tr><td class="num">${w}</td><td>${fCorta(sumarDias(p.inicio, (w - 1) * 7))}</td><td class="num">${pct(planProyecto(p, w))}</td><td class="num">${real == null ? '—' : pct(real)}</td></tr>`);
    }
    t = `<details class="tabla-ver"><summary>Ver los valores semana por semana</summary><div class="tabla-scroll"><table class="tabla"><thead><tr><th scope="col">Semana</th><th scope="col">Desde</th><th scope="col" class="der">Programado</th><th scope="col" class="der">Real</th></tr></thead><tbody>${filas.join('')}</tbody></table></div></details>`;
  }
  const conReal = (p.serieReal || []).length > 1 || realProyecto(p) > 0;
  return `<div class="curva-cab"><div class="leyenda" aria-hidden="true">${conReal ? '<span><i class="k"></i>Real</span>' : ''}<span><i class="k prog"></i>Programado</span></div>${mini ? '' : `<span class="etq">Avance acumulado</span>`}</div>
    <div class="curva" data-curva="${p.id}" data-alto="${alto}" ${mini ? 'data-mini="1"' : ''} tabindex="0" role="group" aria-label="${esc(desc)} Use las flechas izquierda y derecha para recorrer las semanas."></div>${t}`;
}
function dibujarCurvas() {
  $$('[data-curva]').forEach(el => {
    const p = CURVAS_TEMP[el.dataset.curva] || proy(el.dataset.curva);
    if (!p || !el.isConnected) return;
    const W = Math.max(260, Math.round(el.clientWidth || 600));
    const mini = !!el.dataset.mini, H = +el.dataset.alto || 250;
    const m = { l: 40, r: mini ? 16 : 70, t: 24, b: 28 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const cerr = p.estado === 'cerrado';
    const wHoy = cerr ? p.semanas : semanaHoy(p);
    const xMax = Math.max(p.semanas, cerr ? p.semanas : Math.ceil(wHoy + .4));
    const X = w => m.l + (clamp(w, 0, xMax) / xMax) * iw;
    const Y = v => m.t + ih - (clamp(v, 0, 100) / 100) * ih;
    let dPlan = '';
    for (let i = 0; i <= 200; i++) { const w = xMax * i / 200; dPlan += (i ? 'L' : 'M') + X(w).toFixed(1) + ' ' + Y(planProyecto(p, w)).toFixed(1); }
    const pts = (p.serieReal || []).map((v, w) => [w, v]);
    const realHoy = realProyecto(p);
    const mostrarHoy = !cerr && wHoy > 0;
    if (mostrarHoy && wHoy > (pts.length ? pts[pts.length - 1][0] : -1)) pts.push([wHoy, realHoy]);
    const dReal = pts.map(([w, v], i) => (i ? 'L' : 'M') + X(w).toFixed(1) + ' ' + Y(v).toFixed(1)).join('');
    const dArea = pts.length > 1 ? `${dReal}L${X(pts[pts.length - 1][0]).toFixed(1)} ${Y(0)}L${X(0)} ${Y(0)}Z` : '';
    let rej = '';
    [0, 25, 50, 75, 100].forEach(v => { rej += `<line class="rejilla-l" x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}"/><text class="t-eje" x="${m.l - 8}" y="${Y(v) + 3.5}" text-anchor="end">${v}%</text>`; });
    let marcas = '', ultX = -99;
    const d0 = new Date(p.inicio); const d = new Date(d0.getFullYear(), d0.getMonth() + 1, 1);
    const finTs = p.inicio + xMax * SEMANA;
    const paso = iw < 360 ? 2 : 1; let k = 0;
    while (d.getTime() <= finTs) {
      const w = (d.getTime() - p.inicio) / SEMANA, xx = X(w);
      if (k % paso === 0 && xx - ultX > 26) { marcas += `<line class="eje" x1="${xx}" x2="${xx}" y1="${Y(0)}" y2="${Y(0) + 4}"/><text class="t-eje" x="${xx}" y="${Y(0) + 17}" text-anchor="middle">${MESES[d.getMonth()]}</text>`; ultX = xx; }
      d.setMonth(d.getMonth() + 1); k++;
    }
    let hoy = '';
    if (mostrarHoy) {
      const xh = X(wHoy), planHoy = planProyecto(p, wHoy);
      const arribaReal = realHoy >= planHoy;
      const der = xh + 8 + 86 < W;
      const anc = der ? 'start' : 'end', dx = der ? 9 : -9;
      /* etiquetas: la del valor mayor arriba; nunca encima del eje ni pegadas entre sí */
      const tope = m.t + 12, piso = Y(0) - 7;
      let yR = Y(realHoy) + (arribaReal ? -9 : 17), yP = Y(planHoy) + (arribaReal ? 15 : -8);
      yR = clamp(yR, tope, piso); yP = clamp(yP, tope, piso);
      let arriba = arribaReal ? yR : yP, abajo = arribaReal ? yP : yR;
      if (abajo - arriba < 15) { abajo = arriba + 15; if (abajo > piso) { abajo = piso; arriba = piso - 15; } }
      if (arribaReal) { yR = arriba; yP = abajo; } else { yP = arriba; yR = abajo; }
      hoy = `<line class="hoy" x1="${xh}" x2="${xh}" y1="${m.t - 4}" y2="${Y(0)}"/><text class="t-hoy" x="${xh}" y="${m.t - 9}" text-anchor="middle">HOY · S${Math.floor(wHoy) + 1}</text>
        <circle class="p-prog" cx="${xh}" cy="${Y(planHoy)}" r="4.5"/><circle class="p-real" cx="${xh}" cy="${Y(realHoy)}" r="5.5"/>
        <text class="t-valor g" x="${xh + dx}" y="${yP}" text-anchor="${anc}" paint-order="stroke" stroke="#fff" stroke-width="4">Prog. ${planHoy.toFixed(1)} %</text>
        <text class="t-valor" x="${xh + dx}" y="${yR}" text-anchor="${anc}" paint-order="stroke" stroke="#fff" stroke-width="4">Real ${realHoy.toFixed(1)} %</text>`;
      if (!mini && Math.abs(X(p.semanas) - xh) > 90) hoy += `<line class="eje" x1="${X(p.semanas)}" x2="${X(p.semanas)}" y1="${m.t - 4}" y2="${Y(0)}" stroke-dasharray="2 3"/><text class="t-eje" x="${X(p.semanas)}" y="${m.t - 9}" text-anchor="middle">ENTREGA</text>`;
    } else if (cerr) {
      hoy = `<circle class="p-real" cx="${X(p.semanas)}" cy="${Y(100)}" r="5.5"/><text class="t-valor" x="${X(p.semanas) - 9}" y="${Y(100) + 17}" text-anchor="end" paint-order="stroke" stroke="#fff" stroke-width="4">Entregada al 100 %</text>`;
    }
    el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">${rej}${marcas}<line class="eje" x1="${m.l}" x2="${W - m.r}" y1="${Y(0)}" y2="${Y(0)}"/>
      <path class="a-real" d="${dArea}"/><path class="l-prog" d="${dPlan}"/><path class="l-real" d="${dReal}"/>${hoy}
      <line class="cruz" x1="0" x2="0" y1="${m.t}" y2="${Y(0)}" visibility="hidden"/><rect class="zona-hover" x="${m.l}" y="${m.t}" width="${iw}" height="${ih}"/></svg>
      <div class="curva-tip" hidden></div><span class="sr" aria-live="polite"></span>`;
    el._geo = { p, X, Y, m, iw, xMax, wHoy, W, cerr };
    if (!el._enlazado) {
      el._enlazado = true;
      const mostrar = w => {
        const g = el._geo; if (!g) return;
        w = clamp(Math.round(w), 0, g.cerr ? g.p.semanas : Math.ceil(g.xMax));
        el._w = w;
        const serie = g.p.serieReal || [];
        const esHoy = !g.cerr && w > 0 && w === Math.ceil(g.wHoy) && w >= serie.length;
        const wx = esHoy ? g.wHoy : w;   /* la semana en curso se lee en la línea de hoy */
        const prog = planProyecto(g.p, wx);
        const real = w < serie.length ? serie[w] : esHoy ? realProyecto(g.p) : null;
        const cruz = el.querySelector('.cruz'); cruz.setAttribute('x1', g.X(wx)); cruz.setAttribute('x2', g.X(wx)); cruz.setAttribute('visibility', 'visible');
        const tip = el.querySelector('.curva-tip');
        const etq = w === 0 ? 'Inicio · ' + fCorta(g.p.inicio) : esHoy ? `Hoy · semana ${w}` : `Fin de la semana ${w} · ${fCorta(sumarDias(g.p.inicio, w * 7 - 3))}`;
        tip.innerHTML = `<span class="fecha">${etq}</span><div><b>${pct(prog)}</b> <span class="lk prog"></span>programado</div>${real != null ? `<div><b>${pct(real)}</b> <span class="lk"></span>real</div>` : '<div style="color:#AAB4BE">Semana por venir</div>'}`;
        tip.hidden = false;
        const top = Math.min(g.Y(prog), real != null ? g.Y(real) : 999) - 12;
        tip.style.left = clamp(g.X(wx), 90, g.W - 90) + 'px';
        tip.style.top = Math.max(46, top) + 'px';
        el.querySelector('.sr').textContent = `${etq.replace(' · ', ', ')}: programado ${pct(prog)}${real != null ? ', real ' + pct(real) : ', semana por venir'}.`;
      };
      const ocultar = () => { const t = el.querySelector('.curva-tip'); if (t) t.hidden = true; const c = el.querySelector('.cruz'); if (c) c.setAttribute('visibility', 'hidden'); };
      el.addEventListener('pointermove', ev => { const g = el._geo; if (!g) return; const r = el.getBoundingClientRect(); const px = ev.clientX - r.left; if (px < g.m.l - 6 || px > g.m.l + g.iw + 6) return ocultar(); mostrar((px - g.m.l) / g.iw * g.xMax); });
      el.addEventListener('pointerleave', ocultar);
      el.addEventListener('blur', ocultar);
      el.addEventListener('focus', () => mostrar(el._w != null ? el._w : el._geo.cerr ? el._geo.p.semanas : Math.ceil(el._geo.wHoy)));
      el.addEventListener('keydown', ev => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(ev.key)) return;
        ev.preventDefault(); const g = el._geo; let w = el._w != null ? el._w : Math.ceil(g.wHoy);
        w = ev.key === 'ArrowLeft' ? w - 1 : ev.key === 'ArrowRight' ? w + 1 : ev.key === 'Home' ? 0 : g.xMax; mostrar(w);
      });
    }
  });
}

/* ---------- hitos ---------- */
const ICO_HITO = { prueba: 'portapapeles', suministro: 'capas', pago: 'moneda', entrega: 'bandera', documento: 'documento', instalacion: 'herramienta' };
function hitosHTML(p, n = 5) {
  const lista = (p.hitos || []).filter(h => h.f >= HOY - 2 * DIA || h.atrasado).sort((a, b) => a.f - b.f).slice(0, n);
  if (!lista.length) return `<div class="vacio">${ico('calendario')}No hay hitos próximos.</div>`;
  return `<ul class="lista">${lista.map(h => {
    const d = new Date(h.f); const vencido = h.f < HOY;
    const reprog = h.antes ? `<span class="texto-aviso">Reprogramado; antes era el ${fCorta(h.antes)}.</span> ` : '';
    return `<li class="fila"><div class="fecha-caja ${vencido || h.antes ? 'aviso' : ''}"><b>${d.getDate()}</b><span>${MESES[d.getMonth()]}</span></div>
      <div class="fila-cuerpo"><div class="fila-t">${esc(h.t)}</div><div class="fila-s">${reprog}${vencido ? '<span class="texto-alerta">Vencido ' + enDias(h.f) + '</span>' : enDias(h.f).replace(/^./, c => c.toUpperCase())}${h.sis ? ' · ' + esc(SIS[h.sis].c) : ''}</div></div>
      <span class="fila-ico" aria-hidden="true">${ico(ICO_HITO[h.tipo] || 'bandera')}</span></li>`;
  }).join('')}</ul>`;
}

/* ---------- galería ---------- */
function fotoTile(f, extra = '') {
  return `<button type="button" class="foto" data-a="ver-foto" data-ref="${esc(f.src)}" data-titulo="${esc(f.t)}" data-meta="${esc(`${fCorta(f.f)} · ${f.zona}${f.sis ? ' · ' + SIS[f.sis].c : ''}`)}">
    <span class="foto-img">${imgFoto(f.src, 'm', f.t)}</span>
    <span class="foto-pie"><b>${esc(f.t)}</b><span>${fCorta(f.f)} · ${esc(f.zona)}</span></span>${extra}</button>`;
}

/* ---------- observaciones ---------- */
function estadoObs(o, rol) {
  if (o.estado === 'cerrada') return { cls: 'cerrada', ins: insignia('ok', 'Cerrada', 'check') };
  if (o.estado === 'levantada') return { cls: 'levantada', ins: insignia('info', rol === 'cliente' ? 'Levantada · espera su conformidad' : 'Levantada · espera conformidad del cliente') };
  if (o.estado === 'revision' && rol !== 'cliente') return { cls: 'revision', ins: insignia('aviso', 'Levantada por el técnico · por aprobar', 'reloj') };
  return { cls: 'abierta', ins: insignia('alerta', 'Abierta', 'alerta') };
}
function figuraAF(ref, etq, cls = '') {
  if (!ref) return `<div class="af sin">${etq === 'Antes' ? 'Registrada sin foto' : 'Sin foto'}</div>`;
  return `<figure class="af ${cls}"><button type="button" data-a="ver-foto" data-ref="${esc(ref)}" data-titulo="${etq}">${imgFoto(ref, 'm')}</button><figcaption>${etq}</figcaption></figure>`;
}
function obsHTML(o, rol) {
  const e = estadoObs(o, rol);
  const verCliente = rol === 'cliente' && o.estado === 'revision';
  const despues = (o.estado === 'abierta' || verCliente) ? '' : figuraAF(o.despues, 'Después', 'despues');
  const fotos = (o.antes || o.despues) ? `<div class="obs-fotos">${figuraAF(o.antes, 'Antes')}${despues}</div>` : '';
  let acc = '';
  if (rol === 'cliente' && o.estado === 'levantada') acc = `<button type="button" class="btn btn-ok btn-chico" data-a="obs-conforme" data-id="${o.id}">${ico('check')}Dar conformidad</button><button type="button" class="btn btn-linea btn-chico" data-a="obs-sigue" data-id="${o.id}">Sigue observada</button>`;
  if (rol === 'bts' && o.estado === 'revision') acc = `<button type="button" class="btn btn-ok btn-chico" data-a="obs-aprobar" data-id="${o.id}">${ico('check')}Aprobar levantamiento</button><button type="button" class="btn btn-linea btn-chico" data-a="obs-rechazar" data-id="${o.id}">Devolver al técnico</button>`;
  const fechaTxt = o.estado === 'cerrada' ? `Cerrada el ${fCorta(o.cerrada)}` : o.estado === 'levantada' ? `Levantada el ${fCorta(o.levantada)}` : `Registrada ${hace(o.creada)}`;
  const nota = o.nota && (o.estado !== 'abierta') && !verCliente ? `<p class="obs-nota"><b>Levantamiento:</b> ${esc(o.nota)}</p>` : '';
  return `<article class="obs ${verCliente ? 'abierta' : e.cls}" id="obs-${o.id}">
    <div><div class="obs-cab"><span class="obs-cod">${o.id}</span>${verCliente ? insignia('alerta', 'Abierta', 'alerta') : e.ins}${o.prioridad && o.estado !== 'cerrada' ? `<span class="insignia neutra">Prioridad ${esc(o.prioridad.toLowerCase())}</span>` : ''}</div>
      <h3 class="obs-t">${esc(o.t)}</h3>
      <p class="obs-s"><span>${ico('pin')}${esc(o.zona)}</span><span>${esc(SIS[o.sis] ? SIS[o.sis].c : '')}</span><span>${ico('usuario')}${esc(o.origen === 'BTS' ? 'Registrada por BTS' : 'Registrada por la supervisión')}</span><span>${ico('reloj')}${fechaTxt}</span>${o.asignado && o.estado !== 'cerrada' ? `<span>${ico('casco')}${esc(persona(o.asignado).n)}</span>` : ''}</p></div>
    ${acc ? `<div class="obs-acc">${acc}</div>` : '<div></div>'}
    ${fotos}${nota}
  </article>`;
}

/* ---------- documentos ---------- */
const TIPO_DOC = {
  plano: { n: 'Planos', ico: 'plano', ok: 'Vigente' },
  ficha: { n: 'Fichas técnicas', ico: 'documento', ok: 'Aprobada' },
  acta: { n: 'Actas', ico: 'documento', ok: 'Firmada' },
  protocolo: { n: 'Protocolos de prueba', ico: 'portapapeles', ok: 'Aprobado' },
  informe: { n: 'Informes y valorizaciones', ico: 'grafico', ok: 'Firmado' },
};
function docHTML(d, rol) {
  const tp = TIPO_DOC[d.tipo];
  const est = d.estado === 'aprobado' ? insignia('ok', tp.ok, 'check') : d.estado === 'revision' ? insignia('aviso', rol === 'cliente' ? 'Espera su conformidad' : 'En revisión del cliente', 'reloj') : insignia('neutra', 'Pendiente');
  const meta = [d.cod ? `<span class="mono">${esc(d.cod)}</span>` : '', d.rev ? `<span>Rev. ${esc(d.rev)}</span>` : '', d.lam ? `<span>${d.lam} láminas</span>` : '', d.marca ? `<span>${esc(d.marca)}</span>` : '', d.res ? `<span>${esc(d.res)}</span>` : '', `<span>${fCorta(d.f)}</span>`].filter(Boolean).join('');
  const conformidad = rol === 'cliente' && d.estado === 'revision' ? `<button type="button" class="btn btn-ok btn-chico" data-a="doc-conformidad" data-id="${d.id}">${ico('check')}Dar conformidad</button>` : '';
  return `<div class="doc${d.clave && d.estado === 'revision' && rol === 'cliente' ? ' destacado' : ''}" id="doc-${d.id}">
    <span class="doc-ico" aria-hidden="true">${ico(tp.ico)}</span>
    <div style="min-width:0"><div class="doc-t">${esc(d.n)}</div><div class="doc-s">${meta}</div>${d.revAnt
      ? `<div class="doc-s">${d.estado === 'revision' ? `${d.nota ? esc(d.nota) + ' ' : ''}Mientras tanto rige la Rev. ${esc(d.revAnt)}.` : `Reemplazó a la Rev. ${esc(d.revAnt)}, que queda en el historial.`}</div>`
      : d.nota ? `<div class="doc-s">${esc(d.nota)}</div>` : ''}</div>
    <div class="doc-acc">${est}<button type="button" class="btn btn-linea btn-chico" data-a="ver-doc" data-id="${d.id}">${ico('ojo')}Ver</button>${conformidad}</div>
  </div>`;
}
function docsPorTipoHTML(pid, rol) {
  const docs = docsDe(pid);
  if (!docs.length) return `<div class="vacio">${ico('carpeta')}Todavía no hay documentos. Aparecen aquí apenas BTS los sube.</div>`;
  return Object.keys(TIPO_DOC).map(t => {
    const ds = docs.filter(d => d.tipo === t).sort((a, b) => (b.estado === 'revision') - (a.estado === 'revision') || b.f - a.f);
    if (!ds.length) return '';
    return `<section class="docs-cat"><div class="docs-cat-t">${ico(TIPO_DOC[t].ico)}<h3>${TIPO_DOC[t].n}</h3><span class="etq">${ds.length}</span></div>${ds.map(d => docHTML(d, rol)).join('')}</section>`;
  }).join('');
}

/* vista previa de un documento (hoja de muestra) */
const NORMAS = { cab: 'ANSI/TIA-568.2-D y TIA-606-C', cctv: 'IEC 62676 y ONVIF', lle: 'DIN VDE 0834 (llamada de enfermeras)', tel: 'SIP y PoE IEEE 802.3at', per: 'EN 54-16 y RNE A.130', bms: 'BACnet (ISO 16484-5)', dc: 'ANSI/TIA-942-B y TIA-607-D', inc: 'NFPA 72 y RNE A.130', con: 'IEEE 802.3 y 802.11ax', acc: 'OSDP', rel: 'NTP / PTP', rad: 'ITU-R', ext: 'NFPA 2001', ene: 'IEC 62040', cli: 'ASHRAE TC 9.9' };
/* artículo del cliente: «el Consorcio…», «la Dirección…»; una razón social va sin artículo */
const articuloCliente = p => /^consorcio/i.test(p.cliente) ? 'el ' : /^(direcci[oó]n|municipalidad|universidad|cl[ií]nica|red )/i.test(p.cliente) ? 'la ' : '';
const delCliente = p => articuloCliente(p) + p.cliente;
const deCliente = p => (articuloCliente(p) === 'el ' ? 'del ' : 'de ' + articuloCliente(p)) + p.cliente;
/* ---------- planos de muestra: planta de un ala del hospital, con ejes, puertas y la simbología de cada sistema ---------- */
function planoSVG(d) {
  const id = 'pl-' + String(d.id || 'x').replace(/[^\w-]/g, '');
  const FS = 'font-family="Public Sans,Segoe UI,sans-serif"', FM = 'font-family="JetBrains Mono,monospace"';
  const halo = 'paint-order="stroke" stroke="#FBFCFD" stroke-width="3" stroke-linejoin="round"';
  const R2 = '#B42318';
  const f1 = n => (+n).toFixed(1);
  /* ejes del plano */
  const ejes = [['A', 30], ['B', 140], ['C', 250], ['D', 350]].map(([n, x]) => `<line x1="${x}" y1="16" x2="${x}" y2="219" stroke="#C3CCD4" stroke-width=".6" stroke-dasharray="5 3"/><circle cx="${x}" cy="9" r="6" fill="#fff" stroke="#8893A0" stroke-width=".8"/><text x="${x}" y="11.5" text-anchor="middle" ${FM} font-size="7" fill="#56616C">${n}</text>`).join('')
    + [['1', 22], ['2', 98], ['3', 140], ['4', 214]].map(([n, y]) => `<line x1="19" y1="${y}" x2="357" y2="${y}" stroke="#C3CCD4" stroke-width=".6" stroke-dasharray="5 3"/><circle cx="12" cy="${y}" r="6" fill="#fff" stroke="#8893A0" stroke-width=".8"/><text x="12" y="${y + 2.5}" text-anchor="middle" ${FM} font-size="7" fill="#56616C">${n}</text>`).join('');
  const leyenda = items => { let x = 0; return `<g transform="translate(30 231)">${items.map(([sim, txt]) => { const g = `<g transform="translate(${f1(x)} 0)">${sim}<text x="11" y="2.6" ${FS} font-size="7" fill="#3B4650">${txt}</text></g>`; x += 11 + txt.length * 3.55 + 16; return g; }).join('')}</g>`; };

  /* elevación de gabinetes (data center) */
  if (d.sis === 'dc') {
    const racks = Array.from({ length: 7 }, (_, i) => {
      const x = 44 + i * 44, eq = [[0, 4, '#E3E8EC'], [5, 2, C], [8, 4, '#E3E8EC'], [13, 2, C], [16, 4, '#E3E8EC'], [21, 2, T], [35, 6, '#56616C']];
      return `<rect x="${x}" y="40" width="36" height="150" fill="#fff" stroke="${T}" stroke-width="1.6"/>`
        + Array.from({ length: 7 }, (_, k) => `<line x1="${x + 3}" y1="${40 + (k + 1) * 150 / 7}" x2="${x + 33}" y2="${40 + (k + 1) * 150 / 7}" stroke="#D7DDE3" stroke-width=".6"/>`).join('')
        + eq.map(([u, n, col]) => `<rect x="${x + 4}" y="${f1(44 + u * 3.4)}" width="28" height="${f1(n * 3.4 - .8)}" fill="${col}" stroke="${T}" stroke-width=".5"/>`).join('')
        + `<text x="${x + 18}" y="201" text-anchor="middle" ${FM} font-size="7" fill="${T}">G-A${i + 1}</text>`;
    }).join('');
    return `<rect x="14" y="14" width="352" height="206" fill="none" stroke="#C3CCD4" stroke-width=".6" stroke-dasharray="5 3"/>
      <text x="44" y="30" ${FM} font-size="7.5" letter-spacing=".06em" fill="${T}">CUARTO DE DATOS 1 · ELEVACIÓN FRONTAL</text>
      <line x1="30" y1="190" x2="356" y2="190" stroke="${T}" stroke-width="2.4"/>${racks}
      <line x1="34" y1="40" x2="34" y2="190" stroke="#56616C" stroke-width=".7"/><line x1="31" y1="40" x2="37" y2="40" stroke="#56616C" stroke-width=".7"/><line x1="31" y1="190" x2="37" y2="190" stroke="#56616C" stroke-width=".7"/>
      <text x="0" y="0" transform="translate(28 115) rotate(-90)" text-anchor="middle" ${FM} font-size="6.5" fill="#56616C">42U · 2.00 m</text>
      ${leyenda([[`<rect x="0" y="-3" width="8" height="5" fill="#E3E8EC" stroke="${T}" stroke-width=".5"/>`, 'Patch panel'], [`<rect x="0" y="-3" width="8" height="5" fill="${C}" stroke="${T}" stroke-width=".5"/>`, 'Switch'], [`<rect x="0" y="-3" width="8" height="5" fill="${T}"/>`, 'Organizador de cables'], [`<rect x="0" y="-3" width="8" height="5" fill="#56616C" stroke="${T}" stroke-width=".5"/>`, 'UPS']])}`;
  }

  /* arquitectura del BMS */
  if (d.sis === 'bms') {
    const caja = (x, y, w, h, t, s, oscuro) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${oscuro ? T : '#fff'}" stroke="${T}" stroke-width="1.3"/><text x="${x + w / 2}" y="${y + h / 2 + (s ? -1 : 2.5)}" text-anchor="middle" ${FS} font-size="7.5" font-weight="700" fill="${oscuro ? '#fff' : T}">${t}</text>${s ? `<text x="${x + w / 2}" y="${y + h / 2 + 8}" text-anchor="middle" ${FM} font-size="6" fill="${oscuro ? '#C7CED5' : '#56616C'}">${s}</text>` : ''}`;
    const pisos = [70, 190, 310];
    return `${caja(150, 18, 80, 26, 'Servidor del BMS', 'Sala de control', true)}
      <line x1="190" y1="44" x2="190" y2="62" stroke="${C}" stroke-width="2"/><line x1="70" y1="62" x2="310" y2="62" stroke="${C}" stroke-width="2"/>
      <text x="236" y="58" ${FM} font-size="6.5" fill="#00739F" ${halo}>BACnet/IP</text>
      ${pisos.map((x, i) => `<line x1="${x}" y1="62" x2="${x}" y2="80" stroke="${C}" stroke-width="2"/>${caja(x - 34, 80, 68, 22, 'Switch piso ' + (i + 1), '')}
        <line x1="${x}" y1="102" x2="${x}" y2="122" stroke="${T}" stroke-width="1" stroke-dasharray="3 2"/><line x1="${x - 36}" y1="122" x2="${x + 36}" y2="122" stroke="${T}" stroke-width="1" stroke-dasharray="3 2"/>
        ${[-36, 0, 36].map((dx, k) => `<line x1="${x + dx}" y1="122" x2="${x + dx}" y2="134" stroke="${T}" stroke-width="1" stroke-dasharray="3 2"/>${caja(x + dx - 17, 134, 34, 18, 'DDC-' + String(i * 3 + k + 1).padStart(2, '0'), '')}
          ${[-8, 8].map(sx => `<line x1="${x + dx + sx}" y1="152" x2="${x + dx + sx}" y2="176" stroke="#8893A0" stroke-width=".8"/><circle cx="${x + dx + sx}" cy="180" r="4" fill="#fff" stroke="${T}" stroke-width="1"/>`).join('')}`).join('')}`).join('')}
      <text x="70" y="200" text-anchor="middle" ${FM} font-size="6.5" fill="#56616C">Sensores y actuadores por zona</text>
      ${leyenda([[`<line x1="0" y1="0" x2="8" y2="0" stroke="${C}" stroke-width="2"/>`, 'Red BACnet/IP'], [`<line x1="0" y1="0" x2="8" y2="0" stroke="${T}" stroke-width="1" stroke-dasharray="3 2"/>`, 'Bus MS/TP'], [`<circle cx="4" cy="0" r="3.2" fill="#fff" stroke="${T}"/>`, 'Sensor o actuador']])}`;
  }

  /* planta del ala: tres ambientes a cada lado del pasillo */
  const cuartos = [
    { k: 'u1', x: 30, y: 22, w: 110, h: 76, n: 'UCI 1', arriba: true }, { k: 'u2', x: 140, y: 22, w: 110, h: 76, n: 'UCI 2', arriba: true },
    { k: 'es', x: 250, y: 22, w: 100, h: 76, n: 'Enfermería', arriba: true },
    { k: 'de', x: 30, y: 140, w: 80, h: 74, n: 'Depósito' }, { k: 'ho', x: 110, y: 140, w: 140, h: 74, n: 'Hospitalización' },
    { k: 'cd', x: 250, y: 140, w: 100, h: 74, n: 'Cuarto de datos' },
  ];
  const pasillo = { k: 'pa', x: 30, y: 98, w: 320, h: 42 };
  const lejos = d.sis !== 'cctv';
  const muros = cuartos.map(c => {
    const a = c.x + c.w - 22, yp = c.arriba ? c.y + c.h : c.y, s = c.arriba ? -1 : 1;
    return `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" fill="#fff" stroke="${T}" stroke-width="2"/>
      <line x1="${a}" y1="${yp}" x2="${a + 14}" y2="${yp}" stroke="#fff" stroke-width="3.2"/>
      <line x1="${a}" y1="${yp}" x2="${a}" y2="${yp + s * 14}" stroke="${T}" stroke-width="1.1"/><path d="M${a} ${yp + s * 14} A14 14 0 0 ${c.arriba ? 1 : 0} ${a + 14} ${yp}" fill="none" stroke="#8893A0" stroke-width=".7" stroke-dasharray="2 2"/>
      <text x="${c.x + 6}" y="${(!!c.arriba !== lejos) ? c.y + c.h - 8 : c.y + 14}" ${FS} font-size="6.8" font-weight="600" letter-spacing=".04em" fill="#3B4650" ${halo}>${c.n.toUpperCase()}</text>`;
  }).join('');
  const clips = `<defs>${cuartos.concat(pasillo).map(c => `<clipPath id="${id}-${c.k}"><rect x="${c.x + 1}" y="${c.y + 1}" width="${c.w - 2}" height="${c.h - 2}"/></clipPath>`).join('')}</defs>`;
  const base = `${clips}${ejes}<rect x="${pasillo.x}" y="${pasillo.y}" width="${pasillo.w}" height="${pasillo.h}" fill="#F4F6F8"/>${muros}`;

  if (d.sis === 'cctv') {
    /* [n.º, x, y, ángulo, ambiente, ¿nueva en la Rev. C?] */
    const cams = [[1, 34, 26, 50, 'u1', 1], [2, 136, 26, 130, 'u1', 1], [3, 144, 26, 50, 'u2', 1], [4, 246, 26, 130, 'u2', 1], [5, 346, 26, 130, 'es'],
      [6, 34, 119, 0, 'pa'], [7, 346, 119, 180, 'pa'], [8, 34, 210, -50, 'de'], [9, 246, 210, -130, 'ho'], [10, 346, 210, -130, 'cd']];
    const cono = (x, y, ang, k) => {
      const r = { pa: 104, de: 46, cd: 52 }[k] || 58, ab = k === 'pa' ? 17 : 30, rad = g => g * Math.PI / 180;
      const p1 = [x + r * Math.cos(rad(ang - ab)), y + r * Math.sin(rad(ang - ab))], p2 = [x + r * Math.cos(rad(ang + ab)), y + r * Math.sin(rad(ang + ab))];
      return `<path clip-path="url(#${id}-${k})" d="M${x} ${y} L${f1(p1[0])} ${f1(p1[1])} A${r} ${r} 0 0 1 ${f1(p2[0])} ${f1(p2[1])} Z" fill="rgba(0,175,239,.16)" stroke="${C}" stroke-width=".9"/>`;
    };
    const camara = ([n, x, y, ang, k]) => {
      const der = Math.cos(ang * Math.PI / 180) >= 0, abajo = Math.sin(ang * Math.PI / 180) > 0.1, arribaC = Math.sin(ang * Math.PI / 180) < -0.1;
      const tx = k === 'pa' ? x + (der ? 2 : -2) : x + (der ? 7 : -7), ty = k === 'pa' ? y - 7 : abajo ? y + 4 : arribaC ? y - 2 : y - 6;
      return `<line x1="${x}" y1="${y}" x2="${f1(x + 7 * Math.cos(ang * Math.PI / 180))}" y2="${f1(y + 7 * Math.sin(ang * Math.PI / 180))}" stroke="${T}" stroke-width="1.4"/><circle cx="${x}" cy="${y}" r="3.4" fill="${T}"/><circle cx="${x}" cy="${y}" r="1.3" fill="${C}"/>
        <text x="${tx}" y="${ty}" text-anchor="${der ? 'start' : 'end'}" ${FM} font-size="6.3" fill="${T}" ${halo}>C-${String(n).padStart(2, '0')}</text>`;
    };
    const conRevC = d.rev === 'C';
    const nube = (x0, y0, x1, y1, s = 7) => {
      const pts = []; const lado = (ax, ay, bx, by) => { const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / s)); for (let i = 1; i <= n; i++) pts.push([ax + (bx - ax) * i / n, ay + (by - ay) * i / n]); };
      lado(x0, y0, x1, y0); lado(x1, y0, x1, y1); lado(x1, y1, x0, y1); lado(x0, y1, x0, y0);
      let dd = `M${x0} ${y0}`, prev = [x0, y0];
      pts.forEach(q => { const r = Math.hypot(q[0] - prev[0], q[1] - prev[1]) / 2; dd += ` A${f1(r)} ${f1(r)} 0 0 1 ${f1(q[0])} ${f1(q[1])}`; prev = q; });
      return `<path d="${dd}" fill="none" stroke="${R}" stroke-width=".9"/>`;
    };
    const delta = (x, y) => `<path d="M${x} ${y - 6} L${x + 6.5} ${y + 5} L${x - 6.5} ${y + 5} Z" fill="#fff" stroke="${R}" stroke-width=".9"/><text x="${x}" y="${y + 3.3}" text-anchor="middle" ${FM} font-size="6.5" fill="${R2}">C</text>`;
    return base + cams.map(c => cono(c[1], c[2], c[3], c[4])).join('') + cams.map(camara).join('')
      + `<text x="190" y="122" text-anchor="middle" ${FS} font-size="7.2" font-weight="600" letter-spacing=".05em" fill="#3B4650" ${halo}>PASILLO DE UCI</text>`
      + (conRevC ? nube(25, 19, 255, 40) + delta(266, 30) : '')
      + leyenda([[`<circle cx="4" cy="0" r="3.4" fill="${T}"/><circle cx="4" cy="0" r="1.3" fill="${C}"/>`, 'Cámara domo 4 MP · h 2.8 m'], [`<path d="M0 3 L4 -4 L8 3 Z" fill="rgba(0,175,239,.25)" stroke="${C}" stroke-width=".8"/>`, 'Cobertura'], conRevC ? [`<g transform="translate(4 0) scale(.75)">${delta(0, 0)}</g>`, 'Rev. C: cuatro cámaras más en UCI'] : null].filter(Boolean));
  }

  /* bandeja por el pasillo y salidas en cada ambiente; el símbolo cambia según el sistema */
  const fo = /^PL-FO/.test(d.cod || '');
  const SIMB = {
    cab: [(x, y) => `<rect x="${x - 3.5}" y="${y - 3.5}" width="7" height="7" fill="#fff" stroke="${T}" stroke-width="1.2"/><line x1="${x - 2}" y1="${y}" x2="${x + 2}" y2="${y}" stroke="${T}" stroke-width="1"/>`, 'Salida de datos (2 × Cat 6A)'],
    tel: [(x, y) => `<rect x="${x - 3.5}" y="${y - 3.5}" width="7" height="7" fill="#fff" stroke="${T}" stroke-width="1.2"/><circle cx="${x}" cy="${y}" r="1.4" fill="${T}"/>`, 'Teléfono IP (PoE)'],
    lle: [(x, y) => `<circle cx="${x}" cy="${y}" r="3.6" fill="#fff" stroke="${T}" stroke-width="1.2"/><circle cx="${x}" cy="${y}" r="1.4" fill="${R}"/>`, 'Pulsador de llamada'],
    per: [(x, y) => `<circle cx="${x}" cy="${y}" r="3.8" fill="#fff" stroke="${T}" stroke-width="1.2"/><path d="M${x - 2.3} ${y - 2.3} L${x + 2.3} ${y + 2.3} M${x + 2.3} ${y - 2.3} L${x - 2.3} ${y + 2.3}" stroke="${T}" stroke-width=".9"/>`, 'Parlante de techo'],
  };
  const [simb, simbTxt] = SIMB[d.sis] || SIMB.cab;
  const conSalidas = { lle: ['u1', 'u2', 'ho'] }[d.sis];
  const salidas = fo ? [] : cuartos.filter(c => !conSalidas || conSalidas.includes(c.k)).flatMap(c => [.3, .6].map(t => [c.x + c.w * t, c.arriba ? c.y + 40 : c.y + 34]));
  const estacion = d.sis === 'lle' ? `<path d="M296 119 V58" stroke="${C}" stroke-width=".9" stroke-dasharray="3 2"/><rect x="284" y="50" width="24" height="12" rx="1.5" fill="#fff" stroke="${T}" stroke-width="1.2"/><text x="296" y="58.4" text-anchor="middle" ${FM} font-size="6" fill="${T}">EST</text>` : '';
  const bandeja = `<line x1="34" y1="119" x2="346" y2="119" stroke="${C}" stroke-width="3.2"/>`;
  const bajadas = salidas.map(([x, y]) => `<path d="M${f1(x)} 119 V${f1(y)}" stroke="${C}" stroke-width=".9" stroke-dasharray="3 2"/>`).join('') + salidas.map(([x, y]) => simb(x, y)).join('');
  const backbone = fo ? `<path d="M40 115 H300 V168" fill="none" stroke="#E08A00" stroke-width="2"/><rect x="286" y="168" width="28" height="18" fill="#fff" stroke="${T}" stroke-width="1.3"/><text x="300" y="180" text-anchor="middle" ${FM} font-size="6.5" fill="${T}">ODF</text><text x="44" y="111" ${FM} font-size="6.3" fill="#8A5A00" ${halo}>FO MONOMODO · 48 HILOS → BLOQUE A</text>` : '';
  return base + bandeja + bajadas + estacion + backbone
    + `<text x="${fo ? 190 : 243}" y="${fo ? 133 : 114}" text-anchor="middle" ${FM} font-size="6.3" fill="#00739F" ${halo}>BANDEJA 300×100</text>`
    + leyenda(fo
      ? [[`<line x1="0" y1="0" x2="8" y2="0" stroke="${C}" stroke-width="3"/>`, 'Bandeja portacables'], [`<line x1="0" y1="0" x2="8" y2="0" stroke="#E08A00" stroke-width="2"/>`, 'Fibra óptica monomodo']]
      : [[`<line x1="0" y1="0" x2="8" y2="0" stroke="${C}" stroke-width="3"/>`, 'Bandeja portacables'], [`<g transform="translate(4 0)">${simb(0, 0)}</g>`, simbTxt]].concat(d.sis === 'lle' ? [[`<rect x="-2" y="-4" width="10" height="7" rx="1" fill="#fff" stroke="${T}" stroke-width="1"/>`, 'Estación de enfermería']] : []));
}
function hojaDocHTML(d) {
  const p = proy(d.proy);
  const cab = `<div class="hoja-cab"><img src="assets/img/logo-480.webp" alt="BTS Perú" width="480" height="178"><div class="mono">${esc(d.cod || '')}${d.rev ? ' · Rev. ' + esc(d.rev) : ''}<br>${fMedia(d.f)}<br>${esc(p.nombre)}</div></div>`;
  const firmas = `<div class="firmas"><div>Por BTS: residente de obra</div><div>Por ${esc(delCliente(p))}: supervisión de obra${d.estado === 'aprobado' ? ' · conforme' : ' · pendiente'}</div></div>`;
  let cuerpo = '';
  if (d.tipo === 'plano') {
    cuerpo = `<h3>${esc(d.n)}</h3><svg viewBox="0 0 380 240" style="width:100%;height:auto;background:#FBFCFD;border:1px solid var(--linea)" role="img" aria-label="Plano de muestra: ${esc(d.n)}">${planoSVG(d)}</svg>
      <div class="rotulo-mini"><div><b>${esc(d.n)}</b>${esc(p.nombre)}</div><div><b>Lámina 1 de ${d.lam || 1}</b>Escala 1:100</div><div><b>Rev. ${esc(d.rev || 'A')}</b>${fCorta(d.f)}</div></div>`;
  } else if (d.tipo === 'protocolo') {
    const cod = d.cod || '';
    let tabla, equipo;
    if (/^PP-FO/.test(cod)) {
      equipo = 'OTDR calibrado (certificado adjunto al dossier)';
      tabla = `<thead><tr><th>Hilo</th><th class="der">Longitud</th><th class="der">Pérdida</th><th class="der">Eventos</th><th>Resultado</th></tr></thead><tbody>${Array.from({ length: 9 }, (_, i) => `<tr><td class="mono">H-${String(i + 1).padStart(2, '0')}</td><td class="num">${(412 + (i * 37) % 160).toFixed(0)} m</td><td class="num">${(0.42 + (i * .07) % .3).toFixed(2)} dB</td><td class="num">${2 + (i % 2)}</td><td><span class="insignia ok">Pasa</span></td></tr>`).join('')}</tbody>`;
    } else if (/^PP-DC/.test(cod)) {
      equipo = 'Telurómetro calibrado (certificado adjunto al dossier)';
      tabla = `<thead><tr><th>Gabinete</th><th class="der">Resistencia</th><th>Método</th><th>Resultado</th></tr></thead><tbody>${Array.from({ length: 9 }, (_, i) => `<tr><td class="mono">G-${i < 5 ? 'A' : 'B'}${(i % 5) + 1}</td><td class="num">${(1.8 + (i * .13) % .6).toFixed(1)} Ω</td><td>Caída de potencial</td><td><span class="insignia ok">Pasa</span></td></tr>`).join('')}</tbody>`;
    } else {
      equipo = 'Certificador de cableado calibrado (certificado adjunto al dossier)';
      tabla = `<thead><tr><th>Punto</th><th class="der">Longitud</th><th class="der">Margen NEXT</th><th class="der">Margen RL</th><th>Resultado</th></tr></thead><tbody>${Array.from({ length: 9 }, (_, i) => { const pto = `${cod.split('-').pop() || 'P'}-${String(i + 1).padStart(3, '0')}`; return `<tr><td class="mono">${pto}</td><td class="num">${(18 + (i * 7.3) % 52).toFixed(1)} m</td><td class="num">${(6.2 + (i * 1.7) % 5).toFixed(1)} dB</td><td class="num">${(3.1 + (i * .9) % 3).toFixed(1)} dB</td><td><span class="insignia ok">Pasa</span></td></tr>`; }).join('')}</tbody>`;
    }
    cuerpo = `<h3>${esc(d.n)}</h3><p style="margin-bottom:10px">Resultado: <b>${esc(d.res || '')}</b>. ${equipo}.</p><table class="tabla">${tabla}</table>
      <p class="texto-gris" style="margin-top:8px">… y el resto de las mediciones en las páginas siguientes.</p>${firmas}`;
  } else if (d.tipo === 'ficha') {
    cuerpo = `<h3>${esc(d.n)}</h3><table class="tabla"><tbody><tr><th>Marca</th><td>${esc(d.marca || '—')}</td></tr><tr><th>Norma</th><td>${esc(NORMAS[d.sis] || 'Normas técnicas aplicables')}</td></tr><tr><th>Garantía</th><td>Según fabricante</td></tr><tr><th>Estado</th><td>${d.estado === 'aprobado' ? 'Aprobada por la supervisión el ' + fCorta(d.aprobado || d.f) : 'En revisión de la supervisión'}</td></tr></tbody></table>
      <p class="texto-gris" style="margin-top:10px">Se adjunta la hoja técnica del fabricante y la carta de distribuidor.</p>`;
  } else if (d.tipo === 'informe') {
    cuerpo = `<h3>${esc(d.n)}</h3><p>Avance valorizado del periodo de la obra ${esc(p.nombre)}, con el sustento de los partes diarios aprobados, los metrados ejecutados y el registro fotográfico.</p>
      <table class="tabla" style="margin-top:10px"><tbody><tr><th>Avance acumulado al ${fCorta(d.f)}</th><td class="num">${(() => { const s = p.serieReal || [], w = Math.floor((d.f - p.inicio) / SEMANA); return pct(s.length && w >= 0 ? s[Math.min(w, s.length - 1)] : realProyecto(p)); })()}</td></tr><tr><th>Estado</th><td>${esc(d.nota || '')}</td></tr></tbody></table>
      <div class="firmas"><div>Por BTS: residente de obra</div><div>Por ${esc(delCliente(p))}</div></div>`;
  } else {
    const n = (d.n || '').toLowerCase();
    const texto = n.includes('inicio') ? `Se deja constancia del inicio de los trabajos de ${esc(p.alcance.toLowerCase())}, de la entrega de las áreas de trabajo y del cronograma vigente.`
      : n.includes('materiales') ? 'Se aprueban los equipos y materiales listados en el anexo, conforme a las fichas técnicas aprobadas.'
        : 'Se revisó el avance de la semana, las observaciones abiertas y los compromisos hasta la próxima reunión.';
    cuerpo = `<h3>${esc(d.n)}</h3><p>${esc(p.ubicacion)}, ${fMedia(d.f)}. Obra: ${esc(p.nombre)}.</p><p style="margin-top:8px">${texto}</p>
      <div class="firmas"><div>Por BTS</div><div>Por ${esc(delCliente(p))}</div></div>`;
  }
  return `<div class="hoja">${cab}${cuerpo}</div>`;
}

/* ---------- pagos ---------- */
const PAGO_TXT = { pagado: 'Pagado', aprobado: 'Listo para facturar', revision: 'En revisión del cliente', detenido: 'Detenido por documentos', pendiente: 'Pendiente' };
const PAGO_TXT_CLI = { pagado: 'Pagado', aprobado: 'Requisitos completos · por pagar', revision: 'Por aprobar', detenido: 'Pendiente de documentos', pendiente: 'Pendiente' };
const pagoTxt = (estado, rol) => (rol === 'cliente' ? PAGO_TXT_CLI : PAGO_TXT)[estado];
/* el cliente lee «espera su conformidad» donde BTS lee «en revisión de la supervisión» */
const detCliente = det => String(det || '').replace(/en revisión de la supervisión/, 'espera su conformidad').replace(/espera la conformidad de la supervisión/, 'espera su conformidad');
/* un requisito pendiente contado al cliente: «su conformidad del PP-CAB-B1» */
function reqCliente(p, rq) {
  if (rq.doc) { const d = docPor(rq.doc); if (d && d.estado === 'revision') return `su conformidad del ${d.cod}`; }
  return rq.t.charAt(0).toLowerCase() + rq.t.slice(1);
}
const PAGO_CLS = { pagado: 'tinta', aprobado: 'ok', revision: 'info', detenido: 'aviso', pendiente: 'neutra' };
function barraCobro(p) {
  const r = resumenCobros(p), tot = p.monto || 1;
  return `<div class="barra-cobro" role="img" aria-label="Pagado ${soles(r.pagado)}, listo para facturar ${soles(r.aprobado)}, en revisión ${soles(r.revision)}, detenido ${soles(r.detenido)}, pendiente ${soles(r.pendiente)}">${['pagado', 'aprobado', 'revision', 'detenido', 'pendiente'].filter(k => r[k] > 0).map(k => `<i class="k-${k}" style="width:${r[k] / tot * 100}%"></i>`).join('')}</div>`;
}
function leyendaCobro() {
  return `<div class="leyenda-dinero" aria-hidden="true"><span><i class="k-pagado"></i>Pagado</span><span><i class="k-aprobado"></i>Listo para facturar</span><span><i class="k-revision"></i>En revisión</span><span><i class="k-detenido"></i>Detenido por documentos</span><span><i class="k-pendiente" style="border:1px solid var(--linea)"></i>Por ejecutar</span></div>`;
}
function pagosHTML(p, rol) {
  const r = resumenCobros(p), cli = rol === 'cliente';
  const casillas = [['Monto del contrato', p.monto, ''], ['Pagado', r.pagado, '']];
  if (r.aprobado) casillas.push([cli ? 'Por pagar' : 'Listo para facturar', r.aprobado, 'texto-ok']);
  if (r.revision) casillas.push([cli ? 'Por aprobar' : 'En revisión del cliente', r.revision, '']);
  if (r.detenido) casillas.push([cli ? 'Pendiente de documentos' : 'Detenido por documentos', r.detenido, 'texto-aviso']);
  casillas.push(['Por ejecutar', r.pendiente, '']);
  const resumen = `<div class="cobro-resumen">${casillas.map(([t, v, cls]) => `<div><span class="etq">${t}</span><b class="${cls}">${soles(v)}</b></div>`).join('')}</div>${barraCobro(p)}${leyendaCobro()}`;
  const filas = p.pagos.map(g => {
    const monto = montoPago(p, g);
    const fecha = g.estado === 'pagado' && g.f ? `Pagado el ${fMedia(g.f)}` : g.estado === 'aprobado' ? `Requisitos completos desde el ${fCorta(g.aprobado || Date.now())}` : g.estado === 'revision' && g.f ? `Presentado el ${fCorta(g.f)}` : g.retiene ? (cli ? 'Se paga con el dossier de cierre completo' : 'Se libera con el dossier de cierre completo') : '';
    let falta = '';
    if (['revision', 'pendiente', 'detenido'].includes(g.estado) && (g.req || []).length) {
      const reqs = g.req.map((rq, i) => {
        const ev = evalReq(p, rq);
        const btn = !ev.ok && rq.doc && cli ? `<button type="button" class="btn btn-ok btn-chico accion" data-a="doc-conformidad" data-id="${rq.doc}">Dar conformidad</button>`
          : !ev.ok && rq.doc ? `<button type="button" class="btn btn-linea btn-chico accion" data-a="ver-doc" data-id="${rq.doc}">Ver</button>`
            : !ev.ok && rq.manual && !cli ? `<button type="button" class="btn btn-linea btn-chico accion" data-a="req-cumplido" data-p="${p.id}" data-n="${g.n}" data-i="${i}">Marcar como cumplido</button>`
              : !ev.ok && (rq.calc === 'dossier' || rq.cat || rq.item || rq.calc === 'protocolos' || rq.calc === 'fichas') && !cli ? `<a class="btn btn-linea btn-chico accion" href="#bts/${p.id}/dossier">Ver en el dossier</a>` : '';
        return `<li class="${ev.ok ? 'si' : 'no'}">${ico(ev.ok ? 'check' : 'x')}<span>${esc(rq.t)}${ev.det ? ` <span class="texto-gris">— ${esc(cli ? detCliente(ev.det) : ev.det)}</span>` : ''}</span>${btn}</li>`;
      }).join('');
      falta = `<div class="reqs"><div class="reqs-t">${g.estado === 'pendiente' ? 'Qué pide este pago' : cli ? 'Qué falta para aprobarlo' : 'Qué falta para cobrarlo'}</div><ul>${reqs}</ul></div>`;
    }
    return `<li class="pago ${g.estado}"><span class="pago-n">${g.n}</span>
      <div><div class="pago-t">${esc(g.t)} <span class="texto-gris" style="font-weight:500">· ${g.pct} %</span></div><div class="pago-s">${fecha}</div></div>
      <div class="pago-monto"><b>${soles(monto)}</b>${insignia(PAGO_CLS[g.estado], pagoTxt(g.estado, rol))}</div>${falta}</li>`;
  }).join('');
  return `${resumen}<ol class="pagos" style="margin-top:8px">${filas}</ol>`;
}

/* ---------- dossier de cierre ---------- */
function anillo(valor, etiqueta) {
  const r = 42, c = 2 * Math.PI * r;
  return `<div class="anillo" role="img" aria-label="${esc(etiqueta)}"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="pista-a" cx="50" cy="50" r="${r}"/><circle class="valor-a" cx="50" cy="50" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - clamp(valor, 0, 100) / 100)).toFixed(1)}"/></svg><b>${Math.round(valor)}${NB}%</b></div>`;
}
function dossierHTML(p, rol) {
  const d = dossierPct(p);
  const pagoFinal = (p.pagos || []).find(g => g.retiene);
  const retenido = pagoFinal && pagoFinal.estado !== 'pagado' ? montoPago(p, pagoFinal) : 0;
  const recien = p.recienItem && Date.now() - (p.recienItemTs || 0) < 20000 ? p.recienItem : null;
  const cats = CAT_DOSSIER.map(c => {
    const items = p.dossier.filter(i => i.cat === c.k); if (!items.length) return '';
    const ok = items.filter(i => estadoItem(i) === 'listo').length;
    const abrir = recien ? items.some(i => i.id === recien) : (c.k === 'protocolos' && ok < items.length);
    const filas = items.map(it => {
      const e = estadoItem(it);
      const icono = e === 'listo' ? ico('check') : e === 'revision' ? ico('reloj') : '<span class="punto-vacio" aria-hidden="true"></span>';
      const orig = rol === 'cliente' ? detCliente(origenItem(it)) : origenItem(it);
      const btn = rol === 'bts' && e === 'falta' && !it.doc ? `<button type="button" class="btn btn-linea btn-chico" data-a="dossier-cargar" data-p="${p.id}" data-id="${it.id}">${ico('subir')}Cargar</button>`
        : e === 'revision' ? insignia('aviso', 'En revisión') : e === 'listo' ? '' : `<span class="texto-gris" style="font-size:12.5px">Pendiente</span>`;
      return `<div class="di ${e}${recien === it.id ? ' recien' : ''}"><span aria-hidden="true">${icono}</span><div class="di-t">${esc(it.n)}<span class="sr"> (${e === 'listo' ? 'listo' : e === 'revision' ? 'en revisión' : 'pendiente'})</span>${orig ? `<span class="di-o">${esc(orig)}</span>` : ''}</div>${btn ? `<div class="di-acc">${btn}</div>` : '<span></span>'}</div>`;
    }).join('');
    return `<details class="dossier-cat"${abrir ? ' open' : ''}><summary><span class="dc-t">${c.n}<small>${c.d}</small></span><span class="dc-barra" aria-hidden="true"><i class="${ok === items.length ? 'completo' : ''}" style="width:${ok / items.length * 100}%"></i></span><span class="dc-n">${ok} / ${items.length}</span>${ico('chev-d', 'flecha')}</summary><div class="dossier-items">${filas}</div></details>`;
  }).join('');
  const cab = `<div class="tarjeta"><div class="dossier-cab">${anillo(d.pct, `Dossier de cierre al ${Math.round(d.pct)} %`)}
    <div><span class="etq">Dossier de cierre</span><h2 class="tarjeta-t" style="margin-top:4px;font-size:20px">${d.listos} de ${d.total} documentos listos</h2>
      <p class="tarjeta-sub">${p.estado === 'cerrado' ? `Entregado completo el ${fCorta(p.dossierEntregado)}.` : `Faltan ${d.faltan}${d.revision ? (rol === 'cliente' ? `; ${plural(d.revision, 'espera', 'esperan')} su conformidad` : `; ${d.revision} en revisión del cliente`) : ''}. Cada protocolo, ficha o acta aprobada entra sola a su carpeta.`}</p></div>
    ${rol === 'bts' ? `<div class="btns"><button type="button" class="btn btn-tinta" data-a="generar-dossier" data-p="${p.id}">${ico('descarga')}Generar dossier (PDF)</button></div>` : ''}</div>
    ${(() => {
      if (rol !== 'bts' || !retenido) return '';
      const det = (p.pagos || []).filter(g => g.estado === 'detenido');
      if (det.length) return `<div class="franja aviso" style="margin-top:14px">${ico('moneda')}<span class="crece"><b>${soles(sum(det, g => montoPago(p, g)))} detenidos</b> (${det.length > 1 ? 'hitos ' + det.map(g => g.n).join(' y ') : 'hito ' + det[0].n}) hasta completar el dossier. ${d.faltan ? `Faltan ${d.faltan} documentos.` : 'Ya está completo.'}</span></div>`;
      return `<div class="franja aviso" style="margin-top:14px">${ico('moneda')}<span class="crece">El último pago (<b>${soles(retenido)}</b>) se libera recién con el dossier completo y la conformidad. ${d.faltan ? `Hoy faltan ${d.faltan} documentos.` : 'Ya está completo.'}</span></div>`;
    })()}
    ${retenido && rol === 'cliente' ? `<div class="franja neutra" style="margin-top:14px">${ico('info')}<span class="crece">El dossier se arma durante la obra; al cierre lo descarga completo y con índice.</span></div>` : ''}
  </div>`;
  return `${cab}<div style="margin-top:14px">${cats}</div>`;
}

/* ---------- actividad ---------- */
function actividadDe(pid, { cliente = false, lim = 10 } = {}) {
  const ev = [];
  S.actividad.filter(a => a.proy === pid && (!cliente || a.cliente !== false)).forEach(a => ev.push({ ts: a.ts, quien: a.quien, texto: a.texto, tipo: a.tipo }));
  partesDe(pid).forEach(x => {
    if (!cliente) ev.push({ ts: x.f, quien: x.tec, texto: `registró el parte ${x.id}: ${x.t.charAt(0).toLowerCase() + x.t.slice(1)}`, tipo: 'parte' });
    if (x.estado === 'aprobado' && x.aprobado) ev.push({ ts: x.aprobado, quien: x.aprobo || 'carlos', texto: cliente ? `aprobó avance en ${SIS[x.sis].c} (${x.zona}): ${x.cant}` : `aprobó el parte ${x.id} (+${x.inc.toFixed(1)} pts en ${SIS[x.sis].c})`, tipo: 'aprobado' });
  });
  obsDe(pid).forEach(o => {
    ev.push({ ts: o.creada, quien: o.autor || 'rocio', texto: `registró la observación ${o.id}: ${o.t.charAt(0).toLowerCase() + o.t.slice(1)}`, tipo: 'obs' });
    if (o.cerrada) ev.push({ ts: o.cerrada, quien: o.cerro || quienCliente(proy(pid)), texto: `dio conformidad y cerró ${o.id}`, tipo: 'ok' });
  });
  consultasDe(pid).forEach(c => { ev.push({ ts: c.ts, quien: c.de, texto: `escribió una consulta sobre ${c.tema.toLowerCase()}`, tipo: 'consulta' }); if (c.resp) ev.push({ ts: c.resp.ts, quien: c.resp.de, texto: 'respondió la consulta', tipo: 'consulta' }); });
  ev.sort((a, b) => b.ts - a.ts);
  const vistos = ev.filter(e => e.ts <= Date.now() + 6e4).slice(0, lim);
  if (!vistos.length) return `<div class="vacio">${ico('reloj')}Aún no hay actividad.</div>`;
  const ICO = { parte: 'casco', aprobado: 'check', obs: 'alerta', ok: 'check', consulta: 'mensaje', documento: 'documento', pago: 'moneda', etapa: 'bandera', proyecto: 'plantilla', nota: 'info', dossier: 'carpeta', correo: 'correo' };
  const CLS = { aprobado: 'ok', ok: 'ok', obs: 'alerta', pago: 'info', etapa: 'info', dossier: 'ok' };
  return `<ul class="lista">${vistos.map(e => `<li class="fila"><span class="fila-ico ${CLS[e.tipo] || ''}" aria-hidden="true">${ico(ICO[e.tipo] || 'info')}</span><div class="fila-cuerpo"><div class="fila-t" style="font-weight:500">${e.quien === 'sistema' ? esc(e.texto.charAt(0).toUpperCase() + e.texto.slice(1)) : `<b>${esc(persona(e.quien).n)}</b> ${esc(e.texto)}`}</div><div class="fila-s">${hace(e.ts)}</div></div></li>`).join('')}</ul>`;
}

/* ---------- modal, confirmaciones y avisos ---------- */
let modalAnterior = null, modalAlCerrar = null;
function abrirModal({ titulo, sub = '', cuerpo = '', pie = '', ancho = false, alCerrar = null }) {
  const m = $('#modal');
  if (m.open) m.close();
  modalAnterior = document.activeElement;
  modalAlCerrar = alCerrar;
  m.className = 'modal' + (ancho ? ' ancho' : '');
  m.innerHTML = `<div class="modal-cab"><div><h2 id="modal-t">${titulo}</h2>${sub ? `<p>${sub}</p>` : ''}</div><button type="button" class="modal-cerrar" data-a="cerrar-modal" aria-label="Cerrar">${ico('x')}</button></div>
    <div class="modal-cuerpo">${cuerpo}</div>${pie ? `<div class="modal-pie">${pie}</div>` : ''}`;
  m.showModal();
  const foco = m.querySelector('[autofocus]') || m.querySelector('.modal-cuerpo input:not([type=hidden]), .modal-cuerpo select, .modal-cuerpo textarea') || m.querySelector('.modal-cerrar');
  if (foco) foco.focus();
  return m;
}
function cerrarModal() { const m = $('#modal'); if (m.open) m.close(); }
function alCerrarModal() {
  const f = modalAlCerrar; modalAlCerrar = null;
  if (f) try { f(); } catch (e) { /* nada */ }
  if (modalAnterior && modalAnterior.isConnected) modalAnterior.focus();
}
function confirmar({ titulo, texto, ok = 'Confirmar', peligro = false }) {
  return new Promise(res => {
    let respondido = false;
    abrirModal({ titulo, cuerpo: `<p>${texto}</p>`, pie: `<button type="button" class="btn btn-linea" data-x="0">Cancelar</button><button type="button" class="btn ${peligro ? 'btn-peligro' : 'btn-tinta'}" data-x="1" autofocus>${ok}</button>`, alCerrar: () => { if (!respondido) res(false); } });
    $$('#modal [data-x]').forEach(b => b.addEventListener('click', () => { respondido = true; cerrarModal(); res(b.dataset.x === '1'); }));
  });
}
function aviso(texto, sub = '', tipo = '') {
  const cont = $('#avisos');
  const el = document.createElement('div');
  el.className = 'aviso-t ' + tipo;
  el.innerHTML = `${ico(tipo === 'ok' ? 'check' : 'info')}<div>${esc(texto)}${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
  cont.appendChild(el);
  while (cont.children.length > 3) cont.firstChild.remove();
  setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 320); }, sub ? 5600 : 4200);
}

/* ---------- lectura de fotos del celular (se achican antes de guardarlas) ---------- */
function leerFoto(archivo, lado = 960) {
  return new Promise((res, rej) => {
    if (!archivo || !/^image\//.test(archivo.type)) return rej(new Error('No es una imagen'));
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      try { res(c.toDataURL('image/jpeg', .7)); } catch (e) { rej(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
}
