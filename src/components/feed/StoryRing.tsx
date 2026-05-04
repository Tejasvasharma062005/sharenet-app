/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { Plus } from 'lucide-react';
import { Donation, User } from '@/types';

interface StoryRingProps {
  donation?: Donation;
  user?: User;
  isCurrentUser?: boolean;
  onClick?: () => void;
}

export function StoryRing({ donation, user, isCurrentUser, onClick }: StoryRingProps) {
  const photoUrl = isCurrentUser ? user?.avatar_url : donation?.photo_url;
  const displayName = isCurrentUser ? 'Your Story' : (donation?.donor?.full_name || 'Donor');
  
  return (
    <div 
      className="flex flex-col items-center cursor-pointer flex-shrink-0"
      onClick={onClick}
    >
      <div className={`w-16 h-16 rounded-full p-[2px] ${isCurrentUser ? 'bg-muted border-2 border-dashed border-muted-foreground/30' : 'bg-gradient-to-tr from-action-green to-urgency-orange'}`}>
        <div className="w-full h-full rounded-full border-2 border-background overflow-hidden bg-muted flex items-center justify-center relative">
          {photoUrl ? (
            <img 
              src={photoUrl} 
              alt={displayName} 
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm font-bold text-muted-foreground">
              {isCurrentUser ? (user?.full_name?.charAt(0) || 'Y') : (donation?.donor?.full_name?.charAt(0) || 'D')}
            </span>
          )}
          {isCurrentUser && (
            <div className="absolute bottom-0 right-0 bg-[var(--color-action-green)] text-white rounded-full p-0.5 border-2 border-background">
              <Plus size={12} strokeWidth={3} />
            </div>
          )}
        </div>
      </div>
      <span className={`text-[10px] mt-1 font-medium truncate w-16 text-center ${isCurrentUser ? 'text-muted-foreground' : 'text-foreground'}`}>
        {displayName}
      </span>
    </div>
  );
}
