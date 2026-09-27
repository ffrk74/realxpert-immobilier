// Bouton « retour en haut » (demande de Franck, 27.09) : sur mobile et tablette, un petit
// bouton rond en bas à droite ramène en haut de la page. Il n'apparaît qu'après un peu de
// défilement, et s'efface quand un panneau (inscription, connexion) est ouvert.
//
// La page est un gabarit qui se re-rend et peut emporter ce qu'il ne connaît pas : le
// bouton est ajouté au <body> et remis en place s'il disparaît.

const LANGUE = (decodeURIComponent(location.pathname).match(/(FR|DE|EN|IT)\.dc\.html/i) || [, 'FR'])[1].toUpperCase()
const LIBELLE = { FR: 'Revenir en haut de la page', DE: 'Zurück zum Seitenanfang', EN: 'Back to top', IT: 'Torna all’inizio della pagina' }[LANGUE]
const SEUIL = 500   // pixels défilés avant d'apparaître

const style = document.createElement('style')
style.textContent = `
  .rx-haut { position: fixed; right: 16px; bottom: calc(18px + env(safe-area-inset-bottom, 0px)); z-index: 150;
    width: 42px; height: 42px; border-radius: 50%; border: 1px solid #dce3ea; padding: 0; cursor: pointer;
    display: none; align-items: center; justify-content: center; color: #41556b;
    background: rgba(255,255,255,.92); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
    box-shadow: 0 4px 14px rgba(20,50,90,.12);
    opacity: 0; transform: translateY(12px); pointer-events: none;
    transition: opacity .25s ease, transform .25s ease; -webkit-tap-highlight-color: transparent; }
  .rx-haut.rx-haut--visible { opacity: 1; transform: none; pointer-events: auto; }
  .rx-haut:active { transform: scale(.94); }
  .rx-haut:focus-visible { outline: 2px solid rgba(47,107,214,.45); outline-offset: 3px; }
  @media (max-width: 900px) { .rx-haut { display: inline-flex; } }
  @media (prefers-reduced-motion: reduce) { .rx-haut { transition: none; } }
`
document.head.appendChild(style)

const bouton = document.createElement('button')
bouton.type = 'button'
bouton.className = 'rx-haut'
bouton.setAttribute('aria-label', LIBELLE)
bouton.title = LIBELLE
// Un simple chevron, fin : discret sur toutes les sections (claires comme foncées).
bouton.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>'
bouton.addEventListener('click', () => {
  const doux = !matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: doux ? 'smooth' : 'auto' })
})

function mettreAJour() {
  if (!document.body) return
  if (!document.body.contains(bouton)) document.body.appendChild(bouton)
  // Les pages intérieures gardent leurs panneaux dans la page, masqués : seul un panneau
  // réellement affiché compte.
  const panneauOuvert = [...document.querySelectorAll('[data-r="sheet"]')].some(e => e.getClientRects().length > 0)
  const visible = window.scrollY > SEUIL && !panneauOuvert
  bouton.classList.toggle('rx-haut--visible', visible)
  bouton.tabIndex = visible ? 0 : -1
}

addEventListener('scroll', mettreAJour, { passive: true })
addEventListener('resize', mettreAJour)
new MutationObserver(mettreAJour).observe(document.documentElement, { childList: true, subtree: true })
mettreAJour()
