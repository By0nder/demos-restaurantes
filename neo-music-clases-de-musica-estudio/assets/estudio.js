/* «El Estudio» · plantilla a medida (lib/medida/estudio.js). Sin dependencias; los datos vienen de <script id="e-datos">. */
(function () {
  'use strict';
  var d = document, w = window, html = d.documentElement;
  html.classList.add('listo');
  var datos = {};
  try { datos = JSON.parse(d.getElementById('e-datos').textContent) || {}; } catch (e) { datos = {}; }
  var io = 'IntersectionObserver' in w;

  /* 1. El hero llena la pantalla menos lo que tiene encima (barra del dueño y, si la hay, la de «Diseño 1/2/3»). */
  var hero = d.getElementById('inicio');
  function medirSobre() {
    if (!hero) return;
    var top = hero.getBoundingClientRect().top + (w.pageYOffset || 0);
    html.style.setProperty('--sobre', Math.max(0, Math.round(top)) + 'px');
  }
  medirSobre();
  w.addEventListener('load', medirSobre);
  w.addEventListener('resize', medirSobre, { passive: true });

  /* 2. Cabecera: transparente sobre la foto mientras la página está arriba; sólida apenas se baja
     (si no, el menú se monta sobre el lema gigante del hero). */
  var cab = d.getElementById('cabecera');
  var pendiente = false;
  function cabecera() {
    pendiente = false;
    if (!cab) return;
    var y = w.pageYOffset || 0, tope = hero ? hero.getBoundingClientRect().top + y : 0;
    cab.classList.toggle('solida', y > tope + 12);
  }
  cabecera();
  w.addEventListener('scroll', function () { if (!pendiente) { pendiente = true; w.requestAnimationFrame(cabecera); } }, { passive: true });

  /* 3. Menú del celular (con foco atrapado y Escape). */
  var btnMenu = d.querySelector('.e-menu-btn'), menu = d.getElementById('menu-movil');
  if (btnMenu && menu) {
    var cerrarMenuBtn = menu.querySelector('.e-menu__cerrar');
    var abrirMenu = function () {
      menu.hidden = false; btnMenu.setAttribute('aria-expanded', 'true'); html.classList.add('menu-abierto');
      var primero = menu.querySelector('nav a'); if (primero) primero.focus();
    };
    var cerrarMenu = function (volver) {
      if (menu.hidden) return;
      menu.hidden = true; btnMenu.setAttribute('aria-expanded', 'false'); html.classList.remove('menu-abierto');
      if (volver) btnMenu.focus();
    };
    btnMenu.addEventListener('click', abrirMenu);
    if (cerrarMenuBtn) cerrarMenuBtn.addEventListener('click', function () { cerrarMenu(true); });
    menu.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) cerrarMenu(false); });
    d.addEventListener('keydown', function (e) {
      if (menu.hidden) return;
      if (e.key === 'Escape') { cerrarMenu(true); return; }
      if (e.key !== 'Tab') return;
      var f = menu.querySelectorAll('a[href], button'); if (!f.length) return;
      var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && d.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && d.activeElement === z) { e.preventDefault(); a.focus(); }
    });
    w.addEventListener('resize', function () { if (w.innerWidth >= 1024) cerrarMenu(false); }, { passive: true });
  }

  /* 4. Medidor de cada sección: se enciende al llegar (el del hero lo enciende el CSS al cargar). */
  var etiquetas = d.querySelectorAll('.e-etq:not(.e-etq--hero)');
  if (io) {
    var obsEtq = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('on'); obsEtq.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    etiquetas.forEach(function (el) { obsEtq.observe(el); });
  } else etiquetas.forEach(function (el) { el.classList.add('on'); });

  /* 4b. En pantallas táctiles (sin mouse) el curso que pasa por el centro de la pantalla enciende su medidor,
     como la pista que está sonando. Con mouse lo hace el :hover del CSS. */
  var tactil = w.matchMedia && w.matchMedia('(hover: none)').matches;
  if (tactil && io) {
    var obsCurso = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) { en.target.classList.toggle('on', en.isIntersecting); });
    }, { rootMargin: '-42% 0px -42% 0px' });
    d.querySelectorAll('.e-curso').forEach(function (li) { obsCurso.observe(li); });
  }

  /* 5. Cursos ↔ fotos (escritorio): al pasar por un curso se enciende su foto y se apagan las demás. */
  var mosaico = d.querySelector('.e-mosaico');
  if (mosaico) {
    d.querySelectorAll('.e-curso a[data-curso]').forEach(function (a) {
      var f = mosaico.querySelector('[data-curso="' + a.getAttribute('data-curso') + '"]');
      if (!f) return;
      var on = function () { mosaico.classList.add('atenua'); f.classList.add('activa'); };
      var off = function () { mosaico.classList.remove('atenua'); f.classList.remove('activa'); };
      a.addEventListener('mouseenter', on); a.addEventListener('mouseleave', off);
      a.addEventListener('focus', on); a.addEventListener('blur', off);
    });
  }

  /* 6. Horario con la hora de Lima: «Abierto ahora · hasta las 7 p. m.» y el día de hoy resaltado. */
  function hora12(s) {
    var p = String(s).split(':'), h = +p[0], m = +p[1] || 0, h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + (m ? ':' + (m < 10 ? '0' : '') + m : '') + (h === 12 ? ' m.' : h < 12 ? ' a. m.' : ' p. m.');
  }
  var dias = datos.dias || [];
  if (dias.length === 7) {
    var u = new Date(), lima = new Date(u.getTime() + u.getTimezoneOffset() * 60000 + (datos.zona || -5) * 3600000);
    var hoy = lima.getDay(), idx = (hoy + 6) % 7, ahora = lima.getHours() * 60 + lima.getMinutes();
    var mins = function (s) { var p = String(s).split(':'); return (+p[0]) * 60 + (+p[1] || 0); };
    var dh = dias[idx], abierto = !!(dh && !dh.cerrado && ahora >= mins(dh.abre) && ahora < mins(dh.cierra));
    var t = datos.textos || {}, corto = abierto ? (t.abierto || 'Abierto ahora') : (t.cerrado || 'Cerrado ahora'), largo;
    if (abierto) largo = corto + ' · hasta las ' + hora12(dh.cierra);
    else {
      var prox = null;
      if (dh && !dh.cerrado && ahora < mins(dh.abre)) prox = { dia: dh, cuando: 'hoy' };
      else for (var k = 1; k <= 7; k++) { var j = dias[(idx + k) % 7]; if (j && !j.cerrado) { prox = { dia: j, cuando: k === 1 ? 'mañana' : 'el ' + String(j.dia).toLowerCase() }; break; } }
      largo = corto + (prox ? ' · abre ' + prox.cuando + ' a las ' + hora12(prox.dia.abre) : '');
    }
    // «corto» bajo el horario de la franja del hero; «largo» (con la próxima hora) en Visítenos.
    d.querySelectorAll('[data-estado]').forEach(function (el) { el.textContent = el.getAttribute('data-estado') === 'corto' ? corto : largo; el.classList.add(abierto ? 'abierto' : 'cerrado'); el.hidden = false; });
    d.querySelectorAll('[data-estado-sin]').forEach(function (el) { el.hidden = true; });
    var fila = d.querySelector('.e-horario tr[data-dia="' + hoy + '"]');
    if (fila) { fila.classList.add('hoy'); fila.setAttribute('aria-current', 'date'); }
  }

  /* 7. Formulario → WhatsApp del negocio con el mensaje armado (sin servidor). */
  var form = d.getElementById('form-reserva');
  if (form && datos.reserva && datos.whatsapp) {
    var r = datos.reserva.mensaje || {};
    var eCurso = d.getElementById('error-curso'), eNombre = d.getElementById('error-nombre');
    var nombre = d.getElementById('f-nombre'), edad = d.getElementById('f-edad');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var curso = form.querySelector('input[name="curso"]:checked');
      var mod = form.querySelector('input[name="modalidad"]:checked');
      var ok = true;
      if (!curso) { eCurso.textContent = datos.reserva.errorCurso || 'Elija un curso.'; eCurso.hidden = false; ok = false; } else eCurso.hidden = true;
      if (!nombre.value.trim()) { eNombre.textContent = datos.reserva.errorNombre || 'Escriba su nombre.'; eNombre.hidden = false; nombre.setAttribute('aria-invalid', 'true'); ok = false; }
      else { eNombre.hidden = true; nombre.removeAttribute('aria-invalid'); }
      if (!ok) { (curso ? nombre : form.querySelector('input[name="curso"]')).focus(); return; }
      var lineas = [datos.saludo + ' ' + (curso.value ? String(r.conCurso || 'reservar una clase de prueba de {curso}.').replace('{curso}', curso.value) : (r.sinCurso || 'reservar una clase de prueba.'))];
      if (edad && edad.value.trim()) lineas.push((r.edad || 'Edad del alumno') + ': ' + edad.value.trim());
      if (mod) lineas.push((r.modalidad || 'Modalidad') + ': ' + mod.value);
      lineas.push((r.nombre || 'Mi nombre') + ': ' + nombre.value.trim());
      var url = 'https://wa.me/' + datos.whatsapp + '?text=' + encodeURIComponent(lineas.join('\n'));
      var v = w.open(url, '_blank');
      if (v) { try { v.opener = null; } catch (x) { /* otra ventana */ } } else w.location.href = url;
    });
    form.addEventListener('change', function (e) { if (e.target && e.target.name === 'curso') eCurso.hidden = true; });
    nombre.addEventListener('input', function () { if (nombre.value.trim()) { eNombre.hidden = true; nombre.removeAttribute('aria-invalid'); } });
  }

  /* 8. El flotante (escritorio) y la barra del celular aparecen cuando el botón del hero ya no se ve. */
  var cta = d.getElementById('cta-hero');
  var fijos = [d.getElementById('flotante'), d.getElementById('barra-movil')].filter(Boolean);
  if (cta && io) {
    new IntersectionObserver(function (entradas) {
      var ver = !entradas[0].isIntersecting;
      fijos.forEach(function (el) { el.classList.toggle('visible', ver); });
    }).observe(cta);
  } else fijos.forEach(function (el) { el.classList.add('visible'); });
  // La barra del celular se aparta mientras el formulario está a la vista: ahí ya está su propio botón.
  var barraMovil = d.getElementById('barra-movil');
  if (form && barraMovil && io) {
    new IntersectionObserver(function (entradas) {
      barraMovil.classList.toggle('en-form', entradas[0].isIntersecting);
    }, { rootMargin: '0px 0px -30% 0px' }).observe(form);
  }

  /* 9. Menú de escritorio: marca la sección que se está leyendo. */
  var enlaces = d.querySelectorAll('.e-nav a[data-seccion]');
  if (enlaces.length && io) {
    var porId = {};
    enlaces.forEach(function (a) { porId[a.getAttribute('data-seccion')] = a; });
    var obsSec = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        var a = porId[en.target.id];
        if (!a || !en.isIntersecting) return;
        enlaces.forEach(function (x) { x.classList.remove('activo'); x.removeAttribute('aria-current'); });
        a.classList.add('activo'); a.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(porId).forEach(function (id) { var s = d.getElementById(id); if (s) obsSec.observe(s); });
  }

  /* 10. Hoja para el dueño (la misma idea de layout.ejs, N02): la primera vez por visita que toca un WhatsApp
     de SU negocio se le explica qué es y se le ofrece activarla. Burbuja, sin stopPropagation: el aviso de
     aperturas (lib/aperturas.js, en captura) ya contó «wa». «Probar el botón igual» sigue al enlace original. */
  var hoja = d.getElementById('hoja-dueno'), seguir = d.getElementById('hoja-dueno-seguir');
  var N = datos.whatsapp, V = datos.vendedor;
  if (hoja && seguir && N && V && N !== V) {
    var visto = false, ultimo = null;
    try { visto = !!w.sessionStorage.getItem('k-hoja'); } catch (e) { visto = false; }
    var cerrarHoja = function () {
      if (hoja.hidden) return;
      var dentro = hoja.contains(d.activeElement);
      hoja.hidden = true;
      if (dentro && ultimo) try { ultimo.focus({ preventScroll: true }); } catch (e) { /* nada */ }
    };
    d.addEventListener('click', function (ev) {
      if (visto) return;
      var a = ev.target && ev.target.closest && ev.target.closest('a[href]');
      if (!a) return;
      var ref = a.getAttribute('href') || '';
      if (ref.indexOf('wa.me/' + V) >= 0 || ref.indexOf('wa.me/' + N) < 0) return;
      ev.preventDefault();
      visto = true;
      try { w.sessionStorage.setItem('k-hoja', '1'); } catch (e) { /* modo privado */ }
      seguir.href = a.href; seguir.target = '_blank'; seguir.rel = 'noopener';
      ultimo = a; hoja.hidden = false;
      try { hoja.focus({ preventScroll: true }); } catch (e) { /* nada */ }
    }, false);
    var x = hoja.querySelector('.e-hoja__cerrar');
    if (x) x.addEventListener('click', cerrarHoja);
    seguir.addEventListener('click', function () { w.setTimeout(cerrarHoja, 60); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarHoja(); });
  }
})();
