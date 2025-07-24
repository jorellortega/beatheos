import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface FaderProps {
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  height?: number
  className?: string
  disabled?: boolean
  level?: number // VU meter level (0-1)
  peak?: number // Peak level (0-1)
}

export function Fader({
  value,
  onValueChange,
  min = 0,
  max = 1,
  step = 0.01,
  height = 200,
  className,
  disabled = false,
  level = 0,
  peak = 0
}: FaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [dragStartValue, setDragStartValue] = useState(0)
  const faderRef = useRef<HTMLDivElement>(null)

  // Calculate fader position based on value
  const normalizedValue = (value - min) / (max - min)
  const faderPosition = (1 - normalizedValue) * (height - 40) // 40px is fader handle height

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return
    e.preventDefault()
    setIsDragging(true)
    setDragStartY(e.clientY)
    setDragStartValue(value)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return
    e.preventDefault()
    setIsDragging(true)
    setDragStartY(e.touches[0].clientY)
    setDragStartValue(value)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || disabled) return
    e.preventDefault()
    
    const deltaY = dragStartY - e.clientY
    const deltaValue = (deltaY / (height - 40)) * (max - min)
    const newValue = Math.max(min, Math.min(max, dragStartValue + deltaValue))
    
    // Snap to step
    const steppedValue = Math.round(newValue / step) * step
    onValueChange(steppedValue)
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || disabled) return
    e.preventDefault()
    
    const deltaY = dragStartY - e.touches[0].clientY
    const deltaValue = (deltaY / (height - 40)) * (max - min)
    const newValue = Math.max(min, Math.min(max, dragStartValue + deltaValue))
    
    // Snap to step
    const steppedValue = Math.round(newValue / step) * step
    onValueChange(steppedValue)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isDragging, dragStartY, dragStartValue, height, min, max, step, disabled])

  return (
    <div 
      ref={faderRef}
      className={cn(
        "relative select-none",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      style={{ height }}
    >
      {/* Fader Track with VU Meter */}
      <div className="absolute left-1/2 transform -translate-x-1/2 w-3 bg-gray-800 rounded-full h-full border border-gray-600">
        {/* VU Meter Background */}
        <div className="absolute inset-0 bg-gradient-to-t from-yellow-400 via-yellow-400 to-red-500 rounded-full opacity-10"></div>
        
        {/* VU Meter Level Bar */}
        {level > 0 && (
          <div 
            className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-75"
            style={{
              height: `${level * 100}%`,
              background: level > 0.8 ? 'linear-gradient(to top, #ef4444, #fbbf24)' : 
                         level > 0.6 ? 'linear-gradient(to top, #fbbf24, #fbbf24)' : 
                         'linear-gradient(to top, #fbbf24, #fbbf24)',
              opacity: 0.7
            }}
          />
        )}
        
        {/* VU Meter Peak Indicator */}
        {peak > 0 && (
          <div 
            className="absolute left-0 right-0 w-full bg-white rounded-full opacity-80"
            style={{
              bottom: `${peak * 100}%`,
              height: '2px'
            }}
          />
        )}
        
        {/* Fader Handle */}
        <div
          className="absolute left-1/2 transform -translate-x-1/2 w-8 h-10 bg-gradient-to-b from-gray-300 to-gray-600 rounded-lg border-2 border-gray-400 shadow-lg cursor-grab active:cursor-grabbing hover:from-gray-200 hover:to-gray-500 transition-colors z-10"
          style={{ top: faderPosition }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Fader Handle Grip */}
          <div className="absolute inset-1 bg-gradient-to-b from-gray-400 to-gray-700 rounded border border-gray-500">
            <div className="absolute inset-0 flex flex-col justify-center items-center">
              <div className="w-1 h-1 bg-gray-600 rounded-full mb-0.5"></div>
              <div className="w-1 h-1 bg-gray-600 rounded-full mb-0.5"></div>
              <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Fader Position Indicator */}
        <div 
          className="absolute left-1/2 transform -translate-x-1/2 w-1 bg-white rounded-full opacity-60"
          style={{ 
            top: faderPosition + 20, 
            height: height - faderPosition - 20 
          }}
        ></div>
      </div>

      {/* Value Display */}
      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 font-mono">
        {Math.round(value * 100)}%
      </div>
    </div>
  )
} 