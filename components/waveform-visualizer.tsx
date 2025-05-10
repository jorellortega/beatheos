"use client"

import React, { useEffect, useRef } from 'react'

interface WaveformVisualizerProps {
  progress: number
  onSeek: (progress: number) => void
}

export function WaveformVisualizer({ progress, onSeek }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Clear the canvas
    ctx.clearRect(0, 0, width, height)

    // Draw the waveform
    ctx.beginPath()
    ctx.moveTo(0, height / 2)

    for (let i = 0; i < width; i++) {
      const y = Math.sin(i * 0.05) * (height / 4) + (height / 2)
      ctx.lineTo(i, y)
    }

    ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)' // Emerald color with opacity
    ctx.stroke()

    // Draw the progress
    const progressWidth = (progress / 100) * width
    ctx.fillStyle = 'rgba(16, 185, 129, 0.3)' // Emerald color with more opacity
    ctx.fillRect(0, 0, progressWidth, height)

  }, [progress])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const progress = (x / canvas.width) * 100
    onSeek(progress)
  }

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={100}
      className="w-full cursor-pointer"
      onClick={handleClick}
    />
  )
}

