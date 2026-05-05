/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { Plus } from 'lucide-react';
import { Donation, User } from '@/types';

interface StoryRingProps {
  /** Grouped donations for one donor (all shown as one ring, like WhatsApp status) */
  donations?: Donation[];
  user?: User;
  isCurrentUser?: boolean;
  onClick?: () => void;
}

export function StoryRing({ donations = [], user, isCurrentUser, onClick }: StoryRingProps) {
  const hasDonations = donations.length > 0;
  const photoUrl = isCurrentUser
    ? user?.avatar_url
    : donations[0]?.photo_url ?? null;

  const displayName = isCurrentUser
    ? 'Your Story'
    : (donations[0]?.donor?.full_name?.split(' ')[0] || 'Donor');

  const initial = isCurrentUser
    ? (user?.full_name?.charAt(0)?.toUpperCase() || 'Y')
    : (donations[0]?.donor?.full_name?.charAt(0)?.toUpperCase() || 'D');

  // Show up to 5 dot indicators for grouped donations
  const dotCount = Math.min(donations.length, 5);

  return (
    <div
      className="flex flex-col items-center cursor-pointer flex-shrink-0 group"
      onClick={onClick}
    >
      {/* Gradient ring — always shown for others; shown for current user only if they have donations */}
      <div className={`w-16 h-16 rounded-full p-[2.5px] transition-transform duration-200 group-hover:scale-105
        ${isCurrentUser && !hasDonations
          ? 'bg-muted border-2 border-dashed border-muted-foreground/40'
          : 'bg-gradient-to-tr from-[var(--color-action-green)] via-emerald-400 to-[var(--color-urgency-orange)]'
        }`}
      >
        <div className="w-full h-full rounded-full border-[2.5px] border-background overflow-hidden bg-muted flex items-center justify-center relative">
          {photoUrl ? (
            <img src={photoUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-base font-bold text-muted-foreground select-none">{initial}</span>
          )}

          {/* Clearly visible + badge for current user */}
          {isCurrentUser && (
            <div className="absolute bottom-0 right-0 w-[22px] h-[22px] flex items-center justify-center bg-[var(--color-action-green)] text-white rounded-full border-2 border-background shadow-lg">
              <Plus size={12} strokeWidth={3.5} />
            </div>
          )}
        </div>
      </div>

      {/* Label */}
      <span className="text-[10px] mt-1.5 font-semibold truncate w-16 text-center text-foreground leading-tight">
        {displayName}
      </span>

      {/* Dot indicators for grouped donations (WhatsApp-style) */}
      {dotCount > 0 && (
        <div className="flex gap-[3px] mt-0.5">
          {Array.from({ length: dotCount }).map((_, i) => (
            <span key={i} className="w-[5px] h-[5px] rounded-full bg-[var(--color-action-green)]" />
          ))}
        </div>
      )}
    </div>
  );
}
