/**
 * useLocation Hook
 * Specification: SDS Section 5.1 — src/hooks/useLocation.ts
 * 
 * Provides browser geolocation with caching to avoid repeated permission prompts.
 * DSA: Memoized result stored in ref — O(1) cache hit after first acquisition.
 */

'use client';

import { useEffect, useRef, useState } from 'react';

export interface Coords {
  lat: number;
  lng: number;
  accuracy?: number;
}

interface LocationState {
  coords: Coords | null;
  isLoading: boolean;
  error: string | null;
}

export function useLocation(): LocationState {
  const [state, setState] = useState<LocationState>({
    coords: null,
    isLoading: true,
    error: null,
  });

  // Memoized cache: avoid re-requesting on every render
  const cachedCoords = useRef<Coords | null>(null);

  useEffect(() => {
    // Return from cache immediately — O(1)
    if (cachedCoords.current) {
      setState({ coords: cachedCoords.current, isLoading: false, error: null });
      return;
    }

    if (!navigator.geolocation) {
      setState({ coords: null, isLoading: false, error: 'Geolocation not supported by this browser.' });
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords: Coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        cachedCoords.current = coords; // Cache it
        setState({ coords, isLoading: false, error: null });
      },
      (err) => {
        setState({ coords: null, isLoading: false, error: err.message });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return state;
}
