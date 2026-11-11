/* Neo Music — propuesta «Color de marca» (plantilla medida-familia). Sin dependencias.
   1) selector de curso del héroe  2) cabecera  3) menú del celular  4) barra del celular
   5) formulario de la clase de prueba  6) «Abierto ahora» con la hora de Lima  7) barras que se llenan */
(function () {
  "use strict";
  var datos = {};
  try { datos = JSON.parse(document.getElementById("datos-pagina").textContent); } catch (e) { return; }
  var reducir = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var COLORES = ["rojo", "naranja", "amarillo", "verde", "carbon"];
  var wa = function (msg) { return "https://wa.me/" + datos.numero + "?text=" + encodeURIComponent(datos.saludo + msg); };
  var color = function (el, c) { if (!el) return; COLORES.forEach(function (x) { el.classList.remove("c-" + x); }); el.classList.add("c-" + c); };
  var reiniciar = function (el, clase) { if (!el || reducir) return; el.classList.remove(clase); void el.offsetWidth; el.classList.add(clase); };

  /* 1) Selector del héroe: color de la barra, foto, resalte del título y botón «…clase de prueba de piano» */
  var hero = $(".hero"), esc = $("#escenario"), cta = $("#hero-cta"), ctaDe = $("#hero-cta-de"), resalte = $("#hero-resalte"), eyebrow = $(".eyebrow");
  var tocoFormulario = false;
  function elegir(id, animar) {
    var c = datos.cursos && datos.cursos[id];
    if (!c || !esc) return;
    esc.setAttribute("data-curso", id);
    color(esc, c.c); color(resalte, c.c); color(hero, c.c);
    // detrás de la barra, las otras tres del logo en su orden (como la pila de barras del logo)
    var orden = ["rojo", "naranja", "amarillo", "verde"], k = orden.indexOf(c.c);
    $$(".esc-pila i", esc).forEach(function (b, i) { color(b, orden[(k + 1 + i) % 4]); });
    $$(".esc-media, .esc-palabra", esc).forEach(function (m) { m.hidden = m.getAttribute("data-curso") !== id; });
    if (cta) cta.href = wa(datos.pruebaCurso.replace("{de}", c.de));
    if (ctaDe) ctaDe.textContent = c.de;
    if (resalte && c.v) resalte.textContent = c.v; // «¿Qué quiere tocar?» / «cantar?» / «producir?»
    if (animar) { reiniciar(esc, "cambio"); reiniciar(resalte, "pop"); reiniciar(eyebrow, "sonando"); }
    // el formulario de abajo arranca con el mismo curso mientras la persona no lo haya cambiado
    if (!tocoFormulario) { var r = $('#form-prueba input[name="f-curso"][value="' + id + '"]'); if (r && animar) { r.checked = true; armar(); } }
  }
  $$('.hero input[name="curso"]').forEach(function (r) {
    r.addEventListener("change", function () { if (r.checked) elegir(r.value, true); });
  });
  var marcado = $('.hero input[name="curso"]:checked');
  if (marcado) elegir(marcado.value, false);
  // las fotos de los otros cursos se piden cuando la página ya cargó (el cambio se ve al instante)
  window.addEventListener("load", function () {
    setTimeout(function () { $$('.escenario img[loading="lazy"]').forEach(function (i) { i.loading = "eager"; }); }, 900);
  });

  /* 2) Cabecera: sombra al bajar; las barras del logo «suenan» mientras se hace scroll */
  var cab = $(".cab"), quieto;
  window.addEventListener("scroll", function () {
    if (!cab) return;
    cab.classList.toggle("con-sombra", window.scrollY > 8);
    if (reducir) return;
    cab.classList.add("sonando");
    clearTimeout(quieto);
    quieto = setTimeout(function () { cab.classList.remove("sonando"); }, 220);
  }, { passive: true });

  /* 3) Menú del celular */
  var btnMenu = $(".cab-menu"), menu = $("#menu-movil");
  function abrirMenu(si) {
    if (!menu || !btnMenu) return;
    // el panel empieza debajo de la cabecera (arriba puede estar la barra del dueño)
    if (si && cab) menu.style.paddingTop = Math.round(cab.getBoundingClientRect().bottom + 16) + "px";
    menu.hidden = !si;
    btnMenu.setAttribute("aria-expanded", si ? "true" : "false");
    btnMenu.lastChild.textContent = si ? "Cerrar" : "Menú";
    document.documentElement.classList.toggle("menu-abierto", si);
    if (si) { var a = $("a", menu); if (a) a.focus({ preventScroll: true }); }
  }
  if (btnMenu && menu) {
    btnMenu.addEventListener("click", function () { abrirMenu(menu.hidden); });
    menu.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("a")) abrirMenu(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { abrirMenu(false); btnMenu.focus(); } });
  }

  /* 4) Barra del celular: escondida solo mientras se ve el botón del héroe (no se duplica la acción) */
  var barra = $("#barra-movil");
  if (barra && cta && "IntersectionObserver" in window) {
    // «se ve» = al menos 60 % del botón en pantalla: si apenas asoma abajo, la barra sigue a la vista
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { barra.classList.toggle("oculta", e.isIntersecting && e.intersectionRatio >= 0.6); });
    }, { threshold: [0, 0.6, 1] }).observe(cta);
  }

  /* 5) Clase de prueba: arma el mensaje y el enlace de WhatsApp mientras se elige */
  var form = $("#form-prueba"), globo = $("#vista-globo"), enviar = $("#prueba-enviar");
  function valor(nombre) { var r = form && form.querySelector('input[name="' + nombre + '"]:checked'); return r ? r.value : ""; }
  function armar() {
    if (!form || !globo || !enviar) return;
    var cur = valor("f-curso"), msg;
    if (cur === "no-se" && datos.noSe) msg = datos.noSe;
    else if (cur && datos.cursos[cur]) msg = datos.pruebaCurso.replace("{de}", datos.cursos[cur].de);
    else msg = datos.prueba;
    var edadEl = form.querySelector("#f-edad"), nombreEl = form.querySelector("#f-nombre");
    var edad = String(edadEl && edadEl.value || "").replace(/\D/g, "").slice(0, 2);
    var nombre = String(nombreEl && nombreEl.value || "").replace(/\s+/g, " ").trim().slice(0, 40);
    var modo = [valor("f-modalidad"), valor("f-tipo")].filter(Boolean).map(function (x) { return x.toLowerCase(); }).join(", ");
    var L = datos.lineas || {}, lineas = [];
    if (edad && +edad > 0) lineas.push((edad === "1" ? L.edadUno || "Edad del alumno: {n} año" : L.edad || "Edad del alumno: {n} años").replace("{n}", edad));
    if (modo) lineas.push((L.modalidad || "Modalidad: {x}").replace("{x}", modo));
    if (nombre) lineas.push((L.nombre || "Mi nombre es {x}.").replace("{x}", nombre));
    var texto = datos.saludo + msg + (lineas.length ? "\n" + lineas.join("\n") : "");
    globo.textContent = texto;
    enviar.href = "https://wa.me/" + datos.numero + "?text=" + encodeURIComponent(texto);
  }
  if (form) {
    form.addEventListener("input", armar);
    form.addEventListener("change", function (e) {
      if (e.target && e.target.name === "f-curso") tocoFormulario = true;
      armar();
      if (e.target && e.target.type === "radio") reiniciar(globo, "pulso");
    });
    form.addEventListener("submit", function (e) { e.preventDefault(); if (enviar) enviar.click(); });
    armar();
  }

  /* 6) Horario: «Abierto ahora» con la hora de Lima (no la del teléfono de quien mira) */
  var estado = $("#estado-horario"), h = datos.horario;
  if (estado && h && window.Intl) {
    try {
      var partes = new Intl.DateTimeFormat("en-US", { timeZone: "America/Lima", weekday: "short", hour: "numeric", hourCycle: "h23" }).formatToParts(new Date());
      var dia = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[(partes.filter(function (p) { return p.type === "weekday"; })[0] || {}).value];
      var hora = +((partes.filter(function (p) { return p.type === "hour"; })[0] || {}).value) % 24;
      var fmt = function (x) { return (x % 12 || 12) + (x < 12 ? " a. m." : " p. m."); }; // «7 p. m.» nunca se parte
      var abreHoy = h.diasAbiertos.indexOf(dia) >= 0;
      var A = datos.avisos || {};
      var nombres = A.dias || ["el domingo", "el lunes", "el martes", "el miércoles", "el jueves", "el viernes", "el sábado"];
      if (abreHoy && hora >= h.abre && hora < h.cierra) {
        estado.textContent = (A.abierto || "Abierto ahora · hasta las {h}").replace("{h}", fmt(h.cierra));
        estado.classList.add("abierto");
      } else {
        var cuando;
        if (abreHoy && hora < h.abre) cuando = A.hoy || "hoy";
        else { for (var i = 1; i <= 7; i++) { if (h.diasAbiertos.indexOf((dia + i) % 7) >= 0) { cuando = i === 1 ? A.manana || "mañana" : nombres[(dia + i) % 7]; break; } } }
        estado.textContent = (A.cerrado || "Cerrado ahora · abre {cuando} a las {h}").replace("{cuando}", cuando).replace("{h}", fmt(h.abre));
      }
      estado.hidden = false;
    } catch (e) { /* sin aviso: queda el horario escrito */ }
  }

  /* 7) «¿Para quién?»: las barras se llenan como un medidor de nivel al entrar en pantalla */
  if (!reducir && "IntersectionObserver" in window) {
    var barras = $$(".pq");
    barras.forEach(function (b) { b.classList.add("por-llenar"); });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("lleno"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    barras.forEach(function (b) { io.observe(b); });
  }
})();
