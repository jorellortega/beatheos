# Wave Window Reconstruction Guide
## Loop Editor Waveform Display System

### Overview
This document provides a complete guide for reconstructing the wave window in the loop editor if it gets corrupted. The wave window is a complex React component that renders audio waveforms with interactive features like playback, selection, markers, and editing tools.

---

## 🏗️ **CORE ARCHITECTURE**

### **1. Essential Interfaces**
```typescript
interface WaveformPoint {
  x: number
  y: number
}

interface Marker {
  id: string
  time: number
  name: string
  category: string
  color?: string
  positions?: number[] // Multiple positions within one marker
}

interface Region {
  id: string
  startTime: number
  endTime: number
  name: string
  color: string
  isSelected: boolean
}

interface EditHistory {
  id: string
  type: 'cut' | 'copy' | 'paste' | 'delete' | 'fade' | 'normalize' | 'reverse' | 'marker' | 'edit' | 'shuffle'
  data: any
  timestamp: number
}
```

### **2. Critical State Variables**

#### **Core Audio State**
```typescript
const [audioFile, setAudioFile] = useState<File | null>(null)
const [audioUrl, setAudioUrl] = useState<string>('')
const [isLoading, setIsLoading] = useState(false)
const [duration, setDuration] = useState(0)
const [waveformData, setWaveformData] = useState<WaveformPoint[]>([])
```

#### **Playback State**
```typescript
const [isPlaying, setIsPlaying] = useState(false)
const [currentTime, setCurrentTime] = useState(0)
const [playheadPosition, setPlayheadPosition] = useState(0)
const [playbackRate, setPlaybackRate] = useState(1)
const [volume, setVolume] = useState(1)
```

#### **View/Display State**
```typescript
const [zoom, setZoom] = useState(1)
const [verticalZoom, setVerticalZoom] = useState(1)
const [waveformOffset, setWaveformOffset] = useState(0) // Horizontal offset for waveform dragging
const [scrollOffset, setScrollOffset] = useState(0)
const [viewWidth, setViewWidth] = useState(0)
const [snapToGrid, setSnapToGrid] = useState(true)
const [showGrid, setShowGrid] = useState(true) // Always show grid
const [showWaveform, setShowWaveform] = useState(true)
const [markedBars, setMarkedBars] = useState<number[]>([])
const [markedSubBars, setMarkedSubBars] = useState<number[]>([])
```

#### **Grid State**
```typescript
const [bpm, setBpm] = useState(120)
const [gridDivision, setGridDivision] = useState(4) // quarter notes (1/4)
const [gridLines, setGridLines] = useState<number[]>([])
```

#### **Selection State**
```typescript
const [selectionStart, setSelectionStart] = useState<number | null>(null)
const [selectionEnd, setSelectionEnd] = useState<number | null>(null)
const [isSelecting, setIsSelecting] = useState(false)
const [waveSelectionStart, setWaveSelectionStart] = useState<number | null>(null)
const [waveSelectionEnd, setWaveSelectionEnd] = useState<number | null>(null)
const [isWaveSelecting, setIsWaveSelecting] = useState(false)
```

#### **Markers and Regions**
```typescript
const [markers, setMarkers] = useState<Marker[]>([])
const [regions, setRegions] = useState<Region[]>([])
const [selectedMarkers, setSelectedMarkers] = useState<Set<string>>(new Set())
const [selectedRegions, setSelectedRegions] = useState<string[]>([])
```

### **3. Essential Refs**
```typescript
const canvasRef = useRef<HTMLCanvasElement>(null)
const audioRef = useRef<HTMLAudioElement>(null)
const animationRef = useRef<number | undefined>(undefined)
const isDraggingRef = useRef<boolean>(false)
const dragTypeRef = useRef<'playhead' | 'selection' | 'region' | 'marker' | 'waveform' | 'playhead-drag' | 'selection-resize-start' | 'selection-resize-end' | null>(null)
const lastMouseXRef = useRef<number>(0)
```

---

## 🎨 **WAVEFORM RENDERING SYSTEM**

### **1. Critical Calculation Variables**
```typescript
// Calculate grid
const secondsPerBeat = 60 / bpm
const stepDuration = secondsPerBeat / (gridDivision / 4)
const totalDuration = duration
const effectiveDuration = displayDuration > 0 ? displayDuration : totalDuration // Use display duration if set
```

### **2. The drawWaveform Function (CRITICAL)**
```typescript
const drawWaveform = useCallback(() => {
  console.log('🔍 DRAW WAVEFORM CALLED - zoom:', zoom, 'verticalZoom:', verticalZoom)
  const canvas = canvasRef.current
  if (!canvas || !waveformData.length) return
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  const rect = canvas.getBoundingClientRect()
  
  // Set canvas dimensions (don't resize on every draw)
  if (canvas.width !== rect.width * window.devicePixelRatio || canvas.height !== rect.height * window.devicePixelRatio) {
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
  }
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // Scale for device pixel ratio
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
  
  // Draw background
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, rect.width, rect.height)
  
  // Calculate effective width for zoomed coordinates (inverted zoom logic)
  const effectiveWidth = rect.width * zoom
  
  // Use effective duration for display calculations
  const displayDuration = effectiveDuration
  
  // ... rest of drawing logic
}, [waveformData, duration, totalDuration, effectiveDuration, displayDuration, showGrid, showWaveform, gridLines, 
    selectionStart, selectionEnd, waveSelectionStart, waveSelectionEnd, playheadPosition, currentTime, isPlaying, markers, regions, zoom, verticalZoom, waveformOffset, volume])
```

### **3. Critical useEffect Hooks for Rendering**
```typescript
// Redraw when audio loads or when markers/regions/grid changes
useEffect(() => {
  console.log('🔍 REDRAW EFFECT TRIGGERED - waveformData:', waveformData.length, 'markers:', markers.length, 'regions:', regions.length, 'gridLines:', gridLines.length, 'markedBars:', markedBars.length, 'markedSubBars:', markedSubBars.length, 'duplicateWave:', !!duplicateWave)
  if (waveformData.length > 0) {
    drawWaveform()
  }
}, [waveformData, markers, regions, gridLines, markedBars, markedSubBars, duplicateWave, drawWaveform])

// Force redraw during playback to update playhead position
useEffect(() => {
  if (isPlaying && waveformData.length > 0) {
    const interval = setInterval(() => {
      console.log('🔍 FORCE REDRAW - currentTime:', currentTime)
      drawWaveform()
    }, 16) // ~60fps for smooth playhead movement
    
    return () => clearInterval(interval)
  }
}, [isPlaying, waveformData.length, currentTime, drawWaveform])

// Redraw when currentTime changes during playback
useEffect(() => {
  if (isPlaying && waveformData.length > 0) {
    console.log('🔍 CURRENT TIME CHANGED - redrawing playhead at:', currentTime)
    drawWaveform()
  }
}, [currentTime, isPlaying, waveformData.length, drawWaveform])

// Redraw when waveform offset changes
useEffect(() => {
  if (waveformData.length > 0) {
    console.log('🔍 WAVEFORM OFFSET CHANGED - redrawing with offset:', waveformOffset)
    drawWaveform()
  }
}, [waveformOffset, waveformData.length, drawWaveform])
```

---

## 🎵 **AUDIO LOADING SYSTEM**

### **1. Audio File Loading Function**
```typescript
const loadAudioFile = useCallback(async (file: File) => {
  setIsLoading(true)
  try {
    const url = URL.createObjectURL(file)
    setAudioUrl(url)
    setAudioFile(file)
    
    // Load waveform
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const arrayBuffer = await file.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    
    const channelData = audioBuffer.getChannelData(0)
    const sampleRate = audioBuffer.sampleRate
    const duration = audioBuffer.duration
    
    setDuration(duration)
    setDisplayDuration(duration) // Initialize display duration to match audio duration
    
    // Generate waveform data
    const numPoints = Math.max(2000, Math.floor(duration * 50))
    const samplesPerPoint = Math.floor(channelData.length / numPoints)
    const waveform: WaveformPoint[] = []
    
    for (let i = 0; i < numPoints; i++) {
      const start = i * samplesPerPoint
      const end = Math.min(start + samplesPerPoint, channelData.length)
      
      let rms = 0
      let peak = 0
      let sampleCount = 0
      
      for (let j = start; j < end; j++) {
        const sample = Math.abs(channelData[j])
        rms += sample * sample
        peak = Math.max(peak, sample)
        sampleCount++
      }
      
      rms = Math.sqrt(rms / sampleCount)
      const amplitude = (rms * 0.7 + peak * 0.3)
      const x = (i / numPoints) * duration
      const y = amplitude * verticalZoom
      
      waveform.push({ x, y })
    }
    
    setWaveformData(waveform)
    setIsLoading(false)
  } catch (error) {
    console.error('Error loading audio file:', error)
    setIsLoading(false)
  }
}, [verticalZoom])
```

---

## 🖱️ **INTERACTION SYSTEM**

### **1. Mouse Event Handlers**
```typescript
const handleMouseDown = (e: React.MouseEvent) => {
  const canvas = canvasRef.current
  if (!canvas) return
  
  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  
  // Store initial mouse position for drag calculations
  lastMouseXRef.current = e.clientX
  
  // Calculate time based on mouse position and canvas dimensions
  const time = (x / rect.width) * displayDuration
  
  // Calculate current playhead position
  const playheadTime = isPlaying ? currentTime : playheadPosition
  const playheadX = displayDuration > 0 ? (playheadTime / displayDuration) * rect.width : 0
  
  // Check if click is near the playhead (within 10 pixels)
  const clickDistanceFromPlayhead = Math.abs(x - playheadX)
  const isClickingOnPlayhead = clickDistanceFromPlayhead <= 10
  
  // ... rest of mouse handling logic
}

const handleMouseMove = (e: React.MouseEvent) => {
  // ... mouse move logic for dragging
}

const handleMouseUp = () => {
  // ... mouse up logic to end dragging
}
```

---

## 🎛️ **CANVAS JSX STRUCTURE**

### **1. Canvas Container**
```typescript
{/* Waveform Canvas */}
<div className="flex-1 relative bg-[#141414] overflow-hidden">
  {/* Drag Overlay */}
  {isDragOver && (
    <div className="absolute inset-0 bg-blue-600/20 border-4 border-dashed border-blue-400 z-50 flex items-center justify-center">
      <div className="text-center text-white bg-black/50 rounded-lg p-8">
        <Music className="w-16 h-16 mx-auto mb-4 text-blue-400" />
        <p className="text-xl font-bold mb-2">Drop Audio File</p>
        <p className="text-sm">Release to load your audio file</p>
      </div>
    </div>
  )}
  
  {isLoading ? (
    <div className="flex items-center justify-center h-full">
      <div className="flex items-center gap-2 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        Loading audio...
      </div>
    </div>
  ) : !audioFile ? (
    <div className="flex items-center justify-center h-full">
      <div className={`text-center text-gray-400 transition-all duration-200 ${
        isDragOver ? 'scale-105 text-blue-400' : ''
      }`}>
        <Music className={`w-16 h-16 mx-auto mb-4 transition-all duration-200 ${
          isDragOver ? 'text-blue-400 scale-110' : ''
        }`} />
        <p className="text-lg">Load an audio file to start editing</p>
        <p className="text-sm">Supports MP3, WAV, and other audio formats</p>
        <p className="text-xs text-blue-400 mt-2">💡 Drag & drop audio files here to load them quickly</p>
      </div>
    </div>
  ) : (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${
        activeTool === 'drag' ? 'cursor-grab active:cursor-grabbing' : 
        activeTool === 'select' ? 'cursor-crosshair' :
        activeTool === 'marker' ? 'cursor-pointer' :
        activeTool === 'region' ? 'cursor-crosshair' :
        'cursor-crosshair'
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      // ... touch event handlers
    />
  )}
</div>
```

---

## ⚠️ **CRITICAL DEPENDENCIES TO MAINTAIN**

### **1. drawWaveform useCallback Dependencies**
**MUST include ALL of these:**
```typescript
}, [waveformData, duration, totalDuration, effectiveDuration, displayDuration, showGrid, showWaveform, gridLines, 
    selectionStart, selectionEnd, waveSelectionStart, waveSelectionEnd, playheadPosition, currentTime, isPlaying, markers, regions, zoom, verticalZoom, waveformOffset, volume])
```

### **2. useEffect Dependencies**
**MUST include drawWaveform in any useEffect that calls it:**
```typescript
}, [waveformData, markers, regions, gridLines, markedBars, markedSubBars, duplicateWave, drawWaveform])
```

### **3. Key Variables That Affect Rendering**
- `effectiveDuration` and `displayDuration` (for position calculations)
- `zoom` and `verticalZoom` (for scaling)
- `waveformOffset` (for horizontal positioning)
- `currentTime` and `playheadPosition` (for playhead display)
- `selectionStart/End` and `waveSelectionStart/End` (for selections)
- `markers` and `regions` (for visual elements)
- `gridLines` (for grid display)

---

## 🔧 **TROUBLESHOOTING GUIDE**

### **Common Issues and Solutions:**

#### **1. Waveform Not Visible**
- **Check:** `drawWaveform` dependencies include `effectiveDuration` and `displayDuration`
- **Check:** `useEffect` dependencies include `drawWaveform`
- **Check:** Canvas has proper dimensions and styling
- **Check:** `waveformData.length > 0` before drawing

#### **2. Infinite Re-renders**
- **Check:** No circular dependencies in useEffect hooks
- **Check:** `drawWaveform` dependencies don't include functions that change on every render
- **Check:** State updates don't trigger unnecessary re-renders

#### **3. Playhead Not Moving**
- **Check:** `currentTime` state is updating during playback
- **Check:** Playback useEffect is running at 60fps
- **Check:** `drawWaveform` is called when `currentTime` changes

#### **4. Grid Not Displaying**
- **Check:** `gridLines` array is populated
- **Check:** `showGrid` is true
- **Check:** Grid calculation uses correct `bpm` and `gridDivision`

#### **5. Mouse Interactions Not Working**
- **Check:** Canvas event handlers are properly attached
- **Check:** Mouse position calculations use correct canvas dimensions
- **Check:** Drag state management is working correctly

---

## 📋 **RECONSTRUCTION CHECKLIST**

When reconstructing the wave window, ensure you have:

### **✅ Core Components**
- [ ] All required interfaces defined
- [ ] All state variables declared
- [ ] All refs created
- [ ] Canvas element with proper styling
- [ ] Event handlers attached

### **✅ Rendering System**
- [ ] `drawWaveform` function with ALL dependencies
- [ ] All useEffect hooks for triggering redraws
- [ ] Proper canvas dimension handling
- [ ] Device pixel ratio scaling

### **✅ Audio System**
- [ ] Audio file loading function
- [ ] Waveform data generation
- [ ] Audio playback controls
- [ ] Audio context management

### **✅ Interaction System**
- [ ] Mouse event handlers
- [ ] Touch event handlers
- [ ] Drag and drop functionality
- [ ] Selection tools

### **✅ Visual Elements**
- [ ] Grid rendering
- [ ] Playhead display
- [ ] Selection highlighting
- [ ] Markers and regions
- [ ] Waveform visualization

### **✅ State Management**
- [ ] Proper state updates
- [ ] No circular dependencies
- [ ] Efficient re-rendering
- [ ] History management

---

## 🎯 **KEY PRINCIPLES**

1. **Always include ALL dependencies** in `drawWaveform` useCallback
2. **Always include `drawWaveform`** in useEffect dependencies that call it
3. **Use device pixel ratio** for crisp rendering on high-DPI displays
4. **Handle canvas dimensions** properly to avoid rendering issues
5. **Maintain 60fps** for smooth playhead movement
6. **Use proper state management** to avoid infinite loops
7. **Test all interactions** after reconstruction

This guide should provide everything needed to reconstruct the wave window if it gets corrupted. The key is maintaining the exact dependency relationships and state management patterns that make the system work correctly. 