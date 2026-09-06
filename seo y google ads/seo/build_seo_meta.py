#!/usr/bin/env python3
"""
SEO metadata for every page of the redesigned serresdrive.com, generated from
../fleet.json so titles, prices and slugs can never drift from the fleet.

Outputs (this folder):
  seo-meta.json     per page: url, type, title, description, h1, canonical,
                    index, schema types, breadcrumb, internal links — the
                    programmer renders <head> and JSON-LD from this file
  seo-page-map.md   the same as a readable table (RU headings, ES copy)
  seo-page-map.csv  for spreadsheets
  sitemap.xml       every indexable URL of the new site
  redirects/_redirects   Netlify/Cloudflare-style 301 map (old → new)
  redirects/htaccess.txt Apache RewriteRule version of the same map

Run:  python3 build_seo_meta.py
"""
import csv
import json
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
FLEET = json.loads((HERE.parent / "fleet.json").read_text(encoding="utf-8"))
META = FLEET["_meta"]
BASE = META["base_url"]
CARS = FLEET["cars"]
TODAY = date.today().isoformat()

TITLE_MAX = 65        # Google shows ~60; >65 gets cut on desktop
DESC_MIN, DESC_MAX = 110, 160


def eur(n):
    return f"{n:,}".replace(",", ".")


def car_url(c):
    return META["url_pattern_car"].format(slug=c["slug"])


def brand_url(slug):
    return META["url_pattern_brand"].format(brand_slug=slug)


# Names used in titles when the fleet name is too long for 65 chars.
SEO_NAME = {
    "porsche-911-cabrio": "Porsche 911 Cabrio",
    "porsche-911-carrera-s": "Porsche 911 Carrera S",
}

# Brand pages (home grid order): slug → display name
BRANDS = {
    "porsche": "Porsche",
    "lamborghini": "Lamborghini",
    "mercedes-amg": "Mercedes-AMG",
    "audi": "Audi",
    "range-rover": "Range Rover",
    "volkswagen": "Volkswagen",
}
NUM = {1: "Un", 2: "Dos", 3: "Tres", 4: "Cuatro", 5: "Cinco"}

# What each car page links to besides its brand page (same-segment neighbours).
RELATED = {
    "mercedes-amg-g63": ["lamborghini-urus", "porsche-cayenne-hybrid", "range-rover-velar"],
    "lamborghini-urus": ["mercedes-amg-g63", "porsche-cayenne-hybrid", "audi-rs6-avant"],
    "audi-rs6-avant": ["porsche-911-carrera-s", "lamborghini-urus", "audi-rs3-sportback"],
    "porsche-911-cabrio": ["porsche-911-carrera-s", "audi-rs6-avant", "porsche-cayenne-hybrid"],
    "porsche-911-carrera-s": ["porsche-911-cabrio", "audi-rs6-avant", "mercedes-amg-a45"],
    "porsche-cayenne-hybrid": ["mercedes-amg-g63", "lamborghini-urus", "range-rover-velar"],
    "mercedes-amg-a45": ["audi-rs3-sportback", "volkswagen-golf-r", "audi-rsq3"],
    "audi-rs3-sportback": ["mercedes-amg-a45", "audi-rsq3", "volkswagen-golf-r"],
    "audi-rsq3": ["audi-rs3-sportback", "range-rover-velar", "mercedes-amg-a45"],
    "volkswagen-golf-r": ["audi-rs3-sportback", "mercedes-amg-a45", "mercedes-a200-4matic"],
    "range-rover-velar": ["audi-rsq3", "mercedes-glc", "porsche-cayenne-hybrid"],
    "mercedes-glc": ["range-rover-velar", "mercedes-a200-4matic", "audi-rsq3"],
    "mercedes-a200-4matic": ["mercedes-glc", "volkswagen-golf-r", "mercedes-amg-a45"],
}

pages = []


def add(url, ptype, title, desc, h1, schema, crumbs, links, index=True, priority=0.5, changefreq="monthly", extra=None):
    p = {
        "url": url, "canonical": BASE + url, "type": ptype, "index": index,
        "title": title, "description": desc, "h1": h1,
        "schema": schema, "breadcrumb": crumbs, "links_to": links,
        "sitemap": {"priority": priority, "changefreq": changefreq},
    }
    if extra:
        p.update(extra)
    pages.append(p)
    return p


# ---------------------------------------------------------------- hub pages
add("/", "home",
    "Alquiler de coches de lujo en Barcelona | Serres Drive",
    "Porsche 911, Mercedes-AMG G63, Lamborghini Urus, Audi RS6 y Range Rover Velar. Entrega en tu hotel o en el aeropuerto de El Prat. Reserva por WhatsApp.",
    "Alquiler de coches de lujo en Barcelona",
    ["Organization", "AutoRental", "WebSite"], [],
    ["/flota"] + [brand_url(b) for b in BRANDS] + ["/tarifas", "/como-funciona", "/contacto"],
    priority=1.0, changefreq="weekly")

add("/flota", "flota",
    "Flota: 13 coches de lujo de alquiler en Barcelona | Serres Drive",
    "Toda la flota disponible hoy: Porsche, Lamborghini, Mercedes-AMG, Audi, Range Rover y Volkswagen. Precio por día en cada ficha. Filtra por marca.",
    "Flota de coches de lujo en Barcelona",
    ["ItemList", "BreadcrumbList"], [("Inicio", "/")],
    [car_url(c) for c in CARS] + [brand_url(b) for b in BRANDS] + ["/tarifas"],
    priority=0.9, changefreq="weekly")

for bslug, bname in BRANDS.items():
    cars = [c for c in CARS if c["brand_slug"] == bslug]
    pmin = min(c["price"]["1d"] for c in cars)
    models = ", ".join(c["name"].replace(bname + " ", "").replace("Mercedes-Benz ", "").replace("Mercedes ", "") for c in cars)
    n = len(cars)
    btitle = f"Alquiler {bname} en Barcelona desde {eur(pmin)} €/día | Serres Drive"
    if len(btitle) > TITLE_MAX:
        btitle = f"Alquiler {bname} en Barcelona desde {eur(pmin)} €/día"
    add(brand_url(bslug), "brand",
        btitle,
        (f"{NUM[n]} {bname} de alquiler en Barcelona: {models}. Precios por día, semana y mes. "
         f"Entrega en hotel o aeropuerto por 100 €. Reserva por WhatsApp.")[:DESC_MAX],
        f"Alquiler {bname} en Barcelona",
        ["ItemList", "BreadcrumbList", "FAQPage"], [("Inicio", "/"), ("Flota", "/flota")],
        [car_url(c) for c in cars] + ["/flota", "/tarifas", "/como-funciona"],
        priority=0.8, changefreq="weekly",
        extra={"brand_slug": bslug, "cars": [c["slug"] for c in cars], "min_price_1d": pmin})

# ---------------------------------------------------------------- car pages
for c in CARS:
    p = c["price"]
    name = SEO_NAME.get(c["slug"], c["name"])
    title = f"Alquiler {name} en Barcelona desde {eur(p['1d'])} €/día | Serres Drive"
    if len(title) > TITLE_MAX:
        title = f"Alquiler {name} en Barcelona desde {eur(p['1d'])} €/día"
    desc = (f"Alquila el {c['name']} en Barcelona: {eur(p['1d'])} € por día, {eur(p['2d'])} € dos días, "
            f"{eur(p['week'])} € por semana. Entrega en hotel o aeropuerto por 100 €. Reserva por WhatsApp.")
    if len(desc) > DESC_MAX:
        desc = (f"Alquila el {c['name']} en Barcelona: {eur(p['1d'])} € por día, {eur(p['week'])} € por semana. "
                f"Entrega en hotel o aeropuerto por 100 €. Reserva por WhatsApp.")
    bpage = brand_url(c["brand_slug"])
    bname = BRANDS[c["brand_slug"]]
    add(car_url(c), "car", title, desc,
        f"Alquiler {c['name']} en Barcelona",
        ["Product", "Offer", "BreadcrumbList", "FAQPage"],
        [("Inicio", "/"), ("Flota", "/flota"), (bname, bpage)],
        [bpage] + [car_url(x) for x in CARS if x["slug"] in RELATED.get(c["slug"], [])] + ["/tarifas", "/como-funciona", "/condiciones-de-alquiler"],
        priority=0.8, changefreq="monthly",
        extra={"slug": c["slug"], "brand": c["brand"], "price": p, "price_source": c.get("price_source"),
               "deposit_eur": c["deposit_eur"], "og_image": c.get("image")})

# ---------------------------------------------------------------- service pages
add("/tarifas", "tarifas",
    "Tarifas de alquiler de coches de lujo en Barcelona | Serres Drive",
    "Precios por 1, 2 y 3 días, semana y mes de los 13 coches: desde 150 €/día (Mercedes A200) hasta el Lamborghini Urus. Fianza desde 2.000 €. Sin sorpresas.",
    "Tarifas de alquiler",
    ["Table", "BreadcrumbList"], [("Inicio", "/")],
    [car_url(c) for c in CARS] + ["/como-funciona", "/condiciones-de-alquiler"],
    priority=0.8, changefreq="weekly")

add("/como-funciona", "como-funciona",
    "Cómo funciona: elige, reserva, entrega y conduce | Serres Drive",
    "Cuatro pasos: elige tu coche, reserva por WhatsApp, recíbelo en tu hotel, casa o aeropuerto (100 €) y conduce. Fianza desde 2.000 €. Condiciones claras.",
    "Cómo funciona",
    ["HowTo", "FAQPage", "BreadcrumbList"], [("Inicio", "/")],
    ["/flota", "/tarifas", "/condiciones-de-alquiler", "/contacto"],
    priority=0.6)

add("/condiciones-de-alquiler", "condiciones",
    "Condiciones y requisitos de alquiler | Serres Drive",
    "Desde 18 años con carnet en vigor, sin antigüedad mínima. 150 km por día incluidos. Fianza desde 2.000 €. Entrega en hotel o aeropuerto por 100 €.",
    "Condiciones de alquiler",
    ["FAQPage", "BreadcrumbList"], [("Inicio", "/")],
    ["/como-funciona", "/tarifas", "/contacto"],
    priority=0.6,
    extra={"conditions": META.get("conditions"),
           "content_note": "Confirmado 03.09: 18 años, solo carnet en vigor, 150 km/día (unidad por confirmar). Pendiente: seguro/franquicia, precio km extra, combustible, cancelación, documentos."})

add("/por-que-serres", "about",
    "Por qué Serres Drive | Alquiler de coches de lujo en Barcelona",
    "Solo publicamos los coches que puedes reservar hoy. Cada vehículo pasa por el detailing de Serres Wrap Center antes de la entrega. Reserva directa por WhatsApp.",
    "Por qué Serres Drive",
    ["AboutPage", "BreadcrumbList"], [("Inicio", "/")],
    ["/flota", "/como-funciona", "/contacto"],
    priority=0.4)

add("/contacto", "contacto",
    "Contacto | Serres Drive, alquiler de coches de lujo en Barcelona",
    "Escríbenos por WhatsApp con el coche y las fechas y te confirmamos disponibilidad al momento. Sant Cugat del Vallès, entregas en toda el área de Barcelona.",
    "Contacto",
    ["AutoRental", "ContactPage", "BreadcrumbList"], [("Inicio", "/")],
    ["/flota", "/como-funciona"],
    priority=0.5)

# ---------------------------------------------------------------- occasion pages (phase 2, see content-plan.md)
add("/bodas", "landing",
    "Coche de lujo para bodas en Barcelona, sin chófer | Serres Drive",
    "Porsche 911 Cabrio, Lamborghini Urus o Mercedes-AMG G63 para tu boda: tú conduces. Entrega y recogida en el lugar de la boda por 100 €. Precios por día.",
    "Coche de lujo para tu boda en Barcelona",
    ["Service", "FAQPage", "BreadcrumbList"], [("Inicio", "/")],
    ["/coches/porsche-911-cabrio", "/coches/lamborghini-urus", "/coches/mercedes-amg-g63", "/flota", "/tarifas"],
    priority=0.7, extra={"phase": 2})

add("/eventos-y-rodajes", "landing",
    "Coche de lujo para eventos y rodajes en Barcelona | Serres Drive",
    "Porsche, Lamborghini, Mercedes-AMG, Audi y Range Rover para sesiones de fotos, videoclips, rodajes y eventos. Entrega en el lugar del evento por 100 €.",
    "Coches de lujo para eventos, rodajes y sesiones de fotos",
    ["Service", "FAQPage", "BreadcrumbList"], [("Inicio", "/")],
    ["/flota", "/coches/mercedes-amg-g63", "/coches/lamborghini-urus", "/coches/porsche-911-carrera-s", "/tarifas"],
    priority=0.6, extra={"phase": 2})

add("/entrega-aeropuerto-barcelona", "landing",
    "Coches de lujo en el aeropuerto de Barcelona | Serres Drive",
    "Recoge tu Porsche, Lamborghini, Mercedes-AMG o Range Rover al aterrizar en El Prat: entrega en la terminal por 100 €. Reserva por WhatsApp antes de volar.",
    "Entrega en el aeropuerto de Barcelona-El Prat",
    ["Service", "FAQPage", "BreadcrumbList"], [("Inicio", "/")],
    ["/flota", "/como-funciona", "/tarifas"],
    priority=0.6, extra={"phase": 2})

# ---------------------------------------------------------------- legal (indexable, low priority)
for url, t, d, h in [
    ("/politica-de-privacidad", "Política de privacidad | Serres Drive", "Cómo tratamos tus datos personales al reservar por WhatsApp o formulario. Responsable, finalidad, derechos y plazos de conservación.", "Política de privacidad"),
    ("/politica-de-cookies", "Política de cookies | Serres Drive", "Qué cookies usa serresdrive.com (analítica y publicidad de Google), para qué sirven y cómo cambiar tu consentimiento en cualquier momento.", "Política de cookies"),
    ("/aviso-legal", "Aviso legal | Serres Drive", "Datos identificativos del titular de serresdrive.com, condiciones de uso del sitio, propiedad intelectual y legislación aplicable.", "Aviso legal"),
]:
    add(url, "legal", t, d, h, ["WebPage"], [("Inicio", "/")], [], priority=0.2, changefreq="yearly")

# ---------------------------------------------------------------- redirects
redirects = {}
for c in CARS:
    if c.get("legacy_url"):
        redirects[c["legacy_url"]] = car_url(c)
for old, new in FLEET["legacy_pages_to_redirect"].items():
    if old.startswith("_"):
        continue
    redirects[old] = new
# brief-style filter URLs → static brand pages
for b in BRANDS:
    redirects[f"/flota?marca={b}"] = brand_url(b)
redirects["/why.html"] = "/por-que-serres"
for cat in ("Deportivo", "Descapotable", "Lujo", "SUV"):
    redirects[f"/fleet.html?cat={cat}"] = "/flota"


# ---------------------------------------------------------------- checks + outputs
def check():
    probs = []
    seen = set()
    known = {q["url"] for q in pages}
    for p in pages:
        if p["url"] in seen:
            probs.append(f"duplicate url {p['url']}")
        seen.add(p["url"])
        if len(p["title"]) > TITLE_MAX:
            probs.append(f"title {len(p['title'])} > {TITLE_MAX}: {p['url']}")
        if not (DESC_MIN <= len(p["description"]) <= DESC_MAX):
            probs.append(f"description {len(p['description'])} outside {DESC_MIN}-{DESC_MAX}: {p['url']}")
        for l in p["links_to"]:
            if l not in known:
                probs.append(f"{p['url']} links to unknown {l}")
    for old, new in redirects.items():
        if new not in known and new != "/flota":
            probs.append(f"redirect target unknown: {old} → {new}")
    titles = [p["title"] for p in pages]
    if len(set(titles)) != len(titles):
        probs.append("duplicate titles")
    return probs


def write_outputs():
    (HERE / "seo-meta.json").write_text(json.dumps({
        "site": {"base_url": BASE, "name": "Serres Drive", "lang": "es",
                 "generated": TODAY, "source": "fleet.json",
                 "title_max": TITLE_MAX, "description_range": [DESC_MIN, DESC_MAX]},
        "pages": pages, "redirects_301": redirects,
    }, ensure_ascii=False, indent=1), encoding="utf-8")

    with (HERE / "seo-page-map.csv").open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["url", "type", "phase", "index", "title", "title_len", "description", "desc_len", "h1", "schema", "links_to"])
        for p in pages:
            w.writerow([p["url"], p["type"], p.get("phase", 1), p["index"], p["title"], len(p["title"]),
                        p["description"], len(p["description"]), p["h1"], ";".join(p["schema"]), ";".join(p["links_to"])])

    L = ["# SERRES DRIVE — карта страниц и мета‑данных нового сайта",
         "",
         f"Сгенерировано из `fleet.json` ({TODAY}) скриптом `build_seo_meta.py`. Не править вручную — правки в `fleet.json` или в скрипте, затем перегенерировать. "
         f"Лимиты: title ≤ {TITLE_MAX}, description {DESC_MIN}–{DESC_MAX} символов. Программист берёт то же самое из `seo-meta.json`.",
         "",
         f"**Страниц в фазе 1:** {sum(1 for p in pages if p.get('phase', 1) == 1)} · **в фазе 2 (occasion landings):** {sum(1 for p in pages if p.get('phase', 1) == 2)} · **301‑редиректов:** {len(redirects)}",
         ""]
    for ptype, label in [("home", "Главная"), ("flota", "Каталог"), ("brand", "Страницы брендов"), ("car", f"Страницы машин ({len(CARS)})"),
                         ("tarifas", "Тарифы"), ("como-funciona", "Как работает"), ("condiciones", "Условия аренды"),
                         ("about", "О нас"), ("contacto", "Контакт"), ("landing", "Occasion‑лендинги (фаза 2)"), ("legal", "Юридические")]:
        rows = [p for p in pages if p["type"] == ptype]
        if not rows:
            continue
        L.append(f"## {label}\n")
        L.append("| URL | Title | Description | H1 | Schema |")
        L.append("|---|---|---|---|---|")
        for p in rows:
            L.append(f"| `{p['url']}` | {p['title']} ({len(p['title'])}) | {p['description']} ({len(p['description'])}) | {p['h1']} | {', '.join(p['schema'])} |")
        L.append("")
    L.append("## 301‑редиректы (старый → новый)\n")
    L.append("| Старый URL | Новый URL |")
    L.append("|---|---|")
    for old, new in redirects.items():
        L.append(f"| `{old}` | `{new}` |")
    (HERE / "seo-page-map.md").write_text("\n".join(L) + "\n", encoding="utf-8")

    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for p in pages:
        if not p["index"] or p.get("phase", 1) != 1:
            continue
        sm += ["  <url>", f"    <loc>{p['canonical']}</loc>", f"    <lastmod>{TODAY}</lastmod>",
               f"    <changefreq>{p['sitemap']['changefreq']}</changefreq>", f"    <priority>{p['sitemap']['priority']}</priority>", "  </url>"]
    sm.append("</urlset>")
    (HERE / "sitemap.xml").write_text("\n".join(sm) + "\n", encoding="utf-8")

    rd = HERE / "redirects"
    rd.mkdir(exist_ok=True)
    (rd / "_redirects").write_text("\n".join(f"{o}  {n}  301" for o, n in redirects.items() if "?" not in o) + "\n", encoding="utf-8")
    ht = ["RewriteEngine On"]
    for o, n in redirects.items():
        if "?" in o:
            path, q = o.split("?", 1)
            ht += [f"RewriteCond %{{QUERY_STRING}} ^{q}$", f"RewriteRule ^{path.lstrip('/')}$ {n}? [R=301,L]"]
        else:
            ht.append(f"RewriteRule ^{o.lstrip('/')}$ {n} [R=301,L]")
    (rd / "htaccess.txt").write_text("\n".join(ht) + "\n", encoding="utf-8")


if __name__ == "__main__":
    probs = check()
    if probs:
        print("PROBLEMS:")
        for x in probs:
            print(" ", x)
        raise SystemExit(1)
    write_outputs()
    n1 = sum(1 for p in pages if p.get("phase", 1) == 1)
    print(f"OK: {len(pages)} pages ({n1} phase 1), {len(redirects)} redirects → seo-meta.json, seo-page-map.md/.csv, sitemap.xml, redirects/")
    for p in pages:
        print(f"  [{len(p['title']):>2}/{len(p['description']):>3}] {p['url']}")
