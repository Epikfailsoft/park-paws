import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DogCard } from '@/components/cards/DogCard';
import { ParkBulletinBoard } from '@/components/social/ParkBulletinBoard';
import { MapPin, Loader2, Timer, AlertTriangle, ChevronDown, Clock, Users, Megaphone } from 'lucide-react';
import { GroupWaveSection } from '@/components/park/GroupWaveSection';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Park as ParkType } from '@/types/dogspace';
import type { ParkDog } from '@/types/dogspace';
import { isParkCheckinActive, getParkCheckinRemainingMinutes, formatTimeRemaining, RATE_LIMITS } from '@/types/dogspace';
import parkDogSilhouette from '@/assets/park-dog-silhouette.png';
import dogiLogo from '@/assets/dogi-logo.png';

export default function Park() {
  const navigate = useNavigate();
  const { profile, dogs, selectedPark, hasPhoto, selectPark, refreshDogs } = useAuth();
  const [parkDogs, setParkDogs] = useState<ParkDog[]>([]);
  const [parks, setParks] = useState<ParkType[]>([]);
  const [waitlistParks, setWaitlistParks] = useState<ParkType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showParkSelect, setShowParkSelect] = useState(false);
  const [remainingMinutes, setRemainingMinutes] = useState(0);
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);
  const [wavedDogs, setWavedDogs] = useState<Set<string>>(new Set());
  const [joiningPark, setJoiningPark] = useState<string | null>(null);
  const [userApprovals, setUserApprovals] = useState<Set<string>>(new Set());

  const myDog = dogs[0];
  const isCheckedIn = myDog && isParkCheckinActive(myDog);

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
    const [activeRes, waitlistRes] = await Promise.all([
      supabase.from('parks').select('*').eq('status', 'ACTIVE').order('name'),
      supabase.from('parks').select('*').eq('status', 'REQUESTED').order('name'),
    ]);
    if (activeRes.data) setParks(activeRes.data as unknown as ParkType[]);
    if (waitlistRes.data) setWaitlistParks(waitlistRes.data as unknown as ParkType[]);
  }, []);

  const fetchUserApprovals = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('park_approvals')
      .select('park_id')
      .eq('user_id', profile.id);
    if (data) setUserApprovals(new Set(data.map(a => a.park_id)));
  }, [profile]);

  const fetchParkDogs = useCallback(async () => {
    if (!selectedPark) return;
    try {
      const { data, error } = await supabase.rpc('get_park_dogs', {
        p_park_id: selectedPark.id,
        p_limit: 50,
      });
      if (error) throw error;
      setParkDogs((data || []) as ParkDog[]);
    } catch (error) {
      console.error('Error fetching park dogs:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPark]);

  const fetchWaveStatus = useCallback(async () => {
    if (!profile || !myDog) return;
    try {
      const { data: wavesData } = await supabase
        .from('waves')
        .select('to_dog_id')
        .eq('from_dog_id', myDog.id);
      if (wavesData) setWavedDogs(new Set(wavesData.map(w => w.to_dog_id)));
    } catch (error) {
      console.error('Error fetching wave status:', error);
    }
  }, [profile, myDog]);

  useEffect(() => {
    fetchParks();
    fetchUserApprovals();
    if (selectedPark) {
      fetchParkDogs();
    } else {
      setLoading(false);
    }
    if (myDog) fetchWaveStatus();
  }, [selectedPark, myDog]);

  const toggleParkCheckin = async () => {
    if (!myDog || !profile || !selectedPark) return;
    if (!hasPhoto && !myDog.photo_url) {
      toast.error('Parkta görünür olmak için önce fotoğraf eklemelisin');
      return;
    }
    try {
      const activate = !isCheckedIn;
      const { data, error } = await supabase.rpc('toggle_park_checkin', {
        p_dog_id: myDog.id, p_park_id: selectedPark.id, p_activate: activate,
      });
      if (error) throw error;
      const result = data as { status: string; message: string };
      if (result.status === 'ERROR') { toast.error(result.message); return; }
      await refreshDogs();
      setShowExpiryWarning(false);
      toast.success(activate ? 'Parka giriş yapıldı! 4 saat sonra otomatik kapanacak.' : 'Parktan çıkış yapıldı.');
      fetchParkDogs();
    } catch (error) {
      console.error('Error toggling park check-in:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const handleWave = async (toDogId: string) => {
    if (!myDog || !profile) return;
    try {
      const { data, error } = await supabase.rpc('send_wave', {
        p_sender_dog_id: myDog.id, p_target_dog_id: toDogId,
      });
      if (error) throw error;
      const result = data as { status: string; message: string };
      if (result.status === 'ERROR') { toast.error(result.message); return; }
      setWavedDogs(prev => new Set([...prev, toDogId]));
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

  const handleSelectPark = async (parkId: string) => {
    await selectPark(parkId);
    setShowParkSelect(false);
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
        park_id: parkId,
        user_id: profile.id,
      });
      if (error) throw error;

      // Update approval count
      const park = waitlistParks.find(p => p.id === parkId);
      if (park) {
        const newCount = (park.approval_count || 0) + 1;
        await supabase.from('parks').update({ approval_count: newCount } as any).eq('id', parkId);
        
        // Check if reached threshold
        if (newCount >= (park.required_approvals || 10)) {
          await supabase.from('parks').update({ status: 'ACTIVE', activated_at: new Date().toISOString() } as any).eq('id', parkId);
          toast.success(`🎉 ${park.name} aktif oldu!`);
        } else {
          toast.success('Desteğin kaydedildi! 🐕');
        }
      }
      
      setUserApprovals(prev => new Set([...prev, parkId]));
      fetchParks();
    } catch (error) {
      console.error('Error joining waitlist:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setJoiningPark(null);
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
    <div className="min-h-screen safe-top safe-bottom" style={{ background: `linear-gradient(180deg, hsl(var(--page-park-light)) 0%, hsl(var(--background)) 30%)` }}>
      {/* Expiry Warning */}
      {showExpiryWarning && isCheckedIn && (
        <div className="bg-amber-100 border-b border-amber-300 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800">Park Check-in {remainingMinutes} dk sonra kapanacak</p>
                <p className="text-xs text-amber-600">Hâlâ parkta mısın?</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={toggleParkCheckin} className="rounded-lg bg-amber-200 px-3 py-1.5 text-sm font-medium text-amber-800">Kapat</button>
              <button onClick={() => setShowExpiryWarning(false)} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">Evet, Devam</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={dogiLogo} alt="DOGI" className="h-[50px] w-[50px] rounded-xl" />
            <div>
              <h1 className="font-display text-lg font-bold text-foreground">Park</h1>
              {isCheckedIn && selectedPark && (
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--park-active))] opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[hsl(var(--park-active))]"></span>
                  </span>
                  <span className="text-[10px] font-semibold text-[hsl(var(--park-active))]">Prime Time</span>
                </div>
              )}
              <button onClick={() => setShowParkSelect(!showParkSelect)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                {selectedPark?.name || 'Park seç'} <ChevronDown className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {myDog && selectedPark && (
              <button
                onClick={toggleParkCheckin}
                disabled={!hasPhoto && !myDog.photo_url}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
                  isCheckedIn ? "bg-[hsl(var(--park-active))] text-white" : "bg-secondary text-secondary-foreground",
                  (!hasPhoto && !myDog.photo_url) && "opacity-50"
                )}
              >
                {isCheckedIn ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
                    </span>
                    {formatTimeRemaining(remainingMinutes)}
                  </>
                ) : 'Giriş Yap'}
              </button>
            )}
          </div>
        </div>

        {/* Park Dropdown */}
        {showParkSelect && (
          <div className="absolute left-4 right-4 top-full mt-2 rounded-xl border bg-card shadow-lg z-50">
            {parks.map(park => (
              <button key={park.id} onClick={() => handleSelectPark(park.id)}
                className={cn("w-full px-4 py-3 text-left text-sm hover:bg-secondary first:rounded-t-xl last:rounded-b-xl",
                  selectedPark?.id === park.id && "bg-primary/10 text-primary font-medium"
                )}>{park.name}</button>
            ))}
            {parks.length === 0 && (
              <div className="px-4 py-3 text-sm text-muted-foreground">Henüz aktif park yok</div>
            )}
          </div>
        )}
      </header>

      {/* Live density indicator */}
      {selectedPark && (
        <div className="mx-4 mt-3 flex items-center gap-3 rounded-xl bg-card border p-3" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--page-park))]/15">
            <img src={parkDogSilhouette} alt="" className="h-7 w-7 object-contain opacity-70" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Şu an {parkDogs.length} köpek parkta</p>
            <p className="text-xs text-muted-foreground">{selectedPark.name} · Canlı veri</p>
          </div>
          {parkDogs.length > 0 && (
            <div className="flex -space-x-2">
              {parkDogs.slice(0, 4).map(d => (
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

      {/* Who is here now? */}
      <div className="px-4 py-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'hsl(30 50% 35%)' }}>
          Şu an parkta kim var?
        </h2>

        {!selectedPark ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <img src={parkDogSilhouette} alt="Park köpeği" className="mb-4 h-20 w-20 object-contain opacity-30" />
            <h2 className="mb-2 font-display text-lg font-semibold text-foreground">Park seçilmedi</h2>
            <p className="max-w-[280px] text-sm text-muted-foreground">Önce bir park seçmelisin.</p>
          </div>
        ) : parkDogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <img src={parkDogSilhouette} alt="Park köpeği" className="mb-4 h-20 w-20 object-contain opacity-30" />
            <h2 className="mb-2 font-display text-lg font-semibold text-foreground">Park şu an sakin</h2>
            <p className="max-w-[280px] text-sm text-muted-foreground mb-4">{myDog?.name}'in varlığını göstermek ister misin?</p>
            {myDog && !isCheckedIn && (
              <button onClick={toggleParkCheckin} disabled={!hasPhoto && !myDog.photo_url}
                className="rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-50">Giriş Yap</button>
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
                  <DogCard
                    dog={{
                      id: dog.dog_id, name: dog.dog_name, photo_url: dog.photo_url, approximate_age: dog.approximate_age,
                      energy_level: dog.energy_level as 1|2|3|4|5, daily_energy: dog.daily_energy as 1|2|3|4|5 | undefined,
                      neutered: dog.is_neutered, social_style: dog.social_style as any, triggers: dog.triggers, bio: dog.bio,
                      gender: dog.gender as any,
                      breed: dog.breed_name ? { id: '', name: dog.breed_name, code: '', created_at: '' } : undefined,
                      park_checkin_active: true, is_lost: dog.is_lost, owner_id: dog.owner_id, breed_id: '', playdate_on: false,
                    } as any}
                    owner={dog.owner_name_stub ? { id: '', user_id: '', display_name: dog.owner_name_stub, photo_url: dog.owner_photo_stub || undefined, created_at: '', updated_at: '' } : undefined}
                    showWaveButton={!isOwnDog && !dog.is_lost}
                    onWave={() => handleWave(dog.dog_id)}
                    hasWaved={wavedDogs.has(dog.dog_id)}
                    isOwnDog={isOwnDog}
                    showFullInfo
                    isLost={dog.is_lost}
                  />
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

      {/* Group Waves */}
      {selectedPark && (
        <div className="px-4 mt-3">
          <GroupWaveSection parkId={selectedPark.id} />
        </div>
      )}

      {/* Bulletin Board */}
      {selectedPark && (
        <div className="px-4 mt-3">
          <ParkBulletinBoard />
        </div>
      )}

      {/* Waitlist Parks */}
      {waitlistParks.length > 0 && (
        <div className="px-4 pb-6">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            🏗️ Sıradaki Parklar
          </h2>
          <div className="space-y-3">
            {waitlistParks.map(park => {
              const progress = Math.round(((park.approval_count || 0) / (park.required_approvals || 10)) * 100);
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
                      hasApproved
                        ? "bg-primary/10 text-primary"
                        : "bg-primary text-primary-foreground hover:opacity-90"
                    )}
                  >
                    {joiningPark === park.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : hasApproved ? (
                      '✓ Destek Verildi'
                    ) : (
                      <>
                        <Users className="h-4 w-4" /> Ben de İstiyorum!
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
