// Héros de l'accueil : moins de ciel, image fixe.
//
// L'image du héros passe sur un calque (pseudo-élément ::before) plus haut que le
// héros et ancré en bas : la ville grandit, le haut du ciel sort du cadre. Le filtre
// bleu du ciel et la version mobile de la photo s'appliquent à ce calque (voir la
// feuille de style des pages d'accueil).
//
// 28.09 — Franck : « retirer l'effet parallax ». Le calque ne suit plus le défilement ;
// le cadrage, lui, est inchangé. (Le nom du fichier est gardé : les pages le chargent.)
//
// Un pseudo-élément et non un élément inséré : la page est un gabarit qui se re-rend
// toutes les quatre secondes et peut emporter ce qu'il ne connaît pas. L'image est
// lue sur le héros lui-même, donc le script vaut pour chaque langue.

const HAUTEUR_CALQUE = 1.25   // 125 % du héros : le quart supérieur de l'image (du ciel) sort du cadre

const style = document.createElement('style')
style.textContent = `
  [data-r="hero"] { background-image: none !important; overflow: hidden; isolation: isolate; }
  [data-r="hero"]::before {
    content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: ${HAUTEUR_CALQUE * 100}%;
    background: var(--rx-fond-heros) center bottom / cover no-repeat;
    z-index: -1; pointer-events: none;
  }
`
document.head.appendChild(style)

// L'image propre à la page, reprise telle quelle sur le calque. Le héros n'existe qu'une
// fois la page rendue.
const trouver = () => {
  const heros = document.querySelector('[data-r="hero"]')
  if (!heros?.style.backgroundImage) return
  observateur.disconnect()
  document.documentElement.style.setProperty('--rx-fond-heros', heros.style.backgroundImage)
}
const observateur = new MutationObserver(trouver)
observateur.observe(document.documentElement, { childList: true, subtree: true })
trouver()
