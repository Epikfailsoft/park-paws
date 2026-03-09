import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import { supabase } from '@/integrations/supabase/client';
import { DogCard } from '@/components/cards/DogCard';
import { WaveLimitModal } from '@/components/discover/WaveLimitModal';
import { Compass, Loader2, ToggleRight, ToggleLeft, AlertTriangle, Users, Zap, SlidersHorizontal, X } from 'lucide-react';
import dogiLogo from '@/assets/dogi-logo.png';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RATE_LIMITS, SOCIAL_STYLE_OPTIONS, getTimeContext, isPlaydateActive, getPlaydateRemainingHours } from '@/types/dogspace';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { DiscoverDog } from '@/types/dogspace';

const PAGE_SIZE = 30;

// Filter chip options
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
  const { dogs, profile, selectedPark, refreshDogs } = useAuth();
  const { lat, lng } = useLocation();

  const [discoverDogs, setDiscoverDogs] = useState<DiscoverDog[]>([]);
  const [wavedDogs, setWavedDogs] = useState<Set<string>>(new Set());
  const [wavesRemaining, setWavesRemaining] = useState<number>(RATE_LIMITS.DAILY_WAVES);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [distance, setDistance] = useState(10);
  const [genderFilter, setGenderFilter] = useState<string | null>(null);
  const [socialStyleFilter, setSocialStyleFilter] = useState<string | null>(null);
  const [energyFilter, setEnergyFilter] = useState<number | null>(null);

  // Wave limit modal
  const [showWaveLimitModal, setShowWaveLimitModal] = useState(false);

  // Stats
  const [activeDogCount, setActiveDogCount] = useState(0);
  const [last24hDogCount, setLast24hDogCount] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const myDog = dogs[0];
  const playdateActive = myDog && isPlaydateActive(myDog);

  const lostDogs = discoverDogs.filter(d => d.is_lost);
  const regularDogs = discoverDogs.filter(d => !d.is_lost);

  const activeFilterCount = [genderFilter, socialStyleFilter, energyFilter].filter(Boolean).length;

  // Fetch discover dogs
  const fetchDiscoverDogs = useCallback(async (reset = false) => {
    if (!profile) return;
    const currentOffset = reset ? 0 : offset;
    if (reset) setLoading(true); else setLoadingMore(true);

    try {
      const { data, error } = await supabase.rpc('get_discover_dogs', {
        p_user_lat: lat, p_user_lng: lng,
        p_max_distance_km: distance, p_limit: PAGE_SIZE, p_offset: currentOffset,
      });
      if (error) throw error;

      let results = (data || []) as DiscoverDog[];
      if (genderFilter) results = results.filter(d => d.gender === genderFilter);
      if (socialStyleFilter) results = results.filter(d => d.social_style === socialStyleFilter);
      if (energyFilter) results = results.filter(d => d.energy_level === energyFilter);

      if (reset) { setDiscoverDogs(results); setOffset(PAGE_SIZE); }
      else { setDiscoverDogs(prev => [...prev, ...results]); setOffset(prev => prev + PAGE_SIZE); }
      setHasMore(results.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching dogs:', error);
    } finally { setLoading(false); setLoadingMore(false); }
  }, [profile, lat, lng, distance, genderFilter, socialStyleFilter, energyFilter, offset]);

  // Fetch wave status
  const fetchWaveStatus = useCallback(async () => {
    if (!profile || !myDog) return;
    try {
      const { data: remaining } = await supabase.rpc('get_remaining_waves', { p_user_id: profile.id });
      if (remaining !== null) setWavesRemaining(remaining);
      const { data: wavesData } = await supabase.from('waves').select('to_dog_id').eq('from_dog_id', myDog.id);
      if (wavesData) setWavedDogs(new Set(wavesData.map(w => w.to_dog_id)));
    } catch (error) { console.error('Error fetching wave status:', error); }
  }, [profile, myDog]);

  // Fetch stats
  const fetchTeaserStats = useCallback(async () => {
    try {
      const [dogRes, memberRes, last24hRes] = await Promise.all([
        supabase.from('dogs').select('*', { count: 'exact', head: true }).eq('playdate_on', true).is('deleted_at', null),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('dogs').select('*', { count: 'exact', head: true }).is('deleted_at', null)
          .gte('playdate_started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);
      setActiveDogCount(dogRes.count || 0);
      setTotalMembers(memberRes.count || 0);
      setLast24hDogCount(last24hRes.count || 0);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (profile) { fetchDiscoverDogs(true); fetchWaveStatus(); fetchTeaserStats(); }
    else setLoading(false);
  }, [profile, distance, genderFilter, socialStyleFilter, energyFilter, lat, lng]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) fetchDiscoverDogs(false); },
      { threshold: 0.1 }
    );
    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, loading, fetchDiscoverDogs]);

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
      else toast.success('Wave gönderildi! 👋');
    } catch (error) { console.error('Error waving:', error); toast.error('Bir hata oluştu'); }
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
    } catch (error) { console.error(error); toast.error('Bir hata oluştu'); }
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

  // Playdate OFF → Show activation CTA
  if (myDog && !playdateActive) {
    return (
      <div className="min-h-screen bg-background safe-top safe-bottom">
        <header className="sticky top-0 z-40 glass border-b px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={dogiLogo} alt="DOGI" className="h-[50px] w-[50px] rounded-xl" />
            <div>
              <h1 className="font-display text-lg font-bold text-foreground">Keşfet</h1>
              <p className="text-xs text-muted-foreground">{neighborhoodName ? `${neighborhoodName} · ` : ''}{getTimeContext()}</p>
            </div>
          </div>
        </header>

        {lostDogs.length > 0 && (
          <div className="mx-4 mt-4">
            <LostDogsBanner dogs={lostDogs} onWave={handleWave} wavedDogs={wavedDogs} />
          </div>
        )}

        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full" style={{ background: 'hsl(var(--page-discover) / 0.15)' }}>
            <Compass className="h-10 w-10" style={{ color: 'hsl(var(--page-discover))' }} />
          </div>
          <h2 className="mb-2 font-display text-xl font-bold text-foreground">Playdate modunu aç!</h2>
          <p className="max-w-[300px] text-sm text-muted-foreground mb-6">
            Yeni köpeklerle tanışmak için Playdate modunu aktif et. 24 saat boyunca Keşfet'te görünür olacaksın.
          </p>
          <button onClick={togglePlaydateOn}
            className="flex items-center gap-2 rounded-xl px-6 py-3 text-base font-semibold text-white shadow-lg transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'hsl(var(--page-discover))' }}>
            <ToggleRight className="h-5 w-5" /> Playdate'i Aç
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen safe-top safe-bottom" style={{ background: `linear-gradient(180deg, hsl(var(--page-discover-light)) 0%, hsl(var(--background)) 20%)` }}>
      {/* Background watermark logo */}
      <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center opacity-[0.04]">
        <img src={dogiLogo} alt="" className="h-[70vh] w-[70vh] object-contain" />
      </div>
      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-40 glass border-b">
        {/* Row 1: Title + Playdate toggle */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-3">
            <img src={dogiLogo} alt="DOGI" className="h-[45px] w-[45px] rounded-xl" />
            <div>
              <h1 className="font-display text-lg font-bold text-foreground leading-tight">Keşfet</h1>
              <p className="text-[11px] text-muted-foreground">{neighborhoodName ? `${neighborhoodName} · ` : ''}{getTimeContext()}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Filter dropdown button */}
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "relative flex items-center justify-center h-9 w-9 rounded-full border transition-all",
                    showFilters || activeFilterCount > 0
                      ? "border-[hsl(var(--page-discover))] bg-[hsl(var(--page-discover))]/10"
                      : "border-border bg-card"
                  )}>
                  <SlidersHorizontal className="h-4 w-4" style={{ color: activeFilterCount > 0 ? 'hsl(var(--page-discover))' : undefined }} />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                      style={{ background: 'hsl(var(--page-discover))' }}>
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
                      <button key={km} onClick={() => { setDistance(km); setOffset(0); }}
                        className={cn(
                          "flex-1 rounded-lg py-2 text-xs font-medium transition-all",
                          distance === km
                            ? "text-white"
                            : "bg-secondary text-secondary-foreground"
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
                        onClick={() => { setGenderFilter(genderFilter === g.value ? null : g.value); setOffset(0); }}
                        className={cn(
                          "flex-1 rounded-lg py-2 text-xs font-medium transition-all",
                          genderFilter === g.value
                            ? "text-white"
                            : "bg-secondary text-secondary-foreground"
                        )}
                        style={genderFilter === g.value ? { background: 'hsl(var(--page-discover))' } : undefined}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Energy */}
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5">⚡ Enerji Seviyesi</p>
                  <div className="flex gap-1.5">
                    {ENERGY_FILTER_OPTIONS.map(e => (
                      <button key={e.value}
                        onClick={() => { setEnergyFilter(energyFilter === e.level ? null : e.level); setOffset(0); }}
                        className={cn(
                          "flex-1 rounded-lg py-2 text-xs font-medium transition-all",
                          energyFilter === e.level
                            ? "text-white"
                            : "bg-secondary text-secondary-foreground"
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
                        onClick={() => { setSocialStyleFilter(socialStyleFilter === s.value ? null : s.value); setOffset(0); }}
                        className={cn(
                          "flex-1 rounded-lg py-2 text-xs font-medium transition-all",
                          socialStyleFilter === s.value
                            ? "text-white"
                            : "bg-secondary text-secondary-foreground"
                        )}
                        style={socialStyleFilter === s.value ? { background: 'hsl(var(--page-discover))' } : undefined}>
                        {s.icon} {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Playdate ON/OFF toggle */}
            {myDog && (
              <button onClick={togglePlaydateOn}
                className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all text-white"
                style={{ background: 'hsl(var(--page-discover))' }}>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
                </span>
                {(() => {
                  const hrs = getPlaydateRemainingHours(myDog);
                  if (hrs >= 1) return `${Math.floor(hrs)}s kaldı`;
                  return `${Math.round(hrs * 60)}dk kaldı`;
                })()}
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Wave counter */}
        <div className="flex items-center gap-1.5 px-4 pb-2.5 overflow-x-auto no-scrollbar">
          <div className="rounded-full bg-secondary px-2.5 py-1.5 whitespace-nowrap shrink-0">
            <span className="text-[11px] font-medium text-secondary-foreground">👋 {wavesRemaining}/{RATE_LIMITS.DAILY_WAVES}</span>
          </div>
        </div>
      </header>
      {/* ─── ACTIVE STRIP ─── */}
      <div className="mx-4 mt-3 rounded-xl p-3" style={{ background: 'hsl(var(--page-discover) / 0.08)' }}>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: 'hsl(var(--page-discover))' }}></span>
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: 'hsl(var(--page-discover))' }}></span>
            </span>
            <span className="font-semibold" style={{ color: 'hsl(var(--page-discover))' }}>
              {activeDogCount} köpek Playdate ON
            </span>
          </div>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground font-medium">Bugün {last24hDogCount} yeni</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground font-medium">{totalMembers} üye</span>
        </div>
      </div>

      {/* ─── LOST DOGS ─── */}
      {lostDogs.length > 0 && (
        <div className="mx-4 mt-3">
          <LostDogsBanner dogs={lostDogs} onWave={handleWave} wavedDogs={wavedDogs} />
        </div>
      )}

      {/* ─── DOG CARDS ─── */}
      <div className="px-4 py-4">
        {regularDogs.length === 0 && lostDogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <Compass className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mb-2 font-display text-lg font-semibold text-foreground">Bugün sakin</h2>
            <p className="max-w-[280px] text-sm text-muted-foreground">{myDog?.name}'i parka götürmeye ne dersin?</p>
          </div>
        ) : (
          <>
            {regularDogs.length > 0 && (
              <>
                <p className="mb-3 text-xs text-muted-foreground font-medium">
                  🔍 Playdate'e açık köpekler ({regularDogs.length})
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {regularDogs.map((dog) => (
                    <DogCard
                      key={dog.dog_id}
                      dog={{
                        id: dog.dog_id, name: dog.dog_name, photo_url: dog.photo_url,
                        approximate_age: dog.approximate_age,
                        energy_level: dog.energy_level as 1|2|3|4|5,
                        daily_energy: dog.daily_energy as 1|2|3|4|5 | undefined,
                        neutered: dog.is_neutered,
                        social_style: dog.social_style as any,
                        triggers: dog.triggers, bio: dog.bio,
                        gender: dog.gender as any,
                        breed: dog.breed_name ? { id: '', name: dog.breed_name, code: '', created_at: '' } : undefined,
                        park_checkin_active: dog.park_checkin_active,
                        playdate_on: dog.playdate_on, is_lost: false,
                        owner_id: '', breed_id: '',
                        owner_name_stub: dog.owner_name_stub || undefined,
                        owner_photo_stub: dog.owner_photo_stub || undefined,
                      } as any}
                      owner={dog.owner_name_stub ? {
                        id: '', user_id: '', display_name: dog.owner_name_stub,
                        photo_url: dog.owner_photo_stub || undefined, created_at: '', updated_at: '',
                      } : undefined}
                      showWaveButton
                      onWave={() => handleWave(dog.dog_id)}
                      hasWaved={wavedDogs.has(dog.dog_id)}
                      compact
                      distanceKm={dog.distance_km}
                      parkName={dog.current_park_name}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Infinite scroll trigger */}
            <div ref={loadMoreRef} className="h-10 flex items-center justify-center mt-4">
              {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              {!hasMore && discoverDogs.length > 0 && (
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground">🏁 Listenin sonuna geldin</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <WaveLimitModal open={showWaveLimitModal} onClose={() => setShowWaveLimitModal(false)} />
    </div>
  );
}

// Lost Dogs Banner Component
function LostDogsBanner({ dogs, onWave, wavedDogs }: { dogs: DiscoverDog[]; onWave: (dogId: string) => void; wavedDogs: Set<string>; }) {
  return (
    <div className="rounded-2xl border-2 border-destructive bg-destructive/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h3 className="font-display font-bold text-destructive">Kayıp Köpekler ({dogs.length})</h3>
      </div>
      <div className="space-y-3">
        {dogs.map((dog) => (
          <div key={dog.dog_id} className="flex items-center gap-3 rounded-xl bg-card p-3">
            <img src={dog.photo_url} alt={dog.dog_name} className="h-14 w-14 rounded-xl object-cover ring-2 ring-destructive" />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground truncate">{dog.dog_name}</h4>
              <p className="text-xs text-muted-foreground">{dog.breed_name || 'Karışık'} · {dog.approximate_age}</p>
              {dog.current_park_name && (
                <p className="text-xs text-destructive mt-0.5">📍 Son görülen: {dog.current_park_name}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
