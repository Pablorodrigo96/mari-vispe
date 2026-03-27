import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { Building2, DollarSign, Map, UserSearch } from 'lucide-react';
import { getWhatsAppLink } from '@/lib/whatsapp';
import { formatCurrency, getCategoryLabel } from '@/lib/formatters';
import { getCoordinates, resolveAllCoordinates } from '@/lib/brazilCoordinates';
import type { Tables } from '@/integrations/supabase/types';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';

type Listing = Tables<'listings'>;

export interface BuyerProfile {
  id: string;
  buyer_name: string;
  company_name: string | null;
  email: string | null;
  whatsapp: string | null;
  categories: string[];
  min_budget: number | null;
  max_budget: number | null;
  city: string | null;
  state: string | null;
  description: string | null;
}

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const sellerIcon = new L.DivIcon({
  html: `<div style="background: hsl(45, 93%, 47%); width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid hsl(45, 93%, 60%); box-shadow: 0 2px 8px rgba(0,0,0,0.4);"><div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(0,0%,10%)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div></div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const buyerIcon = new L.DivIcon({
  html: `<div style="background: hsl(210, 80%, 50%); width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid hsl(210, 80%, 65%); box-shadow: 0 2px 8px rgba(0,0,0,0.4);"><div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div></div>`,
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

interface BuyerWithCoords {
  buyer: BuyerProfile;
  lat: number;
  lng: number;
}

interface BusinessMapProps {
  listings: Listing[];
  buyers?: BuyerProfile[];
  loading: boolean;
  showSellers?: boolean;
  showBuyers?: boolean;
}

export function BusinessMap({ listings, buyers = [], loading, showSellers = true, showBuyers = true }: BusinessMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const sellerClusterRef = useRef<any>(null);
  const buyerClusterRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [resolvedListings, setResolvedListings] = useState<ListingWithCoords[]>([]);
  const [resolvedBuyers, setResolvedBuyers] = useState<BuyerWithCoords[]>([]);
  const [resolving, setResolving] = useState(false);

  // Resolve listing coordinates
  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      const syncMarkers: ListingWithCoords[] = [];
      const needsAsync: typeof listings = [];
      for (const listing of listings) {
        const coords = getCoordinates(listing.city, listing.state);
        if (coords) {
          syncMarkers.push({ listing, lat: coords.lat + (Math.random() - 0.5) * 0.02, lng: coords.lng + (Math.random() - 0.5) * 0.02 });
        } else if (listing.city || listing.state) {
          needsAsync.push(listing);
        }
      }
      if (cancelled) return;
      setResolvedListings(syncMarkers);
      if (needsAsync.length === 0) return;
      setResolving(true);
      const asyncCoords = await resolveAllCoordinates(needsAsync.map(l => ({ city: l.city, state: l.state, id: l.id })));
      if (cancelled) return;
      const asyncMarkers: ListingWithCoords[] = [];
      for (const listing of needsAsync) {
        const coords = asyncCoords.get(listing.id);
        if (coords) {
          asyncMarkers.push({ listing, lat: coords.lat + (Math.random() - 0.5) * 0.02, lng: coords.lng + (Math.random() - 0.5) * 0.02 });
        }
      }
      setResolvedListings(prev => [...prev, ...asyncMarkers]);
      setResolving(false);
    }
    resolve();
    return () => { cancelled = true; };
  }, [listings]);

  // Resolve buyer coordinates
  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      const syncMarkers: BuyerWithCoords[] = [];
      const needsAsync: BuyerProfile[] = [];
      for (const buyer of buyers) {
        const coords = getCoordinates(buyer.city, buyer.state);
        if (coords) {
          syncMarkers.push({ buyer, lat: coords.lat + (Math.random() - 0.5) * 0.02, lng: coords.lng + (Math.random() - 0.5) * 0.02 });
        } else if (buyer.city || buyer.state) {
          needsAsync.push(buyer);
        }
      }
      if (cancelled) return;
      setResolvedBuyers(syncMarkers);
      if (needsAsync.length === 0) return;
      const asyncCoords = await resolveAllCoordinates(needsAsync.map(b => ({ city: b.city, state: b.state, id: b.id })));
      if (cancelled) return;
      const asyncMarkers: BuyerWithCoords[] = [];
      for (const buyer of needsAsync) {
        const coords = asyncCoords.get(buyer.id);
        if (coords) {
          asyncMarkers.push({ buyer, lat: coords.lat + (Math.random() - 0.5) * 0.02, lng: coords.lng + (Math.random() - 0.5) * 0.02 });
        }
      }
      setResolvedBuyers(prev => [...prev, ...asyncMarkers]);
    }
    resolve();
    return () => { cancelled = true; };
  }, [buyers]);

  const visibleListings = showSellers ? resolvedListings : [];
  const visibleBuyers = showBuyers ? resolvedBuyers : [];

  const totalValue = visibleListings.reduce((sum, m) => sum + (m.listing.asking_price || 0), 0);
  const uniqueStates = new Set([
    ...visibleListings.map(m => m.listing.state).filter(Boolean),
    ...visibleBuyers.map(m => m.buyer.state).filter(Boolean),
  ]).size;

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: [-14.235, -51.925], zoom: 4, zoomControl: true });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);
    mapRef.current = map;
    const timer = setTimeout(() => map.invalidateSize(), 200);
    return () => { clearTimeout(timer); map.remove(); mapRef.current = null; };
  }, []);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (sellerClusterRef.current) { map.removeLayer(sellerClusterRef.current); sellerClusterRef.current = null; }
    if (buyerClusterRef.current) { map.removeLayer(buyerClusterRef.current); buyerClusterRef.current = null; }

    const createCluster = (bg: string, border: string, textColor: string) => (L as any).markerClusterGroup({
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      animate: true,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        let px = 52;
        if (count >= 100) px = 76;
        else if (count >= 10) px = 64;
        return L.divIcon({
          html: `<div style="background:${bg};color:${textColor};width:${px}px;height:${px}px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${px > 60 ? 16 : 14}px;border:3px solid ${border};box-shadow:0 2px 12px rgba(0,0,0,0.4)">${count}</div>`,
          className: '',
          iconSize: L.point(px, px),
        });
      },
    });

    const sellerCluster = createCluster('hsl(45,93%,47%)', 'hsl(45,93%,60%)', 'hsl(0,0%,10%)');
    const buyerCluster = createCluster('hsl(210,80%,50%)', 'hsl(210,80%,65%)', 'white');

    // Seller markers
    visibleListings.forEach(m => {
      const marker = L.marker([m.lat, m.lng], { icon: sellerIcon });
      const cityState = [m.listing.city, m.listing.state].filter(Boolean).join(', ');
      const priceHtml = m.listing.asking_price && !m.listing.hide_price
        ? `<p style="font-weight:700;font-size:14px;margin-top:8px;color:hsl(45,93%,47%)">${formatCurrency(Number(m.listing.asking_price))}</p>` : '';
      marker.bindPopup(`
        <div style="padding:4px">
          <h3 style="font-weight:700;font-size:13px;margin-bottom:4px;color:hsl(0,0%,95%)">${m.listing.title}</h3>
          <p style="font-size:12px;margin-bottom:8px;color:hsl(45,93%,47%)">${getCategoryLabel(m.listing.category)}</p>
          <div style="display:flex;align-items:center;gap:4px;font-size:12px;color:hsl(0,0%,70%)"><span>📍</span> ${cityState}</div>
          ${priceHtml}
          <a href="/anuncio/${m.listing.id}" style="display:block;margin-top:12px;text-align:center;font-size:12px;font-weight:600;padding:6px 12px;border-radius:6px;background:hsl(45,93%,47%);color:hsl(0,0%,10%);text-decoration:none">Ver Detalhes</a>
        </div>
      `, { minWidth: 240, maxWidth: 300 });
      sellerCluster.addLayer(marker);
    });

    // Buyer markers (anonymized)
    visibleBuyers.forEach((m, idx) => {
      const marker = L.marker([m.lat, m.lng], { icon: buyerIcon });
      const cityState = [m.buyer.city, m.buyer.state].filter(Boolean).join(', ');
      const cats = m.buyer.categories.map(c => getCategoryLabel(c)).join(', ');
      const budgetHtml = (m.buyer.min_budget || m.buyer.max_budget)
        ? `<p style="font-weight:700;font-size:13px;margin-top:8px;color:hsl(210,80%,60%)">Cheque: ${m.buyer.min_budget ? formatCurrency(Number(m.buyer.min_budget)) : '—'} a ${m.buyer.max_budget ? formatCurrency(Number(m.buyer.max_budget)) : '—'}</p>` : '';
      const code = `CPR-${String(idx + 1).padStart(3, '0')}`;
      const whatsMsg = `Olá! Tenho interesse em vender minha empresa para o comprador ${code} na região de ${cityState}. Gostaria de mais informações.`;
      const whatsUrl = getWhatsAppLink(whatsMsg);
      marker.bindPopup(`
        <div style="padding:4px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <div style="background:hsl(210,80%,50%);width:8px;height:8px;border-radius:50%;flex-shrink:0"></div>
            <span style="font-size:10px;color:hsl(210,80%,60%);font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Comprador Ativo — ${code}</span>
          </div>
          <p style="font-size:11px;color:hsl(210,80%,60%);margin-bottom:6px">${cats || 'Diversos setores'}</p>
          <div style="display:flex;align-items:center;gap:4px;font-size:12px;color:hsl(0,0%,70%)"><span>📍</span> ${cityState}</div>
          ${budgetHtml}
          ${m.buyer.description ? `<p style="font-size:11px;color:hsl(0,0%,60%);margin-top:6px;font-style:italic">"${m.buyer.description}"</p>` : ''}
          <a href="${whatsUrl}" target="_blank" rel="noopener noreferrer" style="display:block;margin-top:12px;text-align:center;font-size:12px;font-weight:600;padding:6px 12px;border-radius:6px;background:hsl(210,80%,50%);color:white;text-decoration:none">Tenho uma empresa para este comprador</a>
        </div>
      `, { minWidth: 240, maxWidth: 300 });
      buyerCluster.addLayer(marker);
    });

    map.addLayer(sellerCluster);
    map.addLayer(buyerCluster);
    sellerClusterRef.current = sellerCluster;
    buyerClusterRef.current = buyerCluster;

    const allCoords = [
      ...visibleListings.map(m => [m.lat, m.lng] as [number, number]),
      ...visibleBuyers.map(m => [m.lat, m.lng] as [number, number]),
    ];
    if (allCoords.length > 0) {
      map.fitBounds(L.latLngBounds(allCoords), { padding: [50, 50], maxZoom: 12 });
    }
  }, [visibleListings, visibleBuyers]);

  return (
    <div className="relative w-full h-full">
      <style>{`
        .leaflet-popup-content-wrapper { background: hsl(222, 20%, 14%) !important; color: hsl(0, 0%, 95%) !important; border-radius: 12px !important; border: 1px solid hsl(222, 15%, 25%) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important; }
        .leaflet-popup-tip { background: hsl(222, 20%, 14%) !important; }
        .leaflet-popup-close-button { color: hsl(0,0%,70%) !important; }
      `}</style>

      <div ref={containerRef} className="w-full h-full z-0" style={{ background: 'hsl(222, 20%, 10%)' }} />

      {/* Legend */}
      <div className="absolute top-3 right-3 z-[1000] bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 text-xs space-y-1.5">
        {showSellers && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: 'hsl(45, 93%, 47%)' }} />
            <span className="text-muted-foreground">Empresa à venda</span>
          </div>
        )}
        {showBuyers && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: 'hsl(210, 80%, 50%)' }} />
            <span className="text-muted-foreground">Comprador ativo</span>
          </div>
        )}
      </div>

      {/* Bottom Stats Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-card/90 backdrop-blur-lg border-t border-border">
        <div className="flex items-center justify-center gap-3 sm:gap-8 md:gap-16 px-3 py-2 sm:py-3 text-xs sm:text-sm">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent shrink-0" />
            <span className="font-bold text-foreground">{visibleListings.length}</span>
          </div>
          {showBuyers && visibleBuyers.length > 0 && (
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              <UserSearch className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" style={{ color: 'hsl(210, 80%, 50%)' }} />
              <span className="font-bold text-foreground">{visibleBuyers.length}</span>
            </div>
          )}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent shrink-0" />
            <span className="font-bold text-foreground truncate">{formatCurrency(totalValue)}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <Map className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent shrink-0" />
            <span className="font-bold text-foreground">{uniqueStates} <span className="hidden sm:inline text-muted-foreground font-normal">estados</span></span>
          </div>
        </div>
      </div>

      {(loading || resolving) && (
        <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">{resolving ? 'Resolvendo coordenadas...' : 'Carregando mapa...'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
