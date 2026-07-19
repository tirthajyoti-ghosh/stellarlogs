import { Bloom, ChromaticAberration, EffectComposer, Vignette } from '@react-three/postprocessing'

/** Cinematic post chain. Bloom threshold 1.0 = only HDR emitters glow. */
export function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={1.25} luminanceThreshold={1} levels={6} />
      <ChromaticAberration offset={[0.0005, 0.0005]} />
      <Vignette eskil={false} offset={0.22} darkness={0.72} />
    </EffectComposer>
  )
}
