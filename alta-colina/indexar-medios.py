#!/usr/bin/env python3
"""
ALTA COLINA - Indexador de medios.

Tira fotos y videos en material/entrantes/ (o en las carpetas curadas) y corre:
    py indexar-medios.py

Genera material/web/ con versiones optimizadas y medios.json, que es lo que
la pagina lee para armar la galeria. Vuelve a correrlo cada vez que llegue
material nuevo: solo procesa lo que cambio.
"""
import json, os, subprocess, sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Falta Pillow. Instalalo con:  py -m pip install pillow")

RAIZ   = Path(__file__).resolve().parent
MAT    = RAIZ / "material"
WEB    = MAT / "web"
FOTO_EXT = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".bmp", ".tif", ".tiff"}
VIDEO_EXT = {".mp4", ".mov", ".m4v", ".avi", ".mkv", ".webm", ".3gp"}

ANCHO_GRANDE = 1800
ANCHO_THUMB  = 640
CALIDAD      = 82

# Carpetas que se indexan y con que etiqueta
CARPETAS = {
    "entrantes":         "sin-clasificar",
    "reales":            "proyecto",
    "videos":            "video",
    "planos":            "plano",
    "alrededores":       "alrededores",
    "referencia-stock":  "referencia",
    "asesor":            "asesor",
    "marca":             "marca",
}

def huella(p: Path):
    """Hash perceptual de una foto: sirve para detectar la misma toma
    aunque venga con otro nombre o reenviada por WhatsApp."""
    try:
        im = Image.open(p).convert("L").resize((12, 12), Image.LANCZOS)
    except Exception:
        return None
    px = list(im.getdata())
    prom = sum(px) / len(px)
    return "".join("1" if v > prom else "0" for v in px)


def parecidas(a, b, tope=10):
    return a and b and sum(1 for x, y in zip(a, b) if x != y) <= tope


def ffmpeg(args):
    return subprocess.run(["ffmpeg", "-y", "-loglevel", "error"] + args,
                          capture_output=True, text=True)

def tiene_ffmpeg():
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        return True
    except Exception:
        return False

def nombre_base(p: Path):
    """Slug legible y ESTABLE: no depende de la fecha del archivo, asi el HTML
    no se rompe cada vez que se vuelve a indexar."""
    limpio = "".join(c if c.isalnum() or c in "-_" else "-" for c in p.stem.lower())
    while "--" in limpio:
        limpio = limpio.replace("--", "-")
    return limpio.strip("-")[:48] or "medio"

def procesar_foto(src: Path, slug: str, cat: str):
    WEB.mkdir(parents=True, exist_ok=True)
    grande = WEB / f"{slug}.jpg"
    thumb  = WEB / f"{slug}-thumb.jpg"
    try:
        im = Image.open(src)
        im = ImageOps.exif_transpose(im).convert("RGB")
    except Exception as e:
        print(f"  ! no se pudo abrir {src.name}: {e}")
        return None
    w, h = im.size
    if not grande.exists() or src.stat().st_mtime > grande.stat().st_mtime:
        g = im.copy(); g.thumbnail((ANCHO_GRANDE, ANCHO_GRANDE), Image.LANCZOS)
        g.save(grande, "JPEG", quality=CALIDAD, optimize=True, progressive=True)
    if not thumb.exists() or src.stat().st_mtime > thumb.stat().st_mtime:
        t = im.copy(); t.thumbnail((ANCHO_THUMB, ANCHO_THUMB), Image.LANCZOS)
        t.save(thumb, "JPEG", quality=78, optimize=True, progressive=True)
    return {
        "tipo": "foto", "cat": cat, "slug": slug, "origen": src.name,
        "src": f"material/web/{grande.name}", "thumb": f"material/web/{thumb.name}",
        "w": w, "h": h,
        "orientacion": "vertical" if h > w * 1.15 else ("panoramica" if w > h * 1.6 else "horizontal"),
        "alt": "", "leyenda": "",
    }

def procesar_video(src: Path, slug: str):
    WEB.mkdir(parents=True, exist_ok=True)
    mp4    = WEB / f"{slug}.mp4"
    poster = WEB / f"{slug}-poster.jpg"
    if not tiene_ffmpeg():
        print(f"  ! sin ffmpeg, {src.name} se copia tal cual")
        return {"tipo": "video", "cat": "video", "slug": slug, "origen": src.name,
                "src": f"material/{src.parent.name}/{src.name}", "poster": "",
                "w": 0, "h": 0, "dur": 0, "alt": "", "leyenda": ""}
    w = h = 0; dur = 0.0
    try:
        pr = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0",
                             "-show_entries", "stream=width,height:format=duration",
                             "-of", "json", str(src)], capture_output=True, text=True)
        d = json.loads(pr.stdout or "{}")
        if d.get("streams"):
            w = d["streams"][0].get("width", 0); h = d["streams"][0].get("height", 0)
        dur = float(d.get("format", {}).get("duration", 0) or 0)
    except Exception:
        pass
    if not mp4.exists() or src.stat().st_mtime > mp4.stat().st_mtime:
        print(f"  · comprimiendo video {src.name} (puede tardar)")
        ffmpeg(["-i", str(src), "-vf", "scale='min(1920,iw)':-2",
                "-c:v", "libx264", "-preset", "slow", "-crf", "24",
                "-profile:v", "high", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                "-c:a", "aac", "-b:a", "128k", str(mp4)])
    if not poster.exists() or src.stat().st_mtime > poster.stat().st_mtime:
        ffmpeg(["-ss", str(min(1.0, dur / 3 if dur else 0)), "-i", str(src),
                "-frames:v", "1", "-vf", "scale='min(1800,iw)':-2", "-q:v", "3", str(poster)])
    thumb = WEB / f"{slug}-thumb.jpg"
    if poster.exists() and (not thumb.exists() or poster.stat().st_mtime > thumb.stat().st_mtime):
        try:
            t = Image.open(poster).convert("RGB")
            t.thumbnail((ANCHO_THUMB, ANCHO_THUMB), Image.LANCZOS)
            t.save(thumb, "JPEG", quality=78, optimize=True, progressive=True)
        except Exception:
            pass
    return {
        "tipo": "video", "cat": "video", "slug": slug, "origen": src.name,
        "src": f"material/web/{mp4.name}" if mp4.exists() else f"material/{src.parent.name}/{src.name}",
        "poster": f"material/web/{poster.name}" if poster.exists() else "",
        "thumb": f"material/web/{thumb.name}" if thumb.exists() else (
                 f"material/web/{poster.name}" if poster.exists() else ""),
        "w": w, "h": h, "dur": round(dur, 1),
        "orientacion": "vertical" if h > w else "horizontal",
        "alt": "", "leyenda": "",
    }

def main():
    salida = RAIZ / "medios.json"
    previo = {}
    if salida.exists():
        try:
            for m in json.loads(salida.read_text(encoding="utf-8")).get("medios", []):
                previo[m["slug"]] = m   # conserva alt y leyenda escritos a mano
        except Exception:
            pass

    medios, vistos = [], set()
    for carpeta, cat in CARPETAS.items():
        d = MAT / carpeta
        if not d.is_dir():
            continue
        for src in sorted(d.iterdir()):
            if not src.is_file():
                continue
            ext = src.suffix.lower()
            if ext not in FOTO_EXT and ext not in VIDEO_EXT:
                continue
            slug = f"{cat}-{nombre_base(src)}"
            if slug in vistos:                       # dos archivos con el mismo nombre
                n = 2
                while f"{slug}-{n}" in vistos:
                    n += 1
                slug = f"{slug}-{n}"
            vistos.add(slug)
            m = procesar_video(src, slug) if ext in VIDEO_EXT else procesar_foto(src, slug, cat)
            if not m:
                continue
            m["_origen_ruta"] = str(src)
            if slug in previo:  # no pisar lo que se decidio a mano
                for campo in ("alt", "leyenda", "cat", "orden", "galeria"):
                    if campo in previo[slug]:
                        m[campo] = previo[slug][campo]
            m.setdefault("galeria", False)   # solo entra al carrusel lo que se elige
            m.setdefault("orden", 900)
            medios.append(m)
            print(f"  ok  [{m['cat']:<16}] {src.name}")

    # borrar versiones web de material que ya no existe o que se renombro
    vivos = set()
    for m in medios:
        for k in ("src", "thumb", "poster"):
            if m.get(k):
                vivos.add(Path(m[k]).name)
    huerfanos, trabados = 0, []
    if WEB.is_dir():
        for f in WEB.iterdir():
            if f.is_file() and f.name not in vivos:
                try:
                    f.unlink(); huerfanos += 1
                except OSError:
                    # en Windows un archivo abierto (el servidor local, el navegador)
                    # no se puede borrar. No es motivo para romper todo el indexado.
                    trabados.append(f.name)
    if huerfanos:
        print(f"  {huerfanos} archivos viejos borrados de material/web")
    if trabados:
        print(f"  {len(trabados)} no se pudieron borrar porque algo los tiene abiertos:")
        for t in trabados[:4]:
            print(f"    {t}")
        print("    (cierra el servidor o el navegador y vuelve a correr esto)")

    # avisar de fotos repetidas: la misma toma con dos nombres distintos
    huellas, repetidas = [], []
    for m in medios:
        if m["tipo"] != "foto" or m["cat"] in ("marca", "plano"):
            continue
        h = huella(Path(m["_origen_ruta"])) if m.get("_origen_ruta") else None
        if h is None:
            continue
        for otro, otra_h in huellas:
            if parecidas(h, otra_h):
                repetidas.append((m["slug"], otro))
                break
        huellas.append((m["slug"], h))
    for m in medios:
        m.pop("_origen_ruta", None)
    if repetidas:
        print("")
        print("  OJO, parecen la misma foto:")
        for a, b in repetidas:
            print(f"    {a}  ~  {b}")
        print("  Si sobra alguna, muevela a material/duplicadas/ y corre esto de nuevo.")

    fotos  = sum(1 for m in medios if m["tipo"] == "foto")
    videos = sum(1 for m in medios if m["tipo"] == "video")
    salida.write_text(json.dumps({"proyecto": "Alta Colina", "fotos": fotos,
                                 "videos": videos, "medios": medios},
                                ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\n{fotos} fotos y {videos} videos -> medios.json")
    sin = [m for m in medios if not m["alt"]]
    if sin:
        print(f"{len(sin)} sin descripcion. Abre medios.json y llena \"alt\" y \"leyenda\"")
        print("de las que vayan a la galeria (ayuda a Google y a quien no ve las fotos).")

if __name__ == "__main__":
    main()
