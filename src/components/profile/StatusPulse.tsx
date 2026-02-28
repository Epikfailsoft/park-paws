import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Compass, Timer, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Dog, Park } from '@/types/dogspace';
import { 
  isPlaydateActive, 
  getPlaydateRemainingHours,
  isParkCheckinActive,
  getParkCheckinRemainingMinutes,
  formatTimeRemaining,
  RATE_LIMITS 
} from '@/types/dogspace';

interface StatusPulseProps {
  dog: Dog;
  selectedPark: Park | null;
  onRefresh: () => void;
}

export function StatusPulse({ dog, selectedPark, onRefresh }: StatusPulseProps) {
  const [loading, setLoading] = useState<'playdate' | 'checkin' | 'energy' | null>(null);
  const [dailyEnergy, setDailyEnergy] = useState<1 | 2 | 3>((dog.daily_energy || dog.energy_level) as 1 | 2 | 3);

  const playdateActive = isPlaydateActive(dog);
  const parkActive = isParkCheckinActive(dog);
  const playdateHoursLeft = getPlaydateRemainingHours(dog);
  const parkMinutesLeft = getParkCheckinRemainingMinutes(dog);

  const togglePlaydate = async () => {
    setLoading('playdate');
    try {
      const { data, error } = await supabase
        .rpc('toggle_playdate', {
          p_dog_id: dog.id,
          p_activate: !playdateActive
        });

      if (error) throw error;

      const result = data as { status: string; message: string };
      
      if (result.status === 'ERROR') {
        toast.error(result.message);
        return;
      }

      toast.success(playdateActive ? 'Playdate kapatıldı' : 'Playdate açık! 24 saat boyunca görünürsün.');
      onRefresh();
    } catch (error) {
      console.error('Error toggling playdate:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(null);
    }
  };

  const toggleParkCheckin = async () => {
    if (!selectedPark) {
      toast.error('Önce bir park seçmelisin');
      return;
    }

    setLoading('checkin');
    try {
      const { data, error } = await supabase
        .rpc('toggle_park_checkin', {
          p_dog_id: dog.id,
          p_park_id: selectedPark.id,
          p_activate: !parkActive
        });

      if (error) throw error;

      const result = data as { status: string; message: string };
      
      if (result.status === 'ERROR') {
        toast.error(result.message);
        return;
      }

      toast.success(parkActive ? 'Parktan çıkış yapıldı' : `${selectedPark.name}'da aktifsin!`);
      onRefresh();
    } catch (error) {
      console.error('Error toggling park check-in:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(null);
    }
  };

  const updateDailyEnergy = async (level: 1 | 2 | 3) => {
    setLoading('energy');
    try {
      const { error } = await supabase
        .from('dogs')
        .update({ daily_energy: level })
        .eq('id', dog.id);

      if (error) throw error;

      setDailyEnergy(level);
      toast.success('Bugünkü enerji güncellendi');
      onRefresh();
    } catch (error) {
      console.error('Error updating energy:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="rounded-2xl bg-card p-4 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
      <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        🎯 Durum
      </h3>

      {/* Playdate Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            playdateActive ? "bg-primary" : "bg-muted"
          )}>
            <Compass className={cn(
              "h-5 w-5",
              playdateActive ? "text-primary-foreground" : "text-muted-foreground"
            )} />
          </div>
          <div>
            <p className="font-medium text-foreground">Playdate</p>
            <p className="text-xs text-muted-foreground">
              {playdateActive 
                ? `${playdateHoursLeft}s kaldı · Discover'da görünür` 
                : 'Discover\'da görünmüyorsun'}
            </p>
          </div>
        </div>
        <button
          onClick={togglePlaydate}
          disabled={loading === 'playdate'}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium transition-all",
            playdateActive 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground"
          )}
        >
          {loading === 'playdate' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : playdateActive ? 'Açık' : 'Kapalı'}
        </button>
      </div>

      {/* Park Check-in Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            parkActive ? "bg-[hsl(var(--park-active))]" : "bg-muted"
          )}>
            <MapPin className={cn(
              "h-5 w-5",
              parkActive ? "text-white" : "text-muted-foreground"
            )} />
          </div>
          <div>
            <p className="font-medium text-foreground">Park Check-in</p>
            <p className="text-xs text-muted-foreground">
              {parkActive 
                ? `${formatTimeRemaining(parkMinutesLeft)} kaldı · ${selectedPark?.name || 'Park'}` 
                : selectedPark ? 'Parkta değilsin' : 'Önce park seç'}
            </p>
          </div>
        </div>
        <button
          onClick={toggleParkCheckin}
          disabled={loading === 'checkin' || !selectedPark}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium transition-all",
            parkActive 
              ? "bg-[hsl(var(--park-active))] text-white" 
              : "bg-muted text-muted-foreground",
            !selectedPark && "opacity-50"
          )}
        >
          {loading === 'checkin' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : parkActive ? (
            <span className="flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
              </span>
              Aktif
            </span>
          ) : 'Giriş'}
        </button>
      </div>

      {/* Daily Energy Selector */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-foreground">Bugünkü Enerji</p>
          <p className="text-xs text-muted-foreground">
            {dailyEnergy === 1 && '🐢 Sakin'}
            {dailyEnergy === 2 && '🐕 Normal'}
            {dailyEnergy === 3 && '⚡ Enerjik'}
          </p>
        </div>
        <div className="flex justify-between gap-2">
          {([1, 2, 3] as const).map((level) => (
            <button
              key={level}
              onClick={() => updateDailyEnergy(level)}
              disabled={loading === 'energy'}
              className={cn(
                "flex-1 flex items-center justify-center py-2.5 rounded-xl text-xl transition-all",
                dailyEnergy >= level 
                  ? "bg-primary/10" 
                  : "bg-muted/50"
              )}
            >
              <span className={cn(
                dailyEnergy >= level ? "opacity-100" : "opacity-30 grayscale"
              )}>
                🐾
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
