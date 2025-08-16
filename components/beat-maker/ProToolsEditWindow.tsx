'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAudioEngine } from './AudioEngine';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Scissors, Copy, Trash2, Volume2, VolumeX, Headphones } from 'lucide-react';

interface AudioRegion {
  id: string;
  trackId: string;
  startTime: number;
  duration: number;
  audioBuffer: AudioBuffer | null;
  name: string;
  color: string;
  fadeIn: number;
  fadeOut: number;
  gain: number;
  offset: number; // offset within the audio file
}

interface ProToolsEditWindowProps {
  className?: string;
}

export const ProToolsEditWindow: React.FC<ProToolsEditWindowProps> = ({ className = '' }) => {
  const { 
    state, 
    setCurrentTime, 
    setTrackVolume, 
    setTrackPan, 
    muteTrack, 
    soloTrack,
    selectTrack,
    createTrack,
    deleteTrack 
  } = useAudioEngine();
  
  const [zoom, setZoom] = useState(1); // seconds per pixel
  const [viewportStart, setViewportStart] = useState(0);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [regions, setRegions] = useState<AudioRegion[]>([]);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    regionId: string | null;
    startX: number;
    startTime: number;
  }>({
    isDragging: false,
    regionId: null,
    startX: 0,
    startTime: 0
  });

  const editWindowRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Constants
  const TRACK_HEIGHT = 80;
  const TIMELINE_HEIGHT = 40;
  const TRACK_HEADER_WIDTH = 200;
  const PIXELS_PER_SECOND = 100 / zoom;

  // Time helpers
  const timeToPixels = (time: number) => time * PIXELS_PER_SECOND;
  const pixelsToTime = (pixels: number) => pixels / PIXELS_PER_SECOND;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const formatTimecode = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30); // Assuming 30fps
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  // Add region
  const addRegion = (trackId: string, startTime: number, audioBuffer: AudioBuffer) => {
    const newRegion: AudioRegion = {
      id: `region_${Date.now()}_${Math.random()}`,
      trackId,
      startTime,
      duration: audioBuffer.duration,
      audioBuffer,
      name: `Audio ${regions.length + 1}`,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`,
      fadeIn: 0,
      fadeOut: 0,
      gain: 1,
      offset: 0
    };
    setRegions(prev => [...prev, newRegion]);
  };

  // Region selection
  const selectRegion = (regionId: string, multiSelect = false) => {
    if (multiSelect) {
      setSelectedRegions(prev => 
        prev.includes(regionId) 
          ? prev.filter(id => id !== regionId)
          : [...prev, regionId]
      );
    } else {
      setSelectedRegions([regionId]);
    }
  };

  // Region dragging
  const handleMouseDown = (e: React.MouseEvent, regionId: string) => {
    e.stopPropagation();
    const region = regions.find(r => r.id === regionId);
    if (!region) return;

    setDragState({
      isDragging: true,
      regionId,
      startX: e.clientX,
      startTime: region.startTime
    });

    selectRegion(regionId);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging || !dragState.regionId) return;

    const deltaX = e.clientX - dragState.startX;
    const deltaTime = pixelsToTime(deltaX);
    const newStartTime = Math.max(0, dragState.startTime + deltaTime);

    setRegions(prev => prev.map(region => 
      region.id === dragState.regionId 
        ? { ...region, startTime: newStartTime }
        : region
    ));
  }, [dragState, pixelsToTime]);

  const handleMouseUp = useCallback(() => {
    setDragState({
      isDragging: false,
      regionId: null,
      startX: 0,
      startTime: 0
    });
  }, []);

  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState.isDragging, handleMouseMove, handleMouseUp]);

  // Timeline click to set playhead
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = pixelsToTime(x) + viewportStart;
    setCurrentTime(Math.max(0, time));
  };

  // Delete selected regions
  const deleteSelectedRegions = () => {
    setRegions(prev => prev.filter(region => !selectedRegions.includes(region.id)));
    setSelectedRegions([]);
  };

  // Copy selected regions
  const copySelectedRegions = () => {
    // Implementation for copying regions
    console.log('Copying regions:', selectedRegions);
  };

  // Split region at playhead
  const splitRegionAtPlayhead = () => {
    selectedRegions.forEach(regionId => {
      const region = regions.find(r => r.id === regionId);
      if (!region) return;
      
      const splitTime = state.currentTime;
      if (splitTime > region.startTime && splitTime < region.startTime + region.duration) {
        const firstPartDuration = splitTime - region.startTime;
        const secondPartStart = splitTime;
        const secondPartDuration = region.duration - firstPartDuration;
        
        // Update original region
        setRegions(prev => prev.map(r => 
          r.id === regionId 
            ? { ...r, duration: firstPartDuration }
            : r
        ));
        
        // Create new region for second part
        const newRegion: AudioRegion = {
          ...region,
          id: `region_${Date.now()}_${Math.random()}`,
          startTime: secondPartStart,
          duration: secondPartDuration,
          offset: region.offset + firstPartDuration
        };
        
        setRegions(prev => [...prev, newRegion]);
      }
    });
  };

  const viewportWidth = editWindowRef.current?.clientWidth || 800;
  const viewportDuration = pixelsToTime(viewportWidth - TRACK_HEADER_WIDTH);

  return (
    <div className={`bg-slate-900 rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="bg-slate-800 p-2 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={splitRegionAtPlayhead}
            disabled={selectedRegions.length === 0}
          >
            <Scissors className="h-4 w-4 mr-1" />
            Split
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={copySelectedRegions}
            disabled={selectedRegions.length === 0}
          >
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={deleteSelectedRegions}
            disabled={selectedRegions.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>

          <div className="flex items-center gap-2 ml-4">
            <span className="text-sm text-gray-300">Zoom:</span>
            <Slider
              value={[zoom]}
              onValueChange={([value]) => setZoom(value)}
              min={0.1}
              max={10}
              step={0.1}
              className="w-24"
            />
          </div>

          <div className="flex items-center gap-2 ml-4">
            <span className="text-sm text-gray-300">Time:</span>
            <span className="text-sm font-mono bg-slate-700 px-2 py-1 rounded">
              {formatTimecode(state.currentTime)}
            </span>
          </div>
        </div>
      </div>

      <div ref={editWindowRef} className="flex flex-col h-[600px]">
        {/* Timeline */}
        <div className="flex border-b border-slate-700">
          <div className="w-[200px] bg-slate-800 border-r border-slate-700 p-2">
            <span className="text-sm text-gray-300 font-semibold">Timeline</span>
          </div>
          <div
            ref={timelineRef}
            className="flex-1 bg-slate-800 relative cursor-pointer"
            style={{ height: TIMELINE_HEIGHT }}
            onClick={handleTimelineClick}
          >
            {/* Time markers */}
            <div className="absolute inset-0">
              {Array.from({ length: Math.ceil(viewportDuration) + 1 }, (_, i) => {
                const time = viewportStart + i;
                const x = timeToPixels(time - viewportStart);
                return (
                  <div
                    key={i}
                    className="absolute text-xs text-gray-400"
                    style={{ left: x, top: 2 }}
                  >
                    {formatTime(time)}
                  </div>
                );
              })}
            </div>
            
            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
              style={{ left: timeToPixels(state.currentTime - viewportStart) }}
            />
          </div>
        </div>

        {/* Tracks */}
        <div className="flex-1 overflow-y-auto">
          {state.tracks.map((track, index) => (
            <div key={track.id} className="flex border-b border-slate-700">
              {/* Track Header */}
              <div className="w-[200px] bg-slate-800 border-r border-slate-700 p-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white font-medium truncate">
                      {track.name}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => muteTrack(track.id)}
                        className={`p-1 rounded text-xs ${
                          track.isMuted ? 'bg-red-600 text-white' : 'bg-slate-600 text-gray-300'
                        }`}
                      >
                        {track.isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                      </button>
                      <button
                        onClick={() => soloTrack(track.id)}
                        className={`p-1 rounded text-xs ${
                          track.isSolo ? 'bg-yellow-600 text-white' : 'bg-slate-600 text-gray-300'
                        }`}
                      >
                        <Headphones className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Vol:</span>
                    <div className="flex-1">
                      <Slider
                        value={[track.volume]}
                        onValueChange={([value]) => setTrackVolume(track.id, value)}
                        max={1}
                        step={0.01}
                        className="w-full"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Pan:</span>
                    <div className="flex-1">
                      <Slider
                        value={[track.pan]}
                        onValueChange={([value]) => setTrackPan(track.id, value)}
                        min={-1}
                        max={1}
                        step={0.01}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Track Content */}
              <div
                className="flex-1 relative bg-slate-900"
                style={{ height: TRACK_HEIGHT }}
                onClick={() => selectTrack(track.id)}
              >
                {/* Track background grid */}
                <div className="absolute inset-0 opacity-20">
                  {Array.from({ length: Math.ceil(viewportDuration) + 1 }, (_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 w-px bg-slate-600"
                      style={{ left: timeToPixels(i) }}
                    />
                  ))}
                </div>

                {/* Audio Regions */}
                {regions
                  .filter(region => region.trackId === track.id)
                  .map(region => {
                    const left = timeToPixels(region.startTime - viewportStart);
                    const width = timeToPixels(region.duration);
                    const isSelected = selectedRegions.includes(region.id);
                    
                    if (left + width < 0 || left > viewportWidth - TRACK_HEADER_WIDTH) {
                      return null; // Don't render if outside viewport
                    }

                    return (
                      <div
                        key={region.id}
                        className={`absolute top-1 bottom-1 rounded cursor-move border-2 ${
                          isSelected ? 'border-blue-400' : 'border-transparent'
                        }`}
                        style={{
                          left: Math.max(0, left),
                          width: Math.min(width, viewportWidth - TRACK_HEADER_WIDTH - Math.max(0, left)),
                          backgroundColor: region.color,
                          opacity: 0.8
                        }}
                        onMouseDown={(e) => handleMouseDown(e, region.id)}
                      >
                        <div className="p-1 h-full flex flex-col justify-center">
                          <span className="text-xs text-white font-medium truncate">
                            {region.name}
                          </span>
                          <span className="text-xs text-white opacity-75">
                            {formatTime(region.duration)}
                          </span>
                        </div>
                        
                        {/* Waveform placeholder */}
                        <div className="absolute bottom-1 left-1 right-1 h-4 bg-black bg-opacity-30 rounded-sm">
                          <div className="h-full bg-white bg-opacity-50 rounded-sm" style={{ width: '60%' }} />
                        </div>
                      </div>
                    );
                  })}

                {/* Playhead */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                  style={{ left: timeToPixels(state.currentTime - viewportStart) }}
                />
              </div>
            </div>
          ))}

          {state.tracks.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <p>No tracks available. Create tracks to start editing.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
