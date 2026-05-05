'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusSquare, Map, User, Bell, HeartHandshake, Truck, Package } from 'lucide-react';
import { useUserStore } from '@/store/useUserStore';
import { supabase } from '@/lib/supabaseClient';
import { requestNotificationPermission } from '@/services/fcm-service';

export function Navbar() {
  const pathname = usePathname();
  const { user } = useUserStore();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread notifications count and subscribe to new ones
  useEffect(() => {
    if (!user) return;
    
    // Request push notification permission (PWA/FCM compliance)
    requestNotificationPermission();

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      setUnreadCount(count || 0);
    };

    fetchUnread();

    const channel = supabase
      .channel('navbar-notifications:' + user.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        setUnreadCount(prev => prev + 1);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        // Refetch on read updates
        fetchUnread();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const navItems = [
    { href: '/feed', icon: Home, label: 'Feed', roles: ['donor', 'ngo', 'volunteer', 'admin'] },
    { href: '/my-donations', icon: Package, label: 'Activity', roles: ['donor', 'ngo', 'volunteer', 'admin'] },
    { href: '/post', icon: PlusSquare, label: 'Post', roles: ['donor', 'admin'] },
    { href: '/tasks', icon: Truck, label: 'Tasks', roles: ['volunteer', 'admin'] },
    { href: '/map', icon: Map, label: 'Map', roles: ['volunteer', 'admin'] },
    { href: '/notifications', icon: Bell, label: 'Alerts', roles: ['donor', 'ngo', 'volunteer', 'admin'] },
    { href: '/profile', icon: User, label: 'Profile', roles: ['donor', 'ngo', 'volunteer', 'admin'] },
  ];

  const visibleItems = user
    ? navItems.filter(item => item.roles.includes(user.role))
    : navItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t md:top-0 md:bottom-auto md:border-b md:border-t-0 z-50 shadow-sm">
      <div className="max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Desktop Logo */}
        <div className="hidden md:flex items-center gap-2 font-bold text-xl">
          <HeartHandshake className="h-6 w-6 text-[var(--color-urgency-orange)]" />
          <span className="text-foreground">Share<span className="text-[var(--color-action-green)]">Net</span></span>
        </div>

        {/* Nav Links */}
        <div className="flex w-full md:w-auto justify-around md:justify-end md:gap-2 px-2 md:px-0">
          {visibleItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href;
            const isAlerts = href === '/notifications';

            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center p-2 rounded-lg transition-colors relative
                  ${isActive
                    ? 'text-[var(--color-action-green)]'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-[10px] md:hidden mt-1 font-medium">{label}</span>

                {/* Active indicator (desktop) */}
                {isActive && (
                  <span className="hidden md:block absolute -bottom-4 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--color-action-green)]" />
                )}

                {/* Live unread badge */}
                {isAlerts && unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-[var(--color-urgency-orange)] text-white text-[10px] font-bold rounded-full border-2 border-background">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
