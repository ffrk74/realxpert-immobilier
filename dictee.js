// Dictée du champ de l'accueil (Franck, 27.09 : OpenAI ; « que ça s'écrive au moment où je
// dicte »).
//
// Un clic sur le micro : « Un instant… » le temps de la connexion, puis « Je vous écoute… » —
// le texte s'écrit dans le champ au fil de la parole (dictee-direct.js). Un second clic (ou
// une minute) : la phrase est validée et sa version finale remplace le brouillon. Le visiteur
// peut la corriger avant « Démarrer la conversation ».
//
// Secours : l'enregistrement tourne en parallèle ; si la connexion en direct échoue ou ne
// rend rien, il est transcrit à la fin par l'application (/api/transcribe).
//
// « Démarrer la conversation » (clic, ou Entrée dans le champ) coupe le micro net : la
// question part telle qu'elle est écrite, plus rien ne s'y ajoute ensuite.
//
// La page est un gabarit qui se re-rend : écouteurs posés sur le document, état visuel
// porté par une classe sur <html> et une bulle ajoutée au <body>, que le gabarit ne
// touche pas.

import { ouvrirDicteeDirecte, ErreurDictee } from './dictee-direct.js?v=1'

const APPLICATION = 'https://orchids-realexpert-02.vercel.app'
const MICRO = '[data-r="micro"]'
const CHAMP = '[data-r="heroinput"]'
const ZONE = '[data-r="herostart"]'
const DUREE_MAX = 60_000

const LANGUE = (decodeURIComponent(location.pathname).match(/(FR|DE|EN|IT)\.dc\.html/i) || [, 'FR'])[1].toUpperCase()
const TACTILE = matchMedia('(pointer: coarse)').matches

const T = {
  FR: {
    connexion: 'Un instant…', ecoute: 'Je vous écoute…', finir: TACTILE ? 'Touchez le micro pour terminer' : 'Cliquez sur le micro pour terminer',
    transcription: 'Transcription en cours…', micro: 'Dicter votre question',
    limite: 'Trop de dictées d’affilée : réessayez dans quelques minutes.',
    indisponible: 'La dictée est momentanément indisponible. Vous pouvez écrire votre question.',
    trop_long: 'Enregistrement trop long : dictez en plusieurs fois.',
    rien: 'Je n’ai rien entendu. Réessayez en parlant près du micro.',
    refuse: 'Autorisez l’accès au micro dans votre navigateur pour dicter votre question.',
    absent: 'Aucun micro accessible sur cet appareil.',
    non_supporte: 'La dictée n’est pas disponible sur ce navigateur. Vous pouvez écrire votre question.',
    reseau: 'Connexion impossible. Vérifiez votre réseau et réessayez.',
  },
  DE: {
    connexion: 'Einen Moment…', ecoute: 'Ich höre zu…', finir: TACTILE ? 'Tippen Sie auf das Mikrofon, um zu beenden' : 'Klicken Sie auf das Mikrofon, um zu beenden',
    transcription: 'Wird umgewandelt…', micro: 'Frage diktieren',
    limite: 'Zu viele Diktate hintereinander: Versuchen Sie es in einigen Minuten erneut.',
    indisponible: 'Das Diktat ist vorübergehend nicht verfügbar. Sie können Ihre Frage schreiben.',
    trop_long: 'Aufnahme zu lang: Diktieren Sie in mehreren Teilen.',
    rien: 'Ich habe nichts gehört. Sprechen Sie bitte näher am Mikrofon.',
    refuse: 'Erlauben Sie den Zugriff auf das Mikrofon in Ihrem Browser, um zu diktieren.',
    absent: 'Auf diesem Gerät ist kein Mikrofon verfügbar.',
    non_supporte: 'Das Diktat ist in diesem Browser nicht verfügbar. Sie können Ihre Frage schreiben.',
    reseau: 'Keine Verbindung. Prüfen Sie Ihr Netzwerk und versuchen Sie es erneut.',
  },
  EN: {
    connexion: 'One moment…', ecoute: 'Listening…', finir: TACTILE ? 'Tap the microphone to finish' : 'Click the microphone to finish',
    transcription: 'Transcribing…', micro: 'Dictate your question',
    limite: 'Too many dictations in a row: please try again in a few minutes.',
    indisponible: 'Dictation is temporarily unavailable. You can type your question.',
    trop_long: 'Recording too long: dictate in several parts.',
    rien: 'I didn’t hear anything. Try again, speaking close to the microphone.',
    refuse: 'Allow microphone access in your browser to dictate your question.',
    absent: 'No microphone available on this device.',
    non_supporte: 'Dictation isn’t available in this browser. You can type your question.',
    reseau: 'Connection failed. Check your network and try again.',
  },
  IT: {
    connexion: 'Un attimo…', ecoute: 'Vi ascolto…', finir: TACTILE ? 'Toccate il microfono per terminare' : 'Cliccate sul microfono per terminare',
    transcription: 'Trascrizione in corso…', micro: 'Dettate la vostra domanda',
    limite: 'Troppe dettature di fila: riprovate tra qualche minuto.',
    indisponible: 'La dettatura è momentaneamente non disponibile. Potete scrivere la vostra domanda.',
    trop_long: 'Registrazione troppo lunga: dettate in più volte.',
    rien: 'Non ho sentito nulla. Riprovate parlando vicino al microfono.',
    refuse: 'Autorizzate l’accesso al microfono nel browser per dettare la vostra domanda.',
    absent: 'Nessun microfono disponibile su questo dispositivo.',
    non_supporte: 'La dettatura non è disponibile su questo browser. Potete scrivere la vostra domanda.',
    reseau: 'Connessione impossibile. Verificate la rete e riprovate.',
  },
}[LANGUE]

/* ── Apparence ─────────────────────────────────────────────────────────────── */
const style = document.createElement('style')
style.textContent = `
  ${MICRO} { cursor: pointer; transition: color .15s ease; -webkit-tap-highlight-color: transparent; }
  ${MICRO}:hover, ${MICRO}:focus-visible { color: #1a73c9 !important; outline: none; }
  html.rx-dictee-ecoute ${MICRO} { color: #e0312b !important; }
  html.rx-dictee-ecoute ${MICRO} svg { animation: rx-dictee-pouls 1.1s ease-in-out infinite; }
  html.rx-dictee-transcription ${MICRO} { color: #1a73c9 !important; }
  html.rx-dictee-transcription ${MICRO} svg { animation: rx-dictee-attente 1s ease-in-out infinite; }
  @keyframes rx-dictee-pouls { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
  @keyframes rx-dictee-attente { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
  @keyframes rx-dictee-clignote { 0%, 100% { opacity: 1; } 50% { opacity: .25; } }
  .rx-dictee-bulle { position: fixed; z-index: 900; display: flex; align-items: center; gap: 10px;
    max-width: min(420px, calc(100vw - 32px)); padding: 10px 14px; border-radius: 12px; background: #fff;
    border: 1px solid #dce3ea; box-shadow: 0 12px 30px rgba(20,50,90,.18); font-family: inherit;
    font-size: 14px; line-height: 1.4; color: #0c1f2c; pointer-events: none; }
  .rx-dictee-point { flex: 0 0 auto; width: 9px; height: 9px; border-radius: 50%; background: #e0312b;
    animation: rx-dictee-clignote 1s ease-in-out infinite; }
  .rx-dictee-temps { font-variant-numeric: tabular-nums; color: #6a7b86; }
  .rx-dictee-aide { color: #6a7b86; }
  /* Sur ordinateur la page est vue à 80 % (echelle.css) : la bulle garde une taille lisible. */
  @media (min-width: 1024px) { .rx-dictee-bulle { font-size: 16.5px; padding: 12px 16px; } }
  @media (prefers-reduced-motion: reduce) {
    html.rx-dictee-ecoute ${MICRO} svg, html.rx-dictee-transcription ${MICRO} svg, .rx-dictee-point { animation: none; }
  }
`
document.head.appendChild(style)

// Le micro devient un vrai bouton pour le clavier et les lecteurs d'écran (reposé
// après chaque rendu du gabarit).
function rendreAccessible() {
  const micro = document.querySelector(MICRO)
  if (micro && micro.getAttribute('role') !== 'button') {
    micro.setAttribute('role', 'button')
    micro.setAttribute('tabindex', '0')
    micro.setAttribute('aria-label', T.micro)
  }
}
new MutationObserver(rendreAccessible).observe(document.documentElement, { childList: true, subtree: true })
rendreAccessible()

/* ── La bulle d'état, au-dessus du champ ───────────────────────────────────── */
const zoomPage = () => parseFloat(getComputedStyle(document.documentElement).zoom) || 1
let bulle = null
let bulleVisible = false
let effacement = null

function placer() {
  const zone = document.querySelector(ZONE)
  // Une bulle cachée ne revient pas : le défilement et le redimensionnement (barre
  // d'adresse du téléphone) rappellent placer() — ils remettaient « Transcription en
  // cours… » à l'écran après l'arrivée du texte.
  if (!bulle || !bulleVisible || !zone) return
  if (!document.body.contains(bulle)) document.body.appendChild(bulle)
  const z = zoomPage()
  const r = zone.getBoundingClientRect()
  bulle.style.left = `${Math.max(16, r.left / z)}px`
  bulle.style.top = `${Math.max(8, r.top / z - bulle.offsetHeight - 10)}px`
}

function montrer(html, duree = 0) {
  clearTimeout(effacement)
  if (!bulle) { bulle = document.createElement('div'); bulle.className = 'rx-dictee-bulle'; bulle.setAttribute('role', 'status') }
  bulle.innerHTML = html
  bulleVisible = true
  document.body.appendChild(bulle)
  placer()
  if (duree) effacement = setTimeout(cacher, duree)
}
function cacher() { clearTimeout(effacement); bulleVisible = false; bulle?.remove() }
addEventListener('scroll', placer, { passive: true })
addEventListener('resize', placer)

const echapper = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const erreur = code => montrer(echapper(T[code] || T.indisponible), 6000)

/* ── La dictée ─────────────────────────────────────────────────────────────── */
let etat = 'repos'          // repos | connexion | ecoute | transcription
let enregistreur = null
let flux = null
let morceaux = []
let debut = 0
let horloge = null
let limite = null
let direct = null
let finalisation = null     // la session en cours de validation (arrêt demandé)
let base = ''               // ce qui était déjà écrit dans le champ avant la dictée
let generation = 0          // change à chaque coupure : une réponse tardive n'écrit plus rien

function classe(nom) {
  document.documentElement.classList.remove('rx-dictee-ecoute', 'rx-dictee-transcription')
  if (nom) document.documentElement.classList.add(nom)
}

function formatMime() {
  for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']) {
    try { if (MediaRecorder.isTypeSupported(m)) return m } catch {}
  }
  return ''
}

/** Le texte dicté, à la suite de ce qui était déjà écrit ; la zone s'allonge (hero-saisie.js). */
function ecrire(texte) {
  const champ = document.querySelector(CHAMP)
  if (!champ) return
  champ.value = base && texte ? `${base} ${texte}` : (base || texte)
  champ.dispatchEvent(new Event('input', { bubbles: true }))
}

function afficherEcoute() {
  const s = Math.floor((Date.now() - debut) / 1000)
  const temps = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  montrer(`<span class="rx-dictee-point"></span><span><strong>${T.ecoute}</strong> <span class="rx-dictee-temps">${temps}</span><br><span class="rx-dictee-aide">${T.finir}</span></span>`)
}

function toutCouper() {
  clearInterval(horloge); clearTimeout(limite)
  try { direct?.fermer() } catch {}
  direct = null
  try { finalisation?.fermer() } catch {}
  finalisation = null
  try { if (enregistreur && enregistreur.state !== 'inactive') enregistreur.stop() } catch {}
  enregistreur = null
  flux?.getTracks().forEach(p => p.stop())
  flux = null
}

function ecouter() {
  etat = 'ecoute'
  debut = Date.now()
  afficherEcoute()
  horloge = setInterval(afficherEcoute, 500)
}

async function demarrer() {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return erreur('non_supporte')
  try {
    flux = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
  } catch (e) {
    return erreur(e?.name === 'NotAllowedError' || e?.name === 'SecurityError' ? 'refuse' : 'absent')
  }
  const fluxCourant = flux
  base = (document.querySelector(CHAMP)?.value || '').trim()

  // L'enregistrement de secours démarre tout de suite : rien n'est perdu.
  const mime = formatMime()
  enregistreur = new MediaRecorder(flux, mime ? { mimeType: mime } : undefined)
  morceaux = []
  enregistreur.ondataavailable = e => { if (e.data.size > 0) morceaux.push(e.data) }
  enregistreur.start()
  debut = Date.now()
  etat = 'connexion'
  classe('rx-dictee-ecoute')
  montrer(`<span class="rx-dictee-point"></span><span><strong>${T.connexion}</strong></span>`)
  limite = setTimeout(arreter, DUREE_MAX)

  try {
    const d = await ouvrirDicteeDirecte({
      flux: fluxCourant,
      langue: LANGUE.toLowerCase(),
      base: APPLICATION,
      surBrouillon: texte => { if (etat === 'ecoute' || etat === 'transcription') ecrire(texte) },
    })
    // Arrêté pendant la connexion : le secours a pris le relais.
    if (etat !== 'connexion' || flux !== fluxCourant) { d.fermer(); return }
    direct = d
  } catch (e) {
    if (etat !== 'connexion' || flux !== fluxCourant) return
    const code = e?.code || 'connexion'
    if (code === 'limite' || code === 'indisponible') {
      toutCouper(); etat = 'repos'; classe(null)
      return erreur(code)
    }
    // Pas de direct (réseau, navigateur) : on écoute quand même, le texte viendra à la fin.
    console.warn('[dictée] direct indisponible, secours :', code)
  }
  ecouter()
}

/** Secours : l'enregistrement complet, transcrit à la fin. */
async function transcrireEnregistrement(audio) {
  const formulaire = new FormData()
  formulaire.append('audio', audio, (audio.type || '').includes('mp4') ? 'dictee.mp4' : 'dictee.webm')
  formulaire.append('language', LANGUE.toLowerCase())
  const reponse = await fetch(`${APPLICATION}/api/transcribe`, { method: 'POST', body: formulaire })
  const d = await reponse.json().catch(() => ({}))
  if (!reponse.ok || !d.success) throw new ErreurDictee(d.code || 'indisponible')
  return String(d.text || '').trim()
}

async function arreter() {
  if (etat !== 'ecoute' && etat !== 'connexion') return
  const gen = generation
  clearInterval(horloge); clearTimeout(limite)
  const duree = Date.now() - debut
  etat = 'transcription'
  classe('rx-dictee-transcription')
  montrer(`<span>${T.transcription}</span>`)

  const rec = enregistreur
  const audio = await new Promise(ok => {
    if (!rec || rec.state === 'inactive') return ok(null)
    rec.onstop = () => ok(new Blob(morceaux, { type: rec.mimeType || 'audio/webm' }))
    try { rec.stop() } catch { ok(null) }
  })
  enregistreur = null

  try {
    let texte = ''
    const d = direct
    direct = null
    finalisation = d
    if (d) texte = await d.terminer()
    finalisation = null
    if (gen !== generation) return   // coupée entre-temps (« Démarrer la conversation »)
    if (!texte && audio && audio.size > 1000 && duree > 600) texte = await transcrireEnregistrement(audio)
    if (gen !== generation) return
    if (texte) { ecrire(texte); cacher() } else erreur('rien')
  } catch (e) {
    if (gen === generation) erreur(e?.code || 'reseau')
  } finally {
    if (gen === generation) {
      toutCouper()
      etat = 'repos'
      classe(null)
    }
  }
}

/** La question part : le micro se coupe net, sans finalisation. */
function couper() {
  if (etat === 'repos') return
  generation += 1
  etat = 'repos'
  toutCouper()
  classe(null)
  cacher()
}

function basculer() {
  if (etat === 'transcription') return
  if (etat === 'ecoute' || etat === 'connexion') arreter()
  else demarrer()
}

document.addEventListener('click', e => {
  // « Démarrer la conversation » (Entrée dans le champ passe aussi par ce bouton).
  if (e.target.closest?.('[data-r="herobtn"]')) { couper(); return }
  if (!e.target.closest?.(MICRO)) return
  e.preventDefault()
  basculer()
})
document.addEventListener('keydown', e => {
  if (!e.target.matches?.(MICRO) || (e.key !== 'Enter' && e.key !== ' ')) return
  e.preventDefault()
  basculer()
})
