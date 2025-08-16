'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAudioEngine } from './AudioEngine';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { 
  Mic, 
  Circle, 
  Square, 
  Play, 
  Pause, 
  Save, 
  Trash2,
  Volume2,
  Settings,
  Headphones,
  FileAudio,
  Download
} from 'lucide-react';

interface RecordingSession {
  id: string;
  name: string;
  duration: number;
  audioBlob: Blob | null;
  waveformData: number[];
  createdAt: Date;
  trackId: string;
}

interface AudioInputSettings {
  deviceId: string;
  gain: number;
  monitoring: boolean;
  metronome: boolean;
  countIn: number;
  autoStop: boolean;
  autoStopDuration: number;
}

interface ProToolsRecordProps {
  className?: string;
}

export const ProToolsRecord: React.FC<ProToolsRecordProps> = ({ className = '' }) => {
  const { 
    state, 
    play, 
    stop, 
    pause, 
    record,
    createTrack,
    loadAudioToTrack,
    setCurrentTime
  } = useAudioEngine();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordings, setRecordings] = useState<RecordingSession[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<string | null>(null);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [inputLevel, setInputLevel] = useState(0);
  const [settings, setSettings] = useState<AudioInputSettings>({
    deviceId: '',
    gain: 0.8,
    monitoring: false,
    metronome: true,
    countIn: 4,
    autoStop: false,
    autoStopDuration: 300 // 5 minutes
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const levelUpdateRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Get available audio input devices
  useEffect(() => {
    const getAudioDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        setAudioInputs(audioInputs);
        
        if (audioInputs.length > 0 && !settings.deviceId) {
          setSettings(prev => ({ ...prev, deviceId: audioInputs[0].deviceId }));
        }
      } catch (error) {
        console.error('Error getting audio devices:', error);
      }
    };

    getAudioDevices();
  }, [settings.deviceId]);

  // Initialize audio context and analyser for level monitoring
  const initializeAudioMonitoring = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      if (streamRef.current) {
        const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        source.connect(analyserRef.current);

        // Start level monitoring
        updateInputLevel();
      }
    } catch (error) {
      console.error('Error initializing audio monitoring:', error);
    }
  };

  // Update input level for visual feedback
  const updateInputLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setInputLevel(average / 255);

    levelUpdateRef.current = requestAnimationFrame(updateInputLevel);
  };

  // Start recording
  const startRecording = async () => {
    try {
      // Get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: settings.deviceId ? { exact: settings.deviceId } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      streamRef.current = stream;
      await initializeAudioMonitoring();

      // Create MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        saveRecording(audioBlob);
      };

      // Start recording
      mediaRecorderRef.current.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);
      record(); // Notify audio engine

      // Start timing
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 0.1;
          
          // Auto-stop if enabled
          if (settings.autoStop && newTime >= settings.autoStopDuration) {
            stopRecording();
            return newTime;
          }
          
          return newTime;
        });
      }, 100);

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }

    if (levelUpdateRef.current) {
      cancelAnimationFrame(levelUpdateRef.current);
    }

    setIsRecording(false);
    setInputLevel(0);
    record(); // Notify audio engine to stop recording
  };

  // Save recording session
  const saveRecording = (audioBlob: Blob) => {
    const newRecording: RecordingSession = {
      id: `recording_${Date.now()}`,
      name: `Recording ${recordings.length + 1}`,
      duration: recordingTime,
      audioBlob,
      waveformData: [], // TODO: Generate waveform data
      createdAt: new Date(),
      trackId: state.selectedTrack || ''
    };

    setRecordings(prev => [...prev, newRecording]);
    setSelectedRecording(newRecording.id);
  };

  // Play recording
  const playRecording = async (recordingId: string) => {
    const recording = recordings.find(r => r.id === recordingId);
    if (!recording || !recording.audioBlob) return;

    try {
      const audio = new Audio(URL.createObjectURL(recording.audioBlob));
      audio.play();
    } catch (error) {
      console.error('Error playing recording:', error);
    }
  };

  // Delete recording
  const deleteRecording = (recordingId: string) => {
    setRecordings(prev => prev.filter(r => r.id !== recordingId));
    if (selectedRecording === recordingId) {
      setSelectedRecording(null);
    }
  };

  // Add recording to track
  const addToTrack = async (recordingId: string) => {
    const recording = recordings.find(r => r.id === recordingId);
    if (!recording || !recording.audioBlob) return;

    try {
      // Convert blob to AudioBuffer
      const arrayBuffer = await recording.audioBlob.arrayBuffer();
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      // Create new track if none selected
      let trackId = state.selectedTrack;
      if (!trackId) {
        trackId = createTrack(`Recording Track ${state.tracks.length + 1}`);
      }
      
      // Load audio to track
      loadAudioToTrack(trackId, audioBuffer);
      
      alert('Recording added to track successfully!');
    } catch (error) {
      console.error('Error adding recording to track:', error);
      alert('Error adding recording to track');
    }
  };

  // Download recording
  const downloadRecording = (recordingId: string) => {
    const recording = recordings.find(r => r.id === recordingId);
    if (!recording || !recording.audioBlob) return;

    const url = URL.createObjectURL(recording.audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recording.name}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className={`bg-slate-900 p-4 rounded-lg ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">ProTools Record</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">Time:</span>
          <span className="text-sm font-mono bg-slate-700 px-2 py-1 rounded">
            {formatTime(recordingTime)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recording Controls */}
        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Recording Controls</h3>
          
          {/* Input Selection */}
          <div className="mb-4">
            <label className="text-sm text-gray-300 block mb-2">Audio Input</label>
            <select
              value={settings.deviceId}
              onChange={(e) => setSettings(prev => ({ ...prev, deviceId: e.target.value }))}
              className="w-full bg-slate-700 text-white p-2 rounded"
              disabled={isRecording}
            >
              {audioInputs.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                </option>
              ))}
            </select>
          </div>

          {/* Input Level */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">Input Level</span>
              <span className="text-sm text-gray-300">{Math.round(inputLevel * 100)}%</span>
            </div>
            <div className="h-4 bg-slate-700 rounded overflow-hidden">
              <div 
                className={`h-full transition-all duration-150 ${
                  inputLevel > 0.8 ? 'bg-red-500' : inputLevel > 0.6 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${inputLevel * 100}%` }}
              />
            </div>
          </div>

          {/* Input Gain */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">Input Gain</span>
              <span className="text-sm text-gray-300">{Math.round(settings.gain * 100)}%</span>
            </div>
            <Slider
              value={[settings.gain]}
              onValueChange={([value]) => setSettings(prev => ({ ...prev, gain: value }))}
              max={2}
              step={0.01}
              className="w-full"
              disabled={isRecording}
            />
          </div>

          {/* Record Settings */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="monitoring"
                checked={settings.monitoring}
                onChange={(e) => setSettings(prev => ({ ...prev, monitoring: e.target.checked }))}
                disabled={isRecording}
              />
              <label htmlFor="monitoring" className="text-sm text-gray-300">
                <Headphones className="h-4 w-4 inline mr-1" />
                Monitor
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="metronome"
                checked={settings.metronome}
                onChange={(e) => setSettings(prev => ({ ...prev, metronome: e.target.checked }))}
              />
              <label htmlFor="metronome" className="text-sm text-gray-300">
                Metronome
              </label>
            </div>
          </div>

          {/* Auto-stop */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="autoStop"
                checked={settings.autoStop}
                onChange={(e) => setSettings(prev => ({ ...prev, autoStop: e.target.checked }))}
              />
              <label htmlFor="autoStop" className="text-sm text-gray-300">
                Auto-stop after
              </label>
              <input
                type="number"
                value={Math.round(settings.autoStopDuration)}
                onChange={(e) => setSettings(prev => ({ ...prev, autoStopDuration: parseInt(e.target.value) || 300 }))}
                className="w-16 bg-slate-700 text-white px-2 py-1 rounded text-sm"
                disabled={!settings.autoStop}
              />
              <span className="text-sm text-gray-300">seconds</span>
            </div>
          </div>

          {/* Record Buttons */}
          <div className="flex gap-2">
            <Button
              variant={isRecording ? "destructive" : "default"}
              onClick={isRecording ? stopRecording : startRecording}
              className="flex-1"
              disabled={!settings.deviceId}
            >
              {isRecording ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Circle className="h-4 w-4 mr-2" />
                  Start Recording
                </>
              )}
            </Button>
          </div>

          {/* Progress Bar for Auto-stop */}
          {isRecording && settings.autoStop && (
            <div className="mt-4">
              <Progress 
                value={(recordingTime / settings.autoStopDuration) * 100} 
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Recordings List */}
        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Recordings</h3>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recordings.map(recording => (
              <div
                key={recording.id}
                className={`p-3 rounded border-2 cursor-pointer transition-all ${
                  selectedRecording === recording.id
                    ? 'border-blue-500 bg-slate-700'
                    : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                }`}
                onClick={() => setSelectedRecording(recording.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{recording.name}</span>
                  <span className="text-sm text-gray-400">
                    {formatTime(recording.duration)}
                  </span>
                </div>
                
                <div className="text-xs text-gray-400 mb-2">
                  {recording.createdAt.toLocaleString()}
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      playRecording(recording.id);
                    }}
                    className="text-xs px-2 py-1"
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      addToTrack(recording.id);
                    }}
                    className="text-xs px-2 py-1"
                  >
                    <FileAudio className="h-3 w-3" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadRecording(recording.id);
                    }}
                    className="text-xs px-2 py-1"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteRecording(recording.id);
                    }}
                    className="text-xs px-2 py-1 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}

            {recordings.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                <Mic className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No recordings yet</p>
                <p className="text-sm">Start recording to create your first session</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
