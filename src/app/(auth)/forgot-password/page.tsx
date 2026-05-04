'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 p-8 bg-card rounded-2xl shadow-xl border border-border animate-in fade-in zoom-in duration-300">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Forgot Password?</h1>
        <p className="text-muted-foreground mt-2">
          No worries! Enter your email and we'll send you a reset link.
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle size={18} />
          <p>{error}</p>
        </div>
      )}

      {success ? (
        <div className="space-y-6 text-center py-4">
          <div className="bg-green-100 text-green-700 p-4 rounded-xl flex flex-col items-center gap-3">
            <CheckCircle2 size={40} />
            <p className="font-semibold">Reset Link Sent!</p>
            <p className="text-sm">Please check your email (and spam folder) for the reset link.</p>
          </div>
          <Link href="/login">
            <Button variant="outline" className="w-full gap-2 rounded-xl">
              <ArrowLeft size={18} />
              Back to Sign In
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleResetRequest} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="name@example.com"
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-[var(--color-action-green)] hover:bg-[#27ae60] text-white rounded-xl h-12 text-lg font-bold shadow-lg shadow-green-500/20"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              'Send Reset Link'
            )}
          </Button>

          <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} />
            Back to Sign In
          </Link>
        </form>
      )}
    </div>
  );
}
