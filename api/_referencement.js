// Ce que partagent les pages (api/page.js) et le sitemap (api/sitemap.js) : la table des pages du site
// (outils/pages.json) et le référencement lu dans la base des comptes (table site_referencement, lecture
// publique), gardé 60 s en mémoire. Fichier « _ » : pas une fonction publique.

const PAGES = require('../outils/pages.json')

const BASE = 'https://mmhutoipdzwkvaufucko.supabase.co'
const CLE_PUBLIQUE = 'sb_publishable_nt9NW_tnbeEes4lRWmEUbA_YaIe6sX2' // clé publique (lecture seule, RLS)
const DOMAINE = 'https://www.realxpert.ch'

let memoire = { lu: 0, lignes: null }

async function referencement() {
  if (memoire.lignes && Date.now() - memoire.lu < 60000) return memoire.lignes
  try {
    const r = await fetch(`${BASE}/rest/v1/site_referencement?select=page,langue,nom,titre,description,canonique,modifie_le`, {
      headers: { apikey: CLE_PUBLIQUE },
      signal: AbortSignal.timeout(2500),
    })
    if (!r.ok) throw new Error(`base ${r.status}`)
    memoire = { lu: Date.now(), lignes: await r.json() }
  } catch (e) {
    console.error('[référencement] base indisponible :', e.message)
    // Dernières valeurs connues ; à défaut, nouvel essai dans 10 s.
    memoire = { lu: Date.now() - 50000, lignes: memoire.lignes || [] }
  }
  return memoire.lignes
}

/** La ligne de référencement d'une page dans une langue ({} si absente). */
const ligne = (lignes, page, langue) => lignes.find(x => x.page === page && x.langue === langue) || {}

/** L'URL canonique : celle de la base, sinon le domaine + l'adresse propre de la page. */
function canonique(lignes, page, langue) {
  const def = PAGES.find(x => x.page === page && x.langue === langue)
  return ligne(lignes, page, langue).canonique || (def ? DOMAINE + def.chemin : DOMAINE)
}

const echapper = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

module.exports = { PAGES, DOMAINE, referencement, ligne, canonique, echapper }
