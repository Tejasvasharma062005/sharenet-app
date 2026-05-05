'use client';

import React, { useState } from 'react';
import { PostCard } from '@/components/feed/PostCard';
import { StoryRing } from '@/components/feed/StoryRing';
import { useRealtimeFeed } from '@/hooks/useRealtimeFeed';
import { useUserStore } from '@/store/useUserStore';
import { Loader2, RefreshCw, SlidersHorizontal, Map as MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Donation } from '@/types';

const CATEGORIES = ['All', 'Food', 'Clothing', 'Goods', 'Other'];

export default function FeedPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const router = useRouter();
  const { user } = useUserStore();

  const { donations, isLoading, error, refetch } = useRealtimeFeed({
    category: selectedCategory === 'All' ? undefined : selectedCategory,
    urgentOnly,
  });

  // Group all donations by donor — one ring per person (WhatsApp-style)
  const myDonations = donations.filter(d => d.donor_id === user?.id);

  // Group OTHER donors' donations into a map: donorId -> Donation[]
  const otherDonorMap = new Map<string, Donation[]>();
  donations
    .filter(d => d.donor_id !== user?.id)
    .forEach(d => {
      const key = d.donor_id ?? d.id;
      if (!otherDonorMap.has(key)) otherDonorMap.set(key, []);
      otherDonorMap.get(key)!.push(d);
    });

  return (
    <div className="w-full">
      {/* Story Rings — one per donor (WhatsApp-style grouping) */}
      <div className="flex space-x-4 p-4 overflow-x-auto border-b bg-card scrollbar-hide">
        {/* Current user always shown first */}
        {user && (
          <StoryRing
            isCurrentUser
            user={user}
            donations={myDonations}
            onClick={() => router.push('/my-donations')}
          />
        )}
        {/* One ring per OTHER donor */}
        {Array.from(otherDonorMap.entries()).map(([donorId, donorDonations]) => (
          <StoryRing key={`story-donor-${donorId}`} donations={donorDonations} />
        ))}
      </div>

      {/* Filter Bar */}
      <div className="sticky top-16 z-10 bg-background/95 backdrop-blur-md border-b px-4 py-2 flex items-center justify-between overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-all
                ${selectedCategory === cat
                  ? 'bg-[var(--color-action-green)] text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
            >
              {cat}
            </button>
          ))}
          <button
            onClick={() => setUrgentOnly(prev => !prev)}
            className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-all ml-1
              ${urgentOnly
                ? 'bg-[var(--color-urgency-orange)] text-white shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
          >
            ⚡ Urgent
          </button>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-full gap-2 border-[var(--color-action-green)] text-[var(--color-action-green)] ml-4"
          onClick={() => router.push('/map')}
        >
          <MapIcon className="h-4 w-4" />
          Map View
        </Button>
      </div>

      {/* Main Feed */}
      <div className="p-4 md:p-6 bg-muted/20 min-h-screen">
        <div className="max-w-2xl mx-auto w-full">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin h-8 w-8 text-[var(--color-urgency-orange)]" />
            </div>
          ) : error ? (
            <div className="text-center py-12 bg-card rounded-xl border">
              <p className="text-destructive font-medium mb-3">{error}</p>
              <Button variant="outline" onClick={refetch} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          ) : donations.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border">
              <p className="text-muted-foreground font-medium">No donations match your filters.</p>
              <p className="text-sm text-muted-foreground mt-1">Try a different category or check back soon.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-3 font-medium">
                {donations.length} donation{donations.length !== 1 ? 's' : ''} nearby · sorted by urgency
              </p>
              <div className="flex flex-col gap-4">
                {donations.map(donation => (
                  <PostCard
                    key={donation.id}
                    donation={donation}
                    onClaim={(id) => console.log('Claimed', id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
