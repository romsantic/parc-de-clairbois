import { NIGHT } from '../data/visuals'

const RAD = Math.PI / 180

/** Direction (unitaire) vers un point du ciel : cap horizontal `heading` (mêmes axes que la caméra : x = sin, z = cos) et hauteur en degrés. */
export function skyDirection(heading: number, elevationDeg: number): [number, number, number] {
  const e = elevationDeg * RAD, c = Math.cos(e)
  return [Math.sin(heading) * c, Math.sin(e), Math.cos(heading) * c]
}

/** Cap vers lequel regarde la caméra d'orbite d'azimut `orbitAzimuth` (elle est du côté (sin, cos) de la cible et la regarde). */
export const viewHeading = (orbitAzimuth: number): number => orbitAzimuth + Math.PI

/** Direction de la lune : droit devant la vue de départ, à NIGHT.MOON_ELEV degrés au-dessus de l'horizon. */
export function moonDirection(orbitAzimuth: number): [number, number, number] {
  return skyDirection(viewHeading(orbitAzimuth), NIGHT.MOON_ELEV)
}
