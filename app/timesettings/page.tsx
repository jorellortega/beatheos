"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { 
  Clock, 
  Music, 
  Grid3X3, 
  Settings, 
  Save, 
  RotateCcw, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack,
  Timer,
  Calendar,
  Zap,
  Target,
  Gauge,
  BarChart3,
  Globe,
  Link,
  Unlink,
  Volume2,
  Mic
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from '@/lib/supabaseClient'

interface TimeSettings {
  bpm: number
  timeSignature: string
  stepsPerBar: number
  totalBars: number
  totalSteps: number
  stepDuration: number
  barDuration: number
  totalDuration: number
  swingAmount: number
  quantization: number
  autoSync: boolean
  globalOffset: number
  // New fields for platform integration
  transportKey: string
  masterVolume: number
  metronomeEnabled: boolean
  metronomeVolume: number
  syncMode: 'global' | 'local' | 'hybrid'
  latencyCompensation: number
}

export default function TimeSettingsPage() {
  const { user } = useAuth()
  const [timeSettings, setTimeSettings] = useState<TimeSettings>({
    bpm: 120,
    timeSignature: "4/4",
    stepsPerBar: 16,
    totalBars: 4,
    totalSteps: 64,
    stepDuration: 0.5,
    barDuration: 8,
    totalDuration: 32,
    swingAmount: 0,
    quantization: 16,
    autoSync: true,
    globalOffset: 0,
    transportKey: "C",
    masterVolume: 0.8,
    metronomeEnabled: false,
    metronomeVolume: 0.5,
    syncMode: 'global',
    latencyCompensation: 0
  })

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [currentBar, setCurrentBar] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [toneInitialized, setToneInitialized] = useState(false)
  const [transportState, setTransportState] = useState<'stopped' | 'started' | 'paused'>('stopped')
  const [metronomeRef, setMetronomeRef] = useState<any>(null)
  const [metronomeSequence, setMetronomeSequence] = useState<any>(null)

  // Initialize Tone.js
  useEffect(() => {
    const initTone = async () => {
      try {
        const Tone = await import('tone')
        await Tone.start()
        
        // Set initial transport settings
        Tone.Transport.bpm.value = timeSettings.bpm
        Tone.Transport.timeSignature = timeSettings.timeSignature.split('/').map(Number) as [number, number]
        
        // Create metronome sounds
        const metronome = {
          high: new Tone.Player({
            url: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT",
            volume: -10
          }).toDestination(),
          low: new Tone.Player({
            url: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT",
            volume: -15
          }).toDestination()
        }
        
        setMetronomeRef(metronome)
        setToneInitialized(true)
        console.log('[TIME SETTINGS] Tone.js initialized with BPM:', timeSettings.bpm)
      } catch (error) {
        console.error('[TIME SETTINGS] Failed to initialize Tone.js:', error)
      }
    }

    initTone()
  }, [])

  // Create metronome sequence
  useEffect(() => {
    if (!toneInitialized || !metronomeRef) return

    const createMetronomeSequence = async () => {
      try {
        const Tone = await import('tone')
        
        // Stop existing sequence
        if (metronomeSequence) {
          metronomeSequence.stop()
          metronomeSequence.dispose()
        }
        
        const [beats, division] = timeSettings.timeSignature.split('/').map(Number)
        const stepsPerBeat = division / 4 // 4 = quarter note
        const totalSteps = timeSettings.stepsPerBar
        
        // Create array for metronome clicks
        const clickArray = Array.from({ length: totalSteps }, (_, i) => {
          // First beat of each bar gets high click, others get low click
          return i % stepsPerBeat === 0 ? 'high' : 'low'
        })
        
        const sequence = new Tone.Sequence((time, click) => {
          if (timeSettings.metronomeEnabled) {
            metronomeRef[click].start(time)
          }
        }, clickArray, '16n')
        
        setMetronomeSequence(sequence)
        console.log('[TIME SETTINGS] Metronome sequence created')
      } catch (error) {
        console.error('[TIME SETTINGS] Failed to create metronome sequence:', error)
      }
    }

    createMetronomeSequence()
  }, [toneInitialized, metronomeRef, timeSettings.bpm, timeSettings.timeSignature, timeSettings.stepsPerBar, timeSettings.metronomeEnabled])

  // Calculate derived values
  useEffect(() => {
    const [beats, division] = timeSettings.timeSignature.split('/').map(Number)
    const stepDuration = 60 / timeSettings.bpm / (division / 4) // 16th note duration
    const barDuration = stepDuration * timeSettings.stepsPerBar
    const totalSteps = timeSettings.stepsPerBar * timeSettings.totalBars
    const totalDuration = totalSteps * stepDuration

    setTimeSettings(prev => ({
      ...prev,
      stepDuration,
      barDuration,
      totalSteps,
      totalDuration
    }))
  }, [timeSettings.bpm, timeSettings.timeSignature, timeSettings.stepsPerBar, timeSettings.totalBars])

  // Sync with Tone.js Transport
  useEffect(() => {
    if (!toneInitialized) return

    const syncTransport = async () => {
      try {
        const Tone = await import('tone')
        
        // Update Transport BPM
        Tone.Transport.bpm.value = timeSettings.bpm
        
        // Update time signature
        const [beats, division] = timeSettings.timeSignature.split('/').map(Number)
        Tone.Transport.timeSignature = [beats, division]
        
        // Apply global offset - use context latency instead
        if (timeSettings.globalOffset !== 0) {
          Tone.context.latencyHint = timeSettings.globalOffset / 1000 // Convert ms to seconds
        }
        
        console.log(`[TIME SETTINGS] Transport synced - BPM: ${timeSettings.bpm}, TimeSig: ${timeSettings.timeSignature}`)
      } catch (error) {
        console.error('[TIME SETTINGS] Failed to sync transport:', error)
      }
    }

    syncTransport()
  }, [timeSettings.bpm, timeSettings.timeSignature, timeSettings.globalOffset, toneInitialized])

  // Load saved settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return
      
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('time_settings')
          .eq('user_id', user.id)
          .single()

        if (data?.time_settings) {
          setTimeSettings(prev => ({ ...prev, ...data.time_settings }))
        }
      } catch (error) {
        console.log('No saved time settings found, using defaults')
      }
    }

    loadSettings()
  }, [user])

  // Save settings
  const saveSettings = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          time_settings: timeSettings,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
      console.log('Time settings saved successfully')
    } catch (error) {
      console.error('Error saving time settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Reset to defaults
  const resetSettings = () => {
    setTimeSettings({
      bpm: 120,
      timeSignature: "4/4",
      stepsPerBar: 16,
      totalBars: 4,
      totalSteps: 64,
      stepDuration: 0.5,
      barDuration: 8,
      totalDuration: 32,
      swingAmount: 0,
      quantization: 16,
      autoSync: true,
      globalOffset: 0,
      transportKey: "C",
      masterVolume: 0.8,
      metronomeEnabled: false,
      metronomeVolume: 0.5,
      syncMode: 'global',
      latencyCompensation: 0
    })
  }

  // Transport controls
  const toggleTransport = async () => {
    if (!toneInitialized) return

    try {
      const Tone = await import('tone')
      
      if (Tone.Transport.state === 'started') {
        Tone.Transport.pause()
        setTransportState('paused')
        setIsPlaying(false)
      } else {
        await Tone.start()
        
        // Start metronome sequence if enabled
        if (metronomeSequence && timeSettings.metronomeEnabled) {
          metronomeSequence.start(0)
        }
        
        Tone.Transport.start()
        setTransportState('started')
        setIsPlaying(true)
      }
    } catch (error) {
      console.error('[TIME SETTINGS] Transport control error:', error)
    }
  }

  const stopTransport = async () => {
    if (!toneInitialized) return

    try {
      const Tone = await import('tone')
      Tone.Transport.stop()
      Tone.Transport.position = 0
      setTransportState('stopped')
      setIsPlaying(false)
      setCurrentStep(0)
      setCurrentBar(1)
      setCurrentTime(0)
      
      // Stop metronome sequence
      if (metronomeSequence) {
        metronomeSequence.stop()
      }
    } catch (error) {
      console.error('[TIME SETTINGS] Stop transport error:', error)
    }
  }

  // Test metronome sound
  const testMetronome = async () => {
    if (!metronomeRef) return
    
    try {
      const Tone = await import('tone')
      await Tone.start()
      
      // Play a test click
      metronomeRef.high.start()
      console.log('[TIME SETTINGS] Metronome test sound played')
    } catch (error) {
      console.error('[TIME SETTINGS] Metronome test error:', error)
    }
  }

  // Simulate playback
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setCurrentStep(prev => {
        const next = (prev + 1) % timeSettings.totalSteps
        setCurrentBar(Math.floor(next / timeSettings.stepsPerBar) + 1)
        setCurrentTime(next * timeSettings.stepDuration)
        return next
      })
    }, timeSettings.stepDuration * 1000)

    return () => clearInterval(interval)
  }, [isPlaying, timeSettings.stepDuration, timeSettings.totalSteps, timeSettings.stepsPerBar])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 1000)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
  }

  // Apply settings globally
  const applyGlobally = () => {
    // Dispatch custom event for other components to listen to
    const event = new CustomEvent('globalTimeSettingsChanged', {
      detail: timeSettings
    })
    window.dispatchEvent(event)
    
    console.log('[TIME SETTINGS] Global settings applied:', timeSettings)
  }

  return (
    <div className="min-h-screen bg-[#141414] p-6">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Timer className="w-8 h-8 text-blue-400" />
            Universal Time Settings
          </h1>
          <p className="text-gray-400">
            Control timing across all components - sequencer, loops, patterns, and more
          </p>
        </div>

        {/* Live Display */}
        <Card className="bg-black border-blue-500 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-400">
              <Play className="w-5 h-5" />
              Live Timing Display
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{currentBar}</div>
                <div className="text-sm text-gray-400">Current Bar</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{currentStep + 1}</div>
                <div className="text-sm text-gray-400">Current Step</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{formatTime(currentTime)}</div>
                <div className="text-sm text-gray-400">Current Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{timeSettings.bpm}</div>
                <div className="text-sm text-gray-400">BPM</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Step {currentStep + 1} of {timeSettings.totalSteps}</span>
                <span>Bar {currentBar} of {timeSettings.totalBars}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-100"
                  style={{ width: `${((currentStep + 1) / timeSettings.totalSteps) * 100}%` }}
                />
              </div>
            </div>

            {/* Transport Controls */}
            <div className="flex justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={stopTransport}>
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button onClick={toggleTransport} className="bg-blue-600 hover:bg-blue-700">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentStep(timeSettings.totalSteps - 1)}>
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            {/* Transport Status */}
            <div className="mt-4 text-center">
              <Badge variant={transportState === 'started' ? 'default' : 'secondary'} className="text-xs">
                <Globe className="w-3 h-3 mr-1" />
                Transport: {transportState.toUpperCase()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Timing Settings */}
          <Card className="bg-black border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="w-5 h-5 text-green-400" />
                Basic Timing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* BPM */}
              <div>
                <Label className="text-sm font-medium">BPM (Beats Per Minute)</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Slider
                    value={[timeSettings.bpm]}
                    onValueChange={(value) => setTimeSettings(prev => ({ ...prev, bpm: value[0] }))}
                    min={60}
                    max={200}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={timeSettings.bpm}
                    onChange={(e) => setTimeSettings(prev => ({ ...prev, bpm: parseInt(e.target.value) || 120 }))}
                    className="w-20 text-center"
                    min={60}
                    max={200}
                  />
                </div>
              </div>

              {/* Time Signature */}
              <div>
                <Label className="text-sm font-medium">Time Signature</Label>
                <Select 
                  value={timeSettings.timeSignature} 
                  onValueChange={(value) => setTimeSettings(prev => ({ ...prev, timeSignature: value }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4/4">4/4 (Common Time)</SelectItem>
                    <SelectItem value="3/4">3/4 (Waltz)</SelectItem>
                    <SelectItem value="6/8">6/8 (Compound)</SelectItem>
                    <SelectItem value="2/4">2/4 (Cut Time)</SelectItem>
                    <SelectItem value="5/4">5/4 (Odd Time)</SelectItem>
                    <SelectItem value="7/8">7/8 (Odd Time)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Steps Per Bar */}
              <div>
                <Label className="text-sm font-medium">Steps Per Bar</Label>
                <Select 
                  value={timeSettings.stepsPerBar.toString()} 
                  onValueChange={(value) => setTimeSettings(prev => ({ ...prev, stepsPerBar: parseInt(value) }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8">8 Steps (8th Notes)</SelectItem>
                    <SelectItem value="16">16 Steps (16th Notes)</SelectItem>
                    <SelectItem value="32">32 Steps (32nd Notes)</SelectItem>
                    <SelectItem value="24">24 Steps (Triplets)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Total Bars */}
              <div>
                <Label className="text-sm font-medium">Total Bars</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Slider
                    value={[timeSettings.totalBars]}
                    onValueChange={(value) => setTimeSettings(prev => ({ ...prev, totalBars: value[0] }))}
                    min={1}
                    max={16}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={timeSettings.totalBars}
                    onChange={(e) => setTimeSettings(prev => ({ ...prev, totalBars: parseInt(e.target.value) || 4 }))}
                    className="w-20 text-center"
                    min={1}
                    max={16}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Timing Settings */}
          <Card className="bg-black border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                Advanced Timing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Swing Amount */}
              <div>
                <Label className="text-sm font-medium">Swing Amount</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Slider
                    value={[timeSettings.swingAmount]}
                    onValueChange={(value) => setTimeSettings(prev => ({ ...prev, swingAmount: value[0] }))}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={timeSettings.swingAmount}
                    onChange={(e) => setTimeSettings(prev => ({ ...prev, swingAmount: parseInt(e.target.value) || 0 }))}
                    className="w-20 text-center"
                    min={0}
                    max={100}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {timeSettings.swingAmount}% swing - affects timing of even-numbered steps
                </div>
              </div>

              {/* Quantization */}
              <div>
                <Label className="text-sm font-medium">Quantization Grid</Label>
                <Select 
                  value={timeSettings.quantization.toString()} 
                  onValueChange={(value) => setTimeSettings(prev => ({ ...prev, quantization: parseInt(value) }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">1/4 Notes</SelectItem>
                    <SelectItem value="8">1/8 Notes</SelectItem>
                    <SelectItem value="16">1/16 Notes</SelectItem>
                    <SelectItem value="32">1/32 Notes</SelectItem>
                    <SelectItem value="24">1/8 Triplets</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Global Offset */}
              <div>
                <Label className="text-sm font-medium">Global Timing Offset (ms)</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Slider
                    value={[timeSettings.globalOffset]}
                    onValueChange={(value) => setTimeSettings(prev => ({ ...prev, globalOffset: value[0] }))}
                    min={-100}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={timeSettings.globalOffset}
                    onChange={(e) => setTimeSettings(prev => ({ ...prev, globalOffset: parseInt(e.target.value) || 0 }))}
                    className="w-20 text-center"
                    min={-100}
                    max={100}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Adjusts all timing by {timeSettings.globalOffset}ms
                </div>
              </div>

              {/* Auto Sync */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Auto Sync</Label>
                  <div className="text-xs text-gray-500">Automatically sync all components</div>
                </div>
                <Switch
                  checked={timeSettings.autoSync}
                  onCheckedChange={(checked) => setTimeSettings(prev => ({ ...prev, autoSync: checked }))}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Platform Integration Settings */}
        <Card className="bg-black border-gray-700 mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-orange-400" />
              Platform Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Transport Settings */}
              <div className="space-y-4">
                <h4 className="font-semibold text-white">Transport Settings</h4>
                
                {/* Transport Key */}
                <div>
                  <Label className="text-sm font-medium">Transport Key</Label>
                  <Select 
                    value={timeSettings.transportKey} 
                    onValueChange={(value) => setTimeSettings(prev => ({ ...prev, transportKey: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(key => (
                        <SelectItem key={key} value={key}>{key}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Master Volume */}
                <div>
                  <Label className="text-sm font-medium">Master Volume</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Slider
                      value={[timeSettings.masterVolume * 100]}
                      onValueChange={(value) => setTimeSettings(prev => ({ ...prev, masterVolume: value[0] / 100 }))}
                      min={0}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={Math.round(timeSettings.masterVolume * 100)}
                      onChange={(e) => setTimeSettings(prev => ({ ...prev, masterVolume: parseInt(e.target.value) / 100 || 0.8 }))}
                      className="w-16 text-center"
                      min={0}
                      max={100}
                    />
                  </div>
                </div>

                {/* Sync Mode */}
                <div>
                  <Label className="text-sm font-medium">Sync Mode</Label>
                  <Select 
                    value={timeSettings.syncMode} 
                    onValueChange={(value: 'global' | 'local' | 'hybrid') => setTimeSettings(prev => ({ ...prev, syncMode: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global (All components sync)</SelectItem>
                      <SelectItem value="local">Local (Component-specific)</SelectItem>
                      <SelectItem value="hybrid">Hybrid (Smart sync)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Metronome Settings */}
              <div className="space-y-4">
                <h4 className="font-semibold text-white">Metronome</h4>
                
                {/* Metronome Enable */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Enable Metronome</Label>
                    <div className="text-xs text-gray-500">Click track for timing reference</div>
                  </div>
                  <Switch
                    checked={timeSettings.metronomeEnabled}
                    onCheckedChange={(checked) => setTimeSettings(prev => ({ ...prev, metronomeEnabled: checked }))}
                  />
                </div>

                {/* Metronome Volume */}
                <div>
                  <Label className="text-sm font-medium">Metronome Volume</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Slider
                      value={[timeSettings.metronomeVolume * 100]}
                      onValueChange={(value) => setTimeSettings(prev => ({ ...prev, metronomeVolume: value[0] / 100 }))}
                      min={0}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={Math.round(timeSettings.metronomeVolume * 100)}
                      onChange={(e) => setTimeSettings(prev => ({ ...prev, metronomeVolume: parseInt(e.target.value) / 100 || 0.5 }))}
                      className="w-16 text-center"
                      min={0}
                      max={100}
                    />
                  </div>
                </div>

                {/* Test Metronome Button */}
                <div>
                  <Button 
                    onClick={testMetronome} 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    disabled={!metronomeRef}
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Test Metronome
                  </Button>
                </div>

                {/* Latency Compensation */}
                <div>
                  <Label className="text-sm font-medium">Latency Compensation (ms)</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Slider
                      value={[timeSettings.latencyCompensation]}
                      onValueChange={(value) => setTimeSettings(prev => ({ ...prev, latencyCompensation: value[0] }))}
                      min={0}
                      max={50}
                      step={1}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={timeSettings.latencyCompensation}
                      onChange={(e) => setTimeSettings(prev => ({ ...prev, latencyCompensation: parseInt(e.target.value) || 0 }))}
                      className="w-16 text-center"
                      min={0}
                      max={50}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Compensate for audio system latency
                  </div>
                </div>
              </div>

              {/* Integration Status */}
              <div className="space-y-4">
                <h4 className="font-semibold text-white">Integration Status</h4>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Tone.js Transport</span>
                    <Badge variant={toneInitialized ? 'default' : 'secondary'} className="text-xs">
                      {toneInitialized ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Global Sync</span>
                    <Badge variant={timeSettings.autoSync ? 'default' : 'secondary'} className="text-xs">
                      {timeSettings.autoSync ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Sync Mode</span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {timeSettings.syncMode}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Metronome</span>
                    <Badge variant={timeSettings.metronomeEnabled ? 'default' : 'secondary'} className="text-xs">
                      {timeSettings.metronomeEnabled ? 'On' : 'Off'}
                    </Badge>
                  </div>
                </div>

                <Separator className="my-4" />

                <Button 
                  onClick={applyGlobally} 
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Apply Globally
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timing Calculations */}
        <Card className="bg-black border-gray-700 mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-yellow-400" />
              Timing Calculations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-800 rounded-lg">
                <div className="text-lg font-bold text-white">{timeSettings.stepDuration.toFixed(3)}s</div>
                <div className="text-sm text-gray-400">Step Duration</div>
              </div>
              <div className="text-center p-4 bg-gray-800 rounded-lg">
                <div className="text-lg font-bold text-white">{timeSettings.barDuration.toFixed(2)}s</div>
                <div className="text-sm text-gray-400">Bar Duration</div>
              </div>
              <div className="text-center p-4 bg-gray-800 rounded-lg">
                <div className="text-lg font-bold text-white">{timeSettings.totalSteps}</div>
                <div className="text-sm text-gray-400">Total Steps</div>
              </div>
              <div className="text-center p-4 bg-gray-800 rounded-lg">
                <div className="text-lg font-bold text-white">{formatTime(timeSettings.totalDuration)}</div>
                <div className="text-sm text-gray-400">Total Duration</div>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-semibold text-white mb-2">Step Breakdown</h4>
                <div className="space-y-1 text-sm text-gray-400">
                  <div>• {timeSettings.stepsPerBar} steps per bar</div>
                  <div>• {timeSettings.totalBars} bars total</div>
                  <div>• {timeSettings.totalSteps} steps total</div>
                  <div>• {timeSettings.stepDuration.toFixed(3)}s per step</div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">Time Signature Info</h4>
                <div className="space-y-1 text-sm text-gray-400">
                  <div>• {timeSettings.timeSignature} time signature</div>
                  <div>• {timeSettings.bpm} BPM</div>
                  <div>• {timeSettings.barDuration.toFixed(2)}s per bar</div>
                  <div>• {formatTime(timeSettings.totalDuration)} total</div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">Sync Settings</h4>
                <div className="space-y-1 text-sm text-gray-400">
                  <div>• Swing: {timeSettings.swingAmount}%</div>
                  <div>• Quantization: 1/{timeSettings.quantization}</div>
                  <div>• Offset: {timeSettings.globalOffset}ms</div>
                  <div>• Auto Sync: {timeSettings.autoSync ? 'On' : 'Off'}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-6">
          <Button 
            onClick={saveSettings} 
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Settings'}
          </Button>
          <Button 
            onClick={resetSettings} 
            variant="outline"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>

        {/* Status */}
        <div className="text-center mt-4">
          <Badge variant="outline" className="text-gray-400">
            <Zap className="w-3 h-3 mr-1" />
            Universal timing control active - {timeSettings.syncMode} sync mode
          </Badge>
        </div>
      </div>
    </div>
  )
} 