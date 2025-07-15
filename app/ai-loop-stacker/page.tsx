"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AudioUploader } from "@/components/ai-loop-stacker/AudioUploader"
import { LayerStack } from "@/components/ai-loop-stacker/LayerStack"
import { SuggestedSamples } from "@/components/ai-loop-stacker/SuggestedSamples"
import { ExportOptions } from "@/components/ai-loop-stacker/ExportOptions"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';

// Custom type for uploadedAudio.file
// It can be a File or a library item with name and url
interface UploadedAudioFile {
  name: string;
  url?: string;
}

export default function AILoopStackerPage() {
  const [uploadedAudio, setUploadedAudio] = useState<{ file: File | UploadedAudioFile; analysis: any } | null>(null)
  const [layers, setLayers] = useState<any[]>([])
  const [showSelectAudio, setShowSelectAudio] = useState(false);
  const [audioLibrary, setAudioLibrary] = useState<any[]>([]);
  const { user } = useAuth();

  const handleAudioUpload = async (file: File | string, meta?: any) => {
    // TODO: Implement actual audio analysis
    const fakeAnalysis = { tempo: 120, key: 'C' }
    if (typeof file === 'string') {
      setUploadedAudio({ file: { name: meta?.name || 'Audio File', url: file }, analysis: fakeAnalysis })
    } else {
      setUploadedAudio({ file, analysis: fakeAnalysis })
    }
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

  // Fetch audio library items for the user
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('audio_library_items')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data }) => setAudioLibrary(data ?? []));
  }, [user?.id]);

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
            <Button onClick={() => setShowSelectAudio(true)} className="mb-4" variant="outline">
              Select Audio
            </Button>
            <AudioUploader onUpload={handleAudioUpload} />
            {uploadedAudio && (
              <div className="mt-4">
                <p className="text-white">Uploaded: {(() => {
                  if (uploadedAudio.file && typeof uploadedAudio.file === 'object') {
                    if ('name' in uploadedAudio.file && typeof uploadedAudio.file.name === 'string') {
                      return uploadedAudio.file.name;
                    }
                  }
                  return '';
                })()}</p>
                {('url' in uploadedAudio.file) && uploadedAudio.file.url && (
                  <audio controls src={uploadedAudio.file.url} className="h-8 mt-2" />
                )}
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

      {/* Select Audio Modal */}
      <Dialog open={showSelectAudio} onOpenChange={setShowSelectAudio}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Audio from Library</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {audioLibrary.length === 0 && <div>No audio files found.</div>}
            {audioLibrary.map(item => (
              <div key={item.id} className="flex items-center gap-4 border-b pb-2">
                <div className="flex-1">
                  <div className="font-semibold">{item.name}</div>
                  <div className="text-xs text-gray-400">{item.type}</div>
                  {item.file_url && (
                    <audio controls src={item.file_url} className="h-8 mt-1" />
                  )}
                </div>
                <Button size="sm" onClick={() => {
                  handleAudioUpload(item.file_url, item);
                  setShowSelectAudio(false);
                }}>
                  Use
                </Button>
              </div>
            ))}
          </div>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  )
}

