// Menus déroulants : un clic à l'extérieur (ou Échap) les referme (Franck, 28.09 :
// « si je clique sur le sélecteur de langue, je ne peux pas cliquer à l'extérieur pour
// sortir, il reste bloqué »).
//
// Deux familles de menus sur le site :
//  - accueil : liste des langues et tiroir du menu mobile tenus par le gabarit — on les
//    referme en « cliquant » leur propre déclencheur, pour que le gabarit reste maître de
//    son état ;
//  - autres pages : éléments <details> natifs (langue, menu mobile) — on retire `open`.

const DECLENCHEUR_LANGUE = /^(FR|DE|EN|IT)\s*▾$/

const visible = e => !!e && e.getClientRects().length > 0

/** Accueil : les déclencheurs de langue dont la liste est affichée. */
function languesOuvertes() {
  return [...document.querySelectorAll('header span')]
    .filter(s => visible(s) && DECLENCHEUR_LANGUE.test(s.textContent.trim()))
    .filter(s => [...s.parentElement.children].some(c => c !== s && visible(c) && c.querySelector('div')))
}

function fermer(cible) {
  for (const s of languesOuvertes()) {
    if (!cible || !s.parentElement.contains(cible)) s.click()
  }
  for (const d of document.querySelectorAll('details[open]')) {
    if (!cible || !d.contains(cible)) d.open = false
  }
  // Accueil : tiroir du menu mobile.
  const tiroir = document.querySelector('[data-r="drawer"]')
  const burger = document.querySelector('button[data-r="burger"]')
  if (visible(tiroir) && burger && (!cible || (!tiroir.contains(cible) && !burger.contains(cible)))) burger.click()
}

// En capture : le menu se ferme avant que le clic n'atteigne sa cible (qui agit ensuite
// normalement : lien, bouton…).
document.addEventListener('click', e => fermer(e.target), true)
document.addEventListener('keydown', e => { if (e.key === 'Escape') fermer(null) })
