/**
 * Parte el panel de Luis en dos:
 *
 *   luis-7d0c90/         → solo lo que le queda por hacer (los gimnasios)
 *   luis-hechos-XXXX/    → los 430 que ya contactó, como archivo
 *
 * El motivo es de uso, no de orden: hoy tiene que bajar por 430 tarjetas
 * tachadas antes de llegar a la primera que le sirve.
 *
 * Los dos paneles comparten el mismo STORAGE_KEY a propósito. Es el mismo
 * vendedor y el mismo historial: si mañana desmarca algo en el archivo, el
 * cambio vale igual. Lo que se separa es la vista, no la cuenta.
 *
 * Los grupos se rearman desde cero a partir de las tarjetas. Recortar el HTML
 * por posiciones dejaría ciudades vacías y contadores mintiendo.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PANEL = path.join(__dirname, "luis-7d0c90", "index.html");
const h = fs.readFileSync(PANEL, "utf8");

/* ---------- separar cabeza, cuerpo y script ---------- */
const iPage = h.indexOf('<div class="page">');
const iScript = h.lastIndexOf("<script>");
if (iPage < 0 || iScript < 0) throw new Error("no se reconoce la estructura del panel");
const cabeza = h.slice(0, iPage);
const cuerpo = h.slice(iPage, iScript);
const script = h.slice(iScript);

/* ---------- quiénes ya estaban contactados ---------- */
const semilla = (script.match(/var YA_CONTACTADOS = (\[[\s\S]*?\]);/) || [])[1];
if (!semilla) throw new Error("no se encontró la lista de ya contactados");
const hechos = new Set(JSON.parse(semilla));

/* ---------- sacar todas las tarjetas con su ciudad ---------- */
const tarjetas = [];
const bloques = cuerpo.split('<div class="group">');
for (let i = 1; i < bloques.length; i++) {
  const ciudad = ((bloques[i].match(/<h2 class="group-title">([^<]*)</) || [])[1] || "").trim();
  for (const m of bloques[i].matchAll(/<article class="card"[\s\S]*?<\/article>/g)) {
    const html = m[0];
    const slug = (html.match(/data-slug="([^"]+)"/) || [])[1];
    tarjetas.push({ slug, ciudad, html, hecho: hechos.has(slug) });
  }
}
if (tarjetas.length !== 912) throw new Error("se esperaban 912 tarjetas, se leyeron " + tarjetas.length);

const yaHechas = tarjetas.filter((t) => t.hecho);
const pendientes = tarjetas.filter((t) => !t.hecho);
console.log(`tarjetas leídas: ${tarjetas.length}  ·  ya contactados: ${yaHechas.length}  ·  pendientes: ${pendientes.length}`);

/* ---------- rearmar grupos, renumerando solo el panel activo ---------- */
const armarGrupos = (lista, renumerar) => {
  const porCiudad = new Map();
  for (const t of lista) {
    if (!porCiudad.has(t.ciudad)) porCiudad.set(t.ciudad, []);
    porCiudad.get(t.ciudad).push(t);
  }
  let n = 0;
  const grupos = [...porCiudad.entries()].map(([ciudad, cards]) => {
    const html = cards.map((t) => {
      n++;
      return "      " + (renumerar
        ? t.html.replace(/<span class="order-badge">\d+<\/span>/, `<span class="order-badge">${n}</span>`)
        : t.html);
    }).join("\n");
    return `  <div class="group">
    <h2 class="group-title">${ciudad} <span class="group-count">${cards.length}</span></h2>
    <div class="cards">
${html}
    </div>
  </div>`;
  });
  return { html: grupos.join("\n\n"), ciudades: porCiudad.size };
};

const activo = armarGrupos(pendientes, true);
const archivo = armarGrupos(yaHechas, false);

/* ---------- carpeta del archivo ---------- */
const RUTA_ARCHIVO = "luis-hechos-" + crypto.randomBytes(3).toString("hex");
fs.mkdirSync(path.join(__dirname, RUTA_ARCHIVO), { recursive: true });

const enlace = (href, texto) =>
  `  <p style="margin:0 0 22px"><a href="${href}" style="font-size:.88rem;font-weight:600;color:var(--accent)">${texto}</a></p>`;

/* ---------- panel activo ---------- */
const briefActivo = `  <div class="brief">
    <h2>Cómo trabajar esta lista</h2>
    <p class="nota-pasos"><strong>Un solo mensaje.</strong>
      Aprieta <strong>“Abrir WhatsApp”</strong>: se abre con todo escrito, incluida la página del negocio. Solo le das enviar.
      Léelo antes: si algo no calza con ese negocio, corrígelo a mano.
      Si preguntan el precio, respóndelo directo — nunca “depende”.</p>
    <ul>
      <li>Estos ${pendientes.length} negocios son <strong>solo tuyos</strong> (${activo.ciudades} ciudades) y <strong>ninguno ha sido contactado</strong>. Nadie más les escribe.</li>
      <li>Son todos <strong>gimnasios</strong>. El mensaje ya está armado para ese rubro.</li>
      <li>Si tu número es <strong>nuevo</strong>, manda <strong>8 a 15 al día</strong> la primera semana, en bloques de 5 con pausas. Después puedes subir de a pocos.</li>
      <li>Mejor horario: <strong>10am–11am</strong> o <strong>3pm–5pm</strong>. Evita las horas de servicio (12–2pm y 7–9pm), ahí están full.</li>
      <li>Cada botón abre WhatsApp con el mensaje ya escrito — <strong>revísalo y dale enviar tú mismo</strong>. Nunca se automatiza el envío.</li>
      <li>El mensaje te presenta como <strong>Luis</strong>, alguien que hace páginas web para negocios. <strong>No digas que eres estudiante</strong> ni finjas ser una agencia. Si preguntan por qué cuesta menos: no hay oficina ni intermediarios, y la página ya está hecha.</li>
      <li>Marca <strong>"Enviado"</strong> en cada tarjeta para llevar la cuenta; queda guardado en este navegador.</li>
    </ul>
  </div>`;

const docActivo = cabeza.replace(/<title>[\s\S]*?<\/title>/, `<title>Envíos de Luis — ${pendientes.length} por contactar</title>`) +
`<div class="page">
  <div class="topbar">
    <p class="eyebrow">Panel de envíos · By0nder Web</p>
    <h1>Envíos de Luis — ${pendientes.length} por contactar</h1>
    <div class="progress-row">
      <div class="progress-track"><div class="progress-fill" id="progressFill"></div></div>
      <span class="progress-label" id="progressLabel">0/${pendientes.length} contactados</span>
    </div>
  </div>

${briefActivo}

${enlace("../" + RUTA_ARCHIVO + "/", "Ver los " + yaHechas.length + " que ya contactaste →")}

${activo.html}
</div>

` + script.replace(/\n\n +\/\* Reparto del [\s\S]*?localStorage\.setItem\(SEMILLA_KEY, "1"\);\n +\}\n/, "\n");

/* ---------- panel de archivo ---------- */
const docArchivo = cabeza.replace(/<title>[\s\S]*?<\/title>/, `<title>Luis — ${yaHechas.length} ya contactados</title>`) +
`<div class="page">
  <div class="topbar">
    <p class="eyebrow">Archivo · By0nder Web</p>
    <h1>Ya contactados — ${yaHechas.length} negocios</h1>
    <div class="progress-row">
      <div class="progress-track"><div class="progress-fill" id="progressFill"></div></div>
      <span class="progress-label" id="progressLabel">0/${yaHechas.length} contactados</span>
    </div>
  </div>

  <div class="brief">
    <h2>Para qué sirve esta lista</h2>
    <ul>
      <li>Son los ${yaHechas.length} negocios que <strong>ya escribiste</strong>, en ${archivo.ciudades} ciudades. Se sacaron de tu panel para que no tengas que bajar por todos ellos cada vez que entras.</li>
      <li>Los mensajes y los enlaces siguen acá. Si alguien <strong>responde tarde</strong>, buscas el negocio y tienes a mano lo que le mandaste y su página.</li>
      <li>Conservan su número original, del 1 al ${yaHechas.length}. Si alguna vez anotaste “voy por el 180”, sigue siendo ese.</li>
      <li>Si te equivocaste y alguno no lo mandaste, <strong>desmárcalo</strong>: se guarda igual que en el otro panel.</li>
    </ul>
  </div>

${enlace("../luis-7d0c90/", "← Volver a los " + pendientes.length + " que faltan")}

${archivo.html}
</div>

` + script;

fs.writeFileSync(PANEL, docActivo, "utf8");
fs.writeFileSync(path.join(__dirname, RUTA_ARCHIVO, "index.html"), docArchivo, "utf8");

console.log(`\nluis-7d0c90/            ${pendientes.length} pendientes en ${activo.ciudades} ciudades   ${(fs.statSync(PANEL).size / 1024).toFixed(0)} KB`);
console.log(`${RUTA_ARCHIVO}/    ${yaHechas.length} contactados en ${archivo.ciudades} ciudades   ${(fs.statSync(path.join(__dirname, RUTA_ARCHIVO, "index.html")).size / 1024).toFixed(0)} KB`);
console.log(`\nenlace del archivo: by0nder.github.io/demos-restaurantes/${RUTA_ARCHIVO}/`);
