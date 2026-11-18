import * as THREE from 'three'
import { NIGHT } from '../data/visuals'

const converted = new Map<THREE.Material, THREE.MeshStandardMaterial>()

/**
 * Prépare un objet du décor (OBJ) : ombres, et matériaux mats partagés entre exemplaires.
 * Les .mtl de Blender 2.79 contiennent des couleurs déjà linéaires ; MTLLoader les ré-assombrit
 * en les croyant sRGB : on annule cette conversion.
 */
export function prepareStatic(obj: THREE.Object3D): void {
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    mesh.receiveShadow = true
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    const conv = mats.map((m) => {
      if (m.name === 'Windows') return windowMat
      let done = converted.get(m)
      if (done) return done
      const c = ((m as THREE.MeshPhongMaterial).color ?? new THREE.Color('#ffffff')).clone().convertLinearToSRGB()
      done = new THREE.MeshStandardMaterial({ color: c, roughness: 0.92, metalness: 0, flatShading: true })
      converted.set(m, done)
      converted.set(done, done)
      return done
    })
    mesh.material = Array.isArray(mesh.material) ? conv : conv[0]
  })
}

/** Fenêtres des bâtiments : un seul matériau partagé, qui s'allume la nuit (réglé par setNightGlow). */
export const windowMat = new THREE.MeshStandardMaterial({
  color: '#2a2a2a', emissive: NIGHT.WINDOW_COLOR, emissiveIntensity: 0, roughness: 0.5, flatShading: true,
})
/** Lanternes des chemins pavés : matériau partagé (ne pas libérer). */
export const lanternMat = new THREE.MeshStandardMaterial({
  color: '#ffe3a8', emissive: '#ffcf7a', emissiveIntensity: NIGHT.LANTERN_DAY, roughness: 0.5,
})
lanternMat.userData.keep = true
windowMat.userData.keep = true

/** Allume (night = 1) ou éteint (0) fenêtres et lanternes. */
export function setNightGlow(night: number): void {
  windowMat.emissiveIntensity = night * NIGHT.WINDOW_GLOW
  lanternMat.emissiveIntensity = NIGHT.LANTERN_DAY + night * (NIGHT.LANTERN_GLOW - NIGHT.LANTERN_DAY)
}
