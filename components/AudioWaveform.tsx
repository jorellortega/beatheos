import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

export function AudioWaveform({ audioUrl }: { audioUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (containerRef.current && audioUrl) {
      waveSurferRef.current = WaveSurfer.create({
        container: containerRef.current,
        waveColor: '#facc15',
        progressColor: '#fde68a',
        height: 80,
        barWidth: 2,
      });
      waveSurferRef.current.load(audioUrl);
      waveSurferRef.current.on('finish', () => setIsPlaying(false));
      waveSurferRef.current.on('error', (err) => {
        // Robustly ignore fetch abort errors
        const msg = (err && (err.message || err.toString() || ''));
        const name = err && err.name;
        if ((msg && msg.toLowerCase().includes('abort')) || (name && name.toLowerCase().includes('abort'))) {
          return;
        }
        // Optionally, handle/log other errors
        console.error('WaveSurfer error:', err);
      });
    }
    return () => {
      waveSurferRef.current && waveSurferRef.current.destroy();
    };
  }, [audioUrl]);

  const handlePlayPause = () => {
    if (waveSurferRef.current) {
      if (isPlaying) {
        waveSurferRef.current.pause();
        setIsPlaying(false);
      } else {
        waveSurferRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleWaveformClick = (e: React.MouseEvent) => {
    if (waveSurferRef.current) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        waveSurferRef.current.seekTo(x / rect.width);
        waveSurferRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="relative w-full cursor-pointer" onClick={handleWaveformClick}>
      <div ref={containerRef} className="w-full" />
      <button
        type="button"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 rounded-full p-2 z-10"
        onClick={(e) => {
          e.stopPropagation();
          handlePlayPause();
        }}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
        )}
      </button>
    </div>
  );
} 