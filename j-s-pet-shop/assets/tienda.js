// Plantilla tienda (2026-10-28, J&S Pet Shop): banners, carruseles, buscador, filtros y el pedido
// que se arma en la página y se abre en WhatsApp. Sin servidor; el pedido se guarda en localStorage.
(function () {
  const D = JSON.parse(document.getElementById('datos-tienda').textContent);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const norm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const CLAVE = 'pedido-' + D.slug;
  const svg = id => `<svg class="ico" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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

  // Catálogo: filtros y búsqueda
  const tarjetas = $$('#catalogo .prod');
  const filtros = $$('.filtro');
  const visibles = $('[data-visibles]');
  let filtro = 'todos', termino = '';
  const aplicar = () => {
    const palabras = norm(termino).split(/\s+/).filter(Boolean);
    let n = 0;
    tarjetas.forEach(t => {
      const tags = t.dataset.tags.split(' ');
      const texto = norm(t.dataset.buscar);
      const ok = (filtro === 'todos' || tags.includes(filtro)) && palabras.every(w => texto.includes(w) || texto.includes(w.replace(/s$/, '')));
      t.hidden = !ok; if (ok) n++;
    });
    visibles.textContent = n;
    $('[data-vacio]').hidden = n > 0;
    const caja = $('[data-busqueda]');
    caja.hidden = !termino;
    $('[data-termino]').textContent = termino;
    const w = $('[data-wsp-busqueda]');
    if (w) w.href = 'https://wa.me/' + D.whatsapp + '?text=' + encodeURIComponent(D.saludo + (termino ? 'quisiera saber si tienen ' + termino + '.' : 'quisiera saber si tienen un producto que no encontré en la página.'));
    filtros.forEach(f => f.setAttribute('aria-pressed', f.dataset.filtro === filtro ? 'true' : 'false'));
  };
  const alCatalogo = () => $('#catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-filtro]');
    if (!a) return;
    e.preventDefault();
    filtro = a.dataset.filtro; termino = ''; q.value = '';
    // Una marca o una categoría que no está entre los botones igual filtra (los botones quedan sin marcar).
    aplicar();
    if (!a.classList.contains('filtro')) alCatalogo();
  });
  $('[data-limpiar]').addEventListener('click', () => { termino = ''; q.value = ''; filtro = 'todos'; aplicar(); });

  // Buscador de la cabecera con sugerencias
  const q = $('#q'), sug = $('#sugerencias');
  const lista = Object.entries(D.productos);
  let marcado = -1;
  const cerrarSug = () => { sug.hidden = true; marcado = -1; q.setAttribute('aria-expanded', 'false'); };
  const buscar = () => {
    const palabras = norm(q.value).split(/\s+/).filter(Boolean);
    if (!palabras.length) return cerrarSug();
    const hits = tarjetas.filter(t => { const tx = norm(t.dataset.buscar); return palabras.every(w => tx.includes(w) || tx.includes(w.replace(/s$/, ''))); });
    sug.innerHTML = hits.slice(0, 6).map(t => { const p = D.productos[t.dataset.id]; return `<button type="button" class="sug" role="option" data-ir-prod="${t.dataset.id}"><img src="assets/${p.i}" alt="" width="44" height="44"><span>${esc(p.n)}<small>${esc(p.m)}</small></span></button>`; }).join('')
      + (hits.length ? `<button type="button" class="sug-todo" data-ver-todo>Ver los ${hits.length} resultados</button>` : `<p class="sug" style="cursor:default">No lo encontramos. <button type="button" class="enlace" data-ver-todo>Preguntar por WhatsApp</button></p>`);
    sug.hidden = false; q.setAttribute('aria-expanded', 'true');
  };
  const verTodo = () => { termino = q.value.trim(); filtro = 'todos'; aplicar(); cerrarSug(); q.blur(); alCatalogo(); };
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
    cerrarSug(); q.blur(); filtro = 'todos'; termino = ''; aplicar();
    const t = $(`#catalogo .prod[data-id="${o.dataset.irProd}"]`);
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
      return `<li class="item"><img src="assets/${p.i}" alt=""><div><p class="item-nombre">${esc(p.n)}</p><div class="item-controles">`
        + (p.p.length > 1 ? `<label class="oculto" for="pres-${k}">Presentación</label><select id="pres-${k}" data-k="${k}">${p.p.map(x => `<option${x === it.pres ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>` : `<span class="pres" aria-pressed="true">${esc(it.pres)}</span>`)
        + `<div class="paso"><button type="button" data-menos="${k}" aria-label="Quitar uno">${svg('menos')}</button><span aria-live="polite">${it.cant}</span><button type="button" data-mas="${k}" aria-label="Agregar uno">${svg('mas')}</button></div>`
        + `<button type="button" class="item-quitar" data-quitar="${k}" aria-label="Quitar ${esc(p.n)}">${svg('borrar')}</button></div></div></li>`;
    }).join('');
    $('[data-pedido-vacio]').hidden = items.length > 0;
  };
  const pintar = salta => { guardar(); pintarCuenta(salta); pintarLista(); };
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
    try { localStorage.setItem(CLAVE + '-datos', JSON.stringify({ nombre, distrito })); } catch (e) {}
    const lineas = items.map((it, i) => `${i + 1}. ${D.productos[it.id].n}${it.pres ? ' — ' + it.pres : ''} × ${it.cant}`);
    const texto = [D.encabezado, '', ...lineas, ...(libre ? ['', (items.length ? 'Algo más: ' : '') + libre] : []), '', 'Nombre: ' + nombre, ...(distrito ? ['Distrito: ' + distrito] : [])].join('\n');
    window.open('https://wa.me/' + D.whatsapp + '?text=' + encodeURIComponent(texto), '_blank', 'noopener');
  });

  pintarCuenta(false); pintarLista();
})();
