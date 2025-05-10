"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AudioUploader } from "@/components/ai-loop-stacker/AudioUploader"
import { LayerStack } from "@/components/ai-loop-stacker/LayerStack"
import { SuggestedSamples } from "@/components/ai-loop-stacker/SuggestedSamples"
import { ExportOptions } from "@/components/ai-loop-stacker/ExportOptions"

export default function AILoopStackerPage() {
  const [uploadedAudio, setUploadedAudio] = useState<{ file: File; analysis: any } | null>(null)
  const [layers, setLayers] = useState<any[]>([])

  const handleAudioUpload = async (file: File) => {
    // TODO: Implement actual audio analysis
    const fakeAnalysis = { tempo: 120, key: 'C' }
    setUploadedAudio({ file, analysis: fakeAnalysis })
  }

  const addLayer = (sample: any) => {
    setLayers([...layers, sample])
  }

  const removeLayer = (index: number) => {
    setLayers(layers.filter((_, i) => i !== index))
  }

  const adjustLayerVolume = (index: number, volume: number) => {
    const newLayers = [...layers]
    newLayers[index].volume = volume
    setLayers(newLayers)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 font-display tracking-wider text-primary">AI Loop Stacker</h1>
      <p className="text-xl mb-8 text-gray-300">Create divine compositions with AI-powered loop stacking.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2 bg-card border-primary">
          <CardHeader>
            <CardTitle className="text-primary">Layer Stack</CardTitle>
          </CardHeader>
          <CardContent>
            <AudioUploader onUpload={handleAudioUpload} />
            {uploadedAudio && (
              <div className="mt-4">
                <p className="text-white">Uploaded: {uploadedAudio.file.name}</p>
                <p className="text-gray-300">Tempo: {uploadedAudio.analysis.tempo} BPM</p>
                <p className="text-gray-300">Key: {uploadedAudio.analysis.key}</p>
              </div>
            )}
            <LayerStack layers={layers} onRemove={removeLayer} onVolumeChange={adjustLayerVolume} />
          </CardContent>
        </Card>

        <Card className="bg-card border-primary">
          <CardHeader>
            <CardTitle className="text-primary">Suggested Samples</CardTitle>
          </CardHeader>
          <CardContent>
            <SuggestedSamples onAddLayer={addLayer} />
          </CardContent>
        </Card>
      </div>

      <ExportOptions layers={layers} />
    </div>
  )
}

