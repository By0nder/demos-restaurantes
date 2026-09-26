/* Plantilla corporativa, sitio completo: menú del celular, leyenda del corte de
edificio, WhatsApp flotante y el formulario de contacto (se envía a contacto.php;
si el servidor falla, el mismo mensaje sale por WhatsApp o por correo). */
(function () {
"use strict";
if (location.protocol === "file:") {
document.querySelectorAll("a[href]").forEach(function (a) {
var h = a.getAttribute("href");
if (!h || /^([a-z]+:|#|\/\/)/i.test(h)) return;
var partes = h.split("#");
if (partes[0] === "" ) return;
if (/\/$/.test(partes[0]) || partes[0] === "." || partes[0] === "..") {
partes[0] = partes[0].replace(/\/?$/, "/") + "index.html";
a.setAttribute("href", partes.join("#"));
}
});
}
var boton = document.querySelector(".menu-boton");
var menu = document.getElementById("menu-movil");
if (boton && menu) {
boton.addEventListener("click", function () {
var abierto = boton.getAttribute("aria-expanded") === "true";
boton.setAttribute("aria-expanded", String(!abierto));
boton.setAttribute("aria-label", abierto ? "Abrir menú" : "Cerrar menú");
menu.hidden = abierto;
});
menu.addEventListener("click", function (e) {
if (e.target.closest("a")) { menu.hidden = true; boton.setAttribute("aria-expanded", "false"); boton.setAttribute("aria-label", "Abrir menú"); }
});
document.addEventListener("keydown", function (e) {
if (e.key === "Escape" && !menu.hidden) { menu.hidden = true; boton.setAttribute("aria-expanded", "false"); boton.setAttribute("aria-label", "Abrir menú"); boton.focus(); }
});
}
var diag = document.querySelector(".diagrama");
document.querySelectorAll(".leyenda a").forEach(function (a) {
var clave = a.getAttribute("data-sis");
function on() {
if (!diag) return;
diag.classList.add("enfocado");
diag.querySelectorAll("[data-sis]").forEach(function (g) { g.classList.toggle("activo", g.getAttribute("data-sis") === clave); });
a.classList.add("activo");
}
function off() {
if (!diag) return;
diag.classList.remove("enfocado");
diag.querySelectorAll(".activo").forEach(function (g) { g.classList.remove("activo"); });
a.classList.remove("activo");
}
a.addEventListener("mouseenter", on); a.addEventListener("focus", on);
a.addEventListener("mouseleave", off); a.addEventListener("blur", off);
});
var flotante = document.querySelector(".flotante");
if (flotante) {
var vigilados = document.querySelectorAll("[data-oculta-flotante]");
if (!("IntersectionObserver" in window) || !vigilados.length) {
flotante.classList.add("visible");
} else {
var enPantalla = [];
var observador = new IntersectionObserver(function (entradas) {
entradas.forEach(function (e) {
var i = enPantalla.indexOf(e.target);
if (e.isIntersecting && i < 0) enPantalla.push(e.target);
if (!e.isIntersecting && i >= 0) enPantalla.splice(i, 1);
});
var mostrar = enPantalla.length === 0;
flotante.classList.toggle("visible", mostrar);
document.body.classList.toggle("con-flotante", mostrar);
});
vigilados.forEach(function (el) { observador.observe(el); });
}
}
function abrirWhatsApp(url) {
var ventana = window.open(url, "_blank");
if (ventana) { try { ventana.opener = null; } catch (e) { /* otra ventana */ } }
else { location.href = url; }
}
function campo(form, nombre) { return form.elements[nombre] || null; }
function valor(form, nombre) {
var c = campo(form, nombre);
return c ? String(c.value || "").trim() : "";
}
function esCotizacion(form) { return /cotizaci/i.test(valor(form, "motivo") || "Cotización"); }
function textoOpcion(select) {
var o = select && select.options[select.selectedIndex];
return o && o.value ? o.text : "";
}
function armarMensaje(form) {
var motivo = valor(form, "motivo") || "Consulta";
var t = "Hola, vi su página web y les escribo por: " + motivo + ".\nEmpresa: " + valor(form, "empresa") + "\nContacto: " + valor(form, "nombre");
if (valor(form, "medio")) t += "\nTeléfono o correo: " + valor(form, "medio");
if (esCotizacion(form)) {
if (textoOpcion(campo(form, "solucion"))) t += "\nNecesito: " + textoOpcion(campo(form, "solucion"));
if (valor(form, "lugar")) t += "\nObra en: " + valor(form, "lugar");
if (valor(form, "etapa")) t += "\nEtapa: " + valor(form, "etapa");
}
if (valor(form, "mensaje")) t += "\nMensaje: " + valor(form, "mensaje");
return { texto: t, asunto: motivo + " desde la web" };
}
function errorDe(form) {
var err = form.querySelector(".form-error");
if (err && !err.id) err.id = (form.id || "formulario") + "-error";
return err;
}
function marcar(c, invalido, idError) {
if (!c) return;
if (invalido) { c.setAttribute("aria-invalid", "true"); c.setAttribute("aria-describedby", idError); }
else if (c.getAttribute("aria-invalid")) { c.removeAttribute("aria-invalid"); c.removeAttribute("aria-describedby"); }
}
function mostrarError(form, texto) {
var err = errorDe(form);
if (!err) return;
err.textContent = texto;
err.hidden = false;
}
function validar(form, via) {
var err = errorDe(form);
var pedidos = [["empresa", "la empresa o entidad"], ["nombre", "su nombre y cargo"]];
if (via === "web" && campo(form, "medio")) pedidos.push(["medio", "un teléfono o correo"]);
var faltan = pedidos.filter(function (p) { return campo(form, p[0]) && !valor(form, p[0]); });
var medio = valor(form, "medio");
if (via === "web" && medio && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(medio) && medio.replace(/\D/g, "").length < 7) {
faltan.push(["medio", "un teléfono (7 dígitos o más) o un correo válido"]);
}
pedidos.forEach(function (p) { marcar(campo(form, p[0]), faltan.some(function (f) { return f[0] === p[0]; }), err ? err.id : ""); });
if (!faltan.length) { if (err) err.hidden = true; return true; }
var lista = faltan.map(function (p) { return p[1]; });
var ultima = lista.pop();
mostrarError(form, "Para responderle nos falta " + (lista.length ? lista.join(", ") + " y " + ultima : ultima) + ".");
campo(form, faltan[0][0]).focus();
return false;
}
function estado(form, texto) {
var e = form.querySelector(".form-estado");
if (!e) return;
e.textContent = texto || "";
e.hidden = !texto;
}
function enviarLocal(form, via) {
var m = armarMensaje(form);
if (via === "mail") {
location.href = "mailto:" + form.dataset.email + "?subject=" + encodeURIComponent(m.asunto) + "&body=" + encodeURIComponent(m.texto);
} else {
abrirWhatsApp("https://wa.me/" + form.dataset.wsp + "?text=" + encodeURIComponent(m.texto));
}
}
function enviarWeb(form, boton) {
if (!window.fetch || !window.FormData) { form.submit(); return; }
var fallar = function (texto) {
boton.disabled = false; boton.removeAttribute("aria-busy");
estado(form, "");
mostrarError(form, (texto || "No pudimos enviar su mensaje desde la web.") + " Puede enviarlo ahora por WhatsApp o por correo con los botones de abajo: el texto ya va escrito.");
var alterna = form.querySelector(".form-alterna");
if (alterna) { alterna.classList.add("resaltada"); var b = alterna.querySelector("button"); if (b) b.focus(); }
};
boton.disabled = true; boton.setAttribute("aria-busy", "true");
estado(form, "Enviando su mensaje…");
var datos = new FormData(form);
datos.append("via", "web");
var control = window.AbortController ? new AbortController() : null;
var reloj = setTimeout(function () { if (control) control.abort(); }, 20000);
fetch(form.getAttribute("action"), { method: "POST", body: datos, headers: { Accept: "application/json" }, credentials: "same-origin", signal: control ? control.signal : undefined })
.then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }, function () { return { ok: false, j: null }; }); })
.then(function (x) {
clearTimeout(reloj);
if (x.ok && x.j && x.j.ok) { location.href = form.dataset.gracias; return; }
if (x.j && x.j.error === "validacion") {
boton.disabled = false; boton.removeAttribute("aria-busy"); estado(form, "");
mostrarError(form, x.j.mensaje || "Revise los datos del formulario.");
return;
}
fallar(x.j && x.j.mensaje);
}, function () { clearTimeout(reloj); fallar(null); });
}
document.querySelectorAll("form[data-tipo]").forEach(function (form) {
var via = null;
form.querySelectorAll("[data-via]").forEach(function (b) {
b.addEventListener("click", function () { via = b.getAttribute("data-via"); });
});
var motivo = campo(form, "motivo");
var aviso = form.querySelector("[data-aviso-reclamo]");
var deObra = form.querySelector("[data-solo-cotizacion]");
var alCambiarMotivo = function () {
if (aviso) aviso.hidden = !/reclamaciones/i.test(motivo.value);
if (deObra) deObra.hidden = !esCotizacion(form);
};
if (motivo) { motivo.addEventListener("change", alCambiarMotivo); alCambiarMotivo(); }
form.addEventListener("input", function (e) {
if (e.target.getAttribute && e.target.getAttribute("aria-invalid") && String(e.target.value || "").trim()) marcar(e.target, false);
});
form.addEventListener("submit", function (e) {
e.preventDefault();
var quien = e.submitter && e.submitter.getAttribute("data-via") ? e.submitter : null;
var elegido = (quien && quien.getAttribute("data-via")) || via || (form.getAttribute("action") ? "web" : "wsp");
via = null;
if (!validar(form, elegido)) return;
if (elegido === "web") enviarWeb(form, quien || form.querySelector('[data-via="web"]') || form.querySelector("[type=submit]"));
else enviarLocal(form, elegido);
});
});
})();
