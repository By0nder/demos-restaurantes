/* =====================================================================
   Cara 2 · BTS (gerencia): cartera, proyecto, aprobaciones y dinero
   ===================================================================== */
'use strict';

/* ---------- cálculos de la cartera ---------- */
const activos = () => S.proyectos.filter(p => p.estado !== 'cerrado');
function pendientesBts(p) {
  return {
    partes: partesDe(p.id).filter(x => x.estado === 'pendiente').length,
    levantamientos: obsDe(p.id).filter(o => o.estado === 'revision').length,
    abiertas: obsDe(p.id).filter(o => o.estado === 'abierta' || o.estado === 'revision').length,
    porResolver: obsDe(p.id).filter(o => o.estado !== 'cerrada').length,
    consultas: consultasDe(p.id).filter(c => !c.resp).length,
    tickets: S.tickets.filter(t => t.proy === p.id && t.estado !== 'cerrado').length,
  };
}
function alertasCartera() {
  const al = [];
  S.proyectos.forEach(p => {
    const pe = pendientesBts(p), r = resumenCobros(p), d = dossierPct(p);
    const nom = p.corto || p.nombre;
    if (r.detenido > 0) {
      const enPrueba = p.sistemas.filter(s => s.real < 100).sort((a, b) => a.real - b.real).map(s => SIS[s.k].c);
      const inst = p.etapas && p.etapas.instalacion && p.etapas.instalacion.e === 'hecha';
      al.push({ peso: 100, cls: 'aviso', ico: 'moneda', t: `${soles(r.detenido)} detenidos en ${nom}`, s: `${inst ? 'Instalación concluida; faltan' : 'Faltan'} ${plural(d.faltan, 'documento', 'documentos')} del dossier${enPrueba.length ? ` y las pruebas finales de ${enPrueba.length > 2 ? plural(enPrueba.length, 'sistema', 'sistemas') + ' (' + enPrueba.slice(0, 2).join(', ') + ' y otros)' : enPrueba.join(' y ')}` : ''}. Sin eso no se liberan los últimos pagos.`, href: `#bts/${p.id}/dossier`, btn: 'Ver qué falta' });
    }
    if (pe.partes) al.push({ peso: 90, cls: 'info', ico: 'casco', t: `${plural(pe.partes, 'parte diario', 'partes diarios')} por aprobar · ${nom}`, s: 'Hasta que los apruebe, el cliente no ve ese avance ni esas fotos.', href: `#bts/${p.id}/partes`, btn: 'Revisar' });
    if (pe.levantamientos) al.push({ peso: 85, cls: 'info', ico: 'check', t: `${plural(pe.levantamientos, 'levantamiento de observación', 'levantamientos de observaciones')} por aprobar · ${nom}`, s: 'El técnico subió la foto del después.', href: `#bts/${p.id}/observaciones`, btn: 'Revisar' });
    consultasDe(p.id).filter(c => !c.resp).forEach(c => al.push({ peso: 80, cls: 'aviso', ico: 'mensaje', t: `Consulta sin responder de ${persona(c.de).n} · ${nom}`, s: `«${c.texto.length > 90 ? c.texto.slice(0, 88) + '…' : c.texto}» · ${hace(c.ts)}`, accion: `data-a="responder" data-id="${c.id}"`, btn: 'Responder' }));
    (p.pagos || []).filter(g => g.estado === 'aprobado').forEach(g => al.push({ peso: 95, cls: 'ok', ico: 'moneda', t: `Hito de pago ${g.n} listo para facturar: ${soles(montoPago(p, g))} · ${nom}`, s: g.t, href: `#bts/${p.id}/pagos`, btn: 'Ver el hito' }));
    const usados = new Set();
    (p.hitos || []).filter(h => h.f < HOY && h.f > HOY - 30 * DIA && p.estado !== 'cerrado').forEach(h => {
      const g = h.tipo === 'documento' && (p.pagos || []).find(x => x.estado === 'revision' && (x.req || []).some(rq => rq.calc === 'fichas' && !evalReq(p, rq).ok));
      if (g) usados.add(g.n);
      al.push({ peso: g ? 72 : 65, cls: 'aviso', ico: 'calendario', t: `Hito vencido: ${h.t} · ${nom}`, s: `Era para el ${fCorta(h.f)}.${g ? ` De eso depende el hito de pago ${g.n} (${soles(montoPago(p, g))}).` : ''}`, href: g ? `#bts/${p.id}/pagos` : `#bts/${p.id}`, btn: g ? 'Ver el hito' : 'Ver la obra' });
    });
    (p.pagos || []).filter(g => g.estado === 'revision' && !usados.has(g.n)).forEach(g => { const falta = (g.req || []).filter(rq => !evalReq(p, rq).ok).map(rq => { const ev = evalReq(p, rq); return rq.t + (ev.det && !/revisi/.test(ev.det) ? ` (${ev.det})` : ''); }); if (falta.length) al.push({ peso: 70, cls: 'info', ico: 'moneda', t: `Hito de pago ${g.n} (${soles(montoPago(p, g))}) espera al cliente · ${nom}`, s: 'Falta: ' + falta.join('; ').replace(/^./, c => c.toLowerCase()), href: `#bts/${p.id}/pagos`, btn: 'Ver el hito' }); });
    p.sistemas.forEach(s => { const prog = planSistema(s, semanaHoy(p)); if (p.estado === 'ejecucion' && s.real - prog <= -10) al.push({ peso: 60, cls: 'aviso', ico: 'alerta', t: `${SIS[s.k].c}: ${Math.round(prog - s.real)} puntos de atraso · ${nom}`, s: s.nota ? conFechas(s.nota.x) : 'Revise el plan de recuperación.', href: `#bts/${p.id}`, btn: 'Ver la obra' }); });
    S.tickets.filter(t => t.proy === p.id && t.estado !== 'cerrado').forEach(t => al.push({ peso: 75, cls: t.estado === 'nuevo' ? 'alerta' : 'info', ico: 'ticket', t: `Falla ${t.estado === 'nuevo' ? 'nueva' : 'en atención'}: ${t.t} · ${nom}`, s: `${t.id} · reportada ${hace(t.creado)}`, href: `#bts/${p.id}/soporte`, btn: 'Atender' }));
    if (p.garantia && p.garantia.contrato) { const c = p.garantia.contrato, dd = diasEntre(HOY, c.vence); if (c.propuesta) { /* ya se envió: nada pendiente */ } else if (c.pedido) al.push({ peso: 88, cls: 'ok', ico: 'enviar', t: `${nom} pidió la propuesta de renovación del mantenimiento`, s: `${soles(c.monto)} al año · lo pidió ${hace(c.pedido)}`, href: `#bts/${p.id}`, btn: 'Ver' }); else if (dd <= 60) al.push({ peso: 55, cls: 'info', ico: 'reloj', t: `El contrato de mantenimiento de ${nom} vence en ${dd} días`, s: `${soles(c.monto)} al año. El cliente ve el vencimiento en su portal.`, href: `#bts/${p.id}`, btn: 'Ver' }); }
  });
  return al.sort((a, b) => b.peso - a.peso);
}

/* ---------- cartera ---------- */
function vCartera() {
  const act = activos();
  const tot = { contrato: sum(act, p => p.monto), pagado: 0, detenido: 0, sinCobrar: 0, revision: 0, aprobado: 0 };
  act.forEach(p => { const r = resumenCobros(p); tot.pagado += r.pagado; tot.detenido += r.detenido; tot.sinCobrar += r.sinCobrar; tot.revision += r.revision; tot.aprobado += r.aprobado; });
  const al = alertasCartera();
  /* el proyecto con más dinero en cada estado (para que el KPI lleve directo a él) */
  const mayor = k => act.map(p => [p, resumenCobros(p)[k]]).sort((a, b) => b[1] - a[1])[0];
  const pendTxt = pe => [pe.partes ? plural(pe.partes, 'parte', 'partes') : '', pe.levantamientos ? plural(pe.levantamientos, 'levantamiento', 'levantamientos') : '', pe.porResolver ? plural(pe.porResolver, 'obs.', 'obs.') : '', pe.consultas ? plural(pe.consultas, 'consulta', 'consultas') : '', pe.tickets ? plural(pe.tickets, 'falla', 'fallas') : ''].filter(Boolean).map(x => `<span class="nowrap">${x}</span>`).join(' · ');
  const mini = p => p.foto ? `<span class="proy-mini"><img src="${FOTOS[p.foto].m}" alt="" loading="lazy"></span>` : `<span class="proy-mini sin-foto" aria-hidden="true">${ico((PLANTILLA[p.plantilla] || {}).ico || 'edificio')}</span>`;
  const filas = S.proyectos.map(p => {
    const a = avanceHoy(p), r = resumenCobros(p), d = dossierPct(p), pe = pendientesBts(p);
    const etq = p.estado === 'cerrado' ? insignia('ok', 'Garantía', 'escudo') : porIniciar(p) ? insignia('neutra', 'Por iniciar', 'calendario') : insignia(p.estado === 'entrega' ? 'aviso' : 'info', ETAPA[etapaPrincipal(p)].n);
    const atraso = a.desvio <= -5;
    return { p, a, r, d, pe, etq, atraso };
  });
  const filaHTML = ({ p, a, r, d, pe, etq, atraso }) => `<tr data-a="ir" data-h="#bts/${p.id}">
      <td><div class="proy-cel">${mini(p)}<div><a href="#bts/${p.id}">${esc(p.nombre)}</a><small>${esc(p.cliente)} · <span class="mono nowrap">${esc(p.codigo)}</span></small></div></div></td>
      <td>${etq}${p.nuevo ? ' ' + insignia('tinta', 'Nuevo') : ''}</td>
      <td><div class="mini-avance"><div class="mono"><span>${pct(a.real)}</span>${p.estado === 'cerrado' ? '' : `<span class="${atraso ? 'texto-aviso' : 'texto-gris'}">${signo(a.desvio)}</span>`}</div><div class="mini-pista"><i class="${atraso ? 'atraso' : ''}" style="width:${clamp(a.real, 0, 100)}%"></i>${p.estado === 'cerrado' ? '' : `<u style="left:${clamp(a.prog, 0, 100)}%"></u>`}</div></div></td>
      <td class="num">${p.monto - r.pagado > 0 ? soles(p.monto - r.pagado) : "—"}<br><span class="texto-gris" style="font-size:12px">cobrado ${soles(r.pagado)}</span></td>
      <td class="num ${r.detenido ? 'texto-aviso' : 'texto-gris'}">${r.detenido ? soles(r.detenido) : '—'}</td>
      <td class="num">${pct(d.pct, 0)}</td>
      <td>${pendTxt(pe) || '<span class="texto-gris">Al día</span>'}</td>
    </tr>`;
  const tarjeta = ({ p, a, r, d, pe, etq, atraso }) => `<a class="tarjeta" href="#bts/${p.id}" style="display:block;text-decoration:none;color:inherit">
      <div class="proy-cel" style="min-width:0">${mini(p)}<div style="min-width:0"><b style="display:block;font-size:15px;line-height:1.3">${esc(p.nombre)}</b><small>${esc(p.cliente)}</small></div></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">${etq}${r.detenido ? insignia('aviso', soles(r.detenido) + ' detenidos', 'moneda') : ''}</div>
      <div class="mini-avance" style="width:auto;margin-top:12px"><div class="mono"><span>Avance ${pct(a.real)}</span>${p.estado === 'cerrado' ? '' : `<span class="${atraso ? 'texto-aviso' : 'texto-gris'}">${signo(a.desvio)} pts</span>`}</div><div class="mini-pista"><i class="${atraso ? 'atraso' : ''}" style="width:${clamp(a.real, 0, 100)}%"></i>${p.estado === 'cerrado' ? '' : `<u style="left:${clamp(a.prog, 0, 100)}%"></u>`}</div></div>
      <div class="doc-s" style="margin-top:10px"><span>${p.monto - r.pagado > 0 ? `Por cobrar ${soles(p.monto - r.pagado)} de ${soles(p.monto)}` : `Cobrado completo: ${soles(p.monto)}`}</span><span>Dossier ${pct(d.pct, 0)}</span>${pe.partes ? `<span class="texto-aviso">${plural(pe.partes, 'parte por aprobar', 'partes por aprobar')}</span>` : ''}</div></a>`;
  return `<div class="pagina">
    <div class="titulo-vista"><div><span class="etq cian">BTS · gerencia</span><h1>Cartera de proyectos</h1><p>${fLarga(Date.now()).replace(/^./, c => c.toUpperCase())} · ${plural(act.length, 'obra activa', 'obras activas')} y ${plural(S.proyectos.length - act.length, 'en garantía', 'en garantía')}</p></div>
      <a class="btn btn-marca btn-grande" href="#nuevo">${ico('mas')}Nuevo proyecto</a></div>
    <div class="kpis kpis-cinco">
      <div class="kpi"><span class="etq">${ico('edificio')}Contratado</span><div class="kpi-v">${soles(tot.contrato)}</div><div class="kpi-s">En ${plural(act.length, 'obra activa', 'obras activas')}</div></div>
      <div class="kpi"><span class="etq">${ico('moneda')}Cobrado</span><div class="kpi-v">${soles(tot.pagado)}</div><div class="kpi-s">${pct(tot.pagado / tot.contrato * 100, 0)} de lo contratado</div></div>
      ${tot.aprobado > 0 ? `<a class="kpi" href="#bts/${mayor('aprobado')[0].id}/pagos"><span class="etq">${ico('check')}Listo para facturar</span><div class="kpi-v texto-ok">${soles(tot.aprobado)}</div><div class="kpi-s">Hitos con todos sus requisitos</div></a>` : `<div class="kpi"><span class="etq">${ico('check')}Listo para facturar</span><div class="kpi-v">${soles(0)}</div><div class="kpi-s">Ningún hito con todo cumplido aún</div></div>`}
      ${tot.revision > 0 ? `<a class="kpi" href="#bts/${mayor('revision')[0].id}/pagos"><span class="etq">${ico('reloj')}En revisión del cliente</span><div class="kpi-v">${soles(tot.revision)}</div><div class="kpi-s">Presentados; esperan la conformidad del cliente</div></a>` : `<div class="kpi"><span class="etq">${ico('reloj')}En revisión del cliente</span><div class="kpi-v">${soles(0)}</div><div class="kpi-s">Ningún hito presentado por ahora</div></div>`}
      ${tot.detenido > 0 ? `<a class="kpi dinero" href="#bts/${mayor('detenido')[0].id}/dossier"><span class="etq">${ico('alerta')}Detenido por documentos</span><div class="kpi-v">${soles(tot.detenido)}</div><div class="kpi-s">Pagos que esperan el dossier de cierre</div></a>` : `<div class="kpi"><span class="etq">${ico('check')}Detenido por documentos</span><div class="kpi-v">${soles(0)}</div><div class="kpi-s">Ningún pago frenado por documentos</div></div>`}
    </div>
    <div class="rejilla g-principal" style="margin-top:16px">
      <section class="tarjeta" aria-labelledby="t-aten"><div class="tarjeta-cab"><div><h2 class="tarjeta-t" id="t-aten">${al.length ? `Requiere su atención <span class="texto-gris" style="font-weight:500">(${al.length})</span>` : 'Todo al día'}</h2></div></div>
        ${al.length ? `<div>${al.map(x => `<div class="alerta-fila"><span class="fila-ico ${x.cls}" aria-hidden="true">${ico(x.ico)}</span><div style="min-width:0"><div class="fila-t">${esc(x.t)}</div><div class="fila-s">${esc(x.s)}</div></div>${x.href ? `<a class="btn btn-linea btn-chico" href="${x.href}">${x.btn}</a>` : `<button type="button" class="btn btn-linea btn-chico" ${x.accion}>${x.btn}</button>`}</div>`).join('')}</div>` : `<div class="vacio">${ico('check')}No hay pendientes.</div>`}</section>
      <section class="tarjeta" aria-labelledby="t-cobros"><div class="tarjeta-cab"><div><h2 class="tarjeta-t" id="t-cobros">Cobros por proyecto</h2></div></div>
        <div class="dinero-filas">${S.proyectos.map(p => { const r = resumenCobros(p); return `<div class="dinero-fila"><div class="df-cab"><b>${esc(p.corto || p.nombre)}</b><span>${soles(r.pagado)} / ${soles(p.monto)}</span></div>${barraCobro(p)}</div>`; }).join('')}</div>${leyendaCobro()}</section>
    </div>
    <section class="tarjeta plana" style="margin-top:16px" aria-labelledby="t-proys"><div class="tarjeta-cab" style="padding:16px 18px 0"><div><h2 class="tarjeta-t" id="t-proys">Todas las obras</h2></div><a class="enlace" href="#nuevo">${ico('mas')}Nuevo desde plantilla</a></div>
      <div class="cartera-tabla" style="overflow-x:auto"><table class="cartera"><thead><tr><th scope="col">Proyecto</th><th scope="col">Etapa</th><th scope="col">Avance · desvío</th><th scope="col" class="num">Por cobrar</th><th scope="col" class="num">Detenido</th><th scope="col" class="num">Dossier</th><th scope="col">Pendientes</th></tr></thead><tbody>${filas.map(filaHTML).join('')}</tbody></table></div>
      <div class="tarjetas-proy" style="padding:0 14px 14px">${filas.map(tarjeta).join('')}</div>
    </section>
  </div>`;
}

/* ---------- proyecto (vista BTS) ---------- */
function tabsBts(p) {
  const pe = pendientesBts(p);
  if (p.estado === 'cerrado') return [['resumen', 'Resumen'], ['equipos', 'Equipos'], ['soporte', 'Soporte', pe.tickets, 'alerta'], ['dossier', 'Dossier de cierre'], ['pagos', 'Pagos'], ['accesos', 'Accesos']];
  return [['resumen', 'Resumen'], ['partes', 'Partes diarios', pe.partes, 'aviso'], ['observaciones', 'Observaciones', pe.porResolver, 'alerta'], ['documentos', 'Documentos'], ['dossier', 'Dossier de cierre', dossierPct(p).faltan && resumenCobros(p).detenido ? '!' : 0, 'aviso'], ['pagos', 'Pagos'], ['accesos', 'Accesos']];
}
function vBtsProyecto(r) {
  const p = proy(r.proy);
  if (!p) return vCartera();
  const tabs = tabsBts(p);
  const tab = tabs.some(t => t[0] === r.tab) ? r.tab : 'resumen';
  const ctx = `<div class="contexto"><div class="contexto-fila">
      <div class="contexto-t"><nav class="migas" aria-label="Ruta"><a href="#bts">Cartera</a>${ico('chev-d')}<span>${esc(p.codigo)}</span></nav><h1>${esc(p.nombre)}</h1></div>
      <div class="contexto-acciones"><a class="btn btn-linea btn-chico" href="#cliente/${p.id}">${ico('ojo')}Ver como cliente</a>${p.estado === 'cerrado' ? '' : `<a class="btn btn-linea btn-chico" href="#informe/${p.id}">${ico('correo')}Informe semanal</a>`}</div>
    </div></div>
    <div class="pestanas-barra"><nav class="pestanas" aria-label="Secciones del proyecto">${tabs.map(([k, n, c, cls]) => `<a href="#bts/${p.id}/${k}"${k === tab ? ' aria-current="page"' : ''}>${n}${c ? `<span class="n ${cls}"><span class="sr">(</span>${c === '!' ? '!' : c}<span class="sr"> ${c === '!' ? 'con dinero detenido' : 'pendientes'})</span></span>` : ''}</a>`).join('')}</nav></div>`;
  const vistas = p.estado === 'cerrado'
    ? { resumen: btsPostventa, equipos: btsEquipos, soporte: btsSoporte, dossier: btsDossier, pagos: btsPagos, accesos: btsAccesos }
    : { resumen: btsResumen, partes: btsPartes, observaciones: btsObservaciones, documentos: btsDocumentos, dossier: btsDossier, pagos: btsPagos, accesos: btsAccesos };
  return ctx + `<div class="pagina">${vistas[tab](p)}</div>`;
}

function btsResumen(p) {
  const pe = pendientesBts(p), r = resumenCobros(p), d = dossierPct(p);
  const pendientes = partesDe(p.id).filter(x => x.estado === 'pendiente').sort((a, b) => b.f - a.f);
  const consultas = consultasDe(p.id).sort((a, b) => (!!a.resp) - (!!b.resp) || b.ts - a.ts).slice(0, 3);
  const auto = ultimoInforme(p);
  const correos = S.correos.filter(m => m.proy === p.id).concat(auto ? [{ id: 'auto', proy: p.id, ts: auto.ts, para: `${p.cliente} (${plural(usuariosCliente(p).length, 'persona', 'personas')})`, asunto: `Informe semanal n.º ${auto.n} · ${p.nombre}` }] : []).sort((a, b) => b.ts - a.ts).slice(0, 4);
  return `<div class="pila">
    ${rotuloHTML(p)}
    ${pendientes.length ? `<div class="franja">${ico('casco')}<span class="crece"><b>${plural(pendientes.length, 'parte diario espera', 'partes diarios esperan')} su aprobación.</b> Recién al ${pendientes.length === 1 ? 'aprobarlo' : 'aprobarlos'}, el avance y las fotos llegan al portal del cliente.</span><a class="btn btn-tinta btn-chico" href="#bts/${p.id}/partes">Revisar ahora</a></div>` : ''}
    <section class="tarjeta" aria-labelledby="t-et"><div class="tarjeta-cab"><div><h2 class="tarjeta-t" id="t-et">${porIniciar(p) ? 'Por iniciar: arranca el ' + fLarga(p.inicio) : 'Etapa actual: ' + ETAPA[etapaPrincipal(p)].n}</h2></div><button type="button" class="btn btn-linea btn-chico" data-a="editar-etapas" data-p="${p.id}">${ico('editar')}Actualizar etapas</button></div>${etapasHTML(p)}</section>
    <div class="rejilla g-principal">
      <div class="pila">
        <section class="tarjeta" aria-labelledby="t-cs"><div class="tarjeta-cab"><div><h2 class="tarjeta-t" id="t-cs">Curva S: programado contra real</h2></div></div>${curvaHTML(p)}</section>
        <section class="tarjeta" aria-labelledby="t-ss"><div class="tarjeta-cab"><div><h2 class="tarjeta-t" id="t-ss">Avance por sistema</h2></div><button type="button" class="btn btn-linea btn-chico" data-a="editar-avance" data-p="${p.id}">${ico('editar')}Actualizar avance</button></div>${sistemasHTML(p)}</section>
        <section class="tarjeta" aria-labelledby="t-act"><div class="tarjeta-cab"><div><h2 class="tarjeta-t" id="t-act">Lo último en la obra</h2></div></div>${actividadDe(p.id, { lim: 7 })}</section>
      </div>
      <div class="pila">
        <section class="tarjeta" aria-labelledby="t-din"><div class="tarjeta-cab"><div><h2 class="tarjeta-t" id="t-din">${soles(r.pagado)} cobrados de ${soles(p.monto)}</h2></div></div>${barraCobro(p)}
          <ul class="lista" style="margin-top:8px">
            ${r.aprobado ? `<li class="fila"><div class="fila-cuerpo"><div class="fila-s texto-ok">Listo para facturar</div></div><b class="mono texto-ok">${soles(r.aprobado)}</b></li>` : ''}
            ${r.revision ? `<li class="fila"><div class="fila-cuerpo"><div class="fila-s">En revisión del cliente</div></div><b class="mono">${soles(r.revision)}</b></li>` : ''}
            ${r.detenido ? `<li class="fila"><div class="fila-cuerpo"><div class="fila-s texto-aviso">Detenido por documentos</div></div><b class="mono texto-aviso">${soles(r.detenido)}</b></li>` : ''}
            ${r.sinCobrar >= 1000 ? `<li class="fila"><div class="fila-cuerpo"><div class="fila-s">Trabajo hecho que aún no llega a un hito</div></div><b class="mono">${soles(r.sinCobrar)}</b></li>` : ''}
            ${!r.aprobado && !r.revision && !r.detenido && r.sinCobrar < 1000 ? `<li class="fila"><div class="fila-cuerpo"><div class="fila-s">${r.pagado ? 'Nada pendiente de cobro por ahora.' : 'El primer cobro es el adelanto a la firma del contrato.'}</div></div></li>` : ''}
          </ul><div class="tarjeta-pie"><a class="enlace" href="#bts/${p.id}/pagos">Ver los hitos de pago${ico('flecha-d')}</a></div></section>
        <section class="tarjeta" aria-labelledby="t-dos"><div class="tarjeta-cab"><div><h2 class="tarjeta-t" id="t-dos">Dossier de cierre: ${d.listos} de ${d.total} listos</h2></div></div>
          <div style="display:flex;gap:14px;align-items:center">${anillo(d.pct, `Dossier al ${Math.round(d.pct)} %`)}<p class="texto-gris" style="font-size:13.5px">Se arma solo con cada protocolo, ficha y acta aprobada. Faltan ${d.faltan}.</p></div>
          <div class="tarjeta-pie"><a class="enlace" href="#bts/${p.id}/dossier">Abrir el dossier${ico('flecha-d')}</a></div></section>
        <section class="tarjeta" aria-labelledby="t-con"><div class="tarjeta-cab"><div><h2 class="tarjeta-t" id="t-con">Consultas del cliente${pe.consultas ? ` <span class="texto-aviso" style="font-weight:500">(${pe.consultas} sin responder)</span>` : ''}</h2></div></div>
          ${consultas.length ? `<ul class="lista">${consultas.map(c => `<li class="fila"><span class="fila-ico ${c.resp ? 'ok' : 'aviso'}" aria-hidden="true">${ico(c.resp ? 'check' : 'mensaje')}</span><div class="fila-cuerpo"><div class="fila-t" style="font-weight:500">${esc(c.texto)}</div><div class="fila-s">${esc(persona(c.de).n)} · ${hace(c.ts)}</div>${c.resp ? `<div class="obs-nota" style="margin-top:6px"><b>${esc(persona(c.resp.de).n)}:</b> ${esc(conFechas(c.resp.texto, c.resp.ts))}</div>` : `<button type="button" class="btn btn-tinta btn-chico" style="margin-top:8px" data-a="responder" data-id="${c.id}">${ico('enviar')}Responder</button>`}</div></li>`).join('')}</ul>` : '<p class="texto-gris">Las consultas del cliente llegan aquí, con aviso por correo al residente.</p>'}</section>
        <section class="tarjeta" aria-labelledby="t-hit"><div class="tarjeta-cab"><div><h2 class="tarjeta-t" id="t-hit">Próximos hitos</h2></div></div>${hitosHTML(p, 4)}</section>
        <section class="tarjeta" aria-labelledby="t-cor"><div class="tarjeta-cab"><div><h2 class="tarjeta-t" id="t-cor">Correos que recibió el cliente</h2><p class="tarjeta-sub">Avisos automáticos del portal</p></div></div>
          ${correos.length ? `<ul class="lista">${correos.map(m => `<li class="fila"><span class="fila-ico info" aria-hidden="true">${ico('correo')}</span><div class="fila-cuerpo"><div class="fila-t" style="font-weight:600">${esc(m.asunto)}</div><div class="fila-s">${esc(m.para)} · ${hace(m.ts)}</div></div></li>`).join('')}</ul>` : '<p class="texto-gris">Aún no se envió ningún aviso.</p>'}
          <div class="tarjeta-pie"><a class="enlace" href="#informe/${p.id}">Ver el informe de este viernes${ico('flecha-d')}</a></div></section>
      </div>
    </div>
  </div>`;
}

/* ---------- partes diarios ---------- */
/* «96 de 1,240 puntos · tendido de cable»: de dónde sale el avance del parte */
function cantidadParte(x) {
  if (!x.cant) return '';
  const unidad = String(x.cant).replace(/^[\d.,\s]+/, '');
  const txt = x.n && x.total ? `${num(x.n)} de ${num(x.total)} ${unidad}` : x.cant;
  return `<span>Cantidad: <b>${esc(txt)}</b>${x.actN ? ` · ${esc(x.actN.charAt(0).toLowerCase() + x.actN.slice(1))}` : ''}</span>`;
}
function parteHTML(x, rol = 'bts') {
  const p = proy(x.proy), s = p.sistemas.find(z => z.k === x.sis);
  const est = x.estado === 'pendiente' ? insignia('aviso', 'Por aprobar', 'reloj') : x.estado === 'observado' ? insignia('alerta', 'Observado', 'alerta') : insignia('ok', 'Aprobado', 'check');
  const fotos = x.fotos.length ? `<div class="parte-fotos">${x.fotos.map((f, i) => `<button type="button" data-a="ver-foto" data-ref="${esc(f)}" data-titulo="${esc(x.t)}" aria-label="Ver foto ${i + 1} del parte ${x.id}">${imgFoto(f, 'm')}</button>`).join('')}</div>` : '';
  let pie = '';
  if (x.estado === 'pendiente' && rol === 'bts') {
    const desde = s ? s.real : 0, hasta = clamp(desde + x.inc, 0, 100);
    pie = `<div class="efecto">${ico('info')}<span>Al aprobarlo: <b>${esc(SIS[x.sis].c)}</b> pasa de ${pct(desde)} a ${pct(hasta)}${x.fotos.length ? `, ${plural(x.fotos.length, 'foto se publica', 'fotos se publican')} en el portal del cliente` : ''} y entra al informe del viernes.</span></div>
      <div class="parte-acc"><button type="button" class="btn btn-ok" data-a="aprobar-parte" data-id="${x.id}">${ico('check')}Aprobar parte</button><button type="button" class="btn btn-linea" data-a="observar-parte" data-id="${x.id}">Observar</button></div>`;
  } else if (x.estado === 'aprobado' && x.aprobado && Date.now() - x.aprobado < 10 * 60e3 && rol === 'bts') {
    pie = `<div class="efecto" style="background:var(--ok-suave);color:var(--ok)">${ico('check')}<span>Aprobado ${hace(x.aprobado)}. El cliente ya ve este avance${x.fotos.length ? ' y sus fotos' : ''}. <a href="#cliente/${p.id}" style="color:inherit;font-weight:700">Verlo como cliente</a></span></div>`;
  } else if (x.estado === 'observado') {
    pie = `<div class="obs-nota" style="margin-top:10px"><b>Observado:</b> ${esc(x.motivo || '')}</div>`;
  }
  return `<article class="parte ${x.estado === 'pendiente' ? 'pendiente' : ''}" id="parte-${x.id}">
    <div class="parte-cab"><div class="parte-quien">${avatar(x.tec)}<div><b style="display:block;font-size:14px">${esc(persona(x.tec).n)}</b><span class="texto-gris" style="font-size:12.5px">${esc(persona(x.tec).rol)} · ${fHora(x.f)}</span></div></div><div style="display:flex;gap:8px;align-items:center"><span class="mono texto-gris" style="font-size:12px">${x.id}</span>${est}</div></div>
    <h3 class="parte-t">${esc(x.t)}</h3>
    <div class="parte-datos"><span>Sistema: <b>${esc(SIS[x.sis].c)}</b></span><span>Zona: <b>${esc(x.zona)}</b></span>${cantidadParte(x)}<span>Avance: <b class="mono">+${x.inc.toFixed(1)} pts</b></span><span>Personal: <b>${x.personal}</b></span>${x.aprobado && x.estado === 'aprobado' ? `<span>Aprobó: <b>${esc(persona(x.aprobo).n)}</b></span>` : ''}</div>
    ${x.nota ? `<p class="obs-nota" style="margin-top:10px"><b>Nota del técnico:</b> ${esc(x.nota)}</p>` : ''}
    ${fotos}${pie}
  </article>`;
}
function btsPartes(p) {
  const todos = partesDe(p.id).sort((a, b) => (a.estado === 'pendiente' ? 0 : 1) - (b.estado === 'pendiente' ? 0 : 1) || b.f - a.f);
  const f = (ui.filtroPartes && ui.filtroPartes.p === p.id) ? ui.filtroPartes.f : 'pendiente';
  const lista = f === 'todos' ? todos : todos.filter(x => x.estado === f);
  const n = k => todos.filter(x => x.estado === k).length;
  return `<div class="rejilla g-principal"><div class="pila">
    <div class="filtros" role="group" aria-label="Filtrar partes">${[['pendiente', 'Por aprobar', n('pendiente')], ['aprobado', 'Aprobados', n('aprobado')], ['observado', 'Observados', n('observado')], ['todos', 'Todos', todos.length]].map(([k, t, c]) => `<button type="button" class="chip" data-a="filtro-partes" data-p="${p.id}" data-f="${k}" aria-pressed="${f === k}">${t} <span class="n">${c}</span></button>`).join('')}</div>
    ${lista.length ? lista.map(x => parteHTML(x)).join('') : `<div class="vacio">${ico('check')}${f === 'pendiente' ? 'No hay partes por aprobar. Registre uno desde la vista del técnico para probar el flujo.' : 'No hay partes en esta lista.'}${f === 'pendiente' ? `<div style="margin-top:12px"><a class="btn btn-linea btn-chico" href="#tecnico/parte">Registrar un parte como técnico</a></div>` : ''}</div>`}
  </div>
  <aside class="pila"><section class="tarjeta"><h2 class="tarjeta-t" style="margin:0 0 10px">Del celular del técnico al portal del cliente</h2>
    <ol class="escena-pasos" style="margin-top:0">
      <li><span class="mono">01</span><span><b>El técnico registra el parte</b> en obra desde su celular: actividad, cantidad ejecutada, fotos y notas. El avance se calcula con el metrado del frente.</span></li>
      <li><span class="mono">02</span><span><b>Usted lo revisa y lo aprueba</b> (o lo observa). Nada sale sin su visto bueno.</span></li>
      <li><span class="mono">03</span><span><b>El cliente lo ve al instante:</b> sube la curva S, aparecen las fotos y entra al informe del viernes.</span></li>
    </ol><div class="tarjeta-pie"><a class="btn btn-linea btn-chico" href="#tecnico">${ico('casco')}Abrir la vista del técnico</a></div></section></aside></div>`;
}

/* ---------- observaciones, documentos, dossier, pagos, accesos ---------- */
function btsObservaciones(p) {
  const os = obsDe(p.id);
  const f = (ui.filtroObsBts && ui.filtroObsBts.p === p.id) ? ui.filtroObsBts.f : 'resolver';
  const grupos = { resolver: os.filter(o => o.estado !== 'cerrada').sort((a, b) => ({ revision: 0, abierta: 1, levantada: 2 }[a.estado] - { revision: 0, abierta: 1, levantada: 2 }[b.estado]) || b.creada - a.creada), cerradas: os.filter(o => o.estado === 'cerrada'), todas: os };
  const lista = grupos[f] || grupos.resolver;
  return `<section class="tarjeta"><div class="tarjeta-cab"><div><h2 class="tarjeta-t">Observaciones (punch list)</h2><p class="tarjeta-sub">Las registra la supervisión o su equipo; el técnico las levanta con foto y usted aprueba el levantamiento antes de que lo vea el cliente.</p></div><button type="button" class="btn btn-marca btn-chico" data-a="nueva-obs" data-p="${p.id}" data-rol="bts">${ico('mas')}Registrar observación</button></div>
    <div class="filtros" role="group" aria-label="Filtrar">${[['resolver', 'Por resolver', grupos.resolver.length], ['cerradas', 'Cerradas', grupos.cerradas.length], ['todas', 'Todas', os.length]].map(([k, t, c]) => `<button type="button" class="chip" data-a="filtro-obs-bts" data-p="${p.id}" data-f="${k}" aria-pressed="${f === k}">${t} <span class="n">${c}</span></button>`).join('')}</div>
    <div class="obs-lista">${lista.length ? lista.map(o => obsHTML(o, 'bts')).join('') : `<div class="vacio">${ico('check')}Sin observaciones en esta lista.</div>`}</div></section>`;
}
function btsDocumentos(p) {
  return `<section class="tarjeta"><div class="tarjeta-cab"><div><h2 class="tarjeta-t">Planos, fichas, actas y protocolos</h2><p class="tarjeta-sub">Lo que sube aquí lo ve el cliente con su versión vigente; lo que pide conformidad le aparece como pendiente.</p></div><button type="button" class="btn btn-marca btn-chico" data-a="subir-doc" data-p="${p.id}">${ico('subir')}Subir documento</button></div>${docsPorTipoHTML(p.id, 'bts')}</section>`;
}
function btsDossier(p) { return dossierHTML(p, 'bts'); }
function btsPagos(p) {
  const aprob = (p.pagos || []).filter(g => g.estado === 'aprobado');
  return `<section class="tarjeta"><div class="tarjeta-cab"><div><h2 class="tarjeta-t">Hitos de pago</h2><p class="tarjeta-sub">El portal revisa los requisitos de cada hito: cuando se cumple el último, el hito queda listo para facturar y le avisa.</p></div></div>
    ${aprob.map(g => `<div class="franja ok" style="margin-bottom:12px">${ico('moneda')}<span class="crece"><b>Hito ${g.n} listo para facturar:</b> ${soles(montoPago(p, g))}.</span><button type="button" class="btn btn-ok btn-chico" data-a="pago-cobrado" data-p="${p.id}" data-n="${g.n}">Marcar como pagado</button></div>`).join('')}
    ${pagosHTML(p, 'bts')}</section>`;
}
function btsAccesos(p) {
  const us = p.usuarios || [];
  const fila = u => `<li class="fila">${u.id && PERSONAS[u.id] ? avatar(u.id) : `<span class="avatar ${ladoUsuario(u) === 'cliente' ? 'c' : ''}" aria-hidden="true">${esc(iniciales(nombreUsuario(u)))}</span>`}<div class="fila-cuerpo"><div class="fila-t">${esc(nombreUsuario(u))}${u.correo ? ` <span class="texto-gris" style="font-weight:400;font-size:13px">· ${esc(u.correo)}</span>` : ''}</div><div class="fila-s">${esc(rolUsuario(u))}${u.permiso ? ' · ' + esc(u.permiso) : ''}</div></div>${u.estado === 'invitado' ? insignia('aviso', 'Invitación enviada', 'correo') : insignia('ok', 'Activo')}</li>`;
  return `<div class="rejilla g-mitad">
    <section class="tarjeta"><div class="tarjeta-cab"><div><h2 class="tarjeta-t">Quién del cliente ve esta obra</h2><p class="tarjeta-sub">Cada persona entra con su correo y solo ve las obras de su empresa.</p></div><button type="button" class="btn btn-marca btn-chico" data-a="invitar" data-p="${p.id}">${ico('mas')}Invitar</button></div><ul class="lista">${us.filter(u => ladoUsuario(u) === 'cliente').map(fila).join('') || '<li class="texto-gris">Nadie todavía.</li>'}</ul></section>
    <section class="tarjeta"><div class="tarjeta-cab"><div><h2 class="tarjeta-t">Su equipo en esta obra</h2><p class="tarjeta-sub">Los técnicos solo registran partes y levantan observaciones de su frente.</p></div></div><ul class="lista">${us.filter(u => ladoUsuario(u) !== 'cliente').map(fila).join('')}</ul></section>
  </div>`;
}

/* ---------- postventa (vista BTS) ---------- */
function btsPostventa(p) {
  const g = p.garantia, c = g.contrato, dd = diasEntre(HOY, c.vence);
  const prox = g.visitas.find(v => v.estado !== 'hecha');
  const abiertos = S.tickets.filter(t => t.proy === p.id && t.estado !== 'cerrado');
  return `<div class="pila">${rotuloHTML(p)}
    <div class="kpis">
      <div class="kpi"><span class="etq">${ico('escudo')}Garantía</span><div class="kpi-v">${diasEntre(HOY, g.hasta)} días</div><div class="kpi-s">Hasta el ${fMedia(g.hasta)}</div></div>
      <div class="kpi"><span class="etq">${ico('ticket')}Fallas abiertas</span><div class="kpi-v">${abiertos.length}</div><div class="kpi-s">${abiertos.length ? 'Ver en Soporte' : 'Sin fallas abiertas'}</div></div>
      <div class="kpi"><span class="etq">${ico('calendario')}Próximo preventivo</span><div class="kpi-v">${prox ? fCorta(prox.f) : '—'}</div><div class="kpi-s">${prox ? enDias(prox.f) + (prox.estado === 'confirmada' ? ' · confirmado' : ' · por confirmar') : ''}</div></div>
      <div class="kpi dinero"><span class="etq">${ico('moneda')}Renovación del mantenimiento</span><div class="kpi-v">${soles(c.monto)}</div><div class="kpi-s">al año · vence en ${dd} días</div></div>
    </div>
    <div class="rejilla g-principal">
      <section class="tarjeta"><div class="tarjeta-cab"><div><h2 class="tarjeta-t">Renovación del contrato de mantenimiento</h2></div></div>
        <p style="color:var(--texto-2);font-size:14.5px">El cliente ve en su portal cuándo vence su garantía, su soporte de software y su contrato de mantenimiento. Desde ahí pide la propuesta de renovación con un clic.</p>
        ${c.pedido ? `<div class="franja ok" style="margin-top:12px">${ico('check')}<span class="crece">El cliente pidió la propuesta ${hace(c.pedido)}.</span>${c.propuesta ? insignia('ok', 'Propuesta enviada') : `<button type="button" class="btn btn-ok btn-chico" data-a="enviar-propuesta" data-p="${p.id}">${ico('enviar')}Enviar propuesta</button>`}</div>` : `<div class="tarjeta-pie"><span class="texto-gris" style="font-size:13px">Vence el ${fMedia(c.vence)}</span><button type="button" class="btn btn-linea btn-chico" data-a="enviar-propuesta" data-p="${p.id}">${ico('enviar')}Enviar propuesta de renovación</button></div>`}</section>
      <section class="tarjeta"><div class="tarjeta-cab"><div><h2 class="tarjeta-t">Visitas preventivas</h2></div></div>
        <ul class="lista">${g.visitas.map(v => `<li class="fila"><div class="fecha-caja"><b>${new Date(v.f).getDate()}</b><span>${MESES[new Date(v.f).getMonth()]}</span></div><div class="fila-cuerpo"><div class="fila-t">${esc(v.id)} · ${v.estado === 'hecha' ? 'Realizado' : v.estado === 'confirmada' ? 'Confirmado por el cliente' : 'Programado'}</div><div class="fila-s">${esc(v.alcance)}</div></div></li>`).join('')}</ul></section>
    </div>
    <section class="tarjeta"><div class="tarjeta-cab"><div><h2 class="tarjeta-t">Fallas reportadas por el cliente</h2></div><a class="enlace" href="#bts/${p.id}/soporte">Ver todas${ico('flecha-d')}</a></div>${ticketsHTML(p, 'bts', 3)}</section>
  </div>`;
}
function btsEquipos(p) { return `<section class="tarjeta"><div class="tarjeta-cab"><div><h2 class="tarjeta-t">Equipos entregados, series y garantías</h2><p class="tarjeta-sub">El mismo listado que ve el cliente. Los vencimientos cercanos aparecen en la cartera.</p></div></div>${equiposHTML(p)}</section>`; }
function btsSoporte(p) { return `<section class="tarjeta"><div class="tarjeta-cab"><div><h2 class="tarjeta-t">Fallas reportadas</h2><p class="tarjeta-sub">Cada falla con su responsable y su solución; el cliente ve el avance en su portal.</p></div></div>${ticketsHTML(p, 'bts')}</section>`; }
