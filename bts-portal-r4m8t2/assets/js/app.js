/* =====================================================================
   App: rutas por hash, persistencia, acciones y recorrido guiado
   ===================================================================== */
'use strict';

const ui = { rol: 'cliente', clienteProy: 'altiplano', filtroFotos: null, filtroObs: null, filtroObsBts: null, filtroPartes: null, nuevo: null, tec: null, levantar: null, foco: null, rutaPrev: '', ultima: { cliente: '#cliente/altiplano', bts: '#bts', tecnico: '#tecnico' }, tour: null };

/* ---------- persistencia (solo en este navegador; si falla, la muestra sigue en memoria) ---------- */
let avisoAlmacen = false;
function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(S)); }
  catch (e) {
    try { const copia = JSON.parse(JSON.stringify(S)); copia.imgs = {}; localStorage.setItem(CLAVE, JSON.stringify(copia)); } catch (e2) { /* sin almacenamiento: seguimos en memoria */ }
    if (!avisoAlmacen) { avisoAlmacen = true; aviso('Las fotos subidas no se guardan en este navegador', 'Siguen visibles mientras no cierre la página.'); }
  }
}
function desplazar(obj, dias) {
  if (Array.isArray(obj)) { obj.forEach(o => desplazar(o, dias)); return; }
  if (!obj || typeof obj !== 'object') return;
  Object.keys(obj).forEach(k => { const v = obj[k]; if (typeof v === 'number' && v > 1e12 && k !== 'ancla') obj[k] = sumarDias(v, dias); else if (v && typeof v === 'object') desplazar(v, dias); });
}
function cargar() {
  let st = null;
  try { const raw = localStorage.getItem(CLAVE); if (raw) st = JSON.parse(raw); } catch (e) { st = null; }
  if (!st || st.v !== VERSION_DATOS || !Array.isArray(st.proyectos) || !st.proyectos.length) { crearSemilla(); }
  else {
    S = st; S.imgs = S.imgs || {};
    const delta = diasEntre(st.ancla || HOY, HOY);
    if (delta !== 0) { desplazar(S, delta); S.ancla = HOY; }
    S.proyectos.forEach(p => { const n = p.estado === 'cerrado' ? p.semanas + 1 : Math.max(0, Math.floor(semanaHoy(p)) + 1); if ((p.serieReal || []).length !== n) generarHistoria(p); });
  }
  guardar();
}

/* ---------- rutas ---------- */
function parseRuta() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [a, b, c] = h.split('/');
  if (a === 'bts') return b ? { rol: 'bts', vista: 'bts', proy: b, tab: c || 'resumen' } : { rol: 'bts', vista: 'cartera' };
  if (a === 'nuevo') return { rol: 'bts', vista: 'nuevo' };
  if (a === 'tecnico') return { rol: 'tecnico', vista: 'tecnico', sub: b || 'inicio', id: c };
  if (a === 'informe') return { rol: ui.rol === 'tecnico' ? 'bts' : ui.rol, vista: 'informe', proy: b || 'altiplano' };
  if (a === 'cliente') return { rol: 'cliente', vista: 'cliente', proy: proy(b) ? b : (ui.clienteProy || 'altiplano'), tab: c || 'resumen' };
  return { rol: 'cliente', vista: 'cliente', proy: 'altiplano', tab: 'resumen' };
}
const ALIAS = { '#dossier': '#bts/altiplano/dossier', '#postventa': '#cliente/drat', '#cartera': '#bts', '#portal': '#cliente/altiplano', '': '#cliente/altiplano', '#': '#cliente/altiplano' };
const NOMBRE_VISTA = { cliente: 'Portal del cliente', cartera: 'Cartera', bts: 'Proyecto', nuevo: 'Nuevo proyecto', tecnico: 'Técnico en obra', informe: 'Informe semanal' };

function pistaHTML() {
  if (!S.ui.pista || ui.tour) return '';
  return `<div class="pista-bienvenida"><div class="fila-pista">${ico('info')}<span class="crece"><b>Esta muestra tiene tres caras:</b> lo que ve su cliente, lo que ve la gerencia de BTS y lo que usa el técnico en obra. Cambie arriba entre ellas o siga el recorrido de 2 minutos.</span>
    <button type="button" class="btn btn-marca btn-chico" data-a="recorrido">${ico('ruta')}Ver el recorrido</button><button type="button" class="btn btn-linea btn-chico" data-a="pista-cerrar">Entendido</button></div></div>`;
}

function render() {
  if (ALIAS[location.hash] !== undefined) { history.replaceState(null, '', ALIAS[location.hash]); }
  const r = parseRuta();
  ui.rol = r.rol;
  if (r.vista !== 'informe') ui.ultima[r.rol] = location.hash;
  $$('.rol-opciones a').forEach(a => { const k = a.dataset.rol; if (k === r.rol) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); a.setAttribute('href', ui.ultima[k] || '#' + k); });
  document.body.classList.toggle('en-tecnico', r.vista === 'tecnico');
  const enfocado = document.activeElement && document.activeElement.id && $('#principal').contains(document.activeElement) ? document.activeElement.id : null;
  let html = '';
  try { html = ({ cliente: vCliente, cartera: vCartera, bts: vBtsProyecto, nuevo: vNuevo, tecnico: vTecnico, informe: vInforme })[r.vista](r); }
  catch (e) { console.error(e); html = `<div class="pagina"><div class="vacio">${ico('alerta')}Algo no cargó bien en esta vista. <button type="button" class="btn btn-linea btn-chico" data-a="reiniciar">Reiniciar la muestra</button></div></div>`; }
  $('#principal').innerHTML = pistaHTML() + html;
  const clave = [r.vista, r.proy, r.tab, r.sub, r.id].join('/');
  const cambio = clave !== ui.rutaPrev;
  if (cambio || ui.arriba) { window.scrollTo(0, 0); if (ui.rutaPrev || ui.arriba) $('#principal').focus({ preventScroll: true }); ui.rutaPrev = clave; ui.arriba = false; const tc = $('#tel-cuerpo'); if (tc) tc.scrollTop = 0; }
  else if (enfocado) { const el = document.getElementById(enfocado); if (el) el.focus({ preventScroll: true }); }
  document.title = `${NOMBRE_VISTA[r.vista] || 'Portal'} · BTS · Portal de proyectos (muestra)`;
  requestAnimationFrame(() => {
    dibujarCurvas();
    if (ui.foco) { const el = document.getElementById(ui.foco); ui.foco = null; if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('resaltar'); } }
  });
  if (ui.tour) pintarTour();
}

/* ---------- utilidades de acciones ---------- */
const proyDe = el => proy(el.dataset.p) || proy(parseRuta().proy) || proy('altiplano');
function hecho(msg, sub, tipo = 'ok') { guardar(); render(); aviso(msg, sub, tipo); }
function quienCliente(p) { const u = usuariosCliente(p).find(x => PERSONAS[x.id]); return u ? u.id : (usuariosCliente(p)[0] || {}).n || 'Cliente'; }
const nomQuien = q => PERSONAS[q] ? persona(q).n : q;
function campoFoto(nombre, etq = 'Foto (opcional)') {
  return `<div class="campo"><span class="campo-l">${etq}</span><label class="subir" style="min-height:84px">${ico('camara')}<span>Tomar o elegir una foto</span><input type="file" accept="image/*" capture="environment" data-c="modal-foto" data-campo="${nombre}" aria-label="${esc(etq)}"></label><div class="previas" data-previa="${nombre}"></div><input type="hidden" name="${nombre}" value=""></div>`;
}
async function guardarFotoSubida(archivo) {
  const data = await leerFoto(archivo);
  const id = uid('i'); S.imgs[id] = data; return 'img:' + id;
}

/* ---------- acciones de negocio ---------- */
function aprobarParte(id) {
  const x = partePor(id); if (!x || x.estado !== 'pendiente') return;
  const p = proy(x.proy), s = p.sistemas.find(z => z.k === x.sis);
  const antes = realProyecto(p);
  x.estado = 'aprobado'; x.aprobado = Date.now(); x.aprobo = 'gerencia';
  if (s) s.real = Math.round(clamp(s.real + x.inc, 0, 100) * 10) / 10;
  const corto = x.t.length > 56 ? x.t.slice(0, 56).replace(/\s+\S*$/, '') + '…' : x.t;
  x.fotos.forEach((src, i) => S.fotos.push({ id: uid('f'), proy: p.id, src, f: x.f, zona: x.zona, sis: x.sis, t: x.fotos.length > 1 ? `${corto} (foto ${i + 1} de ${x.fotos.length})` : corto, origen: x.id }));
  p.recienSis = x.sis; p.recienTs = Date.now();
  const pagos = actualizarPagos(p, 'sistema');
  hecho(`Parte ${x.id} aprobado`, `El cliente ya lo ve: avance de ${pct(antes)} a ${pct(realProyecto(p))}${x.fotos.length ? ' y ' + plural(x.fotos.length, 'foto nueva', 'fotos nuevas') : ''}.${pagos.length ? ' El hito de pago ' + pagos[0].n + ' quedó listo para facturar.' : ''}`);
}
function darConformidadDoc(id) {
  const d = docPor(id); if (!d || d.estado === 'aprobado') return;
  const p = proy(d.proy);
  d.estado = 'aprobado'; d.aprobado = Date.now();
  const quien = quienCliente(p);
  registrar(p.id, quien, `dio conformidad a ${d.cod} (${d.n})`, 'documento');
  const it = (p.dossier || []).find(i => i.doc === id);
  if (it) { p.recienItem = it.id; p.recienItemTs = Date.now(); }
  const pagos = actualizarPagos(p, quien);
  cerrarModal();
  hecho('Conformidad registrada', it ? `${d.cod} entró solo al dossier de cierre.${pagos.length ? ` Con esto, el hito de pago ${pagos[0].n} (${soles(montoPago(p, pagos[0]))}) quedó con sus requisitos completos.` : ''}` : 'BTS recibe el aviso.');
}
function nuevoNumero(tipo) { S.seq[tipo] = (S.seq[tipo] || 0) + 1; return S.seq[tipo]; }

/* ---------- modales de formularios ---------- */
function modalConsulta(p) {
  abrirModal({ titulo: 'Escribir una consulta', sub: `${esc(p.nombre)} · le responde el residente de obra de BTS`, cuerpo: `<form data-f="consulta" data-p="${p.id}" id="f-modal" novalidate>
    <div class="campo"><label for="c-tema">Tema</label><select id="c-tema" name="tema">${['Avance', 'Documentos', 'Observaciones', 'Pagos', 'Suministro', 'Otro'].map(t => `<option>${t}</option>`).join('')}</select></div>
    <div class="campo"><label for="c-texto">Su consulta</label><textarea id="c-texto" name="texto" required aria-required="true" placeholder="Ej.: ¿Cuándo empiezan las pruebas de CCTV del Bloque B?"></textarea></div>
    <p class="campo-ayuda">Queda registrada aquí con su respuesta, y le avisamos por correo cuando le respondan.</p></form>`,
    pie: `<button type="button" class="btn btn-linea" data-a="cerrar-modal">Cancelar</button><button type="submit" form="f-modal" class="btn btn-marca">${ico('enviar')}Enviar consulta</button>` });
}
function modalNuevaObs(p, rol) {
  const zonas = zonasDe(p.id);
  abrirModal({ titulo: 'Registrar observación', sub: `${esc(p.nombre)} · ${rol === 'bts' ? 'se asigna al técnico del frente; el cliente también la ve' : 'la recibe BTS y la asigna al técnico del frente'}`, cuerpo: `<form data-f="nueva-obs" data-p="${p.id}" data-rol="${rol}" id="f-modal" novalidate>
    <div class="campo"><label for="o-t">¿Qué hay que corregir?</label><input id="o-t" name="t" required aria-required="true" placeholder="Ej.: Falta sellar el pase de la bandeja en el muro" autocomplete="off"></div>
    <div class="doble"><div class="campo"><label for="o-sis">Sistema</label><select id="o-sis" name="sis">${p.sistemas.map(s => `<option value="${s.k}">${esc(SIS[s.k].c)}</option>`).join('')}</select></div>
      <div class="campo"><label for="o-zona">Zona</label><select id="o-zona" name="zona">${zonas.map(z => `<option>${esc(z)}</option>`).join('')}</select></div></div>
    <div class="campo"><span class="campo-l" id="o-pri-l">Prioridad</span><div class="opciones" role="radiogroup" aria-labelledby="o-pri-l">${['Alta', 'Media', 'Baja'].map((v, i) => `<label class="opcion texto"><input type="radio" name="prioridad" value="${v}"${i === 1 ? ' checked' : ''}><span>${v}</span></label>`).join('')}</div></div>
    ${campoFoto('foto', 'Foto de lo observado (opcional)')}</form>`,
    pie: `<button type="button" class="btn btn-linea" data-a="cerrar-modal">Cancelar</button><button type="submit" form="f-modal" class="btn btn-marca">${ico('mas')}Registrar observación</button>` });
}
function modalTexto({ titulo, sub = '', f, id, label, ph = '', boton, cls = 'btn-tinta', extra = '' }) {
  abrirModal({ titulo, sub, cuerpo: `<form data-f="${f}" data-id="${esc(id)}" id="f-modal" novalidate>${extra}<div class="campo"><label for="m-texto">${label}</label><textarea id="m-texto" name="texto" required aria-required="true" placeholder="${esc(ph)}"></textarea></div></form>`,
    pie: `<button type="button" class="btn btn-linea" data-a="cerrar-modal">Cancelar</button><button type="submit" form="f-modal" class="btn ${cls}">${boton}</button>` });
}
function modalEtapas(p) {
  const OPC = { pendiente: 'Pendiente', curso: 'En curso', hecha: 'Completada' };
  abrirModal({ titulo: 'Actualizar etapas', sub: `${esc(p.nombre)} · si cambia la etapa actual o se completa una, el cliente recibe un aviso`, ancho: true, cuerpo: `<form data-f="etapas" data-p="${p.id}" id="f-modal" novalidate>${ETAPAS.map(e => {
    const st = p.etapas[e.k] || { e: 'pendiente' }, a = st.a || 0;
    return `<div class="etapa-edit"><div><b>${e.n}</b><div class="texto-gris" style="font-size:12.5px">${fechasEtapa(p, e.k)}</div></div>
      <div class="opciones" role="radiogroup" aria-label="Estado de ${e.n}">${Object.keys(OPC).map(v => `<label class="opcion texto"><input type="radio" name="e-${e.k}" value="${v}"${st.e === v ? ' checked' : ''} data-c="etapa-estado" data-k="${e.k}"><span>${OPC[v]}</span></label>`).join('')}</div>
      ${e.k === 'garantia' ? '' : `<div class="campo etapa-pct" data-pct="${e.k}"${st.e === 'curso' ? '' : ' hidden'}><label for="a-${e.k}">Avance de la etapa: <b class="mono" data-pctv="${e.k}">${a} %</b></label><input id="a-${e.k}" type="range" min="0" max="100" step="1" name="a-${e.k}" value="${a}" data-c="etapa-pct" data-k="${e.k}"></div>`}</div>`;
  }).join('')}</form>`, pie: `<button type="button" class="btn btn-linea" data-a="cerrar-modal">Cancelar</button><button type="submit" form="f-modal" class="btn btn-tinta">Guardar etapas</button>` });
}
function modalAvance(p) {
  abrirModal({ titulo: 'Actualizar avance por sistema', sub: `${esc(p.nombre)} · normalmente sube solo al aprobar partes; aquí puede corregirlo a mano`, ancho: true, cuerpo: `<form data-f="avance" data-p="${p.id}" id="f-modal" novalidate>${p.sistemas.map(s => `<div class="campo"><div class="rango-cab"><label for="s-${s.k}">${esc(SIS[s.k].n)}</label><span class="rango-v" data-sv="${s.k}">${pctE(s.real)}</span></div><input id="s-${s.k}" type="range" min="0" max="100" step="1" name="${s.k}" value="${Math.round(s.real)}" data-c="avance-sis" data-k="${s.k}"></div>`).join('')}</form>`,
    pie: `<button type="button" class="btn btn-linea" data-a="cerrar-modal">Cancelar</button><button type="submit" form="f-modal" class="btn btn-tinta">Guardar avance</button>` });
}
function modalVerFoto(ref, titulo, meta) {
  abrirModal({ titulo: esc(titulo || 'Foto'), sub: esc(meta || ''), ancho: true, cuerpo: `<div class="visor">${imgFoto(ref, 'g', titulo)}</div>` });
}
function modalVerDoc(d, rol) {
  const p = proy(d.proy);
  const conf = rol === 'cliente' && d.estado === 'revision';
  abrirModal({ titulo: `${esc(d.cod)} · ${esc(d.n)}`, sub: `${esc(p.nombre)}${d.rev ? ' · Rev. ' + esc(d.rev) : ''} · ${fMedia(d.f)}`, ancho: true,
    cuerpo: hojaDocHTML(d) + `<div class="nota-final no-imprimir"><span class="etq">Muestra</span><span>Es una hoja ilustrativa. En la versión final aquí se abre el PDF real, con sus firmas y su historial de versiones.</span></div>`,
    pie: `<button type="button" class="btn btn-linea" data-a="imprimir-modal">${ico('descarga')}Descargar</button>${conf ? `<button type="button" class="btn btn-ok" data-a="doc-conformidad" data-id="${d.id}">${ico('check')}Dar conformidad</button>` : `<button type="button" class="btn btn-tinta" data-a="cerrar-modal">Cerrar</button>`}` });
}
function modalTicket(p) {
  abrirModal({ titulo: 'Reportar una falla', sub: `${esc(p.nombre)} · la atiende BTS según su garantía o contrato de mantenimiento`, cuerpo: `<form data-f="ticket" data-p="${p.id}" id="f-modal" novalidate>
    <div class="campo"><label for="tk-eq">Equipo</label><select id="tk-eq" name="eq">${p.garantia.equipos.map(e => `<option>${esc(e.eq)}</option>`).join('')}</select></div>
    <div class="campo"><label for="tk-t">¿Qué pasa?</label><textarea id="tk-t" name="t" required aria-required="true" placeholder="Ej.: La cámara de la puerta 2 se ve en negro desde ayer"></textarea></div>
    <div class="campo"><span class="campo-l" id="tk-p">Prioridad</span><div class="opciones" role="radiogroup" aria-labelledby="tk-p">${['Alta', 'Media', 'Baja'].map((v, i) => `<label class="opcion texto"><input type="radio" name="prioridad" value="${v}"${i === 1 ? ' checked' : ''}><span>${v}</span></label>`).join('')}</div></div>
    ${campoFoto('foto', 'Foto (opcional)')}</form>`,
    pie: `<button type="button" class="btn btn-linea" data-a="cerrar-modal">Cancelar</button><button type="submit" form="f-modal" class="btn btn-marca">${ico('ticket')}Enviar reporte</button>` });
}
function modalInvitar(p) {
  abrirModal({ titulo: 'Invitar a alguien del cliente', sub: `${esc(p.nombre)} · solo verá esta obra`, cuerpo: `<form data-f="invitar" data-p="${p.id}" id="f-modal" novalidate>
    <div class="campo"><label for="iv-n">Nombre y cargo</label><input id="iv-n" name="n" required aria-required="true" placeholder="Ej.: Ing. Ana Ríos, supervisión" autocomplete="off"></div>
    <div class="campo"><label for="iv-c">Correo</label><input id="iv-c" name="correo" type="email" required aria-required="true" placeholder="nombre@empresa.pe" autocomplete="off"></div>
    <div class="campo"><label for="iv-r">Rol</label><select id="iv-r" name="rol"><option>Supervisión de obra</option><option>Residente del cliente</option><option>Observador (solo lectura)</option></select></div>
    <div class="nota-final"><span class="etq">En la muestra</span><span>No sale ningún correo; la invitación queda registrada.</span></div></form>`,
    pie: `<button type="button" class="btn btn-linea" data-a="cerrar-modal">Cancelar</button><button type="submit" form="f-modal" class="btn btn-marca">${ico('correo')}Enviar invitación</button>` });
}
function modalSubirDoc(p) {
  const faltan = (p.dossier || []).filter(i => estadoItem(i) === 'falta' && !i.doc);
  abrirModal({ titulo: 'Subir documento', sub: `${esc(p.nombre)} · el cliente lo ve en su portal`, cuerpo: `<form data-f="subir-doc" data-p="${p.id}" id="f-modal" novalidate>
    <div class="doble"><div class="campo"><label for="sd-tipo">Tipo</label><select id="sd-tipo" name="tipo">${Object.keys(TIPO_DOC).map(k => `<option value="${k}">${TIPO_DOC[k].n.replace(/s$/, '').replace('Fichas técnica', 'Ficha técnica').replace('Informes y valorizacione', 'Informe o valorización')}</option>`).join('')}</select></div>
      <div class="campo"><label for="sd-cod">Código</label><input id="sd-cod" name="cod" placeholder="Ej.: PP-CAB-B2" autocomplete="off"></div></div>
    <div class="campo"><label for="sd-n">Nombre</label><input id="sd-n" name="n" required aria-required="true" placeholder="Ej.: Certificación de cableado — Bloque B, piso 2" autocomplete="off"></div>
    <div class="doble"><div class="campo"><label for="sd-rev">Revisión</label><input id="sd-rev" name="rev" placeholder="A" autocomplete="off"></div>
      <div class="campo"><label for="sd-conf">¿Pide conformidad del cliente?</label><select id="sd-conf" name="conf"><option value="si">Sí, que la supervisión lo revise</option><option value="no">No, solo para su conocimiento</option></select></div></div>
    <div class="campo"><label for="sd-dos">¿Corresponde a un documento del dossier?</label><select id="sd-dos" name="dossier"><option value="">No</option>${faltan.map(i => `<option value="${i.id}">${esc(CAT[i.cat].n)}: ${esc(i.n)}</option>`).join('')}</select><span class="campo-ayuda">Si lo enlaza, entra solo al dossier cuando el cliente da su conformidad.</span></div>
    <div class="campo"><span class="campo-l">Archivo</span><label class="subir" style="min-height:76px">${ico('subir')}<span>Elegir el PDF o la imagen</span><input type="file" accept=".pdf,image/*" data-c="archivo-nombre" aria-label="Elegir el archivo"></label><span class="campo-ayuda" data-archivo>Sin archivo: en la muestra se usa uno de ejemplo.</span></div></form>`,
    pie: `<button type="button" class="btn btn-linea" data-a="cerrar-modal">Cancelar</button><button type="submit" form="f-modal" class="btn btn-marca">${ico('subir')}Subir documento</button>` });
}
function modalCargarItem(p, it) {
  abrirModal({ titulo: 'Cargar al dossier', sub: `${esc(CAT[it.cat].n)} · ${esc(it.n)}`, cuerpo: `<form data-f="dossier-cargar" data-p="${p.id}" data-id="${it.id}" id="f-modal" novalidate>
    <div class="campo"><span class="campo-l">Archivo</span><label class="subir">${ico('subir')}<span><b>Elegir el PDF</b><br><span class="texto-gris" style="font-size:12.5px">o deje vacío para usar un archivo de ejemplo</span></span><input type="file" accept=".pdf,image/*" data-c="archivo-nombre" aria-label="Elegir el archivo"></label><span class="campo-ayuda" data-archivo>Sin archivo elegido.</span></div></form>`,
    pie: `<button type="button" class="btn btn-linea" data-a="cerrar-modal">Cancelar</button><button type="submit" form="f-modal" class="btn btn-tinta">${ico('check')}Cargar al dossier</button>` });
}
function modalGenerarDossier(p, solo) {
  const d = dossierPct(p);
  const pasos = [`Reuniendo ${d.listos} documentos listos`, 'Ordenando por categoría y sistema', 'Armando el índice y los separadores', 'Numerando las páginas'];
  abrirModal({ titulo: solo ? 'Descargar el dossier de cierre' : 'Generar dossier de cierre (PDF)', sub: esc(p.nombre), ancho: true,
    cuerpo: `<div id="gen-dossier"><ol class="tel-flujo" style="margin-top:0">${pasos.map((t, i) => `<li class="luego" data-paso="${i}">${ico('reloj')}<span>${t}</span></li>`).join('')}</ol></div>` });
  let i = 0;
  const avanzar = () => {
    const li = $(`#gen-dossier [data-paso="${i}"]`); if (!li) return;
    li.className = 'ok'; li.querySelector('svg use').setAttribute('href', '#i-check');
    i++;
    if (i < pasos.length) setTimeout(avanzar, 420); else setTimeout(() => { const g = $('#gen-dossier'); if (g) g.innerHTML = portadaDossierHTML(p); const pie = document.createElement('div'); pie.className = 'modal-pie'; pie.innerHTML = `<button type="button" class="btn btn-linea" data-a="cerrar-modal">Cerrar</button><button type="button" class="btn btn-tinta" data-a="imprimir-modal">${ico('imprimir')}Imprimir o guardar como PDF</button>`; $('#modal').appendChild(pie); }, 380);
  };
  setTimeout(avanzar, 350);
  if (!solo) registrar(p.id, 'gerencia', `generó el dossier de cierre (${d.listos} de ${d.total} documentos)`, 'dossier');
  guardar();
}
function portadaDossierHTML(p) {
  const d = dossierPct(p);
  let pag = 3;
  const PAGS = { protocolos: 45, asbuilt: 12, fichas: 8, garantias: 3, manuales: 60, actas: 3, capacitacion: 2, calibracion: 2 };
  const filas = CAT_DOSSIER.map((c, i) => {
    const its = p.dossier.filter(x => x.cat === c.k); if (!its.length) return '';
    const ok = its.filter(x => estadoItem(x) === 'listo').length;
    const desde = pag; pag += ok * PAGS[c.k] + (its.length - ok);
    return `<tr><td class="mono">${String(i + 1).padStart(2, '0')}</td><td>${c.n}</td><td class="num">${ok} / ${its.length}</td><td class="num">${desde}–${pag - 1}</td><td>${ok === its.length ? '<span class="insignia ok">Completo</span>' : `<span class="insignia aviso">${its.length - ok} con hoja de pendiente</span>`}</td></tr>`;
  }).join('');
  return `<div class="hoja"><div class="hoja-cab"><img src="assets/img/logo-480.webp" alt="BTS Perú" width="480" height="178"><div class="mono">${esc(p.codigo)}<br>${fMedia(Date.now())}<br>${pag - 1} páginas</div></div>
    <p class="etq" style="margin-top:10px">Dossier de cierre${d.listos < d.total ? ' · versión preliminar' : ''}</p><h3 style="font-size:22px;margin-top:4px">${esc(p.nombre)}</h3>
    <p>${esc(p.alcance)} · ${esc(p.cliente)}${p.entidad ? ' · ' + esc(p.entidad) : ''}</p>
    <table class="tabla" style="margin-top:14px"><thead><tr><th>N.º</th><th>Sección</th><th class="der">Documentos</th><th class="der">Páginas</th><th>Estado</th></tr></thead><tbody>${filas}</tbody></table>
    ${d.listos < d.total ? `<p class="texto-aviso" style="margin-top:10px;font-weight:600">Faltan ${d.faltan} documentos: salen como hojas de «pendiente» para que nadie los pase por alto.</p>` : '<p class="texto-ok" style="margin-top:10px;font-weight:600">Dossier completo, listo para la conformidad.</p>'}</div>
    <div class="nota-final no-imprimir"><span class="etq">Versión final</span><span>El PDF une los archivos reales (planos, protocolos firmados, fichas, garantías) en un solo documento con índice, separadores y marcadores por sistema.</span></div>`;
}
function modalAvisoEtapa(p, cambios) {
  const a = avanceHoy(p);
  const nuevaPrincipal = ETAPA[etapaPrincipal(p)].n;
  const asunto = cambios.principal ? `Su obra pasó a la etapa: ${nuevaPrincipal}` : `Etapa completada: ${cambios.completadas.map(k => ETAPA[k].n).join(', ')}`;
  abrirModal({ titulo: 'Aviso al cliente', sub: 'Así le llega el correo. Puede enviarlo o guardar sin avisar.', cuerpo: `<div class="correo" style="box-shadow:none"><div class="correo-cab"><div><span>Para</span><span style="color:var(--tinta)">${esc(p.cliente)} (${plural(usuariosCliente(p).length, 'persona', 'personas')})</span></div><div class="asunto">${esc(asunto)}</div></div>
    <div class="informe" style="padding:18px 20px"><p><b>${esc(p.nombre)}</b> ${cambios.principal ? `avanzó a la etapa <b>${esc(nuevaPrincipal)}</b>` : 'tiene novedades en sus etapas'}.${cambios.completadas.length ? ` Se completó: ${esc(cambios.completadas.map(k => ETAPA[k].n).join(', '))}.` : ''}</p><p style="margin-top:8px">Avance real a hoy: <b class="mono">${pct(a.real)}</b> (programado ${pct(a.prog)}).</p><p style="margin-top:8px">Vea el detalle en su portal de proyecto.</p></div></div>`,
    pie: `<button type="button" class="btn btn-linea" data-a="etapa-sin-aviso">Guardar sin avisar</button><button type="button" class="btn btn-marca" data-a="etapa-enviar-aviso" data-p="${p.id}" data-asunto="${esc(asunto)}">${ico('enviar')}Enviar aviso</button>` });
}

/* ---------- recorrido guiado ---------- */
const TOUR = [
  { h: '#cliente/altiplano', t: 'Lo que ve su cliente', x: 'El Consorcio entra y ve en qué va su obra: avance real contra programado, etapa, fotos y qué falta para cada pago, sin tener que llamar para preguntar.' },
  { h: '#cliente/altiplano/pagos', t: 'Lo que frena el siguiente pago', x: 'Cada hito muestra lo que pide el contrato. Si falta una conformidad de la supervisión, la ven aquí y la dan con un clic.' },
  { h: '#tecnico/parte', t: 'El técnico registra desde la obra', x: 'Actividad, cantidad y fotos desde el celular; el avance se calcula con el metrado del frente. El parte llega a BTS para su aprobación.' },
  { h: '#bts/altiplano/partes', t: 'Usted aprueba; recién ahí lo ve el cliente', x: 'Al aprobar, sube la curva S, se publican las fotos y el parte entra al informe del viernes.' },
  { h: '#bts/altiplano/dossier', t: 'El dossier se arma solo', x: 'Cada protocolo, ficha o acta aprobada entra a su carpeta. Al final, el PDF sale con índice y sin semanas de armado.' },
  { h: '#bts', t: 'Toda la cartera en una pantalla', x: 'Atrasos, pendientes y el dinero detenido por documentos, proyecto por proyecto.' },
  { h: '#nuevo', t: 'Cada obra nueva, en minutos', x: 'Elija una plantilla y el proyecto nace con sus etapas, sistemas, dossier, protocolos e hitos de pago.' },
  { h: '#informe/altiplano', t: 'El informe del viernes sale solo', x: 'Con los partes aprobados de la semana, sus fotos y lo que viene. Se envía por correo y se descarga en PDF.' },
];
function iniciarTour(i = 0) { ui.tour = { i }; S.ui.pista = false; guardar(); irTour(); }
function irTour() { const st = TOUR[ui.tour.i]; if (location.hash !== st.h) location.hash = st.h; else render(); setTimeout(() => { const b = $('#tour-sig'); if (b) b.focus({ preventScroll: true }); }, 60); }
function pintarTour() {
  const c = $('#recorrido');
  if (!ui.tour) { c.innerHTML = ''; return; }
  const i = ui.tour.i, st = TOUR[i], ult = i === TOUR.length - 1;
  c.innerHTML = `<section class="tour" role="dialog" aria-modal="false" aria-labelledby="tour-t"><button type="button" class="modal-cerrar tour-cerrar" data-a="tour-fin" aria-label="Cerrar el recorrido">${ico('x')}</button>
    <div class="tour-paso">Recorrido · paso ${i + 1} de ${TOUR.length}</div><h2 id="tour-t">${st.t}</h2><p>${st.x}</p>
    <div class="tour-puntos" aria-hidden="true">${TOUR.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>
    <div class="tour-acc"><button type="button" class="btn btn-linea btn-chico" data-a="tour-ant"${i === 0 ? ' disabled' : ''}>${ico('flecha-i')}Anterior</button><button type="button" class="btn btn-tinta btn-chico" id="tour-sig" data-a="${ult ? 'tour-fin' : 'tour-sig'}">${ult ? 'Terminar' : 'Siguiente'}${ult ? '' : ico('flecha-d')}</button></div></section>`;
}

/* ---------- clics ---------- */
const ACC = {
  'cerrar-modal': () => cerrarModal(),
  'reiniciar': async () => {
    const si = await confirmar({ titulo: 'Reiniciar la muestra', texto: 'Se borran los cambios que hizo en este navegador y vuelven los datos de ejemplo.', ok: 'Sí, reiniciar', peligro: true });
    if (!si) return;
    try { localStorage.removeItem(CLAVE); } catch (e) { /* nada */ }
    crearSemilla(); S.ui.pista = false; Object.assign(ui, { nuevo: null, tec: null, levantar: null, filtroFotos: null, filtroObs: null, filtroObsBts: null, filtroPartes: null, tour: null, ultima: { cliente: '#cliente/altiplano', bts: '#bts', tecnico: '#tecnico' } });
    guardar(); pintarTour();
    if (location.hash !== '#cliente/altiplano') location.hash = '#cliente/altiplano'; else render();
    aviso('Muestra reiniciada', 'Volvieron los datos de ejemplo.', 'ok');
  },
  'recorrido': () => iniciarTour(0),
  'tour-sig': () => { if (!ui.tour) return; ui.tour.i = Math.min(TOUR.length - 1, ui.tour.i + 1); irTour(); },
  'tour-ant': () => { if (!ui.tour) return; ui.tour.i = Math.max(0, ui.tour.i - 1); irTour(); },
  'tour-fin': () => { ui.tour = null; S.ui.tourVisto = true; guardar(); pintarTour(); },
  'pista-cerrar': () => { S.ui.pista = false; guardar(); render(); },
  'ir': (el, ev) => { if (ev.target.closest('a,button') && ev.target.closest('a,button') !== el) return; location.hash = el.dataset.h; },
  'ver-foto': el => modalVerFoto(el.dataset.ref, el.dataset.titulo, el.dataset.meta),
  'ver-doc': el => { const d = docPor(el.dataset.id); if (d) modalVerDoc(d, ui.rol); },
  'doc-conformidad': el => darConformidadDoc(el.dataset.id),
  'consulta': el => modalConsulta(proyDe(el)),
  'nueva-obs': el => modalNuevaObs(proyDe(el), el.dataset.rol || ui.rol),
  'responder': el => { const c = S.consultas.find(x => x.id === el.dataset.id); if (!c) return; modalTexto({ titulo: 'Responder consulta', sub: `${esc(persona(c.de).n)} · ${hace(c.ts)}`, f: 'responder', id: c.id, label: 'Su respuesta', ph: 'Ej.: Le adjuntamos el protocolo en la sección Documentos.', boton: `${ico('enviar')}Enviar respuesta`, extra: `<p class="obs-nota" style="margin-bottom:12px">${esc(c.texto)}</p>` }); },
  'obs-conforme': el => { const o = obsPor(el.dataset.id); if (!o) return; o.estado = 'cerrada'; o.cerrada = Date.now(); o.cerro = quienCliente(proy(o.proy)); hecho(`Observación ${o.id} cerrada`, 'BTS y el técnico reciben el aviso.'); },
  'obs-sigue': el => modalTexto({ titulo: 'La observación sigue', sub: el.dataset.id, f: 'obs-sigue', id: el.dataset.id, label: '¿Qué falta corregir?', ph: 'Ej.: Aún falta rotular los puertos 13 al 24.', boton: 'Devolver a BTS', cls: 'btn-peligro' }),
  'obs-aprobar': el => { const o = obsPor(el.dataset.id); if (!o) return; o.estado = 'levantada'; o.aprobadaBts = Date.now(); registrar(o.proy, 'gerencia', `aprobó el levantamiento de ${o.id}`, 'ok', { cliente: false }); hecho(`Levantamiento de ${o.id} aprobado`, 'El cliente ya ve el antes y el después, y puede dar su conformidad.'); },
  'obs-rechazar': el => modalTexto({ titulo: 'Devolver al técnico', sub: el.dataset.id, f: 'obs-rechazar', id: el.dataset.id, label: '¿Qué debe corregir?', ph: 'Ej.: La foto no muestra la etiqueta del puerto 24.', boton: 'Devolver al técnico', cls: 'btn-peligro' }),
  'filtro-fotos': el => { ui.filtroFotos = { p: el.dataset.p, z: el.dataset.z }; render(); },
  'filtro-obs': el => { ui.filtroObs = { p: el.dataset.p, f: el.dataset.f }; render(); },
  'filtro-obs-bts': el => { ui.filtroObsBts = { p: el.dataset.p, f: el.dataset.f }; render(); },
  'filtro-partes': el => { ui.filtroPartes = { p: el.dataset.p, f: el.dataset.f }; render(); },
  'aprobar-parte': el => aprobarParte(el.dataset.id),
  'observar-parte': el => modalTexto({ titulo: 'Observar el parte', sub: el.dataset.id, f: 'observar-parte', id: el.dataset.id, label: '¿Qué debe corregir o aclarar el técnico?', ph: 'Ej.: Falta la foto del gabinete G-B2.', boton: 'Devolver con observación', cls: 'btn-peligro' }),
  'editar-etapas': el => modalEtapas(proyDe(el)),
  'editar-avance': el => modalAvance(proyDe(el)),
  'etapa-enviar-aviso': el => { const p = proyDe(el); correoSimulado(p.id, `${p.cliente} (${plural(usuariosCliente(p).length, 'persona', 'personas')})`, el.dataset.asunto, 'Aviso de cambio de etapa'); registrar(p.id, 'gerencia', `actualizó las etapas: «${el.dataset.asunto}»`, 'etapa'); cerrarModal(); hecho('Aviso enviado al cliente', `${plural(usuariosCliente(p).length, 'persona lo recibe', 'personas lo reciben')} por correo. En la muestra no sale ningún correo.`); },
  'etapa-sin-aviso': () => { cerrarModal(); hecho('Etapas actualizadas', 'Sin aviso al cliente.'); },
  'dossier-cargar': el => { const p = proyDe(el), it = p.dossier.find(i => i.id === el.dataset.id); if (it) modalCargarItem(p, it); },
  'generar-dossier': el => modalGenerarDossier(proyDe(el), !!el.dataset.solo),
  'imprimir-modal': () => { document.body.classList.add('imprimiendo-modal'); setTimeout(() => { window.print(); setTimeout(() => document.body.classList.remove('imprimiendo-modal'), 400); }, 30); },
  'imprimir': () => window.print(),
  'enviar-informe': el => { const p = proyDe(el); correoSimulado(p.id, `${p.cliente} (${plural(usuariosCliente(p).length, 'persona', 'personas')})`, `Informe semanal n.º ${semanaN(p)} · ${p.nombre}`, 'Envío manual del informe'); hecho('Informe enviado', 'En la muestra no sale ningún correo; queda registrado en los avisos del proyecto.'); },
  'subir-doc': el => modalSubirDoc(proyDe(el)),
  'pago-cobrado': el => { const p = proyDe(el), g = p.pagos.find(x => x.n === +el.dataset.n); if (!g) return; g.estado = 'pagado'; g.f = Date.now(); registrar(p.id, 'gerencia', `registró el pago del hito ${g.n} (${soles(montoPago(p, g))})`, 'pago', { cliente: false }); hecho(`Hito ${g.n} marcado como pagado`, soles(montoPago(p, g))); },
  'invitar': el => modalInvitar(proyDe(el)),
  'nuevo-ticket': el => modalTicket(proyDe(el)),
  'ticket-atender': el => { const t = S.tickets.find(x => x.id === el.dataset.id); if (!t) return; t.estado = 'atencion'; t.resp = 'jhon'; (t.notas = t.notas || []).push({ ts: Date.now(), quien: 'carlos', t: 'Asignado a Jhon Quispe. Lo contactamos hoy para coordinar la visita.' }); hecho(`Falla ${t.id} en atención`, 'El cliente ve el responsable y el avance en su portal.'); },
  'ticket-cerrar': el => modalTexto({ titulo: 'Marcar como resuelto', sub: el.dataset.id, f: 'ticket-cerrar', id: el.dataset.id, label: '¿Cómo se resolvió?', ph: 'Ej.: Se cambió la cámara en garantía y se verificó la grabación nocturna.', boton: `${ico('check')}Marcar resuelto`, cls: 'btn-ok' }),
  'mant-confirmar': el => { const p = proyDe(el), v = p.garantia.visitas.find(x => x.estado !== 'hecha'); if (!v) return; v.estado = 'confirmada'; registrar(p.id, quienCliente(p), `confirmó la visita de mantenimiento del ${fCorta(v.f)}`, 'nota'); hecho('Fecha confirmada', `El técnico de BTS llega el ${fLarga(v.f)}.`); },
  'mant-reprogramar': el => { const p = proyDe(el), v = p.garantia.visitas.find(x => x.estado !== 'hecha'); if (!v) return; abrirModal({ titulo: 'Pedir otra fecha', sub: 'Mantenimiento preventivo', cuerpo: `<form data-f="reprogramar" data-p="${p.id}" id="f-modal" novalidate><div class="campo"><label for="rp-f">Nueva fecha</label><input id="rp-f" type="date" name="f" value="${fISO(sumarDias(v.f, 7))}" min="${fISO(sumarDias(HOY, 1))}" required></div></form>`, pie: `<button type="button" class="btn btn-linea" data-a="cerrar-modal">Cancelar</button><button type="submit" form="f-modal" class="btn btn-tinta">Pedir esta fecha</button>` }); },
  'renovar-contrato': el => { const p = proyDe(el); p.garantia.contrato.pedido = Date.now(); registrar(p.id, quienCliente(p), 'pidió la propuesta de renovación del mantenimiento', 'nota'); hecho('Pedido enviado', 'BTS le envía la propuesta de renovación.'); },
  'enviar-propuesta': el => { const p = proyDe(el); p.garantia.contrato.propuesta = Date.now(); correoSimulado(p.id, p.cliente, `Propuesta de renovación: ${p.garantia.contrato.n}`, 'Propuesta de renovación'); registrar(p.id, 'gerencia', 'envió la propuesta de renovación del mantenimiento', 'nota'); hecho('Propuesta enviada', 'El cliente la ve en su portal. En la muestra no sale ningún correo.'); },
  'req-cumplido': el => { const p = proyDe(el), g = p.pagos.find(x => x.n === +el.dataset.n); if (!g || !g.req[+el.dataset.i]) return; g.req[+el.dataset.i].ok = true; registrar(p.id, 'gerencia', `marcó como cumplido: ${g.req[+el.dataset.i].t.toLowerCase()}`, 'pago', { cliente: false }); const ps = actualizarPagos(p, 'sistema'); hecho('Requisito marcado como cumplido', ps.length ? `El hito de pago ${ps[0].n} quedó listo para facturar.` : 'Faltan otros requisitos del hito.'); },
  'nuevo-paso': el => { ui.nuevo.paso = +el.dataset.paso; ui.arriba = true; render(); },
  'nuevo-ejemplo': () => {
    const lunes = sumarDias(lunesDe(HOY), 7);
    const EJ = { hospital: ['Hospital II de Huaral', 'Consorcio Salud Norte Chico', 'EsSalud', 'Huaral, Lima', '1,240,000', 38], cctv: ['Videovigilancia del almacén central de Lurín', 'Distribuidora del Sur S.A.C.', '', 'Lurín, Lima', '386,000', 14], dc: ['Cuarto de datos de la sede San Isidro', 'Financiera Andina S.A.', '', 'San Isidro, Lima', '742,000', 18], incendios: ['Detección y extinción del almacén de Ate', 'Operador Logístico del Centro S.A.C.', '', 'Ate, Lima', '455,000', 16] };
    const [nombre, cliente, entidad, ubicacion, monto, sem] = EJ[ui.nuevo.plantilla] || EJ.hospital;
    Object.assign(ui.nuevo, { nombre, cliente, entidad, ubicacion, monto, inicio: fISO(lunes), fin: fISO(laborable(sumarDias(lunes, sem * 7 - 3), true)), errores: {} }); if (!ui.nuevo.invitados[0].n) ui.nuevo.invitados[0] = { n: 'Ing. Ana Ríos, supervisión de obra', correo: 'ana.rios@ejemplo.pe', rol: 'Supervisión de obra' }; render(); },
  'nuevo-agregar-inv': () => { ui.nuevo.invitados.push({ n: '', correo: '', rol: 'Residente del cliente' }); render(); const i = ui.nuevo.invitados.length - 1; setTimeout(() => { const e = $('#inv-n-' + i); if (e) e.focus(); }, 0); },
  'nuevo-quitar-inv': el => { ui.nuevo.invitados.splice(+el.dataset.i, 1); render(); },
  'tec-foto-ejemplo': () => { const t = ui.tec; const sig = FOTOS_EJEMPLO.find(f => !t.fotos.includes(f)) || FOTOS_EJEMPLO[t.fotos.length % FOTOS_EJEMPLO.length]; t.fotos.push(sig); render(); },
  'tec-quitar-foto': el => { ui.tec.fotos.splice(+el.dataset.i, 1); render(); },
  'lev-ejemplo': el => { if (!ui.levantar) return; ui.levantar.foto = DESPUES_MUESTRA[el.dataset.id] || 'cab-varillas'; render(); },
};
document.addEventListener('click', ev => {
  const a = ev.target.closest('a[data-foco]'); if (a) ui.foco = a.dataset.foco;
  const el = ev.target.closest('[data-a]'); if (!el) return;
  if (el.hasAttribute('disabled')) return;
  const f = ACC[el.dataset.a]; if (!f) return;
  if (el.tagName === 'A' && el.dataset.a !== 'ir') ev.preventDefault();
  f(el, ev);
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && ui.tour && !$('#modal').open) { ACC['tour-fin'](); return; }
  const fila = ev.target.closest && ev.target.closest('tr[data-a="ir"]');
  if (fila && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); location.hash = fila.dataset.h; }
});

/* ---------- cambios en campos ---------- */
document.addEventListener('input', ev => {
  const el = ev.target, c = el.dataset && el.dataset.c; if (!c) return;
  if (c === 'nuevo-campo') { ui.nuevo[el.name] = el.value; if (ui.nuevo.errores[el.name]) { delete ui.nuevo.errores[el.name]; el.removeAttribute('aria-invalid'); const er = $('#e-' + el.name); if (er) er.remove(); } }
  if (c === 'nuevo-invitado') ui.nuevo.invitados[+el.dataset.i][el.dataset.k] = el.value;
  if (c === 'tec' && el.dataset.k === 'n') { ui.tec.n = el.value; const p = proy(ui.tec.proy); const a = avancePorCantidad(p, ui.tec.sis, ui.tec.act, ui.tec.n); const out = $('#t-calc'); if (out) out.innerHTML = textoCalculo(p, a); if (ui.tec.errores.n && +el.value > 0) { delete ui.tec.errores.n; el.removeAttribute('aria-invalid'); el.setAttribute('aria-describedby', 't-calc'); const er = $('#e-n'); if (er) er.remove(); } }
  if (c === 'tec' && ['t', 'nota', 'personal'].includes(el.dataset.k)) { ui.tec[el.dataset.k] = el.dataset.k === 'personal' ? +el.value || 1 : el.value; if (el.dataset.k === 't' && ui.tec.errores.t) { delete ui.tec.errores.t; el.removeAttribute('aria-invalid'); const er = $('#e-t'); if (er) er.remove(); } }
  if (c === 'lev-nota' && ui.levantar) ui.levantar.nota = el.value;
  if (c === 'etapa-pct') { const v = $(`[data-pctv="${el.dataset.k}"]`); if (v) v.textContent = el.value + ' %'; }
  if (c === 'avance-sis') { const v = $(`[data-sv="${el.dataset.k}"]`); if (v) v.textContent = el.value + ' %'; }
});
document.addEventListener('change', async ev => {
  const el = ev.target, c = el.dataset && el.dataset.c; if (!c) return;
  if (c === 'cambiar-cliente') { location.hash = '#cliente/' + el.value; return; }
  if (c === 'avisos-cliente') { const p = proy(el.dataset.p); p.avisos = el.checked; hecho(el.checked ? 'Avisos por correo activados' : 'Avisos por correo desactivados', el.checked ? 'Le llegan los cambios de etapa y el informe del viernes.' : 'Puede volver a activarlos cuando quiera.', 'info'); return; }
  if (c === 'nuevo-plantilla') { const pl = PLANTILLA[el.value]; ui.nuevo.plantilla = el.value; ui.nuevo.sistemas = pl.sistemas.map(x => x[0]); ui.nuevo.fin = fISO(sumarDias(deISO(ui.nuevo.inicio), pl.semanas * 7 - 3)); return; }
  if (c === 'nuevo-sistema') { const s = new Set(ui.nuevo.sistemas); if (el.checked) s.add(el.value); else s.delete(el.value); ui.nuevo.sistemas = [...s]; if (ui.nuevo.errores.sistemas && s.size) { delete ui.nuevo.errores.sistemas; } return; }
  if (c === 'nuevo-invitado') { ui.nuevo.invitados[+el.dataset.i][el.dataset.k] = el.value; return; }
  if (c === 'tec') {
    const k = el.dataset.k;
    ui.tec[k] = k === 'personal' ? (+el.value || 1) : el.value;
    if (k === 'proy') { const p = proy(el.value); ui.tec.sis = p.sistemas[0].k; ui.tec.zona = zonasDe(p.id)[0]; }
    if (k === 'proy' || k === 'sis') ui.tec.act = actividadesDe(ui.tec.sis)[0][0];
    if (['proy', 'sis', 'act'].includes(k)) render();
    return;
  }
  if (c === 'tec-fotos') {
    const archivos = [...(el.files || [])].slice(0, Math.max(0, 4 - ui.tec.fotos.length));
    for (const f of archivos) { try { ui.tec.fotos.push(await guardarFotoSubida(f)); } catch (e) { aviso('No se pudo leer esa imagen', 'Pruebe con otra foto.'); } }
    if ((el.files || []).length > archivos.length) aviso('Se guardan hasta 4 fotos por parte');
    render(); return;
  }
  if (c === 'lev-foto') { const f = (el.files || [])[0]; if (!f || !ui.levantar) return; try { ui.levantar.foto = await guardarFotoSubida(f); ui.levantar.error = ''; } catch (e) { aviso('No se pudo leer esa imagen', 'Pruebe con otra foto.'); } render(); return; }
  if (c === 'modal-foto') {
    const f = (el.files || [])[0]; if (!f) return;
    try { const ref = await guardarFotoSubida(f); const form = el.closest('form'); form.querySelector(`input[name="${el.dataset.campo}"]`).value = ref; form.querySelector(`[data-previa="${el.dataset.campo}"]`).innerHTML = `<div class="previa">${imgFoto(ref, 'm', 'Foto elegida')}</div>`; }
    catch (e) { aviso('No se pudo leer esa imagen', 'Pruebe con otra foto.'); }
    return;
  }
  if (c === 'archivo-nombre') { const f = (el.files || [])[0]; const s = el.closest('form').querySelector('[data-archivo]'); if (s) s.textContent = f ? `Archivo: ${f.name}` : 'Sin archivo elegido.'; el.closest('form').dataset.archivo = f ? f.name : ''; return; }
  if (c === 'etapa-estado') { const box = $(`[data-pct="${el.dataset.k}"]`); if (box) box.hidden = el.value !== 'curso'; return; }
});

/* ---------- formularios ---------- */
function exigir(form, nombre, msg) {
  const el = form.elements[nombre]; if (!el) return true;
  const ok = String(el.value || '').trim().length > 0;
  const id = 'err-' + nombre;
  const prev = form.querySelector('#' + id); if (prev) prev.remove();
  if (ok) { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); return true; }
  el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', id);
  el.insertAdjacentHTML('afterend', `<span class="campo-error" id="${id}">${esc(msg)}</span>`);
  el.focus(); return false;
}
const FORM = {
  'consulta': f => {
    if (!exigir(f, 'texto', 'Escriba su consulta.')) return;
    const p = proy(f.dataset.p); const n = nuevoNumero('consulta');
    S.consultas.push({ id: 'C-' + String(n).padStart(3, '0'), proy: p.id, de: quienCliente(p), tema: f.elements.tema.value, texto: f.elements.texto.value.trim(), ts: Date.now(), resp: null });
    cerrarModal(); hecho('Consulta enviada al residente de obra', 'Le llega la respuesta aquí y por correo. Pruebe responderla desde la vista de BTS.');
  },
  'responder': f => {
    if (!exigir(f, 'texto', 'Escriba la respuesta.')) return;
    const c = S.consultas.find(x => x.id === f.dataset.id); if (!c) return;
    c.resp = { de: 'carlos', ts: Date.now(), texto: f.elements.texto.value.trim() };
    cerrarModal(); hecho('Respuesta enviada', 'El cliente la ve en su portal y recibe el aviso por correo.');
  },
  'nueva-obs': f => {
    if (!exigir(f, 't', 'Describa qué hay que corregir.')) return;
    const p = proy(f.dataset.p), sis = f.elements.sis.value;
    const tec = Object.keys(PERSONAS).find(k => PERSONAS[k].tec && PERSONAS[k].sis.includes(sis)) || 'edwin';
    const n = nuevoNumero('obs'); const id = 'OBS-' + String(n).padStart(3, '0');
    const deBts = f.dataset.rol === 'bts';
    S.obs.push({ id, proy: p.id, t: f.elements.t.value.trim(), sis, zona: f.elements.zona.value, estado: 'abierta', creada: Date.now(), antes: f.elements.foto.value || null, asignado: tec, prioridad: (f.querySelector('input[name="prioridad"]:checked') || {}).value || 'Media', origen: deBts ? 'BTS' : 'Supervisión', autor: deBts ? 'gerencia' : quienCliente(p) });
    cerrarModal(); hecho(`Observación ${id} registrada`, `Asignada a ${persona(tec).n}. ${tec === TECNICO_DEMO ? 'Ya la ve en su celular (vista del técnico).' : 'La recibe en su celular.'}`);
  },
  'obs-sigue': f => {
    if (!exigir(f, 'texto', 'Indique qué falta corregir.')) return;
    const o = obsPor(f.dataset.id); if (!o) return;
    o.estado = 'abierta'; o.devuelta = f.elements.texto.value.trim(); o.despues = null; o.levantada = null;
    registrar(o.proy, quienCliente(proy(o.proy)), `reabrió ${o.id}: ${o.devuelta}`, 'obs');
    cerrarModal(); hecho(`Observación ${o.id} reabierta`, 'BTS y el técnico reciben el aviso.', 'info');
  },
  'obs-rechazar': f => {
    if (!exigir(f, 'texto', 'Indique qué debe corregir.')) return;
    const o = obsPor(f.dataset.id); if (!o) return;
    o.estado = 'abierta'; o.devuelta = f.elements.texto.value.trim(); o.despues = null; o.levantada = null;
    cerrarModal(); hecho(`${o.id} devuelta al técnico`, 'La ve en su celular con su comentario.', 'info');
  },
  'observar-parte': f => {
    if (!exigir(f, 'texto', 'Escriba qué debe corregir.')) return;
    const x = partePor(f.dataset.id); if (!x) return;
    x.estado = 'observado'; x.motivo = f.elements.texto.value.trim();
    cerrarModal(); hecho(`Parte ${x.id} observado`, 'El técnico ve su comentario en el celular. El cliente no ve este parte.', 'info');
  },
  'etapas': f => {
    const p = proy(f.dataset.p);
    const antes = etapaPrincipal(p), previas = JSON.parse(JSON.stringify(p.etapas));
    ETAPAS.forEach(e => { const v = (f.querySelector(`input[name="e-${e.k}"]:checked`) || {}).value || 'pendiente'; const r = f.elements['a-' + e.k]; p.etapas[e.k] = { e: v, a: v === 'curso' ? (r ? +r.value : undefined) : v === 'hecha' ? 100 : 0 }; });
    const completadas = ETAPAS.filter(e => p.etapas[e.k].e === 'hecha' && (previas[e.k] || {}).e !== 'hecha').map(e => e.k);
    const cambio = etapaPrincipal(p) !== antes;
    guardar();
    if ((cambio || completadas.length) && p.avisos) { modalAvisoEtapa(p, { principal: cambio, completadas }); render(); }
    else { cerrarModal(); hecho('Etapas actualizadas', p.avisos ? 'Sin cambios de etapa que avisar.' : 'El cliente tiene los avisos desactivados.'); }
  },
  'avance': f => {
    const p = proy(f.dataset.p); const cambios = [];
    p.sistemas.forEach(s => { const v = +f.elements[s.k].value; if (Math.round(s.real) !== v) { cambios.push(`${SIS[s.k].c} ${pctE(s.real)} → ${pctE(v)}`); s.real = v; p.recienSis = s.k; p.recienTs = Date.now(); } });
    if (cambios.length) { registrar(p.id, 'gerencia', 'actualizó el avance: ' + cambios.join(', '), 'nota'); actualizarPagos(p, 'sistema'); }
    cerrarModal(); hecho(cambios.length ? 'Avance actualizado' : 'Sin cambios', cambios.length ? 'La curva S y el portal del cliente ya muestran el nuevo avance.' : '');
  },
  'dossier-cargar': f => {
    const p = proy(f.dataset.p), it = p.dossier.find(i => i.id === f.dataset.id); if (!it) return;
    it.estado = 'listo'; it.origen = `Cargado por la gerencia, ${fCorta(Date.now())}${f.dataset.archivo ? ' · ' + f.dataset.archivo : ' · archivo de ejemplo'}`;
    p.recienItem = it.id; p.recienItemTs = Date.now();
    registrar(p.id, 'gerencia', `cargó al dossier: ${it.n}`, 'dossier');
    const pagos = actualizarPagos(p, 'sistema');
    const d = dossierPct(p);
    cerrarModal(); hecho('Documento cargado al dossier', `${d.listos} de ${d.total} listos.${pagos.length ? ` El hito de pago ${pagos[0].n} (${soles(montoPago(p, pagos[0]))}) quedó listo para facturar.` : ''}`);
  },
  'subir-doc': f => {
    if (!exigir(f, 'n', 'Escriba el nombre del documento.')) return;
    const p = proy(f.dataset.p); const n = nuevoNumero('doc'); const id = 'd-n' + n;
    const tipo = f.elements.tipo.value, conf = f.elements.conf.value === 'si';
    S.docs.push({ id, proy: p.id, tipo, cod: f.elements.cod.value.trim() || `DOC-${n}`, n: f.elements.n.value.trim(), rev: f.elements.rev.value.trim() || (tipo === 'plano' ? 'A' : ''), estado: conf ? 'revision' : 'aprobado', f: Date.now(), aprobado: conf ? null : Date.now(), archivo: f.dataset.archivo || 'archivo de ejemplo', nuevo: true });
    const itId = f.elements.dossier.value; if (itId) { const it = p.dossier.find(i => i.id === itId); if (it) { it.doc = id; p.recienItem = it.id; p.recienItemTs = Date.now(); } }
    registrar(p.id, 'gerencia', `subió ${f.elements.n.value.trim()}${conf ? ' para conformidad del cliente' : ''}`, 'documento');
    actualizarPagos(p, 'sistema');
    cerrarModal(); hecho('Documento subido', conf ? 'Le aparece al cliente como pendiente de su conformidad.' : 'El cliente ya lo ve en su portal.');
  },
  'invitar': f => {
    if (!exigir(f, 'n', 'Escriba el nombre.') || !exigir(f, 'correo', 'Escriba el correo.')) return;
    const p = proy(f.dataset.p), rol = f.elements.rol.value;
    p.usuarios.push({ id: uid('u'), n: f.elements.n.value.trim(), correo: f.elements.correo.value.trim(), rol, lado: 'cliente', estado: 'invitado', permiso: rol === 'Supervisión de obra' ? 'Ve todo y da conformidades' : rol.startsWith('Observador') ? 'Solo lectura' : 'Ve todo y escribe consultas', desde: Date.now() });
    correoSimulado(p.id, f.elements.correo.value.trim(), `BTS le dio acceso al portal de ${p.nombre}`, 'Invitación');
    cerrarModal(); hecho('Invitación registrada', 'En la versión final le llega un correo con su acceso.');
  },
  'ticket': f => {
    if (!exigir(f, 't', 'Describa la falla.')) return;
    const p = proy(f.dataset.p); const n = nuevoNumero('ticket'); const id = 'TK-' + String(n).padStart(3, '0');
    S.tickets.push({ id, proy: p.id, t: f.elements.t.value.trim(), eq: f.elements.eq.value, prioridad: (f.querySelector('input[name="prioridad"]:checked') || {}).value || 'Media', estado: 'nuevo', creado: Date.now(), por: 'Cliente', resp: null, foto: f.elements.foto.value || null, notas: [] });
    cerrarModal(); hecho(`Falla ${id} reportada`, 'BTS la recibe al instante. Véala desde la gerencia en la pestaña Soporte.');
  },
  'ticket-cerrar': f => {
    if (!exigir(f, 'texto', 'Describa cómo se resolvió.')) return;
    const t = S.tickets.find(x => x.id === f.dataset.id); if (!t) return;
    t.estado = 'cerrado'; t.cerrado = Date.now(); t.solucion = f.elements.texto.value.trim(); t.resp = t.resp || 'jhon';
    cerrarModal(); hecho(`Falla ${t.id} resuelta`, 'El cliente ve la solución en su portal.');
  },
  'reprogramar': f => {
    const p = proy(f.dataset.p), v = p.garantia.visitas.find(x => x.estado !== 'hecha'); const nueva = deISO(f.elements.f.value);
    if (!v || !nueva || nueva <= HOY) { exigir(f, 'f', 'Elija una fecha futura.'); return; }
    v.f = nueva + 9 * HORA; v.estado = 'programada';
    registrar(p.id, quienCliente(p), `pidió mover el mantenimiento al ${fCorta(v.f)}`, 'nota');
    cerrarModal(); hecho('Nueva fecha pedida', `BTS le confirmará la visita del ${fLarga(v.f)}.`);
  },
  'nuevo-1': () => { ui.nuevo.paso = 2; ui.arriba = true; render(); },
  'nuevo-2': () => { if (validarNuevo()) { ui.nuevo.paso = 3; ui.arriba = true; render(); } else { render(); const el = $('[aria-invalid="true"]'); if (el) el.focus(); } },
  'nuevo-4': () => {
    if (!validarNuevo()) { ui.nuevo.paso = 2; render(); return; }
    const p = crearProyectoDesdePlantilla(datosNuevo());
    ui.nuevo.creado = p.id; ui.nuevo.tFin = Date.now(); ui.nuevo.paso = 5; ui.arriba = true;
    guardar(); render(); aviso('Proyecto creado', 'Ya aparece en la cartera.', 'ok');
  },
  'parte': () => {
    const t = ui.tec;
    const errores = {};
    if (!(+t.n > 0)) errores.n = 'Escriba la cantidad ejecutada hoy.';
    if (!String(t.t).trim()) errores.t = 'Cuente en una línea qué se hizo hoy.';
    if (Object.keys(errores).length) { t.errores = errores; render(); const el = $(errores.n ? '#t-n' : '#t-t'); if (el) el.focus(); return; }
    const pr = proy(t.proy); const a = avancePorCantidad(pr, t.sis, t.act, t.n);
    const n = nuevoNumero('parte'); const id = 'PD-' + String(n).padStart(4, '0');
    S.partes.push({ id, proy: t.proy, tec: TECNICO_DEMO, f: Date.now(), sis: t.sis, act: a.id, actN: a.nombre, n: a.n, total: a.total, zona: t.zona, inc: a.inc, cant: `${num(a.n)} ${a.unidad}`, t: String(t.t).trim().replace(/^./, c => c.toUpperCase()), personal: +t.personal || 1, horas: 9, fotos: t.fotos.slice(), nota: String(t.nota).trim(), estado: 'pendiente', aprobo: null });
    ui.tec = Object.assign(tecInicial(), { proy: t.proy, sis: t.sis, zona: t.zona });
    guardar(); location.hash = '#tecnico/enviado/' + id; aviso(`Parte ${id} enviado`, 'Queda por aprobar en la vista de BTS.', 'ok');
  },
  'levantar': f => {
    const lev = ui.levantar; const o = obsPor(f.dataset.id); if (!o || !lev) return;
    if (!lev.foto) { lev.error = ''; aviso('Falta la foto del después', 'Tómela o use una de ejemplo.'); return; }
    if (!lev.nota.trim()) { lev.error = 'Cuente qué se hizo para levantarla.'; render(); const el = $('#l-nota'); if (el) el.focus(); return; }
    o.estado = 'revision'; o.despues = lev.foto; o.nota = lev.nota.trim(); o.levantada = Date.now(); o.devuelta = null;
    ui.levantar = null; guardar();
    location.hash = '#tecnico/enviado/' + o.id; aviso(`${o.id} levantada`, 'BTS la revisa antes de mostrársela al cliente.', 'ok');
  },
};
document.addEventListener('submit', ev => {
  const f = ev.target.closest('form[data-f]'); if (!f) return;
  ev.preventDefault();
  const h = FORM[f.dataset.f]; if (h) h(f, ev);
});

/* ---------- arranque ---------- */
$('#modal').addEventListener('close', alCerrarModal);
$('#modal').addEventListener('click', ev => { if (ev.target === $('#modal')) cerrarModal(); });
window.addEventListener('hashchange', render);
let tRes = null;
window.addEventListener('resize', () => { clearTimeout(tRes); tRes = setTimeout(dibujarCurvas, 120); });
cargar();
if (!location.hash || ALIAS[location.hash] !== undefined) history.replaceState(null, '', ALIAS[location.hash || ''] || '#cliente/altiplano');
render();
