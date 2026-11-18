// Plantilla tienda (2026-10-28, J&S Pet Shop): banners, carruseles, buscador, filtros y el pedido
// que se arma en la página y se abre en WhatsApp. Sin servidor; el pedido se guarda en localStorage.
(function () {
  'use strict';
  // ── Catálogo desde una hoja de Google o un Excel (13-nov-2026) ─────────────────────────────────────
  // Con `tienda.catalogoSheet` en el JSON, la página lee el CSV publicado de la hoja y cambia los productos
  // del HTML por los de la hoja. Lo de abajo hasta `module.exports` es puro (sin DOM) y lo prueba
  // test/tienda-catalogo.test.cjs.

  // CSV de Google Sheets: admite comas, saltos de línea y comillas dentro de celdas. Copia de
  // assets/taller-editorial/site.js con el separador como parámetro (Excel en español guarda con «;»).
  function parseCSV(input, sep) {
    sep = sep || ',';
    const rows = []; let row = [], cell = '', quoted = false;
    const text = String(input).replace(/^﻿/, '');
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
      else if (c === sep && !quoted) { row.push(cell); cell = ''; }
      else if ((c === '\n' || c === '\r') && !quoted) { row.push(cell); if (row.some(x => x.trim())) rows.push(row); row = []; cell = ''; if (c === '\r' && text[i + 1] === '\n') i++; }
      else cell += c;
    }
    if (quoted) throw new Error('CSV incompleto');
    row.push(cell); if (row.some(x => x.trim())) rows.push(row);
    const headers = (rows.shift() || []).map(x => x.trim());
    if (new Set(headers).size !== headers.length) throw new Error('Columnas repetidas');
    return { headers, filas: rows.map(r => Object.fromEntries(headers.map((h, i) => [h, (r[i] || '').trim()]))) };
  }
  // El separador sale de la primera línea: «;» si no trae comas (Excel en español), «,» si no.
  const separador = texto => { const l = String(texto).replace(/^﻿/, '').split(/\r?\n/)[0] || ''; return !l.includes(',') && l.includes(';') ? ';' : ','; };

  const slugDe = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const norm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  // Gemelas de lib/tienda.js (la prueba compara las dos con los 248 productos de J&S).
  function presentaciones(v) {
    if (Array.isArray(v)) return v.map(String);
    const partes = String(v || '').split(/\s*·\s*/).filter(Boolean);
    const out = []; let unidad = '';
    for (let i = partes.length - 1; i >= 0; i--) {
      const m = partes[i].match(/^([\d.,]+)\s*(kg|g)?$/i);
      if (m) { unidad = m[2] || unidad; out.unshift(m[1] + ' ' + (unidad || 'kg')); } else out.unshift(partes[i]);
    }
    return out;
  }
  const kilos = p => { const m = String(p).match(/([\d.,]+)\s*(kg|g)\b/i); return m ? parseFloat(m[1].replace(',', '.')) / (m[2].toLowerCase() === 'g' ? 1000 : 1) : 0; };
  const PALABRAS_TIPO = { seco: 'croquetas alimento seco', humedo: 'comida humeda lata sobre pouche', snack: 'snack premio bocadito golosina',
    arena: 'arena sanitaria', higiene: 'higiene aseo', accesorio: 'accesorio', juguete: 'juguete' };
  function normalizar(p, i, nombreMarca) {
    const pres = presentaciones(p.presentaciones);
    const marca = slugDe(p.marca || '');
    const especies = p.especie === 'ambos' ? ['perro', 'gato'] : [p.especie];
    const tipo = slugDe(p.tipo || '');
    const tags = [...especies, tipo, slugDe(p.etapa || ''), marca, ...(pres.some(x => kilos(x) >= 15) ? ['saco'] : []), ...(p.filtros || [])].filter(Boolean);
    return {
      id: p.id || slugDe(p.nombre) || 'p' + i, nombre: p.nombre, marca, marcaNombre: nombreMarca[marca] || p.marca || '',
      etapa: p.etapa || '', detalle: p.detalle && !norm(p.nombre).includes(norm(p.detalle)) ? p.detalle : '',
      descripcion: p.descripcion || '', imagen: p.imagen,
      presentaciones: pres, precio: p.precio || '', destacado: !!p.destacado, tags: [...new Set(tags)],
      buscar: [p.nombre, nombreMarca[marca], p.etapa, p.detalle, ...especies.map(e => e === 'gato' ? 'gato gatos' : e === 'perro' ? 'perro perros' : ''), PALABRAS_TIPO[tipo], ...pres].filter(Boolean).join(' ')
    };
  }
  // Foto de la hoja: un enlace https o una ruta de la web («assets/productos/p05.webp», sin «..»). Devuelve lo
  // que va en `imagen` (la ruta SIN «assets/», como en el JSON, o el enlace) o null.
  function fotoSegura(v) {
    v = String(v || '').trim();
    if (/^assets\/[a-zA-Z0-9_./-]+$/.test(v) && !v.includes('..')) return v.slice(7);
    try { const u = new URL(v); if (u.protocol === 'https:') return u.href; } catch (e) {}
    return null;
  }
  const src = imagen => /^https:\/\//.test(imagen) ? imagen : 'assets/' + imagen;
  // Columnas de la hoja: el nombre se compara sin tildes, mayúsculas ni espacios. `catalogoSheetColumnas`
  // del JSON ({"precio": "Precio S/"}) pone otro nombre por campo.
  const COLUMNAS = {
    id: ['id', 'codigo', 'cod', 'sku'], nombre: ['nombre', 'producto'], marca: ['marca'], precio: ['precio', 'precios', 'preciosoles'],
    presentaciones: ['presentaciones', 'presentacion', 'tamanos', 'tamano', 'pesos', 'peso'], foto: ['foto', 'fotos', 'imagen', 'urlfoto', 'enlacefoto'],
    especie: ['especie', 'categoria', 'mascota', 'para'], tipo: ['tipo'], etapa: ['etapa', 'edad'], destacado: ['destacado', 'maspedido', 'maspedidos'],
    activo: ['activo', 'visible', 'mostrar'], descripcion: ['descripcion'], detalle: ['detalle'], filtros: ['filtros', 'etiquetas']
  };
  const clave = t => norm(t).replace(/[^a-z0-9]/g, '');
  const SI = ['si', 's', 'x', '1', 'true', 'yes'];
  const NO = ['no', 'n', '0', 'false', 'inactivo', 'oculto', 'agotado'];
  const MAX_FILAS = 2000;
  // Texto del CSV → productos listos para pintar. Lanza un error (y la página se queda con su catálogo) si la
  // hoja no es CSV, está cortada, no tiene la columna «nombre» o no queda ningún producto activo con foto.
  function catalogoDeHoja(texto, op) {
    op = op || {};
    texto = String(texto || '');
    if (!texto.trim() || texto.trim().startsWith('<')) throw new Error('La hoja no llegó como CSV (¿se publicó como «Página web»?)');
    const { headers, filas } = parseCSV(texto, separador(texto));
    const propias = op.columnas || {};
    const col = {};
    for (const campo of Object.keys(COLUMNAS)) {
      const buscadas = propias[campo] ? [clave(propias[campo])] : COLUMNAS[campo];
      col[campo] = headers.find(h => buscadas.includes(clave(h))) || '';
    }
    if (!col.nombre) throw new Error('La hoja no tiene la columna «nombre»');
    if (filas.length > MAX_FILAS) throw new Error('La hoja tiene más de ' + MAX_FILAS + ' filas');
    const marcas = op.marcas || {};
    const vistos = {};
    const crudos = [];
    filas.forEach(f => {
      const v = campo => (col[campo] ? f[col[campo]] || '' : '').trim();
      const nombre = v('nombre').slice(0, 140);
      if (!nombre || NO.includes(norm(v('activo')))) return;
      const imagen = fotoSegura(v('foto')) || (op.foto ? fotoSegura('assets/' + op.foto) : null);
      if (!imagen) return;
      const e = norm(v('especie')).trim();
      const especie = /^(ambos|todos|perros? y gatos?|gatos? y perros?)$/.test(e) ? 'ambos' : slugDe(e).replace(/^(perro|gato)s$/, '$1');
      const precio = v('precio');
      let id = slugDe(v('id') || nombre) || 'p' + crudos.length;
      if (vistos[id]) id += '-' + (++vistos[id]); else vistos[id] = 1;
      crudos.push({
        id, nombre, marca: v('marca').slice(0, 60), especie, tipo: v('tipo'), etapa: v('etapa').slice(0, 40),
        detalle: (v('detalle') || v('descripcion')).slice(0, 300),
        // «1, 3, 7 kg», «1 / 3 / 7 kg» o «1 | 3 kg» se leen como «1 · 3 · 7 kg» (una coma sin espacio es decimal: 1,5 kg).
        presentaciones: v('presentaciones').replace(/\s*(?:\||\/|;|,(?=\s))\s*/g, ' · ').slice(0, 200),
        imagen, precio: /^\d+(?:[.,]\d{1,2})?$/.test(precio) ? 'S/ ' + precio : precio.slice(0, 40),
        destacado: SI.includes(norm(v('destacado'))),
        filtros: v('filtros').split(/[\s,|]+/).map(slugDe).filter(Boolean)
      });
    });
    if (!crudos.length) throw new Error('La hoja no tiene productos activos');
    return crudos.map((p, i) => normalizar(p, i, marcas));
  }
  // La tarjeta de producto en JS: la MISMA que `tarjeta` de templates/tienda/layout.ejs (la prueba compara las
  // dos). El escape es el de EJS para que salgan iguales.
  const escAttr = t => String(t).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&#34;', "'": '&#39;' }[c]));
  // `altPre` (18-nov-2026): el prefijo del alt (`tienda.altFoto` del JSON; «Bolsa de» en J&S, como en el EJS).
  function tarjeta(p, enCatalogo, altPre) {
    const e = escAttr;
    return '<article class="prod"' + (enCatalogo ? ` data-id="${e(p.id)}" data-tags="${e(p.tags.join(' '))}" data-buscar="${e(p.buscar)}"` : '') + '>'
      + '<div class="prod-foto">' + (p.etapa ? `<span class="prod-et">${e(p.etapa)}</span>` : '')
      + `<img src="${e(src(p.imagen))}" alt="${e((altPre != null ? altPre : 'Bolsa de ') + p.nombre)}" width="600" height="600" loading="lazy" decoding="async"></div>`
      + `<p class="prod-marca">${e(p.marcaNombre)}</p><h3 class="prod-nombre">${e(p.nombre)}</h3>`
      + (p.detalle ? `<p class="prod-detalle">${e(p.detalle)}</p>` : '') + (p.precio ? `<p class="prod-precio">${e(p.precio)}</p>` : '')
      + `<div class="prod-pres" role="group" aria-label="Presentación de ${e(p.nombre)}">`
      + p.presentaciones.map((x, i) => `<button type="button" class="pres" aria-pressed="${i === 0}" data-pres="${e(x)}">${e(x)}</button>`).join('')
      + `</div><button type="button" class="btn btn-accion prod-btn" data-agregar="${e(p.id)}"><svg class="ico " aria-hidden="true"><use href="#i-carrito"/></svg><span>Agregar<span class="largo"> al pedido</span></span></button></article>`;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { parseCSV, separador, presentaciones, normalizar, fotoSegura, catalogoDeHoja, tarjeta, src };
  if (typeof document === 'undefined') return;

  const D = JSON.parse(document.getElementById('datos-tienda').textContent);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const CLAVE = 'pedido-' + D.slug;
  const svg = id => `<svg class="ico" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // Total del pedido (opt-in `tienda.pedido.total`, 18-nov-2026): solo los precios fijos «S/ 120» (el número viaja
  // como `v` en cada producto; la hoja de Google lo lee de su columna precio). 1200 → «S/ 1,200»; 12.5 → «S/ 12.50».
  const precioFijo = t => { const m = /^S\/\.?\s*(\d[\d,]*(?:\.\d{1,2})?)$/i.exec(String(t || '').trim()); return m ? Number(m[1].replace(/,/g, '')) : null; };
  const soles = n => { n = Math.round(n * 100) / 100; const e = Math.floor(n), m = String(e).replace(/\B(?=(\d{3})+(?!\d))/g, ','); return 'S/ ' + (n === e ? m : m + '.' + String(Math.round((n - e) * 100)).padStart(2, '0')); };

  // Catálogo de la hoja: cambia la grilla, «Los más pedidos» y los datos del carrito. Lo guardado de la última
  // visita se pinta al toque (antes de leer el pedido, así no se pierde un producto que solo está en la hoja) y
  // la hoja se vuelve a pedir si pasaron más de 5 minutos (lo que tarda Google en refrescar el CSV publicado).
  const HOJA = D.hoja || null, CLAVE_HOJA = 'catalogo-' + D.slug, FRESCO = 5 * 60e3;
  let hojaTexto = null, hojaFecha = 0;
  const ponerCatalogo = productos => {
    D.productos = Object.fromEntries(productos.map(p => [p.id, { n: p.nombre, i: p.imagen, m: p.marcaNombre, p: p.presentaciones, ...(D.total && precioFijo(p.precio) != null ? { v: precioFijo(p.precio) } : {}) }]));
    $('#catalogo .grilla').innerHTML = productos.map(p => tarjeta(p, true, D.alt)).join('');
    const pista = $('.prods-pista'), dest = productos.filter(p => p.destacado);
    if (pista) { pista.innerHTML = dest.map(p => tarjeta(p, false, D.alt)).join(''); pista.closest('section').hidden = !dest.length; pista.scrollLeft = 0; }
  };
  if (HOJA) {
    try {
      const c = JSON.parse(localStorage.getItem(CLAVE_HOJA) || 'null');
      if (c && c.url === HOJA.url && Date.now() - c.fecha < 30 * 864e5) { ponerCatalogo(catalogoDeHoja(c.texto, HOJA)); hojaTexto = c.texto; hojaFecha = c.fecha; }
    } catch (e) {}
  }

  // Cabecera con sombra al bajar
  const cab = $('.cab');
  addEventListener('scroll', () => cab.classList.toggle('bajando', scrollY > 10), { passive: true });

  // Banners: cambio suave cada 6 s; se pausa con el mouse encima, con la pestaña oculta y con "reducir movimiento".
  const banners = $$('.banner');
  if (banners.length > 1) {
    let actual = 0, timer;
    const puntos = $$('.banners-puntos button');
    const ir = n => {
      actual = (n + banners.length) % banners.length;
      banners.forEach((b, i) => {
        b.classList.toggle('activo', i === actual);
        b.setAttribute('aria-hidden', i === actual ? 'false' : 'true');
        $$('a', b).forEach(a => a.tabIndex = i === actual ? 0 : -1);
      });
      puntos.forEach((p, i) => p.setAttribute('aria-current', i === actual ? 'true' : 'false'));
    };
    const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const andar = () => { clearInterval(timer); if (!quieto) timer = setInterval(() => { if (!document.hidden) ir(actual + 1); }, 6000); };
    $$('[data-banner]').forEach(b => b.addEventListener('click', () => { ir(actual + +b.dataset.banner); andar(); }));
    puntos.forEach(p => p.addEventListener('click', () => { ir(+p.dataset.ir); andar(); }));
    const sec = $('.banners');
    sec.addEventListener('mouseenter', () => clearInterval(timer));
    sec.addEventListener('mouseleave', andar);
    let x0 = null;
    sec.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    sec.addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) { ir(actual + (dx < 0 ? 1 : -1)); andar(); } x0 = null; });
    andar();
  }

  // Carruseles con flechas
  $$('[data-carrusel]').forEach(c => {
    const pista = $('.car-pista', c);
    const [izq, der] = [$('.car-flecha.izq', c), $('.car-flecha.der', c)];
    const revisar = () => { izq.disabled = pista.scrollLeft < 8; der.disabled = pista.scrollLeft + pista.clientWidth > pista.scrollWidth - 8; };
    $$('[data-car]', c).forEach(b => b.addEventListener('click', () => pista.scrollBy({ left: +b.dataset.car * pista.clientWidth * 0.9, behavior: 'smooth' })));
    pista.addEventListener('scroll', revisar, { passive: true });
    addEventListener('resize', revisar);
    revisar();
  });

  // Presentación elegida en cada tarjeta
  document.addEventListener('click', e => {
    const p = e.target.closest('.pres');
    if (!p) return;
    $$('.pres', p.parentNode).forEach(b => b.setAttribute('aria-pressed', b === p ? 'true' : 'false'));
  });

  // Catálogo: filtros y búsqueda. Los filtros van por grupo (mascota, tipo…): los grupos se combinan
  // (Gatos + Snacks) y dentro de un grupo se elige uno. Una marca, el menú o una categoría que no está
  // entre los botones filtra sola. Se muestran `porPagina` y «Ver más» trae los siguientes.
  let tarjetas = [];
  const leerTarjetas = () => { tarjetas = $$('#catalogo .prod'); tarjetas.forEach(t => { t._tags = t.dataset.tags.split(' '); t._texto = norm(t.dataset.buscar); }); };
  leerTarjetas();
  const filtros = $$('.filtro');
  const grupoDe = Object.fromEntries(filtros.filter(f => f.dataset.filtro !== 'todos').map(f => [f.dataset.filtro, f.dataset.grupo]));
  const visibles = $('[data-visibles]');
  const POR_PAGINA = D.porPagina || 24;
  let sel = {}, termino = '', limite = POR_PAGINA;
  const pasa = (t, s, palabras) => Object.values(s).every(id => t._tags.includes(id)) && palabras.every(w => t._texto.includes(w) || t._texto.includes(w.replace(/s$/, '')));
  const verMas = $('[data-ver-mas]');
  // Guías (3-nov-2026): una pestaña por mascota; la intro de la mascota filtrada va arriba de la grilla.
  const intros = $$('[data-guia-intro]'), tabs = $$('.guia-tab');
  const pestana = (id, foco) => tabs.forEach(t => {
    const si = t.dataset.tab === id;
    t.setAttribute('aria-selected', si ? 'true' : 'false'); t.tabIndex = si ? 0 : -1;
    $('#guia-' + t.dataset.tab).hidden = !si;
    if (si && foco) t.focus();
  });
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => pestana(t.dataset.tab));
    t.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { e.preventDefault(); pestana(tabs[(i + d + tabs.length) % tabs.length].dataset.tab, true); }
    });
  });
  $$('[data-ir-guia]').forEach(a => a.addEventListener('click', () => pestana(a.dataset.irGuia)));
  const aplicar = (incluir) => {
    const palabras = norm(termino).split(/\s+/).filter(Boolean);
    const ok = tarjetas.filter(t => pasa(t, sel, palabras));
    // El producto elegido en las sugerencias tiene que quedar a la vista aunque esté más abajo.
    if (incluir) { const k = ok.findIndex(t => t.dataset.id === incluir); if (k >= limite) limite = Math.ceil((k + 1) / POR_PAGINA) * POR_PAGINA; }
    const vista = new Set(ok.slice(0, limite));
    tarjetas.forEach(t => { t.hidden = !vista.has(t); });
    const n = ok.length;
    visibles.textContent = n;
    verMas.hidden = n <= limite;
    $('[data-quedan]').textContent = n > limite ? `(${n - limite})` : '';
    // Cada botón dice cuántos quedarían al tocarlo; los que dejarían la grilla vacía se esconden.
    filtros.forEach(f => {
      const g = f.dataset.grupo, id = f.dataset.filtro;
      const s = { ...sel }; delete s[g]; if (id !== 'todos') s[g] = id;
      const c = tarjetas.filter(t => pasa(t, s, palabras)).length;
      f.querySelector('small').textContent = c;
      const marcado = id === 'todos' ? !sel[g] : sel[g] === id;
      f.setAttribute('aria-pressed', marcado ? 'true' : 'false');
      f.hidden = !c && !marcado;
    });
    $('[data-vacio]').hidden = n > 0;
    // Una marca (o lo que no tiene botón) se nombra arriba de la grilla, con «Ver todo» para salir.
    const caja = $('[data-busqueda]');
    const marca = sel.otro && $(`.marca[data-filtro="${sel.otro}"] img`);
    caja.hidden = !termino && !sel.otro;
    $('[data-busqueda-txt]').textContent = termino ? 'Resultados para' : marca ? 'Marca' : 'Mostrando';
    $('[data-termino]').textContent = termino || (marca ? marca.alt : sel.otro || '');
    const elegidos = Object.values(sel);
    intros.forEach(d => { d.hidden = !!termino || !elegidos.includes(d.dataset.guiaIntro); });
    const conGuia = elegidos.find(id => tabs.some(t => t.dataset.tab === id));
    if (conGuia) pestana(conGuia);
    const w = $('[data-wsp-busqueda]');
    if (w) w.href = 'https://wa.me/' + D.whatsapp + '?text=' + encodeURIComponent(D.saludo + (termino ? 'quisiera saber si tienen ' + termino + '.' : 'quisiera saber si tienen un producto que no encontré en la página.'));
  };
  const alCatalogo = () => $('#catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-filtro]');
    if (!a) return;
    e.preventDefault();
    const id = a.dataset.filtro;
    if (a.classList.contains('filtro')) {
      // Botón del catálogo: cambia solo su grupo y deja la búsqueda; tocar el marcado lo desmarca
      // (los grupos sin «Todos» se vacían así).
      const g = a.dataset.grupo, ya = sel[g] === id;
      sel = { ...sel }; delete sel[g]; if (id !== 'todos' && !ya) sel[g] = id;
    } else {
      // Menú, marca, categoría o banner: empieza de cero con ese filtro.
      sel = id === 'todos' ? {} : { [grupoDe[id] || 'otro']: id }; termino = ''; q.value = '';
    }
    limite = POR_PAGINA;
    aplicar();
    if (!a.classList.contains('filtro')) alCatalogo();
  });
  verMas.addEventListener('click', () => { limite += POR_PAGINA; aplicar(); });
  $('[data-limpiar]').addEventListener('click', () => { termino = ''; q.value = ''; sel = {}; limite = POR_PAGINA; aplicar(); });

  // Buscador de la cabecera con sugerencias
  const q = $('#q'), sug = $('#sugerencias');
  let marcado = -1;
  const cerrarSug = () => { sug.hidden = true; marcado = -1; q.setAttribute('aria-expanded', 'false'); };
  const buscar = () => {
    const palabras = norm(q.value).split(/\s+/).filter(Boolean);
    if (!palabras.length) return cerrarSug();
    const hits = tarjetas.filter(t => { const tx = norm(t.dataset.buscar); return palabras.every(w => tx.includes(w) || tx.includes(w.replace(/s$/, ''))); });
    sug.innerHTML = hits.slice(0, 6).map(t => { const p = D.productos[t.dataset.id]; return `<button type="button" class="sug" role="option" data-ir-prod="${esc(t.dataset.id)}"><img src="${esc(src(p.i))}" alt="" width="44" height="44"><span>${esc(p.n)}<small>${esc(p.m)}</small></span></button>`; }).join('')
      + (hits.length ? `<button type="button" class="sug-todo" data-ver-todo>Ver los ${hits.length} resultados</button>` : `<p class="sug" style="cursor:default">No lo encontramos. <button type="button" class="enlace" data-ver-todo>Preguntar por WhatsApp</button></p>`);
    sug.hidden = false; q.setAttribute('aria-expanded', 'true');
  };
  const verTodo = () => { termino = q.value.trim(); sel = {}; limite = POR_PAGINA; aplicar(); cerrarSug(); q.blur(); alCatalogo(); };
  q.addEventListener('input', buscar);
  q.addEventListener('keydown', e => {
    const ops = $$('.sug[data-ir-prod]', sug);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!ops.length) return; e.preventDefault();
      marcado = (marcado + (e.key === 'ArrowDown' ? 1 : -1) + ops.length) % ops.length;
      ops.forEach((o, i) => o.setAttribute('aria-selected', i === marcado ? 'true' : 'false'));
    } else if (e.key === 'Escape') cerrarSug();
  });
  $('.buscador').addEventListener('submit', e => { e.preventDefault(); const o = $$('.sug[data-ir-prod]', sug)[marcado]; o ? o.click() : verTodo(); });
  sug.addEventListener('click', e => {
    const o = e.target.closest('[data-ir-prod]');
    if (e.target.closest('[data-ver-todo]')) return verTodo();
    if (!o) return;
    cerrarSug(); q.blur(); sel = {}; termino = ''; limite = POR_PAGINA; aplicar(o.dataset.irProd);
    const t = tarjetas.find(x => x.dataset.id === o.dataset.irProd);
    t.scrollIntoView({ behavior: 'smooth', block: 'center' });
    t.classList.add('resaltado'); setTimeout(() => t.classList.remove('resaltado'), 2200);
  });
  document.addEventListener('click', e => { if (!e.target.closest('.buscador')) cerrarSug(); });

  // Pedido
  let items = [];
  try { items = JSON.parse(localStorage.getItem(CLAVE) || '[]').filter(i => D.productos[i.id]); } catch (e) { items = []; }
  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(items)); } catch (e) {} };
  const total = () => items.reduce((s, i) => s + i.cant, 0);
  const pintarCuenta = (salta) => {
    const n = total();
    $$('[data-cuenta]').forEach(c => { c.textContent = n; c.hidden = !n; if (salta) { c.classList.remove('salta'); void c.offsetWidth; c.classList.add('salta'); } });
    $('[data-cuenta-txt]').textContent = n ? `(${n} ${n === 1 ? 'producto' : 'productos'})` : '';
  };
  const pintarLista = () => {
    const ul = $('[data-lista]');
    ul.innerHTML = items.map((it, k) => {
      const p = D.productos[it.id];
      return `<li class="item"><img src="${esc(src(p.i))}" alt=""><div><p class="item-nombre">${esc(p.n)}</p>`
        + (D.total && p.v != null ? `<p class="item-precio">${esc(it.cant > 1 ? soles(p.v) + ' c/u · ' + soles(p.v * it.cant) : soles(p.v))}</p>` : '')
        + '<div class="item-controles">'
        + (p.p.length > 1 ? `<label class="oculto" for="pres-${k}">Presentación</label><select id="pres-${k}" data-k="${k}">${p.p.map(x => `<option${x === it.pres ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>` : it.pres ? `<span class="pres" aria-pressed="true">${esc(it.pres)}</span>` : '')
        + `<div class="paso"><button type="button" data-menos="${k}" aria-label="Quitar uno">${svg('menos')}</button><span aria-live="polite">${it.cant}</span><button type="button" data-mas="${k}" aria-label="Agregar uno">${svg('mas')}</button></div>`
        + `<button type="button" class="item-quitar" data-quitar="${k}" aria-label="Quitar ${esc(p.n)}">${svg('borrar')}</button></div></div></li>`;
    }).join('');
    $('[data-pedido-vacio]').hidden = items.length > 0;
    if (D.total) {
      const T = sumar(), caja = $('[data-total]');
      if (caja) { caja.hidden = !(items.length && T.t > 0); caja.innerHTML = `<span>Total${T.falta ? ' (sin lo que se confirma aparte)' : ''}</span><strong>${esc(soles(T.t))}</strong>`; }
    }
  };
  // Suma de los productos con precio fijo; `falta` = hay alguno sin precio (va «a confirmar» en el mensaje).
  function sumar() { let t = 0, falta = false; items.forEach(it => { const v = D.productos[it.id].v; if (v == null) falta = true; else t += v * it.cant; }); return { t: Math.round(t * 100) / 100, falta }; }
  const pintar = salta => { guardar(); pintarCuenta(salta); pintarLista(); pintarRepetir(); };
  const lista$ = $('[data-lista]');
  lista$.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.mas) items[+b.dataset.mas].cant++;
    else if (b.dataset.menos) { const it = items[+b.dataset.menos]; if (it.cant > 1) it.cant--; else items.splice(+b.dataset.menos, 1); }
    else if (b.dataset.quitar) items.splice(+b.dataset.quitar, 1);
    else return;
    pintar();
  });
  lista$.addEventListener('change', e => {
    const s = e.target.closest('select'); if (!s) return;
    const it = items[+s.dataset.k]; it.pres = s.value;
    const igual = items.findIndex((o, i) => o !== it && o.id === it.id && o.pres === it.pres);
    if (igual > -1) { items[igual].cant += it.cant; items.splice(items.indexOf(it), 1); }
    pintar();
  });

  let avisoT;
  const aviso = $('.aviso-agregado');
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-agregar]'); if (!b) return;
    const card = b.closest('.prod');
    const pres = ($('.pres[aria-pressed="true"]', card) || {}).dataset?.pres || D.productos[b.dataset.agregar].p[0] || '';
    const ya = items.find(i => i.id === b.dataset.agregar && i.pres === pres);
    if (ya) ya.cant++; else items.push({ id: b.dataset.agregar, pres, cant: 1 });
    pintar(true);
    if (!b.dataset.html) b.dataset.html = b.innerHTML;
    b.classList.add('listo'); b.innerHTML = svg('check') + '<span>Agregado</span>';
    clearTimeout(b._t); b._t = setTimeout(() => { b.classList.remove('listo'); b.innerHTML = b.dataset.html; }, 1600);
    $('[data-agregado-txt]').textContent = 'Agregado: ' + D.productos[b.dataset.agregar].n + (pres ? ' · ' + pres : '');
    aviso.hidden = false; clearTimeout(avisoT); avisoT = setTimeout(() => { aviso.hidden = true; }, 3200);
  });

  // Abrir y cerrar el cajón del pedido
  const cajon = $('#pedido'), velo = $('.velo');
  let antes = null;
  const abrir = () => { antes = document.activeElement; aviso.hidden = true; cajon.hidden = false; velo.hidden = false; document.body.classList.add('con-pedido'); cajon.focus(); };
  const cerrar = () => { cajon.hidden = true; velo.hidden = true; document.body.classList.remove('con-pedido'); if (antes && antes.focus) antes.focus(); };
  $$('[data-abrir-pedido]').forEach(b => b.addEventListener('click', abrir));
  $$('[data-cerrar-pedido]').forEach(b => b.addEventListener('click', e => { if (b.tagName === 'A') { cerrar(); return; } cerrar(); }));
  document.addEventListener('keydown', e => {
    if (cajon.hidden) return;
    if (e.key === 'Escape') cerrar();
    if (e.key === 'Tab') { // el foco se queda dentro del cajón
      const f = $$('button, a[href], input, select, textarea', cajon).filter(x => !x.disabled && x.offsetParent);
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  // Repetir el último pedido (3-nov-2026: el alimento se vuelve a comprar cada mes). Al enviarlo se guarda;
  // si al volver, una hora después, el pedido sigue igual, ya salió: se vacía y arriba se ofrece repetirlo.
  const ULTIMO = CLAVE + '-ultimo', SIN_BARRA = CLAVE + '-sin-repetir';
  let ultimo = null;
  try { ultimo = JSON.parse(localStorage.getItem(ULTIMO) || 'null'); } catch (e) {}
  if (ultimo) { ultimo.items = (ultimo.items || []).filter(i => D.productos[i.id]); if (!ultimo.items.length) ultimo = null; }
  if (ultimo && items.length && JSON.stringify(items) === JSON.stringify(ultimo.items) && Date.now() - ultimo.fecha > 36e5) { items = []; guardar(); }
  const barra = $('[data-repetir]');
  function pintarRepetir() {
    const hay = !!ultimo && !items.length;
    $$('.pedido-repetir').forEach(b => { b.hidden = !hay; });
    let cerrada = false;
    try { cerrada = sessionStorage.getItem(SIN_BARRA) === '1'; } catch (e) {}
    barra.hidden = !hay || cerrada;
    if (!hay) return;
    const f = new Date(ultimo.fecha), p = D.productos[ultimo.items[0].id], mas = ultimo.items.length - 1;
    const cuando = f.toDateString() === new Date().toDateString() ? 'De hoy' : 'Del ' + f.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });
    $('[data-repetir-txt]').textContent = `${cuando}: ${p.n}${ultimo.items[0].pres ? ' ' + ultimo.items[0].pres : ''}${mas ? ` y ${mas} ${mas === 1 ? 'producto' : 'productos'} más` : ''}.`;
  }
  $$('[data-repetir-si]').forEach(b => b.addEventListener('click', () => {
    items = ultimo.items.map(i => ({ ...i })); pintar(true); if (cajon.hidden) abrir();
  }));
  $('[data-repetir-no]').addEventListener('click', () => { barra.hidden = true; try { sessionStorage.setItem(SIN_BARRA, '1'); } catch (e) {} });

  // Enviar el pedido por WhatsApp
  const form = $('[data-form-pedido]');
  try { const g = JSON.parse(localStorage.getItem(CLAVE + '-datos') || '{}'); form.nombre.value = g.nombre || ''; form.distrito.value = g.distrito || ''; } catch (e) {}
  form.addEventListener('submit', e => {
    e.preventDefault();
    const err = $('[data-error]');
    const libre = form.libre.value.trim(), nombre = form.nombre.value.trim(), distrito = form.distrito.value.trim();
    err.hidden = true;
    if (!items.length && !libre) { err.textContent = 'Agregue algún producto o escriba lo que necesita.'; err.hidden = false; return; }
    if (!nombre) { err.textContent = 'Escriba su nombre para que sepamos a quién atender.'; err.hidden = false; form.nombre.focus(); return; }
    if (D.lugarReq && !distrito) { err.textContent = D.lugarError; err.hidden = false; form.distrito.focus(); return; }
    try { localStorage.setItem(CLAVE + '-datos', JSON.stringify({ nombre, distrito })); } catch (e) {}
    if (items.length) { ultimo = { items: items.map(i => ({ ...i })), fecha: Date.now() }; try { localStorage.setItem(ULTIMO, JSON.stringify(ultimo)); } catch (e) {} }
    // Con `total` cada renglón lleva lo que suma («× 2: S/ 240 (S/ 120 c/u)») y al final va el total.
    const monto = it => { const v = D.productos[it.id].v; return !D.total ? '' : v == null ? ' (precio a confirmar)' : ': ' + soles(v * it.cant) + (it.cant > 1 ? ' (' + soles(v) + ' c/u)' : ''); };
    const lineas = items.map((it, i) => `${i + 1}. ${D.productos[it.id].n}${it.pres ? ' — ' + it.pres : ''} × ${it.cant}${monto(it)}`);
    const T = D.total ? sumar() : null;
    const texto = [D.encabezado, '', ...lineas, ...(T && T.t > 0 ? ['', 'Total: ' + soles(T.t) + (T.falta ? ' (más lo que me confirme)' : '')] : []), ...(libre ? ['', (items.length ? 'Algo más: ' : '') + libre] : []), '', 'Nombre: ' + nombre, ...(distrito ? [(D.lugarMsg || 'Distrito') + ': ' + distrito] : [])].join('\n');
    window.open('https://wa.me/' + D.whatsapp + '?text=' + encodeURIComponent(texto), '_blank', 'noopener');
  });

  pintarCuenta(false); pintarLista(); pintarRepetir();
  aplicar();

  // La hoja llegó (o cambió desde la última visita): se repinta todo con lo que el visitante ya eligió
  // (filtros, búsqueda y pedido), y del pedido sale lo que la hoja ya no tiene.
  const refrescar = () => {
    leerTarjetas();
    const pista = $('.prods-pista');
    if (pista) pista.dispatchEvent(new Event('scroll'));
    items = items.filter(i => D.productos[i.id]);
    if (ultimo) { ultimo.items = ultimo.items.filter(i => D.productos[i.id]); if (!ultimo.items.length) ultimo = null; }
    pintarCuenta(false); pintarLista(); pintarRepetir();
    aplicar();
  };
  const traerHoja = async () => {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const reloj = ctl && setTimeout(() => ctl.abort(), 6000);
    try {
      const r = await fetch(HOJA.url, { cache: 'no-cache', ...(ctl ? { signal: ctl.signal } : {}) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const texto = await r.text();
      const productos = catalogoDeHoja(texto, HOJA); // si está rota lanza aquí y no se toca nada
      try { localStorage.setItem(CLAVE_HOJA, JSON.stringify({ url: HOJA.url, fecha: Date.now(), texto })); } catch (e) {}
      if (texto !== hojaTexto) { hojaTexto = texto; ponerCatalogo(productos); refrescar(); }
    } catch (e) {
      console.info('Se queda el catálogo de la página (la hoja no se pudo usar: ' + (e && e.message) + ').');
    } finally { clearTimeout(reloj); }
  };
  if (HOJA && Date.now() - hojaFecha >= FRESCO) traerHoja();
})();
