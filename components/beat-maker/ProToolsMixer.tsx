'use client';

import React, { useState } from 'react';
import { useAudioEngine } from './AudioEngine';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Volume2, 
  VolumeX, 
  Headphones, 
  Circle, 
  Settings, 
  Mic,
  RotateCcw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface EQBand {
  frequency: number;
  gain: number;
  q: number;
  type: 'highpass' | 'lowpass' | 'peaking' | 'highshelf' | 'lowshelf';
}

interface ChannelEQ {
  enabled: boolean;
  bands: EQBand[];
}

interface ChannelEffects {
  reverb: number;
  delay: number;
  chorus: number;
  compressor: {
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
    enabled: boolean;
  };
}

interface MixerChannel {
  trackId: string;
  eq: ChannelEQ;
  effects: ChannelEffects;
  sends: { [key: string]: number };
}

interface ProToolsMixerProps {
  className?: string;
}

export const ProToolsMixer: React.FC<ProToolsMixerProps> = ({ className = '' }) => {
  const { 
    state, 
    setTrackVolume, 
    setTrackPan, 
    muteTrack, 
    soloTrack, 
    recordTrack,
    setMasterVolume,
    selectTrack
  } = useAudioEngine();
  
  const [mixerChannels, setMixerChannels] = useState<{ [trackId: string]: MixerChannel }>({});
  const [showEQ, setShowEQ] = useState<{ [trackId: string]: boolean }>({});
  const [showEffects, setShowEffects] = useState<{ [trackId: string]: boolean }>({});
  const [masterEQ, setMasterEQ] = useState<ChannelEQ>({
    enabled: false,
    bands: [
      { frequency: 80, gain: 0, q: 0.7, type: 'highpass' },
      { frequency: 200, gain: 0, q: 1.0, type: 'peaking' },
      { frequency: 1000, gain: 0, q: 1.0, type: 'peaking' },
      { frequency: 3000, gain: 0, q: 1.0, type: 'peaking' },
      { frequency: 8000, gain: 0, q: 0.7, type: 'lowpass' }
    ]
  });

  // Initialize mixer channels for tracks
  const initializeMixerChannel = (trackId: string): MixerChannel => {
    if (mixerChannels[trackId]) return mixerChannels[trackId];
    
    const newChannel: MixerChannel = {
      trackId,
      eq: {
        enabled: false,
        bands: [
          { frequency: 80, gain: 0, q: 0.7, type: 'highpass' },
          { frequency: 200, gain: 0, q: 1.0, type: 'peaking' },
          { frequency: 1000, gain: 0, q: 1.0, type: 'peaking' },
          { frequency: 3000, gain: 0, q: 1.0, type: 'peaking' },
          { frequency: 8000, gain: 0, q: 0.7, type: 'lowpass' }
        ]
      },
      effects: {
        reverb: 0,
        delay: 0,
        chorus: 0,
        compressor: {
          threshold: -12,
          ratio: 4,
          attack: 3,
          release: 100,
          enabled: false
        }
      },
      sends: {}
    };
    
    setMixerChannels(prev => ({ ...prev, [trackId]: newChannel }));
    return newChannel;
  };

  const updateChannelEQ = (trackId: string, bandIndex: number, property: keyof EQBand, value: any) => {
    setMixerChannels(prev => ({
      ...prev,
      [trackId]: {
        ...prev[trackId],
        eq: {
          ...prev[trackId].eq,
          bands: prev[trackId].eq.bands.map((band, i) => 
            i === bandIndex ? { ...band, [property]: value } : band
          )
        }
      }
    }));
  };

  const updateChannelEffect = (trackId: string, effect: keyof ChannelEffects, value: any) => {
    setMixerChannels(prev => ({
      ...prev,
      [trackId]: {
        ...prev[trackId],
        effects: {
          ...prev[trackId].effects,
          [effect]: value
        }
      }
    }));
  };

  const resetChannel = (trackId: string) => {
    setTrackVolume(trackId, 0.8);
    setTrackPan(trackId, 0);
    
    const channel = initializeMixerChannel(trackId);
    setMixerChannels(prev => ({
      ...prev,
      [trackId]: {
        ...channel,
        eq: {
          enabled: false,
          bands: channel.eq.bands.map(band => ({ ...band, gain: 0 }))
        },
        effects: {
          reverb: 0,
          delay: 0,
          chorus: 0,
          compressor: {
            ...channel.effects.compressor,
            enabled: false
          }
        }
      }
    }));
  };

  const formatDbValue = (value: number) => {
    return value > 0 ? `+${value.toFixed(1)}dB` : `${value.toFixed(1)}dB`;
  };

  const formatFrequency = (freq: number) => {
    return freq >= 1000 ? `${(freq / 1000).toFixed(1)}kHz` : `${freq}Hz`;
  };

  return (
    <div className={`bg-slate-900 p-4 rounded-lg ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">ProTools Mixer</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">Master:</span>
          <div className="w-24">
            <Slider
              value={[state.masterVolume]}
              onValueChange={([value]) => setMasterVolume(value)}
              max={1}
              step={0.01}
              className="w-full"
            />
          </div>
          <span className="text-sm text-gray-300 w-12">
            {formatDbValue((state.masterVolume - 1) * 60)}
          </span>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4">
        {/* Track Channels */}
        {state.tracks.map(track => {
          const channel = initializeMixerChannel(track.id);
          const isShowEQ = showEQ[track.id];
          const isShowEffects = showEffects[track.id];
          
          return (
            <div
              key={track.id}
              className={`bg-slate-800 rounded-lg p-3 min-w-[200px] border-2 ${
                state.selectedTrack === track.id ? 'border-blue-500' : 'border-slate-700'
              }`}
              onClick={() => selectTrack(track.id)}
            >
              {/* Track Header */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-white truncate">
                    {track.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => resetChannel(track.id)}
                    className="p-1 h-6 w-6"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </div>

                {/* Record/Solo/Mute */}
                <div className="flex gap-1 mb-2">
                  <Button
                    variant={track.isRecording ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => recordTrack(track.id)}
                    className="flex-1 p-1 text-xs"
                  >
                    <Circle className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={track.isSolo ? "default" : "outline"}
                    size="sm"
                    onClick={() => soloTrack(track.id)}
                    className="flex-1 p-1 text-xs"
                  >
                    <Headphones className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={track.isMuted ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => muteTrack(track.id)}
                    className="flex-1 p-1 text-xs"
                  >
                    {track.isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                  </Button>
                </div>
              </div>

              {/* EQ Section */}
              <div className="mb-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEQ(prev => ({ ...prev, [track.id]: !prev[track.id] }))}
                  className="w-full justify-between p-2 h-8"
                >
                  <span className="text-xs">EQ</span>
                  {isShowEQ ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
                
                {isShowEQ && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant={channel.eq.enabled ? "default" : "outline"}
                        size="sm"
                        onClick={() => 
                          setMixerChannels(prev => ({
                            ...prev,
                            [track.id]: {
                              ...prev[track.id],
                              eq: { ...prev[track.id].eq, enabled: !prev[track.id].eq.enabled }
                            }
                          }))
                        }
                        className="text-xs px-2 py-1"
                      >
                        ON
                      </Button>
                    </div>
                    
                    {channel.eq.bands.map((band, i) => (
                      <div key={i} className="space-y-1">
                        <div className="text-xs text-gray-400">{formatFrequency(band.frequency)}</div>
                        <Slider
                          value={[band.gain]}
                          onValueChange={([value]) => updateChannelEQ(track.id, i, 'gain', value)}
                          min={-12}
                          max={12}
                          step={0.1}
                          className="w-full"
                        />
                        <div className="text-xs text-center">{formatDbValue(band.gain)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Effects Section */}
              <div className="mb-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEffects(prev => ({ ...prev, [track.id]: !prev[track.id] }))}
                  className="w-full justify-between p-2 h-8"
                >
                  <span className="text-xs">FX</span>
                  {isShowEffects ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
                
                {isShowEffects && (
                  <div className="mt-2 space-y-2">
                    {/* Compressor */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Comp</span>
                        <Button
                          variant={channel.effects.compressor.enabled ? "default" : "outline"}
                          size="sm"
                          onClick={() => 
                            updateChannelEffect(track.id, 'compressor', {
                              ...channel.effects.compressor,
                              enabled: !channel.effects.compressor.enabled
                            })
                          }
                          className="text-xs px-2 py-1 h-5"
                        >
                          ON
                        </Button>
                      </div>
                    </div>

                    {/* Reverb */}
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400">Reverb</div>
                      <Slider
                        value={[channel.effects.reverb]}
                        onValueChange={([value]) => updateChannelEffect(track.id, 'reverb', value)}
                        max={1}
                        step={0.01}
                        className="w-full"
                      />
                      <div className="text-xs text-center">{Math.round(channel.effects.reverb * 100)}%</div>
                    </div>

                    {/* Delay */}
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400">Delay</div>
                      <Slider
                        value={[channel.effects.delay]}
                        onValueChange={([value]) => updateChannelEffect(track.id, 'delay', value)}
                        max={1}
                        step={0.01}
                        className="w-full"
                      />
                      <div className="text-xs text-center">{Math.round(channel.effects.delay * 100)}%</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Pan */}
              <div className="mb-3">
                <div className="text-xs text-gray-400 mb-1">Pan</div>
                <Slider
                  value={[track.pan]}
                  onValueChange={([value]) => setTrackPan(track.id, value)}
                  min={-1}
                  max={1}
                  step={0.01}
                  className="w-full"
                />
                <div className="text-xs text-center mt-1">
                  {track.pan === 0 ? 'C' : track.pan < 0 ? `L${Math.abs(track.pan * 100).toFixed(0)}` : `R${(track.pan * 100).toFixed(0)}`}
                </div>
              </div>

              {/* Volume Fader */}
              <div className="h-32 flex flex-col items-center">
                <div className="text-xs text-gray-400 mb-1">Vol</div>
                <div className="flex-1 flex items-center">
                  <Slider
                    value={[track.volume]}
                    onValueChange={([value]) => setTrackVolume(track.id, value)}
                    max={1}
                    step={0.01}
                    orientation="vertical"
                    className="h-24"
                  />
                </div>
                <div className="text-xs text-center mt-1">
                  {formatDbValue((track.volume - 1) * 60)}
                </div>
              </div>

              {/* Level Meter Placeholder */}
              <div className="mt-2 h-2 bg-slate-700 rounded overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-150"
                  style={{ width: `${track.volume * 100}%` }}
                />
              </div>
            </div>
          );
        })}

        {/* Master Channel */}
        <div className="bg-slate-800 rounded-lg p-3 min-w-[200px] border-2 border-yellow-600">
          <div className="mb-3">
            <div className="text-sm font-semibold text-yellow-400 mb-2">MASTER</div>
          </div>

          {/* Master EQ */}
          <div className="mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEQ(prev => ({ ...prev, master: !prev.master }))}
              className="w-full justify-between p-2 h-8"
            >
              <span className="text-xs">Master EQ</span>
              {showEQ.master ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
            
            {showEQ.master && (
              <div className="mt-2 space-y-2">
                <Button
                  variant={masterEQ.enabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMasterEQ(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className="text-xs px-2 py-1"
                >
                  ON
                </Button>
                
                {masterEQ.bands.map((band, i) => (
                  <div key={i} className="space-y-1">
                    <div className="text-xs text-gray-400">{formatFrequency(band.frequency)}</div>
                    <Slider
                      value={[band.gain]}
                      onValueChange={([value]) => 
                        setMasterEQ(prev => ({
                          ...prev,
                          bands: prev.bands.map((b, idx) => 
                            idx === i ? { ...b, gain: value } : b
                          )
                        }))
                      }
                      min={-12}
                      max={12}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="text-xs text-center">{formatDbValue(band.gain)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Master Volume */}
          <div className="h-32 flex flex-col items-center">
            <div className="text-xs text-gray-400 mb-1">Master</div>
            <div className="flex-1 flex items-center">
              <Slider
                value={[state.masterVolume]}
                onValueChange={([value]) => setMasterVolume(value)}
                max={1}
                step={0.01}
                orientation="vertical"
                className="h-24"
              />
            </div>
            <div className="text-xs text-center mt-1">
              {formatDbValue((state.masterVolume - 1) * 60)}
            </div>
          </div>

          {/* Master Level Meter */}
          <div className="mt-2 h-4 bg-slate-700 rounded overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-150"
              style={{ width: `${state.masterVolume * 100}%` }}
            />
          </div>
        </div>

        {state.tracks.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-gray-400 min-h-[300px]">
            <p>No tracks available. Create tracks to use the mixer.</p>
          </div>
        )}
      </div>
    </div>
  );
};
