"use client"

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Play, Pause } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import jsPDF from 'jspdf'

export default function MyBeatsPage() {
  const { user } = useAuth();
  interface BeatWithPurchase {
    id: string;
    title: string;
    producer_id: string;
    cover_art_url?: string;
    mp3_url?: string;
    slug: string;
    producer_name: string;
    license_type?: string;
    price?: number;
    purchase_date?: string;
  }
  const [beats, setBeats] = useState<BeatWithPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentBeat, setCurrentBeat, isPlaying, setIsPlaying } = usePlayer();
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchPurchasedBeats() {
      if (!user) return;
      setLoading(true);
      // 1. Get all purchases for the user
      const { data: purchases, error: purchasesError } = await supabase
        .from("beat_purchases")
        .select("beat_id, license_type, price, purchase_date")
        .eq("user_id", user.id);
      if (purchasesError || !purchases || purchases.length === 0) {
        setBeats([]);
        setLoading(false);
        return;
      }
      const beatIds = purchases.map((p: any) => p.beat_id);
      // 2. Get all beats with those IDs
      const { data: beatsData, error: beatsError } = await supabase
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
      const { data: producersData, error: producersError } = await supabase
        .from("producers")
        .select("user_id, display_name")
        .in("user_id", producerIds);
      const producerMap = (producersData || []).reduce((acc: any, p: any) => {
        acc[p.user_id] = p.display_name;
        return acc;
      }, {});
      // Attach producer name and purchase info to each beat
      const beatsWithInfo: BeatWithPurchase[] = beatsData.map((b: any) => {
        const purchase = purchases.find((p: any) => p.beat_id === b.id) || {};
        return {
          ...b,
          producer_name: producerMap[b.producer_id] || "Unknown",
          license_type: (purchase as any).license_type,
          price: (purchase as any).price,
          purchase_date: (purchase as any).purchase_date
        };
      });
      setBeats(beatsWithInfo);
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

  // License templates
  const LEASE_TERMS = `BEAT LICENSE AGREEMENT (LEASE LICENSE)

This Beat License Agreement ("Agreement") is made on [Date], by and between:

Licensor (Producer): [Your Name / Producer Name]
Licensee (Artist): [Artist's Name]

Beat Title: [Name of Beat]

---

1. GRANT OF LICENSE

Licensor grants Licensee a non-exclusive, non-transferable, non-sublicensable license to use the Beat for one (1) commercial or non-commercial project (e.g., single, mixtape, EP, or small social media content).

---

2. USAGE RIGHTS

Licensee may:

* Distribute up to 5,000 copies/streams across all platforms
* Perform the song live up to 3 times
* Monetize on streaming platforms (e.g., Spotify, Apple Music, YouTube)
* Create one music video (non-televised)

---

3. RESTRICTIONS

Licensee may NOT:

* Sell or license the Beat to any third party
* Claim ownership or copyright of the Beat
* Use the Beat in TV, film, or large commercial projects without an upgraded license
* Exceed the usage limits (requires upgrade to Premium or Exclusive license)

---

4. DELIVERY

The Beat will be delivered in the following formats:
* MP3 (always included)
* WAV (if available)
* Trackouts (Stems) (if available)
* Project Files (if available)

---

5. CREDIT

Licensee agrees to credit the Licensor in all releases as follows:
"Produced by [Your Name / Producer Name]"

---

6. TERMINATION

If Licensee violates the terms of this Agreement, the license is immediately revoked without refund, and all usage must cease.

---

7. OWNERSHIP

Licensor retains full ownership and copyright of the Beat. This license does not transfer any copyright or ownership to the Licensee.

---

8. PAYMENT

The License Fee for this Lease is $[Amount].

---

9. GOVERNING LAW

This Agreement shall be governed by and interpreted under the laws of the United States of America and, where applicable, the laws of the country in which the Licensee resides.

---
`;
  const PREMIUM_LEASE_TERMS = `BEAT LICENSE AGREEMENT (PREMIUM LEASE)

This Beat License Agreement ("Agreement") is made on [Date], by and between:

Licensor (Producer): [Your Name / Producer Name]
Licensee (Artist): [Artist's Name]

Beat Title: [Name of Beat]

---

1. GRANT OF LICENSE

Licensor grants Licensee a non-exclusive, non-transferable, non-sublicensable license to use the Beat for one (1) commercial or non-commercial project (e.g., album, EP, mixtape, YouTube content, podcast, or independent film).

---

2. USAGE RIGHTS

Licensee may:

* Distribute unlimited copies/streams across all platforms
* Monetize on streaming platforms (Spotify, Apple Music, YouTube, etc.)
* Use the Beat in one music video (non-televised or YouTube only)
* Perform the song live an unlimited number of times
* Use the Beat in small to mid-sized commercial projects (e.g., ads, promos, sync placements under $10,000 in budget)

---

3. RESTRICTIONS

Licensee may NOT:

* Sell or license the Beat to any third party
* Claim ownership or copyright of the Beat
* Use the Beat in major commercial projects (e.g., films, TV, large-budget advertising campaigns) without an upgraded Exclusive or Buy Out license
* Exceed the scope of this license without written permission

---

4. DELIVERY

The Beat will be delivered in the following formats:
* MP3 (always included)
* WAV (if available)
* Trackouts (Stems) (if available)
* Project Files (if available)

---

5. CREDIT

Licensee agrees to credit the Licensor in all releases as follows:
"Produced by [Your Name / Producer Name]"

---

6. TERMINATION

If Licensee violates the terms of this Agreement, the license is immediately revoked without refund, and all usage must cease.

---

7. OWNERSHIP

Licensor retains full ownership and copyright of the Beat. This license does not transfer any copyright or ownership to the Licensee.

---

8. PAYMENT

The License Fee for this Premium Lease is $[Amount].

---

9. GOVERNING LAW

This Agreement shall be governed by and interpreted under the laws of the United States of America and, where applicable, the laws of the country in which the Licensee resides.

---
`;
  const EXCLUSIVE_TERMS = `BEAT LICENSE AGREEMENT (EXCLUSIVE LICENSE)

This Beat License Agreement ("Agreement") is made on [Date], by and between:

Licensor (Producer): [Your Name / Producer Name]
Licensee (Artist): [Artist's Name]

Beat Title: [Name of Beat]

---

1. GRANT OF LICENSE

Licensor grants Licensee an exclusive, non-transferable, non-sublicensable license to use the Beat for one (1) commercial or non-commercial project (e.g., album, single, film, podcast, commercial, or any media).

Upon purchase, the Beat will no longer be available for lease, exclusive, or sale to any other party.

---

2. USAGE RIGHTS

Licensee may:

* Distribute unlimited copies/streams across all platforms
* Monetize on streaming platforms (Spotify, Apple Music, YouTube, etc.)
* Use the Beat in unlimited music videos, films, TV, commercials, podcasts, and live performances
* Retain all master rights for the final song
* Sync the Beat in any project without limitations (budget, reach, or media type)

---

3. RESTRICTIONS

Licensee may NOT:

* Sell, transfer, or sublicense the Beat as-is (e.g., reselling the Beat for profit)
* Claim the underlying composition copyright of the Beat (unless a full Buy Out is purchased)

---

4. DELIVERY

The Beat will be delivered in the following formats:
* MP3 (always included)
* WAV (if available)
* Trackouts (Stems) (if available)
* Project Files (if available)

---

5. CREDIT

Licensee agrees to credit the Licensor in all releases as follows:
"Produced by [Your Name / Producer Name]"

---

6. OWNERSHIP & COPYRIGHT

Licensor retains copyright ownership of the Beat (the musical composition and underlying work).
Licensee holds exclusive rights to commercially exploit the Beat as per this Agreement.

This is a license, not a copyright transfer. If full copyright transfer is desired, a separate Buy Out agreement must be executed.

---

7. PAYMENT

The License Fee for this Exclusive License is $[Amount].

---

8. GOVERNING LAW

This Agreement shall be governed by and interpreted under the laws of the United States of America and, where applicable, the laws of the country in which the Licensee resides.

---
`;
  const BUYOUT_TERMS = `BEAT LICENSE AGREEMENT (BUY OUT / FULL RIGHTS LICENSE)

This Beat License Agreement ("Agreement") is made on [Date], by and between:

Licensor (Producer): [Your Name / Producer Name]
Licensee (Artist): [Artist's Name]

Beat Title: [Name of Beat]

---

1. GRANT OF LICENSE & FULL RIGHTS TRANSFER

Licensor agrees to sell and transfer to Licensee all rights, title, and interest in and to the Beat, including but not limited to:

* Full copyright ownership
* All publishing rights
* All master rights
* All reproduction, distribution, and modification rights

This is a permanent, one-time transfer. The Licensor relinquishes all rights to the Beat upon completion of payment.

---

2. USAGE RIGHTS

Licensee may:

* Use, distribute, modify, and monetize the Beat without limitation
* Claim full ownership of the Beat in any form (e.g., as part of a song, instrumental, soundtrack, film, advertisement, video game, etc.)
* Resell, license, or sublicense the Beat at their discretion
* Register the Beat with any copyright office, PRO, or sync platform as their own

---

3. DELIVERY

The Beat will be delivered in the following formats:
* MP3 (always included)
* WAV (if available)
* Trackouts (Stems) (if available)
* Project Files (if available)

---

4. CREDIT

Credit to the Licensor is not required, but is appreciated when reasonable. Suggested credit:
"Produced by [Your Name / Producer Name]"

---

5. PAYMENT

The total fee for this Buy Out License is $[Amount].

Full payment is required before transfer of rights. No refunds will be issued after delivery of files.

---

6. REPRESENTATIONS

Licensor guarantees that the Beat is original, free of third-party samples requiring clearance (unless otherwise disclosed in writing), and that the Licensor has full rights to sell and transfer ownership.

---

7. GOVERNING LAW

This Agreement shall be governed by and interpreted under the laws of the United States of America and, where applicable, the laws of the country in which the Licensee resides.

---
`;

  function getLicenseTemplate(licenseType: string | undefined) {
    switch (licenseType) {
      case 'Lease':
        return LEASE_TERMS;
      case 'Premium Lease':
        return PREMIUM_LEASE_TERMS;
      case 'Exclusive':
        return EXCLUSIVE_TERMS;
      case 'Buy Out':
        return BUYOUT_TERMS;
      default:
        return LEASE_TERMS;
    }
  }

  function handleDownloadContract(beat: BeatWithPurchase) {
    let buyerName = 'Artist';
    if (user && typeof (user as any).display_name === 'string' && (user as any).display_name) {
      buyerName = (user as any).display_name;
    } else if (user?.email) {
      buyerName = user.email.split('@')[0];
    }
    const producerName = beat.producer_name || 'Producer';
    const beatTitle = beat.title || '[Name of Beat]';
    const purchaseDate = beat.purchase_date ? new Date(beat.purchase_date).toLocaleDateString() : new Date().toLocaleDateString();
    const licenseTemplate = getLicenseTemplate(beat.license_type);
    const licenseWithNames = licenseTemplate
      .replace(/\[Your Name \/ Producer Name\]/g, producerName)
      .replace(/\[Artist's Name\]/g, buyerName)
      .replace(/\[Name of Beat\]/g, beatTitle)
      .replace(/\[Date\]/g, purchaseDate)
      .replace(/\[Amount\]/g, beat.price?.toString() || '0');
    const doc = new jsPDF();
    doc.setFont('courier', 'normal');
    doc.setFontSize(10);
    doc.text(licenseWithNames, 10, 20, { maxWidth: 180 });
    doc.save(`${beatTitle}-license-agreement.pdf`);
  }

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
                  <div className="w-40 h-40 mb-4 relative">
                    <Link href={`/beat/${beat.slug}`}>
                      <Image
                        src={beat.cover_art_url || "/placeholder.svg"}
                        alt={beat.title}
                        width={160}
                        height={160}
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
                      Download MP3
                    </a>
                  </Button>
                  <Button onClick={() => handleDownloadContract(beat)} className="w-full mt-2 bg-secondary text-white font-medium hover:bg-primary">
                    Download Contract
                  </Button>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
} 