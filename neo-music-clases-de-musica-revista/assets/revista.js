/* Neo Music · propuesta «Revista» (plantilla medida-revista). Sin dependencias.
   1) «Abierto ahora» con la hora de Lima  2) lámina del sumario  3) cupón → WhatsApp
   4) hoja del dueño (solo demos; misma lógica que la de templates/layout.ejs). Los textos llegan del JSON. */
(function () {
  'use strict';
  var R = window.REVISTA || {};

  // 1) Estado del horario: «Abierto ahora · hasta las 7 p. m.» / «Abre el lunes a las 10 a. m.»
  (function () {
    var H = R.horario, nodos = document.querySelectorAll('[data-estado]');
    if (!H || !H.semana || !nodos.length || !window.Intl) return;
    var t = H.textos || {};
    var ahora;
    try {
      var partes = {};
      new Intl.DateTimeFormat('en-US', { timeZone: 'America/Lima', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
        .formatToParts(new Date()).forEach(function (p) { partes[p.type] = p.value; });
      var dias = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      ahora = { dia: dias[partes.weekday], min: (+partes.hour % 24) * 60 + (+partes.minute) };
    } catch (e) { return; }
    if (ahora.dia === undefined || isNaN(ahora.min)) return;
    var aMin = function (hhmm) { var a = String(hhmm).split(':'); return (+a[0]) * 60 + (+a[1] || 0); };
    var hora = function (hhmm) {
      var a = String(hhmm).split(':'), h = +a[0], m = +a[1] || 0;
      return (h % 12 || 12) + (m ? ':' + (m < 10 ? '0' : '') + m : '') + (h < 12 ? ' a. m.' : ' p. m.');
    };
    var llenar = function (s, o) { return String(s || '').replace(/\{(\w+)\}/g, function (_, k) { return o[k] || ''; }); };
    var hoy = H.semana[ahora.dia], texto = '';
    if (hoy && ahora.min >= aMin(hoy[0]) && ahora.min < aMin(hoy[1])) texto = llenar(t.abierto, { hora: hora(hoy[1]) });
    else if (hoy && ahora.min < aMin(hoy[0])) texto = llenar(t.abreHoy, { hora: hora(hoy[0]) });
    else {
      for (var i = 1; i <= 7; i++) {
        var d = (ahora.dia + i) % 7, sig = H.semana[d];
        if (!sig) continue;
        texto = i === 1 ? llenar(t.abreManana, { hora: hora(sig[0]) }) : llenar(t.abreDia, { dia: (t.dias || [])[d] || '', hora: hora(sig[0]) });
        break;
      }
    }
    if (!texto) return;
    for (var n = 0; n < nodos.length; n++) nodos[n].textContent = texto;
  })();

  // 2) Sumario: en escritorio, la lámina de la izquierda sigue al curso que se señala.
  (function () {
    var vista = document.querySelector('.sumario__vista');
    if (!vista) return;
    var laminas = vista.querySelectorAll('.sumario__lamina');
    var activar = function (i) {
      for (var k = 0; k < laminas.length; k++) laminas[k].classList.toggle('es-activa', laminas[k].getAttribute('data-i') === i);
    };
    var filas = document.querySelectorAll('.indice__fila');
    for (var k = 0; k < filas.length; k++) {
      (function (f) {
        var i = f.getAttribute('data-i');
        f.addEventListener('mouseenter', function () { activar(i); });
        f.addEventListener('focusin', function () { activar(i); });
      })(filas[k]);
    }
  })();

  // 3) Cupón: arma el mensaje (siempre «Hola Neo Music, vi su página web y …») y abre WhatsApp.
  (function () {
    var C = R.cupon, form = document.getElementById('cupon-form');
    if (!C || !form) return;
    var campos = C.campos || {};
    var marcar = function (input, error, malo) {
      var caja = input.closest('.campo');
      if (caja) caja.setAttribute('aria-invalid', malo ? 'true' : 'false');
      input.setAttribute('aria-invalid', malo ? 'true' : 'false');
      if (error) error.hidden = !malo;
    };
    var sel = form.elements.instrumento, nom = form.elements.nombre;
    var errSel = document.getElementById('c-instrumento-error'), errNom = document.getElementById('c-nombre-error');
    sel.addEventListener('change', function () { if (sel.value !== '') marcar(sel, errSel, false); });
    nom.addEventListener('input', function () { if (nom.value.trim()) marcar(nom, errNom, false); });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var opcion = (campos.instrumento && campos.instrumento.opciones || [])[+sel.value];
      var limpio = function (v) { return String(v || '').trim().replace(/\s+/g, ' ').replace(/[.\s]+$/, ''); };
      var nombre = limpio(nom.value);
      var faltaSel = sel.value === '' || !opcion, faltaNom = !nombre;
      marcar(sel, errSel, faltaSel);
      marcar(nom, errNom, faltaNom);
      if (faltaSel || faltaNom) { (faltaSel ? sel : nom).focus(); return; }
      var lineas = [C.saludo + opcion.mensaje];
      var linea = function (campo, valor) { if (valor && campo && campo.linea) lineas.push(campo.linea.replace('{valor}', valor)); };
      linea(campos.edad, limpio(form.elements.edad.value));
      var fo = form.querySelector('input[name="formato"]:checked'), lu = form.querySelector('input[name="lugar"]:checked');
      linea(campos.formato, fo && fo.value.toLowerCase());
      linea(campos.lugar, lu && lu.value.toLowerCase());
      linea(campos.nombre, nombre);
      var url = 'https://wa.me/' + C.wsp + '?text=' + encodeURIComponent(lineas.join('\n'));
      var w = window.open(url, '_blank');
      if (w) { try { w.opener = null; } catch (e) {} } else { window.location.href = url; }
    });
  })();

  // 4) Hoja del dueño (N02, 6-nov-2026): la primera vez que alguien toca un WhatsApp DEL NEGOCIO en la demo,
  //    se le cuenta que así le escribirán sus alumnos. Una vez por visita (sessionStorage «k-hoja»). Oyente en
  //    burbuja y sin stopPropagation: el aviso de aperturas ya contó «wa» en captura.
  (function () {
    var D = R.dueno, h = document.getElementById('hoja-dueno'), seguir = document.getElementById('hoja-dueno-seguir');
    if (!D || !h || !seguir || !D.n || D.n === D.v) return;
    var visto = false, ultimo = null;
    try { visto = !!sessionStorage.getItem('k-hoja'); } catch (e) {}
    var cerrar = function () {
      if (h.hidden) return;
      var dentro = h.contains(document.activeElement);
      h.hidden = true;
      if (dentro && ultimo) { try { ultimo.focus({ preventScroll: true }); } catch (e) {} }
    };
    document.addEventListener('click', function (ev) {
      if (visto) return;
      var a = ev.target && ev.target.closest && ev.target.closest('a[href]');
      if (!a) return;
      var r = a.getAttribute('href') || '';
      if (r.indexOf('wa.me/' + D.v) >= 0 || r.indexOf('wa.me/' + D.n) < 0) return;
      ev.preventDefault();
      visto = true;
      try { sessionStorage.setItem('k-hoja', '1'); } catch (e) {}
      seguir.href = a.href; seguir.target = '_blank'; seguir.rel = 'noopener';
      ultimo = a;
      h.hidden = false;
      try { h.focus({ preventScroll: true }); } catch (e) {}
    }, false);
    h.querySelector('.hoja-dueno__cerrar').addEventListener('click', cerrar);
    seguir.addEventListener('click', function () { setTimeout(cerrar, 0); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrar(); });
  })();
})();
