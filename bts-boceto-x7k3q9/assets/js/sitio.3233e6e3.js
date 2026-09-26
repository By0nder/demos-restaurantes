/* Plantilla corporativa, sitio completo: menú del celular, leyenda del corte de
edificio y formularios que arman el mensaje (WhatsApp o correo) sin servidor. */
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
if (e.key === "Escape" && !menu.hidden) { menu.hidden = true; boton.setAttribute("aria-expanded", "false"); boton.focus(); }
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
function valor(form, nombre) {
var campo = form.elements[nombre];
return campo ? String(campo.value || "").trim() : "";
}
function enviar(form, via, asunto, texto) {
if (via === "mail") {
location.href = "mailto:" + form.dataset.email + "?subject=" + encodeURIComponent(asunto) + "&body=" + encodeURIComponent(texto);
return;
}
var url = "https://wa.me/" + form.dataset.wsp + "?text=" + encodeURIComponent(texto);
var ventana = window.open(url, "_blank", "noopener");
if (!ventana) location.href = url;
}
document.querySelectorAll("form[data-tipo]").forEach(function (form) {
var via = "wsp";
form.querySelectorAll("[data-via]").forEach(function (b) {
b.addEventListener("click", function () { via = b.getAttribute("data-via"); });
});
var motivo = form.elements.motivo;
var aviso = form.querySelector("[data-aviso-reclamo]");
if (motivo && aviso) {
motivo.addEventListener("change", function () { aviso.hidden = !/reclamaciones/i.test(motivo.value); });
}
form.addEventListener("submit", function (e) {
e.preventDefault();
var err = form.querySelector(".form-error");
var empresa = valor(form, "empresa"), nombre = valor(form, "nombre");
if (!empresa || !nombre) {
err.hidden = false;
(empresa ? form.elements.nombre : form.elements.empresa).focus();
return;
}
err.hidden = true;
var texto, asunto;
if (form.dataset.tipo === "contacto") {
var m = valor(form, "motivo") || "Consulta";
texto = "Hola, vi su página web y les escribo por: " + m + ".\nEmpresa: " + empresa + "\nContacto: " + nombre +
(valor(form, "medio") ? "\nTeléfono o correo: " + valor(form, "medio") : "") +
(valor(form, "mensaje") ? "\nMensaje: " + valor(form, "mensaje") : "");
asunto = m + " desde la web";
} else {
texto = "Hola, vi su página web y quisiera cotizar un proyecto.\nEmpresa: " + empresa + "\nContacto: " + nombre +
"\nNecesito: " + valor(form, "linea") + "\nObra en: " + (valor(form, "lugar") || "-") +
"\nEtapa: " + valor(form, "etapa") + (valor(form, "detalle") ? "\nDetalle: " + valor(form, "detalle") : "");
asunto = "Cotización desde la web";
}
enviar(form, via, asunto, texto);
});
});
})();
