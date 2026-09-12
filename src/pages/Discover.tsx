import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import { supabase } from '@/integrations/supabase/client';
import { SwipeCard } from '@/components/discover/SwipeCard';
import { DogProfileSheet } from '@/components/shared/DogProfileSheet';
import type { DogProfileData } from '@/components/shared/DogProfileSheet';
import { MapView } from '@/components/discover/MapView';
import { Compass, Loader2, SlidersHorizontal, Heart, X, RotateCcw, Map, Layers } from 'lucide-react';
import dogiLogo from '@/assets/dogi-logo.png';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { accusative } from '@/lib/turkish';
import { SOCIAL_STYLE_OPTIONS, getTimeContext } from '@/types/dogspace';
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

const PLAY_STYLE_FILTER_OPTIONS = [
  { value: 'chase', label: '🏃 Kovalamaca' },
  { value: 'wrestle', label: '💪 Güreş' },
  { value: 'toy', label: '🧸 Oyuncak' },
  { value: 'gentle', label: '🤗 Nazik' },
  { value: 'calm_social', label: '☕ Sakin' },
];

const SIZE_FILTER_OPTIONS = [
  { value: 'small', label: '🐕 Küçük' },
  { value: 'medium', label: '🐕‍🦺 Orta' },
  { value: 'large', label: '🐾 Büyük' },
];

export default function Discover() {
  const { dogs, profile, selectedPark } = useAuth();
  const { lat, lng } = useLocation();

  const [allDogs, setAllDogs] = useState<DiscoverDog[]>(() => {
    try {
      const stored = sessionStorage.getItem('dogspace_discover_dogs');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [currentIndex, setCurrentIndex] = useState(() => {
    try {
      return parseInt(sessionStorage.getItem('dogspace_discover_index') || '0', 10);
    } catch { return 0; }
  });
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
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'swipe' | 'map'>('swipe');

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [distance, setDistance] = useState(10);
  const [genderFilter, setGenderFilter] = useState<string | null>(null);
  const [socialStyleFilter, setSocialStyleFilter] = useState<string | null>(null);
  const [energyFilter, setEnergyFilter] = useState<number | null>(null);
  const [neuteredFilter, setNeuteredFilter] = useState<string | null>(null);
  const [shelterFilter, setShelterFilter] = useState(false);
  const [playStyleFilter, setPlayStyleFilter] = useState<string | null>(null);
  const [sizeFilter, setSizeFilter] = useState<string | null>(null);

  const [totalMembers, setTotalMembers] = useState(0);
  const [sheetDog, setSheetDog] = useState<DogProfileData | null>(null);

  const myDog = dogs[0];
  const activeFilterCount = [genderFilter, socialStyleFilter, energyFilter, neuteredFilter, shelterFilter || null, playStyleFilter, sizeFilter].filter(Boolean).length;

  const filteredDogs = allDogs.filter(d => {
    if (d.is_lost) return false;
    if (passedDogs.has(d.dog_id)) return false;
    if (genderFilter && d.gender !== genderFilter) return false;
    if (socialStyleFilter && d.social_style !== socialStyleFilter) return false;
    if (energyFilter && d.energy_level !== energyFilter) return false;
    if (neuteredFilter === 'yes' && !d.is_neutered) return false;
    if (neuteredFilter === 'no' && d.is_neutered) return false;
    if (shelterFilter && !(d as any).is_shelter) return false;
    // Play style filter - check if dog has the selected play style
    if (playStyleFilter && !(d as any).play_styles?.includes(playStyleFilter)) return false;
    // Size filter
    if (sizeFilter && (d as any).size_label !== sizeFilter) return false;
    return true;
  });

  const swipeDogs = filteredDogs;
  const currentDog = swipeDogs[currentIndex];
  const nextDog = swipeDogs[currentIndex + 1];

  // Preload upcoming photos for smooth swipes (next 4 cards)
  useEffect(() => {
    for (let i = 1; i <= 4; i++) {
      const d = swipeDogs[currentIndex + i];
      if (d?.photo_url) {
        const img = new Image();
        img.src = d.photo_url;
      }
    }
  }, [currentIndex, swipeDogs]);

  const fetchDiscoverDogs = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_discover_dogs', {
        p_user_lat: lat, p_user_lng: lng,
        p_max_distance_km: distance, p_limit: PAGE_SIZE, p_offset: 0,
      });
      if (error) throw error;
      const dogs = (data || []) as DiscoverDog[];
      setAllDogs(dogs);
      sessionStorage.setItem('dogspace_discover_dogs', JSON.stringify(dogs));
      // Only reset index if this is a fresh fetch (no stored data)
      if (!sessionStorage.getItem('dogspace_discover_index')) setCurrentIndex(0);
    } catch (error) {
      console.error('Error fetching dogs:', error);
    } finally { setLoading(false); }
  }, [profile, lat, lng, distance]);

  const fetchWaveStatus = useCallback(async () => {
    if (!profile || !myDog) return;
    try {
      const { data: wavesData } = await supabase.from('waves').select('to_dog_id').eq('from_dog_id', myDog.id);
      if (wavesData) setWavedDogs(new Set(wavesData.map(w => w.to_dog_id)));
    } catch (error) { console.error('Error fetching wave status:', error); }
  }, [profile, myDog]);

  const fetchStats = useCallback(async () => {
    try {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      setTotalMembers(count || 0);
    } catch { /* ignore */ }
  }, []);

  // Only fetch on first load or distance change
  const [initialLoad, setInitialLoad] = useState(true);
  useEffect(() => {
    if (profile) {
      // If we have stored dogs and this is initial load, skip fetch
      if (initialLoad && allDogs.length > 0) {
        setLoading(false);
        setInitialLoad(false);
        fetchWaveStatus();
        fetchStats();
        return;
      }
      setInitialLoad(false);
      fetchDiscoverDogs();
      fetchWaveStatus();
      fetchStats();
    } else { setLoading(false); }
  }, [profile, distance]);

  useEffect(() => {
    if (lat && lng && myDog) {
      supabase.rpc('update_dog_location', { p_dog_id: myDog.id, p_lat: lat, p_lng: lng });
    }
  }, [lat, lng, myDog?.id]);

  const handleWave = async (toDogId: string) => {
    if (!myDog || !profile) { toast.error('Önce köpek profili oluştur'); return; }
    try {
      const { data, error } = await supabase.rpc('send_wave', { p_sender_dog_id: myDog.id, p_target_dog_id: toDogId });
      if (error) throw error;
      const result = data as { status: string; message: string; harmony_id?: string };
      if (result.status === 'ERROR') { toast.error(result.message); return; }
      setWavedDogs(prev => new Set([...prev, toDogId]));
      if (result.status === 'HARMONY_CREATED') toast.success('🎉 Eşleştiniz! Artık mesajlaşabilirsiniz', { duration: 5000 });
      else toast.success('Woof gönderildi! 🐕');
    } catch (error) {
      console.error('Error waving:', error);
      toast.error('Bir hata oluştu');
    }
  };

  // Persist currentIndex
  useEffect(() => {
    sessionStorage.setItem('dogspace_discover_index', String(currentIndex));
  }, [currentIndex]);

  const handleSwipeRight = () => {
    if (currentDog) { handleWave(currentDog.dog_id); setCurrentIndex(prev => prev + 1); }
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

  const handleUndo = () => { if (currentIndex > 0) setCurrentIndex(prev => prev - 1); };

  const clearAllFilters = () => {
    setGenderFilter(null); setSocialStyleFilter(null); setEnergyFilter(null);
    setNeuteredFilter(null); setShelterFilter(false); setPlayStyleFilter(null);
    setSizeFilter(null); setDistance(10);
  };

  const neighborhoodName = selectedPark?.name?.replace(/\s*(Parkı|Park)$/i, '') || null;

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="relative min-h-screen safe-top safe-bottom flex flex-col bg-background">
      {/* HEADER */}
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
            {/* View toggle */}
            <div className="flex rounded-full bg-white/15 p-0.5">
              <button onClick={() => setViewMode('swipe')}
                className={cn("flex items-center justify-center h-8 w-8 rounded-full transition-all",
                  viewMode === 'swipe' ? "bg-white/30" : ""
                )}>
                <Layers className="h-4 w-4 text-white" />
              </button>
              <button onClick={() => setViewMode('map')}
                className={cn("flex items-center justify-center h-8 w-8 rounded-full transition-all",
                  viewMode === 'map' ? "bg-white/30" : ""
                )}>
                <Map className="h-4 w-4 text-white" />
              </button>
            </div>

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
                      style={{ color: 'hsl(var(--page-discover))' }}>{activeFilterCount}</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-4 space-y-3 max-h-[70vh] overflow-y-auto" sideOffset={8}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Filtreler</span>
                  {activeFilterCount > 0 && (
                    <button onClick={clearAllFilters} className="text-xs font-medium" style={{ color: 'hsl(var(--page-discover))' }}>⟲ Sıfırla</button>
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
                        )} style={distance === km ? { background: 'hsl(var(--page-discover))' } : undefined}>
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
                      <button key={g.value} onClick={() => setGenderFilter(genderFilter === g.value ? null : g.value)}
                        className={cn("flex-1 rounded-lg py-2 text-xs font-medium transition-all",
                          genderFilter === g.value ? "text-white" : "bg-secondary text-secondary-foreground"
                        )} style={genderFilter === g.value ? { background: 'hsl(var(--page-discover))' } : undefined}>
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
                      <button key={e.value} onClick={() => setEnergyFilter(energyFilter === e.level ? null : e.level)}
                        className={cn("flex-1 rounded-lg py-2 text-xs font-medium transition-all",
                          energyFilter === e.level ? "text-white" : "bg-secondary text-secondary-foreground"
                        )} style={energyFilter === e.level ? { background: 'hsl(var(--page-discover))' } : undefined}>
                        {e.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Play Style */}
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5">🎾 Oyun Tarzı</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PLAY_STYLE_FILTER_OPTIONS.map(s => (
                      <button key={s.value} onClick={() => setPlayStyleFilter(playStyleFilter === s.value ? null : s.value)}
                        className={cn("rounded-lg px-3 py-2 text-xs font-medium transition-all",
                          playStyleFilter === s.value ? "text-white" : "bg-secondary text-secondary-foreground"
                        )} style={playStyleFilter === s.value ? { background: 'hsl(var(--page-discover))' } : undefined}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Size */}
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5">📏 Boyut</p>
                  <div className="flex gap-1.5">
                    {SIZE_FILTER_OPTIONS.map(s => (
                      <button key={s.value} onClick={() => setSizeFilter(sizeFilter === s.value ? null : s.value)}
                        className={cn("flex-1 rounded-lg py-2 text-xs font-medium transition-all",
                          sizeFilter === s.value ? "text-white" : "bg-secondary text-secondary-foreground"
                        )} style={sizeFilter === s.value ? { background: 'hsl(var(--page-discover))' } : undefined}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Social Style */}
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5">🐾 Sosyallik</p>
                  <div className="flex gap-1.5">
                    {SOCIAL_STYLE_OPTIONS.map(s => (
                      <button key={s.value} onClick={() => setSocialStyleFilter(socialStyleFilter === s.value ? null : s.value)}
                        className={cn("flex-1 rounded-lg py-2 text-xs font-medium transition-all",
                          socialStyleFilter === s.value ? "text-white" : "bg-secondary text-secondary-foreground"
                        )} style={socialStyleFilter === s.value ? { background: 'hsl(var(--page-discover))' } : undefined}>
                        {s.icon} {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Neutered */}
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5">✂️ Kısırlaştırma</p>
                  <div className="flex gap-1.5">
                    {[{ value: 'yes', label: '✓ Kısır' }, { value: 'no', label: '✗ Değil' }].map(n => (
                      <button key={n.value} onClick={() => setNeuteredFilter(neuteredFilter === n.value ? null : n.value)}
                        className={cn("flex-1 rounded-lg py-2 text-xs font-medium transition-all",
                          neuteredFilter === n.value ? "text-white" : "bg-secondary text-secondary-foreground"
                        )} style={neuteredFilter === n.value ? { background: 'hsl(var(--page-discover))' } : undefined}>
                        {n.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Shelter */}
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5">🏠 Barınak</p>
                  <button onClick={() => setShelterFilter(!shelterFilter)}
                    className={cn("rounded-lg px-4 py-2 text-xs font-medium transition-all",
                      shelterFilter ? "text-white" : "bg-secondary text-secondary-foreground"
                    )} style={shelterFilter ? { background: 'hsl(var(--page-discover))' } : undefined}>
                    🏠 Barınaktan
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>

      {/* MAP VIEW */}
      {viewMode === 'map' ? (
        <MapView hasAccess={false} />
      ) : (
        /* SWIPE CARD STACK */
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-4">
          {currentDog ? (
            <>
              <div className="relative w-full max-w-[380px] aspect-[3/4]">
                {swipeDogs[currentIndex + 2] && (
                  <SwipeCard key={swipeDogs[currentIndex + 2].dog_id} dog={swipeDogs[currentIndex + 2]} onSwipeLeft={() => {}} onSwipeRight={() => {}} isTop={false} hasWaved={wavedDogs.has(swipeDogs[currentIndex + 2].dog_id)} />
                )}
                {nextDog && (
                  <SwipeCard key={nextDog.dog_id} dog={nextDog} onSwipeLeft={() => {}} onSwipeRight={() => {}} isTop={false} hasWaved={wavedDogs.has(nextDog.dog_id)} />
                )}
                <SwipeCard key={currentDog.dog_id} dog={currentDog} onSwipeLeft={handleSwipeLeft} onSwipeRight={handleSwipeRight} onTap={() => setSheetDog({
                  dog_id: currentDog.dog_id, dog_name: currentDog.dog_name, photo_url: currentDog.photo_url,
                  breed_name: currentDog.breed_name, approximate_age: currentDog.approximate_age,
                  energy_level: currentDog.energy_level, gender: currentDog.gender, weight_kg: currentDog.weight_kg,
                  social_style: currentDog.social_style, triggers: currentDog.triggers, bio: currentDog.bio,
                  is_neutered: currentDog.is_neutered, distance_km: currentDog.distance_km,
                  current_park_name: currentDog.current_park_name, playdate_on: currentDog.playdate_on,
                  owner_name_stub: currentDog.owner_name_stub, owner_photo_stub: currentDog.owner_photo_stub,
                  is_lost: currentDog.is_lost,
                })} isTop={true} hasWaved={wavedDogs.has(currentDog.dog_id)} />
              </div>

              <div className="flex items-center justify-center gap-5 mt-5">
                <button onClick={handleSwipeLeft}
                  className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-destructive/30 bg-card shadow-lg transition-all active:scale-90 hover:bg-destructive/10">
                  <X className="h-7 w-7 text-destructive" />
                </button>
                <button onClick={handleUndo} disabled={currentIndex === 0}
                  className="flex h-10 w-10 items-center justify-center rounded-full border bg-card shadow transition-all active:scale-90 disabled:opacity-30">
                  <RotateCcw className="h-4 w-4 text-muted-foreground" />
                </button>
                <button onClick={handleSwipeRight}
                  className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all active:scale-90"
                  style={{ background: 'hsl(var(--page-discover))', boxShadow: '0 4px 20px hsl(var(--page-discover) / 0.4)' }}>
                  <Heart className="h-7 w-7 text-white fill-white" />
                </button>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                {currentIndex + 1} / {swipeDogs.length}
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Compass className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="mb-2 font-display text-lg font-semibold text-foreground">
                {swipeDogs.length === 0 ? 'Bugün sakin' : 'Hepsini gördün! 🎉'}
              </h2>
              <p className="max-w-[280px] text-sm text-muted-foreground">
                {swipeDogs.length > 0
                  ? 'Yeni köpekler katılınca tekrar gel!'
                  : myDog ? `${accusative(myDog.name)} parka götürmeye ne dersin?` : 'Parka uğramaya ne dersin?'}
              </p>
              {currentIndex > 0 && (
                <button onClick={() => setCurrentIndex(0)} className="mt-4 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
                  style={{ background: 'hsl(var(--page-discover))' }}>Baştan Başla</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dog profile sheet */}
      <DogProfileSheet
        dog={sheetDog}
        onClose={() => setSheetDog(null)}
        onWave={sheetDog ? () => { handleWave(sheetDog.dog_id); setSheetDog(null); } : undefined}
        hasWaved={sheetDog ? wavedDogs.has(sheetDog.dog_id) : false}
      />
    </div>
  );
}
