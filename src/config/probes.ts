/**
 * Measurement hooks: on in dev, and on in a deliberate probe build.
 *
 * Every performance number in `docs/performance-audit-2026-07.md` before
 * 2026-08-04 was taken from the dev server, where React and three are
 * unminified and JS costs far more than a visitor ever pays. That makes those
 * figures hard to trust and impossible to compare against a real build — but
 * the hooks needed to take a measurement (teleport the ship somewhere heavy,
 * pin the pixel ratio, reach the scene graph) were themselves `import.meta.env
 * .DEV`, so there was no way to measure the thing that actually ships.
 *
 *     npm run build:probe && npm run preview:probe
 *
 * builds the production bundle — minified, React in production mode — with
 * these hooks left in, into `dist-probe/`. A normal `npm run build` leaves
 * `VITE_PROBE` undefined, so this constant folds to `false` and every block
 * behind it is dropped from the bundle.
 */
export const PROBES = import.meta.env.DEV || import.meta.env.VITE_PROBE === '1'
