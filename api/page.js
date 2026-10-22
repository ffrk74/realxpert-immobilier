// Chaque page du site, servie à son adresse propre (/fr/vendre, /de/immo-magazin…), avec son référencement
// (Franck, 22.10.2026 : « permettre de manager ces informations + URL canonique »).
//
// vercel.json réécrit chaque adresse propre vers cette fonction (?p=page&l=langue). Elle lit la page
// (fichier .dc.html du dépôt) et écrit en tête : titre, description, URL canonique, liens hreflang vers les
// autres langues et balises de partage. Ces informations viennent de la table site_referencement de la
// base des comptes (lecture publique), modifiée depuis l'ERP (rubrique « Référencement ») ; elles sont
// relues au plus toutes les 60 s, et le CDN garde la page 60 s : une modification est en ligne en ~2 min.
// Données structurées schema.org (organisation, site, page) ajoutées le 22.10.2026 (document SEO).
// Si la base ne répond pas, la page part quand même (avec les dernières valeurs connues, sinon un titre
// de secours). Table des pages : outils/pages.json (écrite par outils/adresses-propres.py).

const fs = require('fs')
const path = require('path')
const { PAGES, DOMAINE, referencement, ligne, canonique, echapper } = require('./_referencement')

const LOCALES = { fr: 'fr_CH', de: 'de_CH', en: 'en_GB', it: 'it_CH' }
const LANGUES_HTML = { fr: 'fr-CH', de: 'de-CH', en: 'en', it: 'it-CH' }
// Image de partage : la couverture du magazine de la langue de la page ({l}).
const IMAGES = { 'immo-magazine': '/uploads/magazine/{l}/p01-1400.webp' }
const LOGO = '/uploads/logo-realxpert-color-trim.webp'

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
    const ref = ligne(lignes, p, l)
    const titre = ref.titre || `${ref.nom || def.nom} · RealXpert`
    const url = canonique(lignes, p, l)
    const freres = PAGES.filter(x => x.page === p)
    // Les images (partage, logo) sont servies par ce site, quel que soit le domaine canonique.
    const origine = `https://${req.headers['x-forwarded-host'] || req.headers.host || 'realxpert-immobilier.vercel.app'}`
    // Données structurées (schema.org) : l'organisation, le site et la page.
    const donnees = {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'Organization', '@id': `${DOMAINE}/#organisation`, name: 'RealXpert', url: `${DOMAINE}/`, logo: origine + LOGO, telephone: '+41227523050', areaServed: 'CH' },
        { '@type': 'WebSite', '@id': `${DOMAINE}/#site`, url: `${DOMAINE}/`, name: 'RealXpert', inLanguage: Object.values(LANGUES_HTML), publisher: { '@id': `${DOMAINE}/#organisation` } },
        { '@type': 'WebPage', '@id': url, url, name: titre, ...(ref.description ? { description: ref.description } : {}), inLanguage: LANGUES_HTML[l], isPartOf: { '@id': `${DOMAINE}/#site` }, about: { '@id': `${DOMAINE}/#organisation` } },
      ],
    }
    const tete = [
      `<title>${echapper(titre)}</title>`,
      ref.description ? `<meta name="description" content="${echapper(ref.description)}">` : '',
      `<link rel="canonical" href="${echapper(url)}">`,
      ...freres.map(f => `<link rel="alternate" hreflang="${f.langue}" href="${echapper(canonique(lignes, p, f.langue))}">`),
      `<link rel="alternate" hreflang="x-default" href="${echapper(canonique(lignes, p, 'fr'))}">`,
      '<meta property="og:type" content="website">',
      '<meta property="og:site_name" content="RealXpert">',
      `<meta property="og:title" content="${echapper(titre)}">`,
      ref.description ? `<meta property="og:description" content="${echapper(ref.description)}">` : '',
      `<meta property="og:url" content="${echapper(url)}">`,
      `<meta property="og:locale" content="${LOCALES[l]}">`,
      IMAGES[p] ? `<meta property="og:image" content="${origine}${IMAGES[p].replace('{l}', l)}">` : '',
      `<script type="application/ld+json">${JSON.stringify(donnees).replace(/</g, '\\u003c')}</script>`,
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
