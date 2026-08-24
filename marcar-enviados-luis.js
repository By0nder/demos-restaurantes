/**
 * Marca como "Enviado" todo lo que Luis ya tenía en su panel al 2026-08-23.
 *
 * El panel guarda ese estado en el localStorage del navegador de cada vendedor
 * ("outreach-sent-luis-v1"), no en el HTML, así que no se puede cambiar
 * simplemente editando el marcado desde acá. Lo que se hace es sembrarlo: se
 * incrusta la lista de los slugs que existen HOY y un bloque que, la primera
 * vez que Luis abra el panel, los da por contactados.
 *
 * Va con lista explícita y no con "todas las tarjetas presentes" a propósito:
 * cuando se le agreguen los prospectos nuevos, esos NO deben quedar marcados.
 * Si la siembra fuera dinámica y Luis abriera el panel recién después de la
 * carga, se marcaría todo, incluido lo que no ha tocado.
 *
 * Corre una sola vez por navegador. Lo que Luis haga después manda: si
 * desmarca algo, queda desmarcado.
 */
const fs = require("fs");
const path = require("path");

const PANEL = path.join(__dirname, "luis-7d0c90", "index.html");
const CLAVE_SEMILLA = "outreach-seed-luis-2026-08-23";

let h = fs.readFileSync(PANEL, "utf8");

if (h.includes(CLAVE_SEMILLA)) {
  console.log("El panel ya trae la siembra del 2026-08-23. No se toca.");
  process.exit(0);
}

/* Los slugs salen de las casillas, que son las que llevan el estado. */
const slugs = [...h.matchAll(/class="sent-checkbox" data-slug="([^"]+)"/g)].map((m) => m[1]);
const unicos = [...new Set(slugs)];
if (!slugs.length) throw new Error("no se encontró ninguna casilla en el panel");
if (unicos.length !== slugs.length) {
  console.log(`Aviso: ${slugs.length - unicos.length} slug(s) repetidos en el panel.`);
}

const ancla = "    var state = load();";
if (!h.includes(ancla)) throw new Error("no se ubicó donde insertar la siembra");

const semilla = `${ancla}

    /* Reparto del 2026-08-23: los ${unicos.length} prospectos que Luis ya tenía
       se dan por contactados. Lista fija a propósito — lo que se cargue
       después debe aparecer sin enviar. Corre una sola vez por navegador. */
    var SEMILLA_KEY = "${CLAVE_SEMILLA}";
    var YA_CONTACTADOS = ${JSON.stringify(unicos)};
    if (!localStorage.getItem(SEMILLA_KEY)) {
      YA_CONTACTADOS.forEach(function (s) { state[s] = true; });
      save(state);
      localStorage.setItem(SEMILLA_KEY, "1");
    }`;

h = h.replace(ancla, semilla);
fs.writeFileSync(PANEL, h, "utf8");

console.log(`Sembrados ${unicos.length} prospectos como enviados en el panel de Luis.`);
console.log(`  clave: ${CLAVE_SEMILLA}`);
console.log(`  panel: ${(fs.statSync(PANEL).size / 1024).toFixed(0)} KB`);
