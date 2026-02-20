"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  Download, 
  Trash2, 
  Edit2, 
  Image as ImageIcon, 
  Loader2,
  ArrowLeft,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'

interface UserAICover {
  id: string
  user_id: string
  name: string | null
  cover_url: string
  cover_size: string | null
  prompt: string | null
  storage_path: string | null
  created_at: string
  updated_at: string
}

export default function MyAICoversPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [covers, setCovers] = useState<UserAICover[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCoverId, setEditingCoverId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteCoverId, setDeleteCoverId] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    fetchCovers()
  }, [user, router])

  const fetchCovers = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('user_ai_covers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setCovers(data || [])
    } catch (error: any) {
      console.error('Error fetching covers:', error)
      toast({
        title: "Error",
        description: "Failed to load your AI covers.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = (cover: UserAICover) => {
    const a = document.createElement('a')
    a.href = cover.cover_url
    const fileName = cover.name 
      ? `${cover.name.replace(/[^a-z0-9]/gi, '_')}_${cover.cover_size || 'cover'}.png`
      : `ai_cover_${cover.cover_size || 'cover'}_${Date.now()}.png`
    a.download = fileName
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    toast({
      title: "Success",
      description: "Cover downloaded!",
    })
  }

  const handleEditName = (cover: UserAICover) => {
    setEditingCoverId(cover.id)
    setEditName(cover.name || '')
  }

  const handleSaveName = async () => {
    if (!editingCoverId || !user?.id) return

    try {
      setUpdating(true)
      const { error } = await supabase
        .from('user_ai_covers')
        .update({ name: editName.trim() || null })
        .eq('id', editingCoverId)
        .eq('user_id', user.id)

      if (error) throw error

      setCovers(prev => prev.map(cover => 
        cover.id === editingCoverId 
          ? { ...cover, name: editName.trim() || null }
          : cover
      ))

      setEditingCoverId(null)
      setEditName('')

      toast({
        title: "Success",
        description: "Cover name updated!",
      })
    } catch (error: any) {
      console.error('Error updating cover name:', error)
      toast({
        title: "Error",
        description: "Failed to update cover name.",
        variant: "destructive"
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteCoverId || !user?.id) return

    try {
      setDeleting(true)
      const { error } = await supabase
        .from('user_ai_covers')
        .delete()
        .eq('id', deleteCoverId)
        .eq('user_id', user.id)

      if (error) throw error

      setCovers(prev => prev.filter(cover => cover.id !== deleteCoverId))
      setDeleteCoverId(null)

      toast({
        title: "Success",
        description: "Cover deleted!",
      })
    } catch (error: any) {
      console.error('Error deleting cover:', error)
      toast({
        title: "Error",
        description: "Failed to delete cover.",
        variant: "destructive"
      })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-white hover:bg-gray-800">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] bg-clip-text text-transparent">
                My AI Covers
              </h1>
              <p className="text-gray-400 mt-1">Manage your AI-generated album covers</p>
            </div>
          </div>
          <Link href="/ai-cover">
            <Button className="bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] text-black hover:from-[#E8E8E8] hover:to-[#F4C430] font-bold">
              <Sparkles className="mr-2 h-4 w-4" />
              Create New Cover
            </Button>
          </Link>
        </div>

        {covers.length === 0 ? (
          <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-[#2a2a2a]">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <ImageIcon className="h-16 w-16 mb-4 opacity-50 text-gray-400" />
              <h3 className="text-xl font-semibold mb-2">No AI Covers Yet</h3>
              <p className="text-gray-400 mb-6 text-center">
                Start creating stunning album covers with AI
              </p>
              <Link href="/ai-cover">
                <Button className="bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] text-black hover:from-[#E8E8E8] hover:to-[#F4C430] font-bold">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create Your First Cover
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {covers.map((cover) => (
              <Card 
                key={cover.id} 
                className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-[#2a2a2a] hover:border-[#F4C430] transition-all"
              >
                <CardHeader className="p-0">
                  <div className="relative aspect-square overflow-hidden rounded-t-lg">
                    <img
                      src={cover.cover_url}
                      alt={cover.name || 'AI Cover'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="mb-3">
                    <h3 className="font-semibold text-white mb-1 truncate">
                      {cover.name || 'Untitled Cover'}
                    </h3>
                    {cover.cover_size && (
                      <p className="text-xs text-gray-400">{cover.cover_size}</p>
                    )}
                    {cover.prompt && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {cover.prompt}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(cover)}
                      className="flex-1 border-[#2a2a2a] text-white hover:bg-[#2a2a2a]"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                    
                    <Dialog open={editingCoverId === cover.id} onOpenChange={(open) => {
                      if (!open) {
                        setEditingCoverId(null)
                        setEditName('')
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditName(cover)}
                          className="border-[#2a2a2a] text-white hover:bg-[#2a2a2a]"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                        <DialogHeader>
                          <DialogTitle>Edit Cover Name</DialogTitle>
                          <DialogDescription className="text-gray-400">
                            Give your cover a custom name
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Enter cover name..."
                            className="bg-[#0f0f0f] border-[#2a2a2a] text-white"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveName()
                              }
                            }}
                          />
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setEditingCoverId(null)
                                setEditName('')
                              }}
                              className="border-[#2a2a2a] text-white hover:bg-[#2a2a2a]"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleSaveName}
                              disabled={updating}
                              className="bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] text-black hover:from-[#E8E8E8] hover:to-[#F4C430] font-bold"
                            >
                              {updating ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                'Save'
                              )}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteCoverId(cover.id)}
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteCoverId} onOpenChange={(open) => {
          if (!open) setDeleteCoverId(null)
        }}>
          <AlertDialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Cover?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                This action cannot be undone. This will permanently delete the cover from your library.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-[#2a2a2a] text-white hover:bg-[#2a2a2a]">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

