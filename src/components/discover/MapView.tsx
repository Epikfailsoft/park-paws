import { Lock } from 'lucide-react';

interface MapViewProps {
  hasAccess: boolean;
}

export function MapView({ hasAccess }: MapViewProps) {
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

  // Placeholder for actual map - will be Leaflet
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <p className="text-sm text-muted-foreground">Harita görünümü yakında aktif olacak</p>
    </div>
  );
}
