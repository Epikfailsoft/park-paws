import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import { supabase } from '@/integrations/supabase/client';
import { SwipeCard } from '@/components/discover/SwipeCard';
import { WaveLimitModal } from '@/components/discover/WaveLimitModal';
import { Compass, Loader2, SlidersHorizontal, Heart, X, RotateCcw } from 'lucide-react';
import dogiLogo from '@/assets/dogi-logo.png';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RATE_LIMITS, SOCIAL_STYLE_OPTIONS, getTimeContext } from '@/types/dogspace';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { DiscoverDog } from '@/types/dogspace';

const PAGE_SIZE = 50;

const ENERGY_FILTER_OPTIONS = [
  { value: '1', label: '🐢 Sakin', level: 1 },
  { value: '2', label: '🐕 Normal', level: 2 },
  { value: '3', label: '⚡ Enerjik', level: 3 },
];

const GENDER_FILTER_OPTIONS = [
  { value: 'female', label: '♀ Dişi' },
  { value: 'male', label: '♂ Erkek' },
];

export default function Discover() {
  const { dogs, profile, selectedPark } = useAuth();
  const { lat, lng } = useLocation();

  const [allDogs, setAllDogs] = useState<DiscoverDog[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [wavedDogs, setWavedDogs] = useState<Set<string>>(new Set());
  const [passedDogs, setPassedDogs] = useState<Set<string>>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('dogspace_passed_dogs') || '{}');
      const now = Date.now();
      const valid: Record<string, number> = {};
      for (const [id, ts] of Object.entries(stored)) {
        if (now - (ts as number) < 24 * 60 * 60 * 1000) valid[id] = ts as number;
      }
      localStorage.setItem('dogspace_passed_dogs', JSON.stringify(valid));
      return new Set(Object.keys(valid));
    } catch { return new Set(); }
  });
  const [wavesRemaining, setWavesRemaining] = useState<number>(RATE_LIMITS.DAILY_WAVES);
  const [loading, setLoading] = useState(true);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [distance, setDistance] = useState(10);
  const [genderFilter, setGenderFilter] = useState<string | null>(null);
  const [socialStyleFilter, setSocialStyleFilter] = useState<string | null>(null);
  const [energyFilter, setEnergyFilter] = useState<number | null>(null);

  // Wave limit modal
  const [showWaveLimitModal, setShowWaveLimitModal] = useState(false);

  // Stats
  const [totalMembers, setTotalMembers] = useState(0);

  const myDog = dogs[0];
  const activeFilterCount = [genderFilter, socialStyleFilter, energyFilter].filter(Boolean).length;

  // Filtered dogs for swipe
  const filteredDogs = allDogs.filter(d => {
    if (d.is_lost) return false;
    if (passedDogs.has(d.dog_id)) return false;
    if (genderFilter && d.gender !== genderFilter) return false;
    if (socialStyleFilter && d.social_style !== socialStyleFilter) return false;
    if (energyFilter && d.energy_level !== energyFilter) return false;
    return true;
  });

  const swipeDogs = filteredDogs;
  const currentDog = swipeDogs[currentIndex];
  const nextDog = swipeDogs[currentIndex + 1];

  const fetchDiscoverDogs = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_discover_dogs', {
        p_user_lat: lat, p_user_lng: lng,
        p_max_distance_km: distance, p_limit: PAGE_SIZE, p_offset: 0,
      });
      if (error) throw error;
      setAllDogs((data || []) as DiscoverDog[]);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error fetching dogs:', error);
    } finally {
      setLoading(false);
    }
  }, [profile, lat, lng, distance]);

  const fetchWaveStatus = useCallback(async () => {
    if (!profile || !myDog) return;
    try {
      const { data: remaining } = await supabase.rpc('get_remaining_waves', { p_user_id: profile.id });
      if (remaining !== null) setWavesRemaining(remaining);
      const { data: wavesData } = await supabase.from('waves').select('to_dog_id').eq('from_dog_id', myDog.id);
      if (wavesData) setWavedDogs(new Set(wavesData.map(w => w.to_dog_id)));
    } catch (error) {
      console.error('Error fetching wave status:', error);
    }
  }, [profile, myDog]);

  const fetchStats = useCallback(async () => {
    try {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      setTotalMembers(count || 0);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (profile) {
      fetchDiscoverDogs();
      fetchWaveStatus();
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [profile, distance, lat, lng]);

  useEffect(() => {
    if (lat && lng && myDog) {
      supabase.rpc('update_dog_location', { p_dog_id: myDog.id, p_lat: lat, p_lng: lng });
    }
  }, [lat, lng, myDog?.id]);

  const handleWave = async (toDogId: string) => {
    if (!myDog || !profile) { toast.error('Önce köpek profili oluştur'); return; }
    if (wavesRemaining <= 0) { setShowWaveLimitModal(true); return; }
    try {
      const { data, error } = await supabase.rpc('send_wave', { p_sender_dog_id: myDog.id, p_target_dog_id: toDogId });
      if (error) throw error;
      const result = data as { status: string; message: string; harmony_id?: string };
      if (result.status === 'ERROR') {
        if (result.message.includes('limit')) setShowWaveLimitModal(true);
        else toast.error(result.message);
        return;
      }
      setWavedDogs(prev => new Set([...prev, toDogId]));
      setWavesRemaining(prev => prev - 1);
      if (result.status === 'HARMONY_CREATED') toast.success('🎉 Eşleştiniz! Artık mesajlaşabilirsiniz', { duration: 5000 });
      else toast.success('Woof gönderildi! 🐕');
    } catch (error) {
      console.error('Error waving:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const handleSwipeRight = () => {
    if (currentDog) {
      handleWave(currentDog.dog_id);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleSwipeLeft = () => {
    if (currentDog) {
      const id = currentDog.dog_id;
      setPassedDogs(prev => new Set([...prev, id]));
      try {
        const stored = JSON.parse(localStorage.getItem('dogspace_passed_dogs') || '{}');
        stored[id] = Date.now();
        localStorage.setItem('dogspace_passed_dogs', JSON.stringify(stored));
      } catch {}
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleUndo = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const togglePlaydateOn = async () => {
    if (!myDog) return;
    try {
      const newValue = !isPlaydateActive(myDog);
      const { data, error } = await supabase.rpc('toggle_playdate', { p_dog_id: myDog.id, p_activate: newValue });
      if (error) throw error;
      const result = data as { status: string; message: string };
      if (result.status === 'ERROR') { toast.error(result.message); return; }
      await refreshDogs();
      toast.success(newValue ? 'Playdate açık! 24 saat görünür olacaksın.' : 'Playdate kapatıldı');
    } catch (error) {
      console.error(error);
      toast.error('Bir hata oluştu');
    }
  };

  const clearAllFilters = () => {
    setGenderFilter(null);
    setSocialStyleFilter(null);
    setEnergyFilter(null);
    setDistance(10);
  };

  const neighborhoodName = selectedPark?.name?.replace(/\s*(Parkı|Park)$/i, '') || null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen safe-top safe-bottom flex flex-col bg-background">
      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-40 border-b px-4 py-3" style={{ background: 'hsl(var(--page-discover))' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={dogiLogo} alt="DOGI" className="h-[44px] w-[44px] rounded-xl" />
            <div>
              <h1 className="font-display text-lg font-bold text-white leading-tight">Keşfet</h1>
              <p className="text-[11px] text-white/70">
                {neighborhoodName ? `${neighborhoodName} · ` : ''}{getTimeContext()} · {totalMembers} üye
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter */}
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <button className={cn(
                  "relative flex items-center justify-center h-9 w-9 rounded-full border transition-all",
                  showFilters || activeFilterCount > 0 ? "border-white/50 bg-white/20" : "border-white/30 bg-white/10"
                )}>
                  <SlidersHorizontal className="h-4 w-4 text-white" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-bold"
                      style={{ color: 'hsl(var(--page-discover))' }}>
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-4 space-y-4" sideOffset={8}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Filtreler</span>
                  {activeFilterCount > 0 && (
                    <button onClick={clearAllFilters} className="text-xs font-medium" style={{ color: 'hsl(var(--page-discover))' }}>
                      ⟲ Sıfırla
                    </button>
                  )}
                </div>
                {/* Distance */}
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5">📍 Mesafe</p>
                  <div className="flex gap-1.5">
                    {[1, 2, 5, 10].map(km => (
                      <button key={km} onClick={() => setDistance(km)}
                        className={cn("flex-1 rounded-lg py-2 text-xs font-medium transition-all",
                          distance === km ? "text-white" : "bg-secondary text-secondary-foreground"
                        )}
                        style={distance === km ? { background: 'hsl(var(--page-discover))' } : undefined}>
                        {km} km
                      </button>
                    ))}
                  </div>
                </div>
                {/* Gender */}
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5">⚧ Cinsiyet</p>
                  <div className="flex gap-1.5">
                    {GENDER_FILTER_OPTIONS.map(g => (
                      <button key={g.value}
                        onClick={() => setGenderFilter(genderFilter === g.value ? null : g.value)}
                        className={cn("flex-1 rounded-lg py-2 text-xs font-medium transition-all",
                          genderFilter === g.value ? "text-white" : "bg-secondary text-secondary-foreground"
                        )}
                        style={genderFilter === g.value ? { background: 'hsl(var(--page-discover))' } : undefined}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Energy */}
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5">⚡ Enerji</p>
                  <div className="flex gap-1.5">
                    {ENERGY_FILTER_OPTIONS.map(e => (
                      <button key={e.value}
                        onClick={() => setEnergyFilter(energyFilter === e.level ? null : e.level)}
                        className={cn("flex-1 rounded-lg py-2 text-xs font-medium transition-all",
                          energyFilter === e.level ? "text-white" : "bg-secondary text-secondary-foreground"
                        )}
                        style={energyFilter === e.level ? { background: 'hsl(var(--page-discover))' } : undefined}>
                        {e.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Social Style */}
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5">🎮 Oyun Tarzı</p>
                  <div className="flex gap-1.5">
                    {SOCIAL_STYLE_OPTIONS.map(s => (
                      <button key={s.value}
                        onClick={() => setSocialStyleFilter(socialStyleFilter === s.value ? null : s.value)}
                        className={cn("flex-1 rounded-lg py-2 text-xs font-medium transition-all",
                          socialStyleFilter === s.value ? "text-white" : "bg-secondary text-secondary-foreground"
                        )}
                        style={socialStyleFilter === s.value ? { background: 'hsl(var(--page-discover))' } : undefined}>
                        {s.icon} {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

          </div>
        </div>
      </header>

      {/* ─── SWIPE CARD STACK ─── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4">
        {currentDog ? (
          <>
            {/* Card stack */}
            <div className="relative w-full max-w-[380px] aspect-[3/4]">
              {nextDog && (
                <SwipeCard
                  key={nextDog.dog_id}
                  dog={nextDog}
                  onSwipeLeft={() => {}}
                  onSwipeRight={() => {}}
                  isTop={false}
                  hasWaved={wavedDogs.has(nextDog.dog_id)}
                />
              )}
              <SwipeCard
                key={currentDog.dog_id}
                dog={currentDog}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                isTop={true}
                hasWaved={wavedDogs.has(currentDog.dog_id)}
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-5 mt-5">
              {/* Pass */}
              <button
                onClick={handleSwipeLeft}
                className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-destructive/30 bg-card shadow-lg transition-all active:scale-90 hover:bg-destructive/10"
              >
                <X className="h-7 w-7 text-destructive" />
              </button>

              {/* Undo */}
              <button
                onClick={handleUndo}
                disabled={currentIndex === 0}
                className="flex h-10 w-10 items-center justify-center rounded-full border bg-card shadow transition-all active:scale-90 disabled:opacity-30"
              >
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
              </button>

              {/* Like / Wave */}
              <button
                onClick={handleSwipeRight}
                className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all active:scale-90"
                style={{ background: 'hsl(var(--page-discover))', boxShadow: '0 4px 20px hsl(var(--page-discover) / 0.4)' }}
              >
                <Heart className="h-7 w-7 text-white fill-white" />
              </button>
            </div>

            {/* Counter */}
            <p className="mt-3 text-xs text-muted-foreground">
              {currentIndex + 1} / {swipeDogs.length} · {wavesRemaining} woof kaldı
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <Compass className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mb-2 font-display text-lg font-semibold text-foreground">
              {swipeDogs.length === 0 ? 'Bugün sakin' : 'Hepsini gördün! 🎉'}
            </h2>
            <p className="max-w-[280px] text-sm text-muted-foreground">
              {swipeDogs.length === 0
                ? `${myDog?.name}'i parka götürmeye ne dersin?`
                : 'Yeni köpekler katılınca tekrar gel!'}
            </p>
            {currentIndex > 0 && (
              <button onClick={() => setCurrentIndex(0)}
                className="mt-4 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
                style={{ background: 'hsl(var(--page-discover))' }}>
                Baştan Başla
              </button>
            )}
          </div>
        )}
      </div>

      <WaveLimitModal open={showWaveLimitModal} onClose={() => setShowWaveLimitModal(false)} />
    </div>
  );
}
