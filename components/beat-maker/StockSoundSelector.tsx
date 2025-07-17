import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Piano, Music, Drum, Guitar, Mic, Volume2, Play, Square, Guitar as Bass } from 'lucide-react'

interface StockSound {
  id: string
  name: string
  category: string
  icon: React.ReactNode
  color: string
  description: string
  previewUrl?: string
}

interface StockSoundSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelectSound: (sound: StockSound) => void
  trackType?: string
}

const STOCK_SOUNDS: StockSound[] = [
  // Piano sounds
  {
    id: 'piano-grand',
    name: 'Grand Piano',
    category: 'Piano',
    icon: <Piano className="w-4 h-4"/>,
    color: 'bg-yellow-500',
    description: 'Classic grand piano sound'
  },
  {
    id: 'piano-upright',
    name: 'Upright Piano',
    category: 'Piano',
    icon: <Piano className="w-4 h-4"/>,
    color: 'bg-yellow-600',
    description: 'Warm upright piano tone'
  },
  {
    id: 'piano-electric',
    name: 'Electric Piano',
    category: 'Piano',
    icon: <Piano className="w-4 h-4"/>,
    color: 'bg-yellow-400',
    description: 'Rhodes-style electric piano'
  },
  
  // Synth sounds
  {
    id: 'synth-lead',
    name: 'Lead Synth',
    category: 'Synth',
    icon: <Music className="w-4 h-4"/>,
    color: 'bg-purple-500',
    description: 'Bright lead synthesizer'
  },
  {
    id: 'synth-pad',
    name: 'Pad Synth',
    category: 'Synth',
    icon: <Music className="w-4 h-4"/>,
    color: 'bg-purple-600',
    description: 'Atmospheric pad sound'
  },
  {
    id: 'synth-bass',
    name: 'Bass Synth',
    category: 'Synth',
    icon: <Bass className="w-4 h-4"/>,
    color: 'bg-purple-700',
    description: 'Deep bass synthesizer'
  },
  
  // Drum sounds
  {
    id: 'drum-kick',
    name: 'Kick Drum',
    category: 'Drums',
    icon: <Drum className="w-4 h-4"/>,
    color: 'bg-red-500',
    description: 'Punchy kick drum'
  },
  {
    id: 'drum-snare',
    name: 'Snare Drum',
    category: 'Drums',
    icon: <Drum className="w-4 h-4"/>,
    color: 'bg-blue-500',
    description: 'Crisp snare drum'
  },
  {
    id: 'drum-hihat',
    name: 'Hi-Hat',
    category: 'Drums',
    icon: <Drum className="w-4 h-4"/>,
    color: 'bg-green-500',
    description: 'Bright hi-hat cymbal'
  },
  {
    id: 'drum-tom',
    name: 'Tom Tom',
    category: 'Drums',
    icon: <Drum className="w-4 h-4"/>,
    color: 'bg-orange-500',
    description: 'Warm tom tom'
  },
  
  // Bass sounds
  {
    id: 'bass-electric',
    name: 'Electric Bass',
    category: 'Bass',
    icon: <Bass className="w-4 h-4"/>,
    color: 'bg-indigo-500',
    description: 'Classic electric bass'
  },
  {
    id: 'bass-acoustic',
    name: 'Acoustic Bass',
    category: 'Bass',
    icon: <Bass className="w-4 h-4"/>,
    color: 'bg-indigo-600',
    description: 'Warm acoustic bass'
  },
  {
    id: 'bass-synth',
    name: 'Synth Bass',
    category: 'Bass',
    icon: <Bass className="w-4 h-4"/>,
    color: 'bg-indigo-700',
    description: 'Electronic bass synth'
  },
  
  // Guitar sounds
  {
    id: 'guitar-electric',
    name: 'Electric Guitar',
    category: 'Guitar',
    icon: <Guitar className="w-4 h-4"/>,
    color: 'bg-teal-500',
    description: 'Rock electric guitar'
  },
  {
    id: 'guitar-acoustic',
    name: 'Acoustic Guitar',
    category: 'Guitar',
    icon: <Guitar className="w-4 h-4"/>,
    color: 'bg-teal-600',
    description: 'Fingerpicked acoustic'
  },
  
  // Vocal sounds
  {
    id: 'vocal-choir',
    name: 'Choir',
    category: 'Vocals',
    icon: <Mic className="w-4 h-4"/>,
    color: 'bg-pink-500',
    description: 'Ethereal choir voices'
  },
  {
    id: 'vocal-lead',
    name: 'Lead Vocal',
    category: 'Vocals',
    icon: <Mic className="w-4 h-4"/>,
    color: 'bg-pink-600',
    description: 'Clear lead vocal'
  }
]

const CATEGORIES = ['All', 'Piano', 'Synth', 'Drums', 'Bass', 'Guitar', 'Vocals']

export function StockSoundSelector({ isOpen, onClose, onSelectSound, trackType }: StockSoundSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [previewingSound, setPreviewingSound] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  if (!isOpen) return null

  const filteredSounds = selectedCategory === 'All' 
    ? STOCK_SOUNDS 
    : STOCK_SOUNDS.filter(sound => sound.category === selectedCategory)

  const handlePreview = (sound: StockSound) => {
    setPreviewingSound(sound.id)
    setIsPlaying(true)
    
    // Simulate preview playback
    setTimeout(() => {
      setIsPlaying(false)
      setPreviewingSound(null)
    }, 2000)
  }

  const handleSelectSound = (sound: StockSound) => {
    onSelectSound(sound)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <Card className="w-[90vw] h-[80vh] bg-[#141414] border border-gray-700 rounded-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">            <Music className="w-5 h-5"/>             Stock Sounds
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Close
            </Button>
          </div>
          
          {/* Category Filter */}
          <div className="flex items-center gap-2 mt-4">
            <span className="text-xs text-gray-300">Category:</span>
            <div className="flex gap-1">              {CATEGORIES.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="text-xs"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 w-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredSounds.map((sound) => (
              <div
                key={sound.id}
                className="p-4 bg-[#1] rounded-lg border border-gray-600 hover:border-gray-500 transition-colors cursor-pointer"
                onClick={() => handleSelectSound(sound)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-8 h-8 rounded-full ${sound.color} flex items-center justify-center`}>
                    {sound.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-medium text-sm">{sound.name}</h3>
                    <p className="text-gray-400">{sound.category}</p>
                  </div>
                </div>
                
                <p className="text-gray-300 text-xs mb-3">{sound.description}</p>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePreview(sound)
                    }}
                    className="text-xs flex-1"
                    disabled={isPlaying}
                  >
                    {previewingSound === sound.id && isPlaying ? (
                      <>
                        <Square className="w-3 h-3 mr-1"/> Playing...
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 mr-1"/> Preview
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="default"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelectSound(sound)
                    }}
                    className="text-xs"
                  >
                    Select
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          {filteredSounds.length === 0 && (
            <div className="text-center py-8">
              <Music className="w-12 h-12 text-gray-500 mx-auto mb-4"/>
              <p className="text-gray-400">No sounds found in this category</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 