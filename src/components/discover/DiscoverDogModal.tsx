import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SOCIAL_STYLE_OPTIONS } from '@/types/dogspace';
import { EnergyIndicator } from '@/components/ui/EnergyIndicator';
import type { DiscoverDog } from '@/types/dogspace';

interface DogPhoto {
  id: string;
  photo_url: string;
  sort_order: number;
}

interface DiscoverDogModalProps {
  dog: DiscoverDog | null;
  onClose: () => void;
  onWave?: () => void;
  hasWaved?: boolean;
}

export function DiscoverDogModal({ dog, onClose, onWave, hasWaved }: DiscoverDogModalProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    if (!dog) { setPhotos([]); return; }
    setPhotoIndex(0);
    // Fetch extra photos from dog_photos
    supabase
      .from('dog_photos')
      .select('id, photo_url, sort_order')
      .eq('dog_id', dog.dog_id)
      .order('sort_order')
      .then(({ data }) => {
        const extras = (data || []).map((p: DogPhoto) => p.photo_url);
        // Main photo first, then extras (deduplicated)
        const all = [dog.photo_url, ...extras.filter((u: string) => u !== dog.photo_url)];
        setPhotos(all);
      });
  }, [dog?.dog_id]);

  if (!dog) return null;

  const socialStyle = SOCIAL_STYLE_OPTIONS.find(s => s.value === dog.social_style);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-50 w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-card animate-in slide-in-from-bottom-8 duration-300 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Photo carousel */}
        <div className="relative aspect-square bg-muted">
          {photos.length > 0 ? (
            <img
              src={photos[photoIndex]}
              alt={dog.dog_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <img src={dog.photo_url} alt={dog.dog_name} className="h-full w-full object-cover" />
          )}

          {/* Photo dots */}
          {photos.length > 1 && (
            <>
              <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5">
                {photos.map((_, i) => (
                  <div key={i} className={`h-1 rounded-full transition-all ${i === photoIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`} />
                ))}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setPhotoIndex(Math.max(0, photoIndex - 1)); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white"
                style={{ display: photoIndex === 0 ? 'none' : 'flex' }}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setPhotoIndex(Math.min(photos.length - 1, photoIndex + 1)); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white"
                style={{ display: photoIndex === photos.length - 1 ? 'none' : 'flex' }}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Close */}
          <button onClick={onClose} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white">
            <X className="h-4 w-4" />
          </button>

          {/* Gradient overlay at bottom of photo */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-card to-transparent" />
        </div>

        {/* Info */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4 -mt-6 relative z-10">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-foreground flex items-center gap-2">
              {dog.dog_name}
              {dog.gender && (
                <span className="text-lg" style={{ color: dog.gender === 'female' ? 'hsl(330, 60%, 50%)' : 'hsl(210, 60%, 50%)' }}>
                  {dog.gender === 'male' ? '♂' : '♀'}
                </span>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">
              {dog.breed_name || 'Karışık'} · {dog.approximate_age}
              {dog.weight_kg ? ` · ${dog.weight_kg}kg` : ''}
            </p>
          </div>

          {/* Distance & Park */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {dog.distance_km != null && (
              <span>📍 {dog.distance_km < 1 ? `${Math.round(dog.distance_km * 1000)} m` : `${dog.distance_km.toFixed(1)} km`}</span>
            )}
            {dog.current_park_name && (
              <span className="font-semibold text-[hsl(var(--park-active))]">🟢 {dog.current_park_name}</span>
            )}
            {dog.playdate_on && !dog.current_park_name && (
              <span className="font-semibold text-blue-500">🎾 Playdate açık</span>
            )}
          </div>

          {/* Energy */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">Enerji</span>
            <EnergyIndicator level={dog.energy_level as 1 | 2 | 3} size="md" showLabel />
          </div>

          {/* Social style */}
          {socialStyle && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">Sosyallik</span>
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                {socialStyle.icon} {socialStyle.label}
              </span>
            </div>
          )}

          {/* Neutered */}
          {dog.is_neutered && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">Kısırlaştırılmış</span>
              <span className="text-xs text-primary font-medium">✓ Evet</span>
            </div>
          )}

          {/* Bio */}
          {dog.bio && (
            <div className="rounded-xl bg-secondary/50 p-3">
              <p className="text-sm text-foreground italic">"{dog.bio}"</p>
            </div>
          )}

          {/* Triggers */}
          {dog.triggers && dog.triggers.length > 0 && (
            <div>
              <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Tetikleyiciler</span>
              <div className="flex flex-wrap gap-1.5">
                {dog.triggers.map(t => (
                  <span key={t} className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Wave button */}
          {onWave && (
            <button
              onClick={onWave}
              disabled={hasWaved}
              className={`w-full rounded-xl py-3 text-sm font-semibold transition-all ${
                hasWaved ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'text-white hover:opacity-90 active:scale-[0.97] shadow-md'
              }`}
              style={!hasWaved ? { background: 'var(--gradient-accent)', boxShadow: 'var(--shadow-glow-accent)' } : {}}
            >
              {hasWaved ? 'Havladın 🐕' : 'Havla 🐕'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
