import { useEffect, useState } from 'react';
import { Lock, MapPin } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from '@/hooks/useLocation';

// Fix leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface ParkMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  dogCount: number;
  playdateCount: number;
}

interface MapViewProps {
  hasAccess: boolean;
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], 13); }, [lat, lng]);
  return null;
}

const parkIcon = new L.DivIcon({
  className: 'custom-park-marker',
  html: `<div style="background:hsl(20,90%,48%);width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid white;">🐾</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export function MapView({ hasAccess }: MapViewProps) {
  const { lat, lng } = useLocation();
  const [parks, setParks] = useState<ParkMarker[]>([]);

  useEffect(() => {
    if (!hasAccess) return;
    fetchParks();
  }, [hasAccess]);

  const fetchParks = async () => {
    const { data } = await supabase
      .from('parks')
      .select('id, name, location, status')
      .eq('status', 'ACTIVE');

    if (data) {
      const markers: ParkMarker[] = [];
      for (const park of data) {
        const loc = park.location as any;
        if (loc?.lat && loc?.lng) {
          // Get dog counts for this park
          const { count: dogCount } = await supabase
            .from('dogs')
            .select('id', { count: 'exact', head: true })
            .eq('current_park_id', park.id)
            .eq('park_checkin_active', true);

          const { count: playdateCount } = await supabase
            .from('dogs')
            .select('id', { count: 'exact', head: true })
            .eq('current_park_id', park.id)
            .eq('playdate_on', true);

          markers.push({
            id: park.id,
            name: park.name,
            lat: loc.lat,
            lng: loc.lng,
            dogCount: dogCount || 0,
            playdateCount: playdateCount || 0,
          });
        }
      }
      setParks(markers);
    }
  };

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
          <Lock className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="mb-2 font-display text-lg font-bold text-foreground">Harita Görünümü</h2>
        <p className="max-w-[280px] text-sm text-muted-foreground mb-4">
          Yakınındaki parkları ve köpek yoğunluğunu haritada gör.
        </p>
        <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-5 max-w-xs">
          <p className="text-sm font-semibold text-primary mb-1">🚀 Plus Play</p>
          <p className="text-xs text-muted-foreground mb-3">Harita görünümü, profil ziyaretleri ve daha fazlası</p>
          <div className="flex items-baseline gap-1 justify-center mb-1">
            <span className="text-2xl font-bold text-foreground">₺99</span>
            <span className="text-sm text-muted-foreground">/ay</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Yıllık ödemede %30 indirim</p>
        </div>
        <p className="mt-4 text-xs text-muted-foreground italic">Yakında aktif olacak</p>
      </div>
    );
  }

  const center: [number, number] = lat && lng ? [lat, lng] : [41.0082, 28.9784]; // Default Istanbul

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 200px)' }}>
      <MapContainer center={center} zoom={12} className="h-full w-full rounded-xl z-0" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {lat && lng && <RecenterMap lat={lat} lng={lng} />}
        {parks.map(park => (
          <Marker key={park.id} position={[park.lat, park.lng]} icon={parkIcon}>
            <Popup>
              <div className="text-center">
                <p className="font-bold text-sm">{park.name}</p>
                <p className="text-xs text-gray-600">🐕 {park.dogCount} köpek aktif</p>
                <p className="text-xs text-gray-600">🎾 {park.playdateCount} playdate açık</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="absolute top-3 left-3 z-[1000] rounded-xl bg-card/90 backdrop-blur px-3 py-2 border border-border shadow-lg">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">{parks.length} aktif park</span>
        </div>
      </div>
    </div>
  );
}
