// Branche les deux panneaux de la maquette (inscription et connexion) sur les comptes
// RealXpert, puis renvoie le visiteur vers sa discussion.
//
// Le parcours : identité → e-mail de bienvenue puis code de sécurité par e-mail → code reçu par
// SMS → discussion. Les étapes de code s'affichent dans un panneau à moi, réinstallé s'il disparaît :
// la page se re-rend toutes les quatre secondes et peut emporter ce qu'elle ne connaît pas.
//
// 26.10.2026 (Franck : inscription jamais aboutie, « mot de passe oublié » qui renvoyait un code) :
// un numéro déjà rattaché à un autre compte, ou un SMS refusé, ramène à la saisie du numéro avec la
// raison — plus jamais un écran de code qui attend un SMS parti nulle part ; « Mot de passe oublié ? »
// envoie un lien qui ouvre la page des comptes (realxpert-site), où l'on choisit le nouveau mot de passe.
//
// 27.10.2026 (Franck : « le mode debug avec la petite coccinelle […] pour bypasser le contrôle d'intégrité du
// numéro de téléphone et finaliser l'inscription de mes personnages de test ») — comme la page des comptes :
// « ?debug=1 » allume le mode essai sur ce navigateur (« ?debug=0 » l'éteint). Supabase n'accepte un numéro
// que sur UN compte : en mode essai, un numéro déjà pris bascule tout seul sur un numéro d'essai unique
// (+41 00 …, jamais attribué), et le 🐞 de l'étape du numéro fait de même à la demande. Le code SMS part
// sur le vrai mobile saisi — seulement s'il est déclaré mobile d'essai côté serveur (telephones_essai).
// Puis (Franck : « quand c'est mon téléphone ou celui de Marc, juste une petite détection auto avec un petit
// symbole de debug ») : un mobile d'essai saisi (est_mobile_essai, base des comptes) suffit — le numéro
// d'essai est pris d'office, sans « ?debug=1 », et un 🐞 le signale sur l'écran du code SMS.
//
// 27.10.2026 (Franck : « la sécurité e-mail puis du SMS, deux choses bien cloisonnées ») — un e-mail confirmé
// l'est pour de bon : l'étape de son code ne revient jamais. Refermer le panneau puis recliquer sur « Obtenir mes
// premiers conseils » (même formulaire vide), se reconnecter, ou s'inscrire à nouveau avec la même adresse et le
// même mot de passe : tout reprend au code SMS — celui déjà demandé s'il y en a un, renvoyable au rythme permis
// par Supabase (compte à rebours sur le bouton). Supabase n'accepte que le DERNIER code SMS : un code précédent
// de moins de 10 minutes est vérifié par la fonction valider-code-sms (base des comptes).
//
// Les deux sites sont sur des domaines différents : la session ouverte ici n'existe pas
// là-bas. Elle est donc transmise dans le fragment de l'URL — jamais envoyé au serveur —
// puis effacée de la barre d'adresse à l'arrivée. C'est le procédé qu'emploie Supabase
// lui-même au retour d'une connexion Google.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
import { monterSaisieTelephone, formaterPourAffichage } from './telephone.js?v=6'

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
    titreEmail: 'Votre code de sécurité', titreSms: 'Confirmez votre numéro',
    sousEmail: 'Nous avons envoyé votre code de sécurité à', indesirables: 'Pas reçu ? Regardez dans vos courriers indésirables.',
    nonConfirme: 'Votre compte n’est pas encore confirmé : nous venons de vous renvoyer un code de sécurité par e-mail.', sousSms: 'Nous avons envoyé un code de sécurité par SMS au',
    valider: 'Valider le code', renvoyer: 'Renvoyer le code', renvoye: 'Code renvoyé.',
    renvoyerDans: 'Renvoyer le code ({n} s)', essais: 'Trop de codes erronés. Patientez quelques minutes avant de réessayer.',
    reprise: 'Votre adresse e-mail est déjà confirmée : il ne reste que votre numéro. Saisissez le code reçu par SMS — même un code précédent, s’il date de moins de 10 minutes — ou demandez-en un nouveau.',
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
    titreNumero: 'Votre numéro de mobile',
    sousNumero: 'Votre e-mail est confirmé. Indiquez le mobile sur lequel recevoir votre code de sécurité par SMS.',
    boutonNumero: 'Recevoir le code par SMS',
    modifierNumero: 'Changer de numéro',
    numeroPris: 'Ce numéro de mobile est déjà rattaché à un autre compte RealXpert. Indiquez un autre numéro, ou connectez-vous avec le compte qui l’utilise.',
    essaiBouton: 'Mode essai : rattacher un numéro d’essai unique (+41 00 …) — le code SMS part sur le mobile saisi', essaiSms: 'Mode essai — numéro d’essai {essai}.',
    sms: 'Le SMS n’a pas pu partir vers ce numéro. Vérifiez-le, ou indiquez un autre mobile.',
    titreOublie: 'Réinitialiser votre mot de passe',
    sousOublie: 'Indiquez l’adresse de votre compte : nous vous envoyons un lien pour choisir un nouveau mot de passe.',
    boutonOublie: 'Recevoir le lien',
    adresse: 'Adresse e-mail',
    oublieEnvoye: 'C’est parti : si un compte existe pour cette adresse, vous allez recevoir un e-mail avec un lien pour choisir un nouveau mot de passe. Pensez à vos courriers indésirables.',
  },
  DE: {
    page: 'Ma discussion - DE.dc.html',
    titreEmail: 'Ihr Sicherheitscode', titreSms: 'Nummer bestätigen',
    sousEmail: 'Wir haben Ihren Sicherheitscode gesendet an', indesirables: 'Nicht erhalten? Schauen Sie im Spam-Ordner nach.',
    nonConfirme: 'Ihr Konto ist noch nicht bestätigt: Wir haben Ihnen soeben einen neuen Sicherheitscode per E-Mail gesendet.', sousSms: 'Wir haben einen Sicherheitscode per SMS gesendet an',
    valider: 'Code bestätigen', renvoyer: 'Code erneut senden', renvoye: 'Code erneut gesendet.',
    renvoyerDans: 'Code erneut senden ({n} s)', essais: 'Zu viele falsche Codes. Bitte warten Sie einige Minuten, bevor Sie es erneut versuchen.',
    reprise: 'Ihre E-Mail-Adresse ist bereits bestätigt: Es fehlt nur noch Ihre Nummer. Geben Sie den per SMS erhaltenen Code ein – auch einen früheren, sofern er weniger als 10 Minuten alt ist – oder fordern Sie einen neuen an.',
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
    titreNumero: 'Ihre Mobilnummer',
    sousNumero: 'Ihre E-Mail-Adresse ist bestätigt. Geben Sie die Mobilnummer an, auf der Sie Ihren Sicherheitscode per SMS erhalten möchten.',
    boutonNumero: 'Code per SMS erhalten',
    modifierNumero: 'Andere Nummer angeben',
    numeroPris: 'Diese Mobilnummer ist bereits mit einem anderen RealXpert-Konto verknüpft. Geben Sie eine andere Nummer an oder melden Sie sich mit dem Konto an, das sie verwendet.',
    essaiBouton: 'Testmodus: eine eindeutige Testnummer (+41 00 …) verknüpfen — der SMS-Code geht an die eingegebene Mobilnummer', essaiSms: 'Testmodus — Testnummer {essai}.',
    sms: 'Die SMS konnte nicht an diese Nummer gesendet werden. Prüfen Sie sie oder geben Sie eine andere Mobilnummer an.',
    titreOublie: 'Passwort zurücksetzen',
    sousOublie: 'Geben Sie die Adresse Ihres Kontos an: Wir senden Ihnen einen Link, um ein neues Passwort zu wählen.',
    boutonOublie: 'Link erhalten',
    adresse: 'E-Mail-Adresse',
    oublieEnvoye: 'Erledigt: Falls ein Konto zu dieser Adresse besteht, erhalten Sie eine E-Mail mit einem Link, um ein neues Passwort zu wählen. Schauen Sie auch im Spam-Ordner nach.',
  },
  EN: {
    page: 'Ma discussion - EN.dc.html',
    titreEmail: 'Your security code', titreSms: 'Confirm your number',
    sousEmail: 'We sent your security code to', indesirables: 'Not received? Please check your junk folder.',
    nonConfirme: 'Your account is not confirmed yet: we have just sent you a new security code by email.', sousSms: 'We sent a security code by text message to',
    valider: 'Confirm code', renvoyer: 'Send a new code', renvoye: 'New code sent.',
    renvoyerDans: 'Send a new code ({n} s)', essais: 'Too many incorrect codes. Please wait a few minutes before trying again.',
    reprise: 'Your email address is already confirmed: only your number remains. Enter the code you received by SMS — even an earlier one, if it is less than 10 minutes old — or request a new one.',
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
    titreNumero: 'Your mobile number',
    sousNumero: 'Your email is confirmed. Give the mobile number on which to receive your security code by text message.',
    boutonNumero: 'Get the code by text',
    modifierNumero: 'Use another number',
    numeroPris: 'This mobile number is already linked to another RealXpert account. Enter another number, or sign in with the account that uses it.',
    essaiBouton: 'Test mode: attach a unique test number (+41 00 …) — the SMS code goes to the mobile entered', essaiSms: 'Test mode — test number {essai}.',
    sms: 'The text message could not be sent to this number. Check it, or enter another mobile number.',
    titreOublie: 'Reset your password',
    sousOublie: 'Give the address of your account: we will send you a link to choose a new password.',
    boutonOublie: 'Get the link',
    adresse: 'Email address',
    oublieEnvoye: 'Done: if an account exists for this address, you will receive an email with a link to choose a new password. Please check your junk folder too.',
  },
  IT: {
    page: 'Ma discussion - IT.dc.html',
    titreEmail: 'Il tuo codice di sicurezza', titreSms: 'Conferma il tuo numero',
    sousEmail: 'Abbiamo inviato il tuo codice di sicurezza a', indesirables: 'Non l’hai ricevuto? Controlla la posta indesiderata.',
    nonConfirme: 'Il tuo account non è ancora confermato: ti abbiamo appena inviato un nuovo codice di sicurezza via e-mail.', sousSms: 'Abbiamo inviato un codice di sicurezza via SMS al',
    valider: 'Conferma il codice', renvoyer: 'Invia un nuovo codice', renvoye: 'Nuovo codice inviato.',
    renvoyerDans: 'Invia un nuovo codice ({n} s)', essais: 'Troppi codici errati. Attendi qualche minuto prima di riprovare.',
    reprise: 'Il tuo indirizzo e-mail è già confermato: manca solo il numero. Inserisci il codice ricevuto via SMS — anche uno precedente, se ha meno di 10 minuti — oppure richiedine uno nuovo.',
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
    titreNumero: 'Il tuo numero di cellulare',
    sousNumero: 'La tua e-mail è confermata. Indica il cellulare su cui ricevere il codice di sicurezza via SMS.',
    boutonNumero: 'Ricevi il codice via SMS',
    modifierNumero: 'Usa un altro numero',
    numeroPris: 'Questo numero di cellulare è già collegato a un altro account RealXpert. Indica un altro numero, oppure accedi con l’account che lo utilizza.',
    essaiBouton: 'Modalità prova: collegare un numero di prova unico (+41 00 …) — il codice SMS va al cellulare inserito', essaiSms: 'Modalità prova — numero di prova {essai}.',
    sms: 'Non è stato possibile inviare l’SMS a questo numero. Controllalo o indica un altro cellulare.',
    titreOublie: 'Reimposta la password',
    sousOublie: 'Indica l’indirizzo del tuo account: ti inviamo un link per scegliere una nuova password.',
    boutonOublie: 'Ricevi il link',
    adresse: 'Indirizzo e-mail',
    oublieEnvoye: 'Fatto: se esiste un account per questo indirizzo, riceverai un’e-mail con un link per scegliere una nuova password. Controlla anche la posta indesiderata.',
  },
}[LANGUE]

const EMAIL_VALIDE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/
// La page des comptes, où mène le lien « choisir un nouveau mot de passe » de l'e-mail.
const PAGE_COMPTES = 'https://realxpert-site.vercel.app/compte.html'

/** Par le code d'erreur d'abord : un numéro déjà rattaché à un autre compte a le même libellé anglais
 *  (« already been registered ») qu'une adresse déjà prise (26.10). */
function messageDeLErreur(erreur) {
  const code = String(erreur?.code || '')
  const brut = (erreur?.message || '').toLowerCase()
  if (erreur?.status === 429 || code.includes('rate_limit') || brut.includes('rate limit')) return T.quota
  if (code === 'phone_exists' || brut.includes('phone number has already')) return T.numeroPris
  if (code === 'sms_send_failed' || brut.includes('sms') || brut.includes('phone change otp')) return T.sms
  if (brut.includes('error sending')) return T.generique
  if (code === 'email_exists' || code === 'user_already_exists' || brut.includes('already registered') || brut.includes('already been registered')) return T.existe
  if (code === 'invalid_credentials' || brut.includes('invalid login')) return T.identifiants
  if (code === 'otp_expired' || brut.includes('token') || brut.includes('otp')) return T.codeFaux
  if (code === 'weak_password' || brut.includes('password')) return T.motdepasse
  if (brut.includes('phone')) return T.telephone
  if (code === 'email_address_invalid' || brut.includes('email')) return T.email
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
let saisieNumero = null
let etape = null          // 'email' | 'numero' | 'sms' | 'oublie'
let email = '', telephone = ''
let mobileEssai = ''      // mode essai : le vrai mobile qui reçoit le code du numéro d'essai

/** Le mode essai, allumé sur ce navigateur par « ?debug=1 » (« ?debug=0 » l'éteint), comme la page des comptes. */
const DEBUG = (() => {
  const demande = new URLSearchParams(location.search).get('debug')
  try {
    if (demande === '1') localStorage.setItem('rx-debug', '1')
    if (demande === '0') localStorage.removeItem('rx-debug')
    return localStorage.getItem('rx-debug') === '1'
  } catch { return demande === '1' }
})()

const STYLE_CHAMP = 'width:100%; box-sizing:border-box; font-family:inherit; font-size:16px; color:#0c1f2c; background:#f7f9fb; border:1px solid #dce3ea; border-radius:12px; padding:14px 15px;'

function construireBoite() {
  const d = document.createElement('div')
  d.dataset.r = 'rxcodes'
  d.style.cssText = 'position:fixed; inset:0; z-index:300; display:flex; justify-content:flex-end;'
  d.innerHTML = `
    <div data-role="voile" style="position:absolute; inset:0; background:rgba(10,25,45,0.55); backdrop-filter:blur(2px);"></div>
    <div style="position:relative; width:440px; max-width:calc(92 * var(--rx-vw)); height:100%; background:#fff; box-shadow:-24px 0 60px -20px rgba(10,25,45,0.5); overflow-y:auto;">
      <div style="padding:30px 34px 40px; font-family:inherit;">
        <div style="display:flex; justify-content:flex-end; align-items:center; gap:8px; margin-bottom:6px;">
          <button data-role="essai" type="button" title="${T.essaiBouton}" aria-label="${T.essaiBouton}" style="display:none; width:36px; height:36px; border-radius:50%; border:1px dashed #d98a1c; background:#fff8ec; font-size:17px; line-height:1; cursor:pointer;">🐞</button>
          <span data-role="essai-actif" title="${T.essaiSms.replace('{essai}', '').replace(/[ —.]+$/, '')}" style="display:none; width:36px; height:36px; border-radius:50%; border:1px dashed #d98a1c; background:#fff8ec; font-size:17px; line-height:34px; text-align:center; box-sizing:border-box; cursor:default;">🐞</span>
          <button data-role="fermer" aria-label="${T.fermer}" style="background:none; border:none; cursor:pointer; color:#8a97a3; padding:6px; line-height:0; font-size:22px;">&times;</button>
        </div>
        <h2 data-role="titre" style="font-size:26px; font-weight:800; line-height:1.15; letter-spacing:-0.02em; color:#0c1f2c; margin:0 0 10px;"></h2>
        <p data-role="sous" style="font-size:15px; line-height:1.5; color:#5a6b78; margin:0 0 22px;"></p>
        <p data-role="message" style="display:none; font-size:14.5px; line-height:1.5; border-radius:11px; padding:12px 14px; margin:0 0 16px;"></p>
        <input data-role="code" type="text" inputmode="numeric" maxlength="8" autocomplete="one-time-code"
          style="width:100%; box-sizing:border-box; font-family:inherit; font-size:27px; font-weight:800; letter-spacing:9px; text-align:center; color:#0c1f2c; background:#f7f9fb; border:1px solid #dce3ea; border-radius:12px; padding:15px 10px;">
        <input data-role="tel" type="tel" autocomplete="tel" style="${STYLE_CHAMP}">
        <input data-role="adresse" type="email" autocomplete="email" placeholder="${T.adresse}" style="${STYLE_CHAMP}">
        <button data-role="valider" style="width:100%; margin-top:16px; background:#ffb90d; color:#fff; border:none; font-family:inherit; font-size:16px; font-weight:800; padding:15px; border-radius:12px; cursor:pointer;"></button>
        <p data-role="liens" style="text-align:center; margin:18px 0 0; display:flex; flex-direction:column; gap:10px; align-items:center;">
          <button data-role="renvoyer" style="background:none; border:none; font-family:inherit; font-size:14px; font-weight:700; color:#1d4fb0; cursor:pointer;"></button>
          <button data-role="modifier" style="background:none; border:none; font-family:inherit; font-size:14px; font-weight:700; color:#1d4fb0; cursor:pointer;"></button>
        </p>
      </div>
    </div>`
  d.querySelector('[data-role="fermer"]').onclick = fermerBoite
  d.querySelector('[data-role="voile"]').onclick = fermerBoite
  d.querySelector('[data-role="valider"]').onclick = valider
  d.querySelector('[data-role="renvoyer"]').onclick = renvoyerCode
  d.querySelector('[data-role="modifier"]').onclick = () => { etape = 'numero'; afficherBoite(); preremplirNumero() }
  d.querySelector('[data-role="essai"]').onclick = () => attacherNumeroEssai(saisieNumero?.e164() || telephone)
  for (const role of ['code', 'tel', 'adresse']) {
    d.querySelector(`[data-role="${role}"]`).addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); valider() }
    })
  }
  saisieNumero = monterSaisieTelephone(d.querySelector('[data-role="tel"]'), { langue: LANGUE.toLowerCase(), exempleEnPlaceholder: true })
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

const TITRES = { email: 'titreEmail', numero: 'titreNumero', sms: 'titreSms', oublie: 'titreOublie' }
const BOUTONS = { email: 'valider', numero: 'boutonNumero', sms: 'valider', oublie: 'boutonOublie' }

function afficherBoite() {
  if (!boite) boite = construireBoite()
  if (!document.body.contains(boite)) document.body.appendChild(boite)
  const voir = (role, oui) => { boite.querySelector(`[data-role="${role}"]`).style.display = oui ? '' : 'none' }
  boite.querySelector('[data-role="titre"]').textContent = T[TITRES[etape]]
  boite.querySelector('[data-role="sous"]').textContent =
    etape === 'email' ? T.sousEmail + ' ' + email + '. ' + T.indesirables
      : etape === 'sms' ? T.sousSms + ' ' + formaterPourAffichage(mobileEssai || telephone) + '.' + (mobileEssai ? ' ' + T.essaiSms.replace('{essai}', telephone) : '')
        : etape === 'numero' ? T.sousNumero : T.sousOublie
  boite.querySelector('[data-role="valider"]').textContent = T[BOUTONS[etape]]
  boite.querySelector('[data-role="renvoyer"]').textContent = T.renvoyer
  majRenvoi()
  boite.querySelector('[data-role="modifier"]').textContent = T.modifierNumero
  voir('code', etape === 'email' || etape === 'sms')
  voir('tel', etape === 'numero')
  voir('adresse', etape === 'oublie')
  voir('renvoyer', etape === 'email' || etape === 'sms')
  voir('modifier', etape === 'sms')
  voir('essai', DEBUG && etape === 'numero')
  voir('essai-actif', !!mobileEssai && etape === 'sms')
  const champ = boite.querySelector('[data-role="code"]')
  champ.value = ''
  boite.querySelector(`[data-role="${etape === 'numero' ? 'tel' : etape === 'oublie' ? 'adresse' : 'code'}"]`).focus()
  dire('')
}

function fermerBoite() {
  etape = null
  if (boite && document.body.contains(boite)) boite.remove()
}

/* ---------- Le renvoi du code SMS, au rythme permis par Supabase ---------- */

// Supabase n'envoie pas deux codes au même numéro à moins d'une minute d'écart : le bouton le montre.
let renvoiPossibleA = 0
let minuteurRenvoi = null
function bloquerRenvoi(secondes) {
  renvoiPossibleA = Date.now() + secondes * 1000
  clearInterval(minuteurRenvoi)
  minuteurRenvoi = setInterval(majRenvoi, 1000)
  majRenvoi()
}
function majRenvoi() {
  const bouton = boite?.querySelector('[data-role="renvoyer"]')
  const reste = Math.ceil((renvoiPossibleA - Date.now()) / 1000)
  if (reste <= 0) { clearInterval(minuteurRenvoi); minuteurRenvoi = null }
  if (!bouton || etape !== 'sms') return
  bouton.disabled = reste > 0
  bouton.style.opacity = reste > 0 ? '0.55' : ''
  bouton.textContent = reste > 0 ? T.renvoyerDans.replace('{n}', reste) : T.renvoyer
}
/** « … after 42 seconds » : le délai que Supabase impose encore avant un nouveau code. */
const delaiImpose = erreur => Number((erreur?.message || '').match(/after (\d+) seconds?/i)?.[1] || 0)

function preremplirNumero() {
  const champ = boite?.querySelector('[data-role="tel"]')
  if (!champ || !telephone || champ.value) return
  champ.value = telephone
  champ.dispatchEvent(new Event('input'))   // remis en forme, drapeau du pays
}

// Le rendu de la page peut emporter ce qu'il ne connaît pas : on remet la boîte en place.
// Et le champ téléphone du panneau reçoit son drapeau dès qu'il apparaît.
new MutationObserver(() => {
  if (etape && boite && !document.body.contains(boite)) document.body.appendChild(boite)
  const tel = document.querySelector('[data-r="sheet"] input[type="tel"]')
  if (tel && !tel._rxTel) monterSaisieTelephone(tel, { langue: LANGUE.toLowerCase(), exempleEnPlaceholder: true })
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
  const saisie = champs.telephone ? monterSaisieTelephone(champs.telephone, { langue: LANGUE.toLowerCase(), exempleEnPlaceholder: true }) : null
  const numero = saisie?.e164() || ''
  const motdepasse = champs.motdepasse?.value || ''
  const texteBouton = bouton.textContent

  // Une inscription déjà engagée ici (e-mail confirmé) reprend au code SMS, formulaire rempli ou non : jamais un
  // nouveau code e-mail. Une AUTRE adresse saisie, c'est un autre compte : la session gardée est fermée ici.
  occupe(bouton, true, texteBouton)
  const enCours = await inscriptionInachevee()
  occupe(bouton, false, texteBouton)
  if (enCours) {
    if (!adresse || adresse.toLowerCase() === String(enCours.email || '').toLowerCase()) return reprendreAuSms(enCours)
    await supabase.auth.signOut({ scope: 'local' })
  }

  if (!prenom || !nom || !adresse || !numero || !motdepasse) return alerteSheet(sheet, T.champs)
  if (!EMAIL_VALIDE.test(adresse)) return alerteSheet(sheet, T.email)
  if (!saisie?.valide()) return alerteSheet(sheet, T.telephone)
  if (motdepasse.length < 8) return alerteSheet(sheet, T.motdepasse)

  occupe(bouton, true, texteBouton)
  const { data: inscription, error } = await supabase.auth.signUp({
    email: adresse, password: motdepasse,
    options: { data: {
      prenom, nom, langue: LANGUE.toLowerCase(), telephone: numero,
      consent_conseils: !!champs.consent?.checked,
    } },
  })
  if (error) { occupe(bouton, false, texteBouton); return alerteSheet(sheet, messageDeLErreur(error)) }

  // Adresse déjà inscrite et confirmée (Supabase ne le dit pas : le compte rendu n'a aucune identité) : avec le
  // bon mot de passe, l'inscription reprend où elle en est — au code SMS, jamais à celui de l'e-mail.
  if (inscription?.user && Array.isArray(inscription.user.identities) && inscription.user.identities.length === 0) {
    const { data: connexion, error: refus } = await supabase.auth.signInWithPassword({ email: adresse, password: motdepasse })
    occupe(bouton, false, texteBouton)
    if (refus) {
      if (refus.code === 'email_not_confirmed' || /not confirmed/i.test(refus.message || '')) {
        email = adresse
        await supabase.auth.resend({ type: 'signup', email })
        etape = 'email'
        afficherBoite()
        return dire(T.nonConfirme, 'info')
      }
      return alerteSheet(sheet, T.existe)
    }
    if (connexion.user?.phone_confirmed_at) return partirVersLaDiscussion(connexion.session)
    return reprendreAuSms(connexion.user)
  }
  occupe(bouton, false, texteBouton)

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
    return alerteSheet(sheet, messageDeLErreur(error) === T.quota ? T.quota : T.identifiants)
  }
  // E-mail confirmé mais pas le numéro : l'inscription reprend au code SMS (27.10.2026), jamais à l'e-mail.
  if (!data.user?.phone_confirmed_at) {
    email = data.user?.email || adresse
    await reprendreAuSms(data.user)
    return
  }
  partirVersLaDiscussion(data.session)
}

/** Mot de passe oublié : l'e-mail porte un lien vers la page des comptes, où l'on choisit le nouveau. */
function ouvrirOublie(sheet) {
  effacerAlerte(sheet)
  etape = 'oublie'
  afficherBoite()
  const adresse = (champsDuPanneau(sheet).email?.value || '').trim()
  if (adresse) boite.querySelector('[data-role="adresse"]').value = adresse
}

async function envoyerLien() {
  const adresse = boite.querySelector('[data-role="adresse"]').value.trim()
  const bouton = boite.querySelector('[data-role="valider"]')
  if (!EMAIL_VALIDE.test(adresse)) return dire(T.email)
  occupe(bouton, true, T.boutonOublie)
  const { error } = await supabase.auth.resetPasswordForEmail(adresse, { redirectTo: `${PAGE_COMPTES}?lang=${LANGUE.toLowerCase()}` })
  occupe(bouton, false, T.boutonOublie)
  if (error && messageDeLErreur(error) === T.quota) return dire(T.quota)
  dire(T.oublieEnvoye, 'info')   // même réponse si le compte n'existe pas : on ne révèle rien
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

/** L'inscription engagée sur cet appareil : e-mail confirmé, numéro pas encore. Relue sur le serveur (le numéro
 *  en attente de code n'est pas dans la session gardée). */
async function inscriptionInachevee() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email_confirmed_at && !user.phone_confirmed_at ? user : null
}

/** Reprise d'une inscription dont l'e-mail est confirmé : jamais l'étape de l'e-mail, toujours celle du SMS. Un
 *  code déjà demandé attend sa saisie (renvoi au rythme permis) ; sinon il part au numéro donné à l'inscription. */
async function reprendreAuSms(user) {
  email = user.email || email
  const reel = String(user.user_metadata?.telephone || '')
  const enAttente = String(user.new_phone || '').replace(/\D/g, '')
  if (!enAttente) return attacherNumero(reel)
  telephone = '+' + enAttente
  mobileEssai = enAttente.startsWith('4100') ? reel : ''
  etape = 'sms'
  afficherBoite()
  dire(T.reprise, 'info')
  return true
}

const FONCTION_CODE_SMS = 'https://mmhutoipdzwkvaufucko.supabase.co/functions/v1/valider-code-sms'
/** Un code SMS refusé par Supabase (il n'accepte que le dernier) : est-ce un code précédent encore valable ?
 *  `true` (numéro confirmé), `'essais'` (trop de codes faux), sinon `false`. */
async function validerCodeAnterieur(code) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return false
    const r = await fetch(FONCTION_CODE_SMS, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const j = await r.json().catch(() => ({}))
    return j.ok === true ? true : j.raison === 'essais' ? 'essais' : false
  } catch { return false }
}

/** Rattache le numéro au compte (e-mail confirmé) : Supabase envoie alors le code par SMS. Refusé
 *  (numéro déjà pris, SMS impossible, quota), on revient à la saisie du numéro avec la raison. */
async function attacherNumero(numero) {
  telephone = numero || ''
  mobileEssai = ''
  if (!telephone) { etape = 'numero'; afficherBoite(); return false }
  // Un mobile d'essai (Franck, Marc…) : numéro d'essai d'office, le code part sur ce mobile.
  if (await estMobileEssai(telephone)) return attacherNumeroEssai(telephone)
  const { error } = await supabase.auth.updateUser({ phone: telephone, data: { telephone } })
  // Mode essai : le numéro appartient déjà à un autre compte (un persona précédent) — numéro d'essai.
  if (error && DEBUG && (error.code === 'phone_exists' || /phone number has already/i.test(error.message || ''))) {
    return attacherNumeroEssai(numero)
  }
  if (error) {
    etape = 'numero'; afficherBoite(); preremplirNumero()
    dire(messageDeLErreur(error))
    return false
  }
  etape = 'sms'
  afficherBoite()
  bloquerRenvoi(60)
  return true
}

/** Le numéro saisi est-il un mobile d'essai (table telephones_essai) ? Oui ou non, jamais la liste ; en cas
 *  de doute, non — le parcours ordinaire reprend. */
async function estMobileEssai(numero) {
  try {
    const { data } = await supabase.rpc('est_mobile_essai', { p_numero: numero })
    return data === true
  } catch { return false }
}

/** Mode essai : un numéro d'essai unique pour ce compte ; le code part sur le vrai mobile (s'il est déclaré
 *  mobile d'essai côté serveur — sinon le SMS est refusé et l'on revient à la saisie avec la raison). */
async function attacherNumeroEssai(reel) {
  if (!reel || reel.startsWith('+4100')) { etape = 'numero'; afficherBoite(); preremplirNumero(); dire(T.telephone); return false }
  const essai = '+4100' + String(Math.floor(Math.random() * 1e7)).padStart(7, '0')
  const { error } = await supabase.auth.updateUser({ phone: essai, data: { telephone: reel } })
  if (error) {
    telephone = reel
    etape = 'numero'; afficherBoite(); preremplirNumero()
    dire(messageDeLErreur(error))
    return false
  }
  telephone = essai; mobileEssai = reel
  etape = 'sms'
  afficherBoite()
  bloquerRenvoi(60)
  return true
}

function valider() {
  if (etape === 'numero') return envoyerNumero()
  if (etape === 'oublie') return envoyerLien()
  return validerCode()
}

async function envoyerNumero() {
  const bouton = boite.querySelector('[data-role="valider"]')
  const numero = saisieNumero?.e164() || ''
  if (!numero || !saisieNumero.valide()) return dire(T.telephone)
  occupe(bouton, true, T.boutonNumero)
  const envoye = await attacherNumero(numero)
  occupe(bouton, false, envoye ? T.valider : T.boutonNumero)
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
    if (data?.user?.phone_confirmed_at) return partirVersLaDiscussion(data.session)
    // Arrivé par la connexion, le numéro n'a pas été saisi ici : il est dans le compte.
    const envoye = await attacherNumero(telephone || data?.user?.user_metadata?.telephone || '')
    occupe(bouton, false, envoye ? T.valider : T.boutonNumero)
    return
  }

  const { error } = await supabase.auth.verifyOtp({ phone: telephone, token: saisi, type: 'phone_change' })
  if (error) {
    // Supabase n'accepte que le dernier code : un code précédent encore valable est vérifié à part.
    const verdict = await validerCodeAnterieur(saisi)
    if (verdict !== true) { occupe(bouton, false, T.valider); return dire(verdict === 'essais' ? T.essais : T.codeFaux) }
    await supabase.auth.refreshSession()
  }
  occupe(bouton, false, T.valider)
  const { data: { session } } = await supabase.auth.getSession()
  // Le numéro confirmé devient celui de la fiche (Mon compte, ERP) : il a pu changer depuis l'inscription.
  if (session?.user?.id) await supabase.from('profils').update({ telephone: mobileEssai || telephone }).eq('id', session.user.id)
  partirVersLaDiscussion(session)
}

async function renvoyerCode() {
  const bouton = boite.querySelector('[data-role="renvoyer"]')
  bouton.disabled = true
  if (etape === 'sms') {
    // Un nouveau code ; les précédents restent valables 10 minutes (valider-code-sms).
    const { error } = await supabase.auth.updateUser({ phone: telephone })
    const attente = delaiImpose(error)
    if (attente) return bloquerRenvoi(attente)
    if (error) { bouton.disabled = false; return dire(messageDeLErreur(error)) }
    bloquerRenvoi(60)
    return dire(T.renvoye, 'info')
  }
  const { error } = await supabase.auth.resend({ type: 'signup', email })
  setTimeout(() => { bouton.disabled = false }, 30000)
  if (error) return dire(messageDeLErreur(error))
  dire(T.renvoye, 'info')
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
  // « Mot de passe oublié ? » de la maquette (un lien vers le haut de page) : le vrai circuit.
  const lien = e.target.closest?.('a')
  const sheetDuLien = lien?.closest('[data-r="sheet"]')
  if (lien && sheetDuLien && /oubli|vergessen|forgot|dimenticat/i.test(lien.textContent || '')) {
    e.preventDefault()
    return ouvrirOublie(sheetDuLien)
  }
  // « Déjà un compte ? Se connecter » du panneau d'inscription (un lien vers le haut de page, sans
  // effet) : la connexion de la page des comptes, comme « Mon compte » du menu.
  if (lien && sheetDuLien && /^\s*(se connecter|anmelden|log in|sign in|accedi)\s*$/i.test(lien.textContent || '')) {
    e.preventDefault()
    location.href = `${PAGE_COMPTES}?lang=${LANGUE.toLowerCase()}&mode=connexion`
    return
  }
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
