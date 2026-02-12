import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { Building2, DollarSign, Map } from 'lucide-react';
import { formatCurrency, getCategoryLabel } from '@/lib/formatters';
import { getCoordinates } from '@/lib/brazilCoordinates';
import type { Tables } from '@/integrations/supabase/types';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';

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

interface ListingWithCoords {
  listing: Listing;
  lat: number;
  lng: number;
}

interface BusinessMapProps {
  listings: Listing[];
  loading: boolean;
}

export function BusinessMap({ listings, loading }: BusinessMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const markers: ListingWithCoords[] = listings
    .map(listing => {
      const coords = getCoordinates(listing.city, listing.state);
      if (!coords) return null;
      return {
        listing,
        lat: coords.lat + (Math.random() - 0.5) * 0.02,
        lng: coords.lng + (Math.random() - 0.5) * 0.02,
      };
    })
    .filter(Boolean) as ListingWithCoords[];

  const totalValue = markers.reduce((sum, m) => sum + (m.listing.asking_price || 0), 0);
  const uniqueStates = new Set(markers.map(m => m.listing.state).filter(Boolean)).size;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [-14.235, -51.925],
      zoom: 4,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove previous cluster group
    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
      clusterRef.current = null;
    }

    const clusterGroup = (L as any).markerClusterGroup({
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      animate: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size = 'small';
        let px = 52;
        if (count >= 100) { size = 'large'; px = 76; }
        else if (count >= 10) { size = 'medium'; px = 64; }
        return L.divIcon({
          html: `<div>${count}</div>`,
          className: `marker-cluster marker-cluster-${size}`,
          iconSize: L.point(px, px),
        });
      },
    });

    markers.forEach(m => {
      const marker = L.marker([m.lat, m.lng], { icon: customIcon });

      const cityState = [m.listing.city, m.listing.state].filter(Boolean).join(', ');
      const priceHtml = m.listing.asking_price && !m.listing.hide_price
        ? `<p style="font-weight:700;font-size:14px;margin-top:8px;color:hsl(45,93%,47%)">${formatCurrency(Number(m.listing.asking_price))}</p>`
        : '';

      marker.bindPopup(`
        <div style="padding:4px">
          <h3 style="font-weight:700;font-size:13px;margin-bottom:4px;color:hsl(0,0%,95%)">${m.listing.title}</h3>
          <p style="font-size:12px;margin-bottom:8px;color:hsl(45,93%,47%)">${getCategoryLabel(m.listing.category)}</p>
          <div style="display:flex;align-items:center;gap:4px;font-size:12px;color:hsl(0,0%,70%)">
            <span>📍</span> ${cityState}
          </div>
          ${priceHtml}
          <a href="/anuncio/${m.listing.id}" style="display:block;margin-top:12px;text-align:center;font-size:12px;font-weight:600;padding:6px 12px;border-radius:6px;background:hsl(45,93%,47%);color:hsl(0,0%,10%);text-decoration:none">Ver Detalhes</a>
        </div>
      `, { minWidth: 240, maxWidth: 300 });

      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
    clusterRef.current = clusterGroup;

    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [markers.length, listings]);

  return (
    <div className="relative w-full h-full">
      <style>{`
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

      <div ref={containerRef} className="w-full h-full z-0" style={{ background: 'hsl(222, 20%, 10%)' }} />

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
