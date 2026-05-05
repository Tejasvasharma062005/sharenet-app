'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserStore } from '@/store/useUserStore';
import { Donation } from '@/types';
import { PostCard } from '@/components/feed/PostCard';
import { Package, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MyDonationsPage() {
  const { user } = useUserStore();
  const [myDonations, setMyDonations] = useState<Donation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyDonations = useCallback(async () => {
    if (!user) return;
    // Avoid synchronous setState in effect
    await Promise.resolve();
    setIsLoading(true);
    setError(null);
    try {
      let data;
      if (user.role === 'donor') {
        const { data: donorData, error: donorError } = await supabase
          .from('donations')
          .select('*, donor:users!donor_id(*)')
          .eq('donor_id', user.id)
          .order('created_at', { ascending: false });
        if (donorError) throw donorError;
        data = donorData;
      } else if (user.role === 'ngo') {
        const { data: claimData, error: claimError } = await supabase
          .from('claims')
          .select('donation:donations(*, donor:users!donor_id(*))')
          .eq('claimed_by', user.id)
          .order('claim_timestamp', { ascending: false });
        if (claimError) throw claimError;
        data = (claimData || []).map(c => c.donation).filter(Boolean);
      } else if (user.role === 'volunteer') {
        const { data: deliveryData, error: deliveryError } = await supabase
          .from('deliveries')
          .select('donation:donations(*, donor:users!donor_id(*))')
          .eq('volunteer_id', user.id)
          .neq('status', 'delivered');
        if (deliveryError) throw deliveryError;
        data = (deliveryData || []).map(d => d.donation).filter(Boolean);
      }
      setMyDonations(data as Donation[] || []);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load your donations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMyDonations();
  }, [fetchMyDonations]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin h-8 w-8 text-[var(--color-urgency-orange)]" />
      </div>
    );
  }

  const donationsLabel = {
    donor: 'My Posted Donations',
    ngo: 'My Claimed Donations',
    volunteer: 'My Assigned Deliveries',
    admin: 'All Platform Activity',
  }[user.role] || 'Activity';

  return (
    <div className="w-full max-w-2xl mx-auto p-4 md:p-6 mb-20 md:mb-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-[var(--color-action-green)]/10 rounded-lg">
          <Package className="h-6 w-6 text-[var(--color-action-green)]" />
        </div>
        <h1 className="text-2xl font-bold">{donationsLabel}</h1>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin h-10 w-10 text-[var(--color-urgency-orange)] mb-4" />
          <p className="text-muted-foreground animate-pulse">Loading your history...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-destructive/20 shadow-sm">
          <p className="text-destructive font-medium mb-4">{error}</p>
          <Button onClick={fetchMyDonations} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      ) : myDonations.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-dashed shadow-sm">
          <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="h-8 w-8 text-muted-foreground opacity-50" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No donations found</h3>
          <p className="text-muted-foreground text-sm max-w-[250px] mx-auto">
            {user.role === 'donor' 
              ? "You haven't posted any donations yet. Start by sharing something!" 
              : "No donations in your list yet."}
          </p>
          {user.role === 'donor' && (
            <Button 
              className="mt-6 bg-[var(--color-action-green)] hover:bg-[var(--color-action-green)]/90"
              onClick={() => window.location.href = '/post'}
            >
              Post a Donation
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground font-medium mb-1">
            Showing {myDonations.length} item{myDonations.length !== 1 ? 's' : ''}
          </p>
          {myDonations.map(donation => (
            <PostCard key={donation.id} donation={donation} />
          ))}
        </div>
      )}
    </div>
  );
}
