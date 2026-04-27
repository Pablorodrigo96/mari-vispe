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
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime", "reactflow", "dagre"],
    // 3D libs são lazy-loaded apenas em /equity-brain/grafo-jarvis e quebram o
    // pre-bundle do esbuild (Timer / ./webgpu). Excluí-las mantém o resto do
    // app funcionando no dev — Rollup ainda as resolve corretamente no build.
    exclude: [
      "react-force-graph-3d",
      "three-render-objects",
      "three-forcegraph",
      "three",
      "three-spritetext",
    ],
  },
}));
