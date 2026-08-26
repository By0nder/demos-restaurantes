#!/usr/bin/env python3
"""
ALTA COLINA - Genera parcelas.json (la geometria del plano vivo).

La geometria del terreno, el camino de servidumbre y las areas verdes se
vectorizo del plano del brochure. Las bandas de parcelas estan medidas sobre
ese mismo plano.

  py generar-plano.py

OJO: la numeracion de las parcelas es una LECTURA del plano rasterizado, no
un dato oficial. Cuando el cliente mande el CAD/DWG, se corrigen las bandas
de aca abajo y se vuelve a correr. Los estados y los m2 se editan en
parcelas.json directamente (este script los respeta si ya existen).
"""
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
SALIDA = RAIZ / "parcelas.json"
GEO = RAIZ / "assets" / "geometria-plano.json"

# Bandas medidas sobre el plano del brochure (sistema de coordenadas 1600 x 1435).
# Cada banda es un cuadrilatero libre: cuatro esquinas en el orden
#   sup-izq, sup-der, inf-der, inf-izq
# Asi se pueden seguir los bordes reales (el camino por arriba, el limite del
# terreno por abajo) en vez de forzar rectangulos.
# n = cuantas parcelas | desde = numero de la primera | dir = +1 izq->der, -1 der->izq
BANDAS = [
    {"id": "A",     "n":  8, "desde": 104, "dir": -1,
     "esquinas": [[636, 104], [1470, 104], [1420, 262], [583, 262]]},
    {"id": "B-sup", "n": 10, "desde":  86, "dir":  1,
     "esquinas": [[466, 306], [1205, 306], [1205, 396], [466, 396]]},
    {"id": "B-inf", "n": 10, "desde":  84, "dir": -1,
     "esquinas": [[466, 400], [1205, 400], [1205, 488], [466, 488]]},
    {"id": "C-sup", "n": 11, "desde":  61, "dir":  1,
     "esquinas": [[288, 533], [1190, 533], [1190, 623], [288, 623]]},
    {"id": "C-inf", "n": 11, "desde":  57, "dir": -1,
     "esquinas": [[288, 627], [1190, 627], [1190, 715], [288, 715]]},
    {"id": "D-sup", "n": 10, "desde":  35, "dir":  1,
     "esquinas": [[287, 758], [1105, 758], [1105, 851], [287, 851]]},
    {"id": "D-inf", "n":  9, "desde":  26, "dir": -1,
     "esquinas": [[428, 857], [1105, 857], [1105, 944], [428, 944]]},
    # El limite de abajo de la banda E sigue el borde del terreno, que hace curva:
    # por eso va como polilinea y no como recta entre dos esquinas.
    {"id": "E",     "n":  8, "desde":   9, "dir":  1,
     "sup": [[430, 1004], [1055, 990]],
     "inf": [[430, 1176], [500, 1152], [580, 1126], [660, 1102],
             [740, 1077], [820, 1061], [900, 1060], [1055, 1058]]},
]

# Parcelas de borde: irregulares, aun sin numeracion confirmada.
# Se dibujan pero no se numeran hasta tener el CAD.
BORDE_SIN_CONFIRMAR = 105 - sum(b["n"] for b in BANDAS)


def _en_x(linea, t):
    """Punto a la fraccion t (0..1) del recorrido horizontal de una polilinea."""
    x0, x1 = linea[0][0], linea[-1][0]
    x = x0 + (x1 - x0) * t
    for (ax, ay), (bx, by) in zip(linea, linea[1:]):
        if (ax <= x <= bx) or (bx <= x <= ax):
            k = 0 if bx == ax else (x - ax) / (bx - ax)
            return (x, ay + (by - ay) * k)
    return (x, linea[-1][1])


def bordes(b):
    """Devuelve (borde de arriba, borde de abajo) como polilineas."""
    if "esquinas" in b:
        (sx0, sy0), (sx1, sy1), (ix1, iy1), (ix0, iy0) = b["esquinas"]
        return [[sx0, sy0], [sx1, sy1]], [[ix0, iy0], [ix1, iy1]]
    return b["sup"], b["inf"]


def poligono(b, i):
    """Cuadrilatero de la parcela i, recortado entre los bordes de la banda."""
    sup, inf = bordes(b)
    n = b["n"]
    a, z = i / n, (i + 1) / n
    pts = [_en_x(sup, a), _en_x(sup, z), _en_x(inf, z), _en_x(inf, a)]
    return [[round(x, 1), round(y, 1)] for x, y in pts]


def main():
    previo = {}
    if SALIDA.exists():
        try:
            for p in json.loads(SALIDA.read_text(encoding="utf-8")).get("parcelas", []):
                previo[p["num"]] = p
        except Exception:
            pass

    parcelas = []
    for b in BANDAS:
        for i in range(b["n"]):
            num = b["desde"] + (i * b["dir"])
            pts = poligono(b, i)
            cx = round(sum(p[0] for p in pts) / 4, 1)
            cy = round(sum(p[1] for p in pts) / 4, 1)
            ant = previo.get(num, {})
            parcelas.append({
                "num": num,
                "banda": b["id"],
                "puntos": pts,
                "centro": [cx, cy],
                # EDITABLES A MANO - el script no los pisa
                "estado": ant.get("estado", "disponible"),   # disponible | reservada | vendida
                "m2": ant.get("m2", None),
                "nota": ant.get("nota", ""),
            })

    parcelas.sort(key=lambda p: p["num"])
    geo = json.loads(GEO.read_text(encoding="utf-8")) if GEO.exists() else {}

    data = {
        "proyecto": "Alta Colina",
        "aviso": ("Numeracion y medidas leidas del plano del brochure. "
                  "PENDIENTE de validar contra el CAD/DWG oficial."),
        "viewBox": [0, 0, 1600, 1435],
        "total_subparcelas": 106,
        "camino_servidumbre": 106,
        "vendibles_estimadas": 105,
        "numeradas_aqui": len(parcelas),
        "borde_sin_confirmar": BORDE_SIN_CONFIRMAR,
        "geometria": geo,
        "parcelas": parcelas,
    }
    SALIDA.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")

    d = sum(1 for p in parcelas if p["estado"] == "disponible")
    print(f"{len(parcelas)} parcelas numeradas ({d} disponibles)")
    print(f"{BORDE_SIN_CONFIRMAR} de borde sin numerar - faltan del CAD")
    print(f"-> {SALIDA.name}")
    if not any(p["m2"] for p in parcelas):
        print("\nNinguna tiene m2. Cuando el cliente los mande, se llenan en parcelas.json")


if __name__ == "__main__":
    main()
