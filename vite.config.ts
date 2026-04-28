import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Shim do engine ngraph (CommonJS sem default export) — não usamos, mas
      // three-forcegraph faz import estático. Ver src/shims/ngraphForcelayout.ts
      "ngraph.forcelayout": path.resolve(__dirname, "./src/shims/ngraphForcelayout.ts"),
    },
    dedupe: ["react", "react-dom", "three"],
  },
  optimizeDeps: {
    // IMPORTANTE: as libs 3D PRECISAM ser pre-bundled em dev. Sem isso o Vite
    // serve ~1500 módulos do `three` individualmente e o servidor estoura com
    // 504 timeouts → tela branca em /equity-brain/grafo-jarvis.
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "reactflow",
      "dagre",
      "three",
      "three-spritetext",
      "react-force-graph-3d",
      "d3-force-3d",
    ],
    exclude: [],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Isola tudo relacionado a 3D em um único chunk lazy carregado só na rota Jarvis.
          if (
            id.includes("node_modules/three/") ||
            id.includes("node_modules/three-spritetext") ||
            id.includes("node_modules/three-render-objects") ||
            id.includes("node_modules/three-forcegraph") ||
            id.includes("node_modules/react-force-graph-3d") ||
            id.includes("node_modules/d3-force-3d")
          ) {
            return "equity-brain-3d";
          }
        },
      },
    },
  },
}));
