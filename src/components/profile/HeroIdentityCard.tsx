import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { EnergyIndicator } from '@/components/ui/EnergyIndicator';
import type { Dog, Profile } from '@/types/dogspace';
import { isPlaydateActive, isParkCheckinActive } from '@/types/dogspace';

interface HeroIdentityCardProps {
  dog: Dog;
  profile: Profile;
  onRefresh: () => void;
}

type StatusRingColor = 'lost' | 'park' | 'playdate' | 'passive';

function getStatusRing(dog: Dog): StatusRingColor {
  if (dog.is_lost) return 'lost';
  if (isParkCheckinActive(dog)) return 'park';
  if (isPlaydateActive(dog)) return 'playdate';
  return 'passive';
}

const STATUS_RING_STYLES: Record<StatusRingColor, string> = {
  lost: 'ring-4 ring-destructive animate-pulse',
  park: 'ring-4 ring-[hsl(var(--park-active))]',
  playdate: 'ring-4 ring-primary',
  passive: 'ring-2 ring-border',
};

const STATUS_LABELS: Record<StatusRingColor, { text: string; color: string }> = {
  lost: { text: '🔴 Kayıp', color: 'text-destructive' },
  park: { text: '🔵 Parkta', color: 'text-[hsl(var(--park-active))]' },
  playdate: { text: '🟢 Aktif', color: 'text-primary' },
  passive: { text: '⚪ Pasif', color: 'text-muted-foreground' },
};

export function HeroIdentityCard({ dog, profile, onRefresh }: HeroIdentityCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const status = getStatusRing(dog);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('dog-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('dog-photos')
        .getPublicUrl(fileName);

      await supabase.from('dogs').update({ photo_url: publicUrl }).eq('id', dog.id);
      await onRefresh();
      toast.success('Fotoğraf güncellendi!');
    } catch (error) {
      console.error('Error updating photo:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const genderIcon = dog.gender === 'male' ? '♂' : dog.gender === 'female' ? '♀' : '◻';

  return (
    <div className="flex flex-col items-center pt-6 pb-4 px-4">
      {/* Photo with status ring */}
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          className="hidden"
        />
        <img
          src={dog.photo_url}
          alt={dog.name}
          className={cn(
            "h-32 w-32 rounded-full object-cover shadow-elevated transition-all",
            STATUS_RING_STYLES[status]
          )}
        />
        {/* Owner avatar overlay */}
        {profile.photo_url && (
          <img
            src={profile.photo_url}
            alt=""
            className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full object-cover ring-2 ring-card"
          />
        )}
        {/* Camera button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="absolute -bottom-1 -left-1 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Status badge */}
      <span className={cn("mt-2 text-xs font-medium", STATUS_LABELS[status].color)}>
        {STATUS_LABELS[status].text}
      </span>

      {/* Dog info */}
      <h2 className="mt-2 font-display text-2xl font-bold text-foreground">{dog.name}</h2>
      <p className="text-muted-foreground">
        {dog.breed?.name} · {dog.approximate_age} · {genderIcon}
        {dog.weight_kg ? ` · ${dog.weight_kg}kg` : ''}
      </p>
      
      {dog.bio && (
        <p className="mt-1.5 text-sm text-muted-foreground italic max-w-[280px] text-center">"{dog.bio}"</p>
      )}

      <div className="mt-2">
        <EnergyIndicator level={dog.energy_level} size="lg" showLabel />
      </div>
    </div>
  );
}
