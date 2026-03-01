import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { EnergyIndicator } from '@/components/ui/EnergyIndicator';
import { OwnerChip } from '@/components/ui/OwnerChip';
import type { Dog, Profile } from '@/types/dogspace';
import { SOCIAL_STYLE_OPTIONS } from '@/types/dogspace';

interface DogCardProps {
  dog: Dog;
  owner?: Profile;
  showWaveButton?: boolean;
  onWave?: () => void;
  onUnwave?: () => void;
  hasWaved?: boolean;
  waveTimestamp?: number | null;
  isHarmony?: boolean;
  compact?: boolean;
  isLost?: boolean;
  isOwnDog?: boolean;
  showFullInfo?: boolean;
  distanceKm?: number | null;
  parkName?: string | null;
}

const UNDO_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

export function DogCard({ 
  dog, owner, showWaveButton = false, onWave, onUnwave, hasWaved = false,
  waveTimestamp, isHarmony = false, compact = false, isLost = false, isOwnDog = false,
  showFullInfo = false, distanceKm, parkName,
}: DogCardProps) {
  const [canUndo, setCanUndo] = useState(false);

  useEffect(() => {
    if (!hasWaved || !waveTimestamp) { setCanUndo(false); return; }
    const elapsed = Date.now() - waveTimestamp;
    if (elapsed >= UNDO_WINDOW_MS) { setCanUndo(false); return; }
    setCanUndo(true);
    const timer = setTimeout(() => setCanUndo(false), UNDO_WINDOW_MS - elapsed);
    return () => clearTimeout(timer);
  }, [hasWaved, waveTimestamp]);

  return (
    <div className={cn(
      "dog-card flex flex-col",
      isHarmony && "harmony-glow active",
      isLost && "ring-2 ring-destructive",
      isOwnDog && "ring-2 ring-primary"
    )}>
      {/* Dog Photo */}
      <div className="relative">
        <img src={dog.photo_url} alt={dog.name}
          className={cn("dog-card-photo", compact ? "aspect-[4/3]" : "aspect-square")} />
        
        {isLost && (
          <div className="absolute inset-0 bg-gradient-to-t from-destructive/90 to-destructive/60 flex items-center justify-center">
            <span className="text-white font-extrabold text-xl tracking-wide">KAYIP</span>
          </div>
        )}
        
        {owner && !isLost && (
          <div className="absolute bottom-2 left-2">
            <OwnerChip owner={owner} />
          </div>
        )}

        {isOwnDog && (
          <div className="absolute left-2 top-2 text-xs px-2.5 py-1 rounded-full font-semibold text-white shadow-md"
            style={{ background: 'var(--gradient-accent)' }}>
            Senin
          </div>
        )}
      </div>

      {/* Dog Info - flex-1 to push wave button to bottom */}
      <div className="p-3 flex flex-col flex-1">
        <div className="flex-1 space-y-1">
          {/* Line 1: Name */}
          <h3 className="truncate font-display text-base font-bold text-foreground">{dog.name}</h3>
          
          {/* Line 2: Breed */}
          <p className="text-xs text-muted-foreground truncate">
            {dog.breed?.name || 'Karışık'}
          </p>

          {/* Line 3: Age + Gender */}
          <p className="text-xs text-muted-foreground">
            {dog.approximate_age}
            {dog.gender && (
              <span className="font-semibold ml-1" style={{ color: dog.gender === 'female' ? 'hsl(330, 60%, 50%)' : 'hsl(210, 60%, 50%)' }}>
                {dog.gender === 'male' ? '♂ Erkek' : '♀ Dişi'}
              </span>
            )}
          </p>

          {/* Line 4: Social style */}
          {dog.social_style && (
            <div>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                {SOCIAL_STYLE_OPTIONS.find(o => o.value === dog.social_style)?.label}
              </span>
            </div>
          )}

          {/* Line 5: Distance + Last park */}
          <div className="flex items-center gap-1.5 text-[10px] flex-wrap">
            {distanceKm != null && (
              <span className="text-muted-foreground font-medium">
                📍 {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`}
              </span>
            )}
            {parkName && <span className="font-semibold text-[hsl(var(--park-active))]">🟢 {parkName}</span>}
            {dog.park_checkin_active && !parkName && (
              <span className="font-semibold text-[hsl(var(--park-active))]">🟢 Parkta</span>
            )}
          </div>
        </div>

        {isLost && owner && <div className="mt-2"><OwnerChip owner={owner} /></div>}

        {/* Wave button - always at bottom, aligned */}
        {showWaveButton && onWave && (
          <div className="mt-3 pt-2">
            {hasWaved && canUndo && onUnwave ? (
              <button onClick={onUnwave}
                className="w-full rounded-xl py-2.5 text-sm font-semibold transition-all bg-destructive/15 text-destructive hover:bg-destructive/25 active:scale-[0.97]">
                Geri al ↩️
              </button>
            ) : (
              <button onClick={onWave} disabled={hasWaved}
                className={cn(
                  "w-full rounded-xl py-2.5 text-sm font-semibold transition-all",
                  hasWaved
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "text-white hover:opacity-90 active:scale-[0.97] shadow-md"
                )}
                style={!hasWaved ? { background: 'var(--gradient-accent)', boxShadow: 'var(--shadow-glow-accent)' } : {}}>
                {hasWaved ? "El salladın 👋" : "El salla 👋"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
