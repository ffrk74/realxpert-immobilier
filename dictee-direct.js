// Dictée EN DIRECT : le texte s'écrit pendant qu'on parle (demande de Franck, 27.09).
//
// 1. L'application remet une clé temporaire (/api/transcribe/session) : la clé OpenAI ne
//    quitte jamais le serveur, et les plafonds de la dictée s'appliquent.
// 2. Le navigateur ouvre une connexion WebRTC avec OpenAI et y envoie le micro.
// 3. Les morceaux de texte arrivent au fil de la parole : le brouillon est rendu à chaque
//    morceau. À l'arrêt, on valide la phrase et sa version finale remplace le brouillon.
//
// Le flux micro appartient à l'appelant (il sert aussi à l'enregistrement de secours) :
// ce module ne l'arrête jamais. Même logique dans l'application : src/lib/dictee-direct.ts.

const URL_APPEL = 'https://api.openai.com/v1/realtime/calls'

export class ErreurDictee extends Error {
  constructor(code) { super(code); this.code = code }
}

function attendre(promesse, ms, code) {
  return new Promise((resoudre, rejeter) => {
    const t = setTimeout(() => rejeter(new ErreurDictee(code)), ms)
    promesse.then(v => { clearTimeout(t); resoudre(v) }, e => { clearTimeout(t); rejeter(e) })
  })
}

export async function ouvrirDicteeDirecte({ flux, langue, base, surBrouillon }) {
  if (typeof RTCPeerConnection === 'undefined') throw new ErreurDictee('non_supporte')

  // ── 1. La clé temporaire ───────────────────────────────────────────────────
  const reponse = await fetch(`${base}/api/transcribe/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: langue }),
  })
  const session = await reponse.json().catch(() => ({}))
  if (!reponse.ok || !session?.cle) {
    // Plafond atteint : le secours serait refusé aussi. Sinon, l'appelant bascule sur
    // l'enregistrement transcrit à la fin.
    throw new ErreurDictee(reponse.status === 429 ? String(session?.code || 'limite') : 'session')
  }

  // ── 2. La connexion ────────────────────────────────────────────────────────
  const pc = new RTCPeerConnection()
  flux.getAudioTracks().forEach(piste => pc.addTrack(piste, flux))
  const canal = pc.createDataChannel('oai-events')

  const morceaux = new Map()
  const ordre = []
  const assembler = () => ordre.map(id => morceaux.get(id) || '').join(' ').replace(/\s+/g, ' ').trim()
  let finale = null

  canal.onmessage = e => {
    let evt
    try { evt = JSON.parse(e.data) } catch { return }
    const id = String(evt?.item_id || 'tour')
    if (evt?.type === 'conversation.item.input_audio_transcription.delta') {
      if (!morceaux.has(id)) ordre.push(id)
      morceaux.set(id, (morceaux.get(id) || '') + String(evt.delta || ''))
      surBrouillon(assembler())
    } else if (evt?.type === 'conversation.item.input_audio_transcription.completed') {
      if (!morceaux.has(id)) ordre.push(id)
      morceaux.set(id, String(evt.transcript || ''))
      surBrouillon(assembler())
      finale?.(assembler())
    } else if (evt?.type === 'error') {
      console.warn('[dictée en direct]', evt?.error?.message || evt)
      finale?.(assembler())
    }
  }

  const fermer = () => {
    try { canal.close() } catch {}
    try { pc.close() } catch {}
  }

  try {
    const offre = await pc.createOffer()
    await pc.setLocalDescription(offre)
    const appel = await attendre(fetch(URL_APPEL, {
      method: 'POST',
      body: offre.sdp,
      headers: { Authorization: `Bearer ${session.cle}`, 'Content-Type': 'application/sdp' },
    }), 8000, 'connexion')
    if (!appel.ok) throw new ErreurDictee('connexion')
    await pc.setRemoteDescription({ type: 'answer', sdp: await appel.text() })
    if (canal.readyState !== 'open') {
      await attendre(new Promise(ok => { canal.onopen = () => ok() }), 8000, 'connexion')
    }
  } catch (e) {
    fermer()
    throw e instanceof ErreurDictee ? e : new ErreurDictee('connexion')
  }

  return {
    fermer,
    async terminer() {
      const texteFinal = new Promise(ok => { finale = ok })
      try { canal.send(JSON.stringify({ type: 'input_audio_buffer.commit' })) } catch {}
      // La version finale arrive en général en moins d'une seconde ; au-delà, le brouillon suffit.
      const texte = await attendre(texteFinal, 5000, 'finale').catch(() => assembler())
      fermer()
      return texte.trim()
    },
  }
}
