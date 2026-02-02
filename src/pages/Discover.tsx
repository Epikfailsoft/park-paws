import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DogCard } from '@/components/cards/DogCard';
import { Compass, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Dog, Profile } from '@/types/dogspace';
import { RATE_LIMITS } from '@/types/dogspace';

interface DogWithOwner extends Dog {
  owner: Profile;
}

export default function Discover() {
  const { dogs, profile, selectedPark } = useAuth();
  const [discoverDogs, setDiscoverDogs] = useState<DogWithOwner[]>([]);
  const [wavedDogs, setWavedDogs] = useState<Set<string>>(new Set());
  const [wavesRemaining, setWavesRemaining] = useState<number>(RATE_LIMITS.DAILY_WAVES);
  const [loading, setLoading] = useState(true);

  const myDog = dogs[0]; // User's primary dog

  useEffect(() => {
    if (myDog && selectedPark) {
      fetchDiscoverDogs();
      fetchWaveStatus();
    } else {
      setLoading(false);
    }
  }, [myDog, selectedPark]);

  const fetchDiscoverDogs = async () => {
    if (!selectedPark) return;

    try {
      // Get dogs from park_mode_sessions in the last 48 hours
      const fortyEightHoursAgo = new Date();
      fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

      const { data: sessions, error } = await supabase
        .from('park_mode_sessions')
        .select(`
          dog_id,
          dog:dogs(*, owner:profiles(*), breed:breeds(*))
        `)
        .eq('park_id', selectedPark.id)
        .gte('started_at', fortyEightHoursAgo.toISOString())
        .is('dogs.deleted_at', null);

      if (error) throw error;

      // Deduplicate by dog_id and exclude own dogs
      const uniqueDogs = new Map<string, DogWithOwner>();
      sessions?.forEach((session: any) => {
        if (session.dog && session.dog.owner_id !== profile?.id) {
          uniqueDogs.set(session.dog.id, session.dog as DogWithOwner);
        }
      });

      // Shuffle and limit to 15
      const shuffled = Array.from(uniqueDogs.values())
        .sort(() => Math.random() - 0.5)
        .slice(0, 15);

      setDiscoverDogs(shuffled);
    } catch (error) {
      console.error('Error fetching dogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWaveStatus = async () => {
    if (!profile) return;

    try {
      // Get today's wave count using RPC
      const { data: remaining } = await supabase
        .rpc('get_remaining_waves', { p_user_id: profile.id });

      if (remaining !== null) {
        setWavesRemaining(remaining);
      }

      // Get dogs we've waved to
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

  const handleWave = async (toDogId: string) => {
    if (!myDog || !profile || wavesRemaining <= 0) {
      toast.error('Bugünlük el sallama hakkın bitti!');
      return;
    }

    try {
      // Create wave
      const { error: waveError } = await supabase
        .from('waves')
        .insert({
          from_dog_id: myDog.id,
          to_dog_id: toDogId,
        });

      if (waveError) {
        if (waveError.code === '23505') {
          toast.info('Bu köpeğe zaten el salladın!');
          return;
        }
        throw waveError;
      }

      // Increment wave count using RPC
      await supabase.rpc('increment_daily_wave', { p_user_id: profile.id });

      setWavedDogs(prev => new Set([...prev, toDogId]));
      setWavesRemaining(prev => prev - 1);
      toast.success('El salladın! 👋');
    } catch (error) {
      console.error('Error waving:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const getTimeContext = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'sabah';
    if (hour >= 12 && hour < 18) return 'öğle';
    return 'akşam';
  };

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
              <h1 className="font-display text-lg font-bold text-foreground">
                Keşfet
              </h1>
              <p className="text-xs text-muted-foreground">
                {getTimeContext().charAt(0).toUpperCase() + getTimeContext().slice(1)} · {selectedPark?.name || 'Park seç'}
              </p>
            </div>
          </div>
          <div className="rounded-full bg-secondary px-3 py-1.5">
            <span className="text-sm font-medium text-secondary-foreground">
              👋 {wavesRemaining} kaldı
            </span>
          </div>
        </div>
      </header>

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
              Şu an aktif köpek yok
            </h2>
            <p className="max-w-[280px] text-sm text-muted-foreground">
              Son 48 saatte {selectedPark.name}'nda aktif olan köpek bulunamadı.
            </p>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
