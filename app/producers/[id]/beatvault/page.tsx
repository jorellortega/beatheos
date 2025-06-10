"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Play, Pause, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import { usePlayer } from '@/contexts/PlayerContext';

interface Beat {
  id: string | number;
  title: string;
  genre?: string;
  bpm?: number;
  cover_art_url?: string;
  mp3_url?: string;
  price?: number;
}

export default function ProducerBeatVault() {
  const params = useParams();
  if (!params) return null;
  const producerId = params.id as string;
  const [inputKey, setInputKey] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(false);
  const [producerName, setProducerName] = useState("");
  const { currentBeat, setCurrentBeat, isPlaying, setIsPlaying } = usePlayer();

  // Fetch producer's vault key
  const verifyKey = async () => {
    setLoading(true);
    const { data: producer, error } = await supabase
      .from('producers')
      .select('vault_key, display_name')
      .eq('id', producerId)
      .single();
    setLoading(false);
    if (error || !producer) {
      toast.error("Producer not found");
      return;
    }
    setProducerName(producer.display_name || "Producer");
    if (inputKey === producer.vault_key) {
      setIsVerified(true);
      localStorage.setItem(`beatvault_verified_${producerId}`, 'true');
    } else {
      toast.error("Invalid vault key");
    }
  };

  useEffect(() => {
    // Check if already verified for this producer
    const verified = localStorage.getItem(`beatvault_verified_${producerId}`);
    if (verified === 'true') {
      setIsVerified(true);
    }
  }, [producerId]);

  useEffect(() => {
    if (isVerified) {
      fetchBeats();
    }
    // eslint-disable-next-line
  }, [isVerified]);

  const fetchBeats = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('beats')
      .select('*')
      .eq('beatvault', true)
      .order('created_at', { ascending: false });
    setLoading(false);
    console.log('ALL VAULT BEATS:', data, error);
    if (error) {
      toast.error('Error fetching beats');
      return;
    }
    setBeats(data || []);
  };

  const handlePlayPause = (beat: Beat) => {
    if (currentBeat?.id === beat.id && isPlaying) {
      setIsPlaying(false);
    } else {
      setCurrentBeat({
        id: beat.id.toString(),
        title: beat.title,
        artist: producerName,
        audioUrl: beat.mp3_url || '',
        image: beat.cover_art_url || '',
        slug: beat.id.toString(),
        producers: [],
      });
      setIsPlaying(true);
    }
  };

  const handleBuy = (beat: Beat) => {
    // TODO: Connect to your purchase modal/logic
    alert(`Buy beat: ${beat.title}`);
  };

  if (!isVerified) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Enter Vault Key</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                type="password"
                placeholder="Enter vault key"
                value={inputKey}
                onChange={e => setInputKey(e.target.value)}
                disabled={loading}
              />
              <Button onClick={verifyKey} className="w-full" disabled={loading}>
                Access Vault
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{producerName}&apos;s Beat Vault</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {beats.length === 0 ? (
            <div className="col-span-full text-gray-400">No vault beats found.</div>
          ) : (
            beats.map((beat) => (
              <Card key={beat.id} className="hover:shadow-lg transition-shadow bg-black border border-primary">
                <div className="relative w-full aspect-square">
                  <Image
                    src={beat.cover_art_url || "/placeholder.svg"}
                    alt={beat.title}
                    width={400}
                    height={400}
                    className="w-full h-full object-cover rounded-t"
                  />
                  <button
                    className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 transition focus:outline-none z-10"
                    onClick={() => handlePlayPause(beat)}
                    aria-label="Play"
                    type="button"
                  >
                    {currentBeat?.id === beat.id && isPlaying ? (
                      <Pause className="h-10 w-10 text-white" />
                    ) : (
                      <Play className="h-10 w-10 text-white" />
                    )}
                  </button>
                </div>
                <CardHeader>
                  <CardTitle className="truncate">{beat.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 mb-2">{beat.genre}</p>
                  <p className="text-sm text-gray-500 mb-2">BPM: {beat.bpm}</p>
                  <div className="flex items-center justify-between mt-4">
                    <Button
                      className="gradient-button text-black font-medium hover:text-white flex-1 mr-2"
                      onClick={() => handleBuy(beat)}
                    >
                      <ShoppingCart className="h-5 w-5 mr-1" /> Buy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
} 