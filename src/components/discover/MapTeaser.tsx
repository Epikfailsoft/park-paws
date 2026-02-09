import { MapPin, Lock } from 'lucide-react';

interface MapTeaserProps {
  activeDogCount: number;
  activeParkCount: number;
}

export function MapTeaser({ activeDogCount, activeParkCount }: MapTeaserProps) {
  return (
    <div className="rounded-2xl bg-secondary/50 border border-border p-4 relative overflow-hidden">
      {/* Lock overlay */}
      <div className="absolute top-3 right-3">
        <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
          <Lock className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-medium text-muted-foreground">Yakında</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <MapPin className="h-6 w-6 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-3 text-sm font-medium text-foreground">
            <span>🐕 Aktif Köpek: {activeDogCount}</span>
            <span className="text-muted-foreground">·</span>
            <span>📍 Aktif Park: {activeParkCount}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Harita görünümü Plus Play ile gelecek
          </p>
        </div>
      </div>
    </div>
  );
}
