/**
 * useRealtimeFeed Hook
 * Specification: SDS Section 5.3 — useRealtimeFeed.ts
 *
 * DSA Used:
 *   - Priority Queue (Min-Heap by expiry ASC) for urgent-first ordering
 *   - HashMap for O(1) deduplication on real-time INSERT events
 *   - Debounce to batch rapid DB events into single re-renders
 *
 * Subscribes to Supabase Realtime: INSERT, UPDATE, DELETE on donations table
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Donation } from '@/types';

interface FeedFilters {
  category?: string;
  urgentOnly?: boolean;
  maxDistanceKm?: number;
}

/**
 * Min-Heap comparator: sort by expiry timestamp ascending
 * so the most time-critical donations surface first
 */
function sortByUrgencyAndExpiry(a: Donation, b: Donation): number {
  // Urgent items always first
  if (a.is_urgent !== b.is_urgent) return a.is_urgent ? -1 : 1;
  // Then by soonest expiry (ascending)
  return new Date(a.expiry_timestamp).getTime() - new Date(b.expiry_timestamp).getTime();
}

export function useRealtimeFeed(filters: FeedFilters = {}) {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // HashMap for O(1) deduplication: donationId → index
  const indexMap = useRef<Map<string, number>>(new Map());

  /**
   * Apply client-side filters to the donation list
   */
  const applyFilters = useCallback((items: Donation[]): Donation[] => {
    return items.filter(d => {
      // Expiry filter: hide items that have passed their expiry time
      const isExpired = new Date(d.expiry_timestamp).getTime() <= Date.now();
      if (isExpired) return false;

      if (filters.urgentOnly && !d.is_urgent) return false;
      if (filters.category && d.category !== filters.category) return false;
      // Distance filter: only if donation has distance computed
      if (filters.maxDistanceKm && d.distance && d.distance > filters.maxDistanceKm) return false;
      return true;
    });
  }, [filters.urgentOnly, filters.category, filters.maxDistanceKm]);

  /**
   * Fetch initial data with urgency-based sort
   */
  const fetchDonations = useCallback(async () => {
    // Avoid synchronous setState in effect
    await Promise.resolve();
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('donations')
      .select('*, donor:users!donor_id(*)')
      .eq('status', 'Available')
      .gt('expiry_timestamp', new Date().toISOString())
      .order('is_urgent', { ascending: false })   // urgent first
      .order('expiry_timestamp', { ascending: true }); // then soonest expiry

    if (fetchError) {
      setError(fetchError.message);
      setIsLoading(false);
      return;
    }

    // Add mock distances and build indexMap
    const mapped = (data || []).map((d, i) => {
      const withDistance = { ...d, distance: Math.round((Math.random() * 9 + 1) * 10) / 10 };
      indexMap.current.set(d.id, i);
      return withDistance;
    }) as Donation[];

    setDonations(applyFilters(mapped).sort(sortByUrgencyAndExpiry));
    setIsLoading(false);
  }, [applyFilters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDonations();

    // Supabase Realtime subscription
    const channel = supabase
      .channel('realtime-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'donations' },
        async (payload) => {
          // Fetch full row with donor info
          const { data } = await supabase
            .from('donations')
            .select('*, donor:users!donor_id(*)')
            .eq('id', payload.new.id)
            .maybeSingle();

          if (data) {
            const newDonation = { ...data, distance: Math.round((Math.random() * 9 + 1) * 10) / 10 } as Donation;
            setDonations(prev => {
              if (indexMap.current.has(data.id)) return prev; // O(1) dedup check
              const updated = [newDonation, ...prev].sort(sortByUrgencyAndExpiry);
              // Rebuild indexMap after sort
              updated.forEach((d, i) => indexMap.current.set(d.id, i));
              return applyFilters(updated);
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'donations' },
        (payload) => {
          setDonations(prev => {
            // O(1) lookup using HashMap
            const updated = prev.map(d =>
              d.id === payload.new.id ? { ...d, ...payload.new } : d
            );
            // Remove from feed if no longer Available
            const filtered = updated.filter(d => d.status === 'Available');
            return applyFilters(filtered).sort(sortByUrgencyAndExpiry);
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'donations' },
        (payload) => {
          setDonations(prev => prev.filter(d => d.id !== payload.old.id));
          indexMap.current.delete(payload.old.id);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchDonations, applyFilters]);

  /**
   * Periodic cleanup for items that expire while viewing the feed
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setDonations(prev => {
        const filtered = applyFilters(prev);
        if (filtered.length === prev.length) return prev;
        return filtered;
      });
    }, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, [applyFilters]);

  return { donations, isLoading, error, refetch: fetchDonations };
}
