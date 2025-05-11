"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Upload, Download, Share2, Mic, Play, Pause, Trash2, Edit } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useAuth } from "@/contexts/AuthContext"
import { createClient } from "@supabase/supabase-js"

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

  // Fetch sessions from Supabase
  useEffect(() => {
    if (!user) return
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
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
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
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
    if (playingBeatId === beat.id) {
      audioRef.current?.pause();
      setPlayingBeatId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = beat.mp3_url;
        audioRef.current.play();
        setPlayingBeatId(beat.id);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 font-display tracking-wider text-primary">Recording Sessions</h1>
          <p className="text-xl text-gray-400">Manage and collaborate on your recording sessions</p>
        </div>
        <Button onClick={handleUploadSession}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Session
        </Button>
      </div>

      <Tabs defaultValue="my-sessions" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
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
              <Card key={session.id} className="hover:border-primary transition-all">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      {editingId === session.id ? (
                        <>
                          <Input
                            name="name"
                            value={editForm.name}
                            onChange={handleEditChange}
                            className="mb-2"
                          />
                          <Label>Lyrics</Label>
                          <textarea
                            name="lyrics"
                            value={editForm.lyrics}
                            onChange={handleEditChange}
                            className="w-full h-24 mb-2 bg-secondary text-white rounded p-2"
                          />
                        </>
                      ) : (
                        <>
                      <CardTitle>{session.name}</CardTitle>
                      <CardDescription>
                            Last modified: {session.last_modified ? new Date(session.last_modified).toLocaleString() : "-"}
                            <br />
                            Beats: {session.beat_ids ? session.beat_ids.length : 0}
                      </CardDescription>
                          {beatsBySession[session.id] && beatsBySession[session.id].length > 0 && (
                            <div className="mt-2">
                              <strong>Beats:</strong>
                              <ul className="list-disc ml-6">
                                {beatsBySession[session.id].map(beat => (
                                  <li key={beat.id} className="flex items-center space-x-2">
                                    {beat.cover_art_url && (
                                      <img src={beat.cover_art_url} alt="cover" className="w-8 h-8 rounded object-cover" />
                                    )}
                                    <span>{beat.title}</span>
                                    <button
                                      className="ml-2"
                                      onClick={() => handlePlayPause(beat)}
                                      aria-label={playingBeatId === beat.id ? 'Pause' : 'Play'}
                                    >
                                      {playingBeatId === beat.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex space-x-2">
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
                          <Button size="sm" variant="outline" onClick={() => handleEdit(session)}>
                            <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(session.id)} disabled={saving}>
                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-400">
                        Lyrics: {editingId === session.id ? null : (session.lyrics ? session.lyrics.slice(0, 40) + (session.lyrics.length > 40 ? "..." : "") : "-")}
                      </span>
                    </div>
                  </div>
                </CardContent>
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