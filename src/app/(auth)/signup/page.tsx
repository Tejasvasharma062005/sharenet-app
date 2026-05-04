'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useUserStore } from '@/store/useUserStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Role, User } from '@/types';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>('donor');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const setUser = useUserStore((state) => state.setUser);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // 1. Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Create profile in public.users table (using upsert to prevent trigger conflicts)
        const { data: profiles, error: profileError } = await supabase
          .from('users')
          .upsert(
            {
              id: authData.user.id,
              email: authData.user.email,
              full_name: fullName,
              role: role,
              is_verified: false,
            },
            { onConflict: 'id' }
          )
          .select();

        if (profileError) throw profileError;

        let profile = profiles?.[0];

        // Fallback: If upsert didn't return data, try a direct select
        if (!profile) {
          const { data: retryData } = await supabase
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .maybeSingle();
          profile = retryData;
        }

        if (profile) {
          setUser(profile as User);
          router.push('/feed');
        } else {
          // If we still have no profile, it's likely an RLS/Confirmation issue
          throw new Error('Profile created but not accessible. Please check your email for confirmation or verify database RLS policies.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full justify-center">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2">Join ShareNet</h2>
        <p className="text-muted-foreground">Create an account to start sharing or receiving resources.</p>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive p-3 rounded-md flex items-center gap-2 mb-6 text-sm">
          <AlertCircle size={16} />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name / Organization Name</Label>
          <Input 
            id="fullName" 
            placeholder="John Doe" 
            required 
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder="m@example.com" 
            required 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input 
              id="password" 
              type={showPassword ? "text" : "password"} 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="space-y-2 pb-2">
          <Label htmlFor="role">I want to join as a...</Label>
          <Select value={role} onValueChange={(value) => setRole(value as Role)}>
            <SelectTrigger>
              <SelectValue placeholder="Select your role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="donor">Donor (Give resources)</SelectItem>
              <SelectItem value="ngo">NGO (Receive resources)</SelectItem>
              <SelectItem value="volunteer">Volunteer (Transport resources)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          type="submit" 
          className="w-full bg-[var(--color-action-green)] hover:bg-[#27ae60] text-white mt-6"
          disabled={isLoading}
        >
          {isLoading ? (
             <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Account...</>
          ) : (
            'Sign Up'
          )}
        </Button>
      </form>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-[var(--color-action-green)] hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
