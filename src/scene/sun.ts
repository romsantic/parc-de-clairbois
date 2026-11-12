/** Position et couleur du soleil selon l'heure (0–24, boucle). Fonction pure. */
export interface SunState {
  /** Hauteur au-dessus de l'horizon, en degrés (négative la nuit). */
  elevation: number
  /** Direction, en degrés. */
  azimuth: number
  /** Force de la lumière directe, 0..1 ; plancher de clair de lune la nuit. */
  intensity: number
  skyTop: string
  skyBottom: string
}

const MOONLIGHT = 0.12
const NIGHT = { top: '#0e1630', bottom: '#2a3a5c' }
const DAWN = { top: '#5a7fb8', bottom: '#f4b27a' }
const DAY = { top: '#5aa6e6', bottom: '#d6ecf8' }

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16)
  const ch = (shift: number) => {
    const x = (pa >> shift) & 255, y = (pb >> shift) & 255
    return Math.round(x + (y - x) * t)
  }
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')
}

export function sunForHour(hour: number): SunState {
  const h = ((hour % 24) + 24) % 24
  const s = Math.sin((Math.PI * (h - 6)) / 12) // 1 à midi, 0 à 6 h / 18 h, -1 à minuit
  const elevation = 60 * s
  const intensity = Math.max(MOONLIGHT, s)
  // -10° → nuit, 0° → aube/crépuscule, +15° → plein jour
  let sky: { top: string; bottom: string }
  if (elevation <= -10) sky = NIGHT
  else if (elevation < 0) {
    const t = (elevation + 10) / 10
    sky = { top: mix(NIGHT.top, DAWN.top, t), bottom: mix(NIGHT.bottom, DAWN.bottom, t) }
  } else if (elevation < 15) {
    const t = elevation / 15
    sky = { top: mix(DAWN.top, DAY.top, t), bottom: mix(DAWN.bottom, DAY.bottom, t) }
  } else sky = DAY
  return { elevation, azimuth: (h / 24) * 360, intensity, skyTop: sky.top, skyBottom: sky.bottom }
}
