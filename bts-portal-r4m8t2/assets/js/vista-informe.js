/* =====================================================================
   Informe semanal automático: lo que recibe el cliente cada viernes
   ===================================================================== */
'use strict';

/* último informe automático ya enviado (viernes 6:00 p. m.) */
function ultimoInforme(p) {
  if (!p || p.estado === 'cerrado' || !p.avisos) return null;
  const dsv = (new Date(HOY).getDay() - 5 + 7) % 7;
  let ts = dia(-dsv, 18, 0); if (ts > Date.now()) ts = dia(-dsv - 7, 18, 0);
  if (ts < p.inicio + 4 * DIA) return null;
  return { ts, n: Math.floor((ts - p.inicio) / SEMANA) + 1 };
}
function proximoViernes() { const d = new Date(HOY); const dw = d.getDay(); d.setDate(d.getDate() + ((5 - dw + 7) % 7)); d.setHours(18, 0, 0, 0); return d.getTime(); }

function vInforme(r) {
  const p = proy(r.proy) || proy('altiplano');
  if (p.estado === 'cerrado') {
    return `<div class="pagina"><div class="vacio" style="max-width:640px;margin:20px auto">${ico('escudo')}<b>${esc(p.nombre)}</b> ya fue entregada: en lugar del informe semanal, su cliente recibe los avisos de garantía, mantenimiento y soporte.<div class="btns" style="justify-content:center;margin-top:14px"><a class="btn btn-linea btn-chico" href="#cliente/${p.id}">Ver su portal de postventa</a><a class="btn btn-linea btn-chico" href="#informe/altiplano">Ver un informe de obra en ejecución</a></div></div></div>`;
  }
  const ini = HOY - 6 * DIA;
  const envio = proximoViernes();
  const yaSalio = envio <= Date.now();
  const a = avanceHoy(p), tot = pesoTotal(p);
  const partes = partesDe(p.id).filter(x => x.estado === 'aprobado' && x.f >= ini).sort((x, y) => x.f - y.f);
  const deltaSemana = sum(partes, x => { const s = p.sistemas.find(z => z.k === x.sis); return s ? x.inc * s.peso / tot : 0; });
  let fotos = fotosDe(p.id).filter(f => f.f >= ini).sort((x, y) => y.f - x.f);
  if (fotos.length < 3) fotos = fotosDe(p.id).sort((x, y) => y.f - x.f).slice(0, 3);
  fotos = fotos.slice(0, 6);
  const os = obsDe(p.id);
  const nuevas = os.filter(o => o.creada >= ini).length;
  const levantadas = os.filter(o => (o.levantada && o.levantada >= ini && o.estado !== 'revision') || (o.cerrada && o.cerrada >= ini)).length;
  const abiertas = os.filter(o => o.estado === 'abierta' || o.estado === 'revision');
  const prox = (p.hitos || []).filter(h => h.f >= HOY && h.f <= HOY + 16 * DIA).sort((x, y) => x.f - y.f);
  const notas = p.sistemas.filter(s => s.nota && s.real < 100);
  const pago = (p.pagos || []).find(g => g.estado === 'revision' || g.estado === 'aprobado') || (p.pagos || []).find(g => g.estado === 'pendiente');
  const n = Math.max(1, semanaN(p));
  const destinatarios = usuariosCliente(p).length;
  const porSistema = {};
  partes.forEach(x => { (porSistema[x.sis] = porSistema[x.sis] || []).push(x); });
  return `<div class="pagina">
    <div class="barra-informe no-imprimir"><div><span class="etq cian">Informe semanal automático</span><p style="margin-top:4px;color:var(--texto-2);font-size:14px">${yaSalio ? 'Se envió' : 'Se envía'} el ${fLarga(envio)} a las 6:00 p. m. a ${plural(destinatarios, 'persona', 'personas')} ${esc(deCliente(p))}. Se arma solo con los partes aprobados de los últimos 7 días.</p></div>
      <div class="btns"><button type="button" class="btn btn-linea btn-chico" data-a="imprimir">${ico('descarga')}Descargar PDF</button><button type="button" class="btn btn-tinta btn-chico" data-a="enviar-informe" data-p="${p.id}">${ico('enviar')}Enviar ahora</button></div></div>
    <article class="correo" aria-label="Vista previa del correo">
      <div class="correo-cab"><div><span>De</span><b>BTS · Portal de proyectos</b></div><div><span>Para</span><span style="color:var(--tinta)">${esc(p.cliente)} (${plural(destinatarios, 'persona', 'personas')})</span></div><div><span>Fecha</span><span style="color:var(--tinta)">${fLarga(envio).replace(/^./, c => c.toUpperCase())}, 6:00 p. m.</span></div>
        <div class="asunto">Informe semanal n.º ${n} · ${esc(p.nombre)} · avance ${pct(a.real)}</div></div>
      <div class="informe">
        <div class="informe-cab"><img src="assets/img/logo-480.webp" width="480" height="178" alt="BTS Perú"><div style="text-align:right"><div class="etq">Informe semanal n.º ${n}</div><div class="mono" style="font-size:12.5px;margin-top:4px">${fCorta(ini)} – ${fCorta(HOY)} ${new Date(HOY).getFullYear()}</div></div></div>
        <h2>${esc(p.nombre)}</h2><p style="margin-top:4px">${esc(p.alcance)} · ${esc(p.cliente)} · <span class="mono" style="font-size:13px">${esc(p.codigo)}</span></p>
        <div class="informe-kpis"><div><span class="etq">Avance real</span><b>${pct(a.real)}</b></div><div><span class="etq">Programado</span><b>${pct(a.prog)}</b></div><div><span class="etq">Desvío</span><b class="${a.desvio <= -1 ? 'texto-aviso' : ''}">${signo(a.desvio)} pts</b></div><div><span class="etq">Esta semana</span><b>+${deltaSemana.toFixed(1)} pts</b></div></div>
        <div style="margin-top:16px">${curvaHTML(p, { alto: 200, mini: true, tabla: false })}</div>
        <h3>${ico('check')}Lo que se hizo esta semana</h3>
        ${partes.length ? `<ul class="bullets">${Object.keys(porSistema).map(k => porSistema[k].map(x => `<li><b>${esc(SIS[k].c)}</b> · ${esc(x.zona)}: ${esc(x.t.charAt(0).toLowerCase() + x.t.slice(1))}${x.cant && !x.t.includes(x.cant) && !(x.n && (x.t.includes(String(x.n)) || x.t.includes(num(x.n)))) ? ` (${esc(x.cant)})` : ''}.</li>`).join('')).join('')}</ul>` : '<p>Esta semana no hubo partes aprobados.</p>'}
        ${fotos.length ? `<h3>${ico('camara')}Fotos de la semana</h3><div class="informe-fotos">${fotos.map(f => `<figure>${imgFoto(f.src, 'm', f.t)}<figcaption>${esc(f.t)} · ${fCorta(f.f)}</figcaption></figure>`).join('')}</div>` : ''}
        ${notas.length ? `<h3>${ico('alerta')}Para tener en cuenta</h3><ul class="bullets">${notas.map(s => `<li><b>${esc(SIS[s.k].c)}</b>: ${esc(conFechas(s.nota.x))}</li>`).join('')}</ul>` : ''}
        <h3>${ico('lista')}Observaciones</h3>
        <p>${plural(nuevas, 'nueva', 'nuevas')} esta semana · ${plural(levantadas, 'levantada o cerrada', 'levantadas o cerradas')} · ${plural(abiertas.length, 'abierta', 'abiertas')} a la fecha.</p>
        ${abiertas.length ? `<ul class="bullets">${abiertas.slice(0, 5).map(o => `<li><span class="mono" style="font-size:12.5px">${o.id}</span> ${esc(o.t)} · ${esc(o.zona)} · ${plural(diasEntre(o.creada, Date.now()), "día", "días")}</li>`).join('')}</ul>` : ''}
        <h3>${ico('calendario')}Próximas dos semanas</h3>
        ${prox.length ? `<ul class="bullets">${prox.map(h => `<li><b>${fLarga(h.f).replace(/^./, c => c.toUpperCase())}</b>: ${esc(h.t)}</li>`).join('')}</ul>` : '<p>Sin hitos en las próximas dos semanas.</p>'}
        ${pago ? `<h3>${ico('moneda')}Pagos</h3><p>Hito ${pago.n}, ${esc(pago.t.charAt(0).toLowerCase() + pago.t.slice(1))} (${soles(montoPago(p, pago))}): ${pagoTxt(pago.estado, 'cliente').toLowerCase().replace(' · ', ', ')}.${(pago.req || []).filter(rq => !evalReq(p, rq).ok).length ? ' Falta: ' + esc((pago.req || []).filter(rq => !evalReq(p, rq).ok).map(rq => reqCliente(p, rq)).join('; ')) + '.' : ''}</p>` : ''}
        <p style="margin-top:22px"><a class="btn btn-marca no-imprimir" href="#cliente/${p.id}">${ico('ojo')}Ver el detalle en el portal</a></p>
        <div class="informe-pie">Este informe se armó solo con los partes diarios que BTS aprobó entre el ${fCorta(ini)} y el ${fCorta(HOY)}. Para cualquier consulta, escríbanos desde el portal.<br>BTS · Business Technologies &amp; Security S.A.C.<span class="solo-impresion">Muestra con datos de ejemplo, preparada por Kallari para BTS Perú.</span></div>
      </div>
    </article>
  </div>`;
}
