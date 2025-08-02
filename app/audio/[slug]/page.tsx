"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileAudio, FileMusic, File, Drum, Music2, Piano } from 'lucide-react';
import Link from "next/link";

// Mock data for audio library item with subfiles
const mockAudioLibraryDetail = {
  id: '1',
  slug: 'trap-drum-kit',
  name: 'Trap Drum Kit',
  type: 'soundkit',
  description: 'Essential trap drums for modern beats.',
  files: [
    { id: 'a', name: 'Kick.wav', type: 'sample', size: '1.2 MB', url: '#' },
    { id: 'b', name: 'Snare.wav', type: 'sample', size: '900 KB', url: '#' },
    { id: 'c', name: 'HiHat.wav', type: 'sample', size: '700 KB', url: '#' },
    { id: 'd', name: 'Perc Loop 01.wav', type: 'loop', size: '2.1 MB', url: '#' },
    { id: 'e', name: '808 Bass.wav', type: 'sample', size: '1.5 MB', url: '#' },
  ],
};

export default function AudioLibraryDetailPage() {
  const params = useParams() || {};
  const slug = params && 'slug' in params ? (Array.isArray(params.slug) ? params.slug[0] : params.slug) : '';
  // In a real app, fetch by slug. Here, always show mock data.
  const item = mockAudioLibraryDetail;

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Link href="/mylibrary">
        <Button variant="outline" className="mb-6">&larr; Back to Library</Button>
      </Link>
      <Card className="mb-8 bg-black border-primary">
        <CardHeader>
          <CardTitle className="text-2xl text-primary font-bold">{item.name}</CardTitle>
          <CardDescription className="capitalize text-gray-400 mb-2">{item.type}</CardDescription>
          <p className="text-base text-white mb-2">{item.description}</p>
        </CardHeader>
        <CardContent>
          <h3 className="text-lg font-semibold mb-4 text-primary">Files in this {item.type}</h3>
          <div className="space-y-3">
            {item.files.map((file) => (
              <div key={file.id} className="flex items-center justify-between bg-zinc-900 rounded p-3">
                <div className="flex items-center gap-3">
                  {file.type === 'sample' && <FileAudio className="h-5 w-5 text-purple-400" />}
                  {file.type === 'loop' && <FileMusic className="h-5 w-5 text-blue-400" />}
                  {file.type === 'midi' && <Piano className="h-5 w-5 text-yellow-400" />}
                  {file.type === 'patch' && <Music2 className="h-5 w-5 text-green-400" />}
                  {file.type === 'other' && <File className="h-5 w-5 text-gray-400" />}
                  <span className="font-medium text-white">{file.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-400">{file.size}</span>
                  <Button variant="outline" size="sm" asChild>
                    <a href={file.url} download>
                      Download
                    </a>
                  </Button>
                  <Link href={`/audio/${item.slug}/${file.id}`}>
                    <Button variant="default" size="sm" className="ml-2">View</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 