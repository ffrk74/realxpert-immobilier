// Saisie du numéro de mobile : drapeau et choix du pays, reconnaissance de
// l'indicatif, mise en forme pendant la frappe.
//
//   0787083261  (Suisse)  →  +41 78 708 32 61
//   0612345678  (France)  →  +33 6 12 34 56 78
//   +33… ou 0033…         →  bascule sur la France
//
// Bonne pratique (UIT-T E.123, usage suisse) : des espaces, et jamais de « (0) » —
// il trompe ceux qui appellent de l'étranger. Le numéro est enregistré au format
// international strict (E.164 : +41787083261).
//
// Les pays proposés sont exactement ceux que le serveur d'envoi des SMS accepte
// (PAYS_SERVIS, fonction envoyer-sms-brevo) : Suisse et France d'abord, puis les
// autres par ordre alphabétique.
//
// Ce fichier est identique sur les deux sites (realxpert-site, realxpert-immobilier).

/** indicatif · préfixe national à retirer · regroupement · longueurs admises (sans l'indicatif)
 *  · début d'un numéro de MOBILE : le code part par SMS, un fixe ne le recevrait jamais
 *  (06 12 34 56 78 tapé avec la Suisse donnerait un fixe bâlois, +41 61…). */
export const PAYS = [
  { iso: 'ch', indicatif: '41',  zero: true,  groupes: [2, 3, 2, 2], min: 9,  max: 9,  mobile: /^7[5-9]/, exemple: '781234567' },
  { iso: 'fr', indicatif: '33',  zero: true,  groupes: [1, 2, 2, 2, 2], min: 9, max: 9, mobile: /^[67]/, exemple: '612345678' },
  { iso: 'de', indicatif: '49',  zero: true,  groupes: [3, 4, 4],    min: 10, max: 11, mobile: /^1[5-7]/, exemple: '15123456789' },
  { iso: 'at', indicatif: '43',  zero: true,  groupes: [3, 3, 4, 3], min: 10, max: 13, mobile: /^6/, exemple: '6641234567' },
  { iso: 'be', indicatif: '32',  zero: true,  groupes: [3, 2, 2, 2], min: 9,  max: 9,  mobile: /^4[5-9]/, exemple: '470123456' },
  { iso: 'es', indicatif: '34',  zero: false, groupes: [3, 2, 2, 2], min: 9,  max: 9,  mobile: /^[67]/, exemple: '612345678' },
  { iso: 'it', indicatif: '39',  zero: false, groupes: [3, 3, 4],    min: 9,  max: 10, mobile: /^3/, exemple: '3123456789' },
  { iso: 'li', indicatif: '423', zero: false, groupes: [3, 2, 2],    min: 7,  max: 7,  mobile: /^7/, exemple: '7901234' },
  { iso: 'lu', indicatif: '352', zero: false, groupes: [3, 3, 3],    min: 9,  max: 9,  mobile: /^6/, exemple: '621123456' },
  { iso: 'nl', indicatif: '31',  zero: true,  groupes: [1, 4, 4],    min: 9,  max: 9,  mobile: /^6/, exemple: '612345678' },
  { iso: 'pt', indicatif: '351', zero: false, groupes: [3, 3, 3],    min: 9,  max: 9,  mobile: /^9/, exemple: '912345678' },
  { iso: 'gb', indicatif: '44',  zero: true,  groupes: [4, 6],       min: 10, max: 10, mobile: /^7/, exemple: '7700900123' },
]

const NOMS = {
  fr: { ch: 'Suisse', fr: 'France', de: 'Allemagne', at: 'Autriche', be: 'Belgique', es: 'Espagne', it: 'Italie', li: 'Liechtenstein', lu: 'Luxembourg', nl: 'Pays-Bas', pt: 'Portugal', gb: 'Royaume-Uni' },
  de: { ch: 'Schweiz', fr: 'Frankreich', de: 'Deutschland', at: 'Österreich', be: 'Belgien', es: 'Spanien', it: 'Italien', li: 'Liechtenstein', lu: 'Luxemburg', nl: 'Niederlande', pt: 'Portugal', gb: 'Vereinigtes Königreich' },
  en: { ch: 'Switzerland', fr: 'France', de: 'Germany', at: 'Austria', be: 'Belgium', es: 'Spain', it: 'Italy', li: 'Liechtenstein', lu: 'Luxembourg', nl: 'Netherlands', pt: 'Portugal', gb: 'United Kingdom' },
  it: { ch: 'Svizzera', fr: 'Francia', de: 'Germania', at: 'Austria', be: 'Belgio', es: 'Spagna', it: 'Italia', li: 'Liechtenstein', lu: 'Lussemburgo', nl: 'Paesi Bassi', pt: 'Portogallo', gb: 'Regno Unito' },
}

const PAR_INDICATIF = [...PAYS].sort((a, b) => b.indicatif.length - a.indicatif.length)
const chiffres = s => String(s || '').replace(/\D/g, '')

function grouper(national, groupes) {
  const morceaux = []
  let reste = national
  for (const n of groupes) {
    if (!reste) break
    morceaux.push(reste.slice(0, n))
    reste = reste.slice(n)
  }
  if (reste) morceaux.push(reste)
  return morceaux.join(' ')
}

/**
 * Lit une saisie libre. Rend le pays retenu, l'affichage mis en forme, le numéro
 * E.164 et sa validité. Une saisie internationale encore incomplète (« +3 ») est
 * laissée telle quelle : on ne l'efface pas sous les doigts du visiteur.
 */
export function analyser(saisie, paysCourant = PAYS[0]) {
  const brut = String(saisie || '').trim()
  const tout = chiffres(brut)
  let international = null
  if (brut.startsWith('+')) international = tout
  else if (tout.startsWith('00')) international = tout.slice(2)

  let pays = paysCourant
  let national = tout
  if (international !== null) {
    const trouve = PAR_INDICATIF.find(p => international.startsWith(p.indicatif))
    if (!trouve) {
      return { pays, affichage: international ? '+' + international : (brut.startsWith('+') ? '+' : ''), e164: null, valide: false }
    }
    pays = trouve
    national = international.slice(trouve.indicatif.length)
  }
  if (pays.zero && national.startsWith('0')) national = national.slice(1)
  national = national.slice(0, pays.max)

  const affichage = national ? `+${pays.indicatif} ${grouper(national, pays.groupes)}` : ''
  const valide = national.length >= pays.min && national.length <= pays.max && pays.mobile.test(national)
  return { pays, affichage, e164: national ? `+${pays.indicatif}${national}` : null, valide }
}

/** Un numéro enregistré (+41787083261), mis en forme pour l'affichage. */
export function formaterPourAffichage(e164) {
  const r = analyser(String(e164 || '').startsWith('+') ? e164 : '+' + chiffres(e164))
  return r.affichage || String(e164 || '')
}

/** Suisse et France en tête, puis les autres dans l'ordre alphabétique de la langue. */
function paysOrdonnes(langue) {
  const noms = NOMS[langue] || NOMS.fr
  const tete = PAYS.filter(p => p.iso === 'ch' || p.iso === 'fr')
  const autres = PAYS.filter(p => p.iso !== 'ch' && p.iso !== 'fr')
    .sort((a, b) => noms[a.iso].localeCompare(noms[b.iso], langue))
  return [...tete, ...autres]
}

/**
 * Monte la saisie sur un champ <input> existant. Le drapeau est dessiné en fond du
 * champ, à gauche : aucun élément n'est inséré à côté — ce qui compte sur des pages
 * dont le gabarit se re-rend et emporte ce qu'il ne connaît pas. Un clic sur le
 * drapeau ouvre la liste des pays, posée hors du gabarit.
 */
export function monterSaisieTelephone(champ, { langue = 'fr', cheminDrapeaux = 'uploads/drapeaux/', exempleEnPlaceholder = false } = {}) {
  if (!champ || champ.dataset.rxTel === '1') return champ?._rxTel
  champ.dataset.rxTel = '1'
  const noms = NOMS[langue] || NOMS.fr
  let pays = PAYS[0]

  champ.setAttribute('inputmode', 'tel')
  champ.setAttribute('autocomplete', 'tel')

  // En « important » : une feuille de style qui impose sa propre marge intérieure en
  // !important (celle de la maquette, sur mobile) ferait passer le texte sous le drapeau.
  const peindre = () => {
    champ.style.setProperty('background-image', `url("${cheminDrapeaux}${pays.iso}.png")`, 'important')
    champ.style.setProperty('background-repeat', 'no-repeat', 'important')
    champ.style.setProperty('background-size', '22px auto', 'important')
    champ.style.setProperty('background-position', '14px center', 'important')
    champ.style.setProperty('padding-left', '58px', 'important')
    champ.title = noms[pays.iso]
    if (exempleEnPlaceholder) champ.placeholder = analyser(pays.exemple, pays).affichage
  }

  const reformater = () => {
    const r = analyser(champ.value, pays)
    if (r.pays !== pays) { pays = r.pays; peindre() }
    if (champ.value !== r.affichage) {
      champ.value = r.affichage
      const fin = champ.value.length
      try { champ.setSelectionRange(fin, fin) } catch {}
    }
  }

  champ.addEventListener('input', reformater)
  champ.addEventListener('blur', reformater)

  // ── La liste des pays ───────────────────────────────────────────────────
  let liste = null
  const fermer = () => { liste?.remove(); liste = null }

  const ouvrir = () => {
    fermer()
    const r = champ.getBoundingClientRect()
    liste = document.createElement('div')
    liste.setAttribute('role', 'listbox')
    liste.style.cssText = `position:fixed;left:${r.left}px;top:${r.bottom + 6}px;width:${Math.max(240, Math.min(r.width, 340))}px;`
      + 'max-height:320px;overflow-y:auto;background:#fff;border:1px solid #dce3ea;border-radius:12px;'
      + 'box-shadow:0 14px 34px rgba(20,50,90,.18);padding:6px;z-index:1000;font-family:inherit;'
    for (const p of paysOrdonnes(langue)) {
      const ligne = document.createElement('button')
      ligne.type = 'button'
      ligne.setAttribute('role', 'option')
      ligne.style.cssText = 'display:flex;align-items:center;gap:11px;width:100%;padding:9px 11px;border:0;'
        + `background:${p === pays ? '#eef6fd' : 'transparent'};border-radius:9px;cursor:pointer;font:inherit;`
        + 'font-size:15px;color:#1c2b3a;text-align:left;'
      ligne.innerHTML = `<img src="${cheminDrapeaux}${p.iso}.png" alt="" style="width:22px;height:auto;border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.08)">`
        + `<span style="flex:1">${noms[p.iso]}</span><span style="color:#7d8ea1">+${p.indicatif}</span>`
      ligne.onmouseenter = () => { if (p !== pays) ligne.style.background = '#f4f9fe' }
      ligne.onmouseleave = () => { if (p !== pays) ligne.style.background = 'transparent' }
      ligne.onclick = () => {
        // Le numéro déjà tapé est conservé et remis en forme avec le nouvel indicatif.
        const national = chiffres(analyser(champ.value, pays).e164 || '').slice(pays.indicatif.length)
        pays = p
        peindre()
        champ.value = national ? analyser(national, pays).affichage : ''
        fermer()
        champ.focus()
      }
      liste.appendChild(ligne)
    }
    document.body.appendChild(liste)
  }

  // Le drapeau occupe les ~50 premiers pixels du champ : un clic là ouvre la liste.
  champ.addEventListener('mousedown', e => {
    const x = e.clientX - champ.getBoundingClientRect().left
    if (x <= 50) { e.preventDefault(); liste ? fermer() : ouvrir() }
  })
  champ.addEventListener('mousemove', e => {
    const x = e.clientX - champ.getBoundingClientRect().left
    champ.style.cursor = x <= 50 ? 'pointer' : 'text'
  })
  champ.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' && e.altKey) { e.preventDefault(); ouvrir() }
    if (e.key === 'Escape') fermer()
  })
  document.addEventListener('mousedown', e => {
    if (liste && !liste.contains(e.target) && e.target !== champ) fermer()
  })
  window.addEventListener('scroll', fermer, true)
  window.addEventListener('resize', fermer)

  // Un gabarit qui réécrit l'attribut style (styles de focus, rendu) effacerait le
  // drapeau : on le repeint dès qu'il disparaît. Pas de boucle — une fois repeint, la
  // condition ne tient plus.
  new MutationObserver(() => {
    if (!champ.style.backgroundImage.includes(`${pays.iso}.png`) || champ.style.paddingLeft !== '58px') peindre()
  }).observe(champ, { attributes: true, attributeFilter: ['style'] })

  peindre()
  reformater()

  const api = {
    /** Le numéro au format international strict, ou null. */
    e164: () => analyser(champ.value, pays).e164,
    valide: () => analyser(champ.value, pays).valide,
    pays: () => pays,
  }
  champ._rxTel = api
  return api
}
