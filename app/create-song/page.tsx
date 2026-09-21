'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SimpleLyricsSession } from '@/lib/lyrics-simple-service'
import { ELEVENLABS_DEFAULT_MUSIC_LENGTH_MS } from '@/lib/elevenlabs-music-helpers'
import { Loader2, Music2, Sparkles, Download, Search } from 'lucide-react'

type GeneratedSong = {
  id: string | null
  title: string
  audio_url: string
  prompt?: string | null
  instrumental?: boolean
  format?: string
  created_at?: string
  elevenlabs_song_id?: string | null
}

const LENGTH_OPTIONS = [
  { label: '1 min', value: '60000' },
  { label: '2 min', value: String(ELEVENLABS_DEFAULT_MUSIC_LENGTH_MS) },
  { label: '3 min', value: '180000' },
  { label: '4 min', value: '240000' },
]

export default function CreateSongPage() {
  const { user, getAccessToken } = useAuth()
  const { toast } = useToast()

  const [title, setTitle] = useState('')
  const [styleNotes, setStyleNotes] = useState('')
  const [lyricsText, setLyricsText] = useState('')
  const [instrumental, setInstrumental] = useState(false)
  const [musicLengthMs, setMusicLengthMs] = useState(String(ELEVENLABS_DEFAULT_MUSIC_LENGTH_MS))
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<GeneratedSong | null>(null)

  const [lyricsList, setLyricsList] = useState<SimpleLyricsSession[]>([])
  const [lyricsLoading, setLyricsLoading] = useState(false)
  const [lyricsSearch, setLyricsSearch] = useState('')
  const [selectedLyricsId, setSelectedLyricsId] = useState<string>('')

  const [songs, setSongs] = useState<GeneratedSong[]>([])
  const [songsLoading, setSongsLoading] = useState(false)

  const filteredLyrics = useMemo(() => {
    const q = lyricsSearch.trim().toLowerCase()
    const list = lyricsList.filter((item) => (item.lyrics_content_type || 'lyrics') === 'lyrics')
    if (!q) return list
    return list.filter((item) => {
      const haystack = [
        item.lyrics_title,
        item.name,
        item.lyrics_genre,
        item.lyrics_mood,
        item.lyrics,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [lyricsList, lyricsSearch])

  const selectedLyrics = useMemo(
    () => lyricsList.find((item) => item.id === selectedLyricsId) || null,
    [lyricsList, selectedLyricsId]
  )

  useEffect(() => {
    if (!user) return
    void loadLyrics()
    void loadSongs()
  }, [user])

  async function authHeaders() {
    const token = await getAccessToken()
    if (!token) throw new Error('Missing auth token')
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }

  async function loadLyrics() {
    try {
      setLyricsLoading(true)
      const headers = await authHeaders()
      const res = await fetch('/api/lyrics-ai/lyrics', { headers })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load lyrics')
      setLyricsList(json.lyrics || [])
    } catch (error) {
      toast({
        title: 'Could not load lyrics',
        description: error instanceof Error ? error.message : 'Try again from your lyrics library',
        variant: 'destructive',
      })
    } finally {
      setLyricsLoading(false)
    }
  }

  async function loadSongs() {
    try {
      setSongsLoading(true)
      const headers = await authHeaders()
      const res = await fetch('/api/songs/list', { headers })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load songs')
      setSongs(
        (json.songs || []).map((song: any) => ({
          id: song.id,
          title: song.title,
          audio_url: song.audio_url,
          prompt: song.prompt,
          instrumental: song.instrumental,
          format: song.format,
          created_at: song.created_at,
          elevenlabs_song_id: song.elevenlabs_song_id,
        }))
      )
    } catch {
      // Migration may not be applied yet
      setSongs([])
    } finally {
      setSongsLoading(false)
    }
  }

  function applyLyrics(session: SimpleLyricsSession) {
    setSelectedLyricsId(session.id)
    setLyricsText(session.lyrics || '')
    if (!title.trim()) {
      setTitle(session.lyrics_title || session.name || '')
    }
    if (!styleNotes.trim()) {
      const bits = [session.lyrics_genre, session.lyrics_mood, session.lyrics_description]
        .filter(Boolean)
        .join(', ')
      if (bits) setStyleNotes(bits)
    }
  }

  function clearSelectedLyrics() {
    setSelectedLyricsId('')
  }

  async function handleGenerate() {
    if (!user) return
    if (!title.trim()) {
      toast({ title: 'Add a song title', variant: 'destructive' })
      return
    }
    if (!instrumental && !lyricsText.trim() && !selectedLyricsId) {
      toast({
        title: 'Add lyrics',
        description: 'Paste lyrics, pick from your library, or enable Instrumental.',
        variant: 'destructive',
      })
      return
    }

    try {
      setGenerating(true)
      const headers = await authHeaders()
      const res = await fetch('/api/songs/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: title.trim(),
          styleNotes: styleNotes.trim(),
          lyricsText: lyricsText.trim(),
          lyricsSessionId: selectedLyricsId || undefined,
          instrumental,
          musicLengthMs: Number(musicLengthMs),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Song generation failed')
      }

      const song: GeneratedSong = {
        id: json.id,
        title: json.title,
        audio_url: json.audioUrl,
        prompt: json.prompt,
        instrumental: json.instrumental,
        format: json.format,
        created_at: new Date().toISOString(),
        elevenlabs_song_id: json.elevenlabsSongId,
      }
      setResult(song)
      setSongs((prev) => [song, ...prev.filter((s) => s.audio_url !== song.audio_url)])
      toast({
        title: 'Song ready',
        description: instrumental ? 'Instrumental generated.' : 'Song generated.',
      })
    } catch (error) {
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#141414] text-white flex items-center justify-center px-4">
        <Card className="bg-black border-zinc-800 max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-primary">Create Song</CardTitle>
            <CardDescription>Log in to generate songs.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full gradient-button text-black">
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
              <Music2 className="h-8 w-8" />
              Create Song
            </h1>
            <p className="text-gray-400 mt-1">
              Write a style prompt, pull lyrics from your{' '}
              <Link href="/lyrics-ai" className="text-primary hover:underline">
                lyrics library
              </Link>
              , and generate a song.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card className="bg-black border-zinc-800 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Use existing lyrics</CardTitle>
              <CardDescription>Pick a piece from your lyrics library.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  value={lyricsSearch}
                  onChange={(e) => setLyricsSearch(e.target.value)}
                  placeholder="Search lyrics…"
                  className="pl-9 bg-zinc-950 border-zinc-700"
                />
              </div>
              <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
                {lyricsLoading ? (
                  <div className="flex items-center justify-center py-10 text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Loading…
                  </div>
                ) : filteredLyrics.length === 0 ? (
                  <p className="text-sm text-gray-500 py-6 text-center">
                    No lyrics found.{' '}
                    <Link href="/lyrics-ai" className="text-primary hover:underline">
                      Create some in your lyrics library
                    </Link>
                    .
                  </p>
                ) : (
                  filteredLyrics.map((item) => {
                    const active = item.id === selectedLyricsId
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => applyLyrics(item)}
                        className={`w-full text-left rounded-lg border p-3 transition-colors ${
                          active
                            ? 'border-primary bg-primary/10'
                            : 'border-zinc-800 hover:border-zinc-600 bg-zinc-950'
                        }`}
                      >
                        <div className="font-medium truncate">
                          {item.lyrics_title || item.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          {[item.lyrics_genre, item.lyrics_mood].filter(Boolean).join(' · ') ||
                            'No genre/mood'}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
              {selectedLyrics && (
                <Button variant="ghost" size="sm" onClick={clearSelectedLyrics} className="w-full">
                  Clear selection
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="bg-black border-zinc-800 lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Song prompt
              </CardTitle>
              <CardDescription>
                Turn off Instrumental to include vocals that sing your lyrics.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="song-title">Title</Label>
                <Input
                  id="song-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Song title"
                  className="bg-zinc-950 border-zinc-700"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="style-notes">Style / production prompt</Label>
                <Textarea
                  id="style-notes"
                  value={styleNotes}
                  onChange={(e) => setStyleNotes(e.target.value)}
                  placeholder="e.g. dark trap, slow 808s, emotional male vocals, cinematic chorus…"
                  rows={4}
                  className="bg-zinc-950 border-zinc-700"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="lyrics-text">Lyrics</Label>
                  {selectedLyrics && (
                    <span className="text-xs text-gray-500">
                      From: {selectedLyrics.lyrics_title || selectedLyrics.name}
                    </span>
                  )}
                </div>
                <Textarea
                  id="lyrics-text"
                  value={lyricsText}
                  onChange={(e) => setLyricsText(e.target.value)}
                  placeholder="Paste lyrics here, or pick from the left…"
                  rows={12}
                  disabled={instrumental}
                  className="bg-zinc-950 border-zinc-700 font-mono text-sm"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="instrumental"
                    checked={instrumental}
                    onCheckedChange={(checked) => setInstrumental(checked === true)}
                    className="mt-0.5"
                  />
                  <div>
                    <Label htmlFor="instrumental" className="cursor-pointer">
                      Instrumental only
                    </Label>
                    <p className="text-xs text-gray-500">
                      No vocals — beat and production only.
                    </p>
                  </div>
                </div>

                <div className="w-full sm:w-[160px] space-y-1">
                  <Label>Length</Label>
                  <Select value={musicLengthMs} onValueChange={setMusicLengthMs}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LENGTH_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full gradient-button text-black font-medium"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Music2 className="h-4 w-4 mr-2" />
                    Generate Song
                  </>
                )}
              </Button>

              {result && (
                <div className="rounded-lg border border-zinc-700 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{result.title}</div>
                      <div className="text-xs text-gray-500">
                        {result.instrumental ? 'Instrumental' : 'With vocals'} ·{' '}
                        {(result.format || 'mp3').toUpperCase()}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={result.audio_url} download={`${result.title || 'song'}.${result.format || 'mp3'}`}>
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </a>
                    </Button>
                  </div>
                  <audio controls src={result.audio_url} className="w-full" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-black border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg">Recent songs</CardTitle>
            <CardDescription>
              Your recently generated songs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {songsLoading ? (
              <div className="flex items-center text-gray-400 py-6">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading…
              </div>
            ) : songs.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No generated songs yet.</p>
            ) : (
              <div className="space-y-4">
                {songs.map((song) => (
                  <div
                    key={song.id || song.audio_url}
                    className="rounded-lg border border-zinc-800 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{song.title}</div>
                        <div className="text-xs text-gray-500">
                          {song.created_at
                            ? new Date(song.created_at).toLocaleString()
                            : 'Just now'}
                          {song.instrumental ? ' · Instrumental' : ''}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={song.audio_url} download>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                    <audio controls src={song.audio_url} className="w-full" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
