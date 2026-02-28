import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { EnergyIndicator } from '@/components/ui/EnergyIndicator';
import { StatusPulse } from '@/components/profile/StatusPulse';
import { Dog, Camera, LogOut, Settings, Loader2, ChevronRight, AlertTriangle, Phone, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SOCIAL_STYLE_OPTIONS, LIKES_SUGGESTIONS, DISLIKES_SUGGESTIONS, formatOwnerName } from '@/types/dogspace';
import { validateTurkishPhone } from '@/lib/upload-validation';

export default function Profile() {
  const { profile, dogs, selectedPark, signOut, refreshDogs } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const myDog = dogs[0];
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);

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

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile || !myDog) return;

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('dog-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('dog-photos')
        .getPublicUrl(fileName);

      await supabase
        .from('dogs')
        .update({ photo_url: publicUrl })
        .eq('id', myDog.id);

      await refreshDogs();
      toast.success('Fotoğraf güncellendi!');
    } catch (error) {
      console.error('Error updating photo:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
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

    // Validate phone when activating
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
      if (result.status === 'ERROR') {
        toast.error(result.message);
        return;
      }

      await refreshDogs();
      setShowLostModal(false);
      setEmergencyPhone('');
      setPhoneError('');

      if (newLostState) {
        toast.success('Kayıp modu aktif! Yakındaki kullanıcılar bilgilendirilecek.');
      } else {
        toast.info('Kayıp modu kapatıldı.');
      }
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
        <div className="bg-[hsl(var(--energy-5))] text-white p-3 text-center">
          <p className="font-semibold">🆘 LOST MODE AKTİF</p>
          <p className="text-sm opacity-90">Parkta aktif kullanıcılar telefon numaranı görebilir</p>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Dog className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-foreground">
                Köpeğim
              </h1>
              <p className="text-xs text-muted-foreground">
                {profile ? formatOwnerName(profile.display_name, profile.last_name) : ''}'ın profili
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(!editing)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground"
            >
              <Settings className="h-5 w-5" />
            </button>
            <button
              onClick={handleLogout}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Owner & Dog Photo Section */}
      <div className="px-4 pt-6">
        <div className="flex items-start justify-center gap-6">
          {/* Owner Photo */}
          <div className="flex flex-col items-center">
            <div className="relative">
              {profile?.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt={profile.display_name}
                  className="h-16 w-16 rounded-2xl object-cover ring-2 ring-border"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-xl font-medium text-muted-foreground ring-2 ring-border">
                  {profile?.display_name?.[0] || '?'}
                </div>
              )}
            </div>
            <span className="mt-1.5 text-xs text-muted-foreground">Sahip</span>
          </div>

          {/* Dog Photo */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <img
                src={myDog.photo_url}
                alt={myDog.name}
                className={cn(
                  "h-28 w-28 rounded-3xl object-cover shadow-elevated",
                  myDog.is_lost && "ring-4 ring-[hsl(var(--energy-5))]"
                )}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <span className="mt-1.5 text-xs text-muted-foreground">Köpek</span>
          </div>
        </div>
      </div>

      {/* Dog Info */}
      <div className="px-4 pt-6 pb-4 space-y-4">
        {editing ? (
          <div className="space-y-4 rounded-2xl bg-card p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Ad</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="dogspace-input w-full" />
            </div>

            {/* Breed Selection */}
            <div className="relative">
              <label className="mb-1.5 block text-sm font-medium text-foreground">Irk</label>
              <button
                type="button"
                onClick={() => setShowBreedDropdown(!showBreedDropdown)}
                className="dogspace-input w-full text-left flex items-center justify-between"
              >
                <span className="text-foreground">
                  {breeds.find(b => b.id === selectedBreedId)?.name || myDog?.breed?.name || 'Irk seçin'}
                </span>
                <Search className="h-4 w-4 text-muted-foreground" />
              </button>
              {showBreedDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg max-h-64 overflow-hidden z-50">
                  <div className="p-2 border-b border-border">
                    <input
                      type="text"
                      placeholder="Ara..."
                      value={breedSearch}
                      onChange={(e) => setBreedSearch(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto max-h-48">
                    {breeds.filter(b => b.name.toLowerCase().includes(breedSearch.toLowerCase())).map(breed => (
                      <button
                        key={breed.id}
                        type="button"
                        onClick={() => {
                          setSelectedBreedId(breed.id);
                          setShowBreedDropdown(false);
                          setBreedSearch('');
                        }}
                        className={cn(
                          "w-full text-left px-4 py-3 hover:bg-secondary/50 text-sm",
                          breed.id === selectedBreedId && "bg-primary/10 text-primary font-medium"
                        )}
                      >
                        {breed.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bio */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Bio <span className="text-muted-foreground font-normal">(max 150 karakter)</span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 150))}
                placeholder="Köpeğini kısaca tanıt..."
                rows={2}
                className="dogspace-input w-full resize-none"
              />
              <p className="mt-1 text-xs text-muted-foreground text-right">{bio.length}/150</p>
            </div>

            {/* Age */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Yaş</label>
              <input type="text" value={age} onChange={(e) => setAge(e.target.value)} className="dogspace-input w-full" />
            </div>

            {/* Energy Level */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Enerji Seviyesi</label>
              <div className="flex justify-between gap-2">
                {([1, 2, 3, 4, 5] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setEnergyLevel(level)}
                    className={cn(
                      "flex-1 rounded-xl border-2 py-2.5 text-sm font-medium transition-all",
                      energyLevel === level
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Social Style */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Sosyal Tarz</label>
              <div className="flex flex-wrap gap-2">
                {SOCIAL_STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSocialStyle(socialStyle === opt.value ? '' : opt.value)}
                    className={cn(
                      "rounded-full border-2 px-4 py-2 text-sm font-medium transition-all",
                      socialStyle === opt.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Triggers */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Tetikleyiciler (Hassasiyetler)</label>
              <div className="flex flex-wrap gap-2">
                {TRIGGER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setTriggers(prev => 
                        prev.includes(opt.value) 
                          ? prev.filter(t => t !== opt.value)
                          : [...prev, opt.value]
                      );
                    }}
                    className={cn(
                      "rounded-full border-2 px-4 py-2 text-sm font-medium transition-all",
                      triggers.includes(opt.value)
                        ? "border-[hsl(var(--energy-5))] bg-[hsl(var(--energy-5))]/10 text-[hsl(var(--energy-5))]"
                        : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Bu bilgiler güvenli playdate için kullanılır</p>
            </div>

            {/* Neutered */}
            <div className="flex items-center justify-between rounded-xl bg-secondary p-4">
              <span className="text-sm font-medium text-foreground">Kısırlaştırıldı mı?</span>
              <button
                type="button"
                onClick={() => setNeutered(!neutered)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                  neutered ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                {neutered ? "Evet" : "Hayır"}
              </button>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={loading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 font-medium text-accent-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Kaydet'}
            </button>
          </div>
        ) : (
          <>
            {/* Basic Info */}
            <div className="text-center">
              <h2 className="font-display text-2xl font-bold text-foreground">{myDog.name}</h2>
              <p className="text-muted-foreground">{myDog.breed?.name} · {myDog.approximate_age}</p>
              {(myDog as any)?.bio && (
                <p className="mt-2 text-sm text-muted-foreground italic">"{(myDog as any).bio}"</p>
              )}
              <div className="mt-2 flex justify-center">
                <EnergyIndicator level={myDog.energy_level} size="lg" showLabel />
              </div>
            </div>

            {/* Neutered Badge */}
            <div className="flex justify-center">
              <span className={cn(
                "rounded-full px-4 py-2 text-sm",
                myDog.neutered ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {myDog.neutered ? '✓ Kısırlaştırıldı' : 'Kısırlaştırılmadı'}
              </span>
            </div>

            {/* Status Pulse */}
            <StatusPulse dog={myDog} selectedPark={selectedPark} onRefresh={refreshDogs} />

            {/* Info Cards */}
            <div className="space-y-3 pt-2">
              {myDog.social_style && (
                <div className="flex items-center justify-between rounded-xl bg-card p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
                  <span className="text-sm text-muted-foreground">Sosyal Tarz</span>
                  <span className="font-medium text-foreground">
                    {SOCIAL_STYLE_OPTIONS.find(o => o.value === myDog.social_style)?.label}
                  </span>
                </div>
              )}

              {myDog.triggers && myDog.triggers.length > 0 && (
                <div className="rounded-xl bg-card p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
                  <span className="text-sm text-muted-foreground">Tetikleyiciler</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {myDog.triggers.map(t => (
                      <span 
                        key={t}
                        className="rounded-full bg-[hsl(var(--energy-5))]/20 px-3 py-1 text-sm text-[hsl(var(--energy-5))]"
                      >
                        {TRIGGER_OPTIONS.find(o => o.value === t)?.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Edit prompt */}
              <button
                onClick={() => setEditing(true)}
                className="flex w-full items-center justify-between rounded-xl bg-secondary/50 p-4 text-left transition-all hover:bg-secondary"
              >
                <span className="text-sm text-muted-foreground">Biliyorsan ekle, bilmiyorsan geç</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </>
        )}

        {/* Lost Mode Section */}
        <div className="mt-4 border-t border-border pt-6">
          <button
            onClick={() => setShowLostModal(true)}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl border-2 py-3 font-semibold transition-all",
              myDog.is_lost
                ? "border-[hsl(var(--energy-5))] bg-[hsl(var(--energy-5))] text-white"
                : "border-[hsl(var(--energy-5))] text-[hsl(var(--energy-5))] hover:bg-[hsl(var(--energy-5))]/10"
            )}
          >
            <AlertTriangle className="h-5 w-5" />
            {myDog.is_lost ? 'LOST MODE KAPAT' : 'LOST MODE AKTİF ET'}
          </button>
        </div>
      </div>

      {/* Lost Mode Modal */}
      {showLostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
          <div className="max-w-sm w-full rounded-2xl bg-card p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">
              {myDog.is_lost ? '🆘 Lost Mode Kapat' : '⚠️ Lost Mode'}
            </h2>
            
            {myDog.is_lost ? (
              <p className="text-muted-foreground mb-6">
                Lost Mode kapatılsın mı? Telefon numaran artık görünmeyecek.
              </p>
            ) : (
              <div className="space-y-4 mb-6">
                <p className="text-muted-foreground">
                  Lost Mode aktif edilsin mi? İletişim numaranız yalnızca şu an parkta aktif olanlara açılacaktır.
                </p>
                
                {/* Emergency Phone Input */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    <Phone className="inline h-4 w-4 mr-1" />
                    Acil Telefon Numarası
                  </label>
                  <input
                    type="tel"
                    placeholder="+905XXXXXXXXX veya 05XXXXXXXXX"
                    value={emergencyPhone}
                    onChange={(e) => {
                      setEmergencyPhone(e.target.value);
                      setPhoneError('');
                    }}
                    className="dogspace-input w-full"
                  />
                  {phoneError && (
                    <p className="mt-1 text-sm text-destructive">{phoneError}</p>
                  )}
                </div>

                {selectedPark && (
                  <div className="rounded-lg bg-secondary/50 p-3">
                    <p className="text-xs text-muted-foreground">
                      Son görüldüğü park: <span className="font-medium text-foreground">{selectedPark.name}</span>
                    </p>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowLostModal(false);
                  setPhoneError('');
                  setEmergencyPhone('');
                }}
                className="flex-1 rounded-xl border border-border py-3 font-medium text-foreground"
              >
                İptal
              </button>
              <button
                onClick={handleLostMode}
                disabled={loading || (!myDog.is_lost && !emergencyPhone.trim())}
                className={cn(
                  "flex-1 rounded-xl py-3 font-semibold disabled:opacity-50",
                  myDog.is_lost ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"
                )}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 
                  myDog.is_lost ? 'Kapat' : 'Aktif Et'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
