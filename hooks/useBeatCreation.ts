import { useState, useEffect, useRef } from 'react'
import * as Tone from 'tone'

interface Project {
  id: string
  name: string
  bpm: number
}

interface Track {
  id: string
  name: string
  steps: boolean[]
  volume: number
  pan: number
  mute: boolean
  solo: boolean
  synth: Tone.Synth
  effects: {
    reverb: number
    delay: number
    distortion: number
  }
}

export function useBeatCreation() {
  const [project, setProject] = useState<Project>({
    id: '1',
    name: 'New Project',
    bpm: 120,
  })
  const [tracks, setTracks] = useState<Track[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const sequencerRef = useRef<Tone.Sequence | null>(null)

  useEffect(() => {
    Tone.Transport.bpm.value = project.bpm
  }, [project.bpm])

  useEffect(() => {
    // Initialize tracks with synths
    const initialTracks: Track[] = [
      createTrack('Kick'),
      createTrack('Snare'),
      createTrack('Hi-hat'),
    ]
    setTracks(initialTracks)

    return () => {
      // Cleanup synths when component unmounts
      initialTracks.forEach(track => track.synth.dispose())
    }
  }, [])

  const createTrack = (name: string): Track => {
    const synth = new Tone.Synth().toDestination()
    return {
      id: Date.now().toString(),
      name,
      steps: new Array(16).fill(false),
      volume: 0,
      pan: 0,
      mute: false,
      solo: false,
      synth,
      effects: {
        reverb: 0,
        delay: 0,
        distortion: 0
      }
    }
  }

  const addTrack = () => {
    const newTrack = createTrack(`Track ${tracks.length + 1}`)
    setTracks([...tracks, newTrack])
  }

  const removeTrack = (id: string) => {
    const trackToRemove = tracks.find(track => track.id === id)
    if (trackToRemove) {
      trackToRemove.synth.dispose()
    }
    setTracks(tracks.filter(track => track.id !== id))
  }

  const toggleStep = (trackId: string, stepIndex: number) => {
    setTracks(tracks.map(track =>
      track.id === trackId
        ? { ...track, steps: track.steps.map((step, i) => i === stepIndex ? !step : step) }
        : track
    ))
  }

  const setTrackVolume = (trackId: string, volume: number) => {
    setTracks(tracks.map(track =>
      track.id === trackId ? { ...track, volume, synth: track.synth.set({ volume }) } : track
    ))
  }

  const setTrackPan = (trackId: string, pan: number) => {
    setTracks(tracks.map(track =>
      track.id === trackId ? { ...track, pan, synth: track.synth.set({ pan }) } : track
    ))
  }

  const toggleTrackMute = (trackId: string) => {
    setTracks(tracks.map(track =>
      track.id === trackId ? { ...track, mute: !track.mute, synth: track.synth.set({ mute: !track.mute }) } : track
    ))
  }

  const toggleTrackSolo = (trackId: string) => {
    const updatedTracks = tracks.map(track =>
      track.id === trackId ? { ...track, solo: !track.solo } : track
    )
    const soloTracks = updatedTracks.filter(track => track.solo)
    updatedTracks.forEach(track => {
      track.synth.set({ mute: soloTracks.length > 0 && !track.solo })
    })
    setTracks(updatedTracks)
  }

  const playBeat = () => {
    if (Tone.Transport.state === 'started') {
      Tone.Transport.stop()
      setIsPlaying(false)
    } else {
      Tone.start()
      sequencerRef.current = new Tone.Sequence((time, step) => {
        tracks.forEach(track => {
          if (track.steps[step] && !track.mute) {
            track.synth.triggerAttackRelease('C4', '16n', time)
          }
        })
      }, Array.from({ length: 16 }, (_, i) => i), '16n').start(0)
      Tone.Transport.start()
      setIsPlaying(true)
    }
  }

  const stopBeat = () => {
    Tone.Transport.stop()
    if (sequencerRef.current) {
      sequencerRef.current.stop()
    }
    setIsPlaying(false)
  }

  const recordBeat = () => {
    setIsRecording(!isRecording)
    // TODO: Implement actual recording logic
    console.log('Recording functionality not yet implemented')
  }

  const exportBeat = async (name: string) => {
    // Export as WAV file
    const recorder = new Tone.Recorder()
    Tone.Destination.connect(recorder)
    recorder.start()

    // Play the beat once
    await Tone.start()
    Tone.Transport.start()
    await Tone.Transport.stop('+1m')

    const recording = await recorder.stop()
    const url = URL.createObjectURL(recording)
    const anchor = document.createElement('a')
    anchor.download = `${name}.wav`
    anchor.href = url
    anchor.click()
  }

  const saveProject = (projectData: Partial<Project>) => {
    const updatedProject = { ...project, ...projectData }
    setProject(updatedProject)
    localStorage.setItem('beatProject', JSON.stringify({ project: updatedProject, tracks }))
  }

  const loadProject = () => {
    const savedData = localStorage.getItem('beatProject')
    if (savedData) {
      const { project: savedProject, tracks: savedTracks } = JSON.parse(savedData)
      setProject(savedProject)
      setTracks(savedTracks.map((track: Track) => ({
        ...track,
        synth: new Tone.Synth().set({ volume: track.volume, pan: track.pan, mute: track.mute }).toDestination()
      })))
    }
  }

  const setTrackEffect = (trackId: string, effect: string, value: number) => {
    setTracks(tracks.map(track =>
      track.id === trackId
        ? { ...track, effects: { ...track.effects, [effect]: value } }
        : track
    ))
  }

  return {
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
    setBpm: (bpm: number) => setProject({ ...project, bpm }),
    setTrackEffect,
  }
}

