// Le bandeau du héros est un vrai champ de saisie.
//
// L'indice (« Posez votre première question… » et l'exemple) reste affiché tel quel,
// et le champ le recouvre, transparent. Au focus, l'indice s'efface en fondu ; il
// revient si l'on quitte le champ sans avoir rien écrit.
//
// Les pages sont rendues côté client et peuvent l'être plusieurs fois : les écouteurs
// sont donc posés sur le document, une seule fois, plutôt que sur le champ lui-même.

const CHAMP = '[data-r="heroinput"]'
const MEMOIRE = 'realxpert_question_initiale'

function indiceDe(champ) {
  const zone = champ.closest('[data-r="heroask"]')
  return zone && zone.querySelector('[data-r="herohint"]')
}

function montrer(champ, visible) {
  const indice = indiceDe(champ)
  if (indice) indice.style.opacity = visible ? '1' : '0'
}

// Vide, le champ recouvre toute la case (les deux lignes de l'indice) : sans réglage, le
// curseur apparaissait tout en haut de la case (Franck, 28.09). Tant que rien n'est écrit,
// il se place au milieu, à hauteur du micro ; dès la première lettre, tapée ou dictée, le
// texte part du haut et la zone s'allonge (voir ajuster).
function centrer(champ) {
  if (champ.value) { champ.style.removeProperty('padding-top'); return }
  const style = getComputedStyle(champ)
  const ligne = parseFloat(style.lineHeight) || (parseFloat(style.fontSize) || 16) * 1.45
  champ.style.setProperty('box-sizing', 'border-box', 'important')
  champ.style.setProperty('padding-top', `${Math.max(0, (champ.clientHeight - ligne) / 2)}px`, 'important')
}

document.addEventListener('focusin', e => {
  if (!e.target.matches?.(CHAMP)) return
  montrer(e.target, false)
  centrer(e.target)
})
// Au toucher, avant même le focus : le curseur naît déjà à la bonne hauteur.
document.addEventListener('pointerdown', e => { if (e.target.matches?.(CHAMP)) centrer(e.target) }, true)

document.addEventListener('focusout', e => {
  // L'indice ne revient que si le visiteur n'a rien laissé.
  if (e.target.matches?.(CHAMP)) montrer(e.target, e.target.value.trim() === '')
})

// Le champ est une zone de texte qui s'allonge avec la phrase (27.09) : vide, elle garde
// la hauteur de l'indice ; remplie, elle prend la hauteur de son contenu.
function ajuster(champ) {
  if (!champ.value) { champ.style.removeProperty('height'); centrer(champ); return }
  champ.style.removeProperty('padding-top')
  champ.style.setProperty('height', 'auto', 'important')
  champ.style.setProperty('height', `${champ.scrollHeight}px`, 'important')
}

document.addEventListener('input', e => {
  if (!e.target.matches?.(CHAMP)) return
  montrer(e.target, e.target.value.trim() === '' && document.activeElement !== e.target)
  ajuster(e.target)
})
addEventListener('resize', () => { const champ = document.querySelector(CHAMP); if (champ) ajuster(champ) })

document.addEventListener('keydown', e => {
  // Entrée envoie la question ; Maj+Entrée passe à la ligne.
  if (!e.target.matches?.(CHAMP) || e.key !== 'Enter' || e.shiftKey || e.isComposing) return
  e.preventDefault()
  // La question est retenue pour la suite du parcours, puis on ouvre le panneau
  // comme le ferait le bouton.
  try { localStorage.setItem(MEMOIRE, e.target.value.trim()) } catch {}
  document.querySelector('[data-r="herobtn"]')?.click()
})

// Le bouton doit lui aussi emporter la question saisie.
document.addEventListener('click', e => {
  const bouton = e.target.closest?.('[data-r="herobtn"]')
  if (!bouton) return
  const champ = document.querySelector(CHAMP)
  if (!champ) return
  try { localStorage.setItem(MEMOIRE, champ.value.trim()) } catch {}
})
