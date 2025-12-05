"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, File, Folder, Upload, RefreshCw, CheckCircle2, AlertCircle, Download, Plus, X } from "lucide-react"
import { supabase } from '@/lib/supabaseClient'
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"

interface DropboxFile {
  name: string
  path_lower: string
  path_display: string
  size?: number
  '.tag': 'file' | 'folder'
  client_modified?: string
  server_modified?: string
}

export default function TestDropboxPage() {
  const { user, isLoading: authLoading, hydrated } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [connection, setConnection] = useState<any>(null)
  const [files, setFiles] = useState<DropboxFile[]>([])
  const [currentPath, setCurrentPath] = useState("")
  const [uploadPath, setUploadPath] = useState("")
  const [uploading, setUploading] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    if (!hydrated || authLoading) return

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to test Dropbox.",
        variant: "destructive"
      })
      return
    }

    loadConnection()
  }, [user, hydrated, authLoading])

  const loadConnection = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setLoading(false)
        return
      }

      const response = await fetch('/api/cloud-services/connections', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load connections')
      }

      const data = await response.json()
      const dropboxConnection = [...(data.userConnections || []), ...(data.systemConnections || [])]
        .find((c: any) => c.service_id === 'dropbox')

      if (dropboxConnection) {
        setConnection(dropboxConnection)
        listFiles("")
      } else {
        toast({
          title: "No Dropbox Connection",
          description: "Please connect your Dropbox account first.",
          variant: "destructive"
        })
      }
    } catch (error: any) {
      console.error('Error loading connection:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to load Dropbox connection.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const listFiles = async (path: string = "") => {
    if (!connection) return

    try {
      setTesting("listing")
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/cloud-services/dropbox/list', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to list files')
      }

      const data = await response.json()
      setFiles(data.entries || [])
      setCurrentPath(path)
      // Update upload path when navigating
      setUploadPath(path)
    } catch (error: any) {
      console.error('Error listing files:', error)
      toast({
        title: "Error Listing Files",
        description: error.message || "Failed to list Dropbox files.",
        variant: "destructive"
      })
    } finally {
      setTesting(null)
    }
  }

  const uploadFile = async (file: File) => {
    if (!connection) return

    try {
      setUploading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Use uploadPath (selected folder) or currentPath as fallback
      const targetPath = uploadPath || currentPath
      const fullPath = targetPath ? `${targetPath}/${file.name}` : `/${file.name}`

      // Read file as array buffer
      const arrayBuffer = await file.arrayBuffer()
      const fileContent = new Uint8Array(arrayBuffer)

      const response = await fetch('/api/cloud-services/dropbox/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path: fullPath,
          content: Array.from(fileContent),
          mode: 'add'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload file')
      }

      toast({
        title: "✅ Upload Successful",
        description: `File "${file.name}" uploaded to ${targetPath || 'root'}.`,
      })

      // Refresh file list
      listFiles(currentPath)
    } catch (error: any) {
      console.error('Error uploading file:', error)
      toast({
        title: "Upload Error",
        description: error.message || "Failed to upload file to Dropbox.",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  const createFolder = async () => {
    if (!connection || !newFolderName.trim()) return

    try {
      setCreatingFolder(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const targetPath = uploadPath || currentPath
      const fullPath = targetPath ? `${targetPath}/${newFolderName.trim()}` : `/${newFolderName.trim()}`

      const response = await fetch('/api/cloud-services/dropbox/create-folder', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path: fullPath })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create folder')
      }

      toast({
        title: "✅ Folder Created",
        description: `Folder "${newFolderName}" created successfully.`,
      })

      setNewFolderName("")
      setShowCreateFolder(false)
      // Refresh file list
      listFiles(currentPath)
    } catch (error: any) {
      console.error('Error creating folder:', error)
      toast({
        title: "Create Folder Error",
        description: error.message || "Failed to create folder.",
        variant: "destructive"
      })
    } finally {
      setCreatingFolder(false)
    }
  }

  const downloadFile = async (file: DropboxFile) => {
    if (!connection || file['.tag'] === 'folder') return

    try {
      setDownloading(file.path_lower)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/cloud-services/dropbox/download', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path: file.path_lower })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to download file')
      }

      const data = await response.json()
      
      // Convert base64 back to blob
      const binaryString = atob(data.data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: data.contentType || 'application/octet-stream' })

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = data.filename || file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast({
        title: "✅ Download Successful",
        description: `File "${file.name}" downloaded.`,
      })
    } catch (error: any) {
      console.error('Error downloading file:', error)
      toast({
        title: "Download Error",
        description: error.message || "Failed to download file.",
        variant: "destructive"
      })
    } finally {
      setDownloading(null)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUploadClick = () => {
    if (selectedFile) {
      uploadFile(selectedFile)
      setSelectedFile(null)
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleString()
  }

  if (!hydrated || authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-gray-400">Loading Dropbox test page...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to test Dropbox functionality.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!connection) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>No Dropbox Connection</CardTitle>
            <CardDescription>Please connect your Dropbox account first at the Cloud Services page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/cloud-services'}>
              Go to Cloud Services
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Dropbox Test Page</CardTitle>
          <CardDescription>
            Test Dropbox file operations. Connected as: {connection.account_info?.name?.display_name || connection.account_info?.email || 'Unknown'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Info */}
          <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
            <div>
              <p className="text-sm text-gray-400">Connection Status</p>
              <div className="flex items-center gap-2 mt-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">Connected</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadConnection()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => listFiles("")}
              disabled={!currentPath || testing === "listing"}
            >
              Root
            </Button>
            {currentPath && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const parentPath = currentPath.split('/').slice(0, -1).join('/')
                  listFiles(parentPath)
                }}
                disabled={testing === "listing"}
              >
                ↑ Up
              </Button>
            )}
            <span className="text-sm text-gray-400 ml-2">
              Current: {currentPath || "/"}
            </span>
          </div>

          {/* Folder Selection & Upload */}
          <div className="space-y-3 p-4 bg-gray-900 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-400 mb-2">Upload Destination</p>
                <div className="flex items-center gap-2">
                  <Input
                    value={uploadPath || "/"}
                    onChange={(e) => setUploadPath(e.target.value)}
                    placeholder="/folder/path"
                    className="flex-1"
                    disabled={uploading}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUploadPath(currentPath)}
                    disabled={uploading}
                  >
                    Use Current
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Current folder: {currentPath || "/"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={uploading || creatingFolder}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Folder
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Folder</DialogTitle>
                    <DialogDescription>
                      Create a folder in: {uploadPath || currentPath || "/"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Folder name"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newFolderName.trim()) {
                          createFolder()
                        }
                      }}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowCreateFolder(false)
                          setNewFolderName("")
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={createFolder}
                        disabled={!newFolderName.trim() || creatingFolder}
                      >
                        {creatingFolder ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create"
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="flex-1 relative">
                <input
                  type="file"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="block w-full text-sm text-gray-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-white
                    file:cursor-pointer
                    hover:file:bg-primary/90
                    disabled:opacity-50 disabled:cursor-not-allowed"
                  id="file-upload"
                />
                {selectedFile && (
                  <p className="text-xs text-gray-400 mt-1">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>
              <Button
                onClick={handleUploadClick}
                disabled={!selectedFile || uploading}
                className="min-w-[100px]"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* File List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Files & Folders</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => listFiles(currentPath)}
                disabled={testing === "listing"}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${testing === "listing" ? 'animate-spin' : ''}`} />
                Refresh List
              </Button>
            </div>

            {testing === "listing" ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-2 text-gray-400">Loading files...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Folder className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No files or folders found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.path_lower}
                    className="flex items-center justify-between p-3 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                    onClick={() => {
                      if (file['.tag'] === 'folder') {
                        listFiles(file.path_lower)
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {file['.tag'] === 'folder' ? (
                        <Folder className="h-5 w-5 text-blue-400" />
                      ) : (
                        <File className="h-5 w-5 text-gray-400" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-gray-400 truncate">{file.path_display}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {file['.tag'] === 'file' && (
                        <>
                          <span className="text-xs text-gray-400">{formatFileSize(file.size)}</span>
                          <span className="text-xs text-gray-400">{formatDate(file.server_modified)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              downloadFile(file)
                            }}
                            disabled={downloading === file.path_lower}
                            className="h-8 w-8 p-0"
                          >
                            {downloading === file.path_lower ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                        </>
                      )}
                      {file['.tag'] === 'folder' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setUploadPath(file.path_lower)
                            toast({
                              title: "Folder Selected",
                              description: `Files will upload to: ${file.path_display}`,
                            })
                          }}
                          className="h-8 px-2 text-xs"
                        >
                          Select
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

