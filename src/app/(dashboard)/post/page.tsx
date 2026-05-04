/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UploadCloud, MapPin, AlertTriangle, 
  ArrowRight, ArrowLeft, CheckCircle2, 
  Loader2, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabaseClient';
import { useUserStore } from '@/store/useUserStore';
import dynamic from 'next/dynamic';

// Dynamically load Map components to avoid SSR issues
const MapPicker = dynamic(() => import('@/components/post/MapPicker'), { 
  ssr: false,
  loading: () => <div className="h-64 bg-muted animate-pulse rounded-xl flex items-center justify-center">Loading Map...</div>
});

const CATEGORIES = ['Food', 'Clothing', 'Goods', 'Other'];

export default function PostDonationPage() {
  const router = useRouter();
  const { user } = useUserStore();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Food');
  const [quantity, setQuantity] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [expiryHours, setExpiryHours] = useState(4);
  const [allergens, setAllergens] = useState('');
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user || (user.role !== 'donor' && user.role !== 'admin')) {
      router.push('/feed');
    }
  }, [user, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async () => {
    if (!title || !location || !file || (category === 'Food' && !allergens)) {
      setError(category === 'Food' && !allergens 
        ? 'Allergen information is required for food donations.' 
        : 'Please complete all required fields.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let photo_url = '';
      let video_url = '';

      // 1. Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Media upload failed');
      const { url } = await uploadRes.json();
      
      if (file.type.startsWith('video/')) {
        video_url = url;
      } else {
        photo_url = url;
      }

      // 2. Insert into Supabase
      const expiryTimestamp = new Date(Date.now() + 1000 * 60 * 60 * expiryHours).toISOString();

      const { error: insertError } = await supabase
        .from('donations')
        .insert([{
          donor_id: user!.id,
          title,
          description,
          category,
          quantity,
          photo_url,
          video_url,
          is_urgent: isUrgent,
          expiry_timestamp: expiryTimestamp,
          lat: location.lat,
          lng: location.lng,
          status: 'Available',
          allergens: allergens || null
        }]);

      if (insertError) throw insertError;

      router.push('/feed');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 mb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Create Donation</h1>
        <p className="text-muted-foreground mt-1">Follow the steps to list your surplus resources.</p>
        
        {/* Progress Bar */}
        <div className="flex gap-2 mt-6">
          {[1, 2, 3].map((s) => (
            <div 
              key={s} 
              className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                step >= s ? 'bg-[var(--color-action-green)]' : 'bg-muted'
              }`} 
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 flex gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1: Media & Category */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Donation Media</label>
            <div 
              onClick={() => document.getElementById('file-upload')?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden
                ${previewUrl ? 'border-transparent bg-muted/30 h-64' : 'hover:bg-muted/50 border-muted-foreground/20 h-48'}`}
            >
              <input id="file-upload" type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
              
              {previewUrl ? (
                file?.type.startsWith('video/') ? (
                  <video src={previewUrl} className="absolute inset-0 w-full h-full object-cover" controls />
                ) : (
                  <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                )
              ) : (
                <>
                  <UploadCloud className="h-10 w-10 mb-2 text-muted-foreground" />
                  <p className="text-sm font-semibold">Tap to capture or upload</p>
                  <p className="text-xs text-muted-foreground mt-1">Images or Videos (Max 50MB)</p>
                </>
              )}
              {previewUrl && (
                <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-md">
                  Tap to change
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Category</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`py-3 rounded-xl text-sm font-bold border transition-all ${
                    category === cat 
                      ? 'bg-[var(--color-action-green)] text-white border-[var(--color-action-green)] shadow-md scale-[1.02]' 
                      : 'bg-card text-muted-foreground border-muted-foreground/10 hover:border-muted-foreground/30'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <Button 
            className="w-full h-14 rounded-2xl text-lg font-bold bg-[var(--color-action-green)] hover:bg-[var(--color-action-green)]/90"
            disabled={!file}
            onClick={() => setStep(2)}
          >
            Next Details <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Step 2: Details & Urgency */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Title <span className="text-destructive">*</span></label>
              <Input 
                placeholder="What are you donating?" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Quantity & Description <span className="text-destructive">*</span></label>
              <Input 
                placeholder="e.g. 5kg, 10 meals, 2 bags" 
                value={quantity} 
                onChange={(e) => setQuantity(e.target.value)}
                className="h-12 rounded-xl mb-2"
              />
              <Textarea 
                placeholder="Describe the items (condition, packaging, etc.)" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl min-h-[100px]"
              />
            </div>

            {category === 'Food' && (
              <div className="space-y-2 p-4 bg-yellow-50 border border-yellow-100 rounded-xl">
                <label className="text-xs font-bold uppercase text-yellow-700 flex items-center gap-1">
                  <Info className="h-3 w-3" /> Allergen Info <span className="text-destructive">*</span>
                </label>
                <Input 
                  placeholder="e.g. contains nuts, dairy, etc." 
                  value={allergens} 
                  onChange={(e) => setAllergens(e.target.value)}
                  className="h-10 rounded-lg border-yellow-200 bg-white"
                />
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border">
              <div>
                <p className="font-bold">Mark as Urgent</p>
                <p className="text-xs text-muted-foreground">Puts this post in the priority story ring.</p>
              </div>
              <input 
                type="checkbox" 
                checked={isUrgent} 
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="w-6 h-6 accent-[var(--color-urgency-orange)]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Expiry Window (Hours)</label>
              <div className="flex gap-2">
                {[2, 4, 8, 12, 24].map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setExpiryHours(h)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                      expiryHours === h 
                        ? 'bg-[var(--color-urgency-orange)] text-white border-[var(--color-urgency-orange)]' 
                        : 'bg-card text-muted-foreground'
                    }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="h-14 flex-1 rounded-2xl" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-2 h-5 w-5" /> Back
            </Button>
            <Button 
              className="h-14 flex-2 rounded-2xl text-lg font-bold bg-[var(--color-action-green)] hover:bg-[var(--color-action-green)]/90"
              disabled={!title}
              onClick={() => setStep(3)}
            >
              Next: Location <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Location Picker */}
      {step === 3 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Pickup Location <span className="text-destructive">*</span></label>
            <p className="text-xs text-muted-foreground">Tap on the map to pin the exact pickup point.</p>
            <div className="rounded-2xl border overflow-hidden h-80 relative shadow-inner">
              <MapPicker 
                onLocationSelect={(lat, lng) => setLocation({lat, lng})}
                initialLocation={location || undefined}
              />
              <div className="absolute top-4 right-4 z-[1000]">
                <div className="bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-md border text-[10px] font-bold flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-red-500" />
                  {location ? 'Location Pinned' : 'Waiting for pin...'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="h-14 flex-1 rounded-2xl" onClick={() => setStep(2)}>
              <ArrowLeft className="mr-2 h-5 w-5" /> Back
            </Button>
            <Button 
              className="h-14 flex-2 rounded-2xl text-lg font-bold bg-[var(--color-action-green)] hover:bg-[var(--color-action-green)]/90"
              disabled={!location || isLoading}
              onClick={handleSubmit}
            >
              {isLoading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
              {isLoading ? 'Posting...' : 'Confirm & Post'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
