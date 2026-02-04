import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DogCard } from '@/components/cards/DogCard';
import { MapPin, Loader2, Timer, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Dog, Profile, ParkModeSession, DogPrivate } from '@/types/dogspace';
import { RATE_LIMITS, isParkModeActive, getParkModeRemainingMinutes, formatTimeRemaining } from '@/types/dogspace';

interface DogWithOwner extends Dog {
  owner: Profile;
  dog_private?: DogPrivate[];
}

export default function ParkNow() {
  const navigate = useNavigate();
  const { profile, dogs, selectedPark, hasPhoto } = useAuth();
  const [parkDogs, setParkDogs] = useState<DogWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState<ParkModeSession | null>(null);
  const [remainingMinutes, setRemainingMinutes] = useState(0);
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);
  const [wavedDogs, setWavedDogs] = useState<Set<string>>(new Set());
  const [wavesRemaining, setWavesRemaining] = useState<number>(RATE_LIMITS.DAILY_WAVES);

  const myDog = dogs[0];

  useEffect(() => {
    if (selectedPark) {
      fetchParkDogs();
    } else {
      setLoading(false);
    }
    if (myDog) {
      fetchParkModeStatus();
      fetchWaveStatus();
    }
  }, [selectedPark, myDog]);

  // Update remaining time every minute
  useEffect(() => {
    if (!currentSession) return;

    const updateRemaining = () => {
      const mins = getParkModeRemainingMinutes(currentSession);
      setRemainingMinutes(mins);

      // Show warning when 15 minutes remaining
      if (mins <= RATE_LIMITS.PARK_MODE_WARNING_MINUTES && mins > 0) {
        setShowExpiryWarning(true);
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 60000);
    return () => clearInterval(interval);
  }, [currentSession]);

  const fetchParkDogs = async () => {
    if (!selectedPark) return;

    try {
      const fourHoursAgo = new Date();
      fourHoursAgo.setHours(fourHoursAgo.getHours() - RATE_LIMITS.PARK_MODE_AUTO_OFF_HOURS);

      // Get active park mode sessions
      const { data: sessions, error } = await supabase
        .from('park_mode_sessions')
        .select(`
          dog_id,
          started_at,
          dog:dogs!inner(
            *,
            owner:profiles!inner(*),
            breed:breeds(*),
            dog_private(*)
          )
        `)
        .eq('park_id', selectedPark.id)
        .is('ended_at', null)
        .gte('started_at', fourHoursAgo.toISOString());

      if (error) throw error;

      // Filter and sort: lost dogs first, then regular
      const activeDogs = (sessions || [])
        .map((s: any) => s.dog as DogWithOwner)
        .filter((d: any) => d && !d.deleted_at)
        .sort((a: Dog, b: Dog) => {
          if (a.is_lost && !b.is_lost) return -1;
          if (!a.is_lost && b.is_lost) return 1;
          return 0;
        });

      setParkDogs(activeDogs);
    } catch (error) {
      console.error('Error fetching park dogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchParkModeStatus = async () => {
    if (!myDog) return;

    const fourHoursAgo = new Date();
    fourHoursAgo.setHours(fourHoursAgo.getHours() - RATE_LIMITS.PARK_MODE_AUTO_OFF_HOURS);

    const { data } = await supabase
      .from('park_mode_sessions')
      .select('*')
      .eq('dog_id', myDog.id)
      .is('ended_at', null)
      .gte('started_at', fourHoursAgo.toISOString())
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data && isParkModeActive(data as ParkModeSession)) {
      setCurrentSession(data as ParkModeSession);
      setRemainingMinutes(getParkModeRemainingMinutes(data as ParkModeSession));
    } else {
      setCurrentSession(null);
    }
  };

  const fetchWaveStatus = async () => {
    if (!profile || !myDog) return;

    try {
      const { data: remaining } = await supabase
        .rpc('get_remaining_waves', { p_user_id: profile.id });

      if (remaining !== null) {
        setWavesRemaining(remaining);
      }

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
  };

  const toggleParkMode = async () => {
    if (!myDog || !profile || !selectedPark) return;

    if (!hasPhoto || !myDog.photo_url) {
      toast.error('Parkta görünür olmak için önce fotoğraf eklemelisin');
      return;
    }

    try {
      if (currentSession) {
        // End current session
        await supabase
          .from('park_mode_sessions')
          .update({ ended_at: new Date().toISOString() })
          .eq('id', currentSession.id);

        setCurrentSession(null);
        setShowExpiryWarning(false);
        toast.info('Park modu kapatıldı.');
      } else {
        // Start new session
        const { data: newSession, error } = await supabase
          .from('park_mode_sessions')
          .insert({
            dog_id: myDog.id,
            park_id: selectedPark.id,
          })
          .select()
          .single();

        if (error) throw error;

        setCurrentSession(newSession as ParkModeSession);
        toast.success('Parkta aktif oldun! 4 saat sonra otomatik kapanacak.');
      }

      fetchParkDogs();
    } catch (error) {
      console.error('Error toggling park mode:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const handlePingPresence = async () => {
    if (!myDog || !selectedPark) return;

    try {
      const { data, error } = await supabase
        .rpc('ping_presence', {
          p_dog_id: myDog.id,
          p_park_id: selectedPark.id,
          p_distance_m: null
        });

      if (error) throw error;

      const result = data as { status: string };
      if (result.status === 'PINGED') {
        toast.success('Varlığın onaylandı!');
        setShowExpiryWarning(false);
      }
    } catch (error) {
      console.error('Error pinging presence:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const handleWave = async (toDogId: string) => {
    if (!myDog || !profile) return;

    try {
      const { data, error } = await supabase
        .rpc('send_wave', {
          p_sender_dog_id: myDog.id,
          p_target_dog_id: toDogId
        });

      if (error) throw error;

      const result = data as { status: string; message: string };

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-top safe-bottom">
      {/* Expiry Warning Banner */}
      {showExpiryWarning && currentSession && (
        <div className="bg-amber-100 border-b border-amber-300 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Park Mode {remainingMinutes} dk sonra kapanacak
                </p>
                <p className="text-xs text-amber-600">Hâlâ parkta mısın?</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggleParkMode}
                className="rounded-lg bg-amber-200 px-3 py-1.5 text-sm font-medium text-amber-800"
              >
                Kapat
              </button>
              <button
                onClick={handlePingPresence}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
              >
                Evet, Devam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              currentSession ? "bg-[hsl(var(--park-active))]" : "bg-primary"
            )}>
              <MapPin className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-foreground">
                Park Şimdi
              </h1>
              <p className="text-xs text-muted-foreground">
                {selectedPark?.name || 'Park seç'} · {parkDogs.length} köpek aktif
              </p>
            </div>
          </div>

          {/* Park Mode Status */}
          {myDog && selectedPark && (
            <button
              onClick={toggleParkMode}
              disabled={!hasPhoto && !myDog.photo_url}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
                currentSession
                  ? "bg-[hsl(var(--park-active))] text-white"
                  : "bg-secondary text-secondary-foreground",
                (!hasPhoto && !myDog.photo_url) && "opacity-50"
              )}
            >
              {currentSession ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
                  </span>
                  {formatTimeRemaining(remainingMinutes)}
                </>
              ) : (
                'Park Mode'
              )}
            </button>
          )}
        </div>
      </header>

      {/* Wave Counter */}
      {myDog && (
        <div className="mx-4 mt-4 flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-2">
          <span className="text-sm text-muted-foreground">Kalan Wave</span>
          <span className="font-medium text-foreground">
            👋 {wavesRemaining}/{RATE_LIMITS.DAILY_WAVES}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-4">
        {!selectedPark ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mb-2 font-display text-lg font-semibold text-foreground">
              Park seçilmedi
            </h2>
            <p className="max-w-[280px] text-sm text-muted-foreground">
              Önce bir park seçmelisin.
            </p>
          </div>
        ) : parkDogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mb-2 font-display text-lg font-semibold text-foreground">
              Park şu an sakin
            </h2>
            <p className="max-w-[280px] text-sm text-muted-foreground mb-4">
              {myDog?.name}'in varlığını göstermek ister misin?
            </p>
            {myDog && !currentSession && (
              <button
                onClick={toggleParkMode}
                disabled={!hasPhoto && !myDog.photo_url}
                className="rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-50"
              >
                Park Mode'u Aç
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {parkDogs.map((dog) => {
              const isOwnDog = dog.owner_id === profile?.id;
              const isLost = dog.is_lost;

              return (
                <div
                  key={dog.id}
                  className={cn(
                    "rounded-2xl border-2 bg-card p-4",
                    isOwnDog && "border-primary",
                    isLost && "border-[hsl(var(--energy-5))] bg-[hsl(var(--energy-5))]/5"
                  )}
                  style={{ boxShadow: 'var(--shadow-card)' }}
                >
                  {/* Lost Dog Overlay */}
                  {isLost && (
                    <div className="mb-3 flex items-center gap-2 rounded-lg bg-destructive/20 p-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <span className="font-semibold text-destructive">KAYIP</span>
                    </div>
                  )}

                  <DogCard
                    dog={dog}
                    owner={dog.owner}
                    showWaveButton={!isOwnDog && !isLost}
                    onWave={() => handleWave(dog.id)}
                    hasWaved={wavedDogs.has(dog.id)}
                    isOwnDog={isOwnDog}
                    showFullInfo={true}
                    isLost={isLost}
                  />

                  {/* Own Dog Actions */}
                  {isOwnDog && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-primary font-medium">
                          Parkta Aktifsin
                        </span>
                        <button
                          onClick={() => navigate('/profile')}
                          className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground"
                        >
                          Düzenle
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Lost Dog Call Button */}
                  {isLost && dog.dog_private?.[0]?.emergency_phone && currentSession && (
                    <a
                      href={`tel:${dog.dog_private[0].emergency_phone}`}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-destructive py-3 font-semibold text-destructive-foreground"
                    >
                      📞 SAHİBİNİ ARA
                    </a>
                  )}

                  {/* Lost Dog - No Active Session */}
                  {isLost && !currentSession && (
                    <div className="mt-3 rounded-xl bg-secondary/50 p-3 text-center">
                      <p className="text-sm text-muted-foreground">
                        Telefon numarasını görmek için Park Mode'u aç
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
