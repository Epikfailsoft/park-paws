import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Loader2, Sparkles } from 'lucide-react';
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
  lost: 'ring-[3px] ring-destructive animate-pulse shadow-[0_0_20px_hsl(0_72%_55%/0.4)] rounded-2xl',
  park: 'ring-[3px] ring-[hsl(var(--park-active))] shadow-[0_0_20px_hsl(152_60%_45%/0.3)] rounded-2xl',
  playdate: 'ring-[3px] ring-primary shadow-[0_0_20px_hsl(152_55%_42%/0.3)] rounded-2xl',
  passive: 'ring-2 ring-border rounded-2xl',
};

const STATUS_LABELS: Record<StatusRingColor, { text: string; color: string; bg: string }> = {
  lost: { text: '🔴 Kayıp', color: 'text-destructive', bg: 'bg-destructive/10' },
  park: { text: '🟢 Parkta', color: 'text-[hsl(var(--park-active))]', bg: 'bg-[hsl(var(--park-active))]/10' },
  playdate: { text: '🟢 Aktif', color: 'text-primary', bg: 'bg-primary/10' },
  passive: { text: '⚪ Pasif', color: 'text-muted-foreground', bg: 'bg-muted' },
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
    <div className="relative overflow-hidden">
      {/* Colorful background blob */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full opacity-20" 
          style={{ background: 'var(--gradient-hero)', filter: 'blur(60px)' }} />
        <div className="absolute -bottom-10 -left-20 h-40 w-40 rounded-full opacity-15" 
          style={{ background: 'var(--gradient-accent)', filter: 'blur(50px)' }} />
      </div>

      <div className="relative flex flex-col items-center pt-8 pb-6 px-4">
        {/* Photo with status ring */}
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
          <div className="relative">
            <img
              src={dog.photo_url}
              alt={dog.name}
              className={cn(
                "h-36 w-36 rounded-2xl object-cover transition-all",
                STATUS_RING_STYLES[status]
              )}
            />
            {/* Decorative ring */}
            {status !== 'passive' && (
              <div className="absolute -inset-2 rounded-[1.25rem] border-2 border-dashed opacity-30 animate-[spin_12s_linear_infinite]"
                style={{ borderColor: status === 'lost' ? 'hsl(var(--destructive))' : 'hsl(var(--primary))' }} />
            )}
          </div>
          
          {/* Owner avatar overlay */}
          {profile.photo_url && (
            <img
              src={profile.photo_url}
              alt=""
              className="absolute -bottom-1 -right-1 h-10 w-10 rounded-full object-cover ring-3 ring-card shadow-md"
            />
          )}
          {/* Camera button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="absolute -bottom-1 -left-1 flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all hover:scale-110"
            style={{ background: 'var(--gradient-accent)' }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Camera className="h-4 w-4 text-white" />}
          </button>
        </div>

        {/* Status badge */}
        <span className={cn(
          "mt-3 rounded-full px-4 py-1.5 text-xs font-semibold",
          STATUS_LABELS[status].color,
          STATUS_LABELS[status].bg
        )}>
          {STATUS_LABELS[status].text}
        </span>

        {/* Dog info */}
        <h2 className="mt-3 font-display text-3xl font-extrabold text-foreground flex items-center gap-2">
          {dog.name}
          {status === 'playdate' && <Sparkles className="h-5 w-5 text-harmony" />}
        </h2>
        <p className="mt-1 text-muted-foreground font-medium">
          {dog.breed?.name} · {dog.approximate_age} · {genderIcon}
          {dog.weight_kg ? ` · ${dog.weight_kg}kg` : ''}
        </p>
        
        {dog.bio && (
          <p className="mt-2 text-sm text-muted-foreground italic max-w-[280px] text-center leading-relaxed">
            "{dog.bio}"
          </p>
        )}

        <div className="mt-3">
          <EnergyIndicator level={dog.energy_level} size="lg" showLabel />
        </div>
      </div>
    </div>
  );
}
