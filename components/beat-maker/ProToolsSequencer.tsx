'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAudioEngine } from './AudioEngine';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Square, Circle, SkipBack, SkipForward } from 'lucide-react';

interface SequencerStep {
  id: string;
  trackId: string;
  active: boolean;
  velocity: number;
  stepIndex: number;
}

interface SequencerPattern {
  id: string;
  name: string;
  steps: SequencerStep[];
  length: number; // in steps
  division: number; // 16th notes, 8th notes, etc.
}

interface ProToolsSequencerProps {
  className?: string;
}

export const ProToolsSequencer: React.FC<ProToolsSequencerProps> = ({ className = '' }) => {
  const { state, play, stop, pause, setTempo, createTrack, setCurrentTime } = useAudioEngine();
  const [currentPattern, setCurrentPattern] = useState<SequencerPattern>({
    id: 'default',
    name: 'Pattern 1',
    steps: [],
    length: 16,
    division: 16 // 16th notes
  });
  const [isLooping, setIsLooping] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const sequencerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate step timing based on tempo and division
  const getStepDuration = () => {
    const beatsPerMinute = state.tempo;
    const beatsPerSecond = beatsPerMinute / 60;
    const sixteenthNotesPerSecond = beatsPerSecond * 4;
    const stepDuration = 1000 / (sixteenthNotesPerSecond * (16 / currentPattern.division));
    return stepDuration;
  };

  // Initialize steps for all tracks
  useEffect(() => {
    if (state.tracks.length > 0 && currentPattern.steps.length === 0) {
      const newSteps: SequencerStep[] = [];
      state.tracks.forEach(track => {
        for (let i = 0; i < currentPattern.length; i++) {
          newSteps.push({
            id: `${track.id}_${i}`,
            trackId: track.id,
            active: false,
            velocity: 0.8,
            stepIndex: i
          });
        }
      });
      setCurrentPattern(prev => ({ ...prev, steps: newSteps }));
    }
  }, [state.tracks, currentPattern.length, currentPattern.steps.length]);

  // Sequencer playback loop
  useEffect(() => {
    if (state.isPlaying) {
      const stepDuration = getStepDuration();
      sequencerIntervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          const nextStep = (prev + 1) % currentPattern.length;
          
          // Trigger active steps
          const activeSteps = currentPattern.steps.filter(
            step => step.stepIndex === nextStep && step.active
          );
          
          activeSteps.forEach(step => {
            // Here you would trigger the audio for this step
            console.log(`Triggering step ${nextStep} for track ${step.trackId}`);
          });
          
          return nextStep;
        });
      }, stepDuration);
    } else {
      if (sequencerIntervalRef.current) {
        clearInterval(sequencerIntervalRef.current);
      }
    }

    return () => {
      if (sequencerIntervalRef.current) {
        clearInterval(sequencerIntervalRef.current);
      }
    };
  }, [state.isPlaying, state.tempo, currentPattern]);

  const toggleStep = useCallback((stepId: string) => {
    setCurrentPattern(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId 
          ? { ...step, active: !step.active }
          : step
      )
    }));
  }, []);

  const setStepVelocity = useCallback((stepId: string, velocity: number) => {
    setCurrentPattern(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId 
          ? { ...step, velocity }
          : step
      )
    }));
  }, []);

  const handlePlay = () => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const handleStop = () => {
    stop();
    setCurrentStep(0);
  };

  const addTrack = () => {
    const trackId = createTrack(`Track ${state.tracks.length + 1}`);
    
    // Add steps for the new track
    const newSteps: SequencerStep[] = [];
    for (let i = 0; i < currentPattern.length; i++) {
      newSteps.push({
        id: `${trackId}_${i}`,
        trackId,
        active: false,
        velocity: 0.8,
        stepIndex: i
      });
    }
    
    setCurrentPattern(prev => ({
      ...prev,
      steps: [...prev.steps, ...newSteps]
    }));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`bg-slate-900 p-4 rounded-lg ${className}`}>
      {/* Transport Controls */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-slate-800 rounded-lg">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentTime(0)}
          className="p-2"
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handlePlay}
          className="p-2"
        >
          {state.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleStop}
          className="p-2"
        >
          <Square className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsLooping(!isLooping)}
          className={`p-2 ${isLooping ? 'bg-blue-600' : ''}`}
        >
          <Circle className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2 ml-6">
          <span className="text-sm text-gray-300">Tempo:</span>
          <div className="w-24">
            <Slider
              value={[state.tempo]}
              onValueChange={([value]) => setTempo(value)}
              min={60}
              max={200}
              step={1}
              className="w-full"
            />
          </div>
          <span className="text-sm text-gray-300 w-10">{state.tempo}</span>
        </div>

        <div className="flex items-center gap-2 ml-6">
          <span className="text-sm text-gray-300">Time:</span>
          <span className="text-sm font-mono bg-slate-700 px-2 py-1 rounded">
            {formatTime(state.currentTime)}
          </span>
        </div>
      </div>

      {/* Pattern Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-white font-semibold">{currentPattern.name}</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-300">Length:</span>
            <select
              value={currentPattern.length}
              onChange={(e) => setCurrentPattern(prev => ({ 
                ...prev, 
                length: parseInt(e.target.value) 
              }))}
              className="bg-slate-700 text-white px-2 py-1 rounded text-sm"
            >
              <option value={8}>8</option>
              <option value={16}>16</option>
              <option value={32}>32</option>
              <option value={64}>64</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-300">Division:</span>
            <select
              value={currentPattern.division}
              onChange={(e) => setCurrentPattern(prev => ({ 
                ...prev, 
                division: parseInt(e.target.value) 
              }))}
              className="bg-slate-700 text-white px-2 py-1 rounded text-sm"
            >
              <option value={4}>1/4</option>
              <option value={8}>1/8</option>
              <option value={16}>1/16</option>
              <option value={32}>1/32</option>
            </select>
          </div>
        </div>
        
        <Button onClick={addTrack} variant="outline" size="sm">
          Add Track
        </Button>
      </div>

      {/* Step Grid */}
      <div className="bg-slate-800 rounded-lg p-4">
        {/* Step Numbers */}
        <div className="flex mb-2">
          <div className="w-32"></div> {/* Track name column */}
          {Array.from({ length: currentPattern.length }, (_, i) => (
            <div
              key={i}
              className={`flex-1 text-center text-xs py-1 ${
                currentStep === i ? 'bg-blue-600 text-white' : 'text-gray-400'
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Track Rows */}
        {state.tracks.map(track => (
          <div key={track.id} className="flex items-center mb-2">
            <div className="w-32 text-sm text-white truncate pr-2">
              {track.name}
            </div>
            <div className="flex flex-1 gap-1">
              {Array.from({ length: currentPattern.length }, (_, stepIndex) => {
                const step = currentPattern.steps.find(
                  s => s.trackId === track.id && s.stepIndex === stepIndex
                );
                return (
                  <button
                    key={`${track.id}_${stepIndex}`}
                    onClick={() => step && toggleStep(step.id)}
                    className={`flex-1 h-8 rounded border-2 transition-all ${
                      step?.active
                        ? 'bg-orange-500 border-orange-400'
                        : 'bg-slate-700 border-slate-600 hover:border-slate-500'
                    } ${currentStep === stepIndex ? 'ring-2 ring-blue-400' : ''}`}
                    style={{
                      opacity: step?.active ? step.velocity : 0.3
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {state.tracks.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            <p>No tracks available. Click "Add Track" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};
