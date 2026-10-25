// La liseuse du magazine RealXpert, page « Immo Magazine » du site (22.10.2026) : les pages du PDF (images
// WebP 800/1400 dans /uploads/magazine/<langue>/, un magazine par langue depuis le 22.10 au soir — outil :
// « RealXpert Book/outils/pages-site.sh ») se tournent comme celles d'un magazine, avec page-flip (StPageFlip,
// licence MIT, /vendor/page-flip.browser.js). Même liseuse que celle de l'ERP (/book), avec ses corrections :
//   • double page sur un écran plus large que haut, une seule page sinon (téléphone tenu droit) ;
//   • la zone du livre fait EXACTEMENT la taille du livre : page-flip dessine les couvertures qui tournent
//     depuis le coin haut gauche de sa zone (sinon elles partaient sur le côté) ;
//   • couverture (et dernière page) seule centrée, qui glisse en douceur pendant qu'elle s'ouvre ;
//   • tout le magazine se précharge en arrière-plan, les pages les plus proches d'abord ;
//   • tournages demandés pendant une animation enchaînés à la fin, au lieu de l'interrompre ;
//   • clavier, curseur de page, zoom de lecture, plein écran (là où le navigateur le permet).
// La page est rendue par le gabarit du site (support.js) : la liseuse se monte dans #rx-magazine dès qu'il
// apparaît, et se remonte si le gabarit le remplace.

const N = 42
const RATIO = 1400 / 1980
const LARGEURS = [800, 1400]
const CHARGEMENTS_SIMULTANES = 3
const DUREE_GLISSEMENT = 650
const NIVEAUX_ZOOM = [1, 1.6, 2.4]
// Le magazine de la langue de la page (data-langue de #rx-magazine), fixé au montage.
let langueMagazine = 'fr'
const image = (n, largeur) => `/uploads/magazine/${langueMagazine}/p${String(n).padStart(2, '0')}-${largeur}.webp`
const jeu = n => LARGEURS.map(l => `${image(n, l)} ${l}w`).join(', ')

const TEXTES = {
  fr: { magazine: 'Immo Magazine', couverture: 'Couverture', page: 'Page', pages: 'Pages', precedente: 'Page précédente', suivante: 'Page suivante', aller: 'Aller à la page', zoom: 'Zoom', pleinEcran: 'Plein écran', quitterPleinEcran: 'Quitter le plein écran', lire: 'Lire la page en grand', fermer: 'Fermer', agrandir: 'Agrandir', reduire: 'Réduire', astucePortrait: 'Touchez ou glissez la page pour la tourner', astuce: 'Cliquez sur une page ou tirez son coin pour la tourner' },
  de: { magazine: 'Immo Magazin', couverture: 'Titelseite', page: 'Seite', pages: 'Seiten', precedente: 'Vorherige Seite', suivante: 'Nächste Seite', aller: 'Zur Seite', zoom: 'Zoom', pleinEcran: 'Vollbild', quitterPleinEcran: 'Vollbild beenden', lire: 'Seite vergrössert lesen', fermer: 'Schliessen', agrandir: 'Vergrössern', reduire: 'Verkleinern', astucePortrait: 'Tippen oder wischen Sie, um umzublättern', astuce: 'Klicken Sie auf eine Seite oder ziehen Sie an der Ecke, um umzublättern' },
  en: { magazine: 'Immo Magazine', couverture: 'Cover', page: 'Page', pages: 'Pages', precedente: 'Previous page', suivante: 'Next page', aller: 'Go to page', zoom: 'Zoom', pleinEcran: 'Full screen', quitterPleinEcran: 'Exit full screen', lire: 'Read the page enlarged', fermer: 'Close', agrandir: 'Zoom in', reduire: 'Zoom out', astucePortrait: 'Tap or swipe the page to turn it', astuce: 'Click a page or drag its corner to turn it' },
  it: { magazine: 'Immo Magazine', couverture: 'Copertina', page: 'Pagina', pages: 'Pagine', precedente: 'Pagina precedente', suivante: 'Pagina successiva', aller: 'Vai alla pagina', zoom: 'Zoom', pleinEcran: 'Schermo intero', quitterPleinEcran: 'Esci dallo schermo intero', lire: 'Leggi la pagina ingrandita', fermer: 'Chiudi', agrandir: 'Ingrandisci', reduire: 'Riduci', astucePortrait: 'Tocca o scorri la pagina per girarla', astuce: "Clicca su una pagina o trascina l'angolo per girarla" },
}

const ICONES = {
  gauche: '<path d="M15 5 8 12l7 7"/>',
  droite: '<path d="m9 5 7 7-7 7"/>',
  zoom: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.3-4.3M11 8.5v5M8.5 11h5"/>',
  plein: '<path d="M3 8V5a2 2 0 0 1 2-2h3m8 0h3a2 2 0 0 1 2 2v3m0 8v3a2 2 0 0 1-2 2h-3m-8 0H5a2 2 0 0 1-2-2v-3"/>',
  moins: '<path d="M5 12h14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  fermer: '<path d="M6 6l12 12M18 6 6 18"/>',
}
const icone = nom => `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONES[nom]}</svg>`

const STYLE = `
.rxm { position: relative; color: #eef3fb; font-family: 'Inter', system-ui, sans-serif; }
/* Le site est réduit à 80 % sur ordinateur (echelle.css, zoom) : la liseuse est remise à l'échelle réelle,
   sinon page-flip calculerait la position du doigt ou de la souris avec un écart de 20 %. */
@media (min-width: 1024px) { .rxm { zoom: 1.25; } }
.rxm *, .rxm *::before, .rxm *::after { box-sizing: border-box; }
.rxm button { font: inherit; color: inherit; cursor: pointer; }
.rxm-outils { display: flex; justify-content: flex-end; gap: 10px; margin: 0 auto 14px; max-width: 1200px; }
.rxm-bouton { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-width: 44px; height: 44px; padding: 0 16px; border: 1px solid rgba(255,255,255,.22); border-radius: 999px; background: rgba(255,255,255,.08); font-size: 15px; font-weight: 600; transition: background .15s ease; }
.rxm-bouton:hover:not(:disabled) { background: rgba(255,255,255,.18); }
.rxm-bouton:disabled { opacity: .35; cursor: default; }
.rxm-scene { position: relative; height: min(78vh, 900px); min-height: 360px; display: grid; place-items: center; }
.rxm-bloc { flex: none; }
.rxm-bloc .stf__wrapper { width: 100%; height: 100%; }
.rxm-page { background: #f3f1ec; overflow: hidden; }
.rxm-page img { display: block; width: 100%; height: 100%; object-fit: cover; user-select: none; -webkit-user-select: none; pointer-events: none; }
.rxm-barre { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 16px; width: min(100%, 640px); margin: 22px auto 0; }
.rxm-fleche { display: grid; place-items: center; width: 50px; height: 50px; border: 0; border-radius: 50%; background: #ffb90d; color: #ffffff; transition: transform .15s ease, opacity .2s ease; }
.rxm-fleche:hover:not(:disabled) { transform: scale(1.06); }
.rxm-fleche:disabled { opacity: .3; cursor: default; }
.rxm-position { display: grid; gap: 8px; text-align: center; }
.rxm-indicateur { font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; }
.rxm-indicateur em { font-style: normal; font-weight: 500; color: rgba(238,243,251,.6); }
.rxm input[type="range"] { width: 100%; height: 24px; margin: 0; accent-color: #ffb90d; cursor: pointer; }
.rxm-astuce { margin: 14px 0 0; text-align: center; font-size: 13.5px; color: rgba(238,243,251,.62); transition: opacity .6s ease; }
.rxm-astuce.rxm-cachee { opacity: 0; }
.rxm :focus-visible { outline: 2px solid #8fb4f0; outline-offset: 3px; }
.rxm:fullscreen { background: #0b1a36; padding: 18px; display: flex; flex-direction: column; justify-content: center; }
.rxm:fullscreen .rxm-scene { height: calc(100vh - 170px); }
/* Mode agrandi (zoom) : la liseuse elle-même occupe l'écran, avec son effet de page tournée ; plus loin que
   le niveau 1, le livre dépasse l'écran et se parcourt en faisant défiler. */
.rxm-agr { display: none !important; }
.rxm--agrandi { position: fixed; inset: 0; z-index: 400; overflow: auto; overscroll-behavior: contain; background: #0b1a36; padding: 0 16px; display: flex; flex-direction: column; }
.rxm--agrandi .rxm-agr { display: inline-flex !important; }
.rxm--agrandi [data-action="zoom"], .rxm--agrandi [data-action="plein"] { display: none; }
.rxm--agrandi .rxm-outils { position: sticky; top: 0; left: 0; z-index: 3; width: 100%; max-width: none; margin: 0; padding: calc(env(safe-area-inset-top, 0px) + 10px) 0 10px; background: linear-gradient(#0b1a36 70%, rgba(11,26,54,0)); }
.rxm--agrandi .rxm-scene { place-items: start center; flex: none; height: calc((100dvh - 190px) * var(--rxm-niveau, 1)); width: calc(100% * var(--rxm-niveau, 1)); min-height: 0; margin: 0 auto; }
.rxm--agrandi .rxm-barre { position: sticky; bottom: 0; left: 0; z-index: 3; margin: 12px auto 0; padding: 8px 0 calc(env(safe-area-inset-bottom, 0px) + 12px); background: linear-gradient(rgba(11,26,54,0), #0b1a36 35%); }
.rxm--agrandi .rxm-astuce { display: none; }
@media (max-width: 700px) {
  .rxm-outils { margin-bottom: 10px; }
  .rxm-barre { gap: 12px; margin-top: 16px; }
  .rxm-fleche { width: 46px; height: 46px; }
}
@media (prefers-reduced-motion: reduce) { .rxm-astuce { transition: none; } }
`

// Diagnostic : ?debug-magazine dans l'adresse.
const DEBUG = /debug-magazine/.test(location.search)
const trace = (...a) => { if (DEBUG) console.log('[magazine]', ...a) }

function visibles(i, portrait) {
  if (portrait || i === 0 || i >= N - 1) return [i]
  const gauche = i % 2 === 1 ? i : i - 1
  return gauche + 1 < N ? [gauche, gauche + 1] : [gauche]
}

function monter(racine) {
  const langue = TEXTES[racine.dataset.langue] ? racine.dataset.langue : 'fr'
  langueMagazine = langue
  const T = TEXTES[langue]
  const pleinEcranPossible = !!document.fullscreenEnabled
  racine.innerHTML = `
    <div class="rxm">
      <div class="rxm-outils">
        <button type="button" class="rxm-bouton" data-action="zoom" aria-label="${T.lire}">${icone('zoom')}<span>${T.zoom}</span></button>
        <button type="button" class="rxm-bouton rxm-agr" data-z="-1" aria-label="${T.reduire}">${icone('moins')}</button>
        <button type="button" class="rxm-bouton rxm-agr" data-z="1" aria-label="${T.agrandir}">${icone('plus')}</button>
        <button type="button" class="rxm-bouton rxm-agr" data-z="0" aria-label="${T.fermer}">${icone('fermer')}</button>
        ${pleinEcranPossible ? `<button type="button" class="rxm-bouton" data-action="plein" aria-label="${T.pleinEcran}">${icone('plein')}</button>` : ''}
      </div>
      <div class="rxm-scene" aria-label="${T.magazine}, ${N} ${T.pages.toLowerCase()}"></div>
      <div class="rxm-barre">
        <button type="button" class="rxm-fleche" data-action="precedente" aria-label="${T.precedente}">${icone('gauche')}</button>
        <div class="rxm-position">
          <span class="rxm-indicateur" aria-live="polite"></span>
          <input type="range" min="0" max="${N - 1}" value="0" aria-label="${T.aller}">
        </div>
        <button type="button" class="rxm-fleche" data-action="suivante" aria-label="${T.suivante}">${icone('droite')}</button>
      </div>
      <p class="rxm-astuce"></p>
    </div>`
  const boite = racine.querySelector('.rxm')
  const scene = racine.querySelector('.rxm-scene')
  const indicateur = racine.querySelector('.rxm-indicateur')
  const curseur = racine.querySelector('input[type="range"]')
  const astuce = racine.querySelector('.rxm-astuce')
  const [precedente, suivante] = racine.querySelectorAll('.rxm-fleche')

  let pf = null, bloc = null, imgs = [], enPortrait = false, page = 0
  // Mode agrandi (zoom) : niveau 0 = livre à la taille de l'écran ; au-delà, livre plus grand que l'écran, que
  // l'on parcourt en le faisant défiler — les pages se tournent alors aux flèches (souris et doigt défilent).
  let agrandi = false, niveau = 0
  // Écran tactile : au-delà du niveau 0, le doigt fait défiler le livre agrandi (les pages se tournent aux flèches).
  const tactile = window.matchMedia('(pointer: coarse)').matches
  let demandees = new Set(), enCours = 0, etat = 'read', enAttente = 0, sens = 1, aTourne = false

  // ── Préchargement : toutes les pages, la plus proche de la page affichée d'abord ──
  const suivantes = () => {
    while (enCours < CHARGEMENTS_SIMULTANES) {
      let k = -1, meilleur = Infinity
      for (let j = 0; j < N; j++) {
        if (demandees.has(j)) continue
        const distance = j >= page ? j - page : (page - j) * 1.5 + 0.5
        if (distance < meilleur) { meilleur = distance; k = j }
      }
      if (k < 0) return
      demandees.add(k)
      enCours++
      const img = imgs[k], lot = imgs
      const fini = () => {
        if (lot !== imgs) return
        enCours--
        img.decode().catch(() => {})
        suivantes()
      }
      img.addEventListener('load', fini, { once: true })
      img.addEventListener('error', fini, { once: true })
      img.srcset = jeu(k + 1)
    }
  }

  // ── Taille exacte du livre, centrée ; glissement de la couverture seule ──
  const dimensionner = () => {
    if (!bloc) return
    const cs = getComputedStyle(scene)
    const W = scene.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
    // Page seule (téléphone tenu droit) : la scène suit la page, qui prend la largeur dans la limite de 78 %
    // de la hauteur de l'écran ; double page : la scène a sa hauteur (CSS) et le livre s'y loge.
    const H = enPortrait && !agrandi ? window.innerHeight * 0.78 : scene.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
    const largeurPage = Math.min(enPortrait ? W : W / 2, H * RATIO)
    bloc.style.width = `${Math.floor(enPortrait ? largeurPage : largeurPage * 2)}px`
    bloc.style.height = `${Math.floor(largeurPage / RATIO)}px`
  }
  const decalage = i => {
    if (!bloc || enPortrait) return 0
    const demiPage = Math.min(bloc.clientWidth / 2, bloc.clientHeight * RATIO) / 2
    if (i === 0) return -demiPage
    if (i === N - 1 && N % 2 === 0) return demiPage
    return 0
  }
  const centrer = (i, anime = true) => {
    if (!bloc) return
    bloc.style.transition = anime ? `transform ${DUREE_GLISSEMENT}ms cubic-bezier(.25, .8, .3, 1)` : 'none'
    bloc.style.transform = `translateX(${decalage(i)}px)`
  }
  // Une page à la fois sur un écran plus haut que large, ou si la place manque pour deux.
  const estPortrait = () => window.innerWidth < window.innerHeight || scene.clientWidth < 560
  const destination = i => (sens > 0 ? (i === 0 ? 1 : Math.min(N - 1, i + 2)) : (i <= 2 ? 0 : i - 2))

  // ── Affichage de la position ──
  const afficher = () => {
    const vues = visibles(page, enPortrait)
    const texte = page === 0 ? T.couverture : `${vues.length > 1 ? T.pages : T.page} ${vues.map(v => v + 1).join('–')}`
    indicateur.innerHTML = `${texte}<em> / ${N}</em>`
    curseur.value = String(page)
    precedente.disabled = page === 0
    suivante.disabled = page >= N - 1 || (!enPortrait && vues.includes(N - 1))
    astuce.textContent = enPortrait ? T.astucePortrait : T.astuce
    astuce.classList.toggle('rxm-cachee', aTourne)
  }

  // ── Construction (et reconstruction quand l'écran passe de large à haut) ──
  const construire = () => {
    const PageFlip = window.St && window.St.PageFlip
    // Le gabarit affiche la page après coup : construit dès que la zone est mesurable (observateur ci-dessous).
    trace('construire', { PageFlip: !!PageFlip, largeur: scene.clientWidth, branche: scene.isConnected })
    if (!PageFlip || !scene.clientWidth) return
    if (pf) pf.destroy()
    if (bloc) bloc.remove()
    enPortrait = estPortrait()
    bloc = document.createElement('div')
    bloc.className = 'rxm-bloc'
    scene.appendChild(bloc)
    scene.style.height = enPortrait && !agrandi ? 'auto' : ''
    dimensionner()
    bloc.addEventListener('pointerdown', e => {
      const b = bloc.getBoundingClientRect()
      sens = e.clientX < b.left + b.width / 2 ? -1 : 1
    }, { capture: true })
    imgs = []
    demandees = new Set()
    enCours = 0
    const pages = []
    for (let i = 0; i < N; i++) {
      const p = document.createElement('div')
      p.className = 'rxm-page'
      if (i === 0 || i === N - 1) p.dataset.density = 'hard'
      const img = document.createElement('img')
      img.alt = `${T.page} ${i + 1}`
      img.decoding = 'async'
      img.draggable = false
      img.sizes = enPortrait ? '100vw' : '50vw'
      if (i === 0) img.setAttribute('fetchpriority', 'high')
      p.appendChild(img)
      imgs.push(img)
      bloc.appendChild(p)
      pages.push(p)
    }
    suivantes()
    const largeur = 700
    pf = new PageFlip(bloc, {
      width: largeur, height: Math.round(largeur / RATIO), size: 'stretch',
      minWidth: enPortrait ? Math.ceil(bloc.clientWidth / 2) + 1 : 120, maxWidth: 2400, minHeight: 100, maxHeight: 4000,
      startPage: page, showCover: true, usePortrait: true, autoSize: false,
      drawShadow: true, maxShadowOpacity: 0.45, flippingTime: 750, mobileScrollSupport: false, showPageCorners: true,
      useMouseEvents: !(agrandi && niveau > 0 && tactile),
    })
    pf.loadFromHTML(pages)
    etat = 'read'
    enAttente = 0
    centrer(page, false)
    pf.on('flip', e => { page = e.data; aTourne = true; suivantes(); afficher() })
    pf.on('changeState', e => {
      const nouvel = String(e.data), courante = pf.getCurrentPageIndex()
      etat = nouvel
      if (nouvel === 'user_fold' || nouvel === 'flipping') centrer(destination(courante))
      else if (nouvel === 'read') {
        centrer(courante)
        if (enAttente !== 0) {
          const pas = Math.sign(enAttente)
          enAttente -= pas
          sens = pas
          setTimeout(() => (pas > 0 ? pf.flipNext() : pf.flipPrev()), 0)
        }
      }
    })
    page = pf.getCurrentPageIndex()
    afficher()
  }

  const tourner = pas => {
    if (!pf) return
    if (etat !== 'read') { enAttente = Math.max(-3, Math.min(3, enAttente + pas)); return }
    sens = pas
    if (pas > 0) pf.flipNext(); else pf.flipPrev()
  }

  precedente.addEventListener('click', () => tourner(-1))
  suivante.addEventListener('click', () => tourner(1))
  curseur.addEventListener('input', () => {
    if (!pf) return
    pf.turnToPage(Number(curseur.value))
    page = pf.getCurrentPageIndex()
    suivantes()
    centrer(page)
    afficher()
  })

  // Zoom de lecture (Franck, 25.10.2026 : « une fois zoomé on doit pouvoir feuilleter le magazine, idem
  // mobile », puis « dommage en zoom de perdre l'effet feuilletage ») : la liseuse elle-même passe en grand,
  // même livre, même page, mêmes pages qui se tournent (flèches, clavier, coin ou glissé du doigt).
  const zoomBoutons = () => {
    racine.querySelector('[data-z="-1"]').disabled = niveau === 0
    racine.querySelector('[data-z="1"]').disabled = niveau === NIVEAUX_ZOOM.length - 1
  }
  // Le livre agrandi est centré dans l'écran (il le dépasse au-delà du niveau 0).
  const recentrer = () => requestAnimationFrame(() => requestAnimationFrame(() => {
    boite.scrollLeft = (boite.scrollWidth - boite.clientWidth) / 2
    boite.scrollTop = 0
  }))
  const appliquerZoom = (nouveau, reconstruire) => {
    niveau = nouveau
    boite.style.setProperty('--rxm-niveau', String(NIVEAUX_ZOOM[niveau]))
    zoomBoutons()
    // Livre reconstruit à chaque niveau : page-flip garde ainsi la page seule sur écran haut (sinon, agrandi
    // sans reconstruction, il repassait en double page) et, au-delà du niveau 0 sur écran tactile, laisse le
    // doigt parcourir le livre.
    if (reconstruire) requestAnimationFrame(() => construire())
    recentrer()
  }
  const ouvrirZoom = () => {
    if (agrandi) return
    agrandi = true
    boite.classList.add('rxm--agrandi')
    document.documentElement.style.overflow = 'hidden'
    // Le zoom s'ouvre agrandi (×1,6) : « − » revient au livre entier à la taille de l'écran.
    appliquerZoom(1, true)
    racine.querySelector('[data-z="0"]').focus()
  }
  const fermerZoom = () => {
    if (!agrandi) return
    agrandi = false
    boite.classList.remove('rxm--agrandi')
    boite.style.removeProperty('--rxm-niveau')
    niveau = 0
    document.documentElement.style.overflow = ''
    requestAnimationFrame(() => construire())
    boite.scrollIntoView({ block: 'center' })
  }
  racine.querySelector('[data-action="zoom"]').addEventListener('click', ouvrirZoom)
  racine.querySelector('.rxm-outils').addEventListener('click', e => {
    const b = e.target.closest('[data-z]')
    if (!b) return
    const z = Number(b.dataset.z)
    if (z === 0) { fermerZoom(); return }
    const nouveau = Math.max(0, Math.min(NIVEAUX_ZOOM.length - 1, niveau + z))
    if (nouveau !== niveau) appliquerZoom(nouveau, true)
  })
  const boutonPlein = racine.querySelector('[data-action="plein"]')
  if (boutonPlein) {
    boutonPlein.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen()
      else boite.requestFullscreen().catch(() => {})
    })
    document.addEventListener('fullscreenchange', () => {
      boutonPlein.setAttribute('aria-label', document.fullscreenElement ? T.quitterPleinEcran : T.pleinEcran)
    })
  }

  // Clavier : flèches pour tourner (quand la liseuse est à l'écran), Échap ferme le zoom.
  if (window.__rxmClavier) document.removeEventListener('keydown', window.__rxmClavier)
  window.__rxmClavier = e => {
    if (e.key === 'Escape') { fermerZoom(); return }
    if (!boite.isConnected) return
    const r = boite.getBoundingClientRect()
    if (!agrandi && (r.bottom < 0 || r.top > window.innerHeight)) return
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '') && document.activeElement !== curseur) return
    if (e.key === 'ArrowRight') { e.preventDefault(); tourner(1) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); tourner(-1) }
  }
  document.addEventListener('keydown', window.__rxmClavier)

  // Construction dès que la zone est mesurable : le gabarit l'affiche après coup, et l'observateur de taille
  // ne le signale pas toujours (vu dans Chrome) — on vérifie donc aussi toutes les 150 ms jusqu'à la
  // construction. Ensuite, téléphone tourné (écran large ↔ écran haut) : reconstruit à la même page ;
  // sinon simple recalage.
  const ajuster = () => {
    trace('taille', scene.clientWidth, scene.isConnected)
    if (!scene.isConnected || !scene.clientWidth) return
    if (!pf || estPortrait() !== enPortrait) construire()
    else { dimensionner(); pf.update(); centrer(pf.getCurrentPageIndex(), false) }
  }
  const observateur = new ResizeObserver(ajuster)
  observateur.observe(scene)
  window.addEventListener('resize', ajuster)
  let essais = 0
  const guet = setInterval(() => {
    if (pf || !scene.isConnected || ++essais > 400) { clearInterval(guet); return }
    ajuster()
  }, 150)
  ajuster()
}

// La page est rendue par le gabarit du site, qui peut recopier ce qu'il affiche : une liseuse recopiée n'est
// qu'un dessin inerte. On monte donc la liseuse sur l'élément #rx-magazine réellement présent dans la page,
// s'il ne porte pas déjà une liseuse active (marque posée sur l'élément lui-même, qu'une copie n'emporte pas).
const actives = new WeakSet()
function guetter() {
  const racine = document.getElementById('rx-magazine')
  if (!racine || actives.has(racine)) return
  trace('montage', racine.isConnected)
  actives.add(racine)
  monter(racine)
}
if (!document.getElementById('rx-magazine-style')) {
  const s = document.createElement('style')
  s.id = 'rx-magazine-style'
  s.textContent = STYLE
  document.head.appendChild(s)
}
new MutationObserver(guetter).observe(document.documentElement, { childList: true, subtree: true })
guetter()
