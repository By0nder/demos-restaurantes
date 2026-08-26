/* ============================================================
   ALTA COLINA — comportamiento de la página
   Tres cosas: el plano vivo, la galería que crece, y WhatsApp.
   ============================================================ */

// el asesor que atiende las consultas (Ronivel). El 970 166 956 es el del proyecto.
const WSP = "51907155138";
const NS  = "http://www.w3.org/2000/svg";

const $  = (s, d = document) => d.querySelector(s);
const $$ = (s, d = document) => [...d.querySelectorAll(s)];

const enlaceWsp = (texto) =>
  `https://wa.me/${WSP}?text=${encodeURIComponent(texto)}`;

/* ------------------------------------------------------------
   WhatsApp — todos los botones llevan "vi su página web"
   ------------------------------------------------------------ */
function armarWhatsapp() {
  $$("[data-wsp]").forEach((a) => {
    const msg = a.dataset.mensaje ||
      "Hola, vi su página web de Alta Colina y quisiera información sobre las parcelas.";
    a.href = enlaceWsp(msg);
    a.target = "_blank";
    a.rel = "noopener";
  });
}

/* ------------------------------------------------------------
   Cabecera — cambia de piel al salir de la portada
   ------------------------------------------------------------ */
function armarCabecera() {
  const cabecera = $("#cabecera");
  const portada  = $(".portada");
  if (!cabecera || !portada) return;

  const io = new IntersectionObserver(
    ([e]) => cabecera.setAttribute("data-pegada", e.isIntersecting ? "no" : "si"),
    { rootMargin: "-72px 0px 0px 0px", threshold: 0 }
  );
  io.observe(portada);
}

/* ------------------------------------------------------------
   EL PLANO VIVO
   ------------------------------------------------------------ */
const ESTADOS = {
  disponible: "Disponible",
  reservada:  "Reservada",
  vendida:    "Vendida",
};

function dibujarPlano(datos) {
  const svg = $("#plano-svg");
  if (!svg || !datos) return;

  const [, , ancho, alto] = datos.viewBox || [0, 0, 1600, 1435];
  svg.setAttribute("viewBox", `0 0 ${ancho} ${alto}`);

  const geo = datos.geometria || {};
  const capa = (clase) => {
    const g = document.createElementNS(NS, "g");
    g.setAttribute("class", clase);
    svg.appendChild(g);
    return g;
  };
  const pintar = (g, paths, clase) =>
    (paths || []).forEach((d) => {
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", d);
      p.setAttribute("class", clase);
      g.appendChild(p);
    });

  pintar(capa("capa-terreno"), geo.terreno, "plano__terreno");
  pintar(capa("capa-verdes"),  geo.verdes,  "plano__verde");
  pintar(capa("capa-camino"),  geo.camino,  "plano__camino");

  const gParcelas = capa("capa-parcelas");
  const gNumeros  = capa("capa-numeros");

  datos.parcelas.forEach((p) => {
    const poly = document.createElementNS(NS, "polygon");
    poly.setAttribute("points", p.puntos.map((c) => c.join(",")).join(" "));
    poly.setAttribute("class", "parcela");
    poly.setAttribute("data-estado", p.estado);
    poly.setAttribute("data-num", p.num);

    if (p.estado !== "vendida") {
      // una sola parada de tabulador para todo el plano; dentro se anda con flechas
      poly.setAttribute("tabindex", "-1");
      poly.setAttribute("role", "button");
    }
    const m2 = p.m2 ? `, ${p.m2} metros cuadrados` : "";
    poly.setAttribute("aria-label",
      `Parcela ${p.num}${m2}. ${ESTADOS[p.estado] || p.estado}.`);

    gParcelas.appendChild(poly);

    const t = document.createElementNS(NS, "text");
    t.setAttribute("x", p.centro[0]);
    t.setAttribute("y", p.centro[1]);
    t.setAttribute("class", "parcela__num");
    t.setAttribute("data-estado", p.estado);
    t.textContent = p.num;
    gNumeros.appendChild(t);
  });

  const primera = svg.querySelector('.parcela[role="button"]');
  if (primera) primera.setAttribute("tabindex", "0");

  armarFicha(datos);
  navegarConFlechas(svg);
  escribirNota(datos);
}

function armarFicha(datos) {
  const ficha   = $("#ficha");
  const num     = $("#ficha-num");
  const estado  = $("#ficha-estado");
  const cuerpo  = $("#ficha-datos");
  const wsp     = $("#ficha-wsp");
  const cerrar  = $("#ficha-cerrar");
  if (!ficha) return;

  let elegida = null;

  const cerrarFicha = () => {
    ficha.setAttribute("data-visible", "no");
    if (elegida) elegida.removeAttribute("aria-current");
    elegida = null;
  };

  const abrir = (poly) => {
    const n = Number(poly.dataset.num);
    const p = datos.parcelas.find((x) => x.num === n);
    if (!p || p.estado === "vendida") return;

    if (elegida) elegida.removeAttribute("aria-current");
    elegida = poly;
    poly.setAttribute("aria-current", "true");

    num.textContent = `N.º ${p.num}`;
    estado.textContent = ESTADOS[p.estado] || p.estado;
    estado.setAttribute("data-estado", p.estado);

    const filas = [];
    if (p.m2) filas.push(`Área <b>${p.m2} m²</b>`);
    else      filas.push("Área <b>por confirmar</b>");
    if (p.nota) filas.push(p.nota);
    cuerpo.innerHTML = filas.map((f) => `<span>${f}</span>`).join("");

    wsp.href = enlaceWsp(
      `Hola, vi su página web de Alta Colina y quisiera información sobre la parcela N.º ${p.num}.`
    );
    wsp.target = "_blank";
    wsp.rel = "noopener";

    ficha.setAttribute("data-visible", "si");
  };

  $("#plano-svg").addEventListener("click", (e) => {
    const poly = e.target.closest(".parcela");
    if (poly) abrir(poly);
    else cerrarFicha();
  });

  $("#plano-svg").addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const poly = e.target.closest(".parcela");
    if (!poly) return;
    e.preventDefault();
    abrir(poly);
  });

  cerrar.addEventListener("click", cerrarFicha);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && ficha.getAttribute("data-visible") === "si") cerrarFicha();
  });
}

/* Con 77 parcelas, hacer 77 tabulaciones para pasar el plano es inaceptable.
   Se entra una vez y adentro se anda con las flechas (roving tabindex). */
function navegarConFlechas(svg) {
  const parcelas = () => $$('.parcela[role="button"]', svg);

  const mover = (desde, paso) => {
    const lista = parcelas();
    const i = lista.indexOf(desde);
    if (i < 0) return;
    const j = Math.max(0, Math.min(lista.length - 1, i + paso));
    if (j === i) return;
    desde.setAttribute("tabindex", "-1");
    lista[j].setAttribute("tabindex", "0");
    lista[j].focus();
  };

  svg.addEventListener("keydown", (e) => {
    const poly = e.target.closest?.(".parcela");
    if (!poly) return;
    const lista = parcelas();
    const saltoFila = 10;   // aprox. una fila de parcelas
    const acciones = {
      ArrowRight: 1, ArrowLeft: -1,
      ArrowDown: saltoFila, ArrowUp: -saltoFila,
      Home: -lista.length, End: lista.length,
    };
    if (!(e.key in acciones)) return;
    e.preventDefault();
    mover(poly, acciones[e.key]);
  });
}

function escribirNota(datos) {
  const nota = $("#plano-nota");
  if (!nota) return;
  const disp = datos.parcelas.filter((p) => p.estado === "disponible").length;
  const partes = [`${datos.numeradas_aqui} parcelas dibujadas · ${disp} disponibles.`];
  if (datos.borde_sin_confirmar > 0) {
    partes.push(
      `Faltan ${datos.borde_sin_confirmar} parcelas de borde y las medidas de cada una: ` +
      `se agregan cuando llegue el plano de lotización en CAD.`
    );
  }
  nota.textContent = partes.join(" ");
}

/* ------------------------------------------------------------
   LA GALERÍA — lee medios.json y crece sola
   ------------------------------------------------------------ */
const ICONO_VIDEO =
  `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`;

function dibujarGaleria(datos) {
  const tira = $("#galeria");
  if (!tira) return;

  // solo entra lo que se eligió a mano: con siete fotos del mismo portón
  // la galería se volvía repetitiva. La curaduría vive en medios.json.
  const medios = (datos?.medios || [])
    .filter((m) => m.galeria)
    .sort((a, b) => (a.orden ?? 900) - (b.orden ?? 900));

  if (!medios.length) {
    tira.closest(".carrusel").outerHTML =
      `<p class="recorrido__vacio">Las fotos y el video del terreno se publican aquí
       en cuanto estén listos.</p>`;
    return;
  }

  tira.innerHTML = medios
    .map((m, i) => {
      const alt = m.alt || m.leyenda || "Alta Colina";
      const interior =
        m.tipo === "video"
          ? `<img src="${m.thumb || m.poster || ""}" alt="${alt}" loading="lazy" decoding="async">
             <span class="medio__marca">${ICONO_VIDEO} Video</span>`
          : `<img src="${m.thumb || m.src}" alt="${alt}" loading="lazy" decoding="async">`;
      return `<button class="medio" type="button" data-i="${i}"
                data-orientacion="${m.orientacion || "horizontal"}">${interior}</button>`;
    })
    .join("");

  armarCarrusel(tira, medios);
  armarVisor(medios);
}

/* ------------------------------------------------------------
   El mando del carrusel: flechas, cuenta y la leyenda de lo que
   se está viendo. Se apoya en scroll-snap, así que el dedo y el
   teclado funcionan solos.
   ------------------------------------------------------------ */
function armarCarrusel(tira, medios) {
  const cuenta   = $("#carrusel-cuenta");
  const leyenda  = $("#carrusel-leyenda");
  const flechas  = $$(".carrusel__flecha");
  const piezas   = () => $$(".medio", tira);

  // offsetLeft no sirve aquí: las piezas no se posicionan contra la tira.
  // Se comparan rectángulos reales, que sí dan la distancia al borde visible.
  const visible = () => {
    const borde = tira.getBoundingClientRect().left;
    let mejor = 0, dif = Infinity;
    piezas().forEach((p, i) => {
      const d = Math.abs(p.getBoundingClientRect().left - borde);
      if (d < dif) { dif = d; mejor = i; }
    });
    return mejor;
  };

  const refrescar = () => {
    const i = visible();
    if (cuenta) cuenta.textContent = `${i + 1} / ${medios.length}`;
    if (leyenda) leyenda.textContent = medios[i]?.leyenda || "";
    const fin = tira.scrollLeft >= tira.scrollWidth - tira.clientWidth - 4;
    flechas.forEach((f) => {
      f.disabled = +f.dataset.paso < 0 ? tira.scrollLeft <= 4 : fin;
    });
  };

  // scroll-snap cancela el desplazamiento suave del navegador, así que la
  // animación se hace a mano. De paso se apaga el snap mientras dura, si no
  // pelea con cada cuadro.
  // requestAnimationFrame se duerme cuando la pestaña no está pintando
  // (segundo plano, vistas incrustadas). El temporizador lo releva para que
  // la tira nunca se quede a medio camino.
  const siguienteCuadro = (fn) => {
    let servido = false;
    const una = () => { if (!servido) { servido = true; fn(); } };
    requestAnimationFrame(una);
    setTimeout(una, 32);
  };

  let animando = false;
  const deslizar = (hasta) => {
    const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const desde = tira.scrollLeft;
    const dist = hasta - desde;
    if (quieto || Math.abs(dist) < 2) { tira.scrollLeft = hasta; refrescar(); return; }

    const dura = Math.min(620, 240 + Math.abs(dist) * 0.32);
    const snap = tira.style.scrollSnapType;
    tira.style.scrollSnapType = "none";
    const arranque = performance.now();
    animando = true;

    const cuadro = () => {
      const avance = Math.min(1, (performance.now() - arranque) / dura);
      const suave = 1 - Math.pow(1 - avance, 3);   // arranca rápido, frena al final
      tira.scrollLeft = desde + dist * suave;
      if (avance < 1) {
        siguienteCuadro(cuadro);
      } else {
        animando = false;
        tira.style.scrollSnapType = snap;
        refrescar();
      }
    };
    siguienteCuadro(cuadro);
  };

  const mover = (paso) => {
    const p = piezas();
    const destino = p[Math.max(0, Math.min(p.length - 1, visible() + paso))];
    if (!destino) return;
    const salto = destino.getBoundingClientRect().left - tira.getBoundingClientRect().left;
    deslizar(tira.scrollLeft + salto);
  };

  flechas.forEach((f) => f.addEventListener("click", () => mover(+f.dataset.paso)));
  tira.addEventListener("scroll", () => {
    if (animando) return;              // durante la animación manda deslizar()
    clearTimeout(tira._t);
    tira._t = setTimeout(refrescar, 90);
  }, { passive: true });
  tira.addEventListener("keydown", (e) => {
    const pasos = { ArrowRight: 1, ArrowLeft: -1, Home: -medios.length, End: medios.length };
    if (!(e.key in pasos)) return;
    e.preventDefault();
    mover(pasos[e.key]);
  });

  refrescar();
}

function armarVisor(medios) {
  const visor  = $("#visor");
  const caja   = $("#visor-caja");
  const cerrar = $("#visor-cerrar");
  if (!visor) return;

  $("#galeria").addEventListener("click", (e) => {
    const b = e.target.closest(".medio");
    if (!b) return;
    const m = medios[Number(b.dataset.i)];
    const alt = m.alt || m.leyenda || "Alta Colina";
    caja.innerHTML =
      m.tipo === "video"
        ? `<video src="${m.src}" poster="${m.poster || ""}" controls playsinline preload="metadata"></video>
           ${m.leyenda ? `<p class="visor__pie">${m.leyenda}</p>` : ""}`
        : `<img src="${m.src}" alt="${alt}">
           ${m.leyenda ? `<p class="visor__pie">${m.leyenda}</p>` : ""}`;
    visor.showModal();
  });

  const cerrarVisor = () => {
    caja.querySelector("video")?.pause();
    visor.close();
  };
  cerrar.addEventListener("click", cerrarVisor);
  visor.addEventListener("click", (e) => { if (e.target === visor) cerrarVisor(); });
  visor.addEventListener("close", () => { caja.innerHTML = ""; });
}

/* ------------------------------------------------------------
   PORTADA EN VIDEO — si hay dron, manda el video
   ------------------------------------------------------------ */
function portadaEnVideo(datos) {
  // manda la categoría "portada"; el nombre del archivo es solo el respaldo
  const videos = (datos?.medios || []).filter((m) => m.tipo === "video");
  const dron =
    videos.find((m) => m.cat === "portada") ||
    videos.find((m) => /dron|drone|aerea|aérea/i.test(m.origen));
  if (!dron) return;

  // en conexión lenta o con datos limitados se queda la foto
  const con = navigator.connection;
  if (con && (con.saveData || /(^|-)2g$/.test(con.effectiveType || ""))) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const fondo = $(".portada__fondo");
  const foto  = fondo?.querySelector("img");
  if (!fondo || !foto) return;

  const v = document.createElement("video");
  // atributos, no solo propiedades: el autoplay silenciado depende de que
  // "muted" y "playsinline" estén puestos ANTES de asignar el src
  v.muted = true;
  v.defaultMuted = true;
  ["muted", "playsinline", "loop", "autoplay"].forEach((a) => v.setAttribute(a, ""));
  v.setAttribute("aria-hidden", "true");
  v.setAttribute("tabindex", "-1");
  v.className = "portada__video";
  v.preload = "auto";
  // sin poster: la foto del pórtico que ya está detrás cumple ese papel
  v.src = dron.src;

  // la foto se queda hasta que el video tenga algo que mostrar
  v.addEventListener("canplay", () => {
    v.dataset.listo = "si";
    foto.style.opacity = "0";
  }, { once: true });

  fondo.appendChild(v);

  const intentar = () => v.play().catch(() => {});
  intentar();
  // si el navegador bloqueó el autoplay, arranca al primer gesto.
  // Si nunca arranca, la foto se queda: la portada nunca se rompe.
  ["pointerdown", "touchstart", "keydown"].forEach((ev) =>
    document.addEventListener(ev, intentar, { once: true, passive: true })
  );
}

/* ------------------------------------------------------------
   RETRATO DEL ASESOR — si no hay foto, quedan las iniciales
   ------------------------------------------------------------ */
function retratoDelAsesor(datos) {
  const caja = $("#asesor-retrato");
  if (!caja) return;
  const foto = (datos?.medios || []).find((m) => m.cat === "asesor" && m.tipo === "foto");
  if (!foto) return;                    // sin foto: se quedan las iniciales

  // sin loading="lazy": una imagen fuera del DOM con lazy nunca termina de cargar.
  // Se inserta recién cuando cargó, así nunca se ve un hueco roto.
  const img = new Image();
  img.alt = foto.alt || "Ronivel Jiménez García, asesor inmobiliario de Alta Colina";
  img.decoding = "async";
  img.addEventListener("load", () => caja.appendChild(img), { once: true });
  img.src = foto.src;
}

/* ------------------------------------------------------------
   FORMULARIO — no manda correos: arma el WhatsApp ya escrito
   ------------------------------------------------------------ */
function armarFormulario() {
  const f = document.querySelector("#pedir-info");
  if (!f) return;

  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = new FormData(f);
    const nombre = (d.get("nombre") || "").toString().trim();
    const interes = (d.get("interes") || "").toString();
    const cuando = (d.get("cuando") || "").toString();

    const partes = [
      `Hola, vi su página web de Alta Colina.`,
      nombre ? `Soy ${nombre}.` : "",
      interes ? `Me interesa: ${interes}.` : "",
      cuando ? `Podría visitar el proyecto: ${cuando}.` : "",
      `Quisiera que me envíen precios y las parcelas disponibles.`,
    ].filter(Boolean);

    window.open(enlaceWsp(partes.join(" ")), "_blank", "noopener");
    const aviso = document.querySelector("#pedir-info-listo");
    if (aviso) { aviso.hidden = false; aviso.setAttribute("role", "status"); }
  });
}

/* ------------------------------------------------------------
   Respaldo del "revela" para navegadores sin scroll-driven CSS
   ------------------------------------------------------------ */
function respaldoRevelar() {
  const soporta = CSS.supports?.("animation-timeline: view()");
  const quieto  = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (soporta || quieto) return;

  const io = new IntersectionObserver(
    (entradas) => entradas.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.style.transition = "opacity .7s ease, transform .7s cubic-bezier(.2,.7,.3,1)";
      e.target.style.opacity = "1";
      e.target.style.transform = "none";
      io.unobserve(e.target);
    }),
    { rootMargin: "0px 0px -12% 0px" }
  );
  $$(".revela").forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(1.75rem)";
    io.observe(el);
  });
}

/* ------------------------------------------------------------
   Arranque
   ------------------------------------------------------------ */
async function cargar(ruta) {
  try {
    const r = await fetch(ruta, { cache: "no-cache" });
    if (!r.ok) throw new Error(r.status);
    return await r.json();
  } catch (e) {
    console.warn(`No se pudo leer ${ruta}:`, e.message);
    return null;
  }
}

(async function inicio() {
  armarWhatsapp();
  armarCabecera();
  armarFormulario();
  respaldoRevelar();

  const [parcelas, medios] = await Promise.all([
    cargar("parcelas.json"),
    cargar("medios.json"),
  ]);

  if (parcelas) dibujarPlano(parcelas);
  if (medios) { dibujarGaleria(medios); portadaEnVideo(medios); retratoDelAsesor(medios); }
})();
