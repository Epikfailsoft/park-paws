import { cn } from '@/lib/utils';
import { SOCIAL_STYLE_OPTIONS } from '@/types/dogspace';

interface DiscoverFiltersProps {
  distance: number;
  onDistanceChange: (km: number) => void;
  genderFilter: string | null;
  onGenderChange: (val: string | null) => void;
  socialStyleFilter: string | null;
  onSocialStyleChange: (val: string | null) => void;
}

const DISTANCE_OPTIONS = [1, 2, 5, 10];

export function DiscoverFilters({
  distance,
  onDistanceChange,
  genderFilter,
  onGenderChange,
  socialStyleFilter,
  onSocialStyleChange,
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

      {/* Gender + Social Style row */}
      <div className="flex gap-4">
        {/* Gender */}
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Cinsiyet</p>
          <div className="flex gap-1">
            {[
              { value: 'female', label: '♀ Dişi' },
              { value: 'male', label: '♂ Erkek' },
            ].map((g) => (
              <button
                key={g.value}
                onClick={() => onGenderChange(genderFilter === g.value ? null : g.value)}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-xs font-medium transition-all",
                  genderFilter === g.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Social Style */}
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Oyun Tarzı</p>
          <div className="flex gap-1">
            {SOCIAL_STYLE_OPTIONS.map((style) => (
              <button
                key={style.value}
                onClick={() => onSocialStyleChange(socialStyleFilter === style.value ? null : style.value)}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-[10px] font-medium transition-all",
                  socialStyleFilter === style.value
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-secondary-foreground"
                )}
              >
                {style.icon}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
