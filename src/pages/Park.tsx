import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DogCard } from '@/components/cards/DogCard';
import { ParkBulletinBoard } from '@/components/social/ParkBulletinBoard';
import { DogProfileModal } from '@/components/social/DogProfileModal';
import { GroupWaveSection } from '@/components/park/GroupWaveSection';
import { MapPin, Loader2, Timer, AlertTriangle, ChevronDown, ChevronRight, Clock, Users, ArrowLeft, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Park as ParkType } from '@/types/dogspace';
import type { ParkDog } from '@/types/dogspace';
import { isParkCheckinActive, getParkCheckinRemainingMinutes, formatTimeRemaining, RATE_LIMITS, isPlaydateActive, getPlaydateRemainingHours } from '@/types/dogspace';
import parkDogSilhouette from '@/assets/park-dog-silhouette.png';
import dogiLogo from '@/assets/dogi-logo.png';

// City definitions with display order
const CITY_ORDER = ['İstanbul', 'Muğla', 'Ankara', 'İzmir'];

interface CityGroup {
  city: string;
  parks: ParkType[];
  activeCount: number;
  totalDogs: number;
}

type ViewState = 'city-select' | 'park-select' | 'park-view';

export default function Park() {
  const navigate = useNavigate();
  const { profile, dogs, selectedPark, hasPhoto, selectPark, refreshDogs } = useAuth();

  // View state
  const [viewState, setViewState] = useState<ViewState>('city-select');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  // Park data
  const [allParks, setAllParks] = useState<ParkType[]>([]);
  const [parkDogs, setParkDogs] = useState<ParkDog[]>([]);
  const [loading, setLoading] = useState(true);
  const [remainingMinutes, setRemainingMinutes] = useState(0);
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);
  const [wavedDogs, setWavedDogs] = useState<Set<string>>(new Set());
  const [joiningPark, setJoiningPark] = useState<string | null>(null);
  const [userApprovals, setUserApprovals] = useState<Set<string>>(new Set());
  const [totalParkDogCount, setTotalParkDogCount] = useState(0);
  const [selectedDogProfile, setSelectedDogProfile] = useState<any>(null);

  const myDog = dogs[0];
  const isCheckedIn = myDog && isParkCheckinActive(myDog);
  const playdateActive = myDog && isPlaydateActive(myDog);

  // If user already has a selected park, jump to park-view
  useEffect(() => {
    if (selectedPark && viewState === 'city-select') {
      const city = (selectedPark as any).location?.city;
      if (city) setSelectedCity(city);
      setViewState('park-view');
    }
  }, [selectedPark]);

  // Timer for expiry countdown
  useEffect(() => {
    if (!myDog || !isCheckedIn) return;
    const updateRemaining = () => {
      const mins = getParkCheckinRemainingMinutes(myDog);
      setRemainingMinutes(mins);
      if (mins <= RATE_LIMITS.PARK_MODE_WARNING_MINUTES && mins > 0) {
        setShowExpiryWarning(true);
      }
    };
    updateRemaining();
    const interval = setInterval(updateRemaining, 60000);
    return () => clearInterval(interval);
  }, [myDog, isCheckedIn]);

  const fetchParks = useCallback(async () => {
    const { data } = await supabase.from('parks').select('*').order('name');
    if (data) setAllParks(data as unknown as ParkType[]);
    setLoading(false);
  }, []);

  const fetchUserApprovals = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase.from('park_approvals').select('park_id').eq('user_id', profile.id);
    if (data) setUserApprovals(new Set(data.map((a) => a.park_id)));
  }, [profile]);

  const fetchParkDogs = useCallback(async () => {
    if (!selectedPark) return;
    try {
      const { data, error } = await supabase.rpc('get_park_dogs', {
        p_park_id: selectedPark.id,
        p_limit: 50
      });
      if (error) throw error;
      const dogs = (data || []) as ParkDog[];
      setParkDogs(dogs);
      setTotalParkDogCount(dogs.length);
    } catch (error) {
      console.error('Error fetching park dogs:', error);
    }
  }, [selectedPark]);

  const fetchWaveStatus = useCallback(async () => {
    if (!profile || !myDog) return;
    try {
      const { data: wavesData } = await supabase.from('waves').select('to_dog_id').eq('from_dog_id', myDog.id);
      if (wavesData) setWavedDogs(new Set(wavesData.map((w) => w.to_dog_id)));
    } catch (error) {
      console.error('Error fetching wave status:', error);
    }
  }, [profile, myDog]);

  useEffect(() => {
    fetchParks();
    fetchUserApprovals();
  }, []);

  useEffect(() => {
    if (selectedPark) fetchParkDogs();
    if (myDog) fetchWaveStatus();
  }, [selectedPark, myDog]);

  // Group parks by city
  const cityGroups: CityGroup[] = CITY_ORDER.map(city => {
    const cityParks = allParks.filter(p => (p as any).location?.city === city);
    return {
      city,
      parks: cityParks,
      activeCount: cityParks.filter(p => p.status === 'ACTIVE').length,
      totalDogs: 0 // Would need real-time data
    };
  }).filter(g => g.parks.length > 0);

  const currentCityParks = allParks.filter(p => (p as any).location?.city === selectedCity);
  const activeCityParks = currentCityParks.filter(p => p.status === 'ACTIVE');
  const waitlistCityParks = currentCityParks.filter(p => p.status === 'REQUESTED');

  // Handle park selection with auto check-in
  const handleSelectPark = async (parkId: string) => {
    await selectPark(parkId);
    setViewState('park-view');

    // Auto check-in if user has a dog with photo
    if (myDog && (hasPhoto || myDog.photo_url) && !isCheckedIn) {
      try {
        const { error: pdError } = await supabase.rpc('toggle_playdate', {
          p_dog_id: myDog.id, p_activate: true
        });
        if (!pdError) {
          await supabase.rpc('toggle_park_checkin', {
            p_dog_id: myDog.id, p_park_id: parkId, p_activate: true
          });
          await refreshDogs();
          toast.success('Parka giriş yapıldı! 🎾');
        }
      } catch (err) {
        console.error('Auto check-in failed:', err);
      }
    }
    fetchParkDogs();
  };

  const togglePlaydate = async () => {
    if (!myDog || !profile || !selectedPark) return;
    if (!hasPhoto && !myDog.photo_url) {
      toast.error('Parkta görünür olmak için önce fotoğraf eklemelisin');
      return;
    }
    try {
      if (!playdateActive) {
        const { data: pdData, error: pdError } = await supabase.rpc('toggle_playdate', {
          p_dog_id: myDog.id, p_activate: true
        });
        if (pdError) throw pdError;
        const pdResult = pdData as { status: string; message: string };
        if (pdResult.status === 'ERROR') { toast.error(pdResult.message); return; }
        if (!isCheckedIn) {
          await supabase.rpc('toggle_park_checkin', {
            p_dog_id: myDog.id, p_park_id: selectedPark.id, p_activate: true
          });
        }
        await refreshDogs();
        setShowExpiryWarning(false);
        toast.success('Playdate ON! 🎾');
        fetchParkDogs();
      } else {
        await supabase.rpc('toggle_playdate', { p_dog_id: myDog.id, p_activate: false });
        if (isCheckedIn) {
          await supabase.rpc('toggle_park_checkin', {
            p_dog_id: myDog.id, p_park_id: selectedPark.id, p_activate: false
          });
        }
        await refreshDogs();
        toast.success('Playdate kapatıldı, parktan çıkış yapıldı.');
        fetchParkDogs();
      }
    } catch (error) {
      console.error('Error toggling playdate:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const handleWave = async (toDogId: string) => {
    if (!myDog || !profile) return;
    try {
      const { data, error } = await supabase.rpc('send_wave', {
        p_sender_dog_id: myDog.id, p_target_dog_id: toDogId
      });
      if (error) throw error;
      const result = data as { status: string; message: string };
      if (result.status === 'ERROR') { toast.error(result.message); return; }
      setWavedDogs((prev) => new Set([...prev, toDogId]));
      if (result.status === 'HARMONY_CREATED') {
        toast.success('🎉 Eşleştiniz!', { duration: 5000 });
      } else {
        toast.success('Woof gönderildi! 🐕');
      }
    } catch (error) {
      console.error('Error waving:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const handleJoinWaitlist = async (parkId: string) => {
    if (!profile) return;
    if (userApprovals.has(parkId)) {
      toast.info('Bu parka zaten destek verdin');
      return;
    }
    setJoiningPark(parkId);
    try {
      const { error } = await supabase.from('park_approvals').insert({
        park_id: parkId, user_id: profile.id
      });
      if (error) throw error;
      const park = allParks.find((p) => p.id === parkId);
      if (park) {
        const newCount = (park.approval_count || 0) + 1;
        await supabase.from('parks').update({ approval_count: newCount } as any).eq('id', parkId);
        if (newCount >= (park.required_approvals || 10)) {
          await supabase.from('parks').update({ status: 'ACTIVE', activated_at: new Date().toISOString() } as any).eq('id', parkId);
          toast.success(`🎉 ${park.name} aktif oldu!`);
        } else {
          toast.success('Desteğin kaydedildi! 🐕');
        }
      }
      setUserApprovals((prev) => new Set([...prev, parkId]));
      fetchParks();
    } catch (error) {
      console.error('Error joining waitlist:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setJoiningPark(null);
    }
  };

  const handleBackToCity = () => {
    setViewState('city-select');
    setSelectedCity(null);
  };

  const handleBackToParks = () => {
    setViewState('park-select');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // VIEW: City Selection
  // ═══════════════════════════════════════════
  if (viewState === 'city-select') {
    return (
      <div className="relative min-h-screen safe-top safe-bottom" style={{ background: `linear-gradient(180deg, hsl(var(--page-park-light)) 0%, hsl(var(--background)) 30%)` }}>
        <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center opacity-[0.04]">
          <img src={dogiLogo} alt="" className="h-[70vh] w-[70vh] object-contain" />
        </div>

        <header className="sticky top-0 z-40 border-b px-4 py-4" style={{ background: 'hsl(var(--page-park))' }}>
          <div className="flex items-center gap-3">
            <img src={dogiLogo} alt="DOGI" className="h-[50px] w-[50px] rounded-xl" />
            <div>
              <h1 className="font-display text-lg font-bold text-white">Park</h1>
              <p className="text-xs text-white/60">Şehrini seç, parkını bul</p>
            </div>
          </div>
        </header>

        <div className="px-4 py-6 space-y-4 relative z-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">📍 Şehir Seç</h2>

          {cityGroups.map((group) => {
            const cityEmoji = group.city === 'İstanbul' ? '🌉' : group.city === 'Muğla' ? '🏖️' : group.city === 'Ankara' ? '🏛️' : '🌊';
            return (
              <button
                key={group.city}
                onClick={() => {
                  setSelectedCity(group.city);
                  setViewState('park-select');
                }}
                className="w-full rounded-2xl border bg-card p-5 text-left transition-all hover:shadow-md active:scale-[0.98]"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{cityEmoji}</span>
                    <div>
                      <h3 className="font-display text-lg font-bold text-foreground">{group.city}</h3>
                      <p className="text-sm text-muted-foreground">
                        {group.activeCount} aktif park · {group.parks.length - group.activeCount > 0 ? `${group.parks.length - group.activeCount} beklemede` : 'Tümü aktif'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </button>
            );
          })}

          {/* Request new park/city */}
          <div className="mt-6 rounded-2xl border-2 border-dashed border-muted-foreground/20 p-5 text-center">
            <Plus className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">Park / Rota eklemek istiyorum</p>
            <p className="mt-1 text-xs text-muted-foreground/60">Yakında daha fazla şehir ve park eklenecek</p>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // VIEW: Park Selection (within a city)
  // ═══════════════════════════════════════════
  if (viewState === 'park-select' && selectedCity) {
    return (
      <div className="relative min-h-screen safe-top safe-bottom" style={{ background: `linear-gradient(180deg, hsl(var(--page-park-light)) 0%, hsl(var(--background)) 30%)` }}>
        <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center opacity-[0.04]">
          <img src={dogiLogo} alt="" className="h-[70vh] w-[70vh] object-contain" />
        </div>

        <header className="sticky top-0 z-40 border-b px-4 py-4" style={{ background: 'hsl(var(--page-park))' }}>
          <div className="flex items-center gap-3">
            <button onClick={handleBackToCity} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-display text-lg font-bold text-white">{selectedCity}</h1>
              <p className="text-xs text-white/60">{currentCityParks.length} park</p>
            </div>
          </div>
        </header>

        <div className="px-4 py-6 space-y-4 relative z-10">
          {/* Active parks */}
          {activeCityParks.length > 0 && (
            <>
              <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--park-active))' }}>
                🟢 Aktif Parklar
              </h2>
              {activeCityParks.map((park) => (
                <button
                  key={park.id}
                  onClick={() => handleSelectPark(park.id)}
                  className={cn(
                    "w-full rounded-2xl border-2 bg-card p-5 text-left transition-all hover:shadow-md active:scale-[0.98]",
                    selectedPark?.id === park.id ? "border-primary ring-2 ring-primary/20" : "border-[hsl(var(--park-active))]/30"
                  )}
                  style={{ boxShadow: 'var(--shadow-card)' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--page-park))]/10">
                        <MapPin className="h-6 w-6" style={{ color: 'hsl(var(--page-park))' }} />
                      </div>
                      <div>
                        <h3 className="font-display text-base font-bold text-foreground">{park.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--park-active))] opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-[hsl(var(--park-active))]"></span>
                          </span>
                          <span className="text-xs text-[hsl(var(--park-active))] font-medium">Aktif</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  {selectedPark?.id === park.id && (
                    <div className="mt-2 rounded-lg bg-primary/10 px-3 py-1.5">
                      <p className="text-xs font-medium text-primary">✓ Şu an bu parktasın</p>
                    </div>
                  )}
                </button>
              ))}
            </>
          )}

          {/* Waitlist parks */}
          {waitlistCityParks.length > 0 && (
            <>
              <h2 className="mt-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                🏗️ Sıradaki Parklar
              </h2>
              {waitlistCityParks.map((park) => {
                const progress = Math.round((park.approval_count || 0) / (park.required_approvals || 10) * 100);
                const hasApproved = userApprovals.has(park.id);
                return (
                  <div key={park.id} className="rounded-2xl border bg-card p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-foreground">{park.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        <Clock className="inline h-3 w-3 mr-1" />Beklemede
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <Users className="h-3 w-3" />{park.approval_count || 0}/{park.required_approvals || 10}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {(park.required_approvals || 10) - (park.approval_count || 0)} kişi daha katılırsa aktif olacak
                    </p>
                    <button
                      onClick={() => handleJoinWaitlist(park.id)}
                      disabled={hasApproved || joiningPark === park.id}
                      className={cn(
                        "mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all",
                        hasApproved ? "bg-primary/10 text-primary" : "bg-primary text-primary-foreground hover:opacity-90"
                      )}>
                      {joiningPark === park.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : hasApproved ? (
                        '✓ Destek Verildi'
                      ) : (
                        <><Users className="h-4 w-4" /> Ben de İstiyorum!</>
                      )}
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // VIEW: Park Detail (active park view)
  // ═══════════════════════════════════════════
  return (
    <div className="relative min-h-screen safe-top safe-bottom" style={{ background: `linear-gradient(180deg, hsl(var(--page-park-light)) 0%, hsl(var(--background)) 30%)` }}>
      <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center opacity-[0.04]">
        <img src={dogiLogo} alt="" className="h-[70vh] w-[70vh] object-contain" />
      </div>

      {/* Expiry Warning */}
      {showExpiryWarning && isCheckedIn && (
        <div className="bg-amber-100 border-b border-amber-300 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800">Playdate {remainingMinutes} dk sonra kapanacak</p>
                <p className="text-xs text-amber-600">Hâlâ parkta mısın?</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={togglePlaydate} className="rounded-lg bg-amber-200 px-3 py-1.5 text-sm font-medium text-amber-800">Kapat</button>
              <button onClick={() => setShowExpiryWarning(false)} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">Evet, Devam</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 border-b px-4 py-4" style={{ background: 'hsl(var(--page-park))' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={handleBackToParks} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-display text-lg font-bold text-white">{selectedPark?.name || 'Park'}</h1>
              {(isCheckedIn || playdateActive) && (
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--park-active))] opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[hsl(var(--park-active))]"></span>
                  </span>
                  <span className="text-[10px] font-semibold text-[hsl(var(--park-active))]">Playdate ON</span>
                </div>
              )}
              {selectedCity && (
                <p className="text-xs text-white/50">{selectedCity}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {myDog && selectedPark && (
              <button
                onClick={togglePlaydate}
                disabled={!hasPhoto && !myDog.photo_url}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
                  playdateActive ? "bg-[hsl(var(--park-active))] text-white" : "bg-[hsl(var(--page-social))] text-white",
                  !hasPhoto && !myDog.photo_url && "opacity-50"
                )}>
                {playdateActive ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
                    </span>
                    Playdate OFF
                  </>
                ) : 'Playdate ON'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Live density indicator */}
      {selectedPark && (
        <div className="mx-4 mt-3 flex items-center gap-3 rounded-xl bg-card border p-3" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--page-park))]/15">
            <img alt="" className="h-7 w-7 object-contain opacity-70" src="/lovable-uploads/7e45b5f6-f37a-450d-92fb-ce8ed1a3372d.png" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-secondary">{totalParkDogCount} köpek parkta</p>
            <p className="text-xs text-muted-foreground">{selectedPark.name} · Canlı.</p>
          </div>
          {parkDogs.length > 0 && (
            <div className="flex -space-x-2">
              {parkDogs.slice(0, 4).map((d) => (
                <img key={d.dog_id} src={d.photo_url} alt="" className="h-7 w-7 rounded-full object-cover ring-2 ring-card" />
              ))}
              {parkDogs.length > 4 && (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary ring-2 ring-card text-[10px] font-bold text-muted-foreground">
                  +{parkDogs.length - 4}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lost Dogs Banner */}
      {selectedPark && parkDogs.filter(d => d.is_lost).length > 0 && (
        <div className="mx-4 mt-3">
          <div className="rounded-2xl border-2 border-destructive bg-destructive/5 p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <h3 className="font-display text-sm font-bold text-destructive">Kayıp ({parkDogs.filter(d => d.is_lost).length})</h3>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {parkDogs.filter(d => d.is_lost).map(dog => (
                <div key={dog.dog_id} className="flex items-center gap-2 rounded-xl bg-card p-2 shrink-0">
                  <img src={dog.photo_url} alt={dog.dog_name} className="h-10 w-10 rounded-lg object-cover ring-2 ring-destructive" />
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">{dog.dog_name}</h4>
                    <p className="text-[10px] text-muted-foreground">{dog.breed_name || 'Karışık'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Who is here now? */}
      <div className="px-4 py-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'hsl(30 50% 35%)' }}>
          PARKTA KİM VAR?
        </h2>

        {!selectedPark ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <img src={parkDogSilhouette} alt="Park köpeği" className="mb-4 h-20 w-20 object-contain opacity-30" />
            <h2 className="mb-2 font-display text-lg font-semibold text-foreground">Park seçilmedi</h2>
            <p className="max-w-[280px] text-sm text-muted-foreground">Önce bir park seçmelisin.</p>
          </div>
        ) : parkDogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <h2 className="mb-2 font-display text-lg font-semibold text-foreground">Park şu an sakin</h2>
            <p className="max-w-[280px] text-sm text-muted-foreground mb-4">
              {myDog && !playdateActive ? 'Parkta playdate? 🎾' : `${myDog?.name}'in varlığını göstermek ister misin?`}
            </p>
            {myDog && !playdateActive && (
              <button onClick={togglePlaydate} disabled={!hasPhoto && !myDog.photo_url}
                className="rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-50">Playdate ON</button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {parkDogs.map((dog) => {
              const isOwnDog = dog.owner_id === profile?.id;
              return (
                <div key={dog.dog_id}
                  className={cn("rounded-2xl border-2 border-sky-200 bg-card p-4", isOwnDog && "border-primary", dog.is_lost && "border-destructive bg-destructive/5")}
                  style={{ boxShadow: 'var(--shadow-card)' }}>
                  {dog.is_lost && (
                    <div className="mb-3 flex items-center gap-2 rounded-lg bg-destructive/20 p-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" /><span className="font-semibold text-destructive">KAYIP</span>
                    </div>
                  )}
                  {dog.owner_name_stub && !isOwnDog && (
                    <div className="mb-2 flex items-center gap-2">
                      {dog.owner_photo_stub ? (
                        <img src={dog.owner_photo_stub} alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-border" />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-1 ring-border">
                          {dog.owner_name_stub[0]}
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground">{dog.owner_name_stub}</span>
                    </div>
                  )}
                  <button
                    className="w-full text-left"
                    onClick={() => {
                      if (!isOwnDog) {
                        setSelectedDogProfile({
                          id: dog.dog_id, name: dog.dog_name, photo_url: dog.photo_url, approximate_age: dog.approximate_age,
                          energy_level: dog.energy_level, neutered: dog.is_neutered, social_style: dog.social_style,
                          triggers: dog.triggers, bio: dog.bio, gender: dog.gender, weight_kg: null,
                          breed: dog.breed_name ? { id: '', name: dog.breed_name, code: '', created_at: '' } : undefined,
                          likes: [], dislikes: [], is_shelter: false,
                          owner: { display_name: dog.owner_name_stub || '', photo_url: dog.owner_photo_stub || null },
                        });
                      }
                    }}
                  >
                    <DogCard
                      dog={{
                        id: dog.dog_id, name: dog.dog_name, photo_url: dog.photo_url, approximate_age: dog.approximate_age,
                        energy_level: dog.energy_level as 1 | 2 | 3 | 4 | 5, daily_energy: dog.daily_energy as 1 | 2 | 3 | 4 | 5 | undefined,
                        neutered: dog.is_neutered, social_style: dog.social_style as any, triggers: dog.triggers, bio: dog.bio,
                        gender: dog.gender as any,
                        breed: dog.breed_name ? { id: '', name: dog.breed_name, code: '', created_at: '' } : undefined,
                        park_checkin_active: true, is_lost: dog.is_lost, owner_id: dog.owner_id, breed_id: '', playdate_on: false
                      } as any}
                      showWaveButton={!isOwnDog && !dog.is_lost}
                      onWave={() => handleWave(dog.dog_id)}
                      hasWaved={wavedDogs.has(dog.dog_id)}
                      isOwnDog={isOwnDog}
                      showFullInfo
                      isLost={dog.is_lost} />
                  </button>
                  {isOwnDog && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-primary font-medium">🟢 Parkta Aktifsin</span>
                        <button onClick={() => navigate('/mydog')} className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground">Düzenle</button>
                      </div>
                    </div>
                  )}
                  {dog.is_lost && dog.emergency_phone && isCheckedIn && (
                    <a href={`tel:${dog.emergency_phone}`} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-destructive py-3 font-semibold text-destructive-foreground">📞 SAHİBİNİ ARA</a>
                  )}
                  {dog.is_lost && !isCheckedIn && (
                    <div className="mt-3 rounded-xl bg-secondary/50 p-3 text-center">
                      <p className="text-sm text-muted-foreground">Telefon numarasını görmek için parka giriş yap</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Group Wave Section */}
      {selectedPark && (
        <div className="px-4 mt-3">
          <GroupWaveSection parkId={selectedPark.id} />
        </div>
      )}

      {/* Bulletin Board */}
      {selectedPark && (
        <div className="px-4 mt-3 pb-6">
          <ParkBulletinBoard />
        </div>
      )}

      <DogProfileModal dog={selectedDogProfile} onClose={() => setSelectedDogProfile(null)} />
    </div>
  );
}
