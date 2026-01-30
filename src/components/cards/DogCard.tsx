import { cn } from '@/lib/utils';
import { EnergyIndicator } from '@/components/ui/EnergyIndicator';
import { OwnerChip } from '@/components/ui/OwnerChip';
import type { Dog, Profile } from '@/types/dogspace';

interface DogCardProps {
  dog: Dog;
  owner?: Profile;
  showWaveButton?: boolean;
  onWave?: () => void;
  hasWaved?: boolean;
  isHarmony?: boolean;
  compact?: boolean;
}

export function DogCard({ 
  dog, 
  owner, 
  showWaveButton = false, 
  onWave,
  hasWaved = false,
  isHarmony = false,
  compact = false,
}: DogCardProps) {
  return (
    <div 
      className={cn(
        "dog-card",
        isHarmony && "harmony-glow active"
      )}
    >
      {/* Dog Photo */}
      <div className="relative">
        <img
          src={dog.photo_url}
          alt={dog.name}
          className={cn(
            "dog-card-photo",
            compact ? "aspect-[4/3]" : "aspect-square"
          )}
        />
        
        {/* Owner chip overlay */}
        {owner && (
          <div className="absolute bottom-2 left-2">
            <OwnerChip owner={owner} />
          </div>
        )}

        {/* Active in park indicator */}
        {dog.is_active_in_park && (
          <div className="absolute right-2 top-2">
            <span className="flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-park-active opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-park-active" />
            </span>
          </div>
        )}
      </div>

      {/* Dog Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-lg font-semibold text-foreground">
              {dog.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {dog.approximate_age}
            </p>
          </div>
          
          <EnergyIndicator level={dog.energy_level} size="sm" />
        </div>

        {/* Behavior tag if set */}
        {dog.behavior && !compact && (
          <div className="mt-2">
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              {dog.behavior === 'social' && 'Sosyal'}
              {dog.behavior === 'selective' && 'Seçici'}
              {dog.behavior === 'shy' && 'Çekingen'}
              {dog.behavior === 'dominant' && 'Dominant'}
            </span>
          </div>
        )}

        {/* Wave button */}
        {showWaveButton && onWave && (
          <button
            onClick={onWave}
            disabled={hasWaved}
            className={cn(
              "mt-3 w-full rounded-xl py-2.5 text-sm font-medium transition-all",
              hasWaved
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-accent text-accent-foreground hover:opacity-90 active:scale-[0.98]"
            )}
          >
            {hasWaved ? "El salladın 👋" : "El salla 👋"}
          </button>
        )}
      </div>
    </div>
  );
}
