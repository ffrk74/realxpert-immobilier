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

document.addEventListener('focusin', e => {
  if (e.target.matches?.(CHAMP)) montrer(e.target, false)
})

document.addEventListener('focusout', e => {
  // L'indice ne revient que si le visiteur n'a rien laissé.
  if (e.target.matches?.(CHAMP)) montrer(e.target, e.target.value.trim() === '')
})

document.addEventListener('input', e => {
  if (e.target.matches?.(CHAMP)) montrer(e.target, false)
})

document.addEventListener('keydown', e => {
  if (!e.target.matches?.(CHAMP) || e.key !== 'Enter') return
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
