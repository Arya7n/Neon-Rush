import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useGameStore } from '../game/gameStore.js'

export function Effects() {
  const quality = useGameStore((state) => state.quality)
  if (quality !== 'high') return null
  return (
    <EffectComposer disableNormalPass multisampling={0}>
      <Bloom luminanceThreshold={1} mipmapBlur intensity={0.55} radius={0.4} />
      <Vignette eskil={false} offset={0.16} darkness={0.7} />
    </EffectComposer>
  )
}
