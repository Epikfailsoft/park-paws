import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import { supabase } from '@/integrations/supabase/client';
import { DogCard } from '@/components/cards/DogCard';
import { DiscoverFilters } from '@/components/discover/DiscoverFilters';
import { MapTeaser } from '@/components/discover/MapTeaser';
import { WaveLimitModal } from '@/components/discover/WaveLimitModal';
import { Compass, Loader2, ToggleLeft, ToggleRight, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { RATE_LIMITS, getTimeContext, isPlaydateActive } from '@/types/dogspace';
import type { DiscoverDog } from '@/types/dogspace';

const PAGE_SIZE = 30;

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
  const [energyFilter, setEnergyFilter] = useState<number | null>(null);
  const [neuteredFilter, setNeuteredFilter] = useState<boolean | null>(null);

  // Wave limit modal
  const [showWaveLimitModal, setShowWaveLimitModal] = useState(false);

  // Map teaser stats
  const [activeDogCount, setActiveDogCount] = useState(0);
  const [activeParkCount, setActiveParkCount] = useState(0);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const myDog = dogs[0];

  // Fetch discover dogs using RPC
  const fetchDiscoverDogs = useCallback(async (reset = false) => {
    if (!profile) return;

    const currentOffset = reset ? 0 : offset;
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const { data, error } = await supabase.rpc('get_discover_dogs', {
        p_user_lat: lat,
        p_user_lng: lng,
        p_max_distance_km: distance,
        p_limit: PAGE_SIZE,
        p_offset: currentOffset,
      });

      if (error) throw error;

      let results = (data || []) as DiscoverDog[];

      // Client-side filters
      if (energyFilter !== null) {
        results = results.filter(d => d.energy_level === energyFilter);
      }
      if (neuteredFilter !== null) {
        results = results.filter(d => d.is_neutered === neuteredFilter);
      }

      if (reset) {
        setDiscoverDogs(results);
        setOffset(PAGE_SIZE);
      } else {
        setDiscoverDogs(prev => [...prev, ...results]);
        setOffset(prev => prev + PAGE_SIZE);
      }

      setHasMore(results.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching dogs:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [profile, lat, lng, distance, energyFilter, neuteredFilter, offset]);

  // Fetch wave status
  const fetchWaveStatus = useCallback(async () => {
    if (!profile || !myDog) return;
    try {
      const { data: remaining } = await supabase
        .rpc('get_remaining_waves', { p_user_id: profile.id });
      if (remaining !== null) setWavesRemaining(remaining);

      const { data: wavesData } = await supabase
        .from('waves')
        .select('to_dog_id')
        .eq('from_dog_id', myDog.id);
      if (wavesData) {
        setWavedDogs(new Set(wavesData.map(w => w.to_dog_id)));
      }
    } catch (error) {
      console.error('Error fetching wave status:', error);
    }
  }, [profile, myDog]);

  // Fetch map teaser stats
  const fetchTeaserStats = useCallback(async () => {
    try {
      const { count: dogCount } = await supabase
        .from('dogs')
        .select('*', { count: 'exact', head: true })
        .eq('playdate_on', true)
        .is('deleted_at', null);

      const { count: parkCount } = await supabase
        .from('parks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ACTIVE');

      setActiveDogCount(dogCount || 0);
      setActiveParkCount(parkCount || 0);
    } catch { /* ignore */ }
  }, []);

  // Initial load
  useEffect(() => {
    if (profile) {
      fetchDiscoverDogs(true);
      fetchWaveStatus();
      fetchTeaserStats();
    } else {
      setLoading(false);
    }
  }, [profile, distance, energyFilter, neuteredFilter, lat, lng]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchDiscoverDogs(false);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, loading, fetchDiscoverDogs]);

  // Update dog location in DB
  useEffect(() => {
    if (lat && lng && myDog) {
      supabase.rpc('update_dog_location', {
        p_dog_id: myDog.id,
        p_lat: lat,
        p_lng: lng,
      }).catch(() => { /* silent */ });
    }
  }, [lat, lng, myDog?.id]);

  const handleWave = async (toDogId: string) => {
    if (!myDog || !profile) {
      toast.error('Önce köpek profili oluştur');
      return;
    }

    if (wavesRemaining <= 0) {
      setShowWaveLimitModal(true);
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('send_wave', {
          p_sender_dog_id: myDog.id,
          p_target_dog_id: toDogId,
        });

      if (error) throw error;

      const result = data as { status: string; message: string; harmony_id?: string };

      if (result.status === 'ERROR') {
        if (result.message.includes('limit')) {
          setShowWaveLimitModal(true);
        } else {
          toast.error(result.message);
        }
        return;
      }

      setWavedDogs(prev => new Set([...prev, toDogId]));
      setWavesRemaining(prev => prev - 1);

      if (result.status === 'HARMONY_CREATED') {
        toast.success('🎉 Eşleştiniz!', { duration: 5000 });
      } else {
        toast.success('Wave gönderildi! 👋');
      }
    } catch (error) {
      console.error('Error waving:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const togglePlaydateOn = async () => {
    if (!myDog) return;
    try {
      const newValue = !isPlaydateActive(myDog);
      const { data, error } = await supabase
        .rpc('toggle_playdate', {
          p_dog_id: myDog.id,
          p_activate: newValue,
        });

      if (error) throw error;
      const result = data as { status: string; message: string };
      if (result.status === 'ERROR') {
        toast.error(result.message);
        return;
      }

      await refreshDogs();
      toast.success(newValue ? 'Playdate açık! 24 saat boyunca görünür olacaksın.' : 'Playdate kapatıldı');
    } catch (error) {
      console.error('Error toggling playdate:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const playdateActive = myDog && isPlaydateActive(myDog);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-top safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Compass className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-foreground">Keşfet</h1>
              <p className="text-xs text-muted-foreground">
                {getTimeContext()} · {selectedPark?.name || 'Park seç'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground"
            >
              <Filter className="h-4 w-4" />
            </button>
            <div className="rounded-full bg-secondary px-3 py-1.5">
              <span className="text-sm font-medium text-secondary-foreground">
                👋 {wavesRemaining}/{RATE_LIMITS.DAILY_WAVES}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      {showFilters && (
        <div className="border-b bg-card px-4 py-3">
          <DiscoverFilters
            distance={distance}
            onDistanceChange={(km) => { setDistance(km); setOffset(0); }}
            energyFilter={energyFilter}
            onEnergyChange={(val) => { setEnergyFilter(val); setOffset(0); }}
            neuteredFilter={neuteredFilter}
            onNeuteredChange={(val) => { setNeuteredFilter(val); setOffset(0); }}
          />
        </div>
      )}

      {/* Playdate Toggle */}
      {myDog && (
        <div className="mx-4 mt-4 rounded-xl bg-card p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {playdateActive ? (
                <ToggleRight className="h-6 w-6 text-primary" />
              ) : (
                <ToggleLeft className="h-6 w-6 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium text-foreground">Playdate'e Açık</p>
                <p className="text-xs text-muted-foreground">
                  {playdateActive ? '24 saat boyunca görünür' : 'Keşfet\'te görünmüyorsun'}
                </p>
              </div>
            </div>
            <button
              onClick={togglePlaydateOn}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                playdateActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {playdateActive ? 'Açık' : 'Kapalı'}
            </button>
          </div>
        </div>
      )}

      {/* Map Teaser */}
      {(activeDogCount > 0 || activeParkCount > 0) && (
        <div className="mx-4 mt-3">
          <MapTeaser activeDogCount={activeDogCount} activeParkCount={activeParkCount} />
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-4">
        {discoverDogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <Compass className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mb-2 font-display text-lg font-semibold text-foreground">
              Bugün sakin
            </h2>
            <p className="max-w-[280px] text-sm text-muted-foreground mb-4">
              {myDog?.name}'i parka götürmeye ne dersin?
            </p>
            {myDog && !playdateActive && (
              <button
                onClick={togglePlaydateOn}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                <ToggleRight className="h-4 w-4" />
                Playdate'i Aç
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground">
              🔍 Playdate'e açık köpekler
            </p>
            <div className="grid grid-cols-2 gap-3">
              {discoverDogs.map((dog) => (
                <DogCard
                  key={dog.dog_id}
                  dog={{
                    id: dog.dog_id,
                    name: dog.dog_name,
                    photo_url: dog.photo_url,
                    approximate_age: dog.approximate_age,
                    energy_level: dog.energy_level as 1|2|3|4|5,
                    daily_energy: dog.daily_energy as 1|2|3|4|5 | undefined,
                    neutered: dog.is_neutered,
                    social_style: dog.social_style as any,
                    triggers: dog.triggers,
                    bio: dog.bio,
                    gender: dog.gender as any,
                    breed: dog.breed_name ? { id: '', name: dog.breed_name, code: '', created_at: '' } : undefined,
                    park_checkin_active: dog.park_checkin_active,
                    playdate_on: dog.playdate_on,
                    is_lost: dog.is_lost,
                    owner_id: '',
                    breed_id: '',
                    owner_name_stub: dog.owner_name_stub || undefined,
                    owner_photo_stub: dog.owner_photo_stub || undefined,
                  } as any}
                  owner={dog.owner_name_stub ? {
                    id: '',
                    user_id: '',
                    display_name: dog.owner_name_stub,
                    photo_url: dog.owner_photo_stub || undefined,
                    created_at: '',
                    updated_at: '',
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

            {/* Infinite scroll trigger */}
            <div ref={loadMoreRef} className="h-10 flex items-center justify-center mt-4">
              {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              {!hasMore && discoverDogs.length > 0 && (
                <p className="text-xs text-muted-foreground">Tüm köpekler gösterildi</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Wave Limit Modal */}
      <WaveLimitModal
        open={showWaveLimitModal}
        onClose={() => setShowWaveLimitModal(false)}
      />
    </div>
  );
}
