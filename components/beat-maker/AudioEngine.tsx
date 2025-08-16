'use client';

import { createContext, useContext, useRef, useEffect, useState, ReactNode } from 'react';

// Audio Engine Types
interface Track {
  id: string;
  name: string;
  audioBuffer: AudioBuffer | null;
  audioNode: AudioBufferSourceNode | null;
  gainNode: GainNode;
  panNode: StereoPannerNode;
  isPlaying: boolean;
  isMuted: boolean;
  isSolo: boolean;
  isRecording: boolean;
  volume: number;
  pan: number;
  startTime: number;
  duration: number;
}

interface AudioEngineState {
  isPlaying: boolean;
  isRecording: boolean;
  currentTime: number;
  tempo: number;
  tracks: Track[];
  masterVolume: number;
  selectedTrack: string | null;
}

interface AudioEngineContextType {
  // State
  state: AudioEngineState;
  
  // Transport Controls
  play: () => void;
  stop: () => void;
  pause: () => void;
  record: () => void;
  
  // Time Control
  setCurrentTime: (time: number) => void;
  setTempo: (tempo: number) => void;
  
  // Track Management
  createTrack: (name: string) => string;
  deleteTrack: (trackId: string) => void;
  selectTrack: (trackId: string) => void;
  
  // Track Controls
  setTrackVolume: (trackId: string, volume: number) => void;
  setTrackPan: (trackId: string, pan: number) => void;
  muteTrack: (trackId: string) => void;
  soloTrack: (trackId: string) => void;
  recordTrack: (trackId: string) => void;
  
  // Audio Loading
  loadAudioToTrack: (trackId: string, audioBuffer: AudioBuffer) => void;
  
  // Master Controls
  setMasterVolume: (volume: number) => void;
  
  // Audio Context
  audioContext: AudioContext | null;
}

const AudioEngineContext = createContext<AudioEngineContextType | null>(null);

export const useAudioEngine = () => {
  const context = useContext(AudioEngineContext);
  if (!context) {
    throw new Error('useAudioEngine must be used within AudioEngineProvider');
  }
  return context;
};

interface AudioEngineProviderProps {
  children: ReactNode;
}

export const AudioEngineProvider: React.FC<AudioEngineProviderProps> = ({ children }) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  
  const [state, setState] = useState<AudioEngineState>({
    isPlaying: false,
    isRecording: false,
    currentTime: 0,
    tempo: 120,
    tracks: [],
    masterVolume: 0.8,
    selectedTrack: null,
  });

  // Initialize Audio Context
  useEffect(() => {
    const initAudio = async () => {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        masterGainRef.current = audioContextRef.current.createGain();
        masterGainRef.current.connect(audioContextRef.current.destination);
        masterGainRef.current.gain.value = state.masterVolume;
      } catch (error) {
        console.error('Failed to initialize audio context:', error);
      }
    };

    initAudio();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Animation loop for currentTime updates
  const updateCurrentTime = () => {
    if (state.isPlaying && audioContextRef.current) {
      const elapsed = audioContextRef.current.currentTime - startTimeRef.current + pausedTimeRef.current;
      setState(prev => ({ ...prev, currentTime: elapsed }));
      animationFrameRef.current = requestAnimationFrame(updateCurrentTime);
    }
  };

  // Transport Controls
  const play = () => {
    if (!audioContextRef.current) return;
    
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    startTimeRef.current = audioContextRef.current.currentTime;
    setState(prev => ({ ...prev, isPlaying: true }));
    
    // Start playing all tracks
    state.tracks.forEach(track => {
      if (!track.isMuted && track.audioBuffer && !track.isPlaying) {
        playTrack(track);
      }
    });
    
    updateCurrentTime();
  };

  const stop = () => {
    setState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
    pausedTimeRef.current = 0;
    
    // Stop all tracks
    state.tracks.forEach(track => {
      if (track.audioNode) {
        track.audioNode.stop();
      }
      track.isPlaying = false;
    });
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const pause = () => {
    setState(prev => ({ ...prev, isPlaying: false }));
    pausedTimeRef.current = state.currentTime;
    
    // Pause all tracks
    state.tracks.forEach(track => {
      if (track.audioNode) {
        track.audioNode.stop();
      }
      track.isPlaying = false;
    });
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const record = () => {
    setState(prev => ({ ...prev, isRecording: !prev.isRecording }));
  };

  const playTrack = (track: Track) => {
    if (!audioContextRef.current || !masterGainRef.current || !track.audioBuffer) return;
    
    const source = audioContextRef.current.createBufferSource();
    source.buffer = track.audioBuffer;
    source.connect(track.gainNode);
    track.gainNode.connect(track.panNode);
    track.panNode.connect(masterGainRef.current);
    
    source.start(0, state.currentTime);
    track.audioNode = source;
    track.isPlaying = true;
  };

  // Track Management
  const createTrack = (name: string): string => {
    if (!audioContextRef.current) return '';
    
    const trackId = `track_${Date.now()}_${Math.random()}`;
    const gainNode = audioContextRef.current.createGain();
    const panNode = audioContextRef.current.createStereoPanner();
    
    const newTrack: Track = {
      id: trackId,
      name,
      audioBuffer: null,
      audioNode: null,
      gainNode,
      panNode,
      isPlaying: false,
      isMuted: false,
      isSolo: false,
      isRecording: false,
      volume: 0.8,
      pan: 0,
      startTime: 0,
      duration: 0,
    };
    
    gainNode.gain.value = newTrack.volume;
    panNode.pan.value = newTrack.pan;
    
    setState(prev => ({
      ...prev,
      tracks: [...prev.tracks, newTrack],
      selectedTrack: trackId
    }));
    
    return trackId;
  };

  const deleteTrack = (trackId: string) => {
    setState(prev => ({
      ...prev,
      tracks: prev.tracks.filter(track => track.id !== trackId),
      selectedTrack: prev.selectedTrack === trackId ? null : prev.selectedTrack
    }));
  };

  const selectTrack = (trackId: string) => {
    setState(prev => ({ ...prev, selectedTrack: trackId }));
  };

  // Track Controls
  const setTrackVolume = (trackId: string, volume: number) => {
    setState(prev => ({
      ...prev,
      tracks: prev.tracks.map(track => 
        track.id === trackId 
          ? { ...track, volume }
          : track
      )
    }));
    
    const track = state.tracks.find(t => t.id === trackId);
    if (track) {
      track.gainNode.gain.value = volume;
    }
  };

  const setTrackPan = (trackId: string, pan: number) => {
    setState(prev => ({
      ...prev,
      tracks: prev.tracks.map(track => 
        track.id === trackId 
          ? { ...track, pan }
          : track
      )
    }));
    
    const track = state.tracks.find(t => t.id === trackId);
    if (track) {
      track.panNode.pan.value = pan;
    }
  };

  const muteTrack = (trackId: string) => {
    setState(prev => ({
      ...prev,
      tracks: prev.tracks.map(track => 
        track.id === trackId 
          ? { ...track, isMuted: !track.isMuted }
          : track
      )
    }));
  };

  const soloTrack = (trackId: string) => {
    setState(prev => ({
      ...prev,
      tracks: prev.tracks.map(track => 
        track.id === trackId 
          ? { ...track, isSolo: !track.isSolo }
          : track
      )
    }));
  };

  const recordTrack = (trackId: string) => {
    setState(prev => ({
      ...prev,
      tracks: prev.tracks.map(track => 
        track.id === trackId 
          ? { ...track, isRecording: !track.isRecording }
          : track
      )
    }));
  };

  // Audio Loading
  const loadAudioToTrack = (trackId: string, audioBuffer: AudioBuffer) => {
    setState(prev => ({
      ...prev,
      tracks: prev.tracks.map(track => 
        track.id === trackId 
          ? { ...track, audioBuffer, duration: audioBuffer.duration }
          : track
      )
    }));
  };

  // Master Controls
  const setMasterVolume = (volume: number) => {
    setState(prev => ({ ...prev, masterVolume: volume }));
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = volume;
    }
  };

  const setCurrentTime = (time: number) => {
    setState(prev => ({ ...prev, currentTime: time }));
    pausedTimeRef.current = time;
  };

  const setTempo = (tempo: number) => {
    setState(prev => ({ ...prev, tempo }));
  };

  const contextValue: AudioEngineContextType = {
    state,
    play,
    stop,
    pause,
    record,
    setCurrentTime,
    setTempo,
    createTrack,
    deleteTrack,
    selectTrack,
    setTrackVolume,
    setTrackPan,
    muteTrack,
    soloTrack,
    recordTrack,
    loadAudioToTrack,
    setMasterVolume,
    audioContext: audioContextRef.current,
  };

  return (
    <AudioEngineContext.Provider value={contextValue}>
      {children}
    </AudioEngineContext.Provider>
  );
};
