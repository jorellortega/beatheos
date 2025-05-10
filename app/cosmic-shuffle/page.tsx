"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Shuffle, Plus, Save, Wand2 } from 'lucide-react'
import { useToast } from "@/components/ui/use-toast"
import { BeatPlayer } from "@/components/BeatPlayer"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Mock data for beats and playlists
const mockBeats = [
  { id: 1, title: "Cosmic Rhythm", artist: "StarDust", duration: "3:45", genre: ["Hip Hop", "Trap"], bpm: 140, key: "C Minor", mood: "Dark", tags: ["808", "Atmospheric"] },
  { id: 2, title: "Nebula Groove", artist: "GalaxyBeats", duration: "4:12", genre: ["R&B", "Soul"], bpm: 95, key: "G Major", mood: "Smooth", tags: ["Melodic", "Soulful"] },
  { id: 3, title: "Astral Waves", artist: "MoonWalker", duration: "3:58", genre: ["Lo-Fi", "Chill"], bpm: 85, key: "D Minor", mood: "Chill", tags: ["Ambient", "Relaxing"] },
  { id: 4, title: "Quantum Beat", artist: "NovaSonic", duration: "3:30", genre: ["Electronic", "Trap"], bpm: 150, key: "F Minor", mood: "Energetic", tags: ["Heavy", "Bass"] },
  { id: 5, title: "Stellar Pulse", artist: "CosmicDJ", duration: "4:05", genre: ["Pop", "Dance"], bpm: 128, key: "A Major", mood: "Happy", tags: ["Upbeat", "Catchy"] },
]

const genres = ["Hip Hop", "Trap", "R&B", "Soul", "Lo-Fi", "Chill", "Electronic", "Pop", "Dance"]
const moods = ["Dark", "Smooth", "Chill", "Energetic", "Happy", "Melancholic", "Aggressive", "Peaceful"]
const keys = ["C Major", "C Minor", "G Major", "G Minor", "D Major", "D Minor", "A Major", "A Minor", "F Major", "F Minor"]
const popularTags = ["808", "Melodic", "Atmospheric", "Bass", "Ambient", "Soulful", "Upbeat", "Catchy"]

interface Playlist {
  id: number;
  name: string;
  beats: number[];
}

interface ShufflePreferences {
  name: string;
  genres: string[];
  moods: string[];
  tempoRange: number[];
  keys: string[];
  tags: string[];
}

export default function CosmicShufflePage() {
  const [currentBeat, setCurrentBeat] = useState(mockBeats[0])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [selectedMoods, setSelectedMoods] = useState<string[]>([])
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tempoRange, setTempoRange] = useState([80, 160])
  const [shufflePreferences, setShufflePreferences] = useState<ShufflePreferences[]>([])
  const [newPreferenceName, setNewPreferenceName] = useState("")
  const { toast } = useToast()

  const shuffleBeat = () => {
    // Filter beats based on selected preferences
    let filteredBeats = mockBeats.filter(beat => {
      const matchesGenre = selectedGenres.length === 0 || beat.genre.some(g => selectedGenres.includes(g))
      const matchesMood = selectedMoods.length === 0 || selectedMoods.includes(beat.mood)
      const matchesTempo = beat.bpm >= tempoRange[0] && beat.bpm <= tempoRange[1]
      const matchesKey = selectedKeys.length === 0 || selectedKeys.includes(beat.key)
      const matchesTags = selectedTags.length === 0 || beat.tags.some(t => selectedTags.includes(t))
      
      return matchesGenre && matchesMood && matchesTempo && matchesKey && matchesTags
    })

    if (filteredBeats.length === 0) {
      toast({
        title: "No Matching Beats",
        description: "Try adjusting your filters to find more beats.",
        variant: "destructive"
      })
      return
    }

    const randomBeat = filteredBeats[Math.floor(Math.random() * filteredBeats.length)]
    setCurrentBeat(randomBeat)
    toast({
      title: "New Beat Shuffled",
      description: `Now playing: ${randomBeat.title} by ${randomBeat.artist}`,
    })
  }

  const savePreferences = () => {
    if (newPreferenceName.trim()) {
      const newPreference: ShufflePreferences = {
        name: newPreferenceName,
        genres: selectedGenres,
        moods: selectedMoods,
        tempoRange: tempoRange,
        keys: selectedKeys,
        tags: selectedTags
      }
      setShufflePreferences([...shufflePreferences, newPreference])
      setNewPreferenceName("")
      toast({
        title: "Preferences Saved",
        description: `Your preferences have been saved as "${newPreferenceName}".`
      })
    }
  }

  const loadPreferences = (pref: ShufflePreferences) => {
    setSelectedGenres(pref.genres)
    setSelectedMoods(pref.moods)
    setTempoRange(pref.tempoRange)
    setSelectedKeys(pref.keys)
    setSelectedTags(pref.tags)
    toast({
      title: "Preferences Loaded",
      description: `Loaded preferences: "${pref.name}"`
    })
  }

  const createPlaylist = () => {
    if (newPlaylistName.trim()) {
      setPlaylists([...playlists, { id: Date.now(), name: newPlaylistName, beats: [] }])
      setNewPlaylistName("")
      toast({
        title: "Playlist Created",
        description: `New playlist "${newPlaylistName}" has been created.`,
      })
    }
  }

  const addToPlaylist = (playlistId: number) => {
    setPlaylists(playlists.map(playlist => 
      playlist.id === playlistId
        ? { ...playlist, beats: [...playlist.beats, currentBeat.id] }
        : playlist
    ))
    toast({
      title: "Beat Added",
      description: `"${currentBeat.title}" has been added to your playlist.`,
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 font-display tracking-wider neon-text-green">Cosmic Shuffle</h1>
      <p className="text-xl mb-8 text-gray-300">Let the universe guide your musical journey through randomly selected beats.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-secondary border-primary neon-border-green">
          <CardHeader>
            <CardTitle className="text-white">Current Cosmic Vibration</CardTitle>
          </CardHeader>
          <CardContent>
            <BeatPlayer
              beatId={currentBeat.id.toString()}
              beatUrl="/placeholder-audio.mp3"
              beatTitle={currentBeat.title}
            />
            <div className="mt-4 mb-4">
              <div className="flex flex-wrap gap-2 mb-2">
                {currentBeat.genre.map((g) => (
                  <Badge key={g} variant="outline">{g}</Badge>
                ))}
              </div>
              <div className="text-sm text-gray-300">
                <span className="mr-4">BPM: {currentBeat.bpm}</span>
                <span className="mr-4">Key: {currentBeat.key}</span>
                <span>Mood: {currentBeat.mood}</span>
              </div>
            </div>
            <Button 
              className="w-full py-8 text-2xl gradient-button text-black font-medium hover:text-white" 
              onClick={shuffleBeat}
            >
              <Shuffle className="h-8 w-8 mr-2" />
              Shuffle the Cosmos
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-secondary border-primary neon-border-green">
          <CardHeader>
            <CardTitle className="text-white">Advanced Shuffle Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="filters" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="filters" className="w-1/2">Filters</TabsTrigger>
                <TabsTrigger value="presets" className="w-1/2">Presets</TabsTrigger>
              </TabsList>
              <TabsContent value="filters" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-white mb-2">Genres</Label>
                    <ScrollArea className="h-24 rounded-md border p-2">
                      {genres.map((genre) => (
                        <div key={genre} className="flex items-center space-x-2 py-1">
                          <Checkbox
                            checked={selectedGenres.includes(genre)}
                            onCheckedChange={(checked) => {
                              setSelectedGenres(
                                checked
                                  ? [...selectedGenres, genre]
                                  : selectedGenres.filter((g) => g !== genre)
                              )
                            }}
                          />
                          <label className="text-sm text-gray-300">{genre}</label>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>

                  <div>
                    <Label className="text-white mb-2">Moods</Label>
                    <ScrollArea className="h-24 rounded-md border p-2">
                      {moods.map((mood) => (
                        <div key={mood} className="flex items-center space-x-2 py-1">
                          <Checkbox
                            checked={selectedMoods.includes(mood)}
                            onCheckedChange={(checked) => {
                              setSelectedMoods(
                                checked
                                  ? [...selectedMoods, mood]
                                  : selectedMoods.filter((m) => m !== mood)
                              )
                            }}
                          />
                          <label className="text-sm text-gray-300">{mood}</label>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>

                  <div>
                    <Label className="text-white">Tempo Range (BPM)</Label>
                    <Slider
                      min={60}
                      max={200}
                      step={1}
                      value={tempoRange}
                      onValueChange={setTempoRange}
                      className="mt-2"
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-gray-300">{tempoRange[0]} BPM</span>
                      <span className="text-gray-300">{tempoRange[1]} BPM</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-white mb-2">Keys</Label>
                    <ScrollArea className="h-24 rounded-md border p-2">
                      {keys.map((key) => (
                        <div key={key} className="flex items-center space-x-2 py-1">
                          <Checkbox
                            checked={selectedKeys.includes(key)}
                            onCheckedChange={(checked) => {
                              setSelectedKeys(
                                checked
                                  ? [...selectedKeys, key]
                                  : selectedKeys.filter((k) => k !== key)
                              )
                            }}
                          />
                          <label className="text-sm text-gray-300">{key}</label>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>

                  <div>
                    <Label className="text-white mb-2">Popular Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {popularTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant={selectedTags.includes(tag) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedTags(
                              selectedTags.includes(tag)
                                ? selectedTags.filter((t) => t !== tag)
                                : [...selectedTags, tag]
                            )
                          }}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Input
                      placeholder="Save as preset..."
                      value={newPreferenceName}
                      onChange={(e) => setNewPreferenceName(e.target.value)}
                      className="bg-secondary text-white"
                    />
                    <Button onClick={savePreferences}>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="presets">
                <ScrollArea className="h-[400px]">
                  {shufflePreferences.map((pref) => (
                    <div key={pref.name} className="flex justify-between items-center mb-2 p-2 bg-gray-700 rounded">
                      <div>
                        <h4 className="text-white font-medium">{pref.name}</h4>
                        <p className="text-sm text-gray-300">
                          {pref.genres.length} genres, {pref.moods.length} moods
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => loadPreferences(pref)}>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Load
                      </Button>
                    </div>
                  ))}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 bg-secondary border-primary neon-border-green">
          <CardHeader>
            <CardTitle className="text-white">Your Cosmic Playlists</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2 mb-4">
              <Input
                placeholder="New playlist name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="bg-secondary text-white"
              />
              <Button onClick={createPlaylist}>
                <Plus className="h-4 w-4 mr-2" />
                Create
              </Button>
            </div>
            <ScrollArea className="h-60">
              {playlists.map(playlist => (
                <div key={playlist.id} className="flex justify-between items-center mb-2 p-2 bg-gray-700 rounded">
                  <span className="text-white">{playlist.name} ({playlist.beats.length} beats)</span>
                  <Button variant="outline" onClick={() => addToPlaylist(playlist.id)}>
                    Add Current Beat
                  </Button>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

