'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserStore } from '@/store/useUserStore';
import { Bell, BellOff, CheckCheck, Loader2, Package, Truck, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';

interface Notification {
  id: string;
  type: string;
  message: string;
  donation_id: string | null;
  is_read: boolean;
  created_at: string;
}

const NotificationIcon = ({ type }: { type: string }) => {
  if (type === 'donation_claimed') return <Truck className="h-5 w-5 text-blue-500" />;
  if (type === 'delivered') return <Star className="h-5 w-5 text-yellow-500" />;
  return <Package className="h-5 w-5 text-[var(--color-urgency-orange)]" />;
};

export default function NotificationsPage() {
  const { user } = useUserStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = React.useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotifications(data as Notification[]);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();

    // Real-time subscription for new notifications
    const channel = supabase
      .channel('notifications:' + user.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);


  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 mb-20 md:mb-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-[var(--color-urgency-orange)]" />
            Notifications
            {unreadCount > 0 && (
              <span className="text-sm font-semibold px-2 py-0.5 bg-[var(--color-urgency-orange)] text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">Stay up to date with your activity.</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs gap-1">
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border">
          <BellOff className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="font-semibold text-foreground">You&apos;re all caught up!</p>
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map(notification => (
            <div
              key={notification.id}
              onClick={() => !notification.is_read && markAsRead(notification.id)}
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all
                ${notification.is_read
                  ? 'bg-card text-muted-foreground'
                  : 'bg-[var(--color-urgency-orange)]/5 border-[var(--color-urgency-orange)]/20 hover:bg-[var(--color-urgency-orange)]/10'
                }`}
            >
              {/* Icon */}
              <div className={`h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center
                ${notification.is_read ? 'bg-muted' : 'bg-white shadow-sm border'}`}>
                <NotificationIcon type={notification.type} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${notification.is_read ? '' : 'font-semibold text-foreground'}`}>
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
              </div>

              {/* Unread dot */}
              {!notification.is_read && (
                <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-[var(--color-urgency-orange)] mt-1" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
