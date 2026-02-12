import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { MapPin, Building2, DollarSign, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, getCategoryLabel } from '@/lib/formatters';
import { getCoordinates } from '@/lib/brazilCoordinates';
import type { Tables } from '@/integrations/supabase/types';
import 'leaflet/dist/leaflet.css';

type Listing = Tables<'listings'>;

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const customIcon = new L.DivIcon({
  html: `<div style="background: hsl(45, 93%, 47%); width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid hsl(45, 93%, 60%); box-shadow: 0 2px 8px rgba(0,0,0,0.4);"><div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(0,0%,10%)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div></div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const createClusterIcon = (cluster: any) => {
  const count = cluster.getChildCount();
  let size = 40;
  let className = 'cluster-small';
  if (count >= 100) { size = 56; className = 'cluster-large'; }
  else if (count >= 10) { size = 48; className = 'cluster-medium'; }

  return new L.DivIcon({
    html: `<div class="map-cluster ${className}"><span>${count}</span></div>`,
    className: '',
    iconSize: [size, size],
  });
};

interface ListingWithCoords {
  listing: Listing;
  lat: number;
  lng: number;
}

function FitBounds({ markers }: { markers: ListingWithCoords[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [markers, map]);
  return null;
}

interface BusinessMapProps {
  listings: Listing[];
  loading: boolean;
}

export function BusinessMap({ listings, loading }: BusinessMapProps) {
  const markers: ListingWithCoords[] = listings
    .map(listing => {
      const coords = getCoordinates(listing.city, listing.state);
      if (!coords) return null;
      // Add small random offset to prevent exact overlap
      return {
        listing,
        lat: coords.lat + (Math.random() - 0.5) * 0.02,
        lng: coords.lng + (Math.random() - 0.5) * 0.02,
      };
    })
    .filter(Boolean) as ListingWithCoords[];

  const totalValue = markers.reduce((sum, m) => sum + (m.listing.asking_price || 0), 0);
  const uniqueStates = new Set(markers.map(m => m.listing.state).filter(Boolean)).size;

  return (
    <div className="relative w-full h-full">
      {/* Cluster CSS */}
      <style>{`
        .map-cluster {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-weight: 700;
          color: hsl(0, 0%, 10%);
          box-shadow: 0 2px 12px rgba(0,0,0,0.4);
        }
        .map-cluster span { font-size: 13px; }
        .cluster-small { background: hsl(45, 93%, 47%); border: 3px solid hsl(45, 93%, 60%); }
        .cluster-medium { background: hsl(30, 90%, 50%); border: 3px solid hsl(30, 90%, 65%); }
        .cluster-medium span { font-size: 14px; }
        .cluster-large { background: hsl(15, 85%, 50%); border: 3px solid hsl(15, 85%, 65%); }
        .cluster-large span { font-size: 15px; color: white; }
        .leaflet-popup-content-wrapper {
          background: hsl(222, 20%, 14%) !important;
          color: hsl(0, 0%, 95%) !important;
          border-radius: 12px !important;
          border: 1px solid hsl(222, 15%, 25%) !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
        }
        .leaflet-popup-tip { background: hsl(222, 20%, 14%) !important; }
        .leaflet-popup-close-button { color: hsl(0,0%,70%) !important; }
      `}</style>

      <MapContainer
        center={[-14.235, -51.925]}
        zoom={4}
        className="w-full h-full z-0"
        style={{ background: 'hsl(222, 20%, 10%)' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {markers.length > 0 && <FitBounds markers={markers} />}

        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={createClusterIcon}
          maxClusterRadius={60}
        >
          {markers.map((m) => (
            <Marker key={m.listing.id} position={[m.lat, m.lng]} icon={customIcon}>
              <Popup minWidth={240} maxWidth={300}>
                <div className="p-1">
                  <h3 className="font-bold text-sm mb-1 leading-tight" style={{ color: 'hsl(0,0%,95%)' }}>
                    {m.listing.title}
                  </h3>
                  <p className="text-xs mb-2" style={{ color: 'hsl(45, 93%, 47%)' }}>
                    {getCategoryLabel(m.listing.category)}
                  </p>
                  <div className="flex items-center gap-1 text-xs mb-1" style={{ color: 'hsl(0,0%,70%)' }}>
                    <MapPin className="w-3 h-3" />
                    {[m.listing.city, m.listing.state].filter(Boolean).join(', ')}
                  </div>
                  {m.listing.asking_price && !m.listing.hide_price && (
                    <p className="font-bold text-sm mt-2" style={{ color: 'hsl(45, 93%, 47%)' }}>
                      {formatCurrency(Number(m.listing.asking_price))}
                    </p>
                  )}
                  <Link to={`/anuncio/${m.listing.id}`}>
                    <button
                      className="mt-3 w-full text-xs font-semibold py-1.5 px-3 rounded-md"
                      style={{
                        background: 'hsl(45, 93%, 47%)',
                        color: 'hsl(0, 0%, 10%)',
                      }}
                    >
                      Ver Detalhes
                    </button>
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Bottom Stats Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-card/90 backdrop-blur-lg border-t border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-center gap-8 md:gap-16 text-sm">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-accent" />
            <span className="text-muted-foreground">Oportunidades:</span>
            <span className="font-bold text-foreground">{markers.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-accent" />
            <span className="text-muted-foreground">Valor Total:</span>
            <span className="font-bold text-foreground">{formatCurrency(totalValue)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Map className="w-4 h-4 text-accent" />
            <span className="text-muted-foreground">Estados:</span>
            <span className="font-bold text-foreground">{uniqueStates}</span>
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Carregando mapa...</span>
          </div>
        </div>
      )}
    </div>
  );
}
