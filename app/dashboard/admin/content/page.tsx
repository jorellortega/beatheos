"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Edit, Trash2, Plus, Play, Pause, TrendingUp, Users, Music, Headphones, Check, X } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"

// Mock data - in a real app, this would come from your backend
const mockBeats = [
  { id: 1, title: "No Mercy", producer: "ZeusBeats", genre: "Trap", plays: 15000, status: "active", price: 29.99, rating: 4.8 },
  { id: 2, title: "Cosmic Flow", producer: "StellarBeats", genre: "Lo-Fi", plays: 8500, status: "active", price: 24.99, rating: 4.5 },
  { id: 3, title: "Urban Dreams", producer: "CityProducer", genre: "Hip Hop", plays: 12000, status: "inactive", price: 19.99, rating: 4.2 },
]

const mockProducers = [
  { id: 1, username: "ZeusBeats", email: "zeus@example.com", beats: 25, followers: 5000, status: "active", role: "premium_producer" },
  { id: 2, username: "StellarBeats", email: "stellar@example.com", beats: 18, followers: 3200, status: "active", role: "business_producer" },
  { id: 3, username: "CityProducer", email: "city@example.com", beats: 12, followers: 1500, status: "inactive", role: "free_producer" },
]

export default function ContentManagementPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("beats")
  const [beats, setBeats] = useState(mockBeats)
  const [producers, setProducers] = useState(mockProducers)
  const [editingBeat, setEditingBeat] = useState<number | null>(null)
  const [editedBeat, setEditedBeat] = useState<any>(null)
  const [editingProducer, setEditingProducer] = useState<number | null>(null)
  const [editedProducer, setEditedProducer] = useState<any>(null)

  useEffect(() => {
    if (!user || user.role !== "admin") {
      router.push("/login")
    }
  }, [user, router])

  if (!user) return null

  const filteredBeats = beats.filter(beat => 
    beat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    beat.producer.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredProducers = producers.filter(producer => 
    producer.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    producer.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleEditBeat = (beatId: number) => {
    const beat = beats.find(b => b.id === beatId)
    if (beat) {
      setEditingBeat(beatId)
      setEditedBeat({ ...beat })
    }
  }

  const handleSaveBeat = (beatId: number) => {
    setBeats(beats.map(beat => 
      beat.id === beatId ? editedBeat : beat
    ))
    setEditingBeat(null)
    toast({
      title: "Beat Updated",
      description: "Beat information has been updated successfully.",
    })
  }

  const handleCancelEdit = () => {
    setEditingBeat(null)
    setEditedBeat(null)
  }

  const handleInputChange = (field: string, value: any) => {
    setEditedBeat(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleDeleteBeat = (beatId: number) => {
    // TODO: Implement delete beat functionality
    console.log("Delete beat:", beatId)
  }

  const handleEditProducer = (producerId: number) => {
    const producer = producers.find(p => p.id === producerId)
    if (producer) {
      setEditingProducer(producerId)
      setEditedProducer({ ...producer })
    }
  }

  const handleSaveProducer = (producerId: number) => {
    setProducers(producers.map(producer => 
      producer.id === producerId ? editedProducer : producer
    ))
    setEditingProducer(null)
    toast({
      title: "Producer Updated",
      description: "Producer information has been updated successfully.",
    })
  }

  const handleCancelProducerEdit = () => {
    setEditingProducer(null)
    setEditedProducer(null)
  }

  const handleProducerInputChange = (field: string, value: any) => {
    setEditedProducer(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleDeleteProducer = (producerId: number) => {
    // TODO: Implement delete producer functionality
    console.log("Delete producer:", producerId)
  }

  const handleUpdatePlays = (beatId: number, newPlays: number) => {
    setBeats(beats.map(beat => 
      beat.id === beatId ? { ...beat, plays: newPlays } : beat
    ))
    toast({
      title: "Plays Updated",
      description: `Updated play count for beat ID ${beatId}`,
    })
  }

  const handleUpdateStatus = (id: number, type: 'beat' | 'producer', newStatus: string) => {
    if (type === 'beat') {
      setBeats(beats.map(beat => 
        beat.id === id ? { ...beat, status: newStatus } : beat
      ))
    } else {
      setProducers(producers.map(producer => 
        producer.id === id ? { ...producer, status: newStatus } : producer
      ))
    }
    toast({
      title: "Status Updated",
      description: `Updated status for ${type} ID ${id}`,
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold font-display tracking-wider text-primary">Content Management</h1>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary text-white"
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="beats" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="beats">Beats</TabsTrigger>
          <TabsTrigger value="producers">Producers</TabsTrigger>
        </TabsList>

        <TabsContent value="beats" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>All Beats</CardTitle>
                  <CardDescription>Manage and moderate beats on the platform</CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Beat
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Producer</TableHead>
                    <TableHead>Genre</TableHead>
                    <TableHead>Plays</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBeats.map((beat) => (
                    <TableRow key={beat.id}>
                      <TableCell>
                        {editingBeat === beat.id ? (
                          <Input
                            value={editedBeat.title}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                            className="w-full bg-secondary"
                          />
                        ) : (
                          beat.title
                        )}
                      </TableCell>
                      <TableCell>
                        {editingBeat === beat.id ? (
                          <Input
                            value={editedBeat.producer}
                            onChange={(e) => handleInputChange('producer', e.target.value)}
                            className="w-full bg-secondary"
                          />
                        ) : (
                          beat.producer
                        )}
                      </TableCell>
                      <TableCell>
                        {editingBeat === beat.id ? (
                          <Input
                            value={editedBeat.genre}
                            onChange={(e) => handleInputChange('genre', e.target.value)}
                            className="w-full bg-secondary"
                          />
                        ) : (
                          beat.genre
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={editingBeat === beat.id ? editedBeat.plays : beat.plays}
                            onChange={(e) => {
                              if (editingBeat === beat.id) {
                                handleInputChange('plays', parseInt(e.target.value))
                              } else {
                                handleUpdatePlays(beat.id, parseInt(e.target.value))
                              }
                            }}
                            className="w-24 bg-secondary"
                          />
                          <TrendingUp className="h-4 w-4 text-primary" />
                        </div>
                      </TableCell>
                      <TableCell>
                        {editingBeat === beat.id ? (
                          <Input
                            type="number"
                            value={editedBeat.price}
                            onChange={(e) => handleInputChange('price', parseFloat(e.target.value))}
                            className="w-24 bg-secondary"
                          />
                        ) : (
                          `$${beat.price}`
                        )}
                      </TableCell>
                      <TableCell>
                        {editingBeat === beat.id ? (
                          <Input
                            type="number"
                            value={editedBeat.rating}
                            onChange={(e) => handleInputChange('rating', parseFloat(e.target.value))}
                            className="w-24 bg-secondary"
                          />
                        ) : (
                          <div className="flex items-center">
                            {beat.rating}
                            <Headphones className="h-4 w-4 ml-1 text-primary" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={editingBeat === beat.id ? editedBeat.status : beat.status}
                          onValueChange={(value) => {
                            if (editingBeat === beat.id) {
                              handleInputChange('status', value)
                            } else {
                              handleUpdateStatus(beat.id, 'beat', value)
                            }
                          }}
                        >
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {editingBeat === beat.id ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSaveBeat(beat.id)}
                                title="Save Changes"
                                className="text-green-500 hover:text-green-600"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleCancelEdit}
                                title="Cancel"
                                className="text-red-500 hover:text-red-600"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditBeat(beat.id)}
                                title="Edit Beat"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteBeat(beat.id)}
                                title="Delete Beat"
                                className="text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="producers" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>All Producers</CardTitle>
                  <CardDescription>Manage and moderate producers on the platform</CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Producer
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Beats</TableHead>
                    <TableHead>Followers</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducers.map((producer) => (
                    <TableRow key={producer.id}>
                      <TableCell>
                        {editingProducer === producer.id ? (
                          <Input
                            value={editedProducer.username}
                            onChange={(e) => handleProducerInputChange('username', e.target.value)}
                            className="w-full bg-secondary"
                          />
                        ) : (
                          producer.username
                        )}
                      </TableCell>
                      <TableCell>
                        {editingProducer === producer.id ? (
                          <Input
                            value={editedProducer.email}
                            onChange={(e) => handleProducerInputChange('email', e.target.value)}
                            className="w-full bg-secondary"
                          />
                        ) : (
                          producer.email
                        )}
                      </TableCell>
                      <TableCell>
                        {editingProducer === producer.id ? (
                          <Input
                            type="number"
                            value={editedProducer.beats}
                            onChange={(e) => handleProducerInputChange('beats', parseInt(e.target.value))}
                            className="w-24 bg-secondary"
                          />
                        ) : (
                          <div className="flex items-center">
                            {producer.beats}
                            <Music className="h-4 w-4 ml-1 text-primary" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingProducer === producer.id ? (
                          <Input
                            type="number"
                            value={editedProducer.followers}
                            onChange={(e) => handleProducerInputChange('followers', parseInt(e.target.value))}
                            className="w-24 bg-secondary"
                          />
                        ) : (
                          <div className="flex items-center">
                            {producer.followers}
                            <Users className="h-4 w-4 ml-1 text-primary" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingProducer === producer.id ? (
                          <Select
                            value={editedProducer.role}
                            onValueChange={(value) => handleProducerInputChange('role', value)}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free_producer">Free Producer</SelectItem>
                              <SelectItem value="premium_producer">Premium Producer</SelectItem>
                              <SelectItem value="business_producer">Business Producer</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className="capitalize">
                            {producer.role.replace('_', ' ')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={editingProducer === producer.id ? editedProducer.status : producer.status}
                          onValueChange={(value) => {
                            if (editingProducer === producer.id) {
                              handleProducerInputChange('status', value)
                            } else {
                              handleUpdateStatus(producer.id, 'producer', value)
                            }
                          }}
                        >
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {editingProducer === producer.id ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSaveProducer(producer.id)}
                                title="Save Changes"
                                className="text-green-500 hover:text-green-600"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleCancelProducerEdit}
                                title="Cancel"
                                className="text-red-500 hover:text-red-600"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditProducer(producer.id)}
                                title="Edit Producer"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteProducer(producer.id)}
                                title="Delete Producer"
                                className="text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 