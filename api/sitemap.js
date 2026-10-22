// Le sitemap XML du site (/sitemap.xml, document SEO du 22.10.2026) : toutes les pages dans les 4 langues,
// chacune à son URL canonique avec ses équivalents dans les autres langues (hreflang + x-default). Construit
// à chaque demande depuis la table des pages et la base : une page ajoutée ou une URL canonique modifiée
// dans l'ERP y figure d'elle-même. Gardé 10 minutes par le CDN.

const { PAGES, referencement, canonique, echapper } = require('./_referencement')

module.exports = async (req, res) => {
  const lignes = await referencement()
  const groupes = [...new Set(PAGES.map(t => t.page))]
  const urls = []
  for (const page of groupes) {
    const langues = PAGES.filter(t => t.page === page).map(t => t.langue)
    const autres = [
      ...langues.map(l => `    <xhtml:link rel="alternate" hreflang="${l}" href="${echapper(canonique(lignes, page, l))}"/>`),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${echapper(canonique(lignes, page, 'fr'))}"/>`,
    ].join('\n')
    for (const l of langues) urls.push(`  <url>\n    <loc>${echapper(canonique(lignes, page, l))}</loc>\n${autres}\n  </url>`)
  }
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400')
  res.end(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`)
}
