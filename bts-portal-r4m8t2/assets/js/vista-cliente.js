/* =====================================================================
   Cara 1 · Cliente: el portal que ve el Consorcio (o la entidad)
   ===================================================================== */
'use strict';

const TABS_CLIENTE = [['resumen', 'Resumen'], ['avance', 'Avance'], ['fotos', 'Fotos'], ['documentos', 'Documentos'], ['observaciones', 'Observaciones'], ['pagos', 'Pagos']];
const TABS_CLIENTE_CERRADO = [['resumen', 'Resumen'], ['equipos', 'Equipos y garantías'], ['soporte', 'Soporte'], ['documentos', 'Dossier y documentos']];

function obsVisiblesCliente(pid) {
  const os = obsDe(pid);
  return { abiertas: os.filter(o => o.estado === 'abierta' || o.estado === 'revision'), levantadas: os.filter(o => o.estado === 'levantada'), cerradas: os.filter(o => o.estado === 'cerrada') };
}
function pendientesCliente(p) {
  const res = [];
  docsDe(p.id).filter(d => d.estado === 'revision').sort((a, b) => (b.clave ? 1 : 0) - (a.clave ? 1 : 0)).forEach(d => {
    const pago = (p.pagos || []).find(g => (g.req || []).some(r => r.doc === d.id) && g.estado !== 'pagado' && g.estado !== 'aprobado');
    res.push({ ico: TIPO_DOC[d.tipo].ico, t: `${d.cod} · ${d.n}${d.rev ? ' (Rev. ' + d.rev + ')' : ''}`, s: `Espera su conformidad desde ${hace(d.f)}${pago ? ` · es lo último que falta para el hito de pago ${pago.n}` : ''}`, acc: `<button type="button" class="btn btn-linea btn-chico" data-a="ver-doc" data-id="${d.id}">Revisar</button>`, cls: pago ? 'aviso' : 'info' });
  });
  obsDe(p.id).filter(o => o.estado === 'levantada').forEach(o => res.push({ ico: 'check', t: `${o.id} · ${o.t}`, s: `BTS la levantó el ${fCorta(o.levantada)}. Confirme si queda conforme.`, acc: `<a class="btn btn-linea btn-chico" href="#cliente/${p.id}/observaciones" data-foco="obs-${o.id}">Ver antes y después</a>`, cls: 'info' }));
  return res;
}

/* quién está mirando el portal (en la muestra, la primera persona del cliente) */
function conectadoCliente(p) {
  const us = usuariosCliente(p);
  const u = us.find(x => PERSONAS[x.id]) || us.find(x => x.estado === 'activo') || us[0];
  if (!u) return '';
  const txt = PERSONAS[u.id] ? `${nombreUsuario(u)} · ${rolUsuario(u)}` : `${nombreUsuario(u)} · ${p.cliente}`;
  return `<p class="conectado">${ico('usuario')}<span>${u.estado === 'invitado' ? 'Así lo verá' : 'Conectado como'}: <b>${esc(txt)}</b></span></p>`;
}
function contextoCliente(p, tab, tabs) {
  const ov = obsVisiblesCliente(p.id);
  const nDocs = docsDe(p.id).filter(d => d.estado === 'revision').length;
  const cuentas = { observaciones: ov.abiertas.length + ov.levantadas.length, documentos: nDocs, soporte: S.tickets.filter(t => t.proy === p.id && t.estado !== 'cerrado').length };
  const opciones = S.proyectos.map(x => `<option value="${x.id}"${x.id === p.id ? ' selected' : ''}>${esc(x.cliente)} — ${esc(x.corto || x.nombre)}</option>`).join('');
  return `<div class="contexto"><div class="contexto-fila">
      <div class="contexto-t"><span class="etq">Portal del cliente · ${esc(p.cliente)}</span><h1>${esc(p.nombre)}</h1>${conectadoCliente(p)}</div>
      <div class="contexto-acciones">
        <label class="etq etq-sel" for="sel-cliente">Portal de</label>
        <select id="sel-cliente" class="entrada btn-chico" data-c="cambiar-cliente" style="min-height:36px;width:auto;max-width:260px;font-size:13.5px;padding:0 10px" title="Cada cliente ve solo su obra. En la muestra puede cambiar de cliente aquí.">${opciones}</select>
        ${p.estado === 'cerrado' ? `<button type="button" class="btn btn-marca btn-chico" data-a="nuevo-ticket" data-p="${p.id}">${ico('ticket')}Reportar una falla</button>` : `<button type="button" class="btn btn-marca btn-chico" data-a="consulta" data-p="${p.id}">${ico('mensaje')}Escribir una consulta</button>`}
      </div>
    </div></div>
    <div class="pestanas-barra"><nav class="pestanas" aria-label="Secciones del portal">${tabs.map(([k, n]) => `<a href="#cliente/${p.id}/${k}"${k === tab ? ' aria-current="page"' : ''}>${n}${cuentas[k] ? `<span class="n ${k === 'observaciones' || k === 'soporte' ? 'alerta' : 'aviso'}"><span class="sr">(</span>${cuentas[k]}<span class="sr"> ${k === 'documentos' ? 'por revisar' : 'pendientes'})</span></span>` : ''}</a>`).join('')}</nav></div>`;
}

function vCliente(r) {
  const p = proy(r.proy) || proy('altiplano');
  ui.clienteProy = p.id;
  const tabs = p.estado === 'cerrado' ? TABS_CLIENTE_CERRADO : TABS_CLIENTE;
  const tab = tabs.some(t => t[0] === r.tab) ? r.tab : 'resumen';
  let cuerpo = '';
  if (p.estado === 'cerrado') cuerpo = ({ resumen: cliPostventa, equipos: cliEquipos, soporte: cliSoporte, documentos: cliDossierCerrado })[tab](p);
  else cuerpo = ({ resumen: cliResumen, avance: cliAvance, fotos: cliFotos, documentos: cliDocumentos, observaciones: cliObservaciones, pagos: cliPagos })[tab](p);
  return contextoCliente(p, tab, tabs) + `<div class="pagina">${cuerpo}</div>`;
}

/* ---------- resumen de una obra en ejecución ---------- */
function cliResumen(p) {
  const pend = pendientesCliente(p);
  const ov = obsVisiblesCliente(p.id);
  const fotos = fotosDe(p.id).sort((a, b) => b.f - a.f).slice(0, 6);
  const ultAct = Math.max(p.inicio, ...partesDe(p.id).filter(x => x.estado === 'aprobado').map(x => x.aprobado || 0), ...fotosDe(p.id).map(f => f.f), ...S.actividad.filter(a => a.proy === p.id).map(a => a.ts));
  const r = resumenCobros(p);
  const sigPago = (p.pagos || []).find(g => g.estado === 'revision' || g.estado === 'aprobado') || (p.pagos || []).find(g => g.estado === 'pendiente');
  const consultas = consultasDe(p.id).sort((a, b) => b.ts - a.ts).slice(0, 2);
  const tarjetaConsultas = `<section class="tarjeta" aria-labelledby="t-cons"><div class="tarjeta-cab"><div><h2 class="tarjeta-t" id="t-cons">Consultas al residente de obra</h2></div></div>
      ${consultas.length ? `<ul class="lista">${consultas.map(c => `<li class="fila"><span class="fila-ico ${c.resp ? 'ok' : 'aviso'}" aria-hidden="true">${ico(c.resp ? 'check' : 'reloj')}</span><div class="fila-cuerpo"><div class="fila-t" style="font-weight:500">${esc(c.texto)}</div><div class="fila-s">${esc(persona(c.de).n)} · ${hace(c.ts)} · ${c.resp ? 'Respondida' : 'Esperando respuesta'}</div>${c.resp ? `<div class="obs-nota" style="margin-top:6px"><b>${esc(persona(c.resp.de).n)}:</b> ${esc(conFechas(c.resp.texto, c.resp.ts))}</div>` : ''}</div></li>`).join('')}</ul>` : '<p class="texto-gris">Aún no hay consultas.</p>'}
      <div class="tarjeta-pie"><button type="button" class="btn btn-marca btn-chico" data-a="consulta" data-p="${p.id}">${ico('mensaje')}Escribir una consulta</button><a class="enlace" href="#informe/${p.id}">Ver el informe semanal${ico('flecha-d')}</a></div></section>`;
  return `<div class="pila">
    ${rotuloHTML(p)}
    <div class="franja franja-avisos">${ico('correo')}<span class="crece"><b>Le avisamos por correo cuando su obra cambia de etapa</b> y cada viernes le llega el informe semanal. Última actualización: ${hace(ultAct)}.</span>
      <label class="interruptor"><input type="checkbox" data-c="avisos-cliente" data-p="${p.id}"${p.avisos ? ' checked' : ''}><span class="riel" aria-hidden="true"></span><span>Avisos por correo</span></label></div>
    ${pend.length ? `<section class="tarjeta" aria-labelledby="t-pend"><div class="tarjeta-cab"><div><h2 class="tarjeta-t" id="t-pend">Pendientes de su conformidad <span class="texto-gris" style="font-weight:500">(${pend.length})</span></h2></div></div>
      <ul class="lista">${pend.map(x => `<li class="fila"><span class="fila-ico ${x.cls}" aria-hidden="true">${ico(x.ico)}</span><div class="fila-cuerpo"><div class="fila-t">${esc(x.t)}</div><div class="fila-s">${esc(x.s)}</div></div><div class="fila-acc">${x.acc}</div></li>`).join('')}</ul></section>` : ''}
    <section class="tarjeta" aria-labelledby="t-etapas"><div class="tarjeta-cab"><div><h2 class="tarjeta-t" id="t-etapas">${porIniciar(p) ? 'Por iniciar: arranca el ' + fLarga(p.inicio) : 'Etapa actual: ' + ETAPA[etapaPrincipal(p)].n + (etapaPrincipal(p) !== 'garantia' && p.etapas[etapaPrincipal(p)].a ? ` · ${p.etapas[etapaPrincipal(p)].a}${NB}%` : '')}</h2></div></div>${etapasHTML(p)}</section>
    <div class="rejilla g-principal">
      <div class="pila">
        <section class="tarjeta" aria-labelledby="t-curva"><div class="tarjeta-cab"><div><h2 class="tarjeta-t" id="t-curva">Curva S: programado contra real</h2></div><a class="enlace" href="#cliente/${p.id}/avance">Ver detalle${ico('flecha-d')}</a></div>${curvaHTML(p)}</section>
        <section class="tarjeta" aria-labelledby="t-sis"><div class="tarjeta-cab"><div><h2 class="tarjeta-t" id="t-sis">Avance por sistema</h2></div></div>${sistemasHTML(p)}</section>
        ${tarjetaConsultas}
      </div>
      <div class="pila">
        <section class="tarjeta" aria-labelledby="t-hitos"><div class="tarjeta-cab"><div><h2 class="tarjeta-t" id="t-hitos">Próximos hitos</h2></div></div>${hitosHTML(p, 5)}</section>
        <section class="tarjeta" aria-labelledby="t-obs"><div class="tarjeta-cab"><div><h2 class="tarjeta-t" id="t-obs">Observaciones</h2></div><a class="enlace" href="#cliente/${p.id}/observaciones">Ver todas${ico('flecha-d')}</a></div>
          <div class="kpis kpis-tres" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">${[['Abiertas', ov.abiertas.length, 'texto-alerta'], ['Levantadas', ov.levantadas.length, ''], ['Cerradas', ov.cerradas.length, 'texto-ok']].map(([n, v, c]) => `<div class="kpi" style="padding:10px 12px;box-shadow:none"><span class="etq">${n}</span><div class="kpi-v ${c}" style="font-size:22px">${v}</div></div>`).join('')}</div>
          <ul class="lista" style="margin-top:6px">${ov.abiertas.slice(0, 3).map(o => `<li class="fila"><span class="fila-ico alerta" aria-hidden="true">${ico('alerta')}</span><div class="fila-cuerpo"><div class="fila-t">${esc(o.t)}</div><div class="fila-s">${o.id} · ${esc(o.zona)} · ${hace(o.creada)}</div></div></li>`).join('')}</ul>
          <div class="tarjeta-pie"><button type="button" class="btn btn-linea btn-chico" data-a="nueva-obs" data-p="${p.id}">${ico('mas')}Registrar observación</button></div></section>
        ${sigPago ? `<section class="tarjeta" aria-labelledby="t-pago"><div class="tarjeta-cab"><div><h2 class="tarjeta-t" id="t-pago">Hito de pago ${sigPago.n}: ${esc(sigPago.t.charAt(0).toLowerCase() + sigPago.t.slice(1))}</h2><p class="tarjeta-sub">${soles(montoPago(p, sigPago))} · ${pagoTxt(sigPago.estado, 'cliente').toLowerCase().replace(' · ', ', ')}</p></div></div>
          <ul class="reqs" style="margin-top:0">${(sigPago.req || []).map(rq => { const ev = evalReq(p, rq); return `<li class="${ev.ok ? 'si' : 'no'}">${ico(ev.ok ? 'check' : 'x')}<span>${esc(rq.t)}${ev.det ? ` <span class="texto-gris">— ${esc(detCliente(ev.det))}</span>` : ''}</span></li>`; }).join('')}</ul>
          <div class="tarjeta-pie"><span class="texto-gris" style="font-size:13px">Pagado a la fecha: <b class="mono" style="color:var(--tinta)">${soles(r.pagado)}</b></span><a class="enlace" href="#cliente/${p.id}/pagos">Ver todos los hitos${ico('flecha-d')}</a></div></section>` : ''}
      </div>
    </div>
    <section class="tarjeta" aria-labelledby="t-fotos"><div class="tarjeta-cab"><div><h2 class="tarjeta-t" id="t-fotos">Fotos recientes de la obra</h2></div><a class="enlace" href="#cliente/${p.id}/fotos">Ver todas (${fotosDe(p.id).length})${ico('flecha-d')}</a></div>
      ${fotos.length ? `<div class="galeria compacta">${fotos.map(f => fotoTile(f)).join('')}</div>` : `<div class="vacio">${ico('camara')}Las fotos aparecen aquí cuando BTS aprueba los partes de obra.</div>`}</section>
  </div>`;
}

/* ---------- avance ---------- */
function cliAvance(p) {
  const aprobados = partesDe(p.id).filter(x => x.estado === 'aprobado').sort((a, b) => b.f - a.f);
  return `<div class="pila">
    <section class="tarjeta" aria-labelledby="t-curva2"><div class="tarjeta-cab"><div><h2 class="tarjeta-t" id="t-curva2">Curva S: programado contra real</h2><p class="tarjeta-sub">Cada punto real sale de los partes diarios que BTS aprueba. Pase el cursor o use las flechas para ver cada semana.</p></div></div>${curvaHTML(p, { alto: 300 })}</section>
    <div class="rejilla g-mitad">
      <section class="tarjeta" aria-labelledby="t-sis2"><div class="tarjeta-cab"><div><h2 class="tarjeta-t" id="t-sis2">Avance por sistema</h2></div></div>${sistemasHTML(p)}</section>
      <section class="tarjeta" aria-labelledby="t-et2"><div class="tarjeta-cab"><div><h2 class="tarjeta-t" id="t-et2">Etapas de la obra</h2></div></div>${etapasHTML(p)}</section>
    </div>
    <section class="tarjeta" aria-labelledby="t-bit"><div class="tarjeta-cab"><div><h2 class="tarjeta-t" id="t-bit">Bitácora: avance aprobado, día por día</h2><p class="tarjeta-sub">Solo aparece lo que BTS ya revisó y aprobó.</p></div></div>
      ${aprobados.length ? `<ul class="lista">${aprobados.slice(0, 12).map(x => `<li class="fila"><span class="fila-ico ok" aria-hidden="true">${ico('check')}</span><div class="fila-cuerpo"><div class="fila-t">${esc(x.t)}</div><div class="fila-s">${fCorta(x.f)} · ${esc(SIS[x.sis].c)} · ${esc(x.zona)}${x.cant ? ` · ${esc(x.cant)}` : ''} · <span class="mono">+${x.inc.toFixed(1)} pts</span>${x.fotos.length ? ` · ${plural(x.fotos.length, 'foto', 'fotos')}` : ''}</div></div></li>`).join('')}</ul>` : `<div class="vacio">${ico('casco')}Todavía no hay partes aprobados.</div>`}</section>
  </div>`;
}

/* ---------- fotos ---------- */
function cliFotos(p) {
  const todas = fotosDe(p.id).sort((a, b) => b.f - a.f);
  const zonas = [...new Set(todas.map(f => f.zona.split(' · ')[0]))];
  const filtro = ui.filtroFotos && (ui.filtroFotos.p === p.id) ? ui.filtroFotos.z : '';
  const vis = filtro ? todas.filter(f => f.zona.startsWith(filtro)) : todas;
  const grupos = {};
  vis.forEach(f => { const k = fISO(lunesDe(f.f)); (grupos[k] = grupos[k] || []).push(f); });
  return `<section class="tarjeta"><div class="tarjeta-cab"><div><h2 class="tarjeta-t">Fotos de avance por fecha y zona</h2><p class="tarjeta-sub">Llegan desde la obra con cada parte diario y se publican cuando BTS lo aprueba.</p></div></div>
    <div class="filtros" role="group" aria-label="Filtrar por zona"><button type="button" class="chip" data-a="filtro-fotos" data-p="${p.id}" data-z="" aria-pressed="${!filtro}">Todas <span class="n">${todas.length}</span></button>${zonas.map(z => `<button type="button" class="chip" data-a="filtro-fotos" data-p="${p.id}" data-z="${esc(z)}" aria-pressed="${filtro === z}">${esc(z)} <span class="n">${todas.filter(f => f.zona.startsWith(z)).length}</span></button>`).join('')}</div>
    ${Object.keys(grupos).length ? Object.keys(grupos).sort().reverse().map(k => `<h3 class="etq" style="margin:16px 0 10px">Semana del ${fCorta(deISO(k))}</h3><div class="galeria">${grupos[k].map(f => fotoTile(f)).join('')}</div>`).join('') : `<div class="vacio">${ico('camara')}No hay fotos para este filtro.</div>`}
  </section>`;
}

/* ---------- documentos ---------- */
function cliDocumentos(p) {
  return `<div class="rejilla g-principal">
    <section class="tarjeta"><div class="tarjeta-cab"><div><h2 class="tarjeta-t">Documentos de la obra</h2><p class="tarjeta-sub">Planos, fichas, actas y protocolos, siempre en su versión vigente. Lo que espera su conformidad aparece primero.</p></div></div>${docsPorTipoHTML(p.id, 'cliente')}</section>
    <div class="pila">${dossierResumenCliente(p)}</div>
  </div>`;
}
function dossierResumenCliente(p) {
  const d = dossierPct(p);
  return `<section class="tarjeta"><div class="tarjeta-cab"><div><h2 class="tarjeta-t">Dossier de cierre</h2><p class="tarjeta-sub">Se arma mientras avanza la obra.</p></div></div>
    <div style="display:flex;gap:16px;align-items:center">${anillo(d.pct, `Dossier al ${Math.round(d.pct)} %`)}<p class="texto-gris" style="font-size:14px"><b class="mono" style="color:var(--tinta);font-size:16px">${d.listos} de ${d.total}</b> documentos listos: protocolos, as-built, fichas, garantías, manuales y actas. Al terminar la obra lo descarga completo, en un solo PDF con índice.</p></div>
    <div style="margin-top:14px">${CAT_DOSSIER.map(c => { const its = p.dossier.filter(i => i.cat === c.k); if (!its.length) return ''; const ok = its.filter(i => estadoItem(i) === 'listo').length; return `<div class="dinero-fila" style="margin-bottom:10px"><div class="df-cab"><b>${c.n}</b><span>${ok} / ${its.length}</span></div><div class="dc-barra"><i class="${ok === its.length ? 'completo' : ''}" style="width:${ok / its.length * 100}%"></i></div></div>`; }).join('')}</div></section>`;
}

/* ---------- observaciones ---------- */
function cliObservaciones(p) {
  const ov = obsVisiblesCliente(p.id);
  const f = (ui.filtroObs && ui.filtroObs.p === p.id) ? ui.filtroObs.f : 'pendientes';
  const lista = f === 'cerradas' ? ov.cerradas : f === 'todas' ? [...ov.levantadas, ...ov.abiertas, ...ov.cerradas] : [...ov.levantadas, ...ov.abiertas];
  return `<section class="tarjeta"><div class="tarjeta-cab"><div><h2 class="tarjeta-t">Observaciones de la obra</h2><p class="tarjeta-sub">Cada observación queda con su foto, su responsable y su levantamiento.</p></div><button type="button" class="btn btn-marca btn-chico" data-a="nueva-obs" data-p="${p.id}">${ico('mas')}Registrar observación</button></div>
    <div class="filtros" role="group" aria-label="Filtrar observaciones">${[['pendientes', 'Por resolver', ov.abiertas.length + ov.levantadas.length], ['cerradas', 'Cerradas', ov.cerradas.length], ['todas', 'Todas', ov.abiertas.length + ov.levantadas.length + ov.cerradas.length]].map(([k, n, c]) => `<button type="button" class="chip" data-a="filtro-obs" data-p="${p.id}" data-f="${k}" aria-pressed="${f === k}">${n} <span class="n">${c}</span></button>`).join('')}</div>
    <div class="obs-lista">${lista.length ? lista.map(o => obsHTML(o, 'cliente')).join('') : `<div class="vacio">${ico('check')}No hay observaciones en esta lista.</div>`}</div></section>`;
}

/* ---------- pagos ---------- */
function cliPagos(p) {
  return `<section class="tarjeta"><div class="tarjeta-cab"><div><h2 class="tarjeta-t">Hitos de pago</h2><p class="tarjeta-sub">Cada hito muestra lo que pide el contrato y si ya se cumplió. Si algo depende de usted, lo verá aquí.</p></div></div>${pagosHTML(p, 'cliente')}</section>`;
}

/* ---------- postventa (obra cerrada) ---------- */
function vencimiento(ts, vida) {
  if (vida) return { cls: '', txt: 'De por vida (limitada)' };
  const dd = diasEntre(HOY, ts);
  if (dd < 0) return { cls: 'alerta', txt: `Venció el ${fMedia(ts)}` };
  if (dd <= 120) return { cls: 'aviso', txt: `Vence en ${dd} días (${fCorta(ts)})` };
  return { cls: '', txt: `Hasta el ${fMedia(ts)}` };
}
function cliPostventa(p) {
  const g = p.garantia;
  const abiertos = S.tickets.filter(t => t.proy === p.id && t.estado !== 'cerrado');
  const prox = g.visitas.find(v => v.estado !== 'hecha');
  const porVencer = g.equipos.filter(e => !e.vida && diasEntre(HOY, e.hasta) <= 120);
  const contratoDias = diasEntre(HOY, g.contrato.vence);
  return `<div class="pila">
    ${rotuloHTML(p)}
    <div class="franja ok">${ico('escudo')}<span class="crece"><b>Su obra está en garantía hasta el ${fMedia(g.hasta)}.</b> Aquí ve sus equipos, sus mantenimientos y el estado de cada falla que reporta.</span></div>
    <div class="rejilla g-principal">
      <div class="pila">
        <section class="tarjeta"><div class="tarjeta-cab"><div><h2 class="tarjeta-t">Fallas reportadas</h2></div><button type="button" class="btn btn-marca btn-chico" data-a="nuevo-ticket" data-p="${p.id}">${ico('ticket')}Reportar una falla</button></div>${ticketsHTML(p, 'cliente', 3)}<div class="tarjeta-pie"><a class="enlace" href="#cliente/${p.id}/soporte">Ver el historial de soporte${ico('flecha-d')}</a></div></section>
        <section class="tarjeta"><div class="tarjeta-cab"><div><h2 class="tarjeta-t">Garantías por equipo</h2></div><a class="enlace" href="#cliente/${p.id}/equipos">Ver los ${g.equipos.length} equipos${ico('flecha-d')}</a></div>
          ${porVencer.length ? porVencer.map(e => `<div class="franja aviso" style="margin-bottom:8px">${ico('reloj')}<span class="crece"><b>${esc(e.eq)}</b>: ${vencimiento(e.hasta).txt.toLowerCase()}.${e.renovable ? ' Conviene renovarlo para no quedarse sin actualizaciones.' : ''}</span></div>`).join('') : ''}
          ${equiposHTML(p, 4)}</section>
      </div>
      <div class="pila">
        ${prox ? `<section class="tarjeta"><div class="tarjeta-cab"><div><h2 class="tarjeta-t">Próximo mantenimiento: ${fLarga(prox.f)}</h2><p class="tarjeta-sub">${enDias(prox.f).replace(/^./, c => c.toUpperCase())} · ${prox.estado === 'confirmada' ? 'fecha confirmada por usted' : 'por confirmar'}</p></div></div>
          <p style="font-size:14px;color:var(--texto-2)">${esc(prox.alcance)}</p>
          <div class="tarjeta-pie">${prox.estado === 'confirmada' ? insignia('ok', 'Fecha confirmada', 'check') : `<button type="button" class="btn btn-ok btn-chico" data-a="mant-confirmar" data-p="${p.id}">${ico('check')}Confirmar la fecha</button>`}<button type="button" class="btn btn-linea btn-chico" data-a="mant-reprogramar" data-p="${p.id}">Pedir otra fecha</button></div></section>` : ''}
        <section class="tarjeta"><div class="tarjeta-cab"><div><h2 class="tarjeta-t">Contrato de ${esc(g.contrato.n.charAt(0).toLowerCase() + g.contrato.n.slice(1))}</h2><p class="tarjeta-sub">Vence el ${fMedia(g.contrato.vence)} · ${contratoDias >= 0 ? `en ${contratoDias} días` : 'vencido'}</p></div></div>
          ${g.contrato.propuesta ? `<div class="franja ok">${ico('correo')}<span class="crece">BTS le envió la propuesta de renovación el ${fCorta(g.contrato.propuesta)}.</span></div>` : g.contrato.pedido ? `<div class="franja ok">${ico('check')}<span class="crece">Pidió la renovación el ${fCorta(g.contrato.pedido)}. BTS le envía la propuesta.</span></div>` : `<p style="font-size:14px;color:var(--texto-2)">Para seguir con las visitas preventivas y la atención prioritaria después del vencimiento, pida la propuesta de renovación.</p><div class="tarjeta-pie"><button type="button" class="btn btn-linea btn-chico" data-a="renovar-contrato" data-p="${p.id}">${ico('enviar')}Pedir propuesta de renovación</button></div>`}</section>
        <section class="tarjeta"><div class="tarjeta-cab"><div><h2 class="tarjeta-t">Dossier de cierre entregado</h2><p class="tarjeta-sub">${p.dossier.length} documentos, entregados el ${fCorta(p.dossierEntregado)}.</p></div></div>
          <div class="btns"><button type="button" class="btn btn-tinta btn-chico" data-a="generar-dossier" data-p="${p.id}" data-solo="1">${ico('descarga')}Descargar el dossier</button><a class="btn btn-linea btn-chico" href="#cliente/${p.id}/documentos">Ver el índice</a></div></section>
      </div>
    </div>
  </div>`;
}
function equiposHTML(p, lim = 99) {
  return `<div>${p.garantia.equipos.slice(0, lim).map(e => { const v = vencimiento(e.hasta, e.vida); return `<div class="doc"><span class="doc-ico" aria-hidden="true">${ico('herramienta')}</span><div style="min-width:0"><div class="doc-t">${esc(e.eq)}</div><div class="doc-s"><span>${esc(e.marca)} ${esc(e.modelo)}</span><span class="mono">S/N ${esc(e.serie)}</span><span>${esc(e.ubic)}</span></div></div><div class="doc-acc"><span class="estado-punto ${v.cls}">${esc(v.txt)}</span></div></div>`; }).join('')}</div>`;
}
function cliEquipos(p) {
  return `<section class="tarjeta"><div class="tarjeta-cab"><div><h2 class="tarjeta-t">Equipos con serie y fin de garantía</h2><p class="tarjeta-sub">Si un equipo falla, repórtelo desde aquí y BTS gestiona la garantía con el fabricante.</p></div><button type="button" class="btn btn-marca btn-chico" data-a="nuevo-ticket" data-p="${p.id}">${ico('ticket')}Reportar una falla</button></div>${equiposHTML(p)}</section>`;
}
const TICKET_TXT = { nuevo: ['aviso', 'Recibido'], atencion: ['info', 'En atención'], cerrado: ['ok', 'Resuelto'] };
function ticketsHTML(p, rol, lim = 99) {
  const ts = S.tickets.filter(t => t.proy === p.id).sort((a, b) => (a.estado === 'cerrado') - (b.estado === 'cerrado') || b.creado - a.creado).slice(0, lim);
  if (!ts.length) return `<div class="vacio">${ico('ticket')}No hay fallas reportadas.</div>`;
  return `<ul class="lista">${ts.map(t => { const [cls, txt] = TICKET_TXT[t.estado]; const ult = (t.notas || []).slice(-1)[0];
    return `<li class="fila"><span class="fila-ico ${t.estado === 'cerrado' ? 'ok' : t.estado === 'nuevo' ? 'aviso' : 'info'}" aria-hidden="true">${ico(t.estado === 'cerrado' ? 'check' : 'ticket')}</span><div class="fila-cuerpo"><div class="fila-t"><span class="mono" style="font-size:12.5px;color:var(--gris)">${t.id}</span> ${esc(t.t)}</div>
      <div class="fila-s">${esc(t.eq)} · prioridad ${esc(t.prioridad.toLowerCase())} · ${t.estado === 'cerrado' ? `resuelto en ${durTxt(t.cerrado - t.creado)}` : `reportado ${hace(t.creado)}`}${t.resp ? ` · ${esc(persona(t.resp).n)}` : ''}</div>
      ${t.solucion ? `<div class="obs-nota" style="margin-top:6px">${esc(t.solucion)}</div>` : ult ? `<div class="obs-nota" style="margin-top:6px"><b>${esc(persona(ult.quien).n)}:</b> ${esc(ult.t)}</div>` : ''}
      ${rol === 'bts' && t.estado !== 'cerrado' ? `<div class="btns" style="margin-top:8px">${t.estado === 'nuevo' ? `<button type="button" class="btn btn-linea btn-chico" data-a="ticket-atender" data-id="${t.id}">Asignar y atender</button>` : ''}<button type="button" class="btn btn-ok btn-chico" data-a="ticket-cerrar" data-id="${t.id}">${ico('check')}Marcar resuelto</button></div>` : ''}</div>
      ${insignia(cls, txt)}</li>`; }).join('')}</ul>`;
}
function durTxt(ms) { const h = ms / HORA; if (h < 1) return Math.max(1, Math.round(ms / 6e4)) + ' min'; if (h < 48) return Math.round(h) + ' h'; return Math.round(h / 24) + ' días'; }
function cliSoporte(p) {
  return `<section class="tarjeta"><div class="tarjeta-cab"><div><h2 class="tarjeta-t">Historial de fallas y atenciones</h2><p class="tarjeta-sub">Cada falla con su responsable, su avance y su solución.</p></div><button type="button" class="btn btn-marca btn-chico" data-a="nuevo-ticket" data-p="${p.id}">${ico('ticket')}Reportar una falla</button></div>${ticketsHTML(p, 'cliente')}</section>`;
}
function cliDossierCerrado(p) {
  return `<div class="pila">${dossierHTML(p, 'cliente')}<div class="btns"><button type="button" class="btn btn-tinta" data-a="generar-dossier" data-p="${p.id}" data-solo="1">${ico('descarga')}Descargar el dossier completo</button></div></div>`;
}
