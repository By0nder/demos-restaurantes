// Interacciones del sitio generado: menú móvil + animaciones de scroll.

/* ---------------------------------------------------------------------------
   ¿ABIERTO AHORA?
   Lee el horario tal como está escrito en la página ("Lun–Dom 12:00 pm – 10:00
   pm", "Lunes a Sábado de 9:00 a 18:00") y responde si el negocio está abierto
   en este momento, con la hora del celular de quien mira.
   Si el texto no se puede interpretar devuelve null y no se muestra nada:
   equivocarse diciendo "cerrado" le cuesta un cliente al dueño.
--------------------------------------------------------------------------- */
var DIAS = { dom: 0, lun: 1, mar: 2, mie: 3, "mié": 3, jue: 4, vie: 5, sab: 6, "sáb": 6 };

function normalizar(texto) {
  return texto.toLowerCase().replace(/[–—]/g, "-").replace(/\./g, "");
}

/** "9:30 pm" -> minutos desde medianoche. Devuelve null si no entiende. */
function aMinutos(hora, minuto, sufijo) {
  var h = parseInt(hora, 10);
  var m = minuto ? parseInt(minuto, 10) : 0;
  if (isNaN(h) || h > 24 || m > 59) return null;
  if (sufijo === "pm" && h < 12) h += 12;
  if (sufijo === "am" && h === 12) h = 0;
  return h * 60 + m;
}

function diasQueAbre(texto) {
  // "lun-dom", "lunes a sabado", "l-s"
  var rango = texto.match(/(dom|lun|mar|mie|mié|jue|vie|sab|sáb)[a-z]*\s*(?:-|a)\s*(dom|lun|mar|mie|mié|jue|vie|sab|sáb)[a-z]*/);
  if (!rango) return null; // sin días escritos: se asume que abre hoy
  var desde = DIAS[rango[1]];
  var hasta = DIAS[rango[2]];
  if (desde === undefined || hasta === undefined) return null;
  var dias = [];
  for (var i = 0, d = desde; i < 7; i++) {
    dias.push(d);
    if (d === hasta) break;
    d = (d + 1) % 7;
  }
  return dias;
}

function estadoHorario(textoOriginal, ahora) {
  var texto = normalizar(textoOriginal);
  var horas = texto.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/g);
  if (!horas || horas.length < 2) return null;

  var partes = [];
  var re = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/g;
  var m;
  while ((m = re.exec(texto)) !== null && partes.length < 2) {
    partes.push(aMinutos(m[1], m[2], m[3]));
  }
  if (partes.length < 2 || partes[0] === null || partes[1] === null) return null;

  var abre = partes[0];
  var cierra = partes[1];
  if (cierra === 0) cierra = 24 * 60; // "12:00 am" de cierre es medianoche
  var cruzaMedianoche = cierra <= abre;

  var dias = diasQueAbre(texto);
  var minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
  var hoy = ahora.getDay();
  var ayer = (hoy + 6) % 7;

  // Horario que cruza la medianoche (abre 8pm, cierra 2am): antes de la hora de
  // cierre seguimos dentro del turno que empezó AYER; después, solo cuenta si
  // hoy abre y ya pasó la hora de apertura.
  if (cruzaMedianoche) {
    if (minutosAhora < cierra % (24 * 60)) {
      return { abierto: !dias || dias.indexOf(ayer) !== -1 };
    }
    return { abierto: (!dias || dias.indexOf(hoy) !== -1) && minutosAhora >= abre };
  }

  var abreHoy = !dias || dias.indexOf(hoy) !== -1;
  return { abierto: abreHoy && minutosAhora >= abre && minutosAhora < cierra };
}

document.addEventListener("DOMContentLoaded", () => {
  // --- Modo claro / oscuro ---
  // El tema ya se aplicó en el <head> para que no haya fogonazo; aquí solo va
  // el botón, que además recuerda la elección para la próxima visita.
  const btnTema = document.getElementById("tema-toggle");
  if (btnTema) {
    const luna = btnTema.querySelector('[data-icono="luna"]');
    const sol = btnTema.querySelector('[data-icono="sol"]');
    const esOscuro = () => document.documentElement.getAttribute("data-tema") === "oscuro";
    const pintarIcono = () => {
      // Se muestra el icono de lo que se va a activar al tocarlo, no el del
      // estado actual: en modo oscuro se ve el sol, que es lo que ofrece.
      if (luna) luna.classList.toggle("hidden", esOscuro());
      if (sol) sol.classList.toggle("hidden", !esOscuro());
    };
    pintarIcono();
    btnTema.addEventListener("click", () => {
      const oscuro = esOscuro();
      if (oscuro) document.documentElement.removeAttribute("data-tema");
      else document.documentElement.setAttribute("data-tema", "oscuro");
      try {
        localStorage.setItem("tema", oscuro ? "claro" : "oscuro");
      } catch (e) {}
      pintarIcono();
    });
  }

  // --- Sello de "abierto ahora" ---
  document.querySelectorAll("[data-estado-horario]").forEach((nodo) => {
    const estado = estadoHorario(nodo.getAttribute("data-estado-horario"), new Date());
    if (!estado) return;
    nodo.className = "ml-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-sm font-semibold align-middle";
    nodo.innerHTML =
      '<span class="punto-abierto inline-block h-2 w-2 rounded-full" style="background:' +
      (estado.abierto ? "#22c55e" : "#f87171") +
      '"></span>' +
      (estado.abierto ? "Abierto ahora" : "Cerrado");
  });

  // --- Menú móvil ---
  const toggle = document.getElementById("menu-toggle");
  const mobileMenu = document.getElementById("mobile-menu");
  if (toggle && mobileMenu) {
    toggle.addEventListener("click", () => mobileMenu.classList.toggle("hidden"));
    mobileMenu.querySelectorAll("a").forEach((link) =>
      link.addEventListener("click", () => mobileMenu.classList.add("hidden"))
    );
  }

  // --- Animación de aparición al hacer scroll ---
  const revealElements = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealElements.forEach((el) => observer.observe(el));
    // Red de seguridad: pase lo que pase, nada se queda invisible.
    setTimeout(() => revealElements.forEach((el) => el.classList.add("visible")), 2500);
    // Red de seguridad: pase lo que pase, nada se queda invisible.
    setTimeout(() => revealElements.forEach((el) => el.classList.add("visible")), 2500);
  } else {
    revealElements.forEach((el) => el.classList.add("visible"));
  }
});

/* ---------------------------------------------------------------------------
   CARTA EN ACORDEÓN: abrir la categoría a la que apunta el ancla (2026-09-01)
   Los chips del índice enlazan a un <details> cerrado. El navegador salta al
   sitio, pero la pestaña sigue cerrada y el visitante ve solo el título: cree
   que el chip no hizo nada. Aquí se abre y se vuelve a alinear (el salto pasó
   antes de que existiera el contenido). Cubre también llegar con el ancla en
   la URL, como un QR o un link compartido a #carta-postres.
   Los ids son slugs ASCII, así que el hash se lee tal cual, sin decodificar.
--------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  if (!document.querySelector(".categoria")) return; // demos sin la feature: no corre
  const abrirCategoria = () => {
    const cat = document.getElementById(location.hash.slice(1));
    if (!cat || !cat.classList.contains("categoria") || cat.open) return;
    cat.open = true;
    cat.scrollIntoView({ block: "start" });
  };
  window.addEventListener("hashchange", abrirCategoria);
  abrirCategoria();
});
