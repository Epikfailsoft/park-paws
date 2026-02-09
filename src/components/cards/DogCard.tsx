import { cn } from '@/lib/utils';
import { EnergyIndicator } from '@/components/ui/EnergyIndicator';
import { OwnerChip } from '@/components/ui/OwnerChip';
import type { Dog, Profile } from '@/types/dogspace';
import { SOCIAL_STYLE_OPTIONS, TRIGGER_OPTIONS } from '@/types/dogspace';

interface DogCardProps {
  dog: Dog;
  owner?: Profile;
  showWaveButton?: boolean;
  onWave?: () => void;
  hasWaved?: boolean;
  isHarmony?: boolean;
  compact?: boolean;
  isLost?: boolean;
  isOwnDog?: boolean;
  showFullInfo?: boolean;
  distanceKm?: number | null;
  parkName?: string | null;
}

export function DogCard({ 
  dog, 
  owner, 
  showWaveButton = false, 
  onWave,
  hasWaved = false,
  isHarmony = false,
  compact = false,
  isLost = false,
  isOwnDog = false,
  showFullInfo = false,
  distanceKm,
  parkName,
}: DogCardProps) {
  return (
    <div 
      className={cn(
        "dog-card",
        isHarmony && "harmony-glow active",
        isLost && "ring-2 ring-destructive",
        isOwnDog && "ring-2 ring-primary"
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
        
        {/* Lost overlay */}
        {isLost && (
          <div className="absolute inset-0 bg-destructive/80 flex items-center justify-center">
            <span className="text-destructive-foreground font-bold text-xl">KAYIP</span>
          </div>
        )}
        
        {/* Owner chip overlay */}
        {owner && !isLost && (
          <div className="absolute bottom-2 left-2">
            <OwnerChip owner={owner} />
          </div>
        )}

        {/* Neutered badge */}
        {dog.neutered && !compact && (
          <div className="absolute right-2 top-2 bg-primary/90 text-primary-foreground text-xs px-2 py-0.5 rounded-full">
            ✓ Kısır
          </div>
        )}

        {/* Own dog badge */}
        {isOwnDog && (
          <div className="absolute left-2 top-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
            Senin
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
              {dog.breed?.name || 'Karışık'} · {dog.approximate_age}
            </p>
          </div>
          
          <EnergyIndicator level={dog.daily_energy || dog.energy_level} size="sm" />
        </div>

        {/* Owner chip for lost dogs */}
        {isLost && owner && (
          <div className="mt-2">
            <OwnerChip owner={owner} />
          </div>
        )}

        {/* Social style tag if set */}
        {dog.social_style && (showFullInfo || !compact) && (
          <div className="mt-2">
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              {SOCIAL_STYLE_OPTIONS.find(o => o.value === dog.social_style)?.label}
            </span>
          </div>
        )}

        {/* Triggers */}
        {dog.triggers && dog.triggers.length > 0 && (showFullInfo || !compact) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {dog.triggers.map(trigger => {
              const triggerInfo = TRIGGER_OPTIONS.find(t => t.value === trigger);
              return (
                <span 
                  key={trigger}
                  className="rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent"
                >
                  {triggerInfo?.label || trigger}
                </span>
              );
            })}
          </div>
        )}

        {/* Neutered badge for compact mode */}
        {compact && (
          <div className="mt-2 flex items-center gap-2">
            {dog.neutered && (
              <span className="text-xs text-primary">✓ Kısır</span>
            )}
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
