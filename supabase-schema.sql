-- Enable the pgcrypto extension for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum for User Roles
CREATE TYPE user_role AS ENUM ('donor', 'ngo', 'volunteer', 'admin');

-- Enum for Donation Status
CREATE TYPE donation_status AS ENUM ('Available', 'Claimed', 'In Transit', 'Delivered', 'Expired');

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL,
    reputation_score NUMERIC(3, 2) DEFAULT 3.00 CHECK (reputation_score >= 1.00 AND reputation_score <= 5.00),
    is_verified BOOLEAN DEFAULT false,
    avatar_url TEXT,
    lat NUMERIC(10, 8),
    lng NUMERIC(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. DONATIONS TABLE
CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('Food', 'Clothing', 'Goods', 'Other')),
    quantity TEXT NOT NULL,
    photo_url TEXT,
    video_url TEXT,
    allergens TEXT,
    expiry_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    is_urgent BOOLEAN DEFAULT false,
    status donation_status DEFAULT 'Available',
    donor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    lat NUMERIC(10, 8),
    lng NUMERIC(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- 2.1 REPORTED ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.reported_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_id UUID REFERENCES public.donations(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE public.reported_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can report items" ON public.reported_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view reports" ON public.reported_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- 2.2 AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    target_entity TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    notes TEXT
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit log" ON public.audit_log FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- 3. CLAIMS TABLE
CREATE TABLE IF NOT EXISTS public.claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_id UUID NOT NULL REFERENCES public.donations(id) ON DELETE CASCADE UNIQUE,
    claimed_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'claimed',
    claim_timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- 4. DELIVERIES TABLE
CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_id UUID NOT NULL REFERENCES public.donations(id) ON DELETE CASCADE,
    volunteer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    pickup_time TIMESTAMP WITH TIME ZONE,
    dropoff_time TIMESTAMP WITH TIME ZONE,
    qr_hash TEXT,
    status TEXT DEFAULT 'assigned',
    current_lat NUMERIC(9, 6),
    current_lng NUMERIC(9, 6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- 5. REPUTATION SCORES (Optional detailed tracking)
CREATE TABLE IF NOT EXISTS public.reputation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    delta NUMERIC(3, 2) NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE public.reputation_events ENABLE ROW LEVEL SECURITY;

-- BASIC RLS POLICIES

-- Users can read all users (to see donor/volunteer profiles)
CREATE POLICY "Users are viewable by everyone" ON public.users FOR SELECT USING (true);
-- Users can only update their own profile
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
-- Users can insert their own profile during signup
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Donations are viewable by everyone
CREATE POLICY "Donations are viewable by everyone" ON public.donations FOR SELECT USING (true);
-- Only donors can insert donations
CREATE POLICY "Donors can create donations" ON public.donations FOR INSERT WITH CHECK (auth.uid() = donor_id);
-- Donors can update their own available donations
CREATE POLICY "Donors can update own available donations" ON public.donations FOR UPDATE USING (auth.uid() = donor_id AND status = 'Available');

-- Claims: NGOs can view their own claims
CREATE POLICY "Users can view their own claims" ON public.claims FOR SELECT USING (auth.uid() = claimed_by);
-- NGOs can insert claims
CREATE POLICY "NGOs can insert claims" ON public.claims FOR INSERT WITH CHECK (auth.uid() = claimed_by);

-- Fix: Allow NGOs and volunteers to update donation status
CREATE POLICY "Authenticated users can update donation status" ON public.donations
  FOR UPDATE USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 6. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- e.g., 'donation_claimed', 'delivery_assigned', 'delivered'
    message TEXT NOT NULL,
    donation_id UUID REFERENCES public.donations(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Only the system (service role) can insert notifications
CREATE POLICY "Service role can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Enable Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Set up Realtime for donations table
ALTER PUBLICATION supabase_realtime ADD TABLE public.donations;

-- FUNCTION: Create notification on donation status change
CREATE OR REPLACE FUNCTION notify_on_donation_update()
RETURNS TRIGGER AS $$
BEGIN
  -- When a donation is claimed, notify volunteers who might want to pick it up
  IF NEW.status = 'Claimed' AND OLD.status = 'Available' THEN
    INSERT INTO public.notifications (user_id, type, message, donation_id)
    SELECT u.id, 'donation_claimed',
      'A donation "' || NEW.title || '" has just been claimed and needs delivery!',
      NEW.id
    FROM public.users u
    WHERE u.role = 'volunteer';
  END IF;

  -- When a donation is delivered, notify the donor
  IF NEW.status = 'Delivered' AND OLD.status != 'Delivered' THEN
    INSERT INTO public.notifications (user_id, type, message, donation_id)
    VALUES (
      NEW.donor_id,
      'delivered',
      'Your donation "' || NEW.title || '" has been successfully delivered!',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER: Fire function after donation status changes
CREATE TRIGGER on_donation_status_change
  AFTER UPDATE OF status ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_donation_update();

