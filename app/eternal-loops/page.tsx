"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { LoopLibrary } from "@/components/loop-creator/LoopLibrary"
import { LoopArranger } from "@/components/loop-creator/LoopArranger"
import { EffectsRack } from "@/components/loop-creator/EffectsRack"
import { useLoopManagement } from "@/hooks/useLoopManagement"

export default function EternalLoopsPage() {
  const { loops, arrangedLoops, addLoop, arrangeLoop, removeArrangedLoop, playArrangement } = useLoopManagement()
  const [effects, setEffects] = useState({ reverb: 0, delay: 0, distortion: 0 })

  const handleLoopSelect = (loopId: string) => {
    const selectedLoop = loops.find(loop => loop.id === loopId)
    if (selectedLoop) {
      arrangeLoop(selectedLoop, arrangedLoops.length > 0 ? arrangedLoops[arrangedLoops.length - 1].startTime + arrangedLoops[arrangedLoops.length - 1].duration : 0)
    }
  }

  const handleEffectChange = (effect: string, value: number) => {
    setEffects(prevEffects => ({ ...prevEffects, [effect]: value }))
    // Here you would apply the effect to the audio. This requires more complex audio processing.
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 font-display tracking-wider neon-text-green">Eternal Loops</h1>
      <p className="text-xl mb-8 text-gray-300">Weave the fabric of sonic eternity with our transcendent loop creation interface.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <LoopArranger
            arrangedLoops={arrangedLoops}
            onLoopRemove={removeArrangedLoop}
          />
          <EffectsRack onEffectChange={handleEffectChange} />
        </div>
        <LoopLibrary
          loops={loops}
          onLoopSelect={handleLoopSelect}
          onAddLoop={addLoop}
        />
      </div>

      <div className="flex justify-between">
        <Button variant="outline" className="neon-border-white text-white" onClick={playArrangement}>
          Play Arrangement
        </Button>
        <Button className="neon-border-green">Export Eternal Creation</Button>
      </div>
    </div>
  )
}

