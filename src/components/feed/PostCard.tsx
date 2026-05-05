/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState } from 'react';
import { Donation } from '@/types';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, AlertTriangle, CheckCircle, Loader2, Info } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useUserStore } from '@/store/useUserStore';
import { findBestVolunteers } from '@/services/volunteer-matching';

interface PostCardProps {
  donation: Donation;
  onClaim?: (donationId: string) => void;
}

export function PostCard({ donation, onClaim }: PostCardProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isUrgentTimer, setIsUrgentTimer] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimError, setClaimError] = useState('');
  const { user } = useUserStore();

  useEffect(() => {
    const calculateTimeLeft = () => {
      const expiry = new Date(donation.expiry_timestamp).getTime();
      const now = new Date().getTime();
      const difference = expiry - now;

      if (difference <= 0) {
        setTimeLeft('Expired');
        setIsUrgentTimer(true);
        return;
      }

      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft(`${hours}h ${minutes}m`);
      if (hours < 1) {
        setIsUrgentTimer(true);
      } else {
        setIsUrgentTimer(false);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(timer);
  }, [donation.expiry_timestamp]);

  const handleClaim = async () => {
    if (!user) return;
    setIsClaiming(true);
    setClaimError('');

    try {
      // 1. Insert a record into the claims table
      const { error: claimError } = await supabase
        .from('claims')
        .insert([{ donation_id: donation.id, claimed_by: user.id, status: 'claimed' }]);

      if (claimError) throw claimError;

      // 2. Find and assign the best volunteer (Logistics Optimization)
      // For demo, we use mock donor coordinates [40.7128, -74.0060]
      const volunteers = await findBestVolunteers(40.7128, -74.0060);
      if (volunteers.length > 0) {
        const bestVolunteer = volunteers[0];
        await supabase.from('deliveries').insert([
          {
            donation_id: donation.id,
            volunteer_id: bestVolunteer.id,
            status: 'assigned'
          }
        ]);
        
        // Notification for volunteer is handled by DB trigger
      }

      // 3. Update the donation status to 'Claimed'
      const { error: updateError } = await supabase
        .from('donations')
        .update({ status: 'Claimed' })
        .eq('id', donation.id);

      if (updateError) throw updateError;

      setClaimSuccess(true);
      onClaim?.(donation.id);
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to claim. Please try again.';
      setClaimError(errorMessage);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleReport = async () => {
    const reason = prompt('Reason for reporting this donation?');
    if (!reason) return;
    
    const { error } = await supabase
      .from('reported_items')
      .insert([{ 
        donation_id: donation.id, 
        reporter_id: user?.id, 
        reason 
      }]);
    
    if (!error) alert('Thank you for reporting. Our moderators will review this item.');
  };

  const canClaim = user && user.role === 'ngo' && donation.status === 'Available' && timeLeft !== 'Expired';

  return (
    <div className="bg-card border rounded-xl shadow-sm overflow-hidden mb-4 flex flex-col transition-all hover:shadow-md">
      {/* Post Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
             {donation.donor?.avatar_url ? (
               <img src={donation.donor.avatar_url} alt="avatar" className="w-full h-full object-cover" />
             ) : (
               <span className="text-sm font-bold text-foreground">{donation.donor?.full_name?.charAt(0) || 'D'}</span>
             )}
          </div>
          <div>
            <p className="text-sm font-semibold">{donation.donor?.full_name || 'Anonymous Donor'}</p>
            <p className="text-xs text-muted-foreground">{donation.category} • {donation.quantity}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {donation.is_urgent && (
            <div className="flex items-center text-xs font-bold px-2 py-1 rounded-full" style={{ color: '#FF6B35', backgroundColor: 'rgba(255,107,53,0.1)' }}>
              <AlertTriangle className="w-3 h-3 mr-1" />
              URGENT
            </div>
          )}
          <button 
            onClick={handleReport}
            className="text-muted-foreground hover:text-destructive transition-colors p-1"
            title="Report this post"
          >
            <AlertTriangle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Media Content */}
      <div className="relative w-full bg-muted max-h-[500px] flex items-center justify-center overflow-hidden">
        {donation.video_url ? (
          <video
            src={donation.video_url}
            className="w-full h-auto max-h-[500px] object-contain bg-black"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : donation.photo_url ? (
          <img
            src={donation.photo_url}
            alt={donation.title}
            className="w-full h-auto max-h-[500px] object-contain bg-black/5"
          />
        ) : (
          <div className="w-full h-48 flex items-center justify-center bg-muted text-muted-foreground text-sm">
            No media available
          </div>
        )}
      </div>

      {/* Post Footer & Actions */}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              {donation.distance ? `${donation.distance.toFixed(1)} km` : 'Nearby'}
            </div>
            <div className={`flex items-center font-medium ${isUrgentTimer ? 'text-[#FF6B35]' : ''}`}>
              <Clock className="w-4 h-4 mr-1" />
              {timeLeft}
            </div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
            ${donation.status === 'Available' ? 'bg-green-100 text-green-700' : 
              donation.status === 'Claimed' ? 'bg-blue-100 text-blue-700' :
              donation.status === 'In Transit' ? 'bg-orange-100 text-orange-700' :
              'bg-muted text-muted-foreground'}`}>
            {donation.status === 'Claimed' ? 'In Progress' : donation.status}
          </span>
        </div>

        <div className="mt-1">
          <p className="text-sm font-bold mb-1">{donation.title}</p>
          {donation.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{donation.description}</p>
          )}
        </div>
        
        {/* Allergen Info */}
        {donation.allergens && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-100 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-[10px] leading-tight text-yellow-800">
              <span className="font-bold uppercase">Allergen Warning:</span> {donation.allergens}
            </p>
          </div>
        )}

        {/* Disclaimer for NGO */}
        {user?.role === 'ngo' && donation.status === 'Available' && (
          <div className="mt-2 p-2 bg-muted/50 rounded-lg border border-dashed flex gap-2 items-start">
            <Info className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[9px] leading-relaxed text-muted-foreground italic">
              ShareNet does not guarantee freshness. Assessment required upon receipt.
            </p>
          </div>
        )}

        {claimError && (
          <p className="text-xs text-destructive">{claimError}</p>
        )}

        {claimSuccess ? (
          <div className="w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold text-[#2ECC71]">
            <CheckCircle className="w-5 h-5" />
            Successfully Claimed!
          </div>
        ) : (
          <Button
            className="w-full text-white mt-1 transition-all"
            style={{ backgroundColor: canClaim ? '#2ECC71' : undefined }}
            onClick={handleClaim}
            disabled={!canClaim || isClaiming}
          >
            {isClaiming ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Claiming...</>
            ) : donation.status === 'Claimed' || donation.status === 'In Transit' ? (
              'In Progress'
            ) : donation.status === 'Delivered' ? (
              'Delivered'
            ) : timeLeft === 'Expired' ? (
              'Expired'
            ) : user?.role !== 'ngo' ? (
              'Only NGOs can claim'
            ) : (
              'Claim Donation'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
