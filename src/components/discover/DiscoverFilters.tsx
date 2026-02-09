import { cn } from '@/lib/utils';

interface DiscoverFiltersProps {
  distance: number;
  onDistanceChange: (km: number) => void;
  energyFilter: number | null;
  onEnergyChange: (level: number | null) => void;
  neuteredFilter: boolean | null;
  onNeuteredChange: (val: boolean | null) => void;
}

const DISTANCE_OPTIONS = [1, 2, 5, 10];

export function DiscoverFilters({
  distance,
  onDistanceChange,
  energyFilter,
  onEnergyChange,
  neuteredFilter,
  onNeuteredChange,
}: DiscoverFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Distance */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Mesafe</p>
        <div className="flex gap-2">
          {DISTANCE_OPTIONS.map((km) => (
            <button
              key={km}
              onClick={() => onDistanceChange(km)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                distance === km
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              )}
            >
              {km} km
            </button>
          ))}
        </div>
      </div>

      {/* Energy + Neutered row */}
      <div className="flex gap-4">
        {/* Energy */}
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Enerji</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                onClick={() => onEnergyChange(energyFilter === level ? null : level)}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-xs font-medium transition-all",
                  energyFilter === level
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-secondary-foreground"
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Neutered */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Kısır</p>
          <div className="flex gap-1">
            {([true, false] as const).map((val) => (
              <button
                key={String(val)}
                onClick={() => onNeuteredChange(neuteredFilter === val ? null : val)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  neuteredFilter === val
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                )}
              >
                {val ? '✓' : '✗'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
