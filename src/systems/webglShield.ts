/**
 * BRAVE SHIELD SHIM (2026-08-14, real field failure). Brave's
 * fingerprinting protection farbles WebGL1 extension queries to null.
 * troika-text's SDF atlas asks for a plain 'webgl' context and then
 * REQUIRES ANGLE_instanced_arrays — so every glyph write throws and
 * the whole world hangs ("ANGLE_instanced_arrays not supported").
 *
 * WebGL2 has instancing in CORE — no extension query, nothing to
 * farble — and the SDF generator handles WebGL2 natively. So: probe
 * once whether WebGL1 extensions are being hidden; if so, steer any
 * 'webgl' request to 'webgl2' (a canvas is locked to its first
 * context type, which is why the probe uses its own throwaway canvas).
 * If GL is blocked outright, surface a readable overlay instead of a
 * silent hang.
 */

const origGetContext = HTMLCanvasElement.prototype.getContext

let broken: boolean | null = null
function webgl1InstancingBroken(): boolean {
  if (broken === null) {
    try {
      const probe = document.createElement('canvas')
      const gl = origGetContext.call(probe, 'webgl') as WebGLRenderingContext | null
      broken = !!gl && !gl.getExtension('ANGLE_instanced_arrays')
    } catch {
      broken = false
    }
  }
  return broken
}

export function installWebglShield(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(HTMLCanvasElement.prototype as any).getContext = function (
    this: HTMLCanvasElement,
    type: string,
    attrs?: unknown,
  ) {
    if (type === 'webgl' && webgl1InstancingBroken()) {
      const gl2 = origGetContext.call(this, 'webgl2', attrs as never)
      if (gl2) return gl2
    }
    return origGetContext.call(this, type as never, attrs as never)
  }

  // last resort: if the text engine still dies (GL fully blocked),
  // tell the pilot WHY instead of hanging on a black screen
  window.addEventListener('unhandledrejection', (e) => {
    if (!/ANGLE_instanced_arrays|EXT_blend_minmax/.test(String(e.reason))) return
    e.preventDefault()
    if (document.getElementById('gl-shield-note')) return
    const note = document.createElement('div')
    note.id = 'gl-shield-note'
    note.style.cssText =
      'position:fixed;inset:auto 16px 16px 16px;z-index:9999;background:#12060a;' +
      'border:1px solid #7a3040;color:#e8c9d0;font:12px/1.6 ui-monospace,monospace;' +
      'letter-spacing:.06em;padding:12px 16px;'
    note.textContent =
      'TEXT ENGINE BLOCKED — your browser’s fingerprint shields are hiding ' +
      'WebGL capabilities this site needs. Brave: click the Shields icon and set ' +
      'Fingerprinting to Standard (or allow for this site), then reload.'
    document.body.appendChild(note)
  })
}
