'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Donation } from '@/types';
import { ExternalLink, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons based on type
const createCustomIcon = (type: 'donation' | 'ngo' | 'volunteer', isUrgent?: boolean) => {
  let color = '#2ECC71'; // Green for standard
  if (type === 'donation' && isUrgent) color = '#FF6B35'; // Orange for urgent
  if (type === 'ngo') color = '#9b59b6'; // Purple for NGOs
  if (type === 'volunteer') color = '#3498db'; // Blue for Volunteers

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div style="
      background-color: ${color};
      width: ${type === 'donation' ? '24px' : '32px'};
      height: ${type === 'donation' ? '24px' : '32px'};
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    ">
      ${type === 'ngo' ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>' : 
        type === 'volunteer' ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-5h-4v6Z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>' : ''}
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

interface MapNgo {
  id: string | number;
  lat?: number;
  lng?: number;
  full_name?: string;
  [key: string]: unknown;
}

interface MapDelivery {
  id: string | number;
  current_lat?: number;
  current_lng?: number;
  [key: string]: unknown;
}

interface MapComponentProps {
  donations: Donation[];
  ngos?: MapNgo[];
  deliveries?: MapDelivery[];
  onSelectDonation: (donation: Donation) => void;
}

function RouteLayer({ destination, userLocation }: { destination: [number, number] | null, userLocation: [number, number] | null }) {
  const [route, setRoute] = useState<[number, number][]>([]);
  const map = useMap();

  useEffect(() => {
    if (!destination || !userLocation) {
      Promise.resolve().then(() => setRoute([]));
      return;
    }

    const fetchRoute = async () => {
      try {
        // Use OSRM Public API (Demo server)
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${userLocation[1]},${userLocation[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson`
        );
        const data = await response.json();
        if (data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
          setRoute(coords);
          
          // Fit map to show both points and the route
          const bounds = L.latLngBounds([userLocation, destination]);
          map.fitBounds(bounds, { padding: [100, 100] });
        }
      } catch (err) {
        console.error('Routing failed:', err);
      }
    };

    fetchRoute();
  }, [destination, userLocation, map]);

  return route.length > 0 ? (
    <Polyline positions={route} color="#3b82f6" weight={5} opacity={0.7} dashArray="10, 10" />
  ) : null;
}

function MapAutoCenter({ donations, onLocationFound }: { donations: Donation[], onLocationFound: (pos: [number, number]) => void }) {
  const map = useMap();
  
  useEffect(() => {
    map.locate({ setView: true, maxZoom: 13 });
    map.on('locationfound', (e) => {
      onLocationFound([e.latlng.lat, e.latlng.lng]);
    });
  }, [map, onLocationFound]);

  useEffect(() => {
    if (donations.length > 0) {
      const bounds = L.latLngBounds(donations.map(d => [d.lat, d.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [donations, map]);

  return null;
}

export default function MapComponent({ donations, ngos = [], deliveries = [], onSelectDonation }: MapComponentProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedDest, setSelectedDest] = useState<[number, number] | null>(null);
  
  // Default to Indore, India
  const indoreCenter: [number, number] = [22.7196, 75.8577];

  const openInGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank');
  };

  return (
    <MapContainer 
      center={indoreCenter} 
      zoom={12} 
      scrollWheelZoom={true} 
      className="w-full h-full z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapAutoCenter donations={donations} onLocationFound={setUserLocation} />
      <RouteLayer destination={selectedDest} userLocation={userLocation} />
      
      {/* 1. User's Location */}
      {userLocation && (
        <Marker position={userLocation} icon={L.divIcon({
          className: 'user-marker',
          html: `<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px #3b82f6;"></div>`,
          iconSize: [16, 16]
        })}>
          <Popup>You are here</Popup>
        </Marker>
      )}

      {/* 2. NGOs / Recipients */}
      {ngos.map((ngo) => (
        <Marker 
          key={String(ngo.id)} 
          position={[(ngo.lat as number) || 22.7196, (ngo.lng as number) || 75.8577]} 
          icon={createCustomIcon('ngo')}
        >
          <Popup>
            <div className="p-2">
              <p className="font-bold text-sm">{String(ngo.full_name)}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Verified Recipient</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {deliveries.map((delivery) => (
        delivery.current_lat && delivery.current_lng && (
          <Marker 
            key={String(delivery.id)} 
            position={[delivery.current_lat as number, delivery.current_lng as number]} 
            icon={createCustomIcon('volunteer')}
          >
            <Popup>
              <div className="p-2">
                <p className="font-bold text-xs mb-1">Live Delivery Tracker</p>
                <p className="text-[10px] text-muted-foreground">Volunteer is in transit</p>
              </div>
            </Popup>
          </Marker>
        )
      ))}

      {/* 4. Donations */}
      {donations.map((donation) => (
        <Marker 
          key={donation.id} 
          position={[donation.lat, donation.lng]}
          icon={createCustomIcon('donation', donation.is_urgent)}
          eventHandlers={{
            click: () => {
              setSelectedDest([donation.lat, donation.lng]);
            }
          }}
        >
          <Popup className="rounded-2xl overflow-hidden">
            <div className="p-2 w-48">
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-2 w-2 rounded-full ${donation.is_urgent ? 'bg-orange-500' : 'bg-green-500'}`} />
                <p className="font-bold text-sm leading-none">{donation.title}</p>
              </div>
              <p className="text-[10px] text-muted-foreground mb-3 line-clamp-1">{donation.quantity} • {donation.category}</p>
              
              <div className="flex flex-col gap-2">
                <Button 
                  size="sm" 
                  className="w-full h-8 bg-blue-600 hover:bg-blue-700 text-xs font-bold gap-2"
                  onClick={() => openInGoogleMaps(donation.lat, donation.lng)}
                >
                  <ExternalLink className="h-3 w-3" />
                  Google Maps
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="w-full h-8 text-[10px] gap-2"
                  onClick={() => {
                    setSelectedDest([donation.lat, donation.lng]);
                    onSelectDonation(donation);
                  }}
                >
                  <Compass className="h-3 w-3" />
                  Show In-App Route
                </Button>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
