## Antes de responder nada

Este repo es una pieza de un negocio con varios clientes en curso y cuatro
repositorios. **El estado completo está en `ESTADO.md`, en el repo privado
`by0nder-fuentes`.** Sin leerlo se trabaja a ciegas: ahí está en qué punto quedó
cada cliente, cómo funcionan los paneles de prospección, y una lista de errores
que ya se cometieron una vez y no conviene repetir.

Si aún no lo leíste en esta sesión, hazlo ahora — no hace falta clonar nada:

```bash
gh api repos/By0nder/by0nder-fuentes/contents/ESTADO.md --jq .content | base64 -d
```

### El mapa

| Repo | Qué es |
|---|---|
| `demos-restaurantes` | Público. Las páginas publicadas y los paneles de prospección. Es lo que ve el cliente. |
| `demos-chile` | Público. Demos de Chile — proyecto muerto (31-ago-2026). |
| `web-generator` | Privado. El generador masivo. **Va ~18 días detrás de lo publicado.** |
| `by0nder-fuentes` | Privado. Fuentes, entregables y `ESTADO.md`. |

Los paneles de prospección (el de José y los de los vendedores) YA NO viven en este
repo: desde el 30-oct-2026 son privados, con usuario y clave, fuera de GitHub (dónde
están: en la PC del negocio, no aquí; este archivo es público).

En `by0nder-fuentes/memoria-de-claude/` están sus preferencias de trabajo. Si la
memoria de esta máquina todavía no las tiene, vale copiarlas: evitan repetir
conversaciones que ya se tuvieron.

---

# demos-restaurantes

Aquí viven las páginas publicadas de los clientes y las demos.
Todo lo de esta carpeta se sirve en GitHub Pages y el repo es público: **lo que se
commitea, se publica, y cualquiera lo lee en github.com** (una URL rara no protege nada).

## Cómo se editan las páginas

Casi ninguna se edita a mano. Cada una se genera desde un archivo de datos:

- **Cevichería Los Bull's** ya no vive acá: desde el 29-ago-2026 está en su repo propio
  `By0nder/cevicheria-terminal-los-bulls-web` (Cloudflare Pages, cevicheriaterminallosbulls.pe);
  su carpeta en este repo solo redirige al dominio. Se genera desde
  `by0nder-fuentes/los-bulls/carta.json` + `construir.js` — editar el HTML directamente
  hace que el próximo build lo pise.
- El resto salió de `web-generator`, aunque ese repo va detrás de lo publicado:
  antes de regenerar algo, comparar contra lo que está acá.

Si un precio o un dato aparece en dos lugares de la misma página, uno de los dos
va a quedar viejo. Ya pasó con el bloque "Lo más pedido" de Los Bull's.

## Los paneles de prospección

**Desde el 30-oct-2026 ningún panel ni guía de ventas va a este repo.** Con celulares,
precios y guiones, un panel aquí quedaba a la vista de cualquiera en github.com aunque
su carpeta tuviera un nombre con hash. Ahora son privados (usuario y clave validados en
el servidor) y en sus carpetas viejas solo queda un aviso de mudanza, sin la dirección
nueva. El `pre-commit` local frena un commit que vuelva a meter un panel. Cómo se
publican: en la PC del negocio, no aquí.

Dos reglas que ya costaron caro (siguen valiendo en los paneles privados):

**Un negocio pertenece a un solo vendedor.** Si aparece en dos paneles, recibe el
mismo mensaje dos veces de dos personas distintas y se lee como spam. Antes de
repartir, comparar los `data-slug` contra los paneles que ya existen.

**El estado "Enviado" vive en el `localStorage` del navegador de cada vendedor (y en
línea, en los paneles privados), no en el HTML.** No se cambia editando el marcado. Para marcar en lote se siembra una
lista fija de slugs que corre una sola vez por navegador. La lista tiene que ser
fija: si se siembra "todas las tarjetas presentes", un lote cargado después también
queda marcado sin haberse enviado.

Cada panel habla con la voz de su vendedor. Copiar tarjetas de un panel a otro sin
reescribir el mensaje hace que alguien mande mensajes firmados por otra persona.
