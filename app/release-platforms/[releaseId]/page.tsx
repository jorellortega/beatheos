"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, FileText, Trash2, Plus, Globe, ExternalLink, CheckCircle2, XCircle, Clock, AlertCircle, BarChart3, Settings, Edit, Download, Upload, Archive, Circle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface ReleasePlatform {
  id: string
  release_id: string
  release_type: 'album' | 'single'
  platform: string
  platform_release_id?: string
  status: 'pending' | 'submitted' | 'processing' | 'distributed' | 'rejected' | 'paused' | 'archived'
  claim_status: 'unclaimed' | 'pending' | 'claimed' | 'verified' | 'rejected'
  submission_date?: string
  distribution_date?: string
  rejection_reason?: string
  custom_fields: any
  analytics: any
  notes?: string
  created_at: string
  updated_at: string
}

interface Release {
  id: string
  title: string
  artist: string
  release_date: string
  cover_art_url?: string
  description?: string
}

const PLATFORMS = [
  'Spotify',
  'Apple Music',
  'YouTube Music',
  'Amazon Music',
  'Tidal',
  'Deezer',
  'SoundCloud',
  'Bandcamp',
  'Pandora',
  'iHeartRadio',
  'TikTok',
  'Instagram',
  'Facebook',
  'Twitter/X',
  'TikTok',
  'Snapchat',
  'Twitch',
  'Discord',
  'Reddit',
  'Other'
]

export default function ReleasePlatformsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [release, setRelease] = useState<Release | null>(null)
  const [releasePlatforms, setReleasePlatforms] = useState<ReleasePlatform[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddPlatformDialog, setShowAddPlatformDialog] = useState(false)
  const [showEditPlatformDialog, setShowEditPlatformDialog] = useState(false)
  const [editingPlatform, setEditingPlatform] = useState<ReleasePlatform | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  const [newPlatform, setNewPlatform] = useState({
    platform: '',
    status: 'pending' as const,
    claim_status: 'unclaimed' as const,
    platform_release_id: '',
    notes: ''
  })

  const releaseId = params?.releaseId as string

  useEffect(() => {
    if (user && releaseId) {
      fetchReleaseData()
    }
  }, [user, releaseId])

  async function fetchReleaseData() {
    try {
      setLoading(true)
      
      // Try to find the release in albums first
      let { data: albumData, error: albumError } = await supabase
        .from('albums')
        .select('*')
        .eq('id', releaseId)
        .eq('user_id', user?.id)
        .single()

      if (albumData) {
        setRelease(albumData)
        await fetchReleasePlatforms('album')
        return
      }

      // If not found in albums, try singles
      let { data: singleData, error: singleError } = await supabase
        .from('singles')
        .select('*')
        .eq('id', releaseId)
        .eq('user_id', user?.id)
        .single()

      if (singleData) {
        setRelease(singleData)
        await fetchReleasePlatforms('single')
        return
      }

      setError('Release not found')
    } catch (error) {
      console.error('Error fetching release:', error)
      setError('Failed to load release')
    } finally {
      setLoading(false)
    }
  }

  async function fetchReleasePlatforms(releaseType: 'album' | 'single') {
    try {
      const { data, error } = await supabase
        .from('release_platforms')
        .select('*')
        .eq('release_id', releaseId)
        .eq('release_type', releaseType)
        .order('created_at', { ascending: false })

      if (error) throw error
      setReleasePlatforms(data || [])
    } catch (error) {
      console.error('Error fetching release platforms:', error)
    }
  }

  const addPlatform = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const releaseType = release?.id ? (await supabase.from('albums').select('id').eq('id', release.id).single()).data ? 'album' : 'single' : 'album'
      
      const { error } = await supabase
        .from('release_platforms')
        .insert({
          release_id: releaseId,
          release_type: releaseType,
          platform: newPlatform.platform,
          status: newPlatform.status,
          claim_status: newPlatform.claim_status,
          platform_release_id: newPlatform.platform_release_id || null,
          notes: newPlatform.notes || null
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Platform added successfully",
      })

      setShowAddPlatformDialog(false)
      setNewPlatform({
        platform: '',
        status: 'pending',
        claim_status: 'unclaimed',
        platform_release_id: '',
        notes: ''
      })
      
      await fetchReleaseData()
    } catch (error) {
      console.error('Error adding platform:', error)
      toast({
        title: "Error",
        description: "Failed to add platform",
        variant: "destructive"
      })
    }
  }

  const updatePlatform = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPlatform) return

    try {
      const { error } = await supabase
        .from('release_platforms')
        .update({
          platform: editingPlatform.platform,
          status: editingPlatform.status,
          claim_status: editingPlatform.claim_status,
          platform_release_id: editingPlatform.platform_release_id || null,
          notes: editingPlatform.notes || null,
          custom_fields: editingPlatform.custom_fields,
          analytics: editingPlatform.analytics
        })
        .eq('id', editingPlatform.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Platform updated successfully",
      })

      setShowEditPlatformDialog(false)
      setEditingPlatform(null)
      
      await fetchReleaseData()
    } catch (error) {
      console.error('Error updating platform:', error)
      toast({
        title: "Error",
        description: "Failed to update platform",
        variant: "destructive"
      })
    }
  }

  const deletePlatform = async (platformId: string) => {
    if (!confirm('Are you sure you want to delete this platform entry?')) return

    try {
      const { error } = await supabase
        .from('release_platforms')
        .delete()
        .eq('id', platformId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Platform entry deleted successfully",
      })

      await fetchReleaseData()
    } catch (error) {
      console.error('Error deleting platform:', error)
      toast({
        title: "Error",
        description: "Failed to delete platform entry",
        variant: "destructive"
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-500'
      case 'submitted':
        return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500'
      case 'processing':
        return 'bg-orange-600 hover:bg-orange-700 text-white border-orange-500'
      case 'distributed':
        return 'bg-green-600 hover:bg-green-700 text-white border-green-500'
      case 'rejected':
        return 'bg-red-600 hover:bg-red-700 text-white border-red-500'
      case 'paused':
        return 'bg-gray-600 hover:bg-gray-700 text-white border-gray-500'
      case 'archived':
        return 'bg-purple-600 hover:bg-purple-700 text-white border-purple-500'
      default:
        return 'bg-gray-600 hover:bg-gray-700 text-white border-gray-500'
    }
  }

  const getClaimStatusColor = (status: string) => {
    switch (status) {
      case 'unclaimed':
        return 'bg-gray-600 hover:bg-gray-700 text-white border-gray-500'
      case 'pending':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-500'
      case 'claimed':
        return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500'
      case 'verified':
        return 'bg-green-600 hover:bg-green-700 text-white border-green-500'
      case 'rejected':
        return 'bg-red-600 hover:bg-red-700 text-white border-red-500'
      default:
        return 'bg-gray-600 hover:bg-gray-700 text-white border-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'submitted':
        return <Upload className="h-4 w-4" />
      case 'processing':
        return <AlertCircle className="h-4 w-4" />
      case 'distributed':
        return <CheckCircle2 className="h-4 w-4" />
      case 'rejected':
        return <XCircle className="h-4 w-4" />
      case 'paused':
        return <AlertCircle className="h-4 w-4" />
      case 'archived':
        return <Archive className="h-4 w-4" />
      default:
        return <Circle className="h-4 w-4" />
    }
  }

  if (loading) {
    return <div className="container mx-auto py-8">Loading...</div>
  }
  if (error || !release) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Release Not Found</h1>
        <Link href="/mylibrary">
          <Button variant="default">Back to Library</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <Link href="/mylibrary">
        <Button variant="outline" className="mb-6">&larr; Back to Library</Button>
      </Link>
      
      {/* Release Header */}
      <div className="flex gap-8 items-start bg-zinc-900 rounded-xl p-8 shadow-lg mb-8">
        {release.cover_art_url ? (
          <img src={release.cover_art_url} alt={release.title} className="w-48 h-48 object-cover rounded-lg" />
        ) : (
          <img src="/placeholder.jpg" alt="No cover art" className="w-48 h-48 object-cover rounded-lg" />
        )}
        <div className="flex-1">
          <h1 className="text-4xl font-bold mb-2">{release.title}</h1>
          <p className="text-xl text-gray-400 mb-4">{release.artist}</p>
          <div className="flex items-center gap-4 text-gray-400 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Released: {release.release_date ? new Date(release.release_date).toLocaleDateString() : 'N/A'}
            </div>
          </div>
          {release.description && (
            <p className="text-gray-400">{release.description}</p>
          )}
        </div>
      </div>

      {/* Platform Management */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Platform Distribution</h2>
          <Button onClick={() => setShowAddPlatformDialog(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Platform
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="platforms">Platforms</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Total Platforms
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{releasePlatforms.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Distributed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {releasePlatforms.filter(p => p.status === 'distributed').length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Pending
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">
                    {releasePlatforms.filter(p => ['pending', 'submitted', 'processing'].includes(p.status)).length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Platform Status Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Platform Status Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {PLATFORMS.slice(0, 10).map(platform => {
                    const platformEntry = releasePlatforms.find(p => p.platform === platform)
                    return (
                      <div key={platform} className="flex justify-between items-center p-2 bg-gray-800 rounded">
                        <span className="font-medium">{platform}</span>
                        {platformEntry ? (
                          <Badge className={getStatusColor(platformEntry.status)}>
                            {platformEntry.status}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-400">Not Added</Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Platforms Tab */}
          <TabsContent value="platforms" className="space-y-4">
            {releasePlatforms.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Globe className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-400">No platforms added yet.</p>
                  <Button onClick={() => setShowAddPlatformDialog(true)} className="mt-4">
                    Add Your First Platform
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {releasePlatforms.map(platform => (
                  <Card key={platform.id} className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                          <h3 className="text-xl font-semibold">{platform.platform}</h3>
                          <Badge className={getStatusColor(platform.status)}>
                            {getStatusIcon(platform.status)}
                            {platform.status}
                          </Badge>
                          <Badge className={getClaimStatusColor(platform.claim_status)}>
                            {platform.claim_status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
                          {platform.platform_release_id && (
                            <div>
                              <span className="font-medium">Platform ID:</span> {platform.platform_release_id}
                            </div>
                          )}
                          {platform.submission_date && (
                            <div>
                              <span className="font-medium">Submitted:</span> {new Date(platform.submission_date).toLocaleDateString()}
                            </div>
                          )}
                          {platform.distribution_date && (
                            <div>
                              <span className="font-medium">Distributed:</span> {new Date(platform.distribution_date).toLocaleDateString()}
                            </div>
                          )}
                          {platform.notes && (
                            <div className="md:col-span-2">
                              <span className="font-medium">Notes:</span> {platform.notes}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setEditingPlatform(platform)
                            setShowEditPlatformDialog(true)
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => deletePlatform(platform.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Platform Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">Analytics data will be displayed here when available.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Platform Dialog */}
      <Dialog open={showAddPlatformDialog} onOpenChange={setShowAddPlatformDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Add Platform</DialogTitle>
            <DialogDescription>
              Add a new platform for tracking distribution status
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={addPlatform} className="space-y-4">
            <div>
              <Label htmlFor="platform">Platform</Label>
              <Select value={newPlatform.platform} onValueChange={(value) => setNewPlatform(prev => ({ ...prev, platform: value }))}>
                <SelectTrigger className="bg-[#2a2a2a] border-gray-600 text-white">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(platform => (
                    <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={newPlatform.status} onValueChange={(value: any) => setNewPlatform(prev => ({ ...prev, status: value }))}>
                <SelectTrigger className="bg-[#2a2a2a] border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="distributed">Distributed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="claim_status">Claim Status</Label>
              <Select value={newPlatform.claim_status} onValueChange={(value: any) => setNewPlatform(prev => ({ ...prev, claim_status: value }))}>
                <SelectTrigger className="bg-[#2a2a2a] border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unclaimed">Unclaimed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="claimed">Claimed</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="platform_release_id">Platform Release ID (Optional)</Label>
              <Input
                id="platform_release_id"
                value={newPlatform.platform_release_id}
                onChange={(e) => setNewPlatform(prev => ({ ...prev, platform_release_id: e.target.value }))}
                placeholder="Platform's internal release ID"
                className="bg-[#2a2a2a] border-gray-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={newPlatform.notes}
                onChange={(e) => setNewPlatform(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this platform"
                className="bg-[#2a2a2a] border-gray-600 text-white"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddPlatformDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Add Platform
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Platform Dialog */}
      <Dialog open={showEditPlatformDialog} onOpenChange={setShowEditPlatformDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Edit Platform</DialogTitle>
            <DialogDescription>
              Update platform distribution status and details
            </DialogDescription>
          </DialogHeader>
          {editingPlatform && (
            <form onSubmit={updatePlatform} className="space-y-4">
              <div>
                <Label htmlFor="edit_platform">Platform</Label>
                <Input
                  id="edit_platform"
                  value={editingPlatform.platform}
                  onChange={(e) => setEditingPlatform(prev => prev ? { ...prev, platform: e.target.value } : null)}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="edit_status">Status</Label>
                <Select value={editingPlatform.status} onValueChange={(value: any) => setEditingPlatform(prev => prev ? { ...prev, status: value } : null)}>
                  <SelectTrigger className="bg-[#2a2a2a] border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="distributed">Distributed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_claim_status">Claim Status</Label>
                <Select value={editingPlatform.claim_status} onValueChange={(value: any) => setEditingPlatform(prev => prev ? { ...prev, claim_status: value } : null)}>
                  <SelectTrigger className="bg-[#2a2a2a] border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unclaimed">Unclaimed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="claimed">Claimed</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_platform_release_id">Platform Release ID</Label>
                <Input
                  id="edit_platform_release_id"
                  value={editingPlatform.platform_release_id || ''}
                  onChange={(e) => setEditingPlatform(prev => prev ? { ...prev, platform_release_id: e.target.value } : null)}
                  placeholder="Platform's internal release ID"
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="edit_notes">Notes</Label>
                <Textarea
                  id="edit_notes"
                  value={editingPlatform.notes || ''}
                  onChange={(e) => setEditingPlatform(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  placeholder="Additional notes about this platform"
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowEditPlatformDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Update Platform
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 