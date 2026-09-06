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
| `demos-chile` | Público. Demos de Chile. |
| `web-generator` | Privado. El generador masivo. **Va ~18 días detrás de lo publicado.** |
| `by0nder-fuentes` | Privado. Fuentes, entregables y `ESTADO.md`. |

El panel de prospección de José no es un repo: es un artifact privado de claude.ai.
Su enlace NO va aquí: este archivo es público.

En `by0nder-fuentes/memoria-de-claude/` están sus preferencias de trabajo. Si la
memoria de esta máquina todavía no las tiene, vale copiarlas: evitan repetir
conversaciones que ya se tuvieron.

---

# demos-restaurantes

Aquí viven las páginas publicadas de los clientes y los paneles de prospección.
Todo lo de esta carpeta se sirve en GitHub Pages: **lo que se commitea, se publica.**

## Cómo se editan las páginas

Casi ninguna se edita a mano. Cada una se genera desde un archivo de datos:

- **Cevichería Los Bull's** → `by0nder-fuentes/los-bulls/carta.json` + `construir.js`.
  Editar el HTML directamente hace que el próximo build lo pise.
- El resto salió de `web-generator`, aunque ese repo va detrás de lo publicado:
  antes de regenerar algo, comparar contra lo que está acá.

Si un precio o un dato aparece en dos lugares de la misma página, uno de los dos
va a quedar viejo. Ya pasó con el bloque "Lo más pedido" de Los Bull's.

## Los paneles de prospección

Cada vendedor tiene su panel en una carpeta con nombre y hash. **Los hashes NO se
escriben aquí: este archivo es público y el hash es la única protección del enlace.**
Están en `by0nder-fuentes`, que es privado. Rotar un hash revoca el acceso; si se
rota un panel hay que rotar también su guía, que lo enlaza.

Dos reglas que ya costaron caro:

**Un negocio pertenece a un solo vendedor.** Si aparece en dos paneles, recibe el
mismo mensaje dos veces de dos personas distintas y se lee como spam. Antes de
repartir, comparar los `data-slug` contra los paneles que ya existen.

**El estado "Enviado" vive en el `localStorage` del navegador de cada vendedor, no
en el HTML.** No se cambia editando el marcado. Para marcar en lote se siembra una
lista fija de slugs que corre una sola vez por navegador. La lista tiene que ser
fija: si se siembra "todas las tarjetas presentes", un lote cargado después también
queda marcado sin haberse enviado.

Cada panel habla con la voz de su vendedor. Copiar tarjetas de un panel a otro sin
reescribir el mensaje hace que alguien mande mensajes firmados por otra persona.
