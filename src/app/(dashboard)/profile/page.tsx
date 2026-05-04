'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserStore } from '@/store/useUserStore';
import { Donation } from '@/types';
import { PostCard } from '@/components/feed/PostCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, Package, Star, ShieldCheck, Loader2, User, Edit2, Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, setUser, logout } = useUserStore();
  const router = useRouter();
  const [myDonations, setMyDonations] = useState<Donation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.full_name || '');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchMyDonations = async () => {
      setIsLoading(true);
      try {
        if (user.role === 'donor') {
          const { data } = await supabase
            .from('donations')
            .select('*, donor:users!donor_id(*)')
            .eq('donor_id', user.id)
            .order('created_at', { ascending: false });
          setMyDonations(data as Donation[] || []);
        } else if (user.role === 'ngo') {
          // NGO sees donations they have claimed
          const { data } = await supabase
            .from('claims')
            .select('donation:donations(*, donor:users!donor_id(*))')
            .eq('claimed_by', user.id)
            .order('claim_timestamp', { ascending: false });
          
          const flat = (data || []).map(c => c.donation).filter(Boolean);
          setMyDonations(flat as any[]);
        } else if (user.role === 'volunteer') {
          // Volunteers see their assigned/in-transit deliveries
          const { data } = await supabase
            .from('deliveries')
            .select('donation:donations(*, donor:users!donor_id(*))')
            .eq('volunteer_id', user.id)
            .neq('status', 'delivered');
            
          const flat = (data || []).map(d => d.donation).filter(Boolean);
          setMyDonations(flat as any[]);
        }
      } catch (err) {
        console.error('Profile fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyDonations();
  }, [user]);

  const handleUpdateName = async () => {
    if (!user || !newName.trim() || newName === user.full_name) {
      setIsEditingName(false);
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ full_name: newName.trim() })
        .eq('id', user.id);

      if (error) throw error;

      setUser({ ...user, full_name: newName.trim() });
      setIsEditingName(false);
    } catch (err) {
      console.error('Update name error:', err);
      alert('Failed to update name. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin h-8 w-8 text-[var(--color-urgency-orange)]" />
      </div>
    );
  }

  const roleLabel = {
    donor: 'Donor',
    ngo: 'NGO / Receiver',
    volunteer: 'Volunteer',
    admin: 'Administrator',
  }[user.role] || 'User';

  const donationsLabel = {
    donor: 'My Donations',
    ngo: 'My Claims',
    volunteer: 'Active Deliveries',
    admin: 'All Activity',
  }[user.role] || 'Activity';

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 mb-20 md:mb-0">

      {/* Profile Header Card */}
      <div className="bg-card rounded-2xl border shadow-sm p-6 mb-6 text-center">
        {/* Avatar */}
        <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-[var(--color-urgency-orange)] to-[#f39c12] flex items-center justify-center mb-4 text-white text-3xl font-extrabold shadow-md">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
          ) : (
            user.full_name?.charAt(0).toUpperCase() || <User />
          )}
        </div>
        
        {isEditingName ? (
          <div className="flex flex-col items-center gap-2 mb-4 animate-in fade-in zoom-in-95">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="max-w-[240px] text-center font-bold text-lg h-10"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => { setIsEditingName(false); setNewName(user.full_name); }}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-[var(--color-action-green)]" onClick={handleUpdateName} disabled={isUpdating}>
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        ) : (
          <div className="group relative inline-block">
            <h1 className="text-2xl font-bold mb-1">{user.full_name}</h1>
            <button 
              onClick={() => setIsEditingName(true)}
              className="absolute -right-6 top-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity p-1"
            >
              <Edit2 className="h-3 w-3" />
            </button>
          </div>
        )}
        
        <p className="text-sm text-muted-foreground mb-4">{user.email}</p>

        {/* Badges */}
        <div className="flex items-center justify-center flex-wrap gap-2 mb-6">
          <span className="px-3 py-1 bg-[var(--color-action-green)]/10 text-[var(--color-action-green)] text-sm font-semibold rounded-full">
            {roleLabel}
          </span>
          {user.is_verified && (
            <span className="flex items-center gap-1 px-3 py-1 bg-blue-500/10 text-blue-500 text-sm font-semibold rounded-full">
              <ShieldCheck className="h-3 w-3" />
              Verified
            </span>
          )}
          {user.reputation_score !== null && user.reputation_score !== undefined && (
            <span className="flex items-center gap-1 px-3 py-1 bg-yellow-500/10 text-yellow-600 text-sm font-semibold rounded-full">
              <Star className="h-3 w-3" />
              {Number(user.reputation_score).toFixed(1)} Rep
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-center">
          <div className="bg-muted/50 rounded-xl p-3">
            <Package className="h-5 w-5 mx-auto mb-1 text-[var(--color-urgency-orange)]" />
            <p className="text-2xl font-bold">{myDonations.length}</p>
            <p className="text-xs text-muted-foreground">{donationsLabel}</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3">
            <Star className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
            <p className="text-2xl font-bold">{Number(user.reputation_score || 0).toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Reputation</p>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>

      {/* NGO Verification Upload Section */}
      {user.role === 'ngo' && !user.is_verified && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-blue-900">Verify Your NGO</h3>
              <p className="text-sm text-blue-700 mb-4">Upload your registration certificate or NGO ID to unlock all features.</p>
              
              <div className="space-y-3">
                <input 
                  type="file" 
                  id="ngo-cert" 
                  className="hidden" 
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    const formData = new FormData();
                    formData.append('file', file);
                    const res = await fetch('/api/upload', { method: 'POST', body: formData });
                    const { url } = await res.json();
                    
                    await supabase.from('users').update({ avatar_url: url }).eq('id', user.id);
                    alert('Credential uploaded! Our admins will review it.');
                  }}
                />
                <Button 
                  onClick={() => document.getElementById('ngo-cert')?.click()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12"
                >
                  Upload Certificate
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Section */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-[var(--color-urgency-orange)]" />
          {donationsLabel}
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
          </div>
        ) : myDonations.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No activity yet</p>
            <p className="text-sm">Your {donationsLabel.toLowerCase()} will appear here.</p>
          </div>
        ) : (
          <div>
            {myDonations.map(donation => (
              <PostCard key={donation.id} donation={donation} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
