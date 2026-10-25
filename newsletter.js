// Inscription à la newsletter depuis le pied de page du site (Franck, 25.10.2026 : « inscription à la newsletter
// en footer »). Le formulaire du gabarit (champ e-mail + « S'abonner maintenant ») envoie l'adresse à la fonction
// « newsletter » de la base des comptes, qui envoie un e-mail de confirmation (double opt-in) : l'adresse n'est
// abonnée qu'après le clic sur le lien. Le gabarit recopie le DOM : écoute globale, sur le pied de page seulement.

const FONCTION = 'https://mmhutoipdzwkvaufucko.supabase.co/functions/v1/newsletter'

const chemin = decodeURIComponent(location.pathname)
const LANGUE = ((chemin.match(/^\/(fr|de|en|it)(\/|$)/) || chemin.match(/[-\s](FR|DE|EN|IT)\.dc\.html$/i) || [])[1]
  || (document.documentElement.lang || 'fr').slice(0, 2)).toLowerCase()

const T = {
  fr: { envoye: 'Merci ! Un e-mail de confirmation vient de vous être envoyé : cliquez sur le lien qu’il contient pour finaliser votre inscription.', deja: 'Vous êtes déjà inscrit(e) à la newsletter.', invalide: 'Adresse e-mail invalide.', erreur: 'L’inscription n’a pas pu aboutir. Réessayez dans un instant.', attente: 'Inscription en cours…' },
  de: { envoye: 'Vielen Dank! Wir haben Ihnen soeben eine Bestätigungs-E-Mail gesendet: Klicken Sie auf den Link darin, um Ihre Anmeldung abzuschliessen.', deja: 'Sie sind bereits für den Newsletter angemeldet.', invalide: 'Ungültige E-Mail-Adresse.', erreur: 'Die Anmeldung ist fehlgeschlagen. Bitte versuchen Sie es gleich noch einmal.', attente: 'Anmeldung läuft…' },
  en: { envoye: 'Thank you! We have just sent you a confirmation email: click the link inside to complete your subscription.', deja: 'You are already subscribed to the newsletter.', invalide: 'Invalid email address.', erreur: 'The subscription could not be completed. Please try again in a moment.', attente: 'Subscribing…' },
  it: { envoye: 'Grazie! Le abbiamo appena inviato un’e-mail di conferma: clicchi sul link che contiene per completare l’iscrizione.', deja: 'È già iscritto/a alla newsletter.', invalide: 'Indirizzo e-mail non valido.', erreur: 'L’iscrizione non è andata a buon fine. Riprovi tra un attimo.', attente: 'Iscrizione in corso…' },
}[LANGUE] || {}

/** Le message sous le formulaire (créé au besoin, le gabarit pouvant le recopier). */
function dire(zone, texte, ok) {
  let m = zone.parentElement.querySelector('[data-rx-newsletter]')
  if (!m) {
    m = document.createElement('p')
    m.dataset.rxNewsletter = '1'
    m.setAttribute('role', 'status')
    m.style.cssText = 'margin:12px 0 0;max-width:440px;font-size:13.5px;line-height:1.5;font-weight:600;'
    zone.insertAdjacentElement('afterend', m)
  }
  m.style.color = ok ? '#ffd56b' : '#ffb4a8'
  m.textContent = texte
}

let enCours = false
async function inscrire(champ, bouton) {
  if (enCours) return
  const zone = champ.parentElement
  const email = champ.value.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { dire(zone, T.invalide, false); champ.focus(); return }
  enCours = true
  if (bouton) bouton.disabled = true
  dire(zone, T.attente, true)
  try {
    const r = await fetch(FONCTION, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'inscrire', email, langue: LANGUE, page: location.pathname }),
    })
    const { etat } = await r.json().catch(() => ({}))
    if (etat === 'confirmation_envoyee') { dire(zone, T.envoye, true); champ.value = '' }
    else if (etat === 'deja_abonne') dire(zone, T.deja, true)
    else if (etat === 'invalide') dire(zone, T.invalide, false)
    else dire(zone, T.erreur, false)
  } catch {
    dire(zone, T.erreur, false)
  } finally {
    enCours = false
    if (bouton) bouton.disabled = false
  }
}

document.addEventListener('click', e => {
  const bouton = e.target.closest && e.target.closest('footer button')
  const champ = bouton && bouton.parentElement && bouton.parentElement.querySelector('input[type="email"]')
  if (!champ) return
  e.preventDefault()
  inscrire(champ, bouton)
}, true)
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !(e.target instanceof HTMLInputElement) || !e.target.matches('footer input[type="email"]')) return
  e.preventDefault()
  inscrire(e.target, e.target.parentElement.querySelector('button'))
}, true)
