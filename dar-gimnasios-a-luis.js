/**
 * Pasa a Luis el bloque de gimnasios #503–993 del panel de José.
 *
 * El panel de José no se toca: esto solo AGREGA a Luis. Dos cosas que no son
 * copiar y pegar:
 *
 *   1. Los mensajes de José van firmados por él y dicen que es estudiante de
 *      San Marcos. El panel de Luis usa otra voz ("Soy Luis, hago páginas web
 *      para negocios", sin lo de estudiante). Así que el mensaje se vuelve a
 *      redactar con las plantillas que ya usa el panel de Luis — sacadas de
 *      su propio panel, no inventadas.
 *   2. Nueve de esos gimnasios YA estaban en el panel de Luis. Se saltan: si
 *      se duplicaran, la misma persona le escribiría dos veces al mismo local.
 *
 * La variante de mensaje se elige por hash del slug, para que sea estable:
 * volver a correr esto no reescribe mensajes ya repartidos.
 */
const fs = require("fs");
const path = require("path");

const PANEL_JOSE = "C:/Users/adriana/.claude/projects/C--Users-adriana/ddefaaf2-c4d3-45fa-b6d0-99f214d1e882/tool-results/artifact-d3fe5ccd-1786508087-c7fa.html";
const PANEL_LUIS = path.join(__dirname, "luis-7d0c90", "index.html");
const DESDE = 503;
const HASTA = 993;
const RUBRO = "Gimnasio";
const BASE_DEMO = "https://by0nder.github.io/demos-restaurantes/";

/* ---------- las 4 variantes, tal como ya salen en el panel de Luis ---------- */
const VARIANTES = [
  ({ nombre, ciudad, url }) =>
    `Buenas. Vi ${nombre}, en ${ciudad}.\n\n` +
    `Cuando alguien busca un gimnasio en ${ciudad} no los encuentra, y ese cliente se va con el de al lado. Les armé una página de muestra con sus datos y ya está funcionando:\n${url}\n\n` +
    `Se abre del celular en un minuto. Lleva sus servicios, su ubicación y un botón para que les escriban directo por WhatsApp.\n\n` +
    `Soy Luis, hago páginas web para negocios. Como ya está hecha y usted trata conmigo directo, cuesta bastante menos que una agencia.\n\n` +
    `¿Hablo con el dueño de ${nombre}?`,

  ({ nombre, ciudad, url }) =>
    `Buenas. Vi ${nombre}, en ${ciudad}.\n\n` +
    `El que ya los conoce los ubica. El que no, busca un gimnasio en ${ciudad} y llega a otro. Les hice una muestra de cómo se resuelve eso, ya publicada:\n${url}\n\n` +
    `Soy Luis, hago páginas web para negocios. La página ya está hecha, así que no le cobro el trabajo de armarla desde cero.\n\n` +
    `¿Hablo con el dueño de ${nombre}?`,

  ({ nombre, ciudad, url }) =>
    `Buenas. Vi ${nombre}, en ${ciudad}.\n\n` +
    `Hoy el cliente decide en el celular antes de ir. Les armé una muestra de cómo se vería ${nombre} cuando lo buscan, y ya está en línea:\n${url}\n\n` +
    `Soy Luis y hago páginas web para negocios. Trabajo directo, sin agencia de por medio, y por eso el precio es mucho menor.\n\n` +
    `¿Hablo con el dueño de ${nombre}?`,

  ({ nombre, ciudad, url }) =>
    `Buenas. Vi ${nombre}, en ${ciudad}.\n\n` +
    `Les preparé una página de muestra y ya está en línea:\n${url}\n\n` +
    `Ábrala del celular, es un minuto. Tiene sus datos, sus servicios y un botón de WhatsApp para que el cliente le escriba sin buscar el número.\n\n` +
    `Soy Luis y hago páginas web para negocios. No tengo oficina ni intermediarios, por eso sale mucho más barato que con una agencia.\n\n` +
    `¿Hablo con el dueño de ${nombre}?`,
];

const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h; };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ---------- leer el bloque del panel de José ---------- */
const jose = fs.readFileSync(PANEL_JOSE, "utf8");
const luisHtml = fs.readFileSync(PANEL_LUIS, "utf8");

const cards = jose.split('<article class="card').slice(1).map((t) => {
  const msg = decodeURIComponent((t.match(/wa\.me\/\d+\?text=([^"]+)"/) || [])[1] || "");
  return {
    slug: (t.match(/data-slug="([^"]+)"/) || [])[1],
    n: +(t.match(/order-badge">(\d+)</) || [])[1],
    nombre: (t.match(/<h3>([^<]*)<\/h3>/) || [])[1],
    meta: (t.match(/<p class="meta">([^<]*)<\/p>/) || [])[1] || "",
    buscar: (t.match(/data-buscar="([^"]*)"/) || [])[1] || "",
    tel: (t.match(/wa\.me\/(\d+)\?/) || [])[1],
    reseñas: (msg.match(/sus (\d+) rese/) || [])[1],
  };
});

const bloque = cards.filter((c) => c.n >= DESDE && c.n <= HASTA);
if (!bloque.length) throw new Error("no se encontró el bloque " + DESDE + "-" + HASTA);

/* La ciudad viene al final de la dirección; el data-buscar sirve de control. */
const problemas = [];
for (const c of bloque) {
  const partes = c.meta.split(",").map((s) => s.trim()).filter(Boolean);
  c.ciudad = partes[partes.length - 1] || "";
  const esperada = c.buscar
    .replace(c.nombre.toLowerCase(), "")
    .replace(/\s*gimnasio\s*$/, "")
    .trim();
  if (esperada && c.ciudad.toLowerCase() !== esperada) {
    problemas.push(`#${c.n} ${c.nombre}: dirección dice "${c.ciudad}", búsqueda dice "${esperada}"`);
    c.ciudad = esperada.replace(/\b\w/g, (m) => m.toUpperCase());
  }
  if (!c.ciudad) problemas.push(`#${c.n} ${c.nombre}: sin ciudad`);
  if (!c.tel) problemas.push(`#${c.n} ${c.nombre}: sin teléfono`);
  if (c.reseñas) problemas.push(`#${c.n} ${c.nombre}: tiene reseñas y las variantes elegidas no las usan`);
}

/* ---------- lo que Luis ya tiene no se duplica ---------- */
const yaTiene = new Set([...luisHtml.matchAll(/class="sent-checkbox" data-slug="([^"]+)"/g)].map((m) => m[1]));
const repetidos = bloque.filter((c) => yaTiene.has(c.slug));
const nuevos = bloque.filter((c) => !yaTiene.has(c.slug));

console.log(`Bloque #${DESDE}–${HASTA} del panel de José : ${bloque.length}`);
console.log(`  ya estaban en el panel de Luis        : ${repetidos.length}  (se saltan)`);
console.log(`  se agregan                            : ${nuevos.length}`);
repetidos.forEach((c) => console.log(`      · #${c.n} ${c.nombre}`));
if (problemas.length) {
  console.log(`\n  ${problemas.length} dato(s) a revisar:`);
  problemas.slice(0, 12).forEach((p) => console.log("      · " + p));
  if (problemas.length > 12) console.log(`      … y ${problemas.length - 12} más`);
}
if (!nuevos.length) { console.log("\nNada que agregar."); process.exit(0); }

/* ---------- armar las tarjetas en el formato del panel de Luis ---------- */
let orden = yaTiene.size;
const porCiudad = new Map();
for (const c of nuevos) {
  if (!porCiudad.has(c.ciudad)) porCiudad.set(c.ciudad, []);
  porCiudad.get(c.ciudad).push(c);
}

const grupos = [...porCiudad.entries()]
  .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
  .map(([ciudad, lista]) => {
    const tarjetas = lista.map((c) => {
      const url = BASE_DEMO + c.slug + "/";
      const texto = VARIANTES[hash(c.slug) % VARIANTES.length]({ nombre: c.nombre, ciudad, url });
      orden++;
      return `      <article class="card" data-slug="${esc(c.slug)}">
        <div class="card-top">
          <span class="order-badge">${orden}</span>
          <div class="card-heading">
            <h3>${esc(c.nombre)}</h3>
            <p class="meta">${esc(ciudad)} · ${RUBRO}</p>
          </div>
          <label class="sent-toggle"><input type="checkbox" class="sent-checkbox" data-slug="${esc(c.slug)}"><span>Enviado</span></label>
        </div>
        <div class="card-actions">
          <a class="btn btn-primary" href="https://wa.me/${c.tel}?text=${encodeURIComponent(texto)}" target="_blank" rel="noopener">Abrir WhatsApp</a>
          <a class="btn btn-ghost" href="${url}" target="_blank" rel="noopener">Ver demo</a>
        </div>
      </article>`;
    }).join("\n");

    return `  <div class="group">
    <h2 class="group-title">${esc(ciudad)} <span class="group-count">${lista.length}</span></h2>
    <div class="cards">
${tarjetas}
    </div>
  </div>`;
  });

const aviso = `  <div class="brief" style="margin-top:38px">
    <h2>Lote nuevo — ${nuevos.length} gimnasios</h2>
    <ul>
      <li>Todo lo de arriba quedó <strong>marcado como enviado</strong>. Lo de acá abajo es lo nuevo: <strong>ninguno ha sido contactado</strong>.</li>
      <li>Son todos <strong>gimnasios</strong>, repartidos en ${porCiudad.size} ciudades. El mensaje ya va con tu nombre; <strong>revísalo y envíalo tú</strong>.</li>
      <li>Como siempre: <strong>20 a 40 al día</strong>, en bloques con pausas. Si ves mensajes con un solo check gris, frena.</li>
    </ul>
  </div>`;

/* ---------- insertar después del último grupo ---------- */
const finUltimaTarjeta = luisHtml.lastIndexOf("</article>");
if (finUltimaTarjeta < 0) throw new Error("no se encontró ninguna tarjeta en el panel de Luis");
const cierraCards = luisHtml.indexOf("</div>", finUltimaTarjeta + 10);
const cierraGrupo = luisHtml.indexOf("</div>", cierraCards + 6);
if (cierraGrupo < 0) throw new Error("no se ubicó el cierre del último grupo");
const corte = cierraGrupo + 6;

let out = luisHtml.slice(0, corte) + "\n\n" + aviso + "\n\n" + grupos.join("\n\n") + luisHtml.slice(corte);

/* ---------- actualizar los conteos del encabezado ---------- */
const totalNuevo = yaTiene.size + nuevos.length;
out = out
  .replace(/<title>Envíos de Luis — \d+ prospectos<\/title>/, `<title>Envíos de Luis — ${totalNuevo} prospectos</title>`)
  .replace(/<h1>Envíos de Luis — \d+ prospectos<\/h1>/, `<h1>Envíos de Luis — ${totalNuevo} prospectos</h1>`)
  .replace(/(id="progressLabel">)0\/\d+ contactados</, `$10/${totalNuevo} contactados<`);

fs.writeFileSync(PANEL_LUIS, out, "utf8");

console.log(`\nPanel de Luis: ${yaTiene.size} → ${totalNuevo} prospectos`);
console.log(`  ${porCiudad.size} ciudades nuevas, numeradas del ${yaTiene.size + 1} al ${orden}`);
console.log(`  peso: ${(fs.statSync(PANEL_LUIS).size / 1024).toFixed(0)} KB`);
