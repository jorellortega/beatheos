"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TopToolbar } from "@/components/beat-maker/TopToolbar"
import { TrackList } from "@/components/beat-maker/TrackList"
import { SequencerGrid } from "@/components/beat-maker/SequencerGrid"
import { TrackEditor } from "@/components/beat-maker/TrackEditor"
import { MixerPanel } from "@/components/beat-maker/MixerPanel"
import { TransportControls } from "@/components/beat-maker/TransportControls"
import { EffectsRack } from "@/components/beat-maker/EffectsRack"
import { useBeatCreation } from "@/hooks/useBeatCreation"
import { Save, Download, Upload } from 'lucide-react'
import { toast } from "@/components/ui/use-toast"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function RhythmForgePage() {
  const {
    project,
    tracks,
    isPlaying,
    isRecording,
    addTrack,
    removeTrack,
    toggleStep,
    setTrackVolume,
    setTrackPan,
    toggleTrackMute,
    toggleTrackSolo,
    playBeat,
    stopBeat,
    recordBeat,
    exportBeat,
    saveProject,
    loadProject,
    setBpm,
    setTrackEffect,
  } = useBeatCreation()

  const [beatName, setBeatName] = useState(project.name)

  useEffect(() => {
    setBeatName(project.name)
  }, [project.name])

  const handleSaveBeat = () => {
    saveProject({ ...project, name: beatName })
    toast({
      title: "Project Saved",
      description: `${beatName} has been saved successfully.`,
    })
  }

  const handleExportBeat = async () => {
    await exportBeat(beatName)
    toast({
      title: "Beat Exported",
      description: `${beatName} has been exported as WAV.`,
    })
  }

  const handleLoadProject = () => {
    loadProject()
    toast({
      title: "Project Loaded",
      description: "Your project has been loaded successfully.",
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-4 font-display tracking-wider text-primary">Rhythm Forge</h1>
      <p className="text-xl mb-8 text-gray-300">Craft your divine beats in this celestial workshop.</p>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TopToolbar
            onPlay={playBeat}
            onStop={stopBeat}
            onRecord={recordBeat}
            isPlaying={isPlaying}
            isRecording={isRecording}
            onUndo={() => {/* TODO: Implement undo */}}
            onRedo={() => {/* TODO: Implement redo */}}
            onZoomIn={() => {/* TODO: Implement zoom in */}}
            onZoomOut={() => {/* TODO: Implement zoom out */}}
          />
        </div>

        <div className="col-span-3">
          <TrackList
            tracks={tracks}
            onAddTrack={addTrack}
            onRemoveTrack={removeTrack}
            onToggleMute={toggleTrackMute}
            onToggleSolo={toggleTrackSolo}
          />
        </div>

        <div className="col-span-9">
          <div className="mb-4 flex items-center justify-between">
            <Input
              value={beatName}
              onChange={(e) => setBeatName(e.target.value)}
              className="text-2xl font-bold bg-secondary text-white border-primary w-1/2"
              placeholder="Enter beat name"
            />
            <div className="flex space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={handleSaveBeat} className="gradient-button text-black font-medium hover:text-white">
                      <Save className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Save Beat</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={handleLoadProject} className="gradient-button text-black font-medium hover:text-white">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Load Project</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={handleExportBeat} className="gradient-button text-black font-medium hover:text-white">
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Export Beat</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <SequencerGrid
            tracks={tracks}
            onToggleStep={toggleStep}
          />
          <TrackEditor
            tracks={tracks}
          />
        </div>

        <div className="col-span-12">
          <MixerPanel
            tracks={tracks}
            onVolumeChange={setTrackVolume}
            onPanChange={setTrackPan}
          />
        </div>

        <div className="col-span-12">
          <EffectsRack
            tracks={tracks}
            onEffectChange={setTrackEffect}
          />
        </div>

        <div className="col-span-12">
          <TransportControls
            bpm={project.bpm}
            isPlaying={isPlaying}
            isRecording={isRecording}
            onPlayPause={isPlaying ? stopBeat : playBeat}
            onRecord={recordBeat}
            onBpmChange={setBpm}
          />
        </div>
      </div>
    </div>
  )
}

