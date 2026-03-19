import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { StatusPulse } from '@/components/profile/StatusPulse';
import { HeroIdentityCard } from '@/components/profile/HeroIdentityCard';
import { CareCenter } from '@/components/profile/CareCenter';
import { ActivityBadges } from '@/components/profile/ActivityBadges';
import { CareVault } from '@/components/profile/CareVault';
import { Dog, LogOut, Settings, Loader2, ChevronRight, Camera, Phone, User, Edit2, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SOCIAL_STYLE_OPTIONS, LIKES_SUGGESTIONS, DISLIKES_SUGGESTIONS, formatOwnerName } from '@/types/dogspace';
import { validateTurkishPhone } from '@/lib/upload-validation';
import { Search } from 'lucide-react';
import dogiLogo from '@/assets/dogi-logo.png';

export default function Profile() {
  const { profile, dogs, selectedPark, signOut, refreshDogs, refreshProfile } = useAuth();
  const navigate = useNavigate();
  
  const myDog = dogs[0];
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parkActivityDays, setParkActivityDays] = useState(0);
  const ownerPhotoRef = useRef<HTMLInputElement>(null);
  const [ownerPhotoLoading, setOwnerPhotoLoading] = useState(false);
  const [ownerName, setOwnerName] = useState(profile?.display_name || '');
  const [ownerLastName, setOwnerLastName] = useState(profile?.last_name || '');
  const [editingOwnerInfo, setEditingOwnerInfo] = useState(false);
  
  // Emergency phone state
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [editingPhone, setEditingPhone] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);

  // Editable fields
  const [name, setName] = useState(myDog?.name || '');
  const [age, setAge] = useState(myDog?.approximate_age || '');
  const [energyLevel, setEnergyLevel] = useState<1 | 2 | 3>((myDog?.energy_level as 1 | 2 | 3) || 2);
  const [socialStyle, setSocialStyle] = useState<'FRIENDLY' | 'NEUTRAL' | 'SELECTIVE' | ''>(myDog?.social_style || '');
  const [likes, setLikes] = useState<string[]>((myDog as any)?.likes || []);
  const [dislikes, setDislikes] = useState<string[]>((myDog as any)?.dislikes || []);
  const [neutered, setNeutered] = useState(myDog?.neutered);
  const [gender, setGender] = useState<string>(myDog?.gender || '');
  const [isShelter, setIsShelter] = useState<boolean>((myDog as any)?.is_shelter || false);
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

  // Fetch emergency phone
  const fetchEmergencyPhone = useCallback(async () => {
    if (!myDog) return;
    try {
      const { data } = await supabase
        .from('dog_private')
        .select('emergency_phone')
        .eq('dog_id', myDog.id)
        .single();
      if (data?.emergency_phone) setEmergencyPhone(data.emergency_phone);
    } catch {
      // Try dog_lost_profile
      try {
        const { data } = await supabase
          .from('dog_lost_profile')
          .select('emergency_phone')
          .eq('dog_id', myDog.id)
          .single();
        if (data?.emergency_phone) setEmergencyPhone(data.emergency_phone);
      } catch { /* no phone */ }
    }
  }, [myDog]);

  useEffect(() => { fetchEmergencyPhone(); }, [fetchEmergencyPhone]);

  const handleLogout = async () => { await signOut(); navigate('/auth'); };

  const handleSave = async () => {
    if (!myDog) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('dogs').update({
        name, approximate_age: age, energy_level: energyLevel,
        social_style: socialStyle || null as 'FRIENDLY' | 'NEUTRAL' | 'SELECTIVE' | null,
        likes: likes.length > 0 ? likes : null, dislikes: dislikes.length > 0 ? dislikes : null,
        neutered, bio: bio.trim() || null, breed_id: selectedBreedId || undefined,
        gender: gender || null, is_shelter: isShelter,
      } as any).eq('id', myDog.id);
      if (error) throw error;
      await refreshDogs();
      setEditing(false);
      toast.success('Profil güncellendi!');
    } catch (error) { console.error('Error updating profile:', error); toast.error('Bir hata oluştu'); }
    finally { setLoading(false); }
  };

  const handleOwnerPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setOwnerPhotoLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `owner/${profile.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('dog-photos').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('dog-photos').getPublicUrl(fileName);
      await supabase.from('profiles').update({ photo_url: publicUrl } as any).eq('id', profile.id);
      await refreshProfile();
      toast.success('Fotoğraf güncellendi!');
    } catch (err) { console.error(err); toast.error('Hata oluştu'); }
    finally { setOwnerPhotoLoading(false); }
  };

  const handleSaveOwnerInfo = async () => {
    if (!profile || !ownerName.trim()) return;
    try {
      await supabase.from('profiles').update({ display_name: ownerName.trim(), last_name: ownerLastName.trim() || null } as any).eq('id', profile.id);
      await refreshProfile();
      setEditingOwnerInfo(false);
      toast.success('Sahip bilgileri güncellendi!');
    } catch (err) { console.error(err); toast.error('Hata oluştu'); }
  };

  const handleSavePhone = async () => {
    if (!myDog) return;
    const validation = validateTurkishPhone(emergencyPhone);
    if (!validation.valid) { toast.error(validation.error || 'Geçersiz telefon numarası'); return; }
    setSavingPhone(true);
    try {
      await supabase.from('dog_private').upsert({ dog_id: myDog.id, emergency_phone: emergencyPhone } as any, { onConflict: 'dog_id' });
      await supabase.from('dog_lost_profile').upsert({ dog_id: myDog.id, emergency_phone: emergencyPhone } as any, { onConflict: 'dog_id' });
      setEditingPhone(false);
      toast.success('Telefon numarası güncellendi!');
    } catch (err) { console.error(err); toast.error('Hata oluştu'); }
    finally { setSavingPhone(false); }
  };

  if (!myDog) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="relative min-h-screen safe-top safe-bottom" style={{ background: `linear-gradient(180deg, hsl(var(--page-profile-light)) 0%, hsl(var(--background)) 30%)` }}>
      {/* Background watermark logo */}
      <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center opacity-[0.04]">
        <img src={dogiLogo} alt="" className="h-[70vh] w-[70vh] object-contain" />
      </div>
      {myDog.is_lost && (
        <div className="bg-destructive text-destructive-foreground p-3 text-center">
          <p className="font-semibold">🆘 KAYIP MODU AKTİF</p>
          <p className="text-sm opacity-90">Parkta aktif kullanıcılar telefon numaranı görebilir</p>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b px-4 py-4" style={{ background: 'hsl(var(--page-profile))' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={dogiLogo} alt="DOGI" className="h-[50px] w-[50px] rounded-xl" />
            <div>
              <h1 className="font-display text-lg font-extrabold text-white">Köpeğim</h1>
              <p className="text-xs text-white/70 font-medium">{profile ? formatOwnerName(profile.display_name, profile.last_name) : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Lost Mode Switch */}
            <button
              onClick={() => {
                const el = document.getElementById('status-pulse-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
                myDog.is_lost
                  ? "bg-white text-purple-600"
                  : "bg-purple-500 text-white border border-purple-400"
              )}
            >
              {myDog.is_lost ? (
                <>
                  <ToggleRight className="h-5 w-5" />
                  Kayıp ON
                </>
              ) : (
                <>
                  <ToggleLeft className="h-5 w-5" />
                  Kayıp Modu
                </>
              )}
            </button>
            <button onClick={() => setEditing(!editing)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white hover:bg-white/30 transition-all">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <HeroIdentityCard dog={myDog} profile={profile!} onRefresh={refreshDogs} />

      <div className="px-4 pb-4 space-y-4">
        {editing ? (
          <div className="section-card space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Ad</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="dogspace-input w-full" />
            </div>

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

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Enerji Seviyesi</label>
              <div className="flex justify-between gap-2">
                {([1, 2, 3] as const).map((level) => (
                  <button key={level} type="button" onClick={() => setEnergyLevel(level)}
                    className={cn("flex-1 rounded-xl border-2 py-2.5 text-sm font-medium transition-all",
                      energyLevel === level ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
                    )}>{level === 1 ? '🐢 Sakin' : level === 2 ? '🐕 Normal' : '⚡ Enerjik'}</button>
                ))}
              </div>
            </div>

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

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">💚 Sevdikleri</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {likes.map(tag => (<button key={tag} type="button" onClick={() => setLikes(prev => prev.filter(t => t !== tag))} className="rounded-full bg-primary/15 px-3 py-1 text-sm text-primary hover:bg-primary/25 transition-all">{tag} ✕</button>))}
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

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">❌ Sevmedikleri</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {dislikes.map(tag => (<button key={tag} type="button" onClick={() => setDislikes(prev => prev.filter(t => t !== tag))} className="rounded-full bg-destructive/15 px-3 py-1 text-sm text-destructive hover:bg-destructive/25 transition-all">{tag} ✕</button>))}
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

            {/* Gender */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Cinsiyet</label>
              <div className="flex gap-2">
                {[
                  { value: 'female', label: '♀ Dişi', color: 'hsl(330, 60%, 50%)' },
                  { value: 'male', label: '♂ Erkek', color: 'hsl(210, 60%, 50%)' },
                ].map(g => (
                  <button key={g.value} type="button" onClick={() => setGender(gender === g.value ? '' : g.value)}
                    className={cn("flex-1 rounded-xl border-2 py-2.5 text-sm font-medium transition-all",
                      gender === g.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
                    )}>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-secondary p-4">
              <span className="text-sm font-medium text-foreground">Kısırlaştırıldı mı?</span>
              <button type="button" onClick={() => setNeutered(!neutered)}
                className={cn("rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                  neutered ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>{neutered ? "Evet" : "Hayır"}</button>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-secondary p-4">
              <span className="text-sm font-medium text-foreground">🏠 Barınaktan mı?</span>
              <button type="button" onClick={() => setIsShelter(!isShelter)}
                className={cn("rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                  isShelter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>{isShelter ? "Evet" : "Hayır"}</button>
            </div>

            <button onClick={handleSave} disabled={loading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 shadow-lg"
              style={{ background: 'var(--gradient-accent)', boxShadow: 'var(--shadow-glow-accent)' }}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Kaydet'}
            </button>
          </div>
        ) : (
          <>
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
                  <div className="mt-2 flex flex-wrap gap-2">{(myDog as any).likes.map((t: string) => (<span key={t} className="tag-like">{t}</span>))}</div>
                </div>
              )}

              {(myDog as any).dislikes?.length > 0 && (
                <div className="section-card">
                  <span className="text-sm font-medium text-muted-foreground">❌ Sevmedikleri</span>
                  <div className="mt-2 flex flex-wrap gap-2">{(myDog as any).dislikes.map((t: string) => (<span key={t} className="tag-dislike">{t}</span>))}</div>
                </div>
              )}
            </div>

            <CareCenter dogId={myDog.id} parkActivityDays={parkActivityDays} />
            <ActivityBadges dogId={myDog.id} profileId={profile!.id} onActivityDays={setParkActivityDays} />
            <CareVault dogId={myDog.id} profileId={profile!.id} />

            {/* Owner Profile with Phone */}
            {profile && (
              <div className="section-card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-secondary"><User className="h-3.5 w-3.5 text-muted-foreground" /></span>
                    Sahip Bilgileri
                  </h3>
                  {!editingOwnerInfo && (
                    <button onClick={() => { setOwnerName(profile.display_name); setOwnerLastName(profile.last_name || ''); setEditingOwnerInfo(true); }}
                      className="flex items-center gap-1 text-xs text-primary font-medium"><Edit2 className="h-3 w-3" /> Düzenle</button>
                  )}
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    <input ref={ownerPhotoRef} type="file" accept="image/*" className="hidden" onChange={handleOwnerPhotoUpload} />
                    {profile.photo_url ? (
                      <img src={profile.photo_url} alt="" className="h-14 w-14 rounded-xl object-cover ring-2 ring-primary/20 shadow-md" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl text-lg font-bold text-white shadow-md" style={{ background: 'var(--gradient-hero)' }}>
                        {profile.display_name?.[0]}
                      </div>
                    )}
                    <button onClick={() => ownerPhotoRef.current?.click()} disabled={ownerPhotoLoading}
                      className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-md">
                      {ownerPhotoLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                    </button>
                  </div>

                  <div className="flex-1">
                    {editingOwnerInfo ? (
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-muted-foreground mb-0.5 block">Ad</label>
                          <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="dogspace-input w-full text-sm py-1.5" placeholder="Adınız" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-0.5 block">Soyad</label>
                          <input type="text" value={ownerLastName} onChange={(e) => setOwnerLastName(e.target.value)} className="dogspace-input w-full text-sm py-1.5" placeholder="Soyadınız" />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => setEditingOwnerInfo(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">İptal</button>
                          <button onClick={handleSaveOwnerInfo} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Kaydet</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-foreground">{formatOwnerName(profile.display_name, profile.last_name)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Düzenlemek için sağ üstteki ikona dokun</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Emergency Phone */}
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Acil Telefon</span>
                    </div>
                    {!editingPhone && (
                      <button onClick={() => setEditingPhone(true)} className="text-xs text-primary font-medium">Düzenle</button>
                    )}
                  </div>
                  {editingPhone ? (
                    <div className="mt-2 flex gap-2">
                      <input type="tel" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)}
                        placeholder="+905XXXXXXXXX" className="dogspace-input flex-1 text-sm py-1.5" />
                      <button onClick={() => setEditingPhone(false)} className="rounded-lg border border-border px-2 py-1.5 text-xs text-muted-foreground">İptal</button>
                      <button onClick={handleSavePhone} disabled={savingPhone}
                        className="rounded-lg bg-primary px-2 py-1.5 text-xs text-primary-foreground disabled:opacity-50">
                        {savingPhone ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Kaydet'}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm font-medium text-foreground">{emergencyPhone || 'Henüz eklenmedi'}</p>
                  )}
                </div>
              </div>
            )}

            {/* Status Control - At Bottom */}
            <div id="status-pulse-section">
              <StatusPulse dog={myDog} selectedPark={selectedPark} onRefresh={refreshDogs} />
            </div>

            {/* Settings & Logout */}
            <div className="border-t border-border pt-4 space-y-2">
              <button onClick={() => setEditing(true)}
                className="flex w-full items-center justify-between rounded-xl bg-secondary/50 p-4 text-left transition-all hover:bg-secondary">
                <div className="flex items-center gap-3"><Settings className="h-5 w-5 text-muted-foreground" /><span className="text-sm font-medium text-foreground">Ayarlar</span></div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
              <button onClick={handleLogout}
                className="flex w-full items-center justify-between rounded-xl bg-destructive/10 p-4 text-left transition-all hover:bg-destructive/15">
                <div className="flex items-center gap-3"><LogOut className="h-5 w-5 text-destructive" /><span className="text-sm font-medium text-destructive">Çıkış Yap</span></div>
                <ChevronRight className="h-5 w-5 text-destructive/50" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
