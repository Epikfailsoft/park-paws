import { useEffect, useState } from 'react';
import { X, Award } from 'lucide-react';
import { EnergyIndicator } from '@/components/ui/EnergyIndicator';
import { PhotoLightbox } from '@/components/ui/PhotoLightbox';
import { SOCIAL_STYLE_OPTIONS } from '@/types/dogspace';
import { supabase } from '@/integrations/supabase/client';
import type { Dog, Profile } from '@/types/dogspace';

interface DogBadge {
  id: string;
  earned_at: string;
  badge: { code: string; name: string; description: string; icon: string };
}

interface DogProfileModalProps {
  dog: (Dog & { owner: Profile }) | null;
  onClose: () => void;
}

export function DogProfileModal({ dog, onClose }: DogProfileModalProps) {
  const [badges, setBadges] = useState<DogBadge[]>([]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!dog) { setBadges([]); return; }
    supabase
      .from('dog_badges')
      .select('id, earned_at, badge:badges(code, name, description, icon)')
      .eq('dog_id', dog.id)
      .then(({ data }) => {
        if (data) setBadges(data as unknown as DogBadge[]);
      });
  }, [dog?.id]);

  if (!dog) return null;

  const genderIcon = dog.gender === 'male' ? '♂' : dog.gender === 'female' ? '♀' : '◻';
  const socialStyle = SOCIAL_STYLE_OPTIONS.find(s => s.value === dog.social_style);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative z-50 w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-card p-6 animate-in slide-in-from-bottom-8 duration-300 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <X className="h-4 w-4" />
        </button>

        {/* Photo + name */}
        <div className="flex flex-col items-center">
          <img
            src={dog.photo_url}
            alt={dog.name}
            className="h-32 w-32 rounded-2xl object-cover ring-[3px] ring-primary shadow-lg"
          />
          <h2 className="mt-4 font-display text-2xl font-extrabold text-foreground flex items-center gap-2">
            {dog.name} {genderIcon}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {(dog as any).breed?.name || ''} · {dog.approximate_age}
            {dog.weight_kg ? ` · ${dog.weight_kg}kg` : ''}
          </p>

          {/* Owner */}
          <div className="mt-3 flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5">
            {dog.owner.photo_url && (
              <img
                src={dog.owner.photo_url}
                alt=""
                className="h-5 w-5 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                onClick={() => setLightboxSrc(dog.owner.photo_url!)}
              />
            )}
            <span className="text-xs font-medium text-secondary-foreground">
              {dog.owner.display_name}
            </span>
          </div>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="mt-5">
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

        {/* Details */}
        <div className="mt-6 space-y-4">
          {dog.bio && (
            <div className="rounded-xl bg-secondary/50 p-3">
              <p className="text-sm text-foreground italic">"{dog.bio}"</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">Enerji</span>
            <EnergyIndicator level={dog.energy_level} size="md" showLabel />
          </div>

          {socialStyle && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">Oyun Tarzı</span>
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                {socialStyle.icon} {socialStyle.label}
              </span>
            </div>
          )}

          {dog.neutered && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">Kısırlaştırılmış</span>
              <span className="text-xs text-primary font-medium">✓ Evet</span>
            </div>
          )}

          {(dog as any).is_shelter && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">Barınak</span>
              <span className="text-xs text-primary font-medium">🏠 Barınaktan sahiplenildi</span>
            </div>
          )}

          {/* Likes/Dislikes */}
          {dog.likes && dog.likes.length > 0 && (
            <div>
              <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Sevdikleri</span>
              <div className="flex flex-wrap gap-1.5">
                {dog.likes.map(l => (
                  <span key={l} className="tag-like">{l}</span>
                ))}
              </div>
            </div>
          )}
          {dog.dislikes && dog.dislikes.length > 0 && (
            <div>
              <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Sevmedikleri</span>
              <div className="flex flex-wrap gap-1.5">
                {dog.dislikes.map(d => (
                  <span key={d} className="tag-dislike">{d}</span>
                ))}
              </div>
            </div>
          )}

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
        </div>

        {/* Owner photo lightbox */}
        {lightboxSrc && (
          <PhotoLightbox src={lightboxSrc} alt={dog.owner.display_name} onClose={() => setLightboxSrc(null)} />
        )}
      </div>
    </div>
  );
}
