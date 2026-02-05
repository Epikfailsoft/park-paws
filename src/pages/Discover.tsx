import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DogCard } from '@/components/cards/DogCard';
import { Compass, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import type { Dog, Profile } from '@/types/dogspace';
import { RATE_LIMITS, getTimeContext, isPlaydateActive } from '@/types/dogspace';

interface DogWithOwner extends Dog {
  owner: Profile;
}

export default function Discover() {
  const { dogs, profile, selectedPark, refreshDogs } = useAuth();
  const [discoverDogs, setDiscoverDogs] = useState<DogWithOwner[]>([]);
  const [wavedDogs, setWavedDogs] = useState<Set<string>>(new Set());
  const [wavesRemaining, setWavesRemaining] = useState<number>(RATE_LIMITS.DAILY_WAVES);
  const [loading, setLoading] = useState(true);

  const myDog = dogs[0];

  useEffect(() => {
    if (myDog && selectedPark) {
      fetchDiscoverDogs();
      fetchWaveStatus();
    } else {
      setLoading(false);
    }
  }, [myDog, selectedPark]);

  // V1.22: Discover shows dogs with playdate_on=true seen in last 24h
  const fetchDiscoverDogs = async () => {
    if (!selectedPark || !profile) return;

    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - RATE_LIMITS.DISCOVER_ACTIVE_HOURS);

      // Get dogs with playdate_on=true
      const { data: playdateDogs, error } = await supabase
        .from('dogs')
        .select(`
          *,
          owner:profiles!inner(*),
          breed:breeds(*)
        `)
        .eq('playdate_on', true)
        .is('deleted_at', null)
        .neq('owner_id', profile.id);

      if (error) throw error;

      // Also get dogs with recent park activity for boosting
      const { data: sessions } = await supabase
        .from('park_mode_sessions')
        .select('dog_id, started_at')
        .eq('park_id', selectedPark.id)
        .gte('started_at', twentyFourHoursAgo.toISOString());

      const recentlyActiveDogIds = new Set(sessions?.map(s => s.dog_id) || []);

      // Filter and sort: park-active first, then by activity
      const sortedDogs = (playdateDogs || [])
        .filter((d: any) => d.owner && d.owner_id !== profile?.id)
        .sort((a: any, b: any) => {
          // Park checked-in dogs first
          const aActive = recentlyActiveDogIds.has(a.id);
          const bActive = recentlyActiveDogIds.has(b.id);
          if (aActive && !bActive) return -1;
          if (!aActive && bActive) return 1;
          return 0;
        })
        .slice(0, RATE_LIMITS.DISCOVER_MAX_DOGS);

      setDiscoverDogs(sortedDogs as DogWithOwner[]);
    } catch (error) {
      console.error('Error fetching dogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWaveStatus = async () => {
    if (!profile) return;

    try {
      const { data: remaining } = await supabase
        .rpc('get_remaining_waves', { p_user_id: profile.id });

      if (remaining !== null) {
        setWavesRemaining(remaining);
      }

      if (myDog) {
        const { data: wavesData } = await supabase
          .from('waves')
          .select('to_dog_id')
          .eq('from_dog_id', myDog.id);

        if (wavesData) {
          setWavedDogs(new Set(wavesData.map(w => w.to_dog_id)));
        }
      }
    } catch (error) {
      console.error('Error fetching wave status:', error);
    }
  };

  // V1.22: Use send_wave RPC
  const handleWave = async (toDogId: string) => {
    if (!myDog || !profile) {
      toast.error('Önce köpek profili oluştur');
      return;
    }

    if (wavesRemaining <= 0) {
      toast.error('Bugünlük wave hakkın bitti!');
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('send_wave', {
          p_sender_dog_id: myDog.id,
          p_target_dog_id: toDogId
        });

      if (error) throw error;

      const result = data as { status: string; message: string; harmony_id?: string };

      if (result.status === 'ERROR') {
        toast.error(result.message);
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
          p_activate: newValue
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const playdateActive = myDog && isPlaydateActive(myDog);

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
              <h1 className="font-display text-lg font-bold text-foreground">
                Keşfet
              </h1>
              <p className="text-xs text-muted-foreground">
                {getTimeContext()} · {selectedPark?.name || 'Park seç'}
              </p>
            </div>
          </div>
          <div className="rounded-full bg-secondary px-3 py-1.5">
            <span className="text-sm font-medium text-secondary-foreground">
              👋 {wavesRemaining}/{RATE_LIMITS.DAILY_WAVES}
            </span>
          </div>
        </div>
      </header>

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

      {/* Content */}
      <div className="px-4 py-4">
        {!selectedPark ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <span className="text-2xl">🏞️</span>
            </div>
            <h2 className="mb-2 font-display text-lg font-semibold text-foreground">
              Park seçilmedi
            </h2>
            <p className="max-w-[280px] text-sm text-muted-foreground">
              Keşfetmeye başlamak için önce bir park seç.
            </p>
          </div>
        ) : discoverDogs.length === 0 ? (
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
              🔍 Playdate'e açık köpekler · Max {RATE_LIMITS.DISCOVER_MAX_DOGS}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {discoverDogs.map((dog) => (
                <DogCard
                  key={dog.id}
                  dog={dog}
                  owner={dog.owner}
                  showWaveButton
                  onWave={() => handleWave(dog.id)}
                  hasWaved={wavedDogs.has(dog.id)}
                  compact
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
