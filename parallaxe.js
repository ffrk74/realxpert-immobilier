// Héros de l'accueil : moins de ciel, et une parallaxe au défilement.
//
// L'image du héros passe sur un calque (pseudo-élément ::before) plus haut que le
// héros et ancré en bas : la ville grandit, le haut du ciel sort du cadre. Au
// défilement, le calque descend plus lentement que la page — la parallaxe.
//
// Un pseudo-élément et non un élément inséré : la page est un gabarit qui se re-rend
// toutes les quatre secondes et peut emporter ce qu'il ne connaît pas. L'image est
// lue sur le héros lui-même, donc le script vaut pour chaque langue.

const HAUTEUR_CALQUE = 1.25   // 125 % du héros : le quart supérieur de l'image (du ciel) sort du cadre
const VITESSE = 0.35          // le calque suit le défilement à 35 %
const COURSE_MAX = 0.2        // jamais plus que la marge du calque au-dessus du héros

const style = document.createElement('style')
style.textContent = `
  [data-r="hero"] { background-image: none !important; overflow: hidden; isolation: isolate; }
  [data-r="hero"]::before {
    content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: ${HAUTEUR_CALQUE * 100}%;
    background: var(--rx-fond-heros) center bottom / cover no-repeat;
    transform: translate3d(0, var(--rx-parallaxe, 0px), 0);
    z-index: -1; pointer-events: none; will-change: transform;
  }
  @media (prefers-reduced-motion: reduce) { [data-r="hero"]::before { transform: none; } }
`
document.head.appendChild(style)

const zoomPage = () => parseFloat(getComputedStyle(document.documentElement).zoom) || 1
const reduit = matchMedia('(prefers-reduced-motion: reduce)')

function lancer(premier) {
  // L'image propre à la page, reprise telle quelle sur le calque.
  document.documentElement.style.setProperty('--rx-fond-heros', premier.style.backgroundImage)

  const suivre = () => {
    if (reduit.matches) return
    // Le gabarit remplace l'élément du héros après son premier rendu : on le cherche à
    // chaque fois. Garder le premier, détaché de la page, figeait le décalage à zéro.
    const heros = document.querySelector('[data-r="hero"]')
    if (!heros) return
    const r = heros.getBoundingClientRect()
    if (r.bottom < 0) return                       // héros sorti de l'écran : rien à faire
    const z = zoomPage()                           // positions à l'écran → unités de la page (echelle.css)
    const defile = Math.max(0, -r.top) / z
    const decalage = Math.min(defile * VITESSE, heros.offsetHeight * COURSE_MAX)
    document.documentElement.style.setProperty('--rx-parallaxe', decalage.toFixed(1) + 'px')
  }
  // Calcul direct à chaque défilement : une seule valeur à poser, le coût est
  // négligeable. Un verrou suspendu à requestAnimationFrame restait bloqué quand
  // l'onglet passait en arrière-plan au mauvais moment.
  addEventListener('scroll', suivre, { passive: true })
  addEventListener('resize', suivre)
  suivre()
}

// Le héros n'existe qu'une fois la page rendue.
const trouver = () => {
  const heros = document.querySelector('[data-r="hero"]')
  if (heros?.style.backgroundImage) { observateur.disconnect(); lancer(heros) }
}
const observateur = new MutationObserver(trouver)
observateur.observe(document.documentElement, { childList: true, subtree: true })
trouver()
