/* =====================================================================
   Masificación · Nuevo proyecto desde plantilla (cuatro pasos)
   ===================================================================== */
'use strict';

function nuevoInicial() {
  const lunes = sumarDias(lunesDe(HOY), 7);
  const pl = PLANTILLA.hospital;
  return { paso: 1, plantilla: 'hospital', nombre: '', cliente: '', entidad: '', ubicacion: '', monto: '', inicio: fISO(lunes), fin: fISO(sumarDias(lunes, pl.semanas * 7 - 3)), sistemas: pl.sistemas.map(x => x[0]), invitados: [{ n: '', correo: '', rol: 'Supervisión de obra' }], t0: Date.now(), errores: {}, creado: null };
}
function datosNuevo() {
  const n = ui.nuevo;
  return { plantilla: n.plantilla, nombre: n.nombre.trim(), cliente: n.cliente.trim(), entidad: n.entidad.trim(), ubicacion: n.ubicacion.trim(), monto: +String(n.monto).replace(/[^\d.]/g, '') || 0, inicio: deISO(n.inicio), fin: deISO(n.fin) + 17 * HORA, sistemas: n.sistemas.slice(), invitados: n.invitados.filter(u => u.n.trim() && u.correo.trim()).map(u => ({ n: u.n.trim(), correo: u.correo.trim(), rol: u.rol })) };
}
function validarNuevo() {
  const d = datosNuevo(), e = {};
  if (!d.nombre) e.nombre = 'Escriba el nombre de la obra.';
  if (!d.cliente) e.cliente = 'Escriba quién es el cliente.';
  if (!(d.monto > 0)) e.monto = 'Escriba el monto del contrato en soles.';
  if (!d.inicio || !d.fin || d.fin - d.inicio < 4 * SEMANA) e.fin = 'La entrega debe ser al menos 4 semanas después del inicio.';
  if (!d.sistemas.length) e.sistemas = 'Elija al menos un sistema.';
  ui.nuevo.errores = e;
  return !Object.keys(e).length;
}

function vNuevo() {
  if (!ui.nuevo) ui.nuevo = nuevoInicial();
  const n = ui.nuevo;
  const pasos = ['Plantilla', 'Datos de la obra', 'Lo que se carga', 'Accesos del cliente'];
  const cab = n.paso <= 4 ? `<div class="titulo-vista"><div><nav class="migas" aria-label="Ruta"><a href="#bts">Cartera</a>${ico('chev-d')}<span>Nuevo proyecto</span></nav><h1>Nuevo proyecto desde plantilla</h1><p>La plantilla trae etapas, sistemas, checklist del dossier, protocolos e hitos de pago. Usted solo pone los datos de la obra.</p></div></div>
    <ol class="pasos-asist" aria-label="Pasos">${pasos.map((t, i) => `<li class="${i + 1 < n.paso ? 'hecho' : i + 1 === n.paso ? 'actual' : ''}"${i + 1 === n.paso ? ' aria-current="step"' : ''}><span class="mono">Paso ${i + 1}</span><span class="paso-n-t">${t}</span></li>`).join('')}</ol>` : '';
  const cuerpo = [null, nuevoPaso1, nuevoPaso2, nuevoPaso3, nuevoPaso4, nuevoCreado][n.paso]();
  return `<div class="pagina"><div class="asistente">${cab}${cuerpo}</div></div>`;
}

function nuevoPaso1() {
  const n = ui.nuevo;
  return `<form data-f="nuevo-1" novalidate><fieldset style="border:0;padding:0;margin:0"><legend class="sr">Elija la plantilla</legend><div class="plantillas">${PLANTILLAS.map(pl => {
    const sis = pl.sistemas.map(x => SIS[x[0]].c);
    const dos = dossierDesdeSistemas(pl.sistemas.map(([k]) => ({ k })));
    return `<label class="plantilla"><input type="radio" name="plantilla" value="${pl.k}"${n.plantilla === pl.k ? ' checked' : ''} data-c="nuevo-plantilla"><span class="plantilla-caja"><span class="plantilla-ico" aria-hidden="true">${ico(pl.ico, 'g')}</span><span><h3>${esc(pl.n)}</h3><p>${esc(pl.d)}</p>
      <span class="plantilla-datos"><span>${sis.length} sistemas</span><span>${dos.length} docs. de dossier</span><span>${dos.filter(i => i.cat === 'protocolos').length} protocolos</span><span>${pl.pagos.length} hitos de pago</span></span>
      <span class="plantilla-sis" style="display:block">${esc(sis.join(' · '))}</span></span></span></label>`;
  }).join('')}</div></fieldset>
  <div class="asist-pie"><a class="btn btn-linea" href="#bts">Cancelar</a><button type="submit" class="btn btn-tinta">Siguiente: datos de la obra${ico('flecha-d')}</button></div></form>`;
}

function campoNuevo(nombre, etq, { tipo = 'text', ph = '', ayuda = '', req = false, modo = '' } = {}) {
  const n = ui.nuevo, err = n.errores[nombre];
  return `<div class="campo"><label for="n-${nombre}">${etq}${req ? ' <span aria-hidden="true" class="texto-alerta">*</span>' : ''}</label>
    <input id="n-${nombre}" name="${nombre}" type="${tipo}" value="${esc(n[nombre])}" placeholder="${esc(ph)}" data-c="nuevo-campo"${modo ? ` inputmode="${modo}"` : ''}${req ? ' required aria-required="true"' : ''}${err ? ` aria-invalid="true" aria-describedby="e-${nombre}"` : ''} autocomplete="off">
    ${err ? `<span class="campo-error" id="e-${nombre}">${esc(err)}</span>` : ayuda ? `<span class="campo-ayuda">${esc(ayuda)}</span>` : ''}</div>`;
}
function nuevoPaso2() {
  const n = ui.nuevo, pl = PLANTILLA[n.plantilla];
  const todos = pl.sistemas.map(x => [x[0], true]).concat((pl.opcionales || []).map(x => [x[0], false]));
  return `<form data-f="nuevo-2" novalidate>
    <div class="rejilla g-principal">
      <section class="tarjeta"><div class="tarjeta-cab"><div><span class="etq">Plantilla: ${esc(pl.n)}</span><h2 class="tarjeta-t">Datos de la obra</h2></div><button type="button" class="btn btn-fantasma btn-chico" data-a="nuevo-ejemplo">${ico('editar')}Llenar con un ejemplo</button></div>
        ${campoNuevo('nombre', 'Nombre de la obra', { ph: 'Ej.: Hospital II de Huaral', req: true })}
        <div class="doble">${campoNuevo('cliente', 'Cliente', { ph: 'Ej.: Consorcio Salud Norte Chico', req: true })}${campoNuevo('entidad', 'Entidad o dueño de la obra', { ph: 'Ej.: EsSalud, gobierno regional, privado' })}</div>
        <div class="doble">${campoNuevo('ubicacion', 'Ubicación', { ph: 'Ej.: Huaral, Lima' })}${campoNuevo('monto', 'Monto del contrato (S/)', { ph: 'Ej.: 1,240,000', req: true, modo: 'decimal' })}</div>
        <div class="doble">${campoNuevo('inicio', 'Inicio de obra', { tipo: 'date', req: true })}${campoNuevo('fin', 'Entrega prevista', { tipo: 'date', req: true, ayuda: `La plantilla sugiere ${pl.semanas} semanas.` })}</div>
      </section>
      <section class="tarjeta"><fieldset style="border:0;padding:0;margin:0"><legend class="tarjeta-t" style="padding:0">Sistemas de esta obra</legend><p class="tarjeta-sub" style="margin-bottom:8px">Los marcados vienen en la plantilla; agregue o quite los que necesite.</p>
        ${todos.map(([k]) => `<label class="casilla"><input type="checkbox" name="sistemas" value="${k}"${n.sistemas.includes(k) ? ' checked' : ''} data-c="nuevo-sistema"><span>${esc(SIS[k].n)}<br><span class="texto-gris" style="font-size:12.5px">${(PROTOCOLOS[k] || []).length} protocolos de prueba</span></span></label>`).join('')}
        ${n.errores.sistemas ? `<span class="campo-error">${esc(n.errores.sistemas)}</span>` : ''}</fieldset></section>
    </div>
    <div class="asist-pie"><button type="button" class="btn btn-linea" data-a="nuevo-paso" data-paso="1">${ico('flecha-i')}Atrás</button><button type="submit" class="btn btn-tinta">Siguiente: revisar lo que se carga${ico('flecha-d')}</button></div></form>`;
}
function nuevoPaso3() {
  const d = datosNuevo(), pl = PLANTILLA[d.plantilla];
  const p = armarProyecto(d, 'vista-previa');
  CURVAS_TEMP['vista-previa'] = p;
  const prot = p.dossier.filter(i => i.cat === 'protocolos').length;
  return `<div class="pila">
    <section class="tarjeta"><div class="tarjeta-cab"><div><h2 class="tarjeta-t">Lo que trae la plantilla</h2><p class="tarjeta-sub">${esc(d.nombre)} · ${esc(d.cliente)} · ${soles(d.monto)} · ${fMedia(d.inicio)} a ${fMedia(d.fin)} (${p.semanas} semanas)</p></div></div>
      <div class="carga"><div><b>${ETAPAS.length}</b><span>etapas con fechas</span></div><div><b>${p.sistemas.length}</b><span>sistemas con su peso</span></div><div><b>${p.dossier.length}</b><span>documentos en el checklist del dossier</span></div><div><b>${prot}</b><span>protocolos de prueba</span></div><div><b>${p.pagos.length}</b><span>hitos de pago</span></div><div><b>${p.hitos.length}</b><span>hitos de obra</span></div></div></section>
    <div class="rejilla g-mitad">
      <section class="tarjeta"><div class="tarjeta-cab"><div><h2 class="tarjeta-t">Curva S programada</h2><p class="tarjeta-sub">Calculada con sus fechas y el peso de cada sistema.</p></div></div>${curvaHTML(p, { alto: 220, mini: true, tabla: false })}</section>
      <section class="tarjeta"><div class="tarjeta-cab"><div><h2 class="tarjeta-t">Hitos de pago</h2><p class="tarjeta-sub">Con lo que pide cada uno para cobrarse.</p></div></div>
        <ol class="pagos">${p.pagos.map(g => `<li class="pago pendiente" style="padding:9px 0"><span class="pago-n">${g.n}</span><div><div class="pago-t" style="font-size:14px">${esc(g.t)}</div><div class="pago-s">${(g.req || []).map(r => esc(r.t)).join(' · ')}</div></div><div class="pago-monto"><b>${soles(montoPago(p, g))}</b><span class="texto-gris" style="font-size:12px">${g.pct} %</span></div></li>`).join('')}</ol></section>
    </div>
    <section class="tarjeta"><div class="tarjeta-cab"><div><h2 class="tarjeta-t">Checklist del dossier de cierre: ${p.dossier.length} documentos</h2><p class="tarjeta-sub">Cada protocolo, ficha o acta que se apruebe en la obra marca su casilla.</p></div></div>
      <div class="kpis">${CAT_DOSSIER.map(c => { const k = p.dossier.filter(i => i.cat === c.k).length; return k ? `<div class="kpi" style="box-shadow:none"><span class="etq">${c.n}</span><div class="kpi-v" style="font-size:20px">${k}</div></div>` : ''; }).join('')}</div></section>
    <div class="asist-pie"><button type="button" class="btn btn-linea" data-a="nuevo-paso" data-paso="2">${ico('flecha-i')}Atrás</button><button type="button" class="btn btn-tinta" data-a="nuevo-paso" data-paso="4">Siguiente: accesos del cliente${ico('flecha-d')}</button></div>
  </div>`;
}
function nuevoPaso4() {
  const n = ui.nuevo;
  const roles = ['Supervisión de obra', 'Residente del cliente', 'Observador (solo lectura)'];
  return `<form data-f="nuevo-4" novalidate><section class="tarjeta"><div class="tarjeta-cab"><div><h2 class="tarjeta-t">¿Quién del cliente verá esta obra?</h2><p class="tarjeta-sub">Cada persona recibe un correo con su acceso. Puede invitar a más después.</p></div></div>
    ${n.invitados.map((u, i) => `<div class="invitado"><div class="campo"><label for="inv-n-${i}">Nombre y cargo</label><input id="inv-n-${i}" value="${esc(u.n)}" placeholder="Ej.: Ing. Ana Ríos, supervisión" data-c="nuevo-invitado" data-i="${i}" data-k="n" autocomplete="off"></div>
      <div class="campo"><label for="inv-c-${i}">Correo</label><input id="inv-c-${i}" type="email" value="${esc(u.correo)}" placeholder="nombre@empresa.pe" data-c="nuevo-invitado" data-i="${i}" data-k="correo" autocomplete="off"></div>
      <div class="campo"><label for="inv-r-${i}">Rol</label><select id="inv-r-${i}" data-c="nuevo-invitado" data-i="${i}" data-k="rol">${roles.map(r => `<option${u.rol === r ? ' selected' : ''}>${r}</option>`).join('')}</select></div>
      <button type="button" class="btn btn-linea" style="width:44px;padding:0;min-height:44px" data-a="nuevo-quitar-inv" data-i="${i}" aria-label="Quitar esta persona"${n.invitados.length === 1 ? ' disabled' : ''}>${ico('x')}</button></div>`).join('')}
    <button type="button" class="btn btn-fantasma btn-chico" data-a="nuevo-agregar-inv">${ico('mas')}Agregar otra persona</button>
    <div class="nota-final"><span class="etq">En la muestra</span><span>No se envía ningún correo: la invitación queda registrada para que vea cómo funciona.</span></div></section>
    <div class="asist-pie"><button type="button" class="btn btn-linea" data-a="nuevo-paso" data-paso="3">${ico('flecha-i')}Atrás</button><button type="submit" class="btn btn-marca btn-grande">${ico('check')}Crear proyecto</button></div></form>`;
}
function nuevoCreado() {
  const n = ui.nuevo, p = proy(n.creado);
  if (!p) { ui.nuevo = nuevoInicial(); return nuevoPaso1(); }
  const seg = Math.max(1, Math.round((n.tFin - n.t0) / 1000));
  const tiempo = seg < 60 ? `${seg} segundos` : `${Math.floor(seg / 60)} min ${seg % 60} s`;
  const inv = (p.usuarios || []).filter(u => u.estado === 'invitado').length;
  return `<div class="creado"><div class="sello">${ico('check')}</div><span class="etq cian">Proyecto creado en ${tiempo}</span><h1 style="margin-top:6px">${esc(p.nombre)}</h1>
    <p>Quedó con ${ETAPAS.length} etapas, ${p.sistemas.length} sistemas, ${p.dossier.length} documentos en el checklist del dossier y ${p.pagos.length} hitos de pago.${inv ? ` ${plural(inv, 'persona del cliente recibe', 'personas del cliente reciben')} su acceso.` : ''}</p>
    <div class="btns" style="justify-content:center;margin-top:20px"><a class="btn btn-tinta" href="#bts/${p.id}">${ico('carpeta')}Abrir el proyecto</a><a class="btn btn-linea" href="#cliente/${p.id}">${ico('ojo')}Ver el portal de su cliente</a><a class="btn btn-linea" href="#bts">Volver a la cartera</a></div></div>`;
}
