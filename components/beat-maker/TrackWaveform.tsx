import React, { useEffect, useRef, useState } from 'react';

interface TrackWaveformProps {
  audioUrl: string | null;
  trackColor: string;
  height?: number;
  width?: number;
  bpm: number;
  steps: number;
  currentStep?: number;
  activeSteps?: boolean[];
}

export function TrackWaveform({ 
  audioUrl, 
  trackColor, 
  height = 20, 
  width = 120, 
  bpm, 
  steps, 
  currentStep = 0,
  activeSteps = []
}: TrackWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  // Calculate step timing
  const stepDuration = (60 / bpm) / 4; // 16th note duration in seconds
  const totalDuration = stepDuration * steps;

  useEffect(() => {
    if (!audioUrl || !canvasRef.current) return;

    const loadAudioWaveform = async () => {
      try {
        // Create audio context
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        // Fetch and decode audio
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

        // Get audio data
        const channelData = audioBuffer.getChannelData(0); // Use first channel
        
        // Sample the waveform at regular intervals for smooth display
        const sampleCount = Math.min(width, channelData.length);
        const samplesPerPixel = channelData.length / sampleCount;
        
        const waveformSamples: number[] = [];
        
        for (let i = 0; i < sampleCount; i++) {
          const startIndex = Math.floor(i * samplesPerPixel);
          const endIndex = Math.floor((i + 1) * samplesPerPixel);
          
          // Find the min and max values in this sample range
          let min = 0;
          let max = 0;
          
          for (let j = startIndex; j < endIndex && j < channelData.length; j++) {
            const sample = channelData[j];
            if (sample < min) min = sample;
            if (sample > max) max = sample;
          }
          
          // Store the peak-to-peak amplitude
          waveformSamples.push(Math.abs(max - min));
        }
        
        setWaveformData(waveformSamples);
        setIsLoaded(true);
      } catch (error) {
        console.error('Error loading audio waveform:', error);
        // Fallback to simple pattern if audio loading fails
        const fallbackData = Array.from({ length: width }, (_, i) => 
          Math.random() * 0.3 + 0.1
        );
        setWaveformData(fallbackData);
        setIsLoaded(true);
      }
    };

    loadAudioWaveform();

    return () => {
      // Cleanup audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [audioUrl, width]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Draw step grid and active step indicators
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * width;
      
      // Check if this step is active
      const isActive = activeSteps[i];
      
      if (isActive) {
        // Draw active step background
        ctx.fillStyle = `${trackColor}30`;
        ctx.fillRect(x, 0, width / steps, height);
      }
      
      // Draw step grid line
      ctx.strokeStyle = isActive ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = isActive ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw downbeats (every 4 steps)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    
    for (let i = 0; i <= steps; i += 4) {
      const x = (i / steps) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw current step indicator
    if (currentStep >= 0) {
      const currentX = (currentStep / steps) * width;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(currentX, 0);
      ctx.lineTo(currentX, height);
      ctx.stroke();
    }

    // Draw actual waveform
    if (waveformData.length > 0) {
      const centerY = height / 2;
      const maxAmplitude = height / 2 - 2;
      
      // Find the maximum amplitude for normalization
      const maxValue = Math.max(...waveformData);
      const normalizedData = maxValue > 0 ? waveformData.map(val => val / maxValue) : waveformData;
      
      ctx.strokeStyle = trackColor;
      ctx.lineWidth = 1;
      ctx.fillStyle = `${trackColor}40`;
      
      // Draw waveform as filled area
      ctx.beginPath();
      
      // Draw top half
      for (let i = 0; i < normalizedData.length; i++) {
        const x = (i / normalizedData.length) * width;
        const amplitude = normalizedData[i] * maxAmplitude;
        const y = centerY - amplitude;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      // Draw bottom half
      for (let i = normalizedData.length - 1; i >= 0; i--) {
        const x = (i / normalizedData.length) * width;
        const amplitude = normalizedData[i] * maxAmplitude;
        const y = centerY + amplitude;
        ctx.lineTo(x, y);
      }
      
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

  }, [waveformData, width, height, steps, currentStep, trackColor, activeSteps]);

  if (!audioUrl) {
    return (
      <div 
        className="flex items-center justify-center text-gray-500 text-xs"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        No audio
      </div>
    );
  }

  return (
    <div className="relative group">
      <canvas
        ref={canvasRef}
        className="rounded-sm cursor-pointer"
        style={{ width: `${width}px`, height: `${height}px` }}
        title={`${bpm} BPM • ${steps} steps • ${stepDuration.toFixed(3)}s per step • ${totalDuration.toFixed(2)}s total`}
      />
      
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
        {bpm} BPM • {steps} steps • {stepDuration.toFixed(3)}s per step
      </div>
    </div>
  );
} 