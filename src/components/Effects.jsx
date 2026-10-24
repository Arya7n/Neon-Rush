import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useGameStore } from '../game/gameStore.js'

export function Effects() {
  const quality = useGameStore((state) => state.quality)
  if (quality !== 'high') return null
  return (
    <EffectComposer disableNormalPass multisampling={0}>
      <Bloom luminanceThreshold={1.15} mipmapBlur intensity={0.28} radius={0.35} />
      <Vignette eskil={false} offset={0.2} darkness={0.45} />
    </EffectComposer>
  )
}
