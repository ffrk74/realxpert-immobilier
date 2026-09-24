// Branche les deux panneaux de la maquette (inscription et connexion) sur les comptes
// RealXpert, puis renvoie le visiteur vers sa discussion.
//
// Le parcours : identité → code reçu par e-mail → code reçu par SMS → discussion.
// Les deux étapes de code s'affichent dans un panneau à moi, réinstallé s'il disparaît :
// la page se re-rend toutes les quatre secondes et peut emporter ce qu'elle ne connaît pas.
//
// Les deux sites sont sur des domaines différents : la session ouverte ici n'existe pas
// là-bas. Elle est donc transmise dans le fragment de l'URL — jamais envoyé au serveur —
// puis effacée de la barre d'adresse à l'arrivée. C'est le procédé qu'emploie Supabase
// lui-même au retour d'une connexion Google.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
import { monterSaisieTelephone, formaterPourAffichage } from './telephone.js?v=3'

const supabase = createClient(
  'https://mmhutoipdzwkvaufucko.supabase.co',
  'sb_publishable_nt9NW_tnbeEes4lRWmEUbA_YaIe6sX2',
)

// La discussion est servie par l'application : c'est là que tourne le moteur de
// l'experte, et donc toujours sa dernière version.
const APPLICATION_DISCUSSION = 'https://orchids-realexpert-02.vercel.app/discussion'
const MEMOIRE_QUESTION = 'realxpert_question_initiale'

const LANGUE = (decodeURIComponent(location.pathname).match(/-\s*(FR|DE|EN|IT)\.dc\.html/i)
  || [, 'FR'])[1].toUpperCase()

const T = {
  FR: {
    page: 'Ma discussion - FR.dc.html',
    titreEmail: 'Confirmez votre e-mail', titreSms: 'Confirmez votre numéro',
    sousEmail: 'Nous avons envoyé un code de vérification à', indesirables: 'Pas reçu ? Regardez dans vos courriers indésirables.',
    nonConfirme: 'Votre compte n’est pas encore confirmé : nous venons de vous renvoyer un code par e-mail.', sousSms: 'Nous avons envoyé un code de vérification au',
    valider: 'Valider le code', renvoyer: 'Renvoyer le code', renvoye: 'Code renvoyé.',
    patiente: 'Un instant…', fermer: 'Fermer',
    champs: 'Merci de remplir tous les champs.',
    email: 'Cette adresse e-mail ne semble pas valide.',
    telephone: 'Ce numéro ne correspond pas à un mobile du pays choisi : vérifiez le drapeau et les chiffres.',
    motdepasse: 'Le mot de passe doit faire au moins 8 caractères.',
    code: 'Saisissez le code reçu, tel qu’il vous a été envoyé.',
    codeFaux: 'Ce code est incorrect ou a expiré. Demandez-en un nouveau.',
    existe: 'Un compte existe déjà avec cette adresse. Connectez-vous.',
    identifiants: 'E-mail ou mot de passe incorrect.',
    quota: 'Trop de demandes en peu de temps. Patientez quelques minutes.',
    generique: 'Quelque chose n’a pas fonctionné. Réessayez dans un instant.',
  },
  DE: {
    page: 'Ma discussion - DE.dc.html',
    titreEmail: 'E-Mail bestätigen', titreSms: 'Nummer bestätigen',
    sousEmail: 'Wir haben einen Bestätigungscode gesendet an', indesirables: 'Nicht erhalten? Schauen Sie im Spam-Ordner nach.',
    nonConfirme: 'Ihr Konto ist noch nicht bestätigt: Wir haben Ihnen soeben einen neuen Code per E-Mail gesendet.', sousSms: 'Wir haben einen Bestätigungscode gesendet an',
    valider: 'Code bestätigen', renvoyer: 'Code erneut senden', renvoye: 'Code erneut gesendet.',
    patiente: 'Einen Moment…', fermer: 'Schliessen',
    champs: 'Bitte füllen Sie alle Felder aus.',
    email: 'Diese E-Mail-Adresse scheint nicht gültig zu sein.',
    telephone: 'Diese Nummer entspricht keiner Mobilnummer des gewählten Landes: Prüfen Sie Flagge und Ziffern.',
    motdepasse: 'Das Passwort muss mindestens 8 Zeichen haben.',
    code: 'Geben Sie den erhaltenen Code genau so ein, wie er gesendet wurde.',
    codeFaux: 'Dieser Code ist falsch oder abgelaufen. Fordern Sie einen neuen an.',
    existe: 'Für diese Adresse besteht bereits ein Konto. Bitte melden Sie sich an.',
    identifiants: 'E-Mail oder Passwort ist falsch.',
    quota: 'Zu viele Anfragen in kurzer Zeit. Bitte warten Sie einige Minuten.',
    generique: 'Etwas hat nicht funktioniert. Bitte gleich noch einmal versuchen.',
  },
  EN: {
    page: 'Ma discussion - EN.dc.html',
    titreEmail: 'Confirm your email', titreSms: 'Confirm your number',
    sousEmail: 'We sent a verification code to', indesirables: 'Not received? Please check your junk folder.',
    nonConfirme: 'Your account is not confirmed yet: we have just sent you a new code by email.', sousSms: 'We sent a verification code to',
    valider: 'Confirm code', renvoyer: 'Send a new code', renvoye: 'New code sent.',
    patiente: 'One moment…', fermer: 'Close',
    champs: 'Please fill in every field.',
    email: 'That email address does not look valid.',
    telephone: 'This does not look like a mobile number for the chosen country: check the flag and the digits.',
    motdepasse: 'The password must be at least 8 characters.',
    code: 'Enter the code exactly as it was sent to you.',
    codeFaux: 'That code is wrong or has expired. Ask for a new one.',
    existe: 'An account already exists for this address. Please sign in.',
    identifiants: 'Wrong email or password.',
    quota: 'Too many requests in a short time. Please wait a few minutes.',
    generique: 'Something did not work. Try again in a moment.',
  },
  IT: {
    page: 'Ma discussion - IT.dc.html',
    titreEmail: 'Conferma la tua e-mail', titreSms: 'Conferma il tuo numero',
    sousEmail: 'Abbiamo inviato un codice di verifica a', indesirables: 'Non l’hai ricevuto? Controlla la posta indesiderata.',
    nonConfirme: 'Il tuo account non è ancora confermato: ti abbiamo appena inviato un nuovo codice via e-mail.', sousSms: 'Abbiamo inviato un codice di verifica al',
    valider: 'Conferma il codice', renvoyer: 'Invia un nuovo codice', renvoye: 'Nuovo codice inviato.',
    patiente: 'Un momento…', fermer: 'Chiudi',
    champs: 'Compila tutti i campi.',
    email: 'Questo indirizzo e-mail non sembra valido.',
    telephone: 'Questo numero non corrisponde a un cellulare del paese scelto: controlla la bandiera e le cifre.',
    motdepasse: 'La password deve avere almeno 8 caratteri.',
    code: 'Inserisci il codice esattamente come ti è stato inviato.',
    codeFaux: 'Il codice è errato o scaduto. Richiedine uno nuovo.',
    existe: 'Esiste già un account per questo indirizzo. Accedi.',
    identifiants: 'E-mail o password errati.',
    quota: 'Troppe richieste in poco tempo. Attendi qualche minuto.',
    generique: 'Qualcosa non ha funzionato. Riprova tra un istante.',
  },
}[LANGUE]

const EMAIL_VALIDE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/
const NUMERO_VALIDE = /^\+[1-9]\d{7,14}$/

function messageDeLErreur(erreur) {
  const brut = (erreur?.message || '').toLowerCase()
  if (erreur?.status === 429 || brut.includes('rate limit')) return T.quota
  if (brut.includes('already registered')) return T.existe
  if (brut.includes('invalid login')) return T.identifiants
  if (brut.includes('token') || brut.includes('otp')) return T.codeFaux
  if (brut.includes('password')) return T.motdepasse
  if (brut.includes('phone')) return T.telephone
  if (brut.includes('email')) return T.email
  return T.generique
}

/* ---------- Les champs de la maquette ---------- */

function panneauOuvert() {
  return document.querySelector('[data-r="sheet"]')
}

function champsDuPanneau(sheet) {
  const tous = [...sheet.querySelectorAll('input')]
  return {
    textes: tous.filter(i => i.type === 'text'),
    email: tous.find(i => i.type === 'email'),
    telephone: tous.find(i => i.type === 'tel'),
    motdepasse: tous.find(i => i.type === 'password'),
    consent: tous.find(i => i.type === 'checkbox'),
  }
}

/* ---------- Mon panneau d'étapes, réinstallé s'il disparaît ---------- */

let boite = null
let etape = null          // 'email' | 'sms'
let email = '', telephone = ''

function construireBoite() {
  const d = document.createElement('div')
  d.dataset.r = 'rxcodes'
  d.style.cssText = 'position:fixed; inset:0; z-index:300; display:flex; justify-content:flex-end;'
  d.innerHTML = `
    <div data-role="voile" style="position:absolute; inset:0; background:rgba(10,25,45,0.55); backdrop-filter:blur(2px);"></div>
    <div style="position:relative; width:440px; max-width:92vw; height:100%; background:#fff; box-shadow:-24px 0 60px -20px rgba(10,25,45,0.5); overflow-y:auto;">
      <div style="padding:30px 34px 40px; font-family:inherit;">
        <div style="display:flex; justify-content:flex-end; margin-bottom:6px;">
          <button data-role="fermer" aria-label="${T.fermer}" style="background:none; border:none; cursor:pointer; color:#8a97a3; padding:6px; line-height:0; font-size:22px;">&times;</button>
        </div>
        <h2 data-role="titre" style="font-size:26px; font-weight:800; line-height:1.15; letter-spacing:-0.02em; color:#0c1f2c; margin:0 0 10px;"></h2>
        <p data-role="sous" style="font-size:15px; line-height:1.5; color:#5a6b78; margin:0 0 22px;"></p>
        <p data-role="message" style="display:none; font-size:14.5px; line-height:1.5; border-radius:11px; padding:12px 14px; margin:0 0 16px;"></p>
        <input data-role="code" type="text" inputmode="numeric" maxlength="8" autocomplete="one-time-code"
          style="width:100%; box-sizing:border-box; font-family:inherit; font-size:27px; font-weight:800; letter-spacing:9px; text-align:center; color:#0c1f2c; background:#f7f9fb; border:1px solid #dce3ea; border-radius:12px; padding:15px 10px;">
        <button data-role="valider" style="width:100%; margin-top:16px; background:linear-gradient(180deg,#efb84a,#e0a02f); color:#fff; border:none; font-family:inherit; font-size:16px; font-weight:800; padding:15px; border-radius:12px; cursor:pointer;"></button>
        <p style="text-align:center; margin:18px 0 0;">
          <button data-role="renvoyer" style="background:none; border:none; font-family:inherit; font-size:14px; font-weight:700; color:#1d4fb0; cursor:pointer;"></button>
        </p>
      </div>
    </div>`
  d.querySelector('[data-role="fermer"]').onclick = fermerBoite
  d.querySelector('[data-role="voile"]').onclick = fermerBoite
  d.querySelector('[data-role="valider"]').onclick = validerCode
  d.querySelector('[data-role="renvoyer"]').onclick = renvoyerCode
  d.querySelector('[data-role="code"]').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); validerCode() }
  })
  return d
}

function dire(texte, type = 'erreur') {
  const p = boite.querySelector('[data-role="message"]')
  if (!texte) { p.style.display = 'none'; return }
  p.style.display = 'block'
  p.style.background = type === 'erreur' ? '#fdf0ef' : '#eef6fd'
  p.style.color = type === 'erreur' ? '#9d2b20' : '#0f4e8c'
  p.textContent = texte
}

function afficherBoite() {
  if (!boite) boite = construireBoite()
  if (!document.body.contains(boite)) document.body.appendChild(boite)
  boite.querySelector('[data-role="titre"]').textContent = etape === 'email' ? T.titreEmail : T.titreSms
  boite.querySelector('[data-role="sous"]').textContent =
    (etape === 'email' ? T.sousEmail : T.sousSms) + ' ' + (etape === 'email' ? email : formaterPourAffichage(telephone)) + '.'
    + (etape === 'email' ? ' ' + T.indesirables : '')
  boite.querySelector('[data-role="valider"]').textContent = T.valider
  boite.querySelector('[data-role="renvoyer"]').textContent = T.renvoyer
  const champ = boite.querySelector('[data-role="code"]')
  champ.value = ''
  champ.focus()
  dire('')
}

function fermerBoite() {
  etape = null
  if (boite && document.body.contains(boite)) boite.remove()
}

// Le rendu de la page peut emporter ce qu'il ne connaît pas : on remet la boîte en place.
// Et le champ téléphone du panneau reçoit son drapeau dès qu'il apparaît.
new MutationObserver(() => {
  if (etape && boite && !document.body.contains(boite)) document.body.appendChild(boite)
  const tel = document.querySelector('[data-r="sheet"] input[type="tel"]')
  if (tel && tel.dataset.rxTel !== '1') monterSaisieTelephone(tel, { langue: LANGUE.toLowerCase() })
}).observe(document.documentElement, { childList: true, subtree: true })

/* ---------- Le parcours ---------- */

function occupe(bouton, oui, texteInitial) {
  bouton.disabled = oui
  bouton.textContent = oui ? T.patiente : texteInitial
}

async function inscrire(sheet, bouton) {
  effacerAlerte(sheet)
  const champs = champsDuPanneau(sheet)
  const prenom = (champs.textes[0]?.value || '').trim()
  const nom = (champs.textes[1]?.value || '').trim()
  const adresse = (champs.email?.value || '').trim()
  const saisie = champs.telephone ? monterSaisieTelephone(champs.telephone, { langue: LANGUE.toLowerCase() }) : null
  const numero = saisie?.e164() || ''
  const motdepasse = champs.motdepasse?.value || ''
  const texteBouton = bouton.textContent

  if (!prenom || !nom || !adresse || !numero || !motdepasse) return alerteSheet(sheet, T.champs)
  if (!EMAIL_VALIDE.test(adresse)) return alerteSheet(sheet, T.email)
  if (!saisie?.valide()) return alerteSheet(sheet, T.telephone)
  if (motdepasse.length < 8) return alerteSheet(sheet, T.motdepasse)

  occupe(bouton, true, texteBouton)
  const { error } = await supabase.auth.signUp({
    email: adresse, password: motdepasse,
    options: { data: {
      prenom, nom, langue: LANGUE.toLowerCase(), telephone: numero,
      consent_conseils: !!champs.consent?.checked,
    } },
  })
  occupe(bouton, false, texteBouton)
  if (error) return alerteSheet(sheet, messageDeLErreur(error))

  email = adresse; telephone = numero
  etape = 'email'
  afficherBoite()
}

async function connecter(sheet, bouton) {
  effacerAlerte(sheet)
  const champs = champsDuPanneau(sheet)
  const adresse = (champs.email?.value || '').trim()
  const motdepasse = champs.motdepasse?.value || ''
  const texteBouton = bouton.textContent
  if (!EMAIL_VALIDE.test(adresse)) return alerteSheet(sheet, T.email)
  if (!motdepasse) return alerteSheet(sheet, T.champs)

  occupe(bouton, true, texteBouton)
  const { data, error } = await supabase.auth.signInWithPassword({ email: adresse, password: motdepasse })
  occupe(bouton, false, texteBouton)
  if (error) {
    // Compte créé mais e-mail jamais confirmé : le mot de passe est bon, il manque le
    // code. On en renvoie un et on reprend l'inscription à cette étape.
    if (error.code === 'email_not_confirmed' || /not confirmed/i.test(error.message || '')) {
      email = adresse
      await supabase.auth.resend({ type: 'signup', email })
      etape = 'email'
      afficherBoite()
      return dire(T.nonConfirme, 'info')
    }
    return alerteSheet(sheet, T.identifiants)
  }
  // E-mail confirmé mais pas le numéro : on reprend à l'étape du SMS, sinon la
  // discussion renverrait vers l'inscription.
  if (!data.user?.phone_confirmed_at) {
    email = data.user?.email || adresse
    telephone = data.user?.user_metadata?.telephone || ''
    if (telephone) {
      const { error: erreurNumero } = await supabase.auth.updateUser({ phone: telephone })
      if (erreurNumero) return alerteSheet(sheet, messageDeLErreur(erreurNumero))
      etape = 'sms'
      afficherBoite()
      return
    }
  }
  partirVersLaDiscussion(data.session)
}

function effacerAlerte(sheet) {
  sheet.querySelector('[data-role="alerte"]')?.remove()
}

/** Un mot d'erreur dans le panneau de la maquette, qui n'en prévoit pas. */
function alerteSheet(sheet, texte) {
  let p = sheet.querySelector('[data-role="alerte"]')
  if (!p) {
    p = document.createElement('p')
    p.dataset.role = 'alerte'
    p.style.cssText = 'font-size:14.5px; line-height:1.5; background:#fdf0ef; color:#9d2b20; border-radius:11px; padding:12px 14px; margin:0 0 14px;'
    const bouton = boutonPrincipal(sheet)
    bouton?.parentElement?.insertBefore(p, bouton)
  }
  p.textContent = texte
}

function boutonPrincipal(sheet) {
  return [...sheet.querySelectorAll('button')].find(b => !b.getAttribute('aria-label'))
}

async function validerCode() {
  const champ = boite.querySelector('[data-role="code"]')
  const bouton = boite.querySelector('[data-role="valider"]')
  const saisi = champ.value.replace(/\D/g, '')
  if (saisi.length < 6 || saisi.length > 8) return dire(T.code)
  occupe(bouton, true, T.valider)

  if (etape === 'email') {
    let { data, error } = await supabase.auth.verifyOtp({ email, token: saisi, type: 'signup' })
    if (error) ({ data, error } = await supabase.auth.verifyOtp({ email, token: saisi, type: 'email' }))
    if (error) { occupe(bouton, false, T.valider); return dire(T.codeFaux) }
    // Arrivé par la connexion, le numéro n'a pas été saisi ici : il est dans le compte.
    telephone = telephone || data?.user?.user_metadata?.telephone || ''
    const { error: erreurNumero } = await supabase.auth.updateUser({ phone: telephone })
    occupe(bouton, false, T.valider)
    if (erreurNumero) return dire(messageDeLErreur(erreurNumero))
    etape = 'sms'
    afficherBoite()
    return
  }

  const { error } = await supabase.auth.verifyOtp({ phone: telephone, token: saisi, type: 'phone_change' })
  occupe(bouton, false, T.valider)
  if (error) return dire(T.codeFaux)
  const { data: { session } } = await supabase.auth.getSession()
  partirVersLaDiscussion(session)
}

async function renvoyerCode() {
  const bouton = boite.querySelector('[data-role="renvoyer"]')
  bouton.disabled = true
  if (etape === 'email') await supabase.auth.resend({ type: 'signup', email })
  else await supabase.auth.updateUser({ phone: telephone })
  dire(T.renvoye, 'info')
  setTimeout(() => { bouton.disabled = false }, 30000)
}

/** La session et la question passent par le fragment : il n'atteint jamais un serveur. */
function partirVersLaDiscussion(session) {
  let question = ''
  try { question = localStorage.getItem(MEMOIRE_QUESTION) || '' } catch {}
  const fragment = new URLSearchParams()
  if (session?.access_token) fragment.set('at', session.access_token)
  if (session?.refresh_token) fragment.set('rt', session.refresh_token)
  if (question) fragment.set('q', question)
  location.href = APPLICATION_DISCUSSION + '#' + fragment.toString()
}

/* ---------- Les boutons de la maquette ---------- */

document.addEventListener('click', e => {
  const bouton = e.target.closest?.('button')
  if (!bouton || bouton.getAttribute('aria-label')) return
  const sheet = bouton.closest('[data-r="sheet"]')
  if (!sheet || boite?.contains(bouton)) return
  e.preventDefault()
  const champs = champsDuPanneau(sheet)
  // Le panneau d'inscription est le seul à demander un téléphone.
  if (champs.telephone) inscrire(sheet, bouton)
  else connecter(sheet, bouton)
})
