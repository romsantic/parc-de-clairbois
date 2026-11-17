/**
 * Liste de tous les modèles 3D du jeu (packs CC0, voir CREDITS.md).
 * Chemins relatifs à public/ : jamais de « / » au début, sinon tout casse sur GitHub Pages.
 * Animaux en glTF (animés) ; nature et village en OBJ + MTL (même nom, à côté).
 */
export const MODELS = {
  // Animaux — Quaternius, Ultimate Animated Animals
  alpaga: 'models/animaux/Alpaca.gltf',
  ane: 'models/animaux/Donkey.gltf',
  renard: 'models/animaux/Fox.gltf',
  biche: 'models/animaux/Deer.gltf',
  cerf: 'models/animaux/Stag.gltf',
  cheval: 'models/animaux/Horse.gltf',
  chevalBlanc: 'models/animaux/Horse_White.gltf',
  vache: 'models/animaux/Cow.gltf',
  taureau: 'models/animaux/Bull.gltf',
  loup: 'models/animaux/Wolf.gltf',

  // Animaux de la ferme — Quaternius, Farm Animal Pack (FBX ; animations repos et saut seulement)
  mouton: 'models/ferme/Sheep.fbx',
  cochon: 'models/ferme/Pig.fbx',
  lama: 'models/ferme/Llama.fbx',

  // Nature — Quaternius, Ultimate Nature Pack
  arbre1: 'models/nature/CommonTree_1.obj',
  arbre2: 'models/nature/CommonTree_2.obj',
  arbre3: 'models/nature/CommonTree_3.obj',
  sapin1: 'models/nature/PineTree_1.obj',
  sapin2: 'models/nature/PineTree_2.obj',
  bouleau: 'models/nature/BirchTree_1.obj',
  saule: 'models/nature/Willow_1.obj',
  buisson: 'models/nature/Bush_1.obj',
  buissonBaies: 'models/nature/BushBerries_1.obj',
  rocher: 'models/nature/Rock_1.obj',
  rocherMousse: 'models/nature/Rock_Moss_1.obj',
  herbe: 'models/nature/Grass.obj',
  herbe2: 'models/nature/Grass_2.obj',
  fleurs: 'models/nature/Flowers.obj',
  plante: 'models/nature/Plant_1.obj',
  souche: 'models/nature/TreeStump.obj',
  nenuphar: 'models/nature/Lilypad.obj',

  // Village — Quaternius, Medieval Village Pack
  maison1: 'models/village/House_1.obj',
  maison2: 'models/village/House_2.obj',
  maison3: 'models/village/House_3.obj',
  auberge: 'models/village/Inn.obj',
  mairie: 'models/village/Bell_Tower.obj',
  moulin: 'models/village/Mill.obj',
  ecurie: 'models/village/Stable.obj',
  cloture: 'models/village/Fence.obj',
  puits: 'models/village/Well.obj',
  foin: 'models/village/Hay.obj',
  etal: 'models/village/MarketStand_1.obj',
  tonneau: 'models/village/Barrel.obj',
  charrette: 'models/village/Cart.obj',
  banc: 'models/village/Bench_1.obj',
  maison4: 'models/village/House_4.obj',
  etal2: 'models/village/MarketStand_2.obj',
  kiosque: 'models/village/Gazebo.obj',
  banc2: 'models/village/Bench_2.obj',
  caisse: 'models/village/Crate.obj',
  sacs: 'models/village/Bags.obj',
  feu: 'models/village/Bonfire_Lit.obj',
  forge: 'models/village/Blacksmith.obj',
} as const

export type ModelKey = keyof typeof MODELS

export function modelUrl(key: ModelKey): string {
  return import.meta.env.BASE_URL + MODELS[key]
}
