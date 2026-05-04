'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/Navbar';
import { useUserStore } from '@/store/useUserStore';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@/types';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, setUser, isLoading, setLoading } = useUserStore();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      // 1. If we already have the user in the store, don't block the UI
      if (user) {
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      // 2. Fetch profile only if we don't have it
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
          
      if (profile) {
        setUser(profile as User);
      } else {
        // Handle ghost users or RLS delay
        console.warn("User has session but no profile row found.");
        // Only redirect if we're not on a public path (though dashboard is private)
        router.push('/login?error=profile_not_found');
      }
      setLoading(false);
    };

    checkAuth();
  }, [user, setUser, setLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin h-8 w-8 text-[var(--color-urgency-orange)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 md:pt-16">
      <Navbar />
      <main className="max-w-screen-xl mx-auto md:p-6">
        {children}
      </main>
    </div>
  );
}
