"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Upload, Download, Share2, Mic, Play, Pause, Trash2, Edit, Eye } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabaseClient"
import { usePlayer } from "@/contexts/PlayerContext"
import { Rnd } from 'react-rnd'

// DEBUG: Log Supabase client creation
console.debug('[DEBUG] Creating Supabase client in app/sessions/page.tsx');

interface Session {
  id: string
  name: string
  date: string
  duration: string
  stems: number
  collaborators: string[]
  status: "recording" | "completed" | "shared"
}

export default function SessionsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("my-sessions")
  const [sessions, setSessions] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ name: string; lyrics: string }>({ name: "", lyrics: "" })
  const [saving, setSaving] = useState(false)
  const [beatsBySession, setBeatsBySession] = useState<{ [sessionId: string]: any[] }>({})
  const [playingBeatId, setPlayingBeatId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { setCurrentBeat, setIsPlaying, currentBeat, isPlaying } = usePlayer();
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [editingLyricsId, setEditingLyricsId] = useState<string | null>(null)
  const [titleEditValue, setTitleEditValue] = useState("")
  const [lyricsEditValue, setLyricsEditValue] = useState("")
  const [openLyricsModalId, setOpenLyricsModalId] = useState<string | null>(null)
  const [modalLyricsValue, setModalLyricsValue] = useState("")
  const [modalSaving, setModalSaving] = useState(false)

  // Fetch sessions from Supabase
  useEffect(() => {
    if (!user) return
    supabase
      .from('sessions')
      .select('id, name, last_modified, beat_ids, lyrics')
      .eq('user_id', user.id)
      .order('last_modified', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast({ title: "Error", description: "Could not fetch sessions", variant: "destructive" })
        } else {
          setSessions(data || [])
        }
      })
  }, [user])

  // Fetch beats for each session
  useEffect(() => {
    async function fetchBeatsForSessions() {
      if (!sessions.length) return;
      const allBeatIds = sessions.flatMap(s => s.beat_ids || []);
      if (allBeatIds.length === 0) return;
      const { data: beats } = await supabase
        .from('beats')
        .select('id, title, producer_id, cover_art_url, mp3_url')
        .in('id', allBeatIds);
      const beatMap: { [id: string]: any } = {};
      (beats || []).forEach(beat => { beatMap[beat.id] = beat; });
      const sessionBeats: { [sessionId: string]: any[] } = {};
      sessions.forEach(session => {
        sessionBeats[session.id] = (session.beat_ids || []).map((id: string) => beatMap[id]).filter(Boolean);
      });
      setBeatsBySession(sessionBeats);
    }
    fetchBeatsForSessions();
  }, [sessions]);

  const handleEdit = (session: any) => {
    setEditingId(session.id)
    setEditForm({ name: session.name || "", lyrics: session.lyrics || "" })
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEditForm(f => ({ ...f, [name]: value }))
  }

  const handleSave = async (id: string) => {
    if (!user) return
    setSaving(true)
    const { error } = await supabase
      .from('sessions')
      .update({ name: editForm.name, lyrics: editForm.lyrics })
      .eq('id', id)
    setSaving(false)
    if (!error) {
      toast({ title: "Session Updated", description: "Session updated successfully." })
      setEditingId(null)
      // Refetch sessions after save
      const { data: newSessions } = await supabase
        .from('sessions')
        .select('id, name, last_modified, beat_ids, lyrics')
        .eq('user_id', user.id)
        .order('last_modified', { ascending: false });
      setSessions(newSessions || [])
    } else {
      toast({ title: "Error", description: "Failed to update session.", variant: "destructive" })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this session?")) return
    if (!user) return
    setSaving(true)
    const { data, error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id)
    console.log('Delete response:', { data, error });
    setSaving(false)
    if (!error) {
      toast({ title: "Session Deleted", description: "Session deleted successfully." })
      setEditingId(null)
      // Refetch sessions to ensure UI is up to date
      const { data: newSessions } = await supabase
        .from('sessions')
        .select('id, name, last_modified, beat_ids, lyrics')
        .eq('user_id', user.id)
        .order('last_modified', { ascending: false });
      setSessions(newSessions || [])
    } else {
      toast({ title: "Error", description: "Failed to delete session.", variant: "destructive" })
    }
  }

  const handleUploadSession = () => {
    // TODO: Implement session upload logic
    toast({
      title: "Session Upload",
      description: "Upload your session files (stems, project files, etc.)",
    })
  }

  const handleShareSession = (sessionId: string) => {
    // TODO: Implement session sharing logic
    toast({
      title: "Share Session",
      description: "Share this session with collaborators",
    })
  }

  const handlePlayPause = (beat: any) => {
    // Use the sitewide player
    if (currentBeat && currentBeat.id === beat.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentBeat({
        id: beat.id,
        title: beat.title,
        artist: beat.producer_id || '',
        audioUrl: beat.mp3_url,
        image: beat.cover_art_url,
        producers: [],
      });
      setIsPlaying(true);
    }
  };

  const handleEditTitle = (session: any) => {
    setEditingTitleId(session.id)
    setTitleEditValue(session.name || "")
  }

  const handleEditLyrics = (session: any) => {
    setEditingLyricsId(session.id)
    setLyricsEditValue(session.lyrics || "")
  }

  const handleSaveTitle = async (id: string) => {
    if (!user) return
    setSaving(true)
    const { error } = await supabase
      .from('sessions')
      .update({ name: titleEditValue })
      .eq('id', id)
    setSaving(false)
    if (!error) {
      toast({ title: "Session Updated", description: "Session title updated successfully." })
      setEditingTitleId(null)
      // Refetch sessions after save
      const { data: newSessions } = await supabase
        .from('sessions')
        .select('id, name, last_modified, beat_ids, lyrics')
        .eq('user_id', user.id)
        .order('last_modified', { ascending: false });
      setSessions(newSessions || [])
    } else {
      toast({ title: "Error", description: "Failed to update session.", variant: "destructive" })
    }
  }

  const handleSaveLyrics = async (id: string) => {
    if (!user) return
    setSaving(true)
    const { error } = await supabase
      .from('sessions')
      .update({ lyrics: lyricsEditValue })
      .eq('id', id)
    setSaving(false)
    if (!error) {
      toast({ title: "Session Updated", description: "Session lyrics updated successfully." })
      setEditingLyricsId(null)
      // Refetch sessions after save
      const { data: newSessions } = await supabase
        .from('sessions')
        .select('id, name, last_modified, beat_ids, lyrics')
        .eq('user_id', user.id)
        .order('last_modified', { ascending: false });
      setSessions(newSessions || [])
    } else {
      toast({ title: "Error", description: "Failed to update lyrics.", variant: "destructive" })
    }
  }

  const handleOpenLyricsModal = (session: any) => {
    setOpenLyricsModalId(session.id)
    setModalLyricsValue(session.lyrics || "")
  }

  const handleCloseLyricsModal = () => {
    setOpenLyricsModalId(null)
    setModalLyricsValue("")
  }

  const handleSaveLyricsModal = async (id: string) => {
    if (!user) return
    setModalSaving(true)
    const { error } = await supabase
      .from('sessions')
      .update({ lyrics: modalLyricsValue })
      .eq('id', id)
    setModalSaving(false)
    if (!error) {
      toast({ title: "Session Updated", description: "Session lyrics updated successfully." })
      setOpenLyricsModalId(null)
      // Refetch sessions after save
      const { data: newSessions } = await supabase
        .from('sessions')
        .select('id, name, last_modified, beat_ids, lyrics')
        .eq('user_id', user.id)
        .order('last_modified', { ascending: false });
      setSessions(newSessions || [])
    } else {
      toast({ title: "Error", description: "Failed to update lyrics.", variant: "destructive" })
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 font-display tracking-wider text-primary">Sessions</h1>
          <p className="text-xl text-gray-400">Manage and collaborate on your sessions</p>
        </div>
        <Button onClick={handleUploadSession} disabled className="opacity-50 cursor-not-allowed">
          <Upload className="h-4 w-4 mr-2" />
          Upload Session
        </Button>
      </div>

      <Tabs defaultValue="my-sessions" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full overflow-x-auto whitespace-nowrap gap-2 sm:grid sm:grid-cols-3 sm:gap-0">
          <TabsTrigger value="my-sessions">My Sessions</TabsTrigger>
          <TabsTrigger value="shared-sessions">Shared Sessions</TabsTrigger>
          <TabsTrigger value="collaborations">Collaborations</TabsTrigger>
        </TabsList>

        <TabsContent value="my-sessions" className="mt-6">
          <div className="grid grid-cols-1 gap-6">
            {sessions.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>No Sessions Found</CardTitle>
                  <CardDescription>You have not created any sessions yet.</CardDescription>
                </CardHeader>
              </Card>
            )}
            {sessions.map((session) => (
              <Card key={session.id} className="hover:border-primary transition-all p-3 sm:p-6">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
                    <div>
                      {editingTitleId === session.id ? (
                          <Input
                            name="name"
                          value={titleEditValue}
                          onChange={e => setTitleEditValue(e.target.value)}
                            className="mb-2"
                          autoFocus
                          onBlur={() => handleSaveTitle(session.id)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveTitle(session.id);
                            if (e.key === 'Escape') setEditingTitleId(null);
                          }}
                        />
                      ) : (
                        <CardTitle
                          className="relative group cursor-pointer"
                          onClick={() => handleEditTitle(session)}
                        >
                          {session.name}
                          <span className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pl-2 flex items-center">
                            <Edit className="h-4 w-4 text-gray-400" />
                          </span>
                        </CardTitle>
                      )}
                      <CardDescription>
                            Last modified: {session.last_modified ? new Date(session.last_modified).toLocaleString() : "-"}
                            <br />
                            Beats: {session.beat_ids ? session.beat_ids.length : 0}
                            <br />
                            {/* List beats with play button */}
                            {beatsBySession[session.id] && beatsBySession[session.id].length > 0 && (
                              <div className="flex flex-col gap-1 mt-2">
                                {beatsBySession[session.id].map((beat: any) => (
                                  <div key={beat.id} className="flex items-center gap-2">
                                    <span>{beat.title}</span>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handlePlayPause(beat)}
                                      className="h-7 w-7"
                                      aria-label="Play"
                                    >
                                      {currentBeat && currentBeat.id === beat.id && isPlaying ? (
                                        <Pause className="h-4 w-4" />
                                      ) : (
                                        <Play className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                      </CardDescription>
                      {editingLyricsId === session.id ? (
                        <div className="flex flex-col gap-2 mt-1">
                          <textarea
                            name="lyrics"
                            value={lyricsEditValue}
                            onChange={e => setLyricsEditValue(e.target.value)}
                            className="w-full h-24 bg-secondary text-white rounded p-2"
                            autoFocus
                            onBlur={() => handleSaveLyrics(session.id)}
                            onKeyDown={e => {
                              if (e.key === 'Escape') setEditingLyricsId(null);
                            }}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSaveLyrics(session.id)} disabled={saving}>Save</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingLyricsId(null)} disabled={saving}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="flex items-center gap-2 mt-1 relative cursor-pointer"
                          onClick={() => handleEditLyrics(session)}
                          tabIndex={0}
                          role="button"
                          aria-label="Edit Lyrics"
                        >
                          <span className="text-sm text-gray-400 break-all">
                            {session.lyrics ? session.lyrics.slice(0, 40) + (session.lyrics.length > 40 ? "..." : "") : "-"}
                          </span>
                          <span className="pl-2 flex items-center">
                            <Eye className="h-4 w-4 text-gray-400" onClick={e => { e.stopPropagation(); handleOpenLyricsModal(session); }} />
                          </span>
                          <span className="pl-2 flex items-center group-hover:opacity-100 transition-opacity">
                            <Edit className="h-4 w-4 text-gray-400" />
                          </span>
                            </div>
                          )}
                      {/* Lyrics Modal for this session */}
                      {openLyricsModalId === session.id && (
                        <Dialog open={true} onOpenChange={handleCloseLyricsModal}>
                          <Rnd
                            default={{ x: 100, y: 100, width: 500, height: 420 }}
                            minWidth={300}
                            minHeight={120}
                            maxWidth={900}
                            maxHeight={900}
                            bounds="window"
                            className="z-[1000]"
                            enableResizing={{
                              top: true,
                              right: true,
                              bottom: true,
                              left: true,
                              topRight: true,
                              bottomRight: true,
                              bottomLeft: true,
                              topLeft: true,
                            }}
                          >
                            <DialogContent className="max-w-lg overflow-auto">
                              <DialogHeader>
                                <DialogTitle>Edit Full Lyrics</DialogTitle>
                              </DialogHeader>
                              <textarea
                                className="w-full bg-secondary text-white rounded p-2 mb-4 resize"
                                value={modalLyricsValue}
                                onChange={e => setModalLyricsValue(e.target.value)}
                                autoFocus
                              />
                              <div className="flex justify-end gap-2 mt-2">
                                <Button variant="outline" onClick={handleCloseLyricsModal}>Close</Button>
                                <Button onClick={() => handleSaveLyricsModal(session.id)} disabled={modalSaving}>
                                  {modalSaving ? <span className="animate-spin mr-2">⏳</span> : null}
                                  Save
                                </Button>
                              </div>
                            </DialogContent>
                          </Rnd>
                        </Dialog>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                      {editingId === session.id ? (
                        <>
                          <Button size="sm" onClick={() => handleSave(session.id)} disabled={saving}>
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)} disabled={saving}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(session.id)} disabled={saving}>
                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                          {session.lyrics && (
                            <Button size="sm" variant="secondary" onClick={() => {
                              const blob = new Blob([session.lyrics], { type: 'text/plain' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${session.name || 'lyrics'}.txt`;
                              document.body.appendChild(a);
                              a.click();
                              setTimeout(() => {
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                              }, 100);
                            }}>
                              <Download className="h-4 w-4 mr-1" /> Export Lyrics
                            </Button>
                          )}
                          <Button size="sm" variant="secondary" onClick={async () => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.txt';
                            input.onchange = async (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) {
                                try {
                                  const text = await file.text();
                                  // Update lyrics in DB
                                  const { error } = await supabase
                                    .from('sessions')
                                    .update({ lyrics: text })
                                    .eq('id', session.id);
                                  if (!error) {
                                    setSessions(sessions => sessions.map(s => s.id === session.id ? { ...s, lyrics: text } : s));
                                    toast({ title: 'Lyrics Imported', description: 'Lyrics imported successfully.' });
                                  } else {
                                    toast({ title: 'Error', description: 'Failed to import lyrics.', variant: 'destructive' });
                                  }
                                } catch (err) {
                                  toast({ title: 'Error', description: 'Failed to read file.', variant: 'destructive' });
                                }
                              }
                            };
                            input.click();
                          }}>
                            <Upload className="h-4 w-4 mr-1" /> Import Lyrics
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="shared-sessions" className="mt-6">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Shared with Me</CardTitle>
                <CardDescription>View sessions shared by other artists</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-400">
                  No shared sessions available
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="collaborations" className="mt-6">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Collaborations</CardTitle>
                <CardDescription>Work together on shared sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-400">
                  No active collaborations
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <audio
        ref={audioRef}
        onEnded={() => setPlayingBeatId(null)}
        style={{ display: 'none' }}
      />
    </div>
  )
} 