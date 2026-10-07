// Interacciones del sitio generado: menú móvil + animaciones de scroll.

/* ---------------------------------------------------------------------------
   ¿ABIERTO AHORA?
   Lee el horario tal como está escrito en la página ("Lun–Dom 12:00 pm – 10:00
   pm", "Lunes a Sábado de 9:00 a 18:00") y responde si el negocio está abierto
   en este momento, con la hora del celular de quien mira.
   Si el texto no se puede interpretar devuelve null y no se muestra nada:
   equivocarse diciendo "cerrado" le cuesta un cliente al dueño.

   Reescrito el 2026-09-08 (auditoría de ANKA). La versión anterior leía SOLO
   las dos primeras horas y el primer rango de días de todo el texto, así que
   con "Lun a Vie 8:00 am - 6:00 pm (refrigerio 1:00 a 2:00 pm) · Sáb 8:00 am -
   1:00 pm · Dom cerrado" el sábado a las 10 de la mañana la portada decía
   "Cerrado" en rojo con el taller abierto. Ahora se parte el texto en tramos
   ("·", "|", ";"), cada tramo lleva sus días y sus rangos de horas, el
   paréntesis de refrigerio parte el tramo en dos, y "cerrado" cierra el día.
   Regla de oro: si algún tramo no se entiende, se devuelve null y no se pinta
   nada — antes que arriesgarse a decir "Cerrado" cuando está abierto.

   Repasado el mismo día tras la revisión adversarial. Cuatro cosas más: los
   separadores de rango raros (− ‐ ‑ y la barra) ya cuentan como guion, la lista
   de días conoce las abreviaturas que la gente escribe de verdad ("Mier",
   "Juev"), los días se buscan en TODO el tramo (los había que los ponen después
   de la hora, y ese tramo se quedaba sin días, o sea abierto los siete) y la
   regla de oro ahora vale en los dos sentidos: un tramo ilegible tapaba el
   "Cerrado" pero dejaba pasar el "Abierto", que es el error que hace que el
   cliente llegue a la puerta cerrada.
--------------------------------------------------------------------------- */

// Palabra completa -> día de la semana (0 = domingo, como Date#getDay).
// Se compara la palabra ENTERA a propósito: "domicilio" empieza con "dom" y con
// la comparación por prefijo un "delivery a domicilio" se leía como domingo.
// Por eso hay que listar UNA POR UNA las abreviaturas que la gente escribe de
// verdad ("Mier", "Juev", "Sabad"): con la lista corta, "Lun, Mier, Juev" se leía
// como si solo abriera el lunes y el sello decía "Cerrado" un miércoles a las 10.
// Los nombres en inglés van por lo mismo: sin ellos "Mon-Fri" se queda sin días y
// el tramo pasa a valer para los siete, que es el error caro (dice "Abierto ahora"
// con el negocio cerrado). Ninguna de estas palabras es palabra corriente en un
// horario en castellano, así que no se pisan con nada.
var PALABRAS_DIA = {
  dom: 0, domi: 0, domin: 0, doming: 0, domingo: 0, domingos: 0,
  sun: 0, sund: 0, sunday: 0, sundays: 0,
  lun: 1, lune: 1, lunes: 1,
  mon: 1, mond: 1, monday: 1, mondays: 1,
  mar: 2, mart: 2, marte: 2, martes: 2,
  tue: 2, tues: 2, tuesday: 2, tuesdays: 2,
  mie: 3, mier: 3, mierc: 3, mierco: 3, miercol: 3, miercole: 3, miercoles: 3,
  wed: 3, weds: 3, wednesday: 3, wednesdays: 3,
  jue: 4, juev: 4, jueve: 4, jueves: 4,
  thu: 4, thur: 4, thurs: 4, thursday: 4, thursdays: 4,
  vie: 5, vier: 5, viern: 5, vierne: 5, viernes: 5,
  fri: 5, frid: 5, friday: 5, fridays: 5,
  sab: 6, saba: 6, sabad: 6, sabado: 6, sabados: 6,
  sat: 6, satur: 6, saturday: 6, saturdays: 6
};

function normalizar(texto) {
  return (
    String(texto == null ? "" : texto)
      .toLowerCase()
      // "9:00 a. m." (así lo escribe Google Maps) ANTES de borrar los puntos: si
      // no, queda "9:00 a m", la hora pierde el meridiano y "9:00 a m - 6:00 p m"
      // se lee como un turno que cruza la medianoche (abierto a las 3 de la
      // madrugada). Es el error caro, así que se arregla en el origen.
      .replace(/\b([ap])\.\s*m\b\.?/g, "$1m")
      // Todos los guiones que existen, no solo el corto y el largo: el signo
      // menos (−), los guiones de Unicode (‐ ‑ ‒) y la raya (―) llegan pegados
      // desde Word y desde las fichas de directorios. Si uno no se convierte en
      // "-", "lun−vie" deja de ser un rango, se lee como dos días sueltos y el
      // sello dice "Cerrado" un miércoles con el negocio abierto. Van escritos
      // con \u… y no con el carácter: el regex tiene que funcionar aunque el
      // archivo se sirva con otra codificación.
      .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, "-")
      .replace(/\./g, "")
  );
}

// Los horarios llegan escritos de las dos formas ("Sáb" y "Sab", "Mié" y "Mie"),
// así que para reconocer días se compara siempre sin tildes.
function sinTildes(texto) {
  return texto
    .replace(/á/g, "a")
    .replace(/é/g, "e")
    .replace(/í/g, "i")
    .replace(/ó/g, "o")
    .replace(/ú/g, "u");
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

/**
 * Días de los que habla un tramo: rango ("lun a vie", "mié-lun", que da la
 * vuelta a la semana) o días sueltos ("sáb", "dom cerrado").
 * null = no hay días escritos, así que el tramo vale para todos los días
 * (es el caso de las miles de demos con "12:00 a 22:00" a secas).
 */
function diasQueAbre(texto) {
  var t = sinTildes(normalizar(texto));

  // Rango. Se recorren todas las parejas "palabra + conector + palabra" y se
  // toma la primera en la que AMBAS son días: así "abierto a diario" o
  // "atención a domicilio" no se cuelan como rango.
  // La barra ("lun/sab") va como conector porque en las fichas de directorios es
  // tan común como el guion; no se convierte a "-" en normalizar() para no tocar
  // cosas como "24/7". Como se exige que las DOS palabras sean días, ninguna
  // frase suelta puede colarse por acá.
  var re = /([a-z]+)\s*(?:-|\/|\ba\b|\bal\b|\bhasta\b)\s*([a-z]+)/g;
  var m;
  while ((m = re.exec(t)) !== null) {
    var desde = PALABRAS_DIA[m[1]];
    var hasta = PALABRAS_DIA[m[2]];
    if (desde === undefined || hasta === undefined) continue;
    var dias = [];
    for (var i = 0, d = desde; i < 7; i++) {
      dias.push(d);
      if (d === hasta) break;
      d = (d + 1) % 7;
    }
    return dias;
  }

  // Días sueltos o lista: "sáb", "dom cerrado", "lun, mié y vie".
  var sueltos = [];
  var palabras = t.match(/[a-z]+/g) || [];
  for (var j = 0; j < palabras.length; j++) {
    var n = PALABRAS_DIA[palabras[j]];
    if (n !== undefined && sueltos.indexOf(n) === -1) sueltos.push(n);
  }
  return sueltos.length ? sueltos : null; // sin días escritos: se asume que abre hoy
}

/** Todas las horas de un texto, en orden: {h, m, suf}. */
function leerHoras(texto) {
  var re = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/g;
  var lista = [];
  var m;
  while ((m = re.exec(texto)) !== null) {
    lista.push({ h: m[1], m: m[2], suf: m[3] || null });
  }
  return lista;
}

/**
 * Une dos horas en un rango [abre, cierra] en minutos.
 * "12:00–4:30 pm": la apertura viene sin am/pm y hereda el sufijo del cierre.
 * Si al heredarlo el rango queda al revés ("10:00 – 5:00 pm"), se deja la
 * lectura de 24 h, que es la única con sentido.
 */
function armarRango(a, b) {
  var ini = aMinutos(a.h, a.m, a.suf);
  var fin = aMinutos(b.h, b.m, b.suf);
  if (ini === null || fin === null) return null;
  if (!a.suf && b.suf) {
    var heredado = aMinutos(a.h, a.m, b.suf);
    if (heredado !== null && heredado < fin) ini = heredado;
  }
  return [ini, fin];
}

/**
 * Empareja las horas de a dos: "12:00–4:30 pm y 6:00–11:00 pm" son dos rangos.
 * Si queda una hora suelta ("desde las 12:00 pm") no hay forma honesta de saber
 * cuándo cierra: se devuelve null y el sello no se pinta.
 */
function armarRangos(horas) {
  if (!horas.length || horas.length % 2 !== 0) return null;
  var rangos = [];
  for (var i = 0; i < horas.length; i += 2) {
    var r = armarRango(horas[i], horas[i + 1]);
    if (!r) return null;
    rangos.push(r);
  }
  return rangos;
}

/** El paréntesis "(refrigerio 1:00 a 2:00 pm)" como rango, si es que lo es. */
function leerReceso(texto) {
  var par = texto.match(/\(([^)]*)\)/);
  if (!par || !/refrigerio|receso|almuerzo|descanso|break/.test(par[1])) return null;
  var rangos = armarRangos(leerHoras(par[1]));
  return rangos && rangos.length === 1 ? rangos[0] : null;
}

/** Parte "8:00 - 18:00" con receso 13:00-14:00 en "8-13" y "14-18". */
function partirPorReceso(rangos, receso) {
  var salida = [];
  for (var i = 0; i < rangos.length; i++) {
    var r = rangos[i];
    if (receso[0] < receso[1] && receso[0] > r[0] && receso[1] < r[1]) {
      salida.push([r[0], receso[0]]);
      salida.push([receso[1], r[1]]);
    } else {
      salida.push(r); // el receso no cae dentro: mejor dejar el tramo entero
    }
  }
  return salida;
}

/**
 * Un tramo ("Sáb 8:00 am - 1:00 pm") -> {dias, rangos}. rangos vacío = cerrado
 * ese día. null = no se entendió.
 */
function leerTramo(tramo) {
  var t = sinTildes(normalizar(tramo));
  var receso = leerReceso(t);
  t = t.replace(/\([^)]*\)/g, " "); // el paréntesis ya se usó; fuera del resto
  var cerrado = /cerrad/.test(t);

  // Los días se buscan en TODO el tramo, no solo antes de la primera cifra: hay
  // fichas que los escriben al final ("De 8:00 am a 5:00 pm, lunes a sábado") y
  // con la búsqueda por prefijo ese tramo se quedaba sin días, lo que equivale a
  // "abre los siete" — el sello decía "Abierto ahora" un domingo con el negocio
  // cerrado. Mirar el tramo entero es seguro porque los días se comparan como
  // palabra completa: "domicilio" o "diario" no son días.
  var corte = t.search(/\d/);
  var dias = diasQueAbre(t);

  var rangos = corte === -1 ? null : armarRangos(leerHoras(t.slice(corte)));
  if (!rangos) return cerrado ? { dias: dias, rangos: [] } : null;
  return { dias: dias, rangos: receso ? partirPorReceso(rangos, receso) : rangos };
}

/** ¿La hora de ahora cae dentro de este rango, en un día que abre? */
function dentroDelRango(rango, dias, hoy, ayer, minutosAhora) {
  var abre = rango[0];
  var cierra = rango[1];
  if (cierra === 0) cierra = 24 * 60; // "12:00 am" de cierre es medianoche
  // Horario que cruza la medianoche (abre 8pm, cierra 2am): antes de la hora de
  // cierre seguimos dentro del turno que empezó AYER; después, solo cuenta si
  // hoy abre y ya pasó la hora de apertura.
  if (cierra <= abre) {
    if (minutosAhora < cierra) return !dias || dias.indexOf(ayer) !== -1;
    return (!dias || dias.indexOf(hoy) !== -1) && minutosAhora >= abre;
  }
  return (!dias || dias.indexOf(hoy) !== -1) && minutosAhora >= abre && minutosAhora < cierra;
}

function estadoHorario(textoOriginal, ahora) {
  var texto = normalizar(textoOriginal);
  var tramos = texto.split(/\s*[·•|;]\s*/);
  var hoy = ahora.getDay();
  var ayer = (hoy + 6) % 7;
  var minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
  var leidos = 0;
  var dudoso = false;
  var abierto = false;

  for (var i = 0; i < tramos.length; i++) {
    if (!/[a-z0-9]/.test(sinTildes(tramos[i]))) continue; // separador suelto
    var info = leerTramo(tramos[i]);
    if (!info) {
      dudoso = true; // un tramo ilegible puede ser justo el de hoy
      continue;
    }
    leidos++;
    for (var j = 0; j < info.rangos.length; j++) {
      if (dentroDelRango(info.rangos[j], info.dias, hoy, ayer, minutosAhora)) {
        abierto = true; // se anota y se sigue: falta ver si algún tramo no se entendió
        break;
      }
    }
  }

  // El sello solo se pinta cuando TODO el horario se entendió, y esto vale en
  // los DOS sentidos. Antes el "abierto" salía desde dentro del bucle, así que un
  // tramo ilegible ("Lun-Vie 9:00-18:00 · feriados consultar") tapaba el
  // "Cerrado" pero no el "Abierto": justo al revés de lo que conviene, porque el
  // cliente que llega a puerta cerrada por creerle a la web no vuelve.
  if (!leidos || dudoso) return null;
  return { abierto: abierto };
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
  // El botón nace con aria-expanded="false" (header.ejs). Si no se actualiza al
  // abrir, el lector de pantalla anuncia "contraído" con el menú desplegado y
  // el usuario ciego no sabe si su toque hizo algo. El aria-label solo se toca
  // si el botón ya trae uno (es un botón de solo icono).
  const toggle = document.getElementById("menu-toggle");
  const mobileMenu = document.getElementById("mobile-menu");
  if (toggle && mobileMenu) {
    const sincronizar = () => {
      const abierto = !mobileMenu.classList.contains("hidden");
      toggle.setAttribute("aria-expanded", abierto ? "true" : "false");
      if (toggle.hasAttribute("aria-label")) {
        toggle.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
      }
    };
    toggle.addEventListener("click", () => {
      mobileMenu.classList.toggle("hidden");
      sincronizar();
    });
    mobileMenu.querySelectorAll("a").forEach((link) =>
      link.addEventListener("click", () => {
        mobileMenu.classList.add("hidden");
        sincronizar();
      })
    );
    sincronizar(); // por si el HTML llega con el menú ya abierto
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
      // 0.05: con 0.15 las secciones aparecían "tarde" al bajar rápido.
      { threshold: 0.05 }
    );
    revealElements.forEach((el) => observer.observe(el));
    // Red de seguridad: pase lo que pase, nada se queda invisible.
    setTimeout(() => revealElements.forEach((el) => el.classList.add("visible")), 1200);
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
