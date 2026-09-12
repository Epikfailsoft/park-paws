import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SOCIAL_STYLE_OPTIONS } from '@/types/dogspace';
import { EnergyIndicator } from '@/components/ui/EnergyIndicator';
import { PhotoLightbox } from '@/components/ui/PhotoLightbox';

interface DogPhoto {
  id: string;
  photo_url: string;
  sort_order: number;
}

interface DogBadge {
  id: string;
  earned_at: string;
  badge: { code: string; name: string; description: string; icon: string };
}

// Zodiac definitions
const ZODIAC_SIGNS = [
  { value: 'aries', label: 'Koç', icon: '♈' },
  { value: 'taurus', label: 'Boğa', icon: '♉' },
  { value: 'gemini', label: 'İkizler', icon: '♊' },
  { value: 'cancer', label: 'Yengeç', icon: '♋' },
  { value: 'leo', label: 'Aslan', icon: '♌' },
  { value: 'virgo', label: 'Başak', icon: '♍' },
  { value: 'libra', label: 'Terazi', icon: '♎' },
  { value: 'scorpio', label: 'Akrep', icon: '♏' },
  { value: 'sagittarius', label: 'Yay', icon: '♐' },
  { value: 'capricorn', label: 'Oğlak', icon: '♑' },
  { value: 'aquarius', label: 'Kova', icon: '♒' },
  { value: 'pisces', label: 'Balık', icon: '♓' },
];

// Origin labels
const ORIGIN_LABELS: Record<string, { label: string; icon: string }> = {
  'owned': { label: 'Sahipli', icon: '🏠' },
  'shelter': { label: 'Barınak', icon: '🏥' },
  'street': { label: 'Sokak', icon: '🐾' },
};

// Play style labels
const PLAY_STYLE_LABELS: Record<string, string> = {
  chase: '🏃 Kovalamaca',
  wrestle: '💪 Güreş',
  toy: '🧸 Oyuncak',
  gentle: '🤗 Nazik',
  calm_social: '☕ Sakin',
};

// Size labels
const SIZE_LABELS: Record<string, string> = {
  small: '🐕 Küçük',
  medium: '🐕‍🦺 Orta',
  large: '🐾 Büyük',
};

export interface DogProfileData {
  dog_id: string;
  dog_name: string;
  photo_url: string;
  breed_name?: string | null;
  approximate_age: string;
  energy_level: number;
  daily_energy?: number | null;
  gender?: string | null;
  weight_kg?: number | null;
  social_style?: string | null;
  triggers?: string[] | null;
  bio?: string | null;
  is_neutered?: boolean;
  is_lost?: boolean;
  distance_km?: number | null;
  current_park_name?: string | null;
  park_checkin_active?: boolean;
  playdate_on?: boolean;
  owner_name_stub?: string | null;
  owner_photo_stub?: string | null;
  // Extended fields (fetched if available)
  zodiac_sign?: string | null;
  is_shelter?: boolean | null;
  likes?: string[] | null;
  dislikes?: string[] | null;
  play_styles?: string[] | null;
  size_label?: string | null;
  sociality?: string | null;
  aggression_risk?: string | null;
  offleash_compat?: string | null;
  active_hours?: string[] | null;
  walk_duration?: string | null;
  origin?: string | null; // 'owned' | 'shelter' | 'street'
}

interface DogProfileSheetProps {
  dog: DogProfileData | null;
  onClose: () => void;
  onWave?: () => void;
  hasWaved?: boolean;
}

export function DogProfileSheet({ dog, onClose, onWave, hasWaved }: DogProfileSheetProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [badges, setBadges] = useState<DogBadge[]>([]);
  const [extendedData, setExtendedData] = useState<any>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!dog) { setPhotos([]); setBadges([]); setExtendedData(null); return; }
    setPhotoIndex(0);

    // Fetch photos
    supabase
      .from('dog_photos')
      .select('id, photo_url, sort_order')
      .eq('dog_id', dog.dog_id)
      .order('sort_order')
      .then(({ data }) => {
        const extras = (data || []).map((p: DogPhoto) => p.photo_url);
        const all = [dog.photo_url, ...extras.filter((u: string) => u !== dog.photo_url)];
        setPhotos(all);
      });

    // Fetch badges
    supabase
      .from('dog_badges')
      .select('id, earned_at, badge:badges(code, name, description, icon)')
      .eq('dog_id', dog.dog_id)
      .then(({ data }) => {
        if (data) setBadges(data as unknown as DogBadge[]);
      });

    // Fetch extended dog data
    supabase
      .from('dogs')
      .select('zodiac_sign, is_shelter, likes, dislikes, play_styles, size_label, sociality, aggression_risk, offleash_compat, active_hours, walk_duration')
      .eq('id', dog.dog_id)
      .single()
      .then(({ data }) => {
        if (data) setExtendedData(data);
      });
  }, [dog?.dog_id]);

  if (!dog) return null;

  const socialStyle = SOCIAL_STYLE_OPTIONS.find(s => s.value === dog.social_style);
  const zodiac = extendedData?.zodiac_sign ? ZODIAC_SIGNS.find(z => z.value === extendedData.zodiac_sign) : null;
  
  // Determine origin
  const origin = extendedData?.is_shelter === true ? 'shelter' : extendedData?.is_shelter === false ? 'owned' : null;
  const originInfo = origin ? ORIGIN_LABELS[origin] : null;

  const likes = extendedData?.likes || dog.likes || [];
  const dislikes = extendedData?.dislikes || dog.dislikes || [];
  const playStyles = extendedData?.play_styles || dog.play_styles || [];
  const sizeLabel = extendedData?.size_label || dog.size_label;
  const triggers = dog.triggers || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-50 w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-card animate-in slide-in-from-bottom-8 duration-300 max-h-[92vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Photo carousel */}
        <div className="relative aspect-[4/3] bg-muted shrink-0">
          {photos.length > 0 ? (
            <img src={photos[photoIndex]} alt={dog.dog_name} className="h-full w-full object-cover" />
          ) : (
            <img src={dog.photo_url} alt={dog.dog_name} className="h-full w-full object-cover" />
          )}

          {/* Photo dots & nav */}
          {photos.length > 1 && (
            <>
              <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5">
                {photos.map((_, i) => (
                  <div key={i} className={`h-1 rounded-full transition-all ${i === photoIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`} />
                ))}
              </div>
              {photoIndex > 0 && (
                <button onClick={(e) => { e.stopPropagation(); setPhotoIndex(photoIndex - 1); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white">
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              {photoIndex < photos.length - 1 && (
                <button onClick={(e) => { e.stopPropagation(); setPhotoIndex(photoIndex + 1); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white">
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </>
          )}

          <button onClick={onClose} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white">
            <X className="h-4 w-4" />
          </button>

          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-card to-transparent" />
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4 -mt-4 relative z-10">
          {/* Name & basic info */}
          <div>
            <h2 className="font-display text-2xl font-extrabold text-foreground flex items-center gap-2">
              {dog.dog_name}
              {dog.gender && (
                <span className="text-lg" style={{ color: dog.gender === 'female' ? 'hsl(330, 60%, 50%)' : 'hsl(210, 60%, 50%)' }}>
                  {dog.gender === 'male' ? '♂' : '♀'}
                </span>
              )}
              {zodiac && <span className="text-lg" title={zodiac.label}>{zodiac.icon}</span>}
            </h2>
            <p className="text-sm text-muted-foreground">
              {dog.breed_name || 'Karışık'} · {dog.approximate_age}
              {dog.weight_kg ? ` · ${dog.weight_kg}kg` : ''}
              {sizeLabel ? ` · ${SIZE_LABELS[sizeLabel] || sizeLabel}` : ''}
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
              <span className="font-semibold" style={{ color: 'hsl(210, 60%, 50%)' }}>🎾 Playdate açık</span>
            )}
          </div>

          {/* Aile (Family) info */}
          {dog.owner_name_stub && (
            <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 w-fit">
              {dog.owner_photo_stub && (
                <img
                  src={dog.owner_photo_stub}
                  alt=""
                  className="h-5 w-5 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                  onClick={() => dog.owner_photo_stub && setLightboxSrc(dog.owner_photo_stub)}
                />
              )}
              <span className="text-xs font-medium text-secondary-foreground">
                👨‍👩‍👦 {dog.owner_name_stub}
              </span>
            </div>
          )}

          {/* Origin */}
          {originInfo && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">Nereden</span>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                {originInfo.icon} {originInfo.label}
              </span>
            </div>
          )}

          {/* Energy */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">Enerji</span>
            <EnergyIndicator level={dog.energy_level as 1 | 2 | 3} size="md" showLabel />
          </div>

          {/* Social style */}
          {socialStyle && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">Sosyallik</span>
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent-foreground">
                {socialStyle.icon} {socialStyle.label}
              </span>
            </div>
          )}

          {/* Play styles */}
          {playStyles.length > 0 && (
            <div>
              <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Oyun Tarzı</span>
              <div className="flex flex-wrap gap-1.5">
                {playStyles.map((s: string) => (
                  <span key={s} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {PLAY_STYLE_LABELS[s] || s}
                  </span>
                ))}
              </div>
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
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-sm text-foreground italic">"{dog.bio}"</p>
            </div>
          )}

          {/* Badges */}
          {badges.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Rozetler</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {badges.map(b => (
                  <div key={b.id} className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5">
                    <span className="text-sm">{b.badge.icon}</span>
                    <span className="text-xs font-medium text-primary">{b.badge.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Likes */}
          {likes.length > 0 && (
            <div>
              <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Sevdikleri</span>
              <div className="flex flex-wrap gap-1.5">
                {likes.map((l: string) => (
                  <span key={l} className="rounded-full bg-[hsl(var(--park-active))]/10 px-3 py-1 text-xs font-medium text-[hsl(var(--park-active))]">{l}</span>
                ))}
              </div>
            </div>
          )}

          {/* Dislikes */}
          {dislikes.length > 0 && (
            <div>
              <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Sevmedikleri</span>
              <div className="flex flex-wrap gap-1.5">
                {dislikes.map((d: string) => (
                  <span key={d} className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">{d}</span>
                ))}
              </div>
            </div>
          )}

          {/* Triggers */}
          {triggers.length > 0 && (
            <div>
              <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Tetikleyiciler</span>
              <div className="flex flex-wrap gap-1.5">
                {triggers.map(t => (
                  <span key={t} className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Safety info */}
          {extendedData && (extendedData.aggression_risk || extendedData.offleash_compat) && (
            <div className="rounded-xl border border-border p-3 space-y-2">
              <span className="text-xs font-semibold text-foreground block">Güvenlik</span>
              {extendedData.aggression_risk && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Saldırganlık:</span>
                  <span className="text-xs font-medium text-foreground">{extendedData.aggression_risk}</span>
                </div>
              )}
              {extendedData.offleash_compat && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Tasmasız:</span>
                  <span className="text-xs font-medium text-foreground">{extendedData.offleash_compat}</span>
                </div>
              )}
            </div>
          )}

          {/* Active hours & walk */}
          {extendedData && (extendedData.active_hours?.length > 0 || extendedData.walk_duration) && (
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              {extendedData.active_hours?.length > 0 && (
                <span>🕐 {extendedData.active_hours.join(', ')}</span>
              )}
              {extendedData.walk_duration && (
                <span>🚶 {extendedData.walk_duration}</span>
              )}
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

        {/* Lightbox */}
        {lightboxSrc && (
          <PhotoLightbox src={lightboxSrc} alt="Aile" onClose={() => setLightboxSrc(null)} />
        )}
      </div>
    </div>
  );
}
