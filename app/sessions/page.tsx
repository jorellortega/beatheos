"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Upload, Download, Share2, Mic, Play, Pause, Trash2, Edit } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

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
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("my-sessions")
  const [sessions, setSessions] = useState<Session[]>([
    {
      id: "1",
      name: "Cosmic Rhythm Session",
      date: "2024-04-05",
      duration: "2:45",
      stems: 8,
      collaborators: ["Artist1", "Producer1"],
      status: "recording"
    },
    {
      id: "2",
      name: "Trap Essentials Draft",
      date: "2024-04-04",
      duration: "3:15",
      stems: 12,
      collaborators: ["Artist2"],
      status: "completed"
    }
  ])

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
            {sessions.map((session) => (
              <Card key={session.id} className="hover:border-primary transition-all">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{session.name}</CardTitle>
                      <CardDescription>
                        Created on {session.date} • {session.duration} • {session.stems} stems
                      </CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleShareSession(session.id)}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Mic className="h-4 w-4 text-primary" />
                      <span className="text-sm text-gray-400">
                        {session.collaborators.length} collaborator{session.collaborators.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Play className="h-4 w-4 text-primary" />
                      <span className="text-sm text-gray-400">{session.status}</span>
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
    </div>
  )
} 