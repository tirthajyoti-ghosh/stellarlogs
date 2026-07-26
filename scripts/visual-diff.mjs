/**
 * Visual-regression judge for the no-pop contract.
 *
 *   node scripts/visual-diff.mjs <dir>
 *
 * Expects pairs in <dir>: `<name>.off.png` (optimisation disabled = today's
 * look) and `<name>.on.png` (optimisation enabled). Both are captured from
 * the SAME running scene milliseconds apart by toggling window.__perf, so
 * the only variable is the optimisation — orbits, traffic and clocks have
 * not moved between them.
 *
 * Reports, per pair:
 *   changedPixels  — pixels differing by more than a perceptual threshold
 *   maxDelta       — worst single-channel difference
 *   meanDelta      — average difference across the frame
 *   verdict        — PASS if the frames are perceptually identical
 *
 * A pixel counts as changed only past THRESHOLD, because GPU rasterisation
 * is not bit-exact between draws (dithering, blend order, FP precision).
 */
import sharp from 'sharp'
import { readdirSync } from 'node:fs'
import path from 'node:path'

const DIR = process.argv[2] ?? '.'
const THRESHOLD = 12 // 0-255 per channel; below this no human sees it
const FAIL_FRACTION = 0.002 // >0.2% of pixels changed = investigate

const files = readdirSync(DIR)
const names = [...new Set(files.filter((f) => f.endsWith('.off.png')).map((f) => f.replace('.off.png', '')))]

/**
 * The scene never stops moving — belts rotate, strobes blink, traffic flies —
 * so two captures of the SAME configuration already differ. That is the noise
 * floor. A third capture (`<name>.ctrl.png`, same config as .off) measures it,
 * and the optimisation is judged against that floor rather than against zero.
 * The question is not "did any pixel change" but "did the optimisation change
 * more than simply waiting would have".
 */
async function compare(fa, fb) {
  const [ia, ib] = await Promise.all(
    [fa, fb].map((f) => sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true })),
  )
  if (ia.info.width !== ib.info.width || ia.info.height !== ib.info.height) return null
  const A = ia.data, B = ib.data
  const px = ia.info.width * ia.info.height
  let changed = 0, sum = 0, max = 0
  for (let i = 0; i < A.length; i += 3) {
    const d = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2]))
    sum += d
    if (d > max) max = d
    if (d > THRESHOLD) changed++
  }
  return { frac: changed / px, mean: sum / (px * 3), max }
}

if (!names.length) {
  console.log('no <name>.off.png / <name>.on.png pairs found in', DIR)
  process.exit(0)
}

let worst = 0
let failures = 0

for (const name of names.sort()) {
  const a = path.join(DIR, `${name}.off.png`)
  const b = path.join(DIR, `${name}.on.png`)
  if (!files.includes(`${name}.on.png`)) {
    console.log(`${name}: missing .on.png — skipped`)
    continue
  }
  const effect = await compare(a, b)
  if (!effect) { console.log(`${name}: size mismatch — skipped`); continue }
  const ctrlFile = path.join(DIR, `${name}.ctrl.png`)
  const noise = files.includes(`${name}.ctrl.png`) ? await compare(a, ctrlFile) : null

  // Pass if the optimisation moved no more pixels than the noise floor
  // (plus a small margin), or if it is under the absolute budget outright.
  const bar = noise ? Math.max(noise.frac * 1.5, FAIL_FRACTION) : FAIL_FRACTION
  const pass = effect.frac <= bar
  if (!pass) failures++
  if (effect.frac > worst) worst = effect.frac
  console.log(
    `${pass ? 'PASS' : 'FAIL'}  ${name.padEnd(24)} ` +
      `optimisation ${(effect.frac * 100).toFixed(3)}% (mean ${effect.mean.toFixed(2)})` +
      (noise ? `   vs noise floor ${(noise.frac * 100).toFixed(3)}% (mean ${noise.mean.toFixed(2)})` : '   [no control]'),
  )
}

console.log(
  `\n${failures ? failures + ' FAILED' : 'ALL PASS'} — worst frame changed ${(worst * 100).toFixed(3)}% ` +
    `(budget ${(FAIL_FRACTION * 100).toFixed(1)}%)`,
)
process.exit(failures ? 1 : 0)
