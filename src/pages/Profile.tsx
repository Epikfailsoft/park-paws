import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SOCIAL_STYLE_OPTIONS, formatOwnerName } from '@/types/dogspace';
import { validateTurkishPhone } from '@/lib/upload-validation';
import doginnLogo from '@/assets/doginn-logo.png';
import { DogSelector } from '@/components/profile/DogSelector';
import { DogPhotoGallery } from '@/components/profile/DogPhotoGallery';

// ── Constants ──
const PLAY_STYLE_OPTIONS = [
  { value: 'chase', label: 'Kovalamaca', icon: '🏃' },
  { value: 'wrestle', label: 'Güreş / Sert oyun', icon: '💪' },
  { value: 'toy', label: 'Oyuncak odaklı', icon: '🧸' },
  { value: 'gentle', label: 'Nazik oyun', icon: '🤗' },
  { value: 'calm_social', label: 'Sosyal ama sakin', icon: '☕' },
];

const SOCIALITY_OPTIONS = [
  { value: 'shy', label: 'Çekingen', icon: '🙈' },
  { value: 'selective', label: 'Seçici', icon: '🤔' },
  { value: 'everyone', label: 'Herkesle oynar', icon: '🎉' },
];

const AGGRESSION_OPTIONS = [
  { value: 'none', label: 'Yok', icon: '✅', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  { value: 'situational', label: 'Durumsal', icon: '⚠️', color: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  { value: 'high', label: 'Yüksek', icon: '🚨', color: 'bg-red-500/15 text-red-600 border-red-500/30' },
];

const OFFLEASH_OPTIONS = [
  { value: 'safe', label: 'Güvenli', icon: '✅', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  { value: 'controlled', label: 'Kontrollü', icon: '⚠️', color: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  { value: 'risky', label: 'Riskli', icon: '🚨', color: 'bg-red-500/15 text-red-600 border-red-500/30' },
];

const ACTIVE_HOURS_OPTIONS = [
  { value: 'morning', label: 'Sabah', icon: '🌅' },
  { value: 'noon', label: 'Öğlen', icon: '☀️' },
  { value: 'evening', label: 'Akşam', icon: '🌆' },
];

const WALK_DURATION_OPTIONS = [
  { value: 'short', label: 'Kısa (15-30 dk)', icon: '🚶' },
  { value: 'medium', label: 'Orta (30-60 dk)', icon: '🚶‍♂️' },
  { value: 'long', label: 'Uzun (60+ dk)', icon: '🏃‍♂️' },
];

const SIZE_OPTIONS = [
  { value: 'small', label: 'Küçük', icon: '🐕' },
  { value: 'medium', label: 'Orta', icon: '🐕‍🦺' },
  { value: 'large', label: 'Büyük', icon: '🐾' },
];

const ENERGY_OPTIONS = [
  { value: 1, label: 'Düşük', icon: '🐢' },
  { value: 2, label: 'Orta', icon: '🐕' },
  { value: 3, label: 'Yüksek', icon: '⚡' },
];

const ZODIAC_OPTIONS = [
  { value: 'aries', label: 'Koç', icon: '♈' },
  { value: 'taurus', label: 'Boğa', icon: '♉' },
  { value: 'gemini', label: 'İkizler', icon: '♊' },
  { value: 'cancer', label: 'Yengeç', icon: '♋' },
  { value: 'leo', label: 'Aslan', icon: '♌' },
  { value: 'virgo', label: 'Başak', icon: '♍' },
  { value: 'libra', label: 'Terazi', icon: '♎' },
  { value: 'scorpio', label: 'Akrep', icon: '♏' },
  { value: 'sagittarius', label: 'Yay', icon: '♐' },
  { value: 'capricorn', label: 'Oğlak', icon: '♑' },
  { value: 'aquarius', label: 'Kova', icon: '♒' },
  { value: 'pisces', label: 'Balık', icon: '♓' },
];

const DOG_ORIGIN_OPTIONS = [
  { value: 'none', label: 'Sahipli', icon: '🐕' },
  { value: 'shelter', label: 'Barınak', icon: '🏠' },
  { value: 'street', label: 'Sokak', icon: '🐾' },
];

const SAFETY_OPTIONS = [
  { value: 'yes', label: 'Evet', icon: '✅' },
  { value: 'no', label: 'Hayır', icon: '❌' },
  { value: 'cautious', label: 'Dikkatli', icon: '⚠️' },
];

const VAX_STATUS_OPTIONS = [
  { value: 'up_to_date', label: 'Güncel', icon: '✅', color: 'bg-emerald-500/15 text-emerald-600' },
  { value: 'due_soon', label: 'Yaklaşıyor', icon: '⚠️', color: 'bg-amber-500/15 text-amber-600' },
  { value: 'unknown', label: 'Bilinmiyor', icon: '❓', color: 'bg-muted text-muted-foreground' },
];

const BADGE_DEFINITIONS = [
  { code: 'first_checkin', name: 'Park Müdavimi', icon: '🏞️' },
  { code: 'super_player', name: 'Süper Oyuncu', icon: '⭐' },
  { code: 'social_butterfly', name: 'Sosyal Kelebek', icon: '🦋' },
  { code: 'trusted_friend', name: 'Güvenilir Dost', icon: '🤝' },
  { code: 'park_star', name: 'Park Yıldızı', icon: '🌟' },
  { code: 'puppy_friendly', name: 'Yavru Dostu', icon: '🐶' },
];

// ── Chip Component ──
function Chip({ selected, onClick, children, className = '' }: { selected: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        "rounded-2xl border-2 px-4 py-2.5 text-sm font-medium transition-all active:scale-95",
        selected
          ? "border-primary bg-primary/15 text-primary shadow-sm"
          : "border-border bg-card text-muted-foreground hover:bg-secondary/50",
        className
      )}>
      {children}
    </button>
  );
}

// ── Section Card ──
function Section({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4 shadow-sm space-y-2.5", className)}>
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function Profile() {
  const { profile, dogs, selectedPark, signOut, refreshDogs, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [selectedDogId, setSelectedDogId] = useState<string>('');
  const myDog = dogs.find(d => d.id === selectedDogId) || dogs[0];
  
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const dogPhotoRef = useRef<HTMLInputElement>(null);
  const ownerPhotoRef = useRef<HTMLInputElement>(null);
  const [dogPhotoLoading, setDogPhotoLoading] = useState(false);
  const [ownerPhotoLoading, setOwnerPhotoLoading] = useState(false);

  // ── Owner state ──
  const [ownerName, setOwnerName] = useState(profile?.display_name || '');
  const [ownerLastName, setOwnerLastName] = useState(profile?.last_name || '');
  const [editingOwnerInfo, setEditingOwnerInfo] = useState(false);

  // ── Emergency phone ──
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [editingPhone, setEditingPhone] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);

  // ── Dog fields ──
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [energyLevel, setEnergyLevel] = useState<1 | 2 | 3>(2);
  const [gender, setGender] = useState('');
  const [neutered, setNeutered] = useState(false);
  const [isShelter, setIsShelter] = useState(false);
  const [bio, setBio] = useState('');
  const [sizeLabel, setSizeLabel] = useState('');
  const [playStyles, setPlayStyles] = useState<string[]>([]);
  const [sociality, setSociality] = useState('');
  const [aggressionRisk, setAggressionRisk] = useState('');
  const [offleashCompat, setOffleashCompat] = useState('');
  const [activeHours, setActiveHours] = useState<string[]>([]);
  const [walkDuration, setWalkDuration] = useState('');
  const [puppyTolerance, setPuppyTolerance] = useState('');
  const [bigDogTolerance, setBigDogTolerance] = useState('');
  const [toyGuarding, setToyGuarding] = useState('');
  const [catCompat, setCatCompat] = useState('');
  const [allergyNotes, setAllergyNotes] = useState('');
  const [zodiacSign, setZodiacSign] = useState('');
  const [dogOrigin, setDogOrigin] = useState<'none' | 'shelter' | 'street'>('none');
  // ── Breed ──
  const [breeds, setBreeds] = useState<{ id: string; name: string; code: string }[]>([]);
  const [selectedBreedId, setSelectedBreedId] = useState('');
  const [showBreedDropdown, setShowBreedDropdown] = useState(false);
  const [breedSearch, setBreedSearch] = useState('');

  // ── Health ──
  const [vaxStatus, setVaxStatus] = useState('unknown');
  const [lastVetVisit, setLastVetVisit] = useState('');
  const [hasMicrochip, setHasMicrochip] = useState(false);

  // ── Badges ──
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);

  // ── Lost mode ──
  const [lostLoading, setLostLoading] = useState(false);
  const [lostPhone, setLostPhone] = useState('');
  const [lostNote, setLostNote] = useState('');

  // Auto-select first dog
  useEffect(() => {
    if (dogs.length > 0 && !dogs.find(d => d.id === selectedDogId)) {
      setSelectedDogId(dogs[0].id);
    }
  }, [dogs]);

  // Load breeds
  useEffect(() => {
    supabase.from('breeds').select('id, name, code').order('name').then(({ data }) => {
      if (data) setBreeds(data);
    });
  }, []);

  // Populate fields from dog
  useEffect(() => {
    if (!myDog) return;
    setName(myDog.name);
    setAge(myDog.approximate_age);
    setEnergyLevel((myDog.energy_level as 1 | 2 | 3) || 2);
    setGender(myDog.gender || '');
    setNeutered(myDog.neutered);
    setIsShelter((myDog as any).is_shelter || false);
    setBio((myDog as any).bio || '');
    setSelectedBreedId(myDog.breed_id);
    setSizeLabel((myDog as any).size_label || '');
    setPlayStyles((myDog as any).play_styles || []);
    setSociality((myDog as any).sociality || '');
    setAggressionRisk((myDog as any).aggression_risk || '');
    setOffleashCompat((myDog as any).offleash_compat || '');
    setActiveHours((myDog as any).active_hours || []);
    setWalkDuration((myDog as any).walk_duration || '');
    setPuppyTolerance((myDog as any).puppy_tolerance || '');
    setBigDogTolerance((myDog as any).big_dog_tolerance || '');
    setToyGuarding((myDog as any).toy_guarding || '');
    setCatCompat((myDog as any).cat_compat || '');
    setAllergyNotes((myDog as any).allergy_notes || '');
    setZodiacSign((myDog as any).zodiac_sign || '');
    const shelter = (myDog as any).is_shelter;
    // Determine origin from breed or is_shelter flag
    if (shelter) {
      // Check breed to differentiate shelter vs street
      const breedCode = breeds.find(b => b.id === myDog.breed_id)?.code;
      setDogOrigin(breedCode === 'SOKAK' ? 'street' : 'shelter');
    } else {
      setDogOrigin('none');
    }
  }, [myDog]);

  // Load care data
  useEffect(() => {
    if (!myDog) return;
    supabase.from('dog_care').select('vaccination_status, last_vet_visit').eq('dog_id', myDog.id).single().then(({ data }) => {
      if (data) {
        setVaxStatus(data.vaccination_status || 'unknown');
        setLastVetVisit(data.last_vet_visit || '');
      }
    });
    supabase.from('dog_private').select('microchip_id, emergency_phone').eq('dog_id', myDog.id).single().then(({ data }) => {
      if (data) {
        setHasMicrochip(!!data.microchip_id);
        if (data.emergency_phone) setEmergencyPhone(data.emergency_phone);
      }
    });
  }, [myDog]);

  // Load badges
  useEffect(() => {
    if (!myDog) return;
    supabase.from('dog_badges').select('badge:badges(code)').eq('dog_id', myDog.id).then(({ data }) => {
      if (data) setEarnedBadges(data.map((d: any) => d.badge?.code).filter(Boolean));
    });
  }, [myDog]);

  // ── Handlers ──
  const handleDogPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !myDog) return;
    setDogPhotoLoading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `dogs/${myDog.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('dog-photos').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('dog-photos').getPublicUrl(path);
      await supabase.from('dogs').update({ photo_url: publicUrl } as any).eq('id', myDog.id);
      await refreshDogs();
      toast.success('Fotoğraf güncellendi!');
    } catch { toast.error('Fotoğraf yüklenemedi'); }
    finally { setDogPhotoLoading(false); }
  };

  const handleOwnerPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setOwnerPhotoLoading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `owner/${profile.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('dog-photos').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('dog-photos').getPublicUrl(path);
      await supabase.from('profiles').update({ photo_url: publicUrl } as any).eq('id', profile.id);
      await refreshProfile();
      toast.success('Fotoğraf güncellendi!');
    } catch { toast.error('Hata oluştu'); }
    finally { setOwnerPhotoLoading(false); }
  };

  const handleSave = async () => {
    if (!myDog) return;
    setLoading(true);
    try {
      await supabase.from('dogs').update({
        name, approximate_age: age, energy_level: energyLevel,
        gender: gender || null, neutered, is_shelter: isShelter,
        bio: bio.trim() || null, breed_id: selectedBreedId || undefined,
        size_label: sizeLabel || null,
        play_styles: playStyles.length > 0 ? playStyles : [],
        sociality: sociality || null,
        aggression_risk: aggressionRisk || null,
        offleash_compat: offleashCompat || null,
        active_hours: activeHours.length > 0 ? activeHours : [],
        walk_duration: walkDuration || null,
        puppy_tolerance: puppyTolerance || null,
        big_dog_tolerance: bigDogTolerance || null,
        toy_guarding: toyGuarding || null,
        cat_compat: catCompat || null,
        allergy_notes: allergyNotes.trim() || null,
        zodiac_sign: zodiacSign || null,
      } as any).eq('id', myDog.id);

      // Save health
      await supabase.from('dog_care').upsert({
        dog_id: myDog.id,
        vaccination_status: vaxStatus,
        last_vet_visit: lastVetVisit || null,
      } as any, { onConflict: 'dog_id' });

      // Save microchip
      await supabase.from('dog_private').upsert({
        dog_id: myDog.id,
        microchip_id: hasMicrochip ? 'yes' : null,
        emergency_phone: emergencyPhone || '+90',
      } as any, { onConflict: 'dog_id' });

      await refreshDogs();
      setEditing(false);
      toast.success('Profil güncellendi! 🐾');
    } catch (err) {
      console.error(err);
      toast.error('Bir hata oluştu');
    } finally { setLoading(false); }
  };

  const handleSavePhone = async () => {
    if (!myDog) return;
    const v = validateTurkishPhone(emergencyPhone);
    if (!v.valid) { toast.error(v.error || 'Geçersiz numara'); return; }
    setSavingPhone(true);
    try {
      await supabase.from('dog_private').upsert({ dog_id: myDog.id, emergency_phone: emergencyPhone } as any, { onConflict: 'dog_id' });
      setEditingPhone(false);
      toast.success('Telefon güncellendi!');
    } catch { toast.error('Hata'); }
    finally { setSavingPhone(false); }
  };

  const toggleLostMode = async (enable: boolean) => {
    if (!myDog) return;
    if (enable && !emergencyPhone) {
      toast.error('Önce acil telefon numarası ekleyin');
      return;
    }
    setLostLoading(true);
    try {
      const { error } = await supabase.rpc('toggle_lost_mode', {
        p_dog_id: myDog.id,
        p_enable: enable,
        p_emergency_phone: emergencyPhone || undefined,
      });
      if (error) throw error;
      await refreshDogs();
      toast.success(enable ? '🚨 Kayıp modu aktif!' : '✅ Kayıp modu kapatıldı');
    } catch { toast.error('Hata oluştu'); }
    finally { setLostLoading(false); }
  };

  const handleSaveOwnerInfo = async () => {
    if (!profile || !ownerName.trim()) return;
    try {
      await supabase.from('profiles').update({ display_name: ownerName.trim(), last_name: ownerLastName.trim() || null } as any).eq('id', profile.id);
      await refreshProfile();
      setEditingOwnerInfo(false);
      toast.success('Bilgiler güncellendi!');
    } catch { toast.error('Hata'); }
  };

  const handleDeleteDog = async () => {
    if (!myDog || dogs.length <= 1) {
      toast.error('Son köpeğinizi silemezsiniz');
      return;
    }
    if (!window.confirm(`${myDog.name} profilini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
    setLoading(true);
    try {
      await supabase.from('dogs').update({ deleted_at: new Date().toISOString() } as any).eq('id', myDog.id);
      await refreshDogs();
      setSelectedDogId('');
      toast.success(`${myDog.name} silindi`);
    } catch { toast.error('Hata oluştu'); }
    finally { setLoading(false); }
  };

  const handleLogout = async () => { await signOut(); navigate('/auth'); };

  const togglePlayStyle = (val: string) => {
    if (playStyles.includes(val)) {
      setPlayStyles(prev => prev.filter(v => v !== val));
    } else if (playStyles.length < 2) {
      setPlayStyles(prev => [...prev, val]);
    } else {
      toast.error('En fazla 2 oyun tarzı seçebilirsiniz');
    }
  };

  const toggleActiveHour = (val: string) => {
    setActiveHours(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  if (!myDog) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const breedName = breeds.find(b => b.id === (selectedBreedId || myDog.breed_id))?.name || (myDog as any)?.breed?.name || '';

  // ═══════════════ VIEW MODE ═══════════════
  if (!editing) {
    return (
      <div className="relative min-h-screen pb-24 safe-top safe-bottom" style={{ background: `linear-gradient(180deg, hsl(var(--page-profile-light)) 0%, hsl(var(--background)) 25%)` }}>
        {/* Watermark */}
        <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center opacity-[0.04]">
          <img src={dogiLogo} alt="" className="h-[70vh] w-[70vh] object-contain" />
        </div>

        {/* Lost Mode Banner */}
        {myDog.is_lost && (
          <div className="bg-destructive text-destructive-foreground p-3 text-center font-semibold text-sm">
            🆘 KAYIP MODU AKTİF — Parkta aktif kullanıcılar telefon numaranı görebilir
          </div>
        )}

        {/* Header */}
        <header className="sticky top-0 z-40 border-b px-4 py-3" style={{ background: 'hsl(var(--page-profile))' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={dogiLogo} alt="DOGI" className="h-[44px] w-[44px] rounded-xl" />
              <h1 className="font-display text-lg font-extrabold text-white">Köpeğim</h1>
            </div>
            <div className="flex items-center gap-2">
              <DogSelector
                dogs={dogs}
                selectedDogId={selectedDogId || myDog?.id || ''}
                onSelect={setSelectedDogId}
                onAddNew={() => navigate('/onboarding')}
              />
              <button onClick={() => toggleLostMode(!myDog.is_lost)} disabled={lostLoading}
                className={cn("flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-all",
                  myDog.is_lost ? "bg-white text-purple-600" : "bg-purple-500 text-white border border-purple-400"
                )}>
                {lostLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : myDog.is_lost ? <><ToggleRight className="h-4 w-4" /> Kayıp ON</> : <><ToggleLeft className="h-4 w-4" /> Kayıp</>}
              </button>
              <button onClick={() => setEditing(true)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white">
                <Edit2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="relative z-10 px-4 pt-4 space-y-4">

          {/* ── 1. KÖPEK KİMLİĞİ ── */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            {/* Photo Gallery */}
            <DogPhotoGallery
              dogId={myDog.id}
              mainPhotoUrl={myDog.photo_url}
              onMainPhotoChange={async (url) => {
                await refreshDogs();
              }}
            />

            {/* Info */}
            <div className="mt-4 text-center">
              <h2 className="text-xl font-bold text-foreground">{myDog.name}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {myDog.approximate_age} • {myDog.gender === 'male' ? '♂ Erkek' : myDog.gender === 'female' ? '♀ Dişi' : ''} {myDog.neutered ? '• ✂️' : ''}
              </p>
              <p className="text-sm text-muted-foreground">
                {breedName}
                {(myDog as any).is_shelter ? (dogOrigin === 'street' ? ' • 🐾 Sokak' : ' • 🏠 Barınak') : ''}
                {(myDog as any).zodiac_sign && ` • ${ZODIAC_OPTIONS.find(z => z.value === (myDog as any).zodiac_sign)?.icon || ''} ${ZODIAC_OPTIONS.find(z => z.value === (myDog as any).zodiac_sign)?.label || ''}`}
              </p>

              {/* Size & Energy chips */}
              <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                {(myDog as any).size_label && (
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                    {SIZE_OPTIONS.find(o => o.value === (myDog as any).size_label)?.icon} {SIZE_OPTIONS.find(o => o.value === (myDog as any).size_label)?.label}
                  </span>
                )}
                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                  {ENERGY_OPTIONS.find(o => o.value === myDog.energy_level)?.icon} {ENERGY_OPTIONS.find(o => o.value === myDog.energy_level)?.label}
                </span>
              </div>
            </div>

            {/* Bio */}
            {(myDog as any).bio && (
              <p className="mt-3 text-sm text-muted-foreground italic border-t border-border pt-3 text-center">"{(myDog as any).bio}"</p>
            )}
          </div>

          {/* ── 2. OYUN & UYUM PANELİ ── */}
          <Section title="Oyun & Uyum" icon={<span className="text-sm">🎾</span>}>
            {/* Play Styles */}
            {(myDog as any).play_styles?.length > 0 && (
              <div>
                <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Oyun Tarzı</span>
                <div className="flex flex-wrap gap-1.5">
                  {((myDog as any).play_styles as string[]).map(s => {
                    const opt = PLAY_STYLE_OPTIONS.find(o => o.value === s);
                    return <span key={s} className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">{opt?.icon} {opt?.label}</span>;
                  })}
                </div>
              </div>
            )}

            {/* Sociality */}
            {(myDog as any).sociality && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Sosyallik</span>
                <span className="rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent-foreground">
                  {SOCIALITY_OPTIONS.find(o => o.value === (myDog as any).sociality)?.icon} {SOCIALITY_OPTIONS.find(o => o.value === (myDog as any).sociality)?.label}
                </span>
              </div>
            )}

            {/* Aggression */}
            {(myDog as any).aggression_risk && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Agresyon Riski</span>
                <span className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold",
                  AGGRESSION_OPTIONS.find(o => o.value === (myDog as any).aggression_risk)?.color
                )}>
                  {AGGRESSION_OPTIONS.find(o => o.value === (myDog as any).aggression_risk)?.icon} {AGGRESSION_OPTIONS.find(o => o.value === (myDog as any).aggression_risk)?.label}
                </span>
              </div>
            )}

            {/* Off-leash */}
            {(myDog as any).offleash_compat && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Tasmasız Uyum</span>
                <span className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold",
                  OFFLEASH_OPTIONS.find(o => o.value === (myDog as any).offleash_compat)?.color
                )}>
                  {OFFLEASH_OPTIONS.find(o => o.value === (myDog as any).offleash_compat)?.icon} {OFFLEASH_OPTIONS.find(o => o.value === (myDog as any).offleash_compat)?.label}
                </span>
              </div>
            )}

            {/* Empty state */}
            {!(myDog as any).play_styles?.length && !(myDog as any).sociality && !(myDog as any).aggression_risk && !(myDog as any).offleash_compat && (
              <p className="text-xs text-muted-foreground italic">Henüz bilgi eklenmedi. Düzenle butonuna dokun.</p>
            )}
          </Section>

          {/* ── 3. RUTİN & KOORDİNASYON ── */}
          <Section title="Rutin & Koordinasyon" icon={<Clock className="h-3.5 w-3.5 text-muted-foreground" />}>
            {(myDog as any).active_hours?.length > 0 && (
              <div>
                <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Aktif Saatler</span>
                <div className="flex gap-2">
                  {((myDog as any).active_hours as string[]).map(h => {
                    const opt = ACTIVE_HOURS_OPTIONS.find(o => o.value === h);
                    return <span key={h} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground">{opt?.icon} {opt?.label}</span>;
                  })}
                </div>
              </div>
            )}

            {(myDog as any).walk_duration && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Yürüyüş Süresi</span>
                <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground">
                  {WALK_DURATION_OPTIONS.find(o => o.value === (myDog as any).walk_duration)?.icon} {WALK_DURATION_OPTIONS.find(o => o.value === (myDog as any).walk_duration)?.label}
                </span>
              </div>
            )}

            {selectedPark && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">En Çok Gidilen Park</span>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600">
                  <MapPin className="inline h-3 w-3 mr-0.5" />{selectedPark.name}
                </span>
              </div>
            )}

            {!(myDog as any).active_hours?.length && !(myDog as any).walk_duration && (
              <p className="text-xs text-muted-foreground italic">Henüz bilgi eklenmedi.</p>
            )}
          </Section>

          {/* ── 4. SAĞLIK TAKİBİ ── */}
          <Section title="Sağlık" icon={<Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Aşı Durumu</span>
              <span className={cn("rounded-full px-3 py-1.5 text-xs font-semibold",
                VAX_STATUS_OPTIONS.find(o => o.value === vaxStatus)?.color
              )}>
                {VAX_STATUS_OPTIONS.find(o => o.value === vaxStatus)?.icon} {VAX_STATUS_OPTIONS.find(o => o.value === vaxStatus)?.label}
              </span>
            </div>
            {lastVetVisit && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Son Veteriner</span>
                <span className="text-xs font-medium text-foreground">{new Date(lastVetVisit).toLocaleDateString('tr-TR')}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Mikroçip</span>
              <span className="text-xs font-medium text-foreground">{hasMicrochip ? '✅ Var' : '❌ Yok'}</span>
            </div>
            {(myDog as any).allergy_notes && (
              <div>
                <span className="text-xs font-medium text-muted-foreground mb-1 block">Alerji / Özel Durum</span>
                <p className="text-xs text-foreground bg-secondary rounded-lg p-2">{(myDog as any).allergy_notes}</p>
              </div>
            )}
          </Section>

          {/* ── 5. GÜVENLİK DETAYLARI ── */}
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <button onClick={() => setSafetyOpen(!safetyOpen)}
              className="flex w-full items-center justify-between p-4">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-secondary"><Shield className="h-3.5 w-3.5 text-muted-foreground" /></span>
                Güvenlik Detayları
              </h3>
              {safetyOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {safetyOpen && (
              <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
                {[
                  { label: 'Yavru Toleransı', value: (myDog as any).puppy_tolerance },
                  { label: 'Büyük Köpek Toleransı', value: (myDog as any).big_dog_tolerance },
                  { label: 'Oyuncak Koruma', value: (myDog as any).toy_guarding },
                  { label: 'Kedi Uyumu', value: (myDog as any).cat_compat },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-1">
                    <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                    <span className="text-xs font-medium text-foreground">
                      {item.value ? (SAFETY_OPTIONS.find(o => o.value === item.value)?.icon + ' ' + SAFETY_OPTIONS.find(o => o.value === item.value)?.label) : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── 6. ROZETLER ── */}
          <Section title="Rozetler" icon={<Award className="h-3.5 w-3.5 text-muted-foreground" />}>
            <div className="grid grid-cols-3 gap-3">
              {BADGE_DEFINITIONS.map(badge => {
                const earned = earnedBadges.includes(badge.code);
                return (
                  <div key={badge.code} className={cn("flex flex-col items-center gap-1 rounded-xl p-3 transition-all",
                    earned ? "bg-primary/10" : "opacity-30"
                  )}>
                    <span className="text-2xl">{badge.icon}</span>
                    <span className="text-[10px] font-semibold text-center text-foreground leading-tight">{badge.name}</span>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ── 7. KAYIP MODU ── */}
          <div className={cn("rounded-2xl border-2 p-4 shadow-sm space-y-3",
            myDog.is_lost ? "border-red-500 bg-red-50 dark:bg-red-950/20" : "border-border bg-card"
          )}>
            <div className="flex items-center gap-2">
              <AlertTriangle className={cn("h-5 w-5", myDog.is_lost ? "text-red-500" : "text-muted-foreground")} />
              <h3 className={cn("text-sm font-bold uppercase tracking-wider", myDog.is_lost ? "text-red-600" : "text-muted-foreground")}>
                {myDog.is_lost ? '🚨 KÖPEK KAYIP' : 'Kayıp Modu'}
              </h3>
            </div>

            {myDog.is_lost ? (
              <>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Acil Telefon</span>
                    <span className="font-semibold text-foreground">{emergencyPhone || '—'}</span>
                  </div>
                  {selectedPark && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Son Park</span>
                      <span className="font-medium text-foreground">{selectedPark.name}</span>
                    </div>
                  )}
                </div>
                <button onClick={() => toggleLostMode(false)} disabled={lostLoading}
                  className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white shadow-lg active:scale-95 transition-all disabled:opacity-50">
                  {lostLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : '✅ KAYIP MODUNU KAPAT'}
                </button>
              </>
            ) : (
              <>
                {/* Phone inline */}
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {editingPhone ? (
                    <div className="flex flex-1 gap-2">
                      <input type="tel" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)}
                        placeholder="+905XXXXXXXXX" className="dogspace-input flex-1 text-sm py-1.5" />
                      <button onClick={handleSavePhone} disabled={savingPhone}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground font-medium disabled:opacity-50">
                        {savingPhone ? '...' : 'Kaydet'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center justify-between">
                      <span className="text-sm text-foreground">{emergencyPhone || 'Telefon eklenmedi'}</span>
                      <button onClick={() => setEditingPhone(true)} className="text-xs text-primary font-medium">Düzenle</button>
                    </div>
                  )}
                </div>
                <button onClick={() => toggleLostMode(true)} disabled={lostLoading}
                  className="w-full rounded-xl bg-red-500 py-3 text-sm font-bold text-white shadow-lg active:scale-95 transition-all disabled:opacity-50">
                  {lostLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : '🚨 Kayıp Modunu Aktif Et'}
                </button>
              </>
            )}
          </div>

          {/* ── 8. AKSİYON BUTONLARI ── */}
          <div className="space-y-2">
            <button onClick={() => setEditing(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-white shadow-lg active:scale-[0.98] transition-all"
              style={{ background: 'var(--gradient-accent)', boxShadow: 'var(--shadow-glow-accent)' }}>
              <Edit2 className="h-4 w-4" /> Profili Düzenle
            </button>
            <button className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-border py-3 text-sm font-medium text-muted-foreground hover:bg-secondary transition-all">
              <Share2 className="h-4 w-4" /> Mini Kart Paylaş
            </button>
          </div>

          {/* Owner */}
          {profile && (
            <Section title="Aile" icon={<User className="h-3.5 w-3.5 text-muted-foreground" />}>
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <input ref={ownerPhotoRef} type="file" accept="image/*" className="hidden" onChange={handleOwnerPhotoUpload} />
                  {profile.photo_url ? (
                    <img src={profile.photo_url} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/20" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: 'var(--gradient-hero)' }}>
                      {profile.display_name?.[0]}
                    </div>
                  )}
                  <button onClick={() => ownerPhotoRef.current?.click()} disabled={ownerPhotoLoading}
                    className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow">
                    {ownerPhotoLoading ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Camera className="h-2.5 w-2.5" />}
                  </button>
                </div>
                <div className="flex-1">
                  {editingOwnerInfo ? (
                    <div className="space-y-2">
                      <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Ad" className="dogspace-input w-full text-sm py-1.5" />
                      <input type="text" value={ownerLastName} onChange={e => setOwnerLastName(e.target.value)} placeholder="Soyad" className="dogspace-input w-full text-sm py-1.5" />
                      <div className="flex gap-2">
                        <button onClick={handleSaveOwnerInfo} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground font-medium">Kaydet</button>
                        <button onClick={() => setEditingOwnerInfo(false)} className="rounded-lg bg-secondary px-3 py-1.5 text-xs text-muted-foreground font-medium">İptal</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm text-foreground">{formatOwnerName(profile.display_name, profile.last_name)}</p>
                      <button onClick={() => { setOwnerName(profile.display_name); setOwnerLastName(profile.last_name || ''); setEditingOwnerInfo(true); }}
                        className="text-xs text-primary font-medium">Düzenle</button>
                    </div>
                  )}
                </div>
              </div>
            </Section>
          )}

          {/* Delete Dog (only if multiple) */}
          {dogs.length > 1 && (
            <button onClick={handleDeleteDog} disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-destructive/30 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50">
              <Trash2 className="h-4 w-4" /> {myDog.name} Profilini Sil
            </button>
          )}

          {/* Logout */}
          <button onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 py-3 text-sm font-medium text-destructive mb-4">
            <LogOut className="h-4 w-4" /> Çıkış Yap
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════ EDIT MODE ═══════════════
  return (
    <div className="relative min-h-screen pb-24 safe-top safe-bottom" style={{ background: `linear-gradient(180deg, hsl(var(--page-profile-light)) 0%, hsl(var(--background)) 15%)` }}>
      <header className="sticky top-0 z-40 border-b px-4 py-3 flex items-center justify-between" style={{ background: 'hsl(var(--page-profile))' }}>
        <h1 className="font-display text-lg font-extrabold text-white">Profili Düzenle</h1>
        <button onClick={() => setEditing(false)} className="rounded-lg bg-white/20 px-3 py-1.5 text-sm font-medium text-white">İptal</button>
      </header>

      <div className="relative z-10 px-4 pt-4 space-y-5">
        {/* ── 1. KİMLİK ── */}
        <Section title="Köpek Kimliği" icon={<DogIcon className="h-3.5 w-3.5 text-muted-foreground" />}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Ad</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="dogspace-input w-full" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Yaş</label>
              <input type="text" value={age} onChange={e => setAge(e.target.value)} className="dogspace-input w-full" placeholder="ör. 3 yaş" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Cinsiyet</label>
              <div className="flex gap-2">
                {[{ v: 'female', l: '♀ Dişi' }, { v: 'male', l: '♂ Erkek' }].map(g => (
                  <Chip key={g.v} selected={gender === g.v} onClick={() => setGender(gender === g.v ? '' : g.v)} className="flex-1 text-center">{g.l}</Chip>
                ))}
              </div>
            </div>
          </div>

          {/* Breed */}
          <div className="relative">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Irk</label>
            <button type="button" onClick={() => setShowBreedDropdown(!showBreedDropdown)} className="dogspace-input w-full text-left flex items-center justify-between">
              <span>{breeds.find(b => b.id === selectedBreedId)?.name || 'Irk seçin'}</span>
              <Search className="h-4 w-4 text-muted-foreground" />
            </button>
            {showBreedDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-56 overflow-hidden z-50">
                <div className="p-2 border-b border-border">
                  <input type="text" placeholder="Ara..." value={breedSearch} onChange={e => setBreedSearch(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border text-sm" autoFocus />
                </div>
                <div className="overflow-y-auto max-h-44">
                  {breeds.filter(b => b.name.toLowerCase().includes(breedSearch.toLowerCase())).map(breed => (
                    <button key={breed.id} type="button"
                      onClick={() => { setSelectedBreedId(breed.id); setShowBreedDropdown(false); setBreedSearch(''); }}
                      className={cn("w-full text-left px-4 py-2.5 text-sm hover:bg-secondary/50", breed.id === selectedBreedId && "bg-primary/10 text-primary font-medium")}
                    >{breed.name}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Neutered */}
          <Chip selected={neutered} onClick={() => setNeutered(!neutered)} className="w-full text-center">
            {neutered ? '✂️ Kısır' : '✂️ Kısır değil'}
          </Chip>

          {/* Dog Origin */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nereden Geldi?</label>
            <div className="flex gap-2">
              {DOG_ORIGIN_OPTIONS.map(o => (
                <Chip key={o.value} selected={dogOrigin === o.value} onClick={() => { setDogOrigin(o.value as any); setIsShelter(o.value !== 'none'); }} className="flex-1 text-center">
                  {o.icon} {o.label}
                </Chip>
              ))}
            </div>
          </div>

          {/* Zodiac */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Burç</label>
            <div className="grid grid-cols-4 gap-1.5">
              {ZODIAC_OPTIONS.map(o => (
                <Chip key={o.value} selected={zodiacSign === o.value} onClick={() => setZodiacSign(zodiacSign === o.value ? '' : o.value)} className="text-center text-[11px] px-1">
                  {o.icon} {o.label}
                </Chip>
              ))}
            </div>
          </div>

          {/* Size */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Boyut</label>
            <div className="flex gap-2">
              {SIZE_OPTIONS.map(o => (
                <Chip key={o.value} selected={sizeLabel === o.value} onClick={() => setSizeLabel(sizeLabel === o.value ? '' : o.value)} className="flex-1 text-center">
                  {o.icon} {o.label}
                </Chip>
              ))}
            </div>
          </div>

          {/* Energy */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Enerji</label>
            <div className="flex gap-2">
              {ENERGY_OPTIONS.map(o => (
                <Chip key={o.value} selected={energyLevel === o.value} onClick={() => setEnergyLevel(o.value as 1 | 2 | 3)} className="flex-1 text-center">
                  {o.icon} {o.label}
                </Chip>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Bio <span className="font-normal">(max 150)</span></label>
            <textarea value={bio} onChange={e => setBio(e.target.value.slice(0, 150))} rows={2} placeholder="Köpeğini kısaca tanıt..."
              className="dogspace-input w-full resize-none" />
            <p className="text-right text-[10px] text-muted-foreground mt-0.5">{bio.length}/150</p>
          </div>
        </Section>

        {/* ── 2. OYUN & UYUM ── */}
        <Section title="Oyun & Uyum" icon={<span className="text-sm">🎾</span>}>
          {/* Play styles (max 2) */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Oyun Tarzı <span className="font-normal">(en fazla 2)</span></label>
            <div className="flex flex-wrap gap-2">
              {PLAY_STYLE_OPTIONS.map(o => (
                <Chip key={o.value} selected={playStyles.includes(o.value)} onClick={() => togglePlayStyle(o.value)}>
                  {o.icon} {o.label}
                </Chip>
              ))}
            </div>
          </div>

          {/* Sociality */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Sosyallik</label>
            <div className="flex gap-2">
              {SOCIALITY_OPTIONS.map(o => (
                <Chip key={o.value} selected={sociality === o.value} onClick={() => setSociality(sociality === o.value ? '' : o.value)} className="flex-1 text-center">
                  {o.icon} {o.label}
                </Chip>
              ))}
            </div>
          </div>

          {/* Aggression */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Agresyon Riski</label>
            <div className="flex gap-2">
              {AGGRESSION_OPTIONS.map(o => (
                <Chip key={o.value} selected={aggressionRisk === o.value} onClick={() => setAggressionRisk(aggressionRisk === o.value ? '' : o.value)} className="flex-1 text-center">
                  {o.icon} {o.label}
                </Chip>
              ))}
            </div>
          </div>

          {/* Off-leash */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tasmasız Uyum</label>
            <div className="flex gap-2">
              {OFFLEASH_OPTIONS.map(o => (
                <Chip key={o.value} selected={offleashCompat === o.value} onClick={() => setOffleashCompat(offleashCompat === o.value ? '' : o.value)} className="flex-1 text-center">
                  {o.icon} {o.label}
                </Chip>
              ))}
            </div>
          </div>
        </Section>

        {/* ── 3. RUTİN ── */}
        <Section title="Rutin & Koordinasyon" icon={<Clock className="h-3.5 w-3.5 text-muted-foreground" />}>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Aktif Saatler</label>
            <div className="flex gap-2">
              {ACTIVE_HOURS_OPTIONS.map(o => (
                <Chip key={o.value} selected={activeHours.includes(o.value)} onClick={() => toggleActiveHour(o.value)} className="flex-1 text-center">
                  {o.icon} {o.label}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Yürüyüş Süresi</label>
            <div className="flex gap-2">
              {WALK_DURATION_OPTIONS.map(o => (
                <Chip key={o.value} selected={walkDuration === o.value} onClick={() => setWalkDuration(walkDuration === o.value ? '' : o.value)} className="flex-1 text-center text-[11px] px-2">
                  {o.icon} {o.label}
                </Chip>
              ))}
            </div>
          </div>
        </Section>

        {/* ── 4. SAĞLIK ── */}
        <Section title="Sağlık" icon={<Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />}>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Aşı Durumu</label>
            <div className="flex gap-2">
              {VAX_STATUS_OPTIONS.map(o => (
                <Chip key={o.value} selected={vaxStatus === o.value} onClick={() => setVaxStatus(o.value)} className="flex-1 text-center">
                  {o.icon} {o.label}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Son Veteriner Ziyareti</label>
            <input type="date" value={lastVetVisit} onChange={e => setLastVetVisit(e.target.value)} className="dogspace-input w-full" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Alerji / Özel Durum</label>
            <input type="text" value={allergyNotes} onChange={e => setAllergyNotes(e.target.value.slice(0, 100))} placeholder="Opsiyonel kısa not..." className="dogspace-input w-full" />
          </div>
          <Chip selected={hasMicrochip} onClick={() => setHasMicrochip(!hasMicrochip)} className="w-full text-center">
            {hasMicrochip ? '✅ Mikroçip Var' : '❌ Mikroçip Yok'}
          </Chip>
        </Section>

        {/* ── 5. GÜVENLİK ── */}
        <Section title="Güvenlik Detayları" icon={<Shield className="h-3.5 w-3.5 text-muted-foreground" />}>
          {[
            { label: 'Yavru Toleransı', value: puppyTolerance, set: setPuppyTolerance },
            { label: 'Büyük Köpek Toleransı', value: bigDogTolerance, set: setBigDogTolerance },
            { label: 'Oyuncak Koruma', value: toyGuarding, set: setToyGuarding },
            { label: 'Kedi Uyumu', value: catCompat, set: setCatCompat },
          ].map(field => (
            <div key={field.label}>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{field.label}</label>
              <div className="flex gap-2">
                {SAFETY_OPTIONS.map(o => (
                  <Chip key={o.value} selected={field.value === o.value} onClick={() => field.set(field.value === o.value ? '' : o.value)} className="flex-1 text-center">
                    {o.icon} {o.label}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
        </Section>

        {/* ── SAVE ── */}
        <button onClick={handleSave} disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-white shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 mb-4"
          style={{ background: 'var(--gradient-accent)', boxShadow: 'var(--shadow-glow-accent)' }}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : '💾 Kaydet'}
        </button>
      </div>
    </div>
  );
}
