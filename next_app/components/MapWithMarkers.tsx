"use client";

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';

// Dynamically import react-leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

export type CityMarker = {
  city: string;
  coordinates: { lat: number; lon: number };
  element?: string;
  region?: string;
  compatibility?: string;
  score?: number;
};

export default function MapWithMarkers({
  markers,
  center = { lat: 20, lon: 0 },
  zoom = 2,
  onMarkerClick,
}: {
  markers: CityMarker[];
  center?: { lat: number; lon: number };
  zoom?: number;
  onMarkerClick?: (marker: CityMarker) => void;
}) {
  const leafletCenter = useMemo(() => [center.lat, center.lon] as [number, number], [center]);
  
  // Prevent double-initialization in React StrictMode (dev)
  const [mounted, setMounted] = useState(false);
  const mapInitialized = useRef(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      // Cleanup on unmount
      mapInitialized.current = false;
    };
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-[420px] bg-white/5 rounded-lg flex items-center justify-center text-white/50">
        Cargando mapa...
      </div>
    );
  }

  // Use a unique container ID to avoid Leaflet collision
  const containerId = `map-${leafletCenter[0]}-${leafletCenter[1]}`;

  // Invalidate size once the map is ready and on window resize to avoid grey area/partial tiles
  function ResizeFix() {
    const map = useMap();
    useEffect(() => {
      const invalidate = () => {
        try { map.invalidateSize(); } catch { /* noop */ }
      };
      // Run a couple of times to cover late layout paints
      setTimeout(invalidate, 0);
      setTimeout(invalidate, 300);
      window.addEventListener('resize', invalidate);
      return () => window.removeEventListener('resize', invalidate);
    }, [map]);
    return null;
  }

  return (
    <div id={containerId} className="w-full h-[420px] rounded-lg overflow-hidden border border-white/10">
      <MapContainer
        center={leafletCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
        whenReady={() => { mapInitialized.current = true; }}
      >
        <ResizeFix />
        <TileLayer
          attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          noWrap={true}
        />
        {markers.map((m) => (
          <Marker
            key={`${m.city}-${m.coordinates.lat}-${m.coordinates.lon}`}
            position={[m.coordinates.lat, m.coordinates.lon] as [number, number]}
            eventHandlers={{ click: () => onMarkerClick && onMarkerClick(m) }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{m.city}</div>
                {typeof m.score === 'number' && <div>Puntaje: {m.score.toFixed(2)}</div>}
                {m.element && <div>Elemento: {m.element}</div>}
                {m.region && <div>Región: {m.region}</div>}
                {m.compatibility && <div>Compatibilidad: {m.compatibility}</div>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
