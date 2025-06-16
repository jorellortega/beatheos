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
    <div className="flex items-center gap-4">
      <div className="flex items-center justify-center border-2 border-yellow-400 rounded-md px-6 py-2 bg-black">
        <h3 className="font-semibold text-primary text-lg">{user.name}</h3>
      </div>
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
  );
} 