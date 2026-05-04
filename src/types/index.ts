export type Role = 'donor' | 'ngo' | 'volunteer' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  reputation_score: number;
  is_verified: boolean;
  avatar_url?: string;
}

export interface Donation {
  id: string;
  title: string;
  description: string;
  category: 'Food' | 'Clothing' | 'Goods' | 'Other';
  quantity: string;
  photo_url?: string;
  video_url?: string;
  allergens?: string;
  expiry_timestamp: string;
  is_urgent: boolean;
  status: 'Available' | 'Claimed' | 'In Transit' | 'Delivered' | 'Expired';
  donor_id: string;
  lat: number;
  lng: number;
  donor?: User;
  distance?: number; // In km, computed on client
  created_at: string;
}
