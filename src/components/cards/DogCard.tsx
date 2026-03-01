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
  dog, owner, showWaveButton = false, onWave, hasWaved = false,
  isHarmony = false, compact = false, isLost = false, isOwnDog = false,
  showFullInfo = false, distanceKm, parkName,
}: DogCardProps) {
  return (
    <div className={cn(
      "dog-card",
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

        {dog.gender && !compact && (
          <div className="absolute right-2 top-2 text-xs px-2.5 py-1 rounded-full font-semibold text-white shadow-md"
            style={{ background: dog.gender === 'female' ? 'hsl(330, 60%, 50%)' : 'hsl(210, 60%, 50%)' }}>
            {dog.gender === 'male' ? '♂ Erkek' : dog.gender === 'female' ? '♀ Dişi' : ''}
          </div>
        )}

        {isOwnDog && (
          <div className="absolute left-2 top-2 text-xs px-2.5 py-1 rounded-full font-semibold text-white shadow-md"
            style={{ background: 'var(--gradient-accent)' }}>
            Senin
          </div>
        )}
      </div>

      {/* Dog Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-lg font-bold text-foreground">{dog.name}</h3>
            <p className="text-sm text-muted-foreground">
              {dog.breed?.name || 'Karışık'} · {dog.approximate_age}
              {dog.gender && <span> · {dog.gender === 'male' ? '♂' : dog.gender === 'female' ? '♀' : ''}</span>}
            </p>
          </div>
          <EnergyIndicator level={dog.daily_energy || dog.energy_level} size="sm" />
        </div>

        {(distanceKm != null || parkName) && (
          <div className="mt-1.5 flex items-center gap-2 text-xs">
            {distanceKm != null && <span className="text-muted-foreground font-medium">📍 {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`}</span>}
            {parkName && <span className="font-semibold text-[hsl(var(--park-active))]">🟢 {parkName}</span>}
          </div>
        )}

        {dog.park_checkin_active && !parkName && (
          <div className="mt-1"><span className="text-xs font-semibold text-[hsl(var(--park-active))]">🟢 Parkta</span></div>
        )}

        {isLost && owner && <div className="mt-2"><OwnerChip owner={owner} /></div>}

        {dog.social_style && (showFullInfo || !compact) && (
          <div className="mt-2">
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
              {SOCIAL_STYLE_OPTIONS.find(o => o.value === dog.social_style)?.label}
            </span>
          </div>
        )}

        {dog.likes && dog.likes.length > 0 && (showFullInfo || !compact) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {dog.likes.map(tag => <span key={tag} className="tag-like">{tag}</span>)}
          </div>
        )}

        {dog.dislikes && dog.dislikes.length > 0 && (showFullInfo || !compact) && (
          <div className="mt-1 flex flex-wrap gap-1">
            {dog.dislikes.map(tag => <span key={tag} className="tag-dislike">{tag}</span>)}
          </div>
        )}

        {compact && dog.neutered && (
          <div className="mt-2"><span className="text-xs font-semibold text-primary">✓ Kısır</span></div>
        )}

        {showWaveButton && onWave && (
          <button onClick={onWave} disabled={hasWaved}
            className={cn(
              "mt-3 w-full rounded-xl py-2.5 text-sm font-semibold transition-all",
              hasWaved
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "text-white hover:opacity-90 active:scale-[0.97] shadow-md"
            )}
            style={!hasWaved ? { background: 'var(--gradient-accent)', boxShadow: 'var(--shadow-glow-accent)' } : {}}>
            {hasWaved ? "El salladın 👋" : "El salla 👋"}
          </button>
        )}
      </div>
    </div>
  );
}
