// Interacciones de la página: modo claro/oscuro, menú móvil, animaciones de
// scroll y el formulario de cita que arma el mensaje de WhatsApp.
//
// Nota: a propósito NO se incluye el sello de "abierto ahora". Del salón
// todavía no se conoce el horario, y un cartel que diga "cerrado" cuando en
// realidad está abierto le cuesta clientes. Vuelve apenas nos pasen el horario.

document.addEventListener("DOMContentLoaded", () => {
  /* --- Modo claro / oscuro -------------------------------------------------
     El tema ya se aplicó en el <head> para que no haya fogonazo blanco al
     cargar; acá solo va el botón, que además recuerda la elección. */
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

  /* --- Menú móvil --------------------------------------------------------- */
  const toggle = document.getElementById("menu-toggle");
  const mobileMenu = document.getElementById("mobile-menu");
  if (toggle && mobileMenu) {
    const abrirCerrar = (abrir) => {
      mobileMenu.classList.toggle("hidden", !abrir);
      toggle.setAttribute("aria-expanded", abrir ? "true" : "false");
      toggle.setAttribute("aria-label", abrir ? "Cerrar menú" : "Abrir menú");
    };
    toggle.addEventListener("click", () => abrirCerrar(mobileMenu.classList.contains("hidden")));
    mobileMenu.querySelectorAll("a").forEach((link) =>
      link.addEventListener("click", () => abrirCerrar(false))
    );
  }

  /* --- Animación de aparición al hacer scroll ----------------------------- */
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
      { threshold: 0.15 }
    );
    revealElements.forEach((el) => observer.observe(el));
  } else {
    revealElements.forEach((el) => el.classList.add("visible"));
  }

  /* --- Formulario de cita -------------------------------------------------
     No manda correos ni guarda nada: junta lo que la persona escribió y abre
     su WhatsApp con el mensaje ya redactado. Así el salón recibe la consulta
     donde ya atiende, y no hace falta ningún servidor. */
  const form = document.getElementById("form-cita");
  if (form) {
    const aviso = document.getElementById("cita-error");
    const wsp = "51980572356";
    const encabezado = "Hola Barberia Ercovoz, vi su página web y quisiera pedir una cita:";

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const campos = form.querySelectorAll(".campo-cita");
      const faltan = [];
      const lineas = [];

      campos.forEach((c) => {
        const valor = (c.value || "").trim();
        const etiqueta = c.getAttribute("data-etiqueta") || c.name;
        if (c.hasAttribute("data-requerido") && !valor) {
          faltan.push(etiqueta);
          c.style.borderColor = "var(--color-acento)";
          return;
        }
        c.style.borderColor = "";
        if (valor) lineas.push("• " + etiqueta + ": " + valor);
      });

      if (faltan.length) {
        aviso.textContent = "Nos falta: " + faltan.join(", ") + ".";
        aviso.classList.remove("hidden");
        return;
      }
      aviso.classList.add("hidden");

      const texto = encabezado + "\n\n" + lineas.join("\n");
      window.open("https://wa.me/" + wsp + "?text=" + encodeURIComponent(texto), "_blank", "noopener");
    });
  }
});
