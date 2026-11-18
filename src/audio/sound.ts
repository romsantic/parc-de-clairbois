import { soundUrl, type SoundKey } from '../assets/sounds'
import { AUDIO_TUNING } from '../data/audio'
import { aliveLoops, dayNightMix, trimLoop, type LoopKey } from './mix'
import { defaultSettings, effectiveVolume, loadSettings, saveSettings, type AudioSettings, type SettingsStore } from './settings'

/** Petite façade du son : le jeu n'a pas besoin de savoir si le navigateur sait jouer. */
export interface SoundEngine {
  /** À appeler à chaque toucher tant que le son n'est pas lancé : le navigateur n'autorise le son qu'après. Sans danger si rappelé. */
  unlock(): void
  /** Joue un effet (gain relatif 0..1, multiplié par le curseur Effets). */
  playEffect(key: SoundKey, gain?: number): void
  setSettings(s: AudioSettings): void
  /** 0 = plein jour, 1 = pleine nuit : fondu entre musiques et ambiances. */
  setNight(n: number): void
  /** Prévient quand le son tourne (vrai) ou s'arrête et attend un nouveau toucher (faux). */
  onRunningChange(cb: (running: boolean) => void): void
}

export const silentEngine: SoundEngine = { unlock() {}, playEffect() {}, setSettings() {}, setNight() {}, onRunningChange() {} }

const EFFECTS: SoundKey[] = ['clic', 'pieces', 'mission', 'construction', 'criMouton', 'criAne', 'criCochon', 'criCheval', 'criTaureau', 'criLoup']

interface LiveLoop { gain: GainNode; src: AudioBufferSourceNode; dropTimer: number }

/**
 * Moteur Web Audio. Les boucles sont décodées à la demande (seule la paire audible existe en mémoire),
 * le silence de l'encodeur MP3 est retiré (loopStart/loopEnd calculés sur le tampon décodé) pour une boucle sans « trou ».
 * Les petits effets sont téléchargés dès le chargement de la page (octets seulement) et décodés au premier toucher.
 * Tout est protégé : sans AudioContext, ou si un fichier ne charge pas, le jeu reste muet sans erreur.
 */
export function createSoundEngine(initial: AudioSettings = defaultSettings()): SoundEngine {
  let settings = initial
  let night = 0
  let ctx: AudioContext | null = null
  let started = false
  let loopsAllowed = false
  let musicBus: GainNode | null = null
  let effectsBus: GainNode | null = null
  const live = new Map<LoopKey, LiveLoop>()
  const loading = new Set<LoopKey>()
  const buffers = new Map<SoundKey, AudioBuffer>()
  const raw = new Map<SoundKey, Promise<ArrayBuffer | null>>()
  const runListeners: Array<(running: boolean) => void> = []
  let pending: { key: SoundKey; gain: number; at: number } | null = null

  const Ctor: typeof AudioContext | undefined = typeof window === 'undefined' ? undefined
    : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)

  async function fetchBytes(key: SoundKey): Promise<ArrayBuffer | null> {
    try {
      const res = await fetch(soundUrl(key))
      return res.ok ? await res.arrayBuffer() : null
    } catch { return null }
  }
  // Les petits effets : octets prêts dès le chargement de la page.
  if (Ctor) for (const k of EFFECTS) raw.set(k, fetchBytes(k))

  function ramp(g: GainNode, v: number, s: number) {
    if (!ctx) return
    try { g.gain.setTargetAtTime(v, ctx.currentTime, s / 3) } catch { /* ignoré */ }
  }

  function applyVolumes() {
    if (musicBus) ramp(musicBus, effectiveVolume(settings.music), settings.music.muted ? AUDIO_TUNING.MUTE_RAMP_S : AUDIO_TUNING.VOLUME_RAMP_S)
    if (effectsBus) ramp(effectsBus, effectiveVolume(settings.effects), AUDIO_TUNING.VOLUME_RAMP_S)
  }

  function targetGains(): Record<LoopKey, number> {
    const m = dayNightMix(night)
    return { musiqueJour: m.musicDay, musiqueNuit: m.musicNight, ambianceJour: m.ambDay, ambianceNuit: m.ambNight }
  }

  function applyMix() {
    const target = targetGains()
    const wanted = new Set(aliveLoops(night, settings.music))
    for (const [k, l] of live) ramp(l.gain, wanted.has(k) ? target[k] : 0, 2)
  }

  /** Met en route les boucles audibles, arrête (après fondu) et libère celles qui ne le sont plus. */
  function sync() {
    if (!ctx || !loopsAllowed) return
    const wanted = new Set(aliveLoops(night, settings.music))
    for (const k of wanted) {
      const l = live.get(k)
      if (l) { if (l.dropTimer) { clearTimeout(l.dropTimer); l.dropTimer = 0 } } else if (!loading.has(k)) void startLoop(k)
    }
    for (const [k, l] of live) {
      if (wanted.has(k) || l.dropTimer) continue
      ramp(l.gain, 0, 2)
      l.dropTimer = window.setTimeout(() => {
        try { l.src.stop() } catch { /* déjà arrêté */ }
        try { l.src.disconnect(); l.gain.disconnect() } catch { /* ignoré */ }
        live.delete(k) // le tampon n'est plus référencé : la mémoire revient
      }, AUDIO_TUNING.LOOP_DROP_DELAY_S * 1000)
    }
    applyMix()
  }

  async function decode(bytes: ArrayBuffer): Promise<AudioBuffer | null> {
    if (!ctx) return null
    try { return await ctx.decodeAudioData(bytes) } catch { return null }
  }

  async function startLoop(key: LoopKey) {
    loading.add(key)
    try {
      const bytes = await fetchBytes(key)
      const buf = bytes ? await decode(bytes) : null
      if (!buf || !ctx || !musicBus) return
      if (!aliveLoops(night, settings.music).includes(key)) return // plus utile entre-temps
      const chans: Float32Array[] = []
      for (let i = 0; i < buf.numberOfChannels; i++) chans.push(buf.getChannelData(i))
      const range = trimLoop(chans, buf.sampleRate)
      const gain = ctx.createGain()
      gain.gain.value = 0
      gain.connect(musicBus)
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.loop = true
      if (range.end > range.start) { src.loopStart = range.start; src.loopEnd = range.end }
      src.connect(gain)
      live.set(key, { gain, src, dropTimer: 0 })
      src.start(0, range.start)
      applyMix()
    } catch { /* ce son-là restera muet */ } finally { loading.delete(key) }
  }

  function ready(): boolean { return !!ctx && !!effectsBus && ctx.state === 'running' }

  function playNow(key: SoundKey, gain: number): boolean {
    try {
      const buf = buffers.get(key)
      if (!ctx || !effectsBus || !buf) return false
      if (effectiveVolume(settings.effects) === 0) return true
      const g = ctx.createGain()
      g.gain.value = Math.min(1, Math.max(0, gain))
      g.connect(effectsBus)
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.connect(g)
      src.start()
      return true
    } catch { return true }
  }

  /** Joue l'effet resté en attente (le tout dernier), s'il est assez récent. */
  function flushPending() {
    if (!pending || !ready()) return
    const p = pending
    if (!buffers.has(p.key)) return
    pending = null
    if (Date.now() - p.at <= AUDIO_TUNING.PENDING_EFFECT_MAX_MS) playNow(p.key, p.gain)
  }

  async function decodeEffects() {
    for (const k of EFFECTS) {
      const bytes = await raw.get(k)
      if (!bytes) continue
      const buf = await decode(bytes.slice(0))
      if (buf) { buffers.set(k, buf); flushPending() }
    }
  }

  function notify(running: boolean) { for (const cb of runListeners) cb(running) }

  function begin() {
    if (!ctx || started) return
    started = true
    musicBus = ctx.createGain()
    effectsBus = ctx.createGain()
    musicBus.gain.value = effectiveVolume(settings.music)
    effectsBus.gain.value = effectiveVolume(settings.effects)
    musicBus.connect(ctx.destination)
    effectsBus.connect(ctx.destination)
    // Effets d'abord (le premier clic s'entend), puis les boucles.
    void decodeEffects().then(() => { loopsAllowed = true; sync() })
  }

  function visible(): boolean { return document.visibilityState !== 'hidden' }

  function tryResume() {
    if (!ctx) return
    try {
      void ctx.resume().then(() => { if (ctx && ctx.state !== 'running') notify(false) }, () => notify(false))
    } catch { notify(false) }
  }

  function onVisibility() {
    if (!ctx) return
    try {
      if (!visible()) void ctx.suspend()
      else tryResume()
    } catch { /* ignoré */ }
  }

  return {
    unlock() {
      if (!Ctor) return
      try {
        if (!ctx) {
          ctx = new Ctor()
          document.addEventListener('visibilitychange', onVisibility)
          ctx.addEventListener('statechange', () => {
            if (!ctx) return
            if (ctx.state === 'running') { flushPending(); sync(); notify(true) } else if (visible()) notify(false)
          })
        }
        if (visible()) tryResume() // dans le geste du joueur : indispensable sur iPhone
        begin()
      } catch { ctx = null }
    },
    playEffect(key, gain = 1) {
      try {
        if (!ctx) return
        if (ready() && buffers.has(key)) { playNow(key, gain); return }
        pending = { key, gain, at: Date.now() } // pas prêt : on garde seulement le dernier
      } catch { /* ignoré */ }
    },
    setSettings(s) { settings = s; applyVolumes(); sync() },
    setNight(n) { night = n; sync() },
    onRunningChange(cb) { runListeners.push(cb) },
  }
}

/**
 * Branche les touchers (souris, doigt, clavier) sur le déblocage du son. Les écouteurs restent tant que le son ne tourne pas
 * (iPhone : le premier toucher peut ne pas suffire, ou le son se coupe après un appel) et reviennent s'il s'interrompt.
 */
export function unlockOnFirstGesture(engine: SoundEngine): void {
  const events = ['pointerdown', 'touchend', 'click', 'keydown'] as const
  let on = false
  const go = () => engine.unlock()
  const add = () => { if (on) return; on = true; for (const e of events) window.addEventListener(e, go, true) }
  const remove = () => { if (!on) return; on = false; for (const e of events) window.removeEventListener(e, go, true) }
  engine.onRunningChange((running) => { if (running) remove(); else add() })
  add()
}

/** Le son du jeu : le moteur + les réglages (gardés dans le navigateur, hors de la sauvegarde de partie). */
export interface AudioController {
  engine: SoundEngine
  settings(): AudioSettings
  /** Applique tout de suite ; `persist` faux pour un curseur en cours de glissement (puis `persist()` au lâcher). */
  update(fn: (s: AudioSettings) => AudioSettings, persist?: boolean): void
  persist(): void
}

export function createAudioController(store: SettingsStore | null, engine?: SoundEngine): AudioController {
  let settings = loadSettings(store)
  const eng = engine ?? createSoundEngine(settings)
  eng.setSettings(settings)
  return {
    engine: eng,
    settings: () => settings,
    update(fn, persist = true) { settings = fn(settings); eng.setSettings(settings); if (persist) saveSettings(store, settings) },
    persist() { saveSettings(store, settings) },
  }
}

export const silentAudio: AudioController = { engine: silentEngine, settings: defaultSettings, update() {}, persist() {} }
