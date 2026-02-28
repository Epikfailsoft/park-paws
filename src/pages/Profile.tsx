import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { StatusPulse } from '@/components/profile/StatusPulse';
import { HeroIdentityCard } from '@/components/profile/HeroIdentityCard';
import { CareCenter } from '@/components/profile/CareCenter';
import { ActivityBadges } from '@/components/profile/ActivityBadges';
import { CareVault } from '@/components/profile/CareVault';
import { Dog, LogOut, Settings, Loader2, ChevronRight, AlertTriangle, Phone, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SOCIAL_STYLE_OPTIONS, LIKES_SUGGESTIONS, DISLIKES_SUGGESTIONS, formatOwnerName } from '@/types/dogspace';
import { validateTurkishPhone } from '@/lib/upload-validation';

export default function Profile() {
  const { profile, dogs, selectedPark, signOut, refreshDogs } = useAuth();
  const navigate = useNavigate();
  
  const myDog = dogs[0];
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [parkActivityDays, setParkActivityDays] = useState(0);

  // Editable fields
  const [name, setName] = useState(myDog?.name || '');
  const [age, setAge] = useState(myDog?.approximate_age || '');
  const [energyLevel, setEnergyLevel] = useState<1 | 2 | 3>((myDog?.energy_level as 1 | 2 | 3) || 2);
  const [socialStyle, setSocialStyle] = useState<'FRIENDLY' | 'NEUTRAL' | 'SELECTIVE' | ''>(myDog?.social_style || '');
  const [likes, setLikes] = useState<string[]>((myDog as any)?.likes || []);
  const [dislikes, setDislikes] = useState<string[]>((myDog as any)?.dislikes || []);
  const [neutered, setNeutered] = useState(myDog?.neutered);
  const [bio, setBio] = useState((myDog as any)?.bio || '');
  const [likeInput, setLikeInput] = useState('');
  const [dislikeInput, setDislikeInput] = useState('');
  
  // Breed editing
  const [breeds, setBreeds] = useState<{ id: string; name: string; code: string }[]>([]);
  const [selectedBreedId, setSelectedBreedId] = useState(myDog?.breed_id || '');
  const [showBreedDropdown, setShowBreedDropdown] = useState(false);
  const [breedSearch, setBreedSearch] = useState('');

  useEffect(() => {
    supabase.from('breeds').select('id, name, code').order('name').then(({ data }) => {
      if (data) setBreeds(data);
    });
  }, []);

  // Lost mode fields
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleSave = async () => {
    if (!myDog) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('dogs')
        .update({
          name,
          approximate_age: age,
          energy_level: energyLevel,
          social_style: socialStyle || null as 'FRIENDLY' | 'NEUTRAL' | 'SELECTIVE' | null,
          likes: likes.length > 0 ? likes : null,
          dislikes: dislikes.length > 0 ? dislikes : null,
          neutered,
          bio: bio.trim() || null,
          breed_id: selectedBreedId || undefined,
        } as any)
        .eq('id', myDog.id);

      if (error) throw error;
      await refreshDogs();
      setEditing(false);
      toast.success('Profil güncellendi!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleLostMode = async () => {
    if (!myDog) return;
    const newLostState = !myDog.is_lost;
    if (newLostState) {
      const phoneValidation = validateTurkishPhone(emergencyPhone);
      if (!phoneValidation.valid) {
        setPhoneError(phoneValidation.error || 'Geçersiz telefon numarası');
        return;
      }
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('toggle_lost_mode', {
        p_dog_id: myDog.id,
        p_enable: newLostState,
        p_emergency_phone: newLostState ? emergencyPhone : undefined,
        p_last_seen_park_id: newLostState && selectedPark ? selectedPark.id : undefined,
      });
      if (error) throw error;
      const result = data as { status: string; message: string };
      if (result.status === 'ERROR') { toast.error(result.message); return; }
      await refreshDogs();
      setShowLostModal(false);
      setEmergencyPhone('');
      setPhoneError('');
      toast.success(newLostState ? 'Kayıp modu aktif!' : 'Kayıp modu kapatıldı.');
    } catch (error) {
      console.error('Error toggling lost mode:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (!myDog) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-top safe-bottom">
      {/* Lost Mode Banner */}
      {myDog.is_lost && (
        <div className="bg-destructive text-destructive-foreground p-3 text-center">
          <p className="font-semibold">🆘 KAYIP MODU AKTİF</p>
          <p className="text-sm opacity-90">Parkta aktif kullanıcılar telefon numaranı görebilir</p>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md"
              style={{ background: 'var(--gradient-accent)' }}>
              <Dog className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-lg font-extrabold text-foreground">Köpeğim</h1>
              <p className="text-xs text-muted-foreground font-medium">
                {profile ? formatOwnerName(profile.display_name, profile.last_name) : ''}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(!editing)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all">
              <Settings className="h-5 w-5" />
            </button>
            <button onClick={handleLogout} className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* 1️⃣ HERO & IDENTITY CARD */}
      <HeroIdentityCard dog={myDog} profile={profile!} onRefresh={refreshDogs} />

      <div className="px-4 pb-4 space-y-4">
        {editing ? (
          /* EDIT MODE */
          <div className="section-card space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Ad</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="dogspace-input w-full" />
            </div>

            {/* Breed Selection */}
            <div className="relative">
              <label className="mb-1.5 block text-sm font-medium text-foreground">Irk</label>
              <button type="button" onClick={() => setShowBreedDropdown(!showBreedDropdown)} className="dogspace-input w-full text-left flex items-center justify-between">
                <span className="text-foreground">{breeds.find(b => b.id === selectedBreedId)?.name || myDog?.breed?.name || 'Irk seçin'}</span>
                <Search className="h-4 w-4 text-muted-foreground" />
              </button>
              {showBreedDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg max-h-64 overflow-hidden z-50">
                  <div className="p-2 border-b border-border">
                    <input type="text" placeholder="Ara..." value={breedSearch} onChange={(e) => setBreedSearch(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border text-sm" autoFocus />
                  </div>
                  <div className="overflow-y-auto max-h-48">
                    {breeds.filter(b => b.name.toLowerCase().includes(breedSearch.toLowerCase())).map(breed => (
                      <button key={breed.id} type="button"
                        onClick={() => { setSelectedBreedId(breed.id); setShowBreedDropdown(false); setBreedSearch(''); }}
                        className={cn("w-full text-left px-4 py-3 hover:bg-secondary/50 text-sm", breed.id === selectedBreedId && "bg-primary/10 text-primary font-medium")}
                      >{breed.name}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Bio <span className="text-muted-foreground font-normal">(max 150)</span></label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 150))} placeholder="Köpeğini kısaca tanıt..." rows={2} className="dogspace-input w-full resize-none" />
              <p className="mt-1 text-xs text-muted-foreground text-right">{bio.length}/150</p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Yaş</label>
              <input type="text" value={age} onChange={(e) => setAge(e.target.value)} className="dogspace-input w-full" />
            </div>

            {/* Energy Level */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Enerji Seviyesi</label>
              <div className="flex justify-between gap-2">
                {([1, 2, 3] as const).map((level) => (
                  <button key={level} type="button" onClick={() => setEnergyLevel(level)}
                    className={cn("flex-1 rounded-xl border-2 py-2.5 text-sm font-medium transition-all",
                      energyLevel === level ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
                    )}>
                    {level === 1 ? '🐢 Sakin' : level === 2 ? '🐕 Normal' : '⚡ Enerjik'}
                  </button>
                ))}
              </div>
            </div>

            {/* Social Style */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Sosyal Tarz</label>
              <div className="flex flex-wrap gap-2">
                {SOCIAL_STYLE_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setSocialStyle(socialStyle === opt.value ? '' : opt.value)}
                    className={cn("rounded-full border-2 px-4 py-2 text-sm font-medium transition-all",
                      socialStyle === opt.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
                    )}>{opt.label}</button>
                ))}
              </div>
            </div>

            {/* Likes */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">💚 Sevdikleri</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {likes.map(tag => (
                  <button key={tag} type="button" onClick={() => setLikes(prev => prev.filter(t => t !== tag))} className="rounded-full bg-primary/15 px-3 py-1 text-sm text-primary hover:bg-primary/25 transition-all">{tag} ✕</button>
                ))}
              </div>
              <input type="text" value={likeInput}
                onChange={(e) => setLikeInput(e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`)}
                onKeyDown={(e) => { if (e.key === 'Enter' && likeInput.trim().length > 1) { e.preventDefault(); if (!likes.includes(likeInput.trim())) setLikes(prev => [...prev, likeInput.trim()]); setLikeInput(''); } }}
                placeholder="#top, #koşmak..." className="dogspace-input w-full text-sm" />
              <div className="mt-2 flex flex-wrap gap-1">
                {LIKES_SUGGESTIONS.filter(s => !likes.includes(s)).slice(0, 6).map(s => (
                  <button key={s} type="button" onClick={() => setLikes(prev => [...prev, s])} className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-secondary transition-all">{s}</button>
                ))}
              </div>
            </div>

            {/* Dislikes */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">❌ Sevmedikleri</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {dislikes.map(tag => (
                  <button key={tag} type="button" onClick={() => setDislikes(prev => prev.filter(t => t !== tag))} className="rounded-full bg-destructive/15 px-3 py-1 text-sm text-destructive hover:bg-destructive/25 transition-all">{tag} ✕</button>
                ))}
              </div>
              <input type="text" value={dislikeInput}
                onChange={(e) => setDislikeInput(e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`)}
                onKeyDown={(e) => { if (e.key === 'Enter' && dislikeInput.trim().length > 1) { e.preventDefault(); if (!dislikes.includes(dislikeInput.trim())) setDislikes(prev => [...prev, dislikeInput.trim()]); setDislikeInput(''); } }}
                placeholder="#gürültü, #kedi..." className="dogspace-input w-full text-sm" />
              <div className="mt-2 flex flex-wrap gap-1">
                {DISLIKES_SUGGESTIONS.filter(s => !dislikes.includes(s)).slice(0, 6).map(s => (
                  <button key={s} type="button" onClick={() => setDislikes(prev => [...prev, s])} className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-secondary transition-all">{s}</button>
                ))}
              </div>
            </div>

            {/* Neutered */}
            <div className="flex items-center justify-between rounded-xl bg-secondary p-4">
              <span className="text-sm font-medium text-foreground">Kısırlaştırıldı mı?</span>
              <button type="button" onClick={() => setNeutered(!neutered)}
                className={cn("rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                  neutered ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>{neutered ? "Evet" : "Hayır"}</button>
            </div>

            <button onClick={handleSave} disabled={loading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 shadow-lg"
              style={{ background: 'var(--gradient-accent)', boxShadow: 'var(--shadow-glow-accent)' }}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Kaydet'}
            </button>
          </div>
        ) : (
          <>
            {/* Dog info cards */}
            <div className="space-y-3">
              {myDog.neutered !== undefined && (
                <div className="flex justify-center">
                  <span className={cn("rounded-full px-4 py-2 text-sm font-semibold", myDog.neutered ? "text-white shadow-md" : "bg-muted text-muted-foreground")}
                    style={myDog.neutered ? { background: 'var(--gradient-hero)' } : {}}>
                    {myDog.neutered ? '✓ Kısırlaştırıldı' : 'Kısırlaştırılmadı'}
                  </span>
                </div>
              )}

              {myDog.social_style && (
                <div className="section-card flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Sosyal Tarz</span>
                  <span className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-secondary-foreground">{SOCIAL_STYLE_OPTIONS.find(o => o.value === myDog.social_style)?.label}</span>
                </div>
              )}

              {(myDog as any).likes?.length > 0 && (
                <div className="section-card">
                  <span className="text-sm font-medium text-muted-foreground">💚 Sevdikleri</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(myDog as any).likes.map((t: string) => (
                      <span key={t} className="tag-like">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {(myDog as any).dislikes?.length > 0 && (
                <div className="section-card">
                  <span className="text-sm font-medium text-muted-foreground">❌ Sevmedikleri</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(myDog as any).dislikes.map((t: string) => (
                      <span key={t} className="tag-dislike">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2️⃣ STATUS CONTROL PANEL */}
            <StatusPulse dog={myDog} selectedPark={selectedPark} onRefresh={refreshDogs} />

            {/* 3️⃣ CARE CENTER */}
            <CareCenter dogId={myDog.id} parkActivityDays={parkActivityDays} />

            {/* 4️⃣ ACTIVITY & BADGES */}
            <ActivityBadges dogId={myDog.id} profileId={profile!.id} onActivityDays={setParkActivityDays} />

            {/* 5️⃣ SAFETY & DOCUMENT VAULT */}
            <CareVault dogId={myDog.id} profileId={profile!.id} />

            {/* Edit prompt */}
            <button onClick={() => setEditing(true)}
              className="flex w-full items-center justify-between rounded-xl bg-secondary/50 p-4 text-left transition-all hover:bg-secondary">
              <span className="text-sm text-muted-foreground">Profili düzenle</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </>
        )}

        {/* 6️⃣ MINIMAL OWNER PROFILE */}
        {!editing && profile && (
          <div className="section-card">
            <h3 className="font-display text-sm font-bold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-secondary">👤</span>
              Sahip
            </h3>
            <div className="flex items-center gap-3">
              {profile.photo_url ? (
                <img src={profile.photo_url} alt="" className="h-12 w-12 rounded-xl object-cover ring-2 ring-primary/20 shadow-md" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white shadow-md"
                  style={{ background: 'var(--gradient-hero)' }}>
                  {profile.display_name?.[0]}
                </div>
              )}
              <div>
                <p className="font-semibold text-foreground">{formatOwnerName(profile.display_name, profile.last_name)}</p>
                <p className="text-xs text-muted-foreground">Acil durumlarda görünür</p>
              </div>
            </div>
          </div>
        )}

        {/* LOST MODE (Emergency Protocol) */}
        <div className="border-t border-border pt-4">
          <button onClick={() => setShowLostModal(true)}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl border-2 py-3 font-semibold transition-all",
              myDog.is_lost
                ? "border-destructive bg-destructive text-destructive-foreground"
                : "border-destructive text-destructive hover:bg-destructive/10"
            )}>
            <AlertTriangle className="h-5 w-5" />
            {myDog.is_lost ? 'KAYIP MODU KAPAT' : 'KAYIP MODU AKTİF ET'}
          </button>
        </div>
      </div>

      {/* Lost Mode Modal */}
      {showLostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
          <div className="max-w-sm w-full rounded-2xl bg-card p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">
              {myDog.is_lost ? '🆘 Kayıp Modu Kapat' : '⚠️ Kayıp Modu'}
            </h2>
            {myDog.is_lost ? (
              <p className="text-muted-foreground mb-6">Kayıp modu kapatılsın mı? Telefon numaran artık görünmeyecek.</p>
            ) : (
              <div className="space-y-4 mb-6">
                <p className="text-muted-foreground">Kayıp modu aktif edilsin mi? Telefon numarası yalnızca parkta aktif olanlara açılacaktır.</p>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    <Phone className="inline h-4 w-4 mr-1" />
                    Acil Telefon Numarası
                  </label>
                  <input type="tel" placeholder="+905XXXXXXXXX veya 05XXXXXXXXX" value={emergencyPhone}
                    onChange={(e) => { setEmergencyPhone(e.target.value); setPhoneError(''); }} className="dogspace-input w-full" />
                  {phoneError && <p className="mt-1 text-sm text-destructive">{phoneError}</p>}
                </div>
                {selectedPark && (
                  <div className="rounded-lg bg-secondary/50 p-3">
                    <p className="text-xs text-muted-foreground">Son görüldüğü park: <span className="font-medium text-foreground">{selectedPark.name}</span></p>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setShowLostModal(false); setPhoneError(''); setEmergencyPhone(''); }}
                className="flex-1 rounded-xl border border-border py-3 font-medium text-foreground">İptal</button>
              <button onClick={handleLostMode} disabled={loading || (!myDog.is_lost && !emergencyPhone.trim())}
                className={cn("flex-1 rounded-xl py-3 font-semibold disabled:opacity-50",
                  myDog.is_lost ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"
                )}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : myDog.is_lost ? 'Kapat' : 'Aktif Et'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
