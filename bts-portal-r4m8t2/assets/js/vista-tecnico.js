/* =====================================================================
   Cara 3 · Técnico en obra (pensada para el celular)
   ===================================================================== */
'use strict';

const ZONAS = {
  altiplano: ['Bloque A · piso 1', 'Bloque A · piso 2', 'Bloque A · piso 3', 'Bloque B · piso 1', 'Bloque B · piso 2', 'Bloque B · piso 3', 'Hospitalización · piso 2', 'Cuarto de datos 1', 'Cuarto de datos 2', 'Sótano · casa de fuerza', 'Exteriores'],
};
const zonasDe = pid => ZONAS[pid] || ['Bloque A', 'Bloque B', 'Cuarto de datos', 'Exteriores', 'General'];
const FOTOS_EJEMPLO = ['cab-tendido', 'cab-varillas'];

function tecInicial() {
  const p = proy('altiplano') || activos()[0];
  return { proy: p.id, sis: 'cab', act: 'tendido', n: '', zona: 'Bloque B · piso 2', t: '', personal: 5, fotos: [], nota: '', errores: {} };
}
function saludo() { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; }

function vTecnico(r) {
  if (!ui.tec) ui.tec = tecInicial();
  const yo = persona(TECNICO_DEMO);
  const sub = r.sub || 'inicio';
  const misObs = S.obs.filter(o => o.asignado === TECNICO_DEMO && (o.estado === 'abierta' || o.estado === 'revision'));
  const nObs = misObs.filter(o => o.estado === 'abierta').length;
  let cuerpo = '', titulo = '', volver = '';
  if (sub === 'parte') { cuerpo = tecParte(); titulo = 'Parte diario'; volver = '#tecnico'; }
  else if (sub === 'obs' && r.id) { cuerpo = tecLevantar(r.id); titulo = 'Levantar observación'; volver = '#tecnico/obs'; }
  else if (sub === 'obs') { cuerpo = tecObsLista(misObs); titulo = 'Mis observaciones'; volver = '#tecnico'; }
  else if (sub === 'enviado') { cuerpo = tecEnviado(r.id); titulo = 'Enviado'; volver = '#tecnico'; }
  else cuerpo = tecInicio(misObs);
  const p = proy(ui.tec.proy) || proy('altiplano');
  const nav = [['#tecnico', 'inicio', 'Inicio', 'inicio'], ['#tecnico/parte', 'parte', 'Nuevo parte', 'mas'], ['#tecnico/obs', 'obs', 'Observaciones', 'alerta']];
  const navAct = sub === 'enviado' ? 'inicio' : sub;
  return `<div class="escena-tel">
    <div class="escena-nota"><span class="etq cian">Técnico en obra</span><h1>Así registra el avance desde su celular</h1>
      <p>Pruebe el recorrido completo:</p>
      <ol class="escena-pasos"><li><span class="mono">01</span><span><b>Registre un parte</b> aquí, con una foto de su celular o una de ejemplo.</span></li><li><span class="mono">02</span><span><b>Apruébelo como BTS</b> en <a href="#bts/altiplano/partes">partes por aprobar</a>.</span></li><li><span class="mono">03</span><span><b>Véalo como cliente</b>: sube la curva S y aparecen las fotos en el <a href="#cliente/altiplano">portal del Consorcio</a>.</span></li></ol></div>
    <div class="telefono" role="region" aria-label="Pantalla del celular del técnico">
      <div class="tel-estado" aria-hidden="true"><span>${hora(Date.now())}</span><span>${ico('senal')}${ico('bateria')}</span></div>
      <div class="tel-cab">${titulo ? `<a class="tel-volver" href="${volver}" aria-label="Volver">${ico('flecha-i')}</a>` : `<img src="assets/img/logo-480.webp" width="480" height="178" alt="BTS">`}<div class="crece"><b>${titulo || esc(yo.n)}</b><small>${esc(p.nombre)} · ${esc(yo.rol.replace('Técnico de ', ''))}</small></div>${avatar(TECNICO_DEMO)}</div>
      <div class="tel-cuerpo" id="tel-cuerpo">${cuerpo}</div>
      <nav class="tel-nav" aria-label="Menú del técnico">${nav.map(([h, k, t, i]) => `<a href="${h}"${navAct === k ? ' aria-current="page"' : ''}>${ico(i)}<span>${t}</span>${k === 'obs' && nObs ? `<span class="bolita">${nObs}</span>` : ''}</a>`).join('')}</nav>
    </div>
    <div class="escena-lado"><section class="tarjeta"><h2 class="tarjeta-t" style="margin:0 0 8px">Nada llega al cliente sin aprobación</h2>
      <p class="texto-gris" style="font-size:14px">El parte queda <b>por aprobar</b> en la vista de BTS. Al aprobarlo, el avance del sistema sube, las fotos se publican y todo entra solo al informe del viernes.</p>
      <div class="btns" style="margin-top:12px"><a class="btn btn-linea btn-chico" href="#bts/altiplano/partes">${ico('check')}Partes por aprobar</a><a class="btn btn-linea btn-chico" href="#cliente/altiplano">${ico('ojo')}Portal del cliente</a></div></section></div>
  </div>`;
}

function tecInicio(misObs) {
  const yo = persona(TECNICO_DEMO);
  const mios = S.partes.filter(x => x.tec === TECNICO_DEMO).sort((a, b) => b.f - a.f).slice(0, 4);
  const hoyMio = mios.find(x => inicioDia(x.f) === HOY);
  const p = proy('altiplano');
  const s = p.sistemas.find(z => z.k === 'cab');
  const prog = planSistema(s, semanaHoy(p));
  const ESTADO = { pendiente: ['aviso', 'Por aprobar'], aprobado: ['ok', 'Aprobado'], observado: ['alerta', 'Observado'] };
  return `<p class="tel-saludo">${saludo()}, ${esc(yo.corto)}</p><p class="texto-gris" style="font-size:13.5px;margin-top:2px">${fLarga(Date.now()).replace(/^./, c => c.toUpperCase())}</p>
    ${hoyMio ? `<div class="tel-tarjeta" style="border-color:var(--cian-borde)"><span class="etq">Parte de hoy</span><div style="display:flex;gap:10px;align-items:center"><div class="crece" style="flex:1;min-width:0"><b style="display:block;font-size:14px">${esc(hoyMio.t)}</b><small class="texto-gris">${hoyMio.id} · ${hora(hoyMio.f)}</small></div>${insignia(...ESTADO[hoyMio.estado])}</div><a class="btn btn-linea btn-bloque" style="margin-top:12px" href="#tecnico/parte">${ico('mas')}Registrar otro parte</a></div>`
      : `<a class="btn btn-marca btn-grande btn-bloque" style="margin-top:16px" href="#tecnico/parte">${ico('mas')}Registrar el parte de hoy</a>`}
    <div class="tel-tarjeta"><span class="etq">Mi frente · ${esc(SIS.cab.c)}</span><div style="display:flex;justify-content:space-between;align-items:baseline"><b class="mono" style="font-size:22px">${Math.round(s.real)}<small style="font-size:14px">%</small></b><span class="texto-gris" style="font-size:12.5px">programado ${pctE(prog)}</span></div><div class="sis-pista" style="margin-top:8px" aria-hidden="true"><i class="sis-real" style="width:${s.real}%"></i><i class="sis-prog" style="left:${prog}%"></i></div></div>
    <div class="tel-tarjeta"><span class="etq">Observaciones para levantar</span>${misObs.length ? `<ul class="tel-lista">${misObs.map(o => `<li><a class="tel-item" href="#tecnico/obs/${o.id}"><span class="tel-mini">${o.antes ? imgFoto(o.antes, 'm') : ''}</span><span class="crece"><b>${esc(o.t)}</b><small>${o.id} · ${esc(o.zona)}${o.estado === 'revision' ? ' · enviada, por aprobar' : ''}</small></span>${ico('chev-d', 'flecha')}</a></li>`).join('')}</ul>` : '<p class="texto-gris" style="font-size:13.5px">No tiene observaciones pendientes.</p>'}</div>
    <div class="tel-tarjeta"><span class="etq">Mis últimos partes</span><ul class="tel-lista">${mios.map(x => `<li><div class="tel-item"><span class="crece"><b>${esc(x.t)}</b><small>${x.id} · ${fHora(x.f)} · +${x.inc.toFixed(1)} pts</small>${x.estado === 'observado' && x.motivo ? `<small class="texto-alerta">${esc(x.motivo)}</small>` : ''}</span>${insignia(...ESTADO[x.estado])}</div></li>`).join('')}</ul></div>`;
}

/* texto del avance calculado (se actualiza mientras el técnico escribe la cantidad) */
function textoCalculo(p, a) {
  const s = (p.sistemas || []).find(z => z.k === ui.tec.sis);
  if (!(a.n > 0)) return `El avance se calcula con el metrado del frente: ${num(a.total)} ${esc(a.unidad)} en total.`;
  return `Equivale a <b>+${a.inc.toFixed(1)} puntos</b> de avance en ${esc(SIS[ui.tec.sis].c)}: ${num(a.n)} de ${num(a.total)} ${esc(a.unidad)}, y esta actividad pesa ${a.peso} % del frente.${s ? ` Pasaría de ${pct(s.real)} a ${pct(clamp(s.real + a.inc, 0, 100))} si lo aprueban.` : ''}`;
}
function tecParte() {
  const t = ui.tec, p = proy(t.proy) || proy('altiplano');
  const s = p.sistemas.find(z => z.k === t.sis) || p.sistemas[0];
  if (s && s.k !== t.sis) t.sis = s.k;
  const proys = S.proyectos.filter(x => x.estado !== 'cerrado');
  const zonas = zonasDe(p.id); if (!zonas.includes(t.zona)) t.zona = zonas[0];
  const e = t.errores || {};
  if (!actividadesDe(s.k).some(a => a[0] === t.act)) t.act = actividadesDe(s.k)[0][0];
  const calc = avancePorCantidad(p, s.k, t.act, t.n);
  return `<form data-f="parte" novalidate>
    <div class="campo"><label for="t-proy">Obra</label><select id="t-proy" data-c="tec" data-k="proy">${proys.map(x => `<option value="${x.id}"${x.id === p.id ? ' selected' : ''}>${esc(x.nombre)}</option>`).join('')}</select></div>
    <div class="campo"><label for="t-sis">Sistema</label><select id="t-sis" data-c="tec" data-k="sis">${p.sistemas.map(z => `<option value="${z.k}"${z.k === t.sis ? ' selected' : ''}>${esc(SIS[z.k].c)}</option>`).join('')}</select></div>
    <div class="campo"><label for="t-act">Actividad</label><select id="t-act" data-c="tec" data-k="act">${actividadesDe(s.k).map(a => `<option value="${a[0]}"${a[0] === t.act ? ' selected' : ''}>${esc(a[1])} (${esc(a[2])})</option>`).join('')}</select></div>
    <div class="campo"><label for="t-zona">Zona</label><select id="t-zona" data-c="tec" data-k="zona">${zonas.map(z => `<option${z === t.zona ? ' selected' : ''}>${esc(z)}</option>`).join('')}</select></div>
    <div class="doble"><div class="campo"><label for="t-n">Cantidad ejecutada hoy (${esc(calc.unidad)})</label><input id="t-n" type="number" min="0" step="1" inputmode="numeric" data-c="tec" data-k="n" value="${esc(t.n)}" placeholder="Ej.: 48" required aria-required="true" aria-describedby="t-calc${e.n ? ' e-n' : ''}"${e.n ? ' aria-invalid="true"' : ''}>${e.n ? `<span class="campo-error" id="e-n">${esc(e.n)}</span>` : ''}</div>
      <div class="campo"><label for="t-pers">Personal en obra</label><input id="t-pers" type="number" min="1" max="60" inputmode="numeric" data-c="tec" data-k="personal" value="${esc(t.personal)}"></div></div>
    <p class="efecto" id="t-calc" style="margin:-4px 0 14px">${textoCalculo(p, calc)}</p>
    <div class="campo"><label for="t-t">¿Qué se hizo hoy?</label><textarea id="t-t" data-c="tec" data-k="t" placeholder="Ej.: Tendido de 64 puntos de red en la bandeja del pasillo" required aria-required="true"${e.t ? ' aria-invalid="true" aria-describedby="e-t"' : ''}>${esc(t.t)}</textarea>${e.t ? `<span class="campo-error" id="e-t">${esc(e.t)}</span>` : ''}</div>
    <div class="campo"><span class="campo-l">Fotos</span>
      <label class="subir">${ico('camara')}<span><b>Tomar o elegir fotos</b><br><span class="texto-gris" style="font-size:12.5px">Se achican en el celular antes de enviarse</span></span><input type="file" accept="image/*" capture="environment" multiple data-c="tec-fotos" aria-label="Tomar o elegir fotos del avance"></label>
      ${t.fotos.length ? `<div class="previas">${t.fotos.map((f, i) => `<div class="previa">${imgFoto(f, 'm', 'Foto ' + (i + 1) + ' del parte')}<button type="button" data-a="tec-quitar-foto" data-i="${i}" aria-label="Quitar la foto ${i + 1}">${ico('x')}</button></div>`).join('')}</div>` : ''}
      ${t.fotos.length < 4 ? `<button type="button" class="btn btn-fantasma btn-chico" style="justify-self:start" data-a="tec-foto-ejemplo">${ico('foto')}¿Está en la computadora? Use una foto de ejemplo</button>` : ''}</div>
    <div class="campo"><label for="t-nota">Incidencias o notas (opcional)</label><textarea id="t-nota" data-c="tec" data-k="nota" placeholder="Ej.: Falta material para el piso 3" style="min-height:64px">${esc(t.nota)}</textarea></div>
    <button type="submit" class="btn btn-marca btn-grande btn-bloque">${ico('enviar')}Enviar parte</button>
  </form>`;
}

function tecObsLista(misObs) {
  if (!misObs.length) return `<div class="vacio" style="margin-top:10px">${ico('check')}No tiene observaciones por levantar.</div>`;
  return `<p class="texto-gris" style="font-size:13.5px">Observaciones de la supervisión asignadas a usted. Levántelas con la foto del después.</p>
    <ul class="tel-lista tel-tarjeta">${misObs.map(o => `<li><a class="tel-item" href="#tecnico/obs/${o.id}"><span class="tel-mini">${o.antes ? imgFoto(o.antes, 'm') : ''}</span><span class="crece"><b>${esc(o.t)}</b><small>${o.id} · ${esc(o.zona)} · ${hace(o.creada)}</small>${o.estado === 'revision' ? `<small class="texto-aviso">Enviada: BTS la está revisando</small>` : o.devuelta ? `<small class="texto-alerta">Devuelta: ${esc(o.devuelta)}</small>` : ''}</span>${ico('chev-d', 'flecha')}</a></li>`).join('')}</ul>`;
}

function tecLevantar(id) {
  const o = obsPor(id);
  if (!o) return `<div class="vacio">No se encontró la observación.</div>`;
  if (o.estado !== 'abierta') return `<div class="tel-hecho"><div class="sello">${ico('check')}</div><h2>Ya fue levantada</h2><p>${o.estado === 'revision' ? 'BTS la está revisando.' : 'El cliente ya la ve como levantada.'}</p><a class="btn btn-linea btn-bloque" style="margin-top:16px" href="#tecnico/obs">Volver</a></div>`;
  const lev = ui.levantar && ui.levantar.id === id ? ui.levantar : (ui.levantar = { id, foto: null, nota: '', error: '' });
  return `<span class="obs-cod">${o.id} · ${esc(SIS[o.sis].c)}</span><h2 style="font-size:18px;margin-top:4px">${esc(o.t)}</h2><p class="texto-gris" style="font-size:13px;margin-top:4px">${esc(o.zona)} · registrada por la supervisión ${hace(o.creada)}</p>
    ${o.devuelta ? `<p class="obs-nota" style="margin-top:10px"><b>BTS la devolvió:</b> ${esc(o.devuelta)}</p>` : ''}
    <div class="obs-fotos" style="margin-top:12px">${figuraAF(o.antes, 'Antes')}${lev.foto ? figuraAF(lev.foto, 'Después', 'despues') : `<div class="af sin">Falta la foto del después</div>`}</div>
    <form data-f="levantar" data-id="${o.id}" novalidate style="margin-top:14px">
      <div class="campo"><span class="campo-l">Foto del después</span><label class="subir">${ico('camara')}<span><b>${lev.foto ? 'Cambiar la foto' : 'Tomar la foto'}</b></span><input type="file" accept="image/*" capture="environment" data-c="lev-foto" aria-label="Tomar la foto del después"></label>
        <button type="button" class="btn btn-fantasma btn-chico" style="justify-self:start" data-a="lev-ejemplo" data-id="${o.id}">${ico('foto')}Usar una foto de ejemplo</button></div>
      <div class="campo"><label for="l-nota">¿Qué se hizo?</label><textarea id="l-nota" data-c="lev-nota" placeholder="Ej.: Se rotularon los 24 puertos del patch panel" required${lev.error ? ' aria-invalid="true" aria-describedby="e-lev"' : ''}>${esc(lev.nota)}</textarea>${lev.error ? `<span class="campo-error" id="e-lev">${esc(lev.error)}</span>` : ''}</div>
      <button type="submit" class="btn btn-ok btn-grande btn-bloque">${ico('check')}Marcar como levantada</button>
    </form>`;
}

function tecEnviado(id) {
  const esObs = String(id || '').startsWith('OBS');
  if (esObs) {
    const o = obsPor(id); if (!o) return '';
    const aprobada = o.estado === 'levantada' || o.estado === 'cerrada';
    return `<div class="tel-hecho"><div class="sello">${ico('check')}</div><h2>Levantamiento enviado</h2><p>${o.id} · ${esc(o.t)}</p>
      <ol class="tel-flujo"><li class="ok">${ico('check')}<span><b>Enviado a BTS</b><br><span class="texto-gris">${fHora(o.levantada)}</span></span></li>
        <li class="${aprobada ? 'ok' : 'espera'}">${ico(aprobada ? 'check' : 'reloj')}<span><b>${aprobada ? 'Aprobado por BTS' : 'Esperando la aprobación de BTS'}</b></span></li>
        <li class="${o.estado === 'cerrada' ? 'ok' : aprobada ? 'espera' : 'luego'}">${ico(o.estado === 'cerrada' ? 'check' : 'reloj')}<span><b>${o.estado === 'cerrada' ? 'El cliente dio conformidad' : 'El cliente ve el antes y el después y da su conformidad'}</b></span></li></ol>
      <a class="btn btn-tinta btn-bloque" style="margin-top:16px" href="#bts/${o.proy}/observaciones">${ico('ojo')}Ver cómo le llega a BTS</a><a class="btn btn-linea btn-bloque" style="margin-top:8px" href="#tecnico">Volver al inicio</a></div>`;
  }
  const x = partePor(id); if (!x) return '';
  const ok = x.estado === 'aprobado';
  return `<div class="tel-hecho"><div class="sello">${ico('check')}</div><h2>Parte enviado</h2><p><span class="mono">${x.id}</span> · ${esc(SIS[x.sis].c)} · +${x.inc.toFixed(1)} pts${x.fotos.length ? ` · ${plural(x.fotos.length, 'foto', 'fotos')}` : ''}</p>
    <ol class="tel-flujo"><li class="ok">${ico('check')}<span><b>Enviado a BTS</b><br><span class="texto-gris">${fHora(x.f)}</span></span></li>
      <li class="${ok ? 'ok' : 'espera'}">${ico(ok ? 'check' : 'reloj')}<span><b>${ok ? 'Aprobado por ' + esc(persona(x.aprobo).n) : x.estado === 'observado' ? 'Observado por BTS' : 'Esperando aprobación'}</b>${x.estado === 'observado' ? `<br><span class="texto-alerta">${esc(x.motivo || '')}</span>` : ''}</span></li>
      <li class="${ok ? 'ok' : 'luego'}">${ico(ok ? 'check' : 'reloj')}<span><b>${ok ? 'El cliente ya ve este avance' : 'El cliente lo verá al aprobarse'}</b></span></li>
      <li class="luego">${ico('correo')}<span><b>Entra al informe del viernes</b></span></li></ol>
    <a class="btn btn-tinta btn-bloque" style="margin-top:16px" href="#bts/${x.proy}/partes">${ico('ojo')}Ver cómo le llega a BTS</a><a class="btn btn-linea btn-bloque" style="margin-top:8px" href="#tecnico">Volver al inicio</a></div>`;
}
