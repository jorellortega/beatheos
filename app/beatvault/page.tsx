"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const VAULT_KEY = '3114SF!'; // This should be stored in environment variables in production

interface Beat {
  id: string | number
  slug: string
  title: string
  plays: number
  isTopBeat: boolean
  price: number
  price_lease: number
  price_premium_lease: number
  price_exclusive: number
  price_buyout: number
  audioUrl: string
  producers: {
    display_name: string
    slug: string
  }[]
  producer_names: string[]
  producer_slugs: string[]
  isTopPlayed?: boolean
  cover: string
  cover_art_url: string
  producer_ids?: string[]
  genre?: string
  bpm?: number
}

export default function BeatVault() {
  const [isVerified, setIsVerified] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [beats, setBeats] = useState<Beat[]>([]);
  const router = useRouter();

  const verifyKey = () => {
    if (inputKey === VAULT_KEY) {
      setIsVerified(true);
      localStorage.setItem('beatvault_verified', 'true');
    } else {
      toast.error('Invalid vault key');
    }
  };

  useEffect(() => {
    const verified = localStorage.getItem('beatvault_verified');
    if (verified === 'true') {
      setIsVerified(true);
    }
  }, []);

  useEffect(() => {
    if (isVerified) {
      fetchBeats();
    }
  }, [isVerified]);

  const fetchBeats = async () => {
    const { data, error } = await supabase
      .from('beats')
      .select('*')
      .eq('beatvault', true)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Error fetching beats');
      return;
    }

    setBeats(data || []);
  };

  if (!isVerified) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Beat Vault Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                type="password"
                placeholder="Enter vault key"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
              />
              <Button onClick={verifyKey} className="w-full">
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
      <h1 className="text-3xl font-bold mb-8">Beat Vault</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {beats.map((beat) => (
          <Card key={beat.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
              <CardTitle>{beat.title}</CardTitle>
                </CardHeader>
                <CardContent>
              <p className="text-sm text-gray-500 mb-2">{beat.genre}</p>
              <p className="text-sm text-gray-500 mb-4">BPM: {beat.bpm}</p>
              <Button
                onClick={() => router.push(`/beats/${beat.id}`)}
                className="w-full"
              >
                View Beat
              </Button>
                </CardContent>
              </Card>
        ))}
      </div>
    </div>
  );
} 