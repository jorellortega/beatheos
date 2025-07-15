import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Image from 'next/image';
import Link from 'next/link';
import { UserPlus, UserMinus } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface UserProfileButtonProps {
  user: {
    id: string;
    name: string;
    role: string;
    avatar: string;
  };
  isFollowing?: boolean;
  onFollowToggle?: (userId: string) => void;
}

export function UserProfileButton({ user, isFollowing = false, onFollowToggle }: UserProfileButtonProps) {
  const [artistSlug, setArtistSlug] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchArtistSlug() {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('artists')
        .select('slug')
        .eq('user_id', user.id)
        .maybeSingle();
      if (isMounted) {
        setArtistSlug(data?.slug || null);
      }
    }
    fetchArtistSlug();
    return () => { isMounted = false; };
  }, [user?.id]);

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center justify-center border-2 border-yellow-400 rounded-md px-6 py-2 bg-black">
        {artistSlug ? (
          <Link href={`/artist/${artistSlug}`} className="font-semibold text-primary text-lg hover:underline">
            {user.name}
          </Link>
        ) : (
          <h3 className="font-semibold text-primary text-lg">{user.name}</h3>
        )}
      </div>
      {!isFollowing && (
        <Button
          onClick={() => onFollowToggle && onFollowToggle(user.id)}
          className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-4 py-2 rounded flex items-center gap-2 shadow-none"
          style={{ minWidth: 0, width: 48, height: 40, justifyContent: 'center' }}
          aria-label="Follow"
        >
          <UserPlus className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
} 