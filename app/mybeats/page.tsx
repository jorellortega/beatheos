"use client"

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Play, Pause } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function MyBeatsPage() {
  const { user } = useAuth();
  const [beats, setBeats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentBeat, setCurrentBeat, isPlaying, setIsPlaying } = usePlayer();
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchPurchasedBeats() {
      if (!user) return;
      setLoading(true);
      // 1. Get all purchases for the user
      const { data: purchases, error: purchasesError } = await getSupabaseClient()
        .from("beat_purchases")
        .select("beat_id")
        .eq("user_id", user.id);
      if (purchasesError || !purchases || purchases.length === 0) {
        setBeats([]);
        setLoading(false);
        return;
      }
      const beatIds = purchases.map((p: any) => p.beat_id);
      // 2. Get all beats with those IDs
      const { data: beatsData, error: beatsError } = await getSupabaseClient()
        .from("beats")
        .select("id, title, producer_id, cover_art_url, mp3_url, slug")
        .in("id", beatIds);
      if (beatsError || !beatsData || beatsData.length === 0) {
        setBeats([]);
        setLoading(false);
        return;
      }
      // 3. Fetch producer display names
      const producerIds = Array.from(new Set(beatsData.map((b: any) => b.producer_id)));
      const { data: producersData, error: producersError } = await getSupabaseClient()
        .from("producers")
        .select("user_id, display_name")
        .in("user_id", producerIds);
      const producerMap = (producersData || []).reduce((acc: any, p: any) => {
        acc[p.user_id] = p.display_name;
        return acc;
      }, {});
      // Attach producer name to each beat
      const beatsWithProducer = beatsData.map((b: any) => ({
        ...b,
        producer_name: producerMap[b.producer_id] || "Unknown"
      }));
      setBeats(beatsWithProducer);
      setLoading(false);
    }
    fetchPurchasedBeats();
  }, [user]);

  const handlePlayPause = (beat: any) => {
    if (currentBeat && currentBeat.id === beat.id && isPlaying) {
      setIsPlaying(false);
    } else {
      setCurrentBeat({
        id: beat.id,
        title: beat.title,
        artist: beat.producer_id, // You can fetch display_name if needed
        audioUrl: beat.mp3_url,
        image: beat.cover_art_url,
      });
      setIsPlaying(true);
    }
  };

  if (!user) {
    return <div className="container mx-auto px-4 py-8 text-center text-gray-400">Please log in to view your beats.</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 font-display tracking-wider text-primary">My Beats</h1>
      <div className="mb-6 flex items-center max-w-md mx-auto relative">
        <Input
          type="text"
          placeholder="Search by title or producer..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 bg-secondary text-white focus:bg-accent w-full"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
      </div>
      {beats.length === 0 ? (
        <div className="text-gray-400 text-center">You have not purchased any beats yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {beats
            .filter(
              (beat) =>
                beat.title.toLowerCase().includes(search.toLowerCase()) ||
                beat.producer_name.toLowerCase().includes(search.toLowerCase())
            )
            .map((beat) => {
              const isThisPlaying = currentBeat && currentBeat.id === beat.id && isPlaying;
              return (
                <div key={beat.id} className={`bg-card border border-primary rounded-lg p-4 flex flex-col items-center ${isThisPlaying ? 'ring-2 ring-yellow-400' : ''}`}>
                  <div className="w-32 h-32 mb-4 relative">
                    <Link href={`/beat/${beat.slug}`}>
                      <Image
                        src={beat.cover_art_url || "/placeholder.svg"}
                        alt={beat.title}
                        width={128}
                        height={128}
                        className="rounded object-cover w-full h-full cursor-pointer hover:opacity-80 transition"
                      />
                    </Link>
                  </div>
                  <Button
                    onClick={() => handlePlayPause(beat)}
                    size="icon"
                    variant="secondary"
                    className="mx-auto mb-2 mt-2 h-12 w-12 flex items-center justify-center"
                  >
                    {isThisPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
                  </Button>
                  <div className="font-semibold text-lg text-white text-center mb-1">{beat.title}</div>
                  <div className="text-sm text-gray-400 mb-4">
                    By {" "}
                    <Link href={`/producers/${beat.producer_id}`} className="text-gray-400 hover:text-yellow-400">
                      {beat.producer_name}
                    </Link>
                  </div>
                  <Button asChild className="w-full gradient-button text-black font-medium hover:text-white">
                    <a href={beat.mp3_url} download>
                      Download
                    </a>
                  </Button>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
} 