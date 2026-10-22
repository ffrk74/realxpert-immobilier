# Adresses propres, page Immo Magazine et menus du site public RealXpert (22.10.2026).
#
# Franck (22.10.2026) : méta-titres et méta-descriptions de la page « Immo Magazine » dans les 4 langues,
# « permettre de manager ces informations + URL canonique » — décisions : page publique sur ce site avec le
# flip book du magazine, rubrique « Référencement » dans l'ERP, toutes les pages, canoniques sur
# www.realxpert.ch avec des adresses propres (/fr/vendre, /de/kaufen…).
#
# Ce script (relançable sans risque) :
#   1. crée les pages « Immo Magazine - XX.dc.html » à partir de la page Contact de chaque langue ;
#   2. ajoute le lien vers le magazine dans le menu, le menu mobile et le pied de page de chaque page ;
#   3. remplace les liens entre pages (« Vendre - FR.dc.html ») par les adresses propres (« /fr/vendre ») ;
#   4. rend absolues les adresses des fichiers (« ./echelle.css » → « /echelle.css ») : les pages sont
#      servies depuis /fr/…, /de/…, une adresse relative y chercherait /fr/echelle.css ;
#   5. écrit outils/pages.json (lu par api/page.js) et les réécritures / redirections de vercel.json.
#
# Lancement : python3 outils/adresses-propres.py
import json, os, re

ICI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANGUES = ["fr", "de", "en", "it"]

# page, fichier par langue (le suffixe est ajouté), adresse propre par langue, nom affiché par langue
PAGES = [
    ("accueil", {"fr": "RealXpert - FR", "de": "RealXpert-DE", "en": "RealXpert-EN", "it": "RealXpert-IT"},
     {"fr": "/fr", "de": "/de", "en": "/en", "it": "/it"},
     {"fr": "Accueil", "de": "Startseite", "en": "Home", "it": "Home"}),
    ("vendre", "Vendre", {"fr": "/fr/vendre", "de": "/de/verkaufen", "en": "/en/sell", "it": "/it/vendere"},
     {"fr": "Vendre", "de": "Verkaufen", "en": "Sell", "it": "Vendere"}),
    ("acheter", "Acheter", {"fr": "/fr/acheter", "de": "/de/kaufen", "en": "/en/buy", "it": "/it/acquistare"},
     {"fr": "Acheter", "de": "Kaufen", "en": "Buy", "it": "Acquistare"}),
    ("a-propos", "A propos", {"fr": "/fr/a-propos", "de": "/de/ueber-uns", "en": "/en/about-us", "it": "/it/chi-siamo"},
     {"fr": "À propos", "de": "Über uns", "en": "About us", "it": "Chi siamo"}),
    ("partenaires", "Nos partenaires", {"fr": "/fr/nos-partenaires", "de": "/de/unsere-partner", "en": "/en/our-partners", "it": "/it/i-nostri-partner"},
     {"fr": "Nos partenaires", "de": "Unsere Partner", "en": "Our partners", "it": "I nostri partner"}),
    ("immo-magazine", "Immo Magazine", {"fr": "/fr/immo-magazine", "de": "/de/immo-magazin", "en": "/en/immo-magazine", "it": "/it/immo-magazine"},
     {"fr": "Immo Magazine", "de": "Immo Magazin", "en": "Immo Magazine", "it": "Immo Magazine"}),
    ("contact", "Nous contacter", {"fr": "/fr/contact", "de": "/de/kontakt", "en": "/en/contact", "it": "/it/contatti"},
     {"fr": "Contact", "de": "Kontakt", "en": "Contact", "it": "Contatti"}),
    ("confidentialite", "Politique de confidentialite",
     {"fr": "/fr/politique-de-confidentialite", "de": "/de/datenschutz", "en": "/en/privacy-policy", "it": "/it/informativa-sulla-privacy"},
     {"fr": "Politique de confidentialité", "de": "Datenschutzerklärung", "en": "Privacy policy", "it": "Informativa sulla privacy"}),
    ("conditions", "Conditions generales",
     {"fr": "/fr/conditions-generales", "de": "/de/agb", "en": "/en/terms-and-conditions", "it": "/it/condizioni-generali"},
     {"fr": "Conditions générales", "de": "AGB", "en": "Terms and conditions", "it": "Condizioni generali"}),
]

def fichier(base, langue):
    return (base[langue] if isinstance(base, dict) else f"{base} - {langue.upper()}") + ".dc.html"

TABLE = [{"page": p, "langue": l, "fichier": fichier(b, l), "chemin": c[l], "nom": n[l]}
         for p, b, c, n in PAGES for l in LANGUES]
CHEMIN = {t["fichier"]: t["chemin"] for t in TABLE}

def lire(nom): return open(os.path.join(ICI, nom), encoding="utf-8").read()
def ecrire(nom, texte):
    chemin = os.path.join(ICI, nom)
    if not os.path.exists(chemin) or open(chemin, encoding="utf-8").read() != texte:
        open(chemin, "w", encoding="utf-8").write(texte)
        print("  écrit", nom)

# ── 1. Pages « Immo Magazine », à partir de la page Contact de chaque langue ──
TEXTES_MAGAZINE = {
    "fr": ("Immo Magazine", "Le magazine pour mieux acheter et vendre en Suisse",
           "N° 1 · 2027 — Reportages, conseils et décryptages. Feuilletez-le en ligne, page après page.", ""),
    "de": ("Immo Magazin", "Das Magazin, um in der Schweiz besser zu kaufen und zu verkaufen",
           "Nr. 1 · 2027 — Reportagen, Ratschläge und Analysen. Blättern Sie online darin, Seite für Seite.",
           "Diese Ausgabe erscheint auf Französisch."),
    "en": ("Immo Magazine", "The magazine for buying and selling better in Switzerland",
           "No. 1 · 2027 — Reports, advice and analysis. Browse it online, page by page.",
           "This issue is published in French."),
    "it": ("Immo Magazine", "La rivista per comprare e vendere meglio in Svizzera",
           "N. 1 · 2027 — Reportage, consigli e approfondimenti. Sfogliatela online, pagina dopo pagina.",
           "Questo numero è pubblicato in francese."),
}

def page_magazine(langue):
    L = langue.upper()
    s = lire(f"Nous contacter - {L}.dc.html")
    # Le sélecteur de langue mène au magazine dans l'autre langue (et non à la page Contact).
    for autre in LANGUES:
        if autre == langue: continue
        A = autre.upper()
        s = s.replace(f"Nous contacter - {A}.dc.html", f"Immo Magazine - {A}.dc.html")
        s = s.replace(f"Nous%20contacter%20-%20{A}.dc.html", f"Immo%20Magazine%20-%20{A}.dc.html")
    debut = s.index("<!-- ============ HERO ============ -->")
    fin = s.index("<!-- ============ FOOTER ============ -->")
    sur, titre, sous, note = TEXTES_MAGAZINE[langue]
    note_html = (f'\n      <p style="font-size:14.5px; color:#8fb4f0; margin:14px 0 0;">{note}</p>' if note else "")
    contenu = f'''<!-- ============ HERO ============ -->
  <section style="background:linear-gradient(150deg,#16305c 0%,#0e2144 100%); padding:80px 32px 36px;">
    <div style="max-width:1000px; margin:0 auto; text-align:center;">
      <span style="font-size:13px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:#8fb4f0;">{sur}</span>
      <h1 style="font-size:44px; font-weight:800; line-height:1.24; letter-spacing:-0.02em; margin:16px 0 0; color:#ffffff;">{titre}</h1>
      <p style="font-size:18px; line-height:1.6; color:#c9d8ec; margin:18px auto 0; max-width:720px;">{sous}</p>{note_html}
    </div>
  </section>

  <!-- ============ MAGAZINE (liseuse : magazine.js) ============ -->
  <section style="background:linear-gradient(180deg,#0e2144 0%,#0b1a36 100%); padding:8px 16px 72px;">
    <div id="rx-magazine" data-langue="{langue}" style="max-width:1500px; margin:0 auto;"></div>
  </section>

  '''
    s = s[:debut] + contenu + s[fin:]
    return scripts_liseuse(s)

def scripts_liseuse(s):
    """La liseuse : page-flip (StPageFlip, MIT) puis magazine.js, après le gabarit (support.js)."""
    if 'src="/magazine.js' in s or 'src="./magazine.js' in s: return s
    for gabarit in ('<script src="./support.js"></script>', '<script src="/support.js"></script>'):
        if gabarit in s:
            racine = "/" if gabarit.startswith('<script src="/') else "./"
            return s.replace(gabarit, f'<script src="{racine}vendor/page-flip.browser.js"></script>\n{gabarit}\n'
                                      f'<script type="module" src="{racine}magazine.js?v=1"></script>', 1)
    raise SystemExit("support.js introuvable dans une page du magazine")

for langue in LANGUES:
    nom = f"Immo Magazine - {langue.upper()}.dc.html"
    if not os.path.exists(os.path.join(ICI, nom)):
        ecrire(nom, page_magazine(langue))
    else:
        ecrire(nom, scripts_liseuse(lire(nom)))

# La liseuse est appelée avec l'empreinte de son contenu : une nouvelle version n'est jamais masquée par le cache.
import hashlib
V_LISEUSE = hashlib.sha256(open(os.path.join(ICI, "magazine.js"), "rb").read()).hexdigest()[:10]
for langue in LANGUES:
    nom = f"Immo Magazine - {langue.upper()}.dc.html"
    ecrire(nom, re.sub(r'magazine\.js\?v=[^"]*', f"magazine.js?v={V_LISEUSE}", lire(nom)))

# ── 2 à 4. Menus, liens entre pages, adresses absolues ──
LIBELLE_MENU = {"fr": "Magazine", "de": "Magazin", "en": "Magazine", "it": "Magazine"}
LIBELLE_PIED = {"fr": "Immo Magazine", "de": "Immo Magazin", "en": "Immo Magazine", "it": "Immo Magazine"}

def ajouter_liens_magazine(s, langue):
    """Après chaque lien « Nos partenaires » (menu, menu mobile, pied de page) : un lien vers le magazine."""
    cible = CHEMIN[f"Immo Magazine - {langue.upper()}.dc.html"]
    if f'href="{cible}' in s: return s
    lignes, sortie = s.split("\n"), []
    motif = re.compile(r'href="(?:Nos partenaires - |Nos%20partenaires%20-%20)' + langue.upper() + r'\.dc\.html(#top)?"')
    for ligne in lignes:
        sortie.append(ligne)
        m = motif.search(ligne)
        if m and ligne.rstrip().endswith("</a>"):
            copie = motif.sub(f'href="{cible}' + (m.group(1) or "") + '"', ligne)
            pied = "#top" not in m.group(0)  # les liens du pied de page n'ont pas d'ancre
            copie = re.sub(r">[^<>]*</a>\s*$", ">" + (LIBELLE_PIED if pied else LIBELLE_MENU)[langue] + "</a>", copie)
            sortie.append(copie)
    return "\n".join(sortie)

def liens_propres(s):
    for f, chemin in CHEMIN.items():
        for forme in (f, f.replace(" ", "%20")):
            s = re.sub(r'href="' + re.escape(forme) + r'(#[^"]*)?"', lambda m: f'href="{chemin}{m.group(1) or ""}"', s)
    # Accueil : le sélecteur de langue du gabarit construit le nom du fichier.
    s = s.replace("(c === 'fr' ? 'RealXpert - FR.dc.html' : 'RealXpert-' + c.toUpperCase() + '.dc.html')", "('/' + c)")
    return s

def adresses_absolues(s):
    s = re.sub(r'((?:src|href)=")\./', r"\1/", s)
    s = re.sub(r'((?:src|href)=")(uploads|vendor)/', r"\1/\2/", s)
    s = re.sub(r"url\((['\"]?)(uploads)/", r"url(\1/\2/", s)
    s = re.sub(r"""(["'])\./(vendor/|uploads/)""", r"\1/\2", s)
    s = re.sub(r"""(["'])uploads/""", r"\1/uploads/", s)
    return s

for t in TABLE:
    nom = t["fichier"]
    if not os.path.exists(os.path.join(ICI, nom)):
        print("  ABSENT", nom); continue
    s = lire(nom)
    s = ajouter_liens_magazine(s, t["langue"])
    s = adresses_absolues(liens_propres(s))
    ecrire(nom, s)

# Racine : chaque visiteur va à l'accueil dans sa langue (adresses propres).
idx = lire("index.html")
idx = re.sub(r"var page = \{[^}]*\}\[langue\] \|\| '[^']*';\s*location\.replace\(encodeURI\(page\) \+ location\.hash\);",
             "var page = { de: '/de', en: '/en', it: '/it' }[langue] || '/fr';\n    location.replace(page + location.hash);", idx)
idx = idx.replace("url=RealXpert%20-%20FR.dc.html", "url=/fr")  # repli sans JavaScript
idx = adresses_absolues(idx)
ecrire("index.html", idx)

# ── 5. Table des pages (api/page.js) et routage (vercel.json) ──
ecrire("outils/pages.json", json.dumps(TABLE, ensure_ascii=False, indent=1) + "\n")
config = {
    "cleanUrls": False,
    "redirects": [{"source": "/" + t["fichier"].replace(" ", "%20"), "destination": t["chemin"], "permanent": True} for t in TABLE],
    "rewrites": [{"source": t["chemin"], "destination": f"/api/page?p={t['page']}&l={t['langue']}"} for t in TABLE],
    "functions": {"api/page.js": {"includeFiles": "{*.dc.html,outils/pages.json}"}},
}
ecrire("vercel.json", json.dumps(config, ensure_ascii=False, indent=2) + "\n")
print("terminé :", len(TABLE), "pages")
