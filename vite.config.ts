import { defineConfig } from 'vite'

// Chemins relatifs : le jeu est servi sous https://<pseudo>.github.io/<dépôt>/
export default defineConfig({
  base: './',
  build: {
    // Three.js seul pèse ~750 Ko : on relève le seuil juste au-dessus ; le code du jeu reste très en dessous.
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      output: {
        // Three.js (gros et rarement modifié) dans son propre fichier, mis en cache à part.
        codeSplitting: { groups: [{ name: 'three', test: /node_modules[\/]three[\/]/ }] },
      },
    },
  },
})
