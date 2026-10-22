// Chaque page du site, servie à son adresse propre (/fr/vendre, /de/immo-magazin…), avec son référencement
// (Franck, 22.10.2026 : « permettre de manager ces informations + URL canonique »).
//
// vercel.json réécrit chaque adresse propre vers cette fonction (?p=page&l=langue). Elle lit la page
// (fichier .dc.html du dépôt) et écrit en tête : titre, description, URL canonique, liens hreflang vers les
// autres langues et balises de partage. Ces informations viennent de la table site_referencement de la
// base des comptes (lecture publique), modifiée depuis l'ERP (rubrique « Référencement ») ; elles sont
// relues au plus toutes les 60 s, et le CDN garde la page 60 s : une modification est en ligne en ~2 min.
// Si la base ne répond pas, la page part quand même (avec les dernières valeurs connues, sinon un titre
// de secours). Table des pages : outils/pages.json (écrite par outils/adresses-propres.py).

const fs = require('fs')
const path = require('path')
const PAGES = require('../outils/pages.json')

const BASE = 'https://mmhutoipdzwkvaufucko.supabase.co'
const CLE_PUBLIQUE = 'sb_publishable_nt9NW_tnbeEes4lRWmEUbA_YaIe6sX2' // clé publique (lecture seule, RLS)
const DOMAINE = 'https://www.realxpert.ch'
const LOCALES = { fr: 'fr_CH', de: 'de_CH', en: 'en_GB', it: 'it_CH' }
const IMAGES = { 'immo-magazine': '/uploads/magazine/p01-1400.webp' }

let memoire = { lu: 0, lignes: null }

async function referencement() {
  if (memoire.lignes && Date.now() - memoire.lu < 60000) return memoire.lignes
  try {
    const r = await fetch(`${BASE}/rest/v1/site_referencement?select=page,langue,nom,titre,description,canonique`, {
      headers: { apikey: CLE_PUBLIQUE },
      signal: AbortSignal.timeout(2500),
    })
    if (!r.ok) throw new Error(`base ${r.status}`)
    memoire = { lu: Date.now(), lignes: await r.json() }
  } catch (e) {
    console.error('[page] référencement indisponible :', e.message)
    // Dernières valeurs connues ; à défaut, nouvel essai dans 10 s.
    memoire = { lu: Date.now() - 50000, lignes: memoire.lignes || [] }
  }
  return memoire.lignes
}

const echapper = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function lirePage(fichier) {
  for (const dossier of [process.cwd(), path.join(__dirname, '..')]) {
    try { return fs.readFileSync(path.join(dossier, fichier), 'utf8') } catch { /* dossier suivant */ }
  }
  return null
}

module.exports = async (req, res) => {
  const { p, l } = req.query || {}
  const def = PAGES.find(x => x.page === p && x.langue === l)
  const html = def && lirePage(def.fichier)
  if (!html) {
    res.statusCode = 404
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    return res.end('Page introuvable')
  }
  let page = html
  try {
    const lignes = await referencement()
    const ligne = (pg, lg) => lignes.find(x => x.page === pg && x.langue === lg) || {}
    const ref = ligne(p, l)
    const canonique = c => c.canonique || DOMAINE + c.chemin
    const titre = ref.titre || `${ref.nom || def.nom} · RealXpert`
    const url = ref.canonique || DOMAINE + def.chemin
    const freres = PAGES.filter(x => x.page === p)
    // L'image de partage est servie par ce site, quel que soit le domaine canonique.
    const origine = `https://${req.headers['x-forwarded-host'] || req.headers.host || 'realxpert-immobilier.vercel.app'}`
    const tete = [
      `<title>${echapper(titre)}</title>`,
      ref.description ? `<meta name="description" content="${echapper(ref.description)}">` : '',
      `<link rel="canonical" href="${echapper(url)}">`,
      ...freres.map(f => `<link rel="alternate" hreflang="${f.langue}" href="${echapper(canonique({ ...f, ...ligne(p, f.langue) }))}">`),
      `<link rel="alternate" hreflang="x-default" href="${echapper(canonique({ ...freres.find(f => f.langue === 'fr'), ...ligne(p, 'fr') }))}">`,
      '<meta property="og:type" content="website">',
      '<meta property="og:site_name" content="RealXpert">',
      `<meta property="og:title" content="${echapper(titre)}">`,
      ref.description ? `<meta property="og:description" content="${echapper(ref.description)}">` : '',
      `<meta property="og:url" content="${echapper(url)}">`,
      `<meta property="og:locale" content="${LOCALES[l]}">`,
      IMAGES[p] ? `<meta property="og:image" content="${origine}${IMAGES[p]}">` : '',
    ].filter(Boolean).join('\n')
    page = html.replace(/<title>[\s\S]*?<\/title>\s*/i, '').replace(/<head>/i, `<head>\n${tete}`)
  } catch (e) {
    console.error('[page] tête non écrite :', e.message)
  }
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=86400')
  res.end(page)
}
