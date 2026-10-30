/* ==========================================================================
   DISEÑO NUEVO DE LAS DEMOS (v2, oct-2026) — JS del sitio, sin dependencias.
   Tres cosas: el menú del celular, el sello "Abierto ahora / Cerrado" y el
   cotizador que arma el mensaje y abre WhatsApp (no envía nada a un servidor).
   La lectura del horario es la MISMA de assets/main.js (copiada tal cual, con
   sus reglas: si algo no se entiende, no se pinta nada).
   ========================================================================== */
(function () {
"use strict";

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

function alCargar(fn) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
  else fn();
}

alCargar(function () {
  // --- Menú del celular ---------------------------------------------------
  var boton = document.querySelector(".menu-boton");
  var nav = document.getElementById("nav-principal");
  if (boton && nav) {
    var cerrar = function () {
      nav.classList.remove("abierta");
      boton.setAttribute("aria-expanded", "false");
      boton.setAttribute("aria-label", "Abrir menú");
    };
    boton.addEventListener("click", function () {
      var abierta = nav.classList.toggle("abierta");
      boton.setAttribute("aria-expanded", abierta ? "true" : "false");
      boton.setAttribute("aria-label", abierta ? "Cerrar menú" : "Abrir menú");
    });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) cerrar(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("abierta")) { cerrar(); boton.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (nav.classList.contains("abierta") && !e.target.closest(".cabecera")) cerrar();
    });
  }

  // --- Sello "Abierto ahora / Cerrado" ----------------------------------------
  var sellos = document.querySelectorAll("[data-estado-horario]");
  for (var s = 0; s < sellos.length; s++) {
    var nodo = sellos[s];
    var estado = estadoHorario(nodo.getAttribute("data-estado-horario"), new Date());
    if (!estado) continue;
    nodo.classList.add(estado.abierto ? "abierto" : "cerrado");
    var punto = document.createElement("span");
    punto.className = "punto";
    punto.setAttribute("aria-hidden", "true");
    nodo.appendChild(punto);
    nodo.appendChild(document.createTextNode(estado.abierto ? "Abierto ahora" : "Cerrado"));
  }

  // --- Lista en acordeón: el chip del índice abre su categoría --------------------
  // (copia de assets/main.js): el navegador salta al <details> pero lo deja
  // cerrado y el visitante cree que el chip no hizo nada. Cubre también llegar
  // con el ancla en la URL (#catalogo-laboratorio-sangre). Los ids son ASCII.
  if (document.querySelector("details.categoria")) {
    var abrirCategoria = function () {
      var cat = document.getElementById(location.hash.slice(1));
      if (!cat || !cat.classList.contains("categoria") || cat.open) return;
      cat.open = true;
      cat.scrollIntoView({ block: "start" });
    };
    window.addEventListener("hashchange", abrirCategoria);
    abrirCategoria();
  }

  // --- Cotizador -------------------------------------------------------------
  var form = document.querySelector("form[data-cotizador]");
  if (form) {
    var aviso = document.getElementById("cot-error");
    var campos = form.querySelectorAll("input, select, textarea");
    for (var c = 0; c < campos.length; c++) campos[c]._describeBase = campos[c].getAttribute("aria-describedby") || "";
    var marcar = function (campo, falta) {
      if (falta) {
        campo.setAttribute("aria-invalid", "true");
        campo.setAttribute("aria-describedby", ("cot-error " + campo._describeBase).trim());
        return;
      }
      campo.removeAttribute("aria-invalid");
      if (campo._describeBase) campo.setAttribute("aria-describedby", campo._describeBase);
      else campo.removeAttribute("aria-describedby");
    };
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var faltan = [], lineas = [], primero = null;
      for (var i = 0; i < campos.length; i++) {
        var campo = campos[i];
        var valor = String(campo.value || "").trim();
        var etiqueta = campo.getAttribute("data-etiqueta") || campo.name;
        if (campo.hasAttribute("data-requerido") && !valor) {
          faltan.push(etiqueta);
          marcar(campo, true);
          if (!primero) primero = campo;
          continue;
        }
        marcar(campo, false);
        // En el mensaje, el rótulo corto ("Problema: …"); en el aviso de error, la pregunta tal como se ve.
        if (valor) lineas.push("• " + (campo.getAttribute("data-corto") || etiqueta) + ": " + valor);
      }
      if (faltan.length) {
        // La región viva está siempre en la página (vacía no se ve): solo se escribe.
        aviso.textContent = "Nos falta: " + faltan.join(", ") + ".";
        if (primero) primero.focus();
        return;
      }
      aviso.textContent = "";
      var texto = form.getAttribute("data-encabezado") + "\n\n" + lineas.join("\n") + (form.getAttribute("data-marca") || "");
      window.open("https://wa.me/" + form.getAttribute("data-wsp") + "?text=" + encodeURIComponent(texto), "_blank", "noopener");
    });
  }
});
})();
