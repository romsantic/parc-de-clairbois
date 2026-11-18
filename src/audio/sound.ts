import { soundUrl, type SoundKey } from '../assets/sounds'
import { AUDIO_TUNING } from '../data/audio'
import { dayNightMix, trimLoop } from './mix'
import { defaultSettings, effectiveVolume, loadSettings, saveSettings, type AudioSettings, type SettingsStore } from './settings'

/** Petite façade du son : le jeu n'a pas besoin de savoir si le navigateur sait jouer. */
export interface SoundEngine {
  /** À appeler au premier toucher : le navigateur n'autorise le son qu'après. Sans danger si rappelé. */
  unlock(): void
  /** Joue un effet (gain relatif 0..1, multiplié par le curseur Effets). */
  playEffect(key: SoundKey, gain?: number): void
  setSettings(s: AudioSettings): void
  /** 0 = plein jour, 1 = pleine nuit : fondu entre musiques et ambiances. */
  setNight(n: number): void
}

export const silentEngine: SoundEngine = { unlock() {}, playEffect() {}, setSettings() {}, setNight() {} }

type LoopKey = 'musiqueJour' | 'musiqueNuit' | 'ambianceJour' | 'ambianceNuit'
const LOOPS: LoopKey[] = ['musiqueJour', 'musiqueNuit', 'ambianceJour', 'ambianceNuit']
const EFFECTS: SoundKey[] = ['clic', 'pieces', 'mission', 'construction', 'criMouton', 'criAne', 'criCochon', 'criCheval', 'criTaureau', 'criLoup']

/**
 * Moteur Web Audio. Les boucles sont décodées une fois, le silence de l'encodeur MP3 est retiré
 * (loopStart/loopEnd calculés sur le tampon décodé) pour une boucle sans « trou ».
 * Tout est protégé : sans AudioContext, ou si un fichier ne charge pas, le jeu reste muet sans erreur.
 */
export function createSoundEngine(initial: AudioSettings = defaultSettings()): SoundEngine {
  let settings = initial
  let night = 0
  let ctx: AudioContext | null = null
  let started = false
  let musicBus: GainNode | null = null
  let effectsBus: GainNode | null = null
  const loopGains = new Map<LoopKey, GainNode>()
  const buffers = new Map<SoundKey, AudioBuffer>()

  const Ctor: typeof AudioContext | undefined = typeof window === 'undefined' ? undefined
    : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)

  function ramp(g: GainNode, v: number, s: number) {
    if (!ctx) return
    try { g.gain.setTargetAtTime(v, ctx.currentTime, s / 3) } catch { /* ignoré */ }
  }

  function applyVolumes() {
    if (musicBus) ramp(musicBus, effectiveVolume(settings.music), settings.music.muted ? AUDIO_TUNING.MUTE_RAMP_S : AUDIO_TUNING.VOLUME_RAMP_S)
    if (effectsBus) ramp(effectsBus, effectiveVolume(settings.effects), AUDIO_TUNING.VOLUME_RAMP_S)
  }

  function applyMix() {
    const m = dayNightMix(night)
    const target: Record<LoopKey, number> = { musiqueJour: m.musicDay, musiqueNuit: m.musicNight, ambianceJour: m.ambDay, ambianceNuit: m.ambNight }
    for (const [k, g] of loopGains) ramp(g, target[k], 2)
  }

  async function load(key: SoundKey): Promise<AudioBuffer | null> {
    if (!ctx) return null
    try {
      const res = await fetch(soundUrl(key))
      if (!res.ok) return null
      const data = await res.arrayBuffer()
      const buf = await ctx.decodeAudioData(data)
      buffers.set(key, buf)
      return buf
    } catch { return null }
  }

  async function startLoop(key: LoopKey) {
    const buf = await load(key)
    if (!buf || !ctx || !musicBus) return
    try {
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
      loopGains.set(key, gain)
      applyMix()
      src.start(0, range.start)
    } catch { /* ce son-là restera muet */ }
  }

  function begin() {
    if (!ctx || started) return
    started = true
    musicBus = ctx.createGain()
    effectsBus = ctx.createGain()
    musicBus.gain.value = effectiveVolume(settings.music)
    effectsBus.gain.value = effectiveVolume(settings.effects)
    musicBus.connect(ctx.destination)
    effectsBus.connect(ctx.destination)
    for (const k of LOOPS) void startLoop(k)
    for (const k of EFFECTS) if (!LOOPS.includes(k as LoopKey)) void load(k)
  }

  function onVisibility() {
    if (!ctx) return
    try {
      if (document.visibilityState === 'hidden') void ctx.suspend()
      else void ctx.resume()
    } catch { /* ignoré */ }
  }

  return {
    unlock() {
      if (!Ctor) return
      try {
        if (!ctx) {
          ctx = new Ctor()
          document.addEventListener('visibilitychange', onVisibility)
        }
        if (document.visibilityState !== 'hidden') void ctx.resume().catch(() => {})
        begin()
      } catch { ctx = null }
    },
    playEffect(key, gain = 1) {
      try {
        if (!ctx || !effectsBus || ctx.state !== 'running') return
        const buf = buffers.get(key)
        if (!buf || effectiveVolume(settings.effects) === 0) return
        const g = ctx.createGain()
        g.gain.value = Math.min(1, Math.max(0, gain))
        g.connect(effectsBus)
        const src = ctx.createBufferSource()
        src.buffer = buf
        src.connect(g)
        src.start()
      } catch { /* ignoré */ }
    },
    setSettings(s) { settings = s; applyVolumes() },
    setNight(n) { night = n; applyMix() },
  }
}

/** Branche le premier toucher (souris, doigt ou clavier) sur le déblocage du son. */
export function unlockOnFirstGesture(engine: SoundEngine): void {
  const go = () => {
    engine.unlock()
    window.removeEventListener('pointerdown', go, true)
    window.removeEventListener('keydown', go, true)
  }
  window.addEventListener('pointerdown', go, true)
  window.addEventListener('keydown', go, true)
}


/** Le son du jeu : le moteur + les réglages (gardés dans le navigateur, hors de la sauvegarde de partie). */
export interface AudioController {
  engine: SoundEngine
  settings(): AudioSettings
  update(fn: (s: AudioSettings) => AudioSettings): void
}

export function createAudioController(store: SettingsStore | null, engine?: SoundEngine): AudioController {
  let settings = loadSettings(store)
  const eng = engine ?? createSoundEngine(settings)
  eng.setSettings(settings)
  return {
    engine: eng,
    settings: () => settings,
    update(fn) { settings = fn(settings); eng.setSettings(settings); saveSettings(store, settings) },
  }
}

export const silentAudio: AudioController = { engine: silentEngine, settings: defaultSettings, update() {} }
