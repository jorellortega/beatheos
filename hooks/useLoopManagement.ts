import { useState, useEffect, useRef } from 'react'

interface Loop {
  id: string
  name: string
  audioBuffer: AudioBuffer
  duration: number
}

interface ArrangedLoop extends Loop {
  startTime: number
}

export function useLoopManagement() {
  const [loops, setLoops] = useState<Loop[]>([])
  const [arrangedLoops, setArrangedLoops] = useState<ArrangedLoop[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  const addLoop = async (file: File) => {
    if (!audioContextRef.current) return

    const arrayBuffer = await file.arrayBuffer()
    const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer)

    const newLoop: Loop = {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      audioBuffer,
      duration: audioBuffer.duration,
    }

    setLoops(prevLoops => [...prevLoops, newLoop])
  }

  const arrangeLoop = (loop: Loop, startTime: number) => {
    const arrangedLoop: ArrangedLoop = { ...loop, startTime }
    setArrangedLoops(prevArrangedLoops => [...prevArrangedLoops, arrangedLoop])
  }

  const removeArrangedLoop = (id: string) => {
    setArrangedLoops(prevArrangedLoops => prevArrangedLoops.filter(loop => loop.id !== id))
  }

  const playArrangement = () => {
    if (!audioContextRef.current) return

    arrangedLoops.forEach(loop => {
      const source = audioContextRef.current!.createBufferSource()
      source.buffer = loop.audioBuffer
      source.connect(audioContextRef.current!.destination)
      source.start(audioContextRef.current!.currentTime + loop.startTime)
    })
  }

  return { loops, arrangedLoops, addLoop, arrangeLoop, removeArrangedLoop, playArrangement }
}

