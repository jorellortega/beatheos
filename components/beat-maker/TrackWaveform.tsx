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
  isVisible?: boolean; // New prop to control visibility
  loopStartTime?: number; // Loop start time in seconds
  loopEndTime?: number; // Loop end time in seconds
  showFullLoop?: boolean; // Whether to show the full loop extending beyond sequencer
  playbackRate?: number; // Playback rate to calculate actual playback duration
}

export function TrackWaveform({ 
  audioUrl, 
  trackColor, 
  height = 20, 
  width = 120, 
  bpm, 
  steps, 
  currentStep = 0,
  activeSteps = [],
  isVisible = true, // Default to visible for backward compatibility
  loopStartTime,
  loopEndTime,
  showFullLoop = false,
  playbackRate = 1.0
}: TrackWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate step timing
  const stepDuration = (60 / bpm) / 4; // 16th note duration in seconds
  const totalDuration = stepDuration * steps;
  
  // Calculate loop duration if available
  const loopDuration = loopStartTime !== undefined && loopEndTime !== undefined 
    ? loopEndTime - loopStartTime 
    : null;
  
  // Calculate extended loop duration to fill sequencer (like in useBeatMaker)
  const sequencerDuration = stepDuration * steps
  
  // For waveform display, show the actual playback duration considering playback rate
  // This ensures the waveform matches what the user actually hears
  const actualPlaybackDuration = loopDuration ? loopDuration / playbackRate : totalDuration
  
  // Determine display duration - show actual playback length
  const displayDuration = showFullLoop && actualPlaybackDuration ? Math.max(totalDuration, actualPlaybackDuration) : totalDuration;
  
  // Calculate display width - use actual playback length for visualization
  const maxExtensionRatio = 3; // Don't extend more than 3x the original width
  const extensionRatio = actualPlaybackDuration && totalDuration > 0 ? actualPlaybackDuration / totalDuration : 1;
  const limitedExtensionRatio = Math.min(extensionRatio, maxExtensionRatio);
  
  const displayWidth = showFullLoop && actualPlaybackDuration && actualPlaybackDuration > totalDuration 
    ? Math.min(width * limitedExtensionRatio, width * maxExtensionRatio)
    : width;

  useEffect(() => {
    // Only load waveform if visible and we have an audio URL
    if (!audioUrl || !canvasRef.current || !isVisible) return;

    // Prevent multiple simultaneous loads
    if (isLoading) return;

    const loadAudioWaveform = async () => {
      setIsLoading(true);
      console.log(`[WAVEFORM LOAD] Starting load for audio: ${audioUrl?.substring(0, 50)}...`);
      console.log(`[WAVEFORM LOAD] Display width: ${displayWidth}, Original width: ${width}, Loop duration: ${loopDuration?.toFixed(2)}s, Sequencer duration: ${totalDuration.toFixed(2)}s`);
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Waveform loading timeout')), 10000); // 10 second timeout
      });
      
      try {
        // Create audio context
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        // Check if audio context is suspended and resume if needed
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        // Fetch and decode audio with better error handling
        const fetchPromise = (async () => {
          const response = await fetch(audioUrl);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const arrayBuffer = await response.arrayBuffer();
          if (arrayBuffer.byteLength === 0) {
            throw new Error('Empty audio file');
          }

          // Use a promise-based decodeAudioData for better error handling
          const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
            if (!audioContextRef.current) {
              reject(new Error('Audio context not available'));
              return;
            }
            
            audioContextRef.current.decodeAudioData(
              arrayBuffer,
              (buffer) => resolve(buffer),
              (error) => reject(new Error(`Audio decode failed: ${error}`))
            );
          });
          
          return audioBuffer;
        })();
        
        const audioBuffer = await Promise.race([fetchPromise, timeoutPromise]) as AudioBuffer;

        // Get audio data
        const channelData = audioBuffer.getChannelData(0); // Use first channel
        
        // Sample the waveform at regular intervals for smooth display
        const sampleCount = Math.min(displayWidth, channelData.length);
        const samplesPerPixel = channelData.length / sampleCount;
        
        console.log(`[WAVEFORM LOAD] Audio buffer length: ${channelData.length}, Sample count: ${sampleCount}, Samples per pixel: ${samplesPerPixel.toFixed(2)}`);
        
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
        console.log(`[WAVEFORM LOAD] Successfully loaded waveform with ${waveformSamples.length} samples`);
      } catch (error) {
        console.warn(`[WAVEFORM LOAD] Error loading audio waveform for ${audioUrl}:`, error);
        
        // If extended waveform failed, try with original width
        if (showFullLoop && displayWidth > width) {
          console.log(`[WAVEFORM LOAD] Retrying with original width due to error`);
          const fallbackData = Array.from({ length: width }, (_, i) => 
            Math.random() * 0.3 + 0.1
          );
          setWaveformData(fallbackData);
          setIsLoaded(true);
        } else {
          // Fallback to simple pattern if audio loading fails
          const fallbackData = Array.from({ length: width }, (_, i) => 
            Math.random() * 0.3 + 0.1
          );
          setWaveformData(fallbackData);
          setIsLoaded(true);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadAudioWaveform();

    return () => {
      // Cleanup audio context more safely
      if (audioContextRef.current) {
        try {
          if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
          }
        } catch (error) {
          console.warn('Error closing audio context:', error);
        } finally {
        audioContextRef.current = null;
        }
      }
    };
  }, [audioUrl, width, isVisible]); // Added isVisible to dependencies

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = displayWidth;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, displayWidth, height);

    // Draw background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, displayWidth, height);

    // Draw step grid and active step indicators (only within sequencer bounds)
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
    
    // Draw loop boundary line if showing full loop
    if (showFullLoop && actualPlaybackDuration && actualPlaybackDuration > totalDuration) {
      const boundaryX = (actualPlaybackDuration / totalDuration) * width; // Actual playback boundary
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)'; // Yellow line
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]); // Dashed line
      ctx.beginPath();
      ctx.moveTo(boundaryX, 0);
      ctx.lineTo(boundaryX, height);
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash
      
      // Add text label for loop boundary
      const loopBars = Math.round((actualPlaybackDuration / stepDuration) / 4); // Convert to bars
      ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
      ctx.font = '10px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`${loopBars} bars`, boundaryX + 2, height - 2);
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
        const x = (i / normalizedData.length) * displayWidth;
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
        const x = (i / normalizedData.length) * displayWidth;
        const amplitude = normalizedData[i] * maxAmplitude;
        const y = centerY + amplitude;
        ctx.lineTo(x, y);
      }
      
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

  }, [waveformData, displayWidth, width, height, steps, currentStep, trackColor, activeSteps, showFullLoop, actualPlaybackDuration, totalDuration]);

  // Show loading state when not visible or loading
  if (!isVisible) {
    return (
      <div 
        className="flex items-center justify-center text-gray-400 text-xs bg-gray-800 rounded-sm"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        Hidden
      </div>
    );
  }

  if (isLoading) {
    return (
      <div 
        className="flex items-center justify-center text-blue-400 text-xs bg-gray-800 rounded-sm"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        Loading...
      </div>
    );
  }

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
        style={{ width: `${displayWidth}px`, height: `${height}px` }}
        title={`${bpm} BPM • ${steps} steps • ${stepDuration.toFixed(3)}s per step • ${totalDuration.toFixed(2)}s total${actualPlaybackDuration ? ` • Loop: ${actualPlaybackDuration.toFixed(2)}s` : ''}`}
      />
      
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
        {bpm} BPM • {steps} steps • {stepDuration.toFixed(3)}s per step
      </div>
    </div>
  );
} 