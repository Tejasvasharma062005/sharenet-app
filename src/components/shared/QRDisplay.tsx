'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Loader2, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QRDisplayProps {
  donationId: string;
  volunteerId: string;
  donationTitle: string;
}

export function QRDisplay({ donationId, volunteerId, donationTitle }: QRDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState('');

  const generateQR = React.useCallback(async () => {
    await Promise.resolve(); // Avoid synchronous setState in effect
    setIsLoading(true);
    setError('');
    try {
      // Call our server API to get a signed payload
      const res = await fetch('/api/qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donation_id: donationId, volunteer_id: volunteerId }),
      });

      if (!res.ok) throw new Error('Failed to generate QR');
      const { payload, signature } = await res.json();

      // Encode payload + signature into the QR
      const qrData = JSON.stringify({ payload, signature });

      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, qrData, {
          width: 280,
          margin: 2,
          color: { dark: '#1a1a1a', light: '#ffffff' },
        });
      }

      // Set expiry (5 minutes from now)
      const expiry = new Date(payload.timestamp + 5 * 60 * 1000);
      setExpiresAt(expiry);
    } catch (err: unknown) {
      setError('Could not generate QR code. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [donationId, volunteerId]);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const diff = expiresAt.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Expired');
        clearInterval(interval);
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    generateQR();
  }, [generateQR]);

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-card rounded-2xl border shadow-md max-w-sm mx-auto">
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-action-green)]">
        <ShieldCheck className="h-4 w-4" />
        HMAC-Secured Handoff QR
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Show this QR to the NGO representative to verify the delivery of <strong>{donationTitle}</strong>
      </p>

      <div className="relative flex items-center justify-center w-[280px] h-[280px] bg-white rounded-xl border shadow-inner">
        {isLoading ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : error ? (
          <p className="text-xs text-destructive text-center px-4">{error}</p>
        ) : (
          <canvas ref={canvasRef} className="rounded-lg" />
        )}
      </div>

      {/* Countdown */}
      {expiresAt && !error && (
        <div className={`text-sm font-mono font-bold px-3 py-1 rounded-full
          ${timeLeft === 'Expired'
            ? 'bg-destructive/10 text-destructive'
            : 'bg-[var(--color-action-green)]/10 text-[var(--color-action-green)]'}`}>
          {timeLeft === 'Expired' ? '⏰ QR Expired' : `⏱ Expires in ${timeLeft}`}
        </div>
      )}

      {/* Refresh / regenerate */}
      <Button
        variant="outline"
        size="sm"
        onClick={generateQR}
        disabled={isLoading}
        className="gap-2 w-full"
      >
        <RefreshCw className="h-4 w-4" />
        Generate New QR
      </Button>
    </div>
  );
}
