import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Image from 'next/image';
import Link from 'next/link';
import { UserPlus, UserMinus } from 'lucide-react';

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
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card className="bg-black border-primary hover:border-primary/80 transition-all">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <Link href={`/profile/${user.id}`} className="flex items-center gap-3">
            <Image
              src={user.avatar}
              alt={user.name}
              width={40}
              height={40}
              className="rounded-full object-cover border border-primary"
            />
            <div>
              <h3 className="font-semibold text-primary">{user.name}</h3>
              <p className="text-sm text-gray-400 capitalize">{user.role}</p>
            </div>
          </Link>
          {!isFollowing && (
            <Button
              onClick={() => onFollowToggle(user.id)}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-4 py-2 rounded flex items-center gap-2 shadow-none"
              style={{ minWidth: 0, width: 48, height: 40, justifyContent: 'center' }}
              aria-label="Follow"
            >
              <UserPlus className="h-5 w-5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 