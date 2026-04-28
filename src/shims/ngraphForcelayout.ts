/**
 * Browser-safe ESM shim for three-forcegraph's optional ngraph engine.
 *
 * The Jarvis graph uses the default D3 force engine. three-forcegraph still
 * imports ngraph.forcelayout at module evaluation time, but that package is
 * CommonJS-only and Vite can serve it raw in dev, causing a missing default
 * export SyntaxError before the app renders. This shim satisfies the static
 * import without pulling the optional engine into the browser bundle.
 */
const createLayout = () => {
  throw new Error("ngraph force engine is disabled; use the D3 force engine.");
};

(createLayout as typeof createLayout & { simulator?: () => never }).simulator = () => {
  throw new Error("ngraph force engine is disabled; use the D3 force engine.");
};

export default createLayout;
