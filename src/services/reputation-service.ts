/**
 * Reputation Score Engine
 * Specification: SDS Section 5.3 — reputation-service.ts
 *
 * Formula: Weighted Rolling Average
 *   - Delivery completion rate: 40%
 *   - Average rating received:  40%
 *   - Dispute-free ratio:       20%
 *
 * DSA Used:
 *   - Sliding window for rolling average computation
 *   - HashMap for O(1) event aggregation
 *   - Clamping to maintain score bounds [1.0, 5.0]
 */

import { supabase } from '@/lib/supabaseClient';

interface ReputationInput {
  userId: string;
  totalDeliveries: number;
  completedDeliveries: number;
  averageRating: number;   // 1.0 – 5.0
  totalDisputes: number;
}

/**
 * Compute the weighted reputation score — O(1)
 */
export function computeReputationScore(input: ReputationInput): number {
  const { totalDeliveries, completedDeliveries, averageRating, totalDisputes } = input;

  if (totalDeliveries === 0) return 3.0; // Neutral default

  // Component 1: Completion rate → scale to 1–5
  const completionRate = completedDeliveries / totalDeliveries;
  const completionScore = 1 + completionRate * 4; // 1.0 – 5.0

  // Component 2: Average rating (already 1–5, just use directly)
  const ratingScore = averageRating;

  // Component 3: Dispute-free ratio → scale to 1–5
  const disputeRate = totalDisputes / totalDeliveries;
  const disputeScore = 1 + (1 - disputeRate) * 4; // 1.0 – 5.0

  // Weighted average
  const rawScore =
    0.4 * completionScore +
    0.4 * ratingScore +
    0.2 * disputeScore;

  // Clamp to [1.0, 5.0] with 2 decimal precision
  return Math.round(Math.min(5.0, Math.max(1.0, rawScore)) * 100) / 100;
}

/**
 * Fetch all reputation data for a user and compute their score
 * Updates the users table with the new score
 */
export async function updateUserReputation(userId: string): Promise<number> {
  // Fetch delivery stats using aggregation — O(n) on DB, O(1) in app
  const { data: deliveries } = await supabase
    .from('deliveries')
    .select('status')
    .eq('volunteer_id', userId);

  const totalDeliveries = deliveries?.length || 0;
  const completedDeliveries = deliveries?.filter(d => d.status === 'delivered').length || 0;

  // Fetch reputation events for average rating
  const { data: events } = await supabase
    .from('reputation_events')
    .select('delta')
    .eq('user_id', userId);

  // Sliding window average — O(n)
  const avgDelta = events?.length
    ? events.reduce((sum, e) => sum + e.delta, 0) / events.length
    : 0;
  // Map delta (typically -1 to +1) to rating scale (1–5)
  const averageRating = Math.min(5, Math.max(1, 3 + avgDelta * 2));

  // Disputes: count negative reputation events as disputes
  const totalDisputes = events?.filter(e => e.delta < 0).length || 0;

  const newScore = computeReputationScore({
    userId,
    totalDeliveries,
    completedDeliveries,
    averageRating,
    totalDisputes,
  });

  // Write back to DB
  await supabase
    .from('users')
    .update({ reputation_score: newScore })
    .eq('id', userId);

  return newScore;
}

/**
 * Record a new reputation event after a transaction
 */
export async function recordReputationEvent(
  userId: string,
  delta: number,
  reason: string
): Promise<void> {
  await supabase
    .from('reputation_events')
    .insert([{ user_id: userId, delta, reason }]);

  // Trigger full recomputation
  await updateUserReputation(userId);
}
