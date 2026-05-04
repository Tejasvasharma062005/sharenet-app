'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserStore } from '@/store/useUserStore';
import { Donation } from '@/types';
import { Loader2, Package, Truck, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QRDisplay } from '@/components/shared/QRDisplay';

interface DeliveryTask extends Donation {
  delivery_status?: string;
}

export default function VolunteerTasksPage() {
  const { user } = useUserStore();
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [isAvailable, setIsAvailable] = useState(user?.is_verified || false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMyTasks = React.useCallback(async () => {
    setIsLoading(true);
    
    // Fetch donations where this volunteer is assigned
    const { data: deliveries } = await supabase
      .from('deliveries')
      .select('donation_id, status')
      .eq('volunteer_id', user!.id)
      .neq('status', 'delivered');

    const donationIds = deliveries?.map(d => d.donation_id) || [];

    if (donationIds.length > 0) {
      const { data: donations } = await supabase
        .from('donations')
        .select('*, donor:users!donor_id(*)')
        .in('id', donationIds);
      
      // Merge delivery status into donation object
      const merged = (donations || []).map(d => ({
        ...d,
        delivery_status: deliveries?.find(del => del.donation_id === d.id)?.status
      }));
      
      setTasks(merged as DeliveryTask[]);
    } else {
      setTasks([]);
    }
    
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== 'volunteer') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMyTasks();
  }, [user, fetchMyTasks]);

  // Real-time tracking logic
  useEffect(() => {
    const activeTask = tasks.find(t => t.delivery_status === 'in_transit');
    if (!activeTask) return;

    console.log('[Tracking] Starting GPS tracking for task:', activeTask.id);
    
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await supabase
          .from('deliveries')
          .update({ current_lat: latitude, current_lng: longitude })
          .eq('donation_id', activeTask.id)
          .eq('volunteer_id', user!.id);
      },
      (error) => console.error('[Tracking] GPS Error:', error),
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [tasks, user]);

  const updateDeliveryStatus = async (donationId: string, newDeliveryStatus: string, newDonationStatus?: string) => {
    // Update deliveries table
    await supabase
      .from('deliveries')
      .update({ status: newDeliveryStatus })
      .eq('donation_id', donationId)
      .eq('volunteer_id', user!.id);

    // Optionally update donations table
    if (newDonationStatus) {
      await supabase
        .from('donations')
        .update({ status: newDonationStatus })
        .eq('id', donationId);
    }

    fetchMyTasks();
  };

  const toggleAvailability = async () => {
    const next = !isAvailable;
    setIsAvailable(next);
    // In real app, update a 'is_available' column in users table
    await supabase.from('users').update({ is_verified: next }).eq('id', user?.id);
  };

  if (user?.role !== 'volunteer') {
    return (
      <div className="p-8 text-center bg-card rounded-xl border mt-6 max-w-lg mx-auto shadow-sm">
        <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Volunteer Access Only</h2>
        <p className="text-muted-foreground">This dashboard is for registered volunteers to manage their deliveries.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 mb-20 md:mb-0">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Truck className="h-6 w-6 text-[var(--color-action-green)]" />
            Volunteer Dashboard
          </h1>
          <p className="text-muted-foreground">Manage your assignments and status.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Availability</span>
          <button 
            onClick={toggleAvailability}
            className={`w-12 h-6 rounded-full p-1 transition-colors ${isAvailable ? 'bg-[var(--color-action-green)]' : 'bg-muted'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isAvailable ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin h-8 w-8 text-[var(--color-action-green)]" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border">
          <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="font-semibold text-foreground">No active tasks</p>
          <p className="text-sm text-muted-foreground">Tasks you accept will appear here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {tasks.map((task) => (
            <div key={task.id} className="bg-card border rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
                <span className={`px-3 py-1 rounded-full text-xs font-bold
                  ${task.delivery_status === 'assigned' ? 'bg-yellow-100 text-yellow-700' : 
                    task.delivery_status === 'accepted' ? 'bg-blue-100 text-blue-700' : 
                    'bg-orange-100 text-orange-700'}`}>
                  {task.delivery_status === 'assigned' ? 'New Invitation' : 
                   task.delivery_status === 'accepted' ? 'Ready for Pickup' : 'In Transit'}
                </span>
                <span className="text-xs text-muted-foreground">#{task.id.slice(0, 8)}</span>
              </div>
              
              <div className="p-4">
                <h3 className="font-bold text-lg mb-1">{task.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{task.description}</p>
                
                <div className="space-y-4">
                  {task.delivery_status === 'assigned' ? (
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1 rounded-xl" onClick={() => updateDeliveryStatus(task.id, 'declined')}>Decline</Button>
                      <Button className="flex-2 bg-[var(--color-action-green)] rounded-xl" onClick={() => updateDeliveryStatus(task.id, 'accepted')}>Accept Task</Button>
                    </div>
                  ) : task.delivery_status === 'accepted' ? (
                    <Button 
                      className="w-full bg-[var(--color-action-green)] hover:bg-[var(--color-action-green)]/90 text-white rounded-xl"
                      onClick={() => updateDeliveryStatus(task.id, 'in_transit', 'In Transit')}
                    >
                      Confirm Pickup & Start Delivery
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                        <p className="text-xs font-bold text-blue-700 mb-2 uppercase tracking-wider text-center">Handoff Verification</p>
                        <QRDisplay 
                          donationId={task.id} 
                          volunteerId={user.id} 
                          donationTitle={task.title}
                        />
                      </div>
                      <Button 
                        variant="outline"
                        className="w-full border-[var(--color-action-green)] text-[var(--color-action-green)] rounded-xl"
                        onClick={() => updateDeliveryStatus(task.id, 'delivered', 'Delivered')}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Mark as Delivered (Manual Backup)
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
