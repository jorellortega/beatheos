"use client"

import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileAudio, FileText, Image as ImageIcon, FileArchive, Download, Upload, Plus, File } from 'lucide-react'
import Link from 'next/link'

// Mock track data with files
const mockTrack = {
  id: '1',
  title: 'Midnight Dreams',
  album: 'Midnight Dreams',
  artist: 'Your Artist Name',
  duration: '3:45',
  isrc: 'USRC12345678',
  files: {
    wav: {
      name: 'midnight_dreams_master.wav',
      size: '45.2 MB',
      uploaded: '2024-03-15',
      url: '#'
    },
    mp3: {
      name: 'midnight_dreams_master.mp3',
      size: '8.7 MB',
      uploaded: '2024-03-15',
      url: '#'
    },
    session: {
      name: 'midnight_dreams_session.zip',
      size: '1.2 GB',
      uploaded: '2024-03-15',
      url: '#'
    },
    stems: {
      name: 'midnight_dreams_stems.zip',
      size: '850 MB',
      uploaded: '2024-03-15',
      url: '#'
    },
    coverArt: {
      name: 'midnight_dreams_cover.jpg',
      size: '2.1 MB',
      uploaded: '2024-03-15',
      url: '#'
    },
    custom: [
      {
        id: '1',
        name: 'music_video.mp4',
        type: 'video',
        size: '156 MB',
        uploaded: '2024-03-15',
        url: '#'
      },
      {
        id: '2',
        name: 'behind_the_scenes.pdf',
        type: 'document',
        size: '2.4 MB',
        uploaded: '2024-03-15',
        url: '#'
      }
    ]
  }
}

export default function TrackFilesPage() {
  const params = useParams() || {}
  const trackId = params && 'trackId' in params ? (Array.isArray(params.trackId) ? params.trackId[0] : params.trackId) : ''

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <Link href={`/myalbums/${mockTrack.album}`}>
          <Button variant="outline">&larr; Back to Album</Button>
        </Link>
        <Button className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Upload New File
        </Button>
      </div>

      <Card className="p-6 mb-8">
        <h1 className="text-3xl font-bold mb-2">{mockTrack.title}</h1>
        <p className="text-xl text-gray-400 mb-4">{mockTrack.artist}</p>
        <div className="flex gap-4 text-gray-400">
          <span>Duration: {mockTrack.duration}</span>
          <span>ISRC: {mockTrack.isrc}</span>
        </div>
      </Card>

      <div className="grid gap-6">
        {/* WAV File */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FileAudio className="h-8 w-8 text-blue-400" />
              <div>
                <h3 className="text-lg font-semibold">Master WAV</h3>
                <p className="text-sm text-gray-400">{mockTrack.files.wav.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline">{mockTrack.files.wav.size}</Badge>
              <Badge variant="secondary">Uploaded: {new Date(mockTrack.files.wav.uploaded).toLocaleDateString()}</Badge>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </Card>

        {/* MP3 File */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FileAudio className="h-8 w-8 text-green-400" />
              <div>
                <h3 className="text-lg font-semibold">MP3</h3>
                <p className="text-sm text-gray-400">{mockTrack.files.mp3.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline">{mockTrack.files.mp3.size}</Badge>
              <Badge variant="secondary">Uploaded: {new Date(mockTrack.files.mp3.uploaded).toLocaleDateString()}</Badge>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </Card>

        {/* Session Files */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FileArchive className="h-8 w-8 text-yellow-400" />
              <div>
                <h3 className="text-lg font-semibold">Session Files</h3>
                <p className="text-sm text-gray-400">{mockTrack.files.session.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline">{mockTrack.files.session.size}</Badge>
              <Badge variant="secondary">Uploaded: {new Date(mockTrack.files.session.uploaded).toLocaleDateString()}</Badge>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </Card>

        {/* Stems */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FileArchive className="h-8 w-8 text-purple-400" />
              <div>
                <h3 className="text-lg font-semibold">Stems</h3>
                <p className="text-sm text-gray-400">{mockTrack.files.stems.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline">{mockTrack.files.stems.size}</Badge>
              <Badge variant="secondary">Uploaded: {new Date(mockTrack.files.stems.uploaded).toLocaleDateString()}</Badge>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </Card>

        {/* Cover Art */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ImageIcon className="h-8 w-8 text-red-400" />
              <div>
                <h3 className="text-lg font-semibold">Cover Art</h3>
                <p className="text-sm text-gray-400">{mockTrack.files.coverArt.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline">{mockTrack.files.coverArt.size}</Badge>
              <Badge variant="secondary">Uploaded: {new Date(mockTrack.files.coverArt.uploaded).toLocaleDateString()}</Badge>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </Card>

        {/* Custom Files Section */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <File className="h-8 w-8 text-gray-400" />
              <h3 className="text-lg font-semibold">Custom Files</h3>
            </div>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Custom File
            </Button>
          </div>
          
          <div className="space-y-4">
            {mockTrack.files.custom.map((file) => (
              <div key={file.id} className="flex items-center justify-between bg-zinc-800 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <File className="h-6 w-6 text-gray-400" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-400">Type: {file.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline">{file.size}</Badge>
                  <Badge variant="secondary">Uploaded: {new Date(file.uploaded).toLocaleDateString()}</Badge>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
} 