# Alta Colina — Condominio

Sitio web del condominio **Alta Colina**: 106 sub-parcelas independizadas en SUNARP,
en El Manzano, Pampa El Taro, Santo Domingo de los Olleros (Huarochirí, Lima), a
15 minutos de la Plaza de Pachacámac.

**Ver el sitio:** https://by0nder.github.io/alta-colina/

---

## Qué tiene

| Sección | |
|---|---|
| **Portada** | Video del cerro en bucle, con la foto del pórtico como respaldo |
| **El lugar** | Por qué el cerro verdea: el fenómeno de las lomas costeras |
| **El plano vivo** | 77 parcelas clicables. Cada una abre su ficha y escribe al WhatsApp preguntando por esa parcela |
| **La obra** | Lo que ya está construido: pórtico, cerco, vías, áreas verdes, cerco vivo con goteo, biodigestores |
| **La partida** | Partida registral 15355546, verificable en SUNARP |
| **Su casa** | Los planos de arquitectura que se entregan con la parcela |
| **El recorrido** | Fotos y videos tomados en el terreno |
| **Los alrededores** | Lomas de Lúcumo, Islas Cavillaca, Plaza de Pachacámac |
| **Cómo llegar** | Video de la llegada y el mapa |
| **Visitar** | El asesor y un formulario que arma el WhatsApp |

## Cómo está hecho

HTML, CSS y JavaScript, sin dependencias ni framework. **703 KB** en la primera carga.

- **El plano** es un SVG vectorial generado desde `parcelas.json`. Pesa 8.6 KB
  (el plano original en imagen pesaba 1.4 MB).
- **Las animaciones** usan `animation-timeline: view()` — CSS puro, sin JavaScript,
  y respetan `prefers-reduced-motion`.
- **El logo** está vectorizado a mano en SVG (4 KB) y toma su color por CSS.
- El espaciado va en múltiplos de 4 px y la profundidad usa tres niveles de sombra.
- Verificado: se ve bien desde 360 px de ancho, ningún texto por debajo de 4.5:1 de
  contraste, y el plano se recorre con teclado (una tabulación y luego flechas).

## Los dos comandos

Cuando llegan fotos o videos nuevos, se tiran en `material/entrantes/` y:

```bash
py indexar-medios.py
```

Comprime, hace miniaturas, procesa los videos con ffmpeg, avisa si hay fotos
repetidas y reescribe `medios.json`. La galería se actualiza sola.

Cuando cambian los datos de las parcelas:

```bash
py generar-plano.py
```

Los campos `estado`, `m2` y `nota` se editan a mano en `parcelas.json` y el script
no los pisa. Estados: `disponible`, `reservada`, `vendida`.

## Verlo en local

```bash
py -m http.server 8811
```

Y abrir <http://localhost:8811>.

---

**Contacto del proyecto:** 907 155 138 · panorama-pachacamac@live.com
