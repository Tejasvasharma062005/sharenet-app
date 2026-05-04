'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabaseClient';
import { Donation } from '@/types';
import { useUserStore } from '@/store/useUserStore';
import { Loader2, MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Dynamically import the MapComponent so Leaflet doesn't crash on the server (SSR)
const MapComponent = dynamic(
  () => import('@/components/feed/MapComponent'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex-1 w-full flex items-center justify-center bg-muted/20">
        <Loader2 className="animate-spin h-8 w-8 text-[var(--color-action-green)]" />
      </div>
    )
  }
);

export default function MapPage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [ngos, setNgos] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUserStore();
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);

  useEffect(() => {
    fetchAllData();
  }, [user]);

  const fetchAllData = async () => {
    setIsLoading(true);
    
    // 1. Fetch Donations
    const { data: donationData } = await supabase
      .from('donations')
      .select('*, donor:users!donor_id(*)')
      .in('status', ['Available', 'Claimed', 'In Transit']);
    
    // 2. Fetch NGOs
    const { data: ngoData } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'ngo')
      .eq('is_verified', true);

    // 3. Fetch Active Deliveries
    const { data: deliveryData } = await supabase
      .from('deliveries')
      .select('*')
      .in('status', ['accepted', 'in_transit']);

    setDonations(donationData as Donation[] || []);
    setNgos(ngoData || []);
    setDeliveries(deliveryData || []);
    setIsLoading(false);
  };

  // Remove role restriction to allow ALL users to see the map as requested
  
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-6rem)] -m-4 md:-m-6 relative">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin h-8 w-8 text-[var(--color-action-green)]" />
        </div>
      ) : (
        <>
          {/* Render the dynamically imported map */}
          <MapComponent 
            donations={donations} 
            ngos={ngos}
            deliveries={deliveries}
            onSelectDonation={setSelectedDonation} 
            userRole={user?.role}
            userId={user?.id}
          />
          
          {/* Floating UI panel for selected donation */}
          {selectedDonation && (
            <div className="absolute bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-card p-4 rounded-xl shadow-2xl border z-10 animate-fade-in-up">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-lg">{selectedDonation.title}</h3>
                  <p className="text-sm text-muted-foreground">{selectedDonation.category} • {selectedDonation.quantity}</p>
                </div>
                {selectedDonation.is_urgent && (
                  <span className="px-2 py-1 bg-[var(--color-urgency-orange)]/10 text-[var(--color-urgency-orange)] text-xs font-bold rounded-full">
                    Urgent
                  </span>
                )}
              </div>
              
              <div className="flex items-center text-sm text-muted-foreground mb-4">
                <MapPin className="h-4 w-4 mr-1" />
                <span>Pickup from: {selectedDonation.donor?.full_name || 'Donor'}</span>
              </div>
              
              <div className="flex gap-2">
                <Button className="flex-1 bg-[var(--color-action-green)] hover:bg-[#27ae60] text-white transition-colors">
                  Claim Pickup
                </Button>
                <Button variant="outline" className="flex-none aspect-square p-0" title="Navigate">
                  <Navigation className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
