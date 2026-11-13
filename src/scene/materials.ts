import * as THREE from 'three'

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
