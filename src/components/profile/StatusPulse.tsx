import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Compass, Loader2, Zap, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Dog, Park } from '@/types/dogspace';
import { 
  isPlaydateActive, 
  getPlaydateRemainingHours,
  isParkCheckinActive,
  getParkCheckinRemainingMinutes,
  formatTimeRemaining,
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
      const { data, error } = await supabase.rpc('toggle_playdate', { p_dog_id: dog.id, p_activate: !playdateActive });
      if (error) throw error;
      const result = data as { status: string; message: string };
      if (result.status === 'ERROR') { toast.error(result.message); return; }
      toast.success(playdateActive ? 'Playdate kapatıldı' : 'Playdate açık! 24 saat boyunca görünürsün.');
      onRefresh();
    } catch (error) {
      console.error('Error toggling playdate:', error);
      toast.error('Bir hata oluştu');
    } finally { setLoading(null); }
  };

  const toggleParkCheckin = async () => {
    if (!selectedPark) { toast.error('Önce bir park seçmelisin'); return; }
    setLoading('checkin');
    try {
      const { data, error } = await supabase.rpc('toggle_park_checkin', { p_dog_id: dog.id, p_park_id: selectedPark.id, p_activate: !parkActive });
      if (error) throw error;
      const result = data as { status: string; message: string };
      if (result.status === 'ERROR') { toast.error(result.message); return; }
      toast.success(parkActive ? 'Parktan çıkış yapıldı' : `${selectedPark.name}'da aktifsin!`);
      onRefresh();
    } catch (error) {
      console.error('Error toggling park check-in:', error);
      toast.error('Bir hata oluştu');
    } finally { setLoading(null); }
  };

  const updateDailyEnergy = async (level: 1 | 2 | 3) => {
    setLoading('energy');
    try {
      const { error } = await supabase.from('dogs').update({ daily_energy: level }).eq('id', dog.id);
      if (error) throw error;
      setDailyEnergy(level);
      toast.success('Bugünkü enerji güncellendi');
      onRefresh();
    } catch (error) {
      console.error('Error updating energy:', error);
      toast.error('Bir hata oluştu');
    } finally { setLoading(null); }
  };

  return (
    <div className="section-card space-y-4">
      <h3 className="font-display text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: 'var(--gradient-hero)' }}>
          <Zap className="h-3.5 w-3.5 text-white" />
        </span>
        Durum Kontrol
      </h3>

      {/* Playdate Toggle */}
      <div className={cn(
        "flex items-center justify-between rounded-xl p-3 transition-all",
        playdateActive ? "bg-primary/10" : "bg-muted/50"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl transition-all",
            playdateActive ? "text-white shadow-lg" : "bg-muted text-muted-foreground"
          )} style={playdateActive ? { background: 'var(--gradient-hero)', boxShadow: 'var(--shadow-glow-primary)' } : {}}>
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Playdate</p>
            <p className="text-xs text-muted-foreground">
              {playdateActive ? `${playdateHoursLeft}s kaldı · Discover'da görünür` : 'Discover\'da görünmüyorsun'}
            </p>
          </div>
        </div>
        <button onClick={togglePlaydate} disabled={loading === 'playdate'}
          className={cn(
            "rounded-full px-5 py-2 text-sm font-semibold transition-all",
            playdateActive ? "text-white shadow-lg" : "bg-muted text-muted-foreground hover:bg-muted/80"
          )} style={playdateActive ? { background: 'var(--gradient-hero)', boxShadow: 'var(--shadow-glow-primary)' } : {}}>
          {loading === 'playdate' ? <Loader2 className="h-4 w-4 animate-spin" /> : playdateActive ? 'Açık' : 'Kapalı'}
        </button>
      </div>

      {/* Park Check-in Toggle */}
      <div className={cn(
        "flex items-center justify-between rounded-xl p-3 transition-all",
        parkActive ? "bg-[hsl(var(--park-active))]/10" : "bg-muted/50"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl transition-all",
            parkActive ? "bg-[hsl(var(--park-active))] text-white shadow-lg" : "bg-muted text-muted-foreground"
          )}>
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Park Check-in</p>
            <p className="text-xs text-muted-foreground">
              {parkActive ? `${formatTimeRemaining(parkMinutesLeft)} kaldı · ${selectedPark?.name || 'Park'}` : selectedPark ? 'Parkta değilsin' : 'Önce park seç'}
            </p>
          </div>
        </div>
        <button onClick={toggleParkCheckin} disabled={loading === 'checkin' || !selectedPark}
          className={cn(
            "rounded-full px-5 py-2 text-sm font-semibold transition-all",
            parkActive ? "bg-[hsl(var(--park-active))] text-white" : "bg-muted text-muted-foreground",
            !selectedPark && "opacity-40"
          )}>
          {loading === 'checkin' ? <Loader2 className="h-4 w-4 animate-spin" /> : parkActive ? (
            <span className="flex items-center gap-1.5">
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
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-foreground">Bugünkü Enerji</p>
          <span className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            dailyEnergy === 1 ? "bg-[hsl(var(--energy-1))]/15 text-[hsl(var(--energy-1))]" :
            dailyEnergy === 2 ? "bg-[hsl(var(--energy-2))]/15 text-[hsl(var(--energy-2))]" :
            "bg-[hsl(var(--energy-3))]/15 text-[hsl(var(--energy-3))]"
          )}>
            {dailyEnergy === 1 ? '🐢 Sakin' : dailyEnergy === 2 ? '🐕 Normal' : '⚡ Enerjik'}
          </span>
        </div>
        <div className="flex gap-2">
          {([1, 2, 3] as const).map((level) => (
            <button key={level} onClick={() => updateDailyEnergy(level)} disabled={loading === 'energy'}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-3 rounded-xl text-lg font-bold transition-all",
                dailyEnergy >= level 
                  ? level === 1 ? "bg-[hsl(var(--energy-1))]/15 text-[hsl(var(--energy-1))]" 
                    : level === 2 ? "bg-[hsl(var(--energy-2))]/15 text-[hsl(var(--energy-2))]"
                    : "bg-[hsl(var(--energy-3))]/15 text-[hsl(var(--energy-3))]"
                  : "bg-muted/30 text-muted-foreground/30"
              )}>
              🐾
              <span className="text-[10px] font-medium mt-0.5">
                {level === 1 ? 'Sakin' : level === 2 ? 'Normal' : 'Enerjik'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
