/**
 * Volunteer Matching Algorithm
 * Specification: SDS Section 5.3 — volunteer-matching.ts
 *
 * Algorithm: Weighted Priority Queue (Min-Heap by score descending)
 * Factors:
 *   - Proximity to pickup (40%)     → lower distance = higher score
 *   - Reputation score (40%)        → higher reputation = higher score
 *   - Recent activity bonus (20%)   → fewer recent deliveries = fresher volunteer
 *
 * DSA Used:
 *   - Max-Heap (via sort) for ranking volunteers by composite score
 *   - Haversine formula for O(1) geodistance calculation
 *   - Sliding window for recent activity check
 */

import { supabase } from '@/lib/supabaseClient';

export interface VolunteerCandidate {
  id: string;
  full_name: string;
  reputation_score: number;
  lat?: number;
  lng?: number;
  score: number; // Composite weighted score
}

/**
 * Haversine formula: O(1) geodistance in kilometers
 */
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Composite scoring function — returns 0–100
 * @param distance - in km
 * @param reputation - 1.0 to 5.0
 * @param recentDeliveries - count in last 24h (lower = fresher)
 */
function computeScore(
  distance: number,
  reputation: number,
  recentDeliveries: number
): number {
  // Normalize distance: 10km max radius → inversely proportional
  const proximityScore = Math.max(0, 1 - distance / 10) * 100;
  // Normalize reputation: 1–5 → 0–100
  const reputationScore = ((reputation - 1) / 4) * 100;
  // Activity bonus: 0 recent = 100, 5+ recent = 0
  const activityScore = Math.max(0, 1 - recentDeliveries / 5) * 100;

  return (
    0.4 * proximityScore +
    0.4 * reputationScore +
    0.2 * activityScore
  );
}

/**
 * Main matching function
 * Returns top N volunteers ranked by composite score (highest first)
 */
export async function findBestVolunteers(
  pickupLat: number,
  pickupLng: number,
  radiusKm: number = 10,
  minReputation: number = 2.0,
  topN: number = 3
): Promise<VolunteerCandidate[]> {
  // Fetch all available volunteers above reputation threshold
  const { data: volunteers, error } = await supabase
    .from('users')
    .select('id, full_name, reputation_score')
    .eq('role', 'volunteer')
    .gte('reputation_score', minReputation);

  if (error || !volunteers) return [];

  // Fetch recent deliveries in last 24h for activity scoring
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentActivity } = await supabase
    .from('deliveries')
    .select('volunteer_id')
    .gte('created_at', yesterday);

  // Build a frequency Map — O(n) lookup
  const activityMap = new Map<string, number>();
  recentActivity?.forEach(d => {
    activityMap.set(d.volunteer_id, (activityMap.get(d.volunteer_id) || 0) + 1);
  });

  // Score each volunteer — O(n) pass
  const candidates: VolunteerCandidate[] = volunteers
    .map(v => {
      // Using mock coords since schema supports lat/lng on donations, not users yet
      // In production: query volunteer's last known location from a presence table
      const mockLat = pickupLat + (Math.random() - 0.5) * 0.1;
      const mockLng = pickupLng + (Math.random() - 0.5) * 0.1;
      const distance = haversineDistance(pickupLat, pickupLng, mockLat, mockLng);

      if (distance > radiusKm) return null; // Filter out of radius volunteers

      const recentCount = activityMap.get(v.id) || 0;
      const score = computeScore(distance, v.reputation_score || 3, recentCount);

      return { ...v, lat: mockLat, lng: mockLng, score };
    })
    .filter(Boolean) as VolunteerCandidate[];

  // Max-Heap sort: O(n log n) — highest score first
  candidates.sort((a, b) => b.score - a.score);

  return candidates.slice(0, topN);
}
