// Mot de passe : un œil au bout du champ ; tant qu'on appuie dessus, le mot de passe
// s'affiche en clair, le temps de vérifier qu'on ne s'est pas trompé (Franck, 28.09).
//
// L'œil est dessiné dans le champ lui-même (image de fond) et c'est la zone de droite
// du champ qui réagit à l'appui — comme le drapeau du champ téléphone (telephone.js).
// Rien n'est ajouté ni déplacé dans la page : les gabarits qui se re-rendent (panneau
// d'inscription du site vitrine) ne sont pas dérangés.
//
// Fichier identique sur les deux sites (realxpert-site, realxpert-immobilier).

const ZONE = 46   // largeur (px) de la zone de l'œil, à droite du champ

const LANGUE = ((document.documentElement.lang || '').slice(0, 2)
  || (decodeURIComponent(location.pathname).match(/(FR|DE|EN|IT)\.dc\.html/i) || [, 'fr'])[1]).toLowerCase()
const TITRE = {
  fr: 'Maintenez l’œil appuyé pour afficher le mot de passe',
  de: 'Halten Sie das Auge gedrückt, um das Passwort anzuzeigen',
  en: 'Press and hold the eye to show the password',
  it: 'Tenete premuto l’occhio per mostrare la password',
}[LANGUE] || 'Maintenez l’œil appuyé pour afficher le mot de passe'

const svg = (couleur, barre) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${couleur}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`
  + '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'
  + (barre ? '<line x1="3" y1="3" x2="21" y2="21"/>' : '') + '</svg>'
const IMAGE = {
  masque: `url("data:image/svg+xml,${encodeURIComponent(svg('#7d8ea1', false))}")`,
  visible: `url("data:image/svg+xml,${encodeURIComponent(svg('#1a73c9', false))}")`,
}

const zoomPage = () => parseFloat(getComputedStyle(document.documentElement).zoom) || 1

function peindre(champ) {
  const visible = champ.type === 'text'
  champ.style.setProperty('background-image', visible ? IMAGE.visible : IMAGE.masque, 'important')
  champ.style.setProperty('background-repeat', 'no-repeat', 'important')
  champ.style.setProperty('background-size', '20px 20px', 'important')
  champ.style.setProperty('background-position', 'right 14px center', 'important')
  champ.style.setProperty('padding-right', `${ZONE}px`, 'important')
}

// Repère gardé en mémoire, jamais en attribut : un gabarit qui recrée le champ en recopiant
// ses attributs recopierait la marque, et le nouveau champ resterait sans œil.
const branches = new WeakSet()

function brancher(champ) {
  if (branches.has(champ)) return
  branches.add(champ)
  champ.title = TITRE

  const dansLaZone = e => (champ.getBoundingClientRect().right - e.clientX) / zoomPage() <= ZONE

  const afficher = visible => {
    const debut = champ.selectionStart, fin = champ.selectionEnd
    champ.type = visible ? 'text' : 'password'
    peindre(champ)
    try { if (debut != null) champ.setSelectionRange(debut, fin) } catch {}
  }

  champ.addEventListener('pointerdown', e => {
    if (!dansLaZone(e)) return
    e.preventDefault()   // le curseur ne saute pas, le clavier du téléphone ne se referme pas
    afficher(true)
    const relacher = () => {
      afficher(false)
      removeEventListener('pointerup', relacher)
      removeEventListener('pointercancel', relacher)
      removeEventListener('blur', relacher)
    }
    addEventListener('pointerup', relacher)
    addEventListener('pointercancel', relacher)
    addEventListener('blur', relacher)
  })
  champ.addEventListener('pointermove', e => { champ.style.cursor = dansLaZone(e) ? 'pointer' : '' })

  // Un gabarit qui réécrit l'attribut style effacerait l'œil : on le repeint aussitôt.
  new MutationObserver(() => {
    if (!champ.style.backgroundImage.includes('svg') || champ.style.paddingRight !== `${ZONE}px`) peindre(champ)
  }).observe(champ, { attributes: true, attributeFilter: ['style'] })

  peindre(champ)
}

// Les champs apparaissent avec la page, ou plus tard (panneau d'inscription) : on les guette.
const chercher = () => document.querySelectorAll('input[type="password"]').forEach(brancher)
new MutationObserver(chercher).observe(document.documentElement, { childList: true, subtree: true })
chercher()
