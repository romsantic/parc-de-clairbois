import { AUDIO_TUNING } from '../data/audio'

export interface Channel { volume: number; muted: boolean }
export interface AudioSettings { music: Channel; effects: Channel }

export interface SettingsStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function clamp01(v: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0
  return Math.min(1, Math.max(0, v))
}

export function defaultSettings(): AudioSettings {
  return {
    music: { volume: AUDIO_TUNING.DEFAULT_MUSIC, muted: false },
    effects: { volume: AUDIO_TUNING.DEFAULT_EFFECTS, muted: false },
  }
}

function parseChannel(raw: unknown, fallback: Channel): Channel {
  if (typeof raw !== 'object' || raw === null) return { ...fallback }
  const r = raw as Record<string, unknown>
  const volume = typeof r.volume === 'number' && Number.isFinite(r.volume) ? clamp01(r.volume) : fallback.volume
  const muted = typeof r.muted === 'boolean' ? r.muted : fallback.muted
  return { volume, muted }
}

/** Lit un réglage enregistré ; tout ce qui est illisible ou incomplet retombe sur les valeurs de départ. */
export function parseSettings(text: string | null): AudioSettings {
  const def = defaultSettings()
  if (!text) return def
  try {
    const o: unknown = JSON.parse(text)
    if (typeof o !== 'object' || o === null) return def
    const r = o as Record<string, unknown>
    return { music: parseChannel(r.music, def.music), effects: parseChannel(r.effects, def.effects) }
  } catch { return def }
}

export function setVolume(s: AudioSettings, ch: 'music' | 'effects', v: number): AudioSettings {
  return { ...s, [ch]: { ...s[ch], volume: clamp01(v) } }
}

/** Couper / remettre : le volume choisi est gardé. */
export function setMuted(s: AudioSettings, ch: 'music' | 'effects', muted: boolean): AudioSettings {
  return { ...s, [ch]: { ...s[ch], muted } }
}

/** Volume réellement entendu (0 si coupé). */
export function effectiveVolume(c: Channel): number {
  return c.muted ? 0 : clamp01(c.volume)
}

export function loadSettings(store: SettingsStore | null): AudioSettings {
  try { return parseSettings(store ? store.getItem(AUDIO_TUNING.STORAGE_KEY) : null) } catch { return defaultSettings() }
}

export function saveSettings(store: SettingsStore | null, s: AudioSettings): void {
  try { store?.setItem(AUDIO_TUNING.STORAGE_KEY, JSON.stringify(s)) } catch { /* navigateur qui refuse : tant pis */ }
}
