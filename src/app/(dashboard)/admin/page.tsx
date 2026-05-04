'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserStore } from '@/store/useUserStore';
import { useRouter } from 'next/navigation';
import {
  Users, Package, ShieldCheck, AlertTriangle,
  TrendingUp, CheckCircle, Clock, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PlatformStats {
  totalUsers: number;
  totalDonations: number;
  activeDonations: number;
  deliveredDonations: number;
  expiredDonations: number;
  totalVolunteers: number;
  totalNGOs: number;
  totalDonors: number;
}

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_verified: boolean;
  reputation_score: number;
  created_at: string;
}

export default function AdminPage() {
  const { user } = useUserStore();
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [pendingNGOs, setPendingNGOs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'reports' | 'verification'>('overview');

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/feed');
    }
  }, [user, router]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchStats(),
      fetchUsers(),
      fetchReports(),
      fetchPendingNGOs(),
    ]);
    setIsLoading(false);
  };

  const fetchReports = async () => {
    const { data } = await supabase
      .from('reported_items')
      .select('*, donation:donations(*), reporter:users!reporter_id(*)')
      .order('created_at', { ascending: false });
    setReports(data || []);
  };

  const fetchPendingNGOs = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'ngo')
      .eq('is_verified', false);
    setPendingNGOs(data || []);
  };

  const fetchStats = async () => {
    const [
      { count: totalUsers },
      { count: totalDonations },
      { count: activeDonations },
      { count: deliveredDonations },
      { count: expiredDonations },
      { count: totalVolunteers },
      { count: totalNGOs },
      { count: totalDonors },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('donations').select('*', { count: 'exact', head: true }),
      supabase.from('donations').select('*', { count: 'exact', head: true }).eq('status', 'Available'),
      supabase.from('donations').select('*', { count: 'exact', head: true }).eq('status', 'Delivered'),
      supabase.from('donations').select('*', { count: 'exact', head: true }).eq('status', 'Expired'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'volunteer'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'ngo'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'donor'),
    ]);

    setStats({
      totalUsers: totalUsers || 0,
      totalDonations: totalDonations || 0,
      activeDonations: activeDonations || 0,
      deliveredDonations: deliveredDonations || 0,
      expiredDonations: expiredDonations || 0,
      totalVolunteers: totalVolunteers || 0,
      totalNGOs: totalNGOs || 0,
      totalDonors: totalDonors || 0,
    });
    setIsLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    setUsers(data as UserRow[] || []);
  };

  const toggleVerification = async (userId: string, currentStatus: boolean) => {
    await supabase
      .from('users')
      .update({ is_verified: !currentStatus })
      .eq('id', userId);
    
    // Log action in audit_log
    await supabase.from('audit_log').insert([{
      admin_id: user?.id,
      action_type: currentStatus ? 'revoke_verification' : 'verify_user',
      target_entity: `user:${userId}`,
      notes: `NGO verification status toggled to ${!currentStatus}`
    }]);

    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_verified: !currentStatus } : u));
    fetchPendingNGOs();
  };

  const resolveReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    if (status === 'resolved' && report.donation_id) {
      // Remove the reported donation
      await supabase.from('donations').delete().eq('id', report.donation_id);
    }

    await supabase
      .from('reported_items')
      .update({ status })
      .eq('id', reportId);

    // Log action
    await supabase.from('audit_log').insert([{
      admin_id: user?.id,
      action_type: `resolve_report_${status}`,
      target_entity: `report:${reportId}`,
      notes: `Report resolved as ${status}. Item ${status === 'resolved' ? 'removed' : 'dismissed'}.`
    }]);

    fetchReports();
    fetchStats();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-[var(--color-urgency-orange)]" />
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <div className="bg-card border rounded-xl p-5 flex items-center gap-4 shadow-sm">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 mb-20 md:mb-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-[var(--color-urgency-orange)]" />
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">Platform health, metrics, and user management.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b overflow-x-auto scrollbar-hide">
        {(['overview', 'users', 'reports', 'verification'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px whitespace-nowrap
              ${activeTab === tab
                ? 'border-[var(--color-action-green)] text-[var(--color-action-green)]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            {tab}
            {tab === 'reports' && reports.filter(r => r.status === 'pending').length > 0 && (
              <span className="ml-2 bg-destructive text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {reports.filter(r => r.status === 'pending').length}
              </span>
            )}
            {tab === 'verification' && pendingNGOs.length > 0 && (
              <span className="ml-2 bg-[var(--color-urgency-orange)] text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {pendingNGOs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && stats && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="bg-blue-500/10 text-blue-500" />
            <StatCard icon={Package} label="Total Donations" value={stats.totalDonations} color="bg-[var(--color-urgency-orange)]/10 text-[var(--color-urgency-orange)]" />
            <StatCard icon={CheckCircle} label="Delivered" value={stats.deliveredDonations} color="bg-[var(--color-action-green)]/10 text-[var(--color-action-green)]" />
            <StatCard icon={Clock} label="Active Now" value={stats.activeDonations} color="bg-yellow-500/10 text-yellow-500" />
          </div>

          {/* Role Breakdown */}
          <div className="bg-card border rounded-xl p-6 mb-6 shadow-sm">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[var(--color-action-green)]" />
              User Role Breakdown
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { label: 'Donors', value: stats.totalDonors, color: 'text-[var(--color-urgency-orange)]' },
                { label: 'NGOs', value: stats.totalNGOs, color: 'text-blue-500' },
                { label: 'Volunteers', value: stats.totalVolunteers, color: 'text-[var(--color-action-green)]' },
              ].map(item => (
                <div key={item.label} className="bg-muted/50 rounded-xl p-4">
                  <p className={`text-3xl font-extrabold ${item.color}`}>{item.value}</p>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Donation health */}
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[var(--color-urgency-orange)]" />
              Donation Health
            </h2>
            <div className="space-y-3">
              {[
                { label: 'Active (Available)', value: stats.activeDonations, total: stats.totalDonations, color: 'bg-[var(--color-action-green)]' },
                { label: 'Delivered', value: stats.deliveredDonations, total: stats.totalDonations, color: 'bg-blue-500' },
                { label: 'Expired', value: stats.expiredDonations, total: stats.totalDonations, color: 'bg-destructive' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-semibold">{item.value} / {item.total}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color} transition-all`}
                      style={{ width: item.total ? `${(item.value / item.total) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'users' && (
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Name</th>
                  <th className="text-left px-4 py-3 font-semibold">Role</th>
                  <th className="text-left px-4 py-3 font-semibold">Rep.</th>
                  <th className="text-left px-4 py-3 font-semibold">Verified</th>
                  <th className="text-left px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{u.full_name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                        ${u.role === 'donor' ? 'bg-orange-100 text-orange-700' :
                          u.role === 'ngo' ? 'bg-blue-100 text-blue-700' :
                          u.role === 'volunteer' ? 'bg-green-100 text-green-700' :
                          'bg-purple-100 text-purple-700'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">{Number(u.reputation_score || 0).toFixed(1)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                        ${u.is_verified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.is_verified ? '✓ Verified' : 'Unverified'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleVerification(u.id, u.is_verified)}
                        className={`text-xs px-3 py-1 rounded-lg border font-medium transition-colors
                          ${u.is_verified
                            ? 'border-destructive/30 text-destructive hover:bg-destructive/10'
                            : 'border-[var(--color-action-green)]/30 text-[var(--color-action-green)] hover:bg-[var(--color-action-green)]/10'}`}
                      >
                        {u.is_verified ? 'Revoke' : 'Verify'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="p-12 text-center bg-card border rounded-xl">
              <p className="text-muted-foreground">No reports found.</p>
            </div>
          ) : (
            reports.map(report => (
              <div key={report.id} className="bg-card border rounded-xl p-4 shadow-sm flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${report.status === 'pending' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {report.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-muted-foreground">Reported by {report.reporter?.full_name || 'System'}</span>
                  </div>
                  <h3 className="font-bold">{report.donation?.title || 'Deleted Item'}</h3>
                  <p className="text-sm text-destructive font-medium">Reason: {report.reason}</p>
                </div>
                {report.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => resolveReport(report.id, 'dismissed')}>Dismiss</Button>
                    <Button size="sm" variant="destructive" className="text-xs" onClick={() => resolveReport(report.id, 'resolved')}>Remove Item</Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'verification' && (
        <div className="space-y-4">
          {pendingNGOs.length === 0 ? (
            <div className="p-12 text-center bg-card border rounded-xl">
              <p className="text-muted-foreground">No pending NGO verifications.</p>
            </div>
          ) : (
            pendingNGOs.map(ngo => (
              <div key={ngo.id} className="bg-card border rounded-xl p-4 shadow-sm flex justify-between items-center">
                <div>
                  <h3 className="font-bold">{ngo.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{ngo.email}</p>
                  <p className="text-xs text-[var(--color-urgency-orange)] font-bold mt-1">Pending Approval</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-xs border-red-200 text-red-600 hover:bg-red-50">Reject</Button>
                  <Button size="sm" className="text-xs bg-[var(--color-action-green)]" onClick={() => toggleVerification(ngo.id, false)}>Approve & Verify</Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
