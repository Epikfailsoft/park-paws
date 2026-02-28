import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Dog, ArrowRight, Loader2, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validatePhotoFile, compressImage } from '@/lib/upload-validation';
import { toast } from 'sonner';
import { z } from 'zod';
import type { Breed } from '@/types/dogspace';
import { formatOwnerName } from '@/types/dogspace';

const dogSchema = z.object({
  name: z.string().min(1, 'Köpeğinin adını gir'),
  approximate_age: z.string().min(1, 'Yaklaşık yaşını gir'),
  energy_level: z.number().min(1).max(3),
  neutered: z.boolean(),
  emergency_phone: z.string().regex(/^(\+90[0-9]{10}|0[0-9]{10})$/, 'Geçerli format: +90XXXXXXXXXX veya 0XXXXXXXXXX'),
});

export default function Onboarding() {
  const { profile, refreshDogs, selectPark } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step state
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Dog form state
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [energyLevel, setEnergyLevel] = useState<1 | 2 | 3>(2);
  const [neutered, setNeutered] = useState<boolean | null>(null);
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Breed state
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [selectedBreed, setSelectedBreed] = useState<Breed | null>(null);
  const [breedSearch, setBreedSearch] = useState('');
  const [showBreedDropdown, setShowBreedDropdown] = useState(false);
  const [customBreedText, setCustomBreedText] = useState('');

  // Parks state
  const [parks, setParks] = useState<{ id: string; name: string; status: string }[]>([]);
  const [selectedParkId, setSelectedParkId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch breeds on mount
  useEffect(() => {
    const fetchBreeds = async () => {
      const { data } = await supabase
        .from('breeds')
        .select('*')
        .order('name');
      if (data) setBreeds(data as Breed[]);
    };
    fetchBreeds();
  }, []);

  // Fetch parks on mount
  useEffect(() => {
    const fetchParks = async () => {
      const { data } = await supabase
        .from('parks')
        .select('id, name, status')
        .eq('status', 'ACTIVE')
        .order('name');
      if (data) setParks(data);
    };
    fetchParks();
  }, []);

  const filteredBreeds = breeds.filter(breed =>
    breed.name.toLowerCase().includes(breedSearch.toLowerCase())
  );

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validatePhotoFile(file);
      if (!validation.valid) {
        toast.error(validation.error!);
        return;
      }
      try {
        const compressed = await compressImage(file);
        setPhoto(compressed);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreview(reader.result as string);
        };
        reader.readAsDataURL(compressed);
      } catch {
        toast.error('Fotoğraf işlenemedi');
      }
    }
  };

  const handleDogSubmit = async () => {
    // Validate
    const result = dogSchema.safeParse({
      name,
      approximate_age: age,
      energy_level: energyLevel,
      neutered: neutered ?? false,
      emergency_phone: emergencyPhone,
    });

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    if (!photo) {
      toast.error('Lütfen köpeğinin bir fotoğrafını yükle');
      return;
    }

    if (!selectedBreed) {
      toast.error('Lütfen bir ırk seç');
      return;
    }

    if (selectedBreed.code === 'OTHER' && !customBreedText) {
      toast.error('Lütfen kırma/melez detayını gir');
      return;
    }

    if (neutered === null) {
      toast.error('Lütfen kısırlaştırma durumunu seç');
      return;
    }

    if (!profile) {
      toast.error('Profil bulunamadı. Lütfen tekrar giriş yapın.');
      return;
    }

    setLoading(true);

    try {
      // Upload photo
      const fileExt = photo.name.split('.').pop();
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('dog-photos')
        .upload(fileName, photo);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('dog-photos')
        .getPublicUrl(fileName);

      // Create dog
      const { data: dogData, error: dogError } = await supabase
        .from('dogs')
        .insert({
          owner_id: profile.id,
          name,
          approximate_age: age,
          energy_level: energyLevel,
          neutered,
          breed_id: selectedBreed.id,
          breed_custom_text: selectedBreed.code === 'OTHER' ? customBreedText : null,
          photo_url: publicUrl,
          owner_name_stub: profile.display_name,
          owner_photo_stub: profile.photo_url || null,
        })
        .select()
        .single();

      if (dogError) throw dogError;

      // Create lost profile with emergency phone
      if (dogData) {
        await supabase
          .from('dog_lost_profile')
          .insert({
            dog_id: dogData.id,
            emergency_phone: emergencyPhone,
          });
      }

      await refreshDogs();
      toast.success(`${name} eklendi! 🐕`);
      setStep(3); // Go to park selection
    } catch (error) {
      console.error('Error creating dog:', error);
      toast.error('Bir hata oluştu. Tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleParkSelect = async () => {
    if (!selectedParkId) {
      toast.error('Lütfen bir park seç');
      return;
    }

    setLoading(true);
    try {
      await selectPark(selectedParkId);
      toast.success('Parkın seçildi!');
      navigate('/discover');
    } catch (error) {
      console.error('Error selecting park:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Owner photo state
  const ownerFileInputRef = useRef<HTMLInputElement>(null);
  const [ownerPhoto, setOwnerPhoto] = useState<File | null>(null);
  const [ownerPhotoPreview, setOwnerPhotoPreview] = useState<string | null>(profile?.photo_url || null);
  const [ownerPhotoLoading, setOwnerPhotoLoading] = useState(false);

  const handleOwnerPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validatePhotoFile(file);
      if (!validation.valid) {
        toast.error(validation.error!);
        return;
      }
      try {
        const compressed = await compressImage(file);
        setOwnerPhoto(compressed);
        const reader = new FileReader();
        reader.onloadend = () => {
          setOwnerPhotoPreview(reader.result as string);
        };
        reader.readAsDataURL(compressed);
      } catch {
        toast.error('Fotoğraf işlenemedi');
      }
    }
  };

  const handleOwnerPhotoUpload = async () => {
    if (!ownerPhoto || !profile) return;

    setOwnerPhotoLoading(true);
    try {
      const fileExt = ownerPhoto.name.split('.').pop();
      const fileName = `owners/${profile.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('dog-photos')
        .upload(fileName, ownerPhoto);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('dog-photos')
        .getPublicUrl(fileName);

      await supabase
        .from('profiles')
        .update({ photo_url: publicUrl })
        .eq('id', profile.id);

      toast.success('Fotoğrafın eklendi!');
      setStep(2);
    } catch (error) {
      console.error('Error uploading owner photo:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setOwnerPhotoLoading(false);
    }
  };

  // Step 1: Owner Profile Setup
  if (step === 1) {
    return (
      <div className="flex min-h-screen flex-col bg-background safe-top">
        <div className="px-6 pt-8 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Camera className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">
                Hoş Geldin!
              </h1>
              <p className="text-sm text-muted-foreground">
                Profilini oluşturalım
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 px-6">
          {/* Owner Photo Upload */}
          <div className="mb-6">
            <input
              ref={ownerFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleOwnerPhotoSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => ownerFileInputRef.current?.click()}
              className={cn(
                "relative mx-auto flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed transition-all",
                ownerPhotoPreview
                  ? "border-primary"
                  : "border-border hover:border-primary/50"
              )}
            >
              {ownerPhotoPreview ? (
                <>
                  <img
                    src={ownerPhotoPreview}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-foreground/20 opacity-0 transition-opacity hover:opacity-100">
                    <Camera className="h-8 w-8 text-white" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                    <Plus className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium">Fotoğraf Ekle</span>
                </div>
              )}
            </button>
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Diğer sahipler seni tanısın
            </p>
          </div>

          {/* Owner Name Display */}
          <div className="mb-6 rounded-xl bg-card p-4 text-center" style={{ boxShadow: 'var(--shadow-card)' }}>
            <p className="text-sm text-muted-foreground">İsmin</p>
            <p className="font-display text-lg font-semibold text-foreground">
              {profile ? formatOwnerName(profile.display_name, profile.last_name) : 'Kullanıcı'}
            </p>
          </div>

          {/* Continue Button */}
          <button
            onClick={() => {
              if (ownerPhoto) {
                handleOwnerPhotoUpload();
              } else {
                setStep(2);
              }
            }}
            disabled={ownerPhotoLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
          >
            {ownerPhotoLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Devam Et
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>

          {!ownerPhotoPreview && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Fotoğraf eklersen parkta seni bulmak kolaylaşır
            </p>
          )}
        </div>
      </div>
    );
  }

  // Step 2: Dog Profile
  if (step === 2) {
    return (
      <div className="flex min-h-screen flex-col bg-background safe-top">
        {/* Header */}
        <div className="px-6 pt-8 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Dog className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">
                Köpeğini Tanıyalım
              </h1>
              <p className="text-sm text-muted-foreground">
                Parkta tanışmaya hazır olsun
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 pb-24">
          {/* Photo Upload */}
          <div className="mb-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative mx-auto flex aspect-square w-40 items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed transition-all",
                photoPreview
                  ? "border-primary"
                  : "border-border hover:border-primary/50"
              )}
            >
              {photoPreview ? (
                <>
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-foreground/20 opacity-0 transition-opacity hover:opacity-100">
                    <Camera className="h-8 w-8 text-white" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                    <Plus className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium">Fotoğraf Ekle</span>
                </div>
              )}
            </button>
          </div>

          {/* Name */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Köpeğin Adı *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Luna, Max, Boncuk..."
              className={cn(
                "dogspace-input w-full",
                errors.name && "border-destructive"
              )}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Breed Selection */}
          <div className="mb-4 relative">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Irk *
            </label>
            <button
              type="button"
              onClick={() => setShowBreedDropdown(!showBreedDropdown)}
              className="dogspace-input w-full text-left flex items-center justify-between"
            >
              <span className={selectedBreed ? "text-foreground" : "text-muted-foreground"}>
                {selectedBreed?.name || "Irk seçin"}
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
                  {filteredBreeds.map(breed => (
                    <button
                      key={breed.id}
                      type="button"
                      onClick={() => {
                        setSelectedBreed(breed);
                        setShowBreedDropdown(false);
                        setBreedSearch('');
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-secondary/50 text-sm"
                    >
                      {breed.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Custom Breed Text */}
          {selectedBreed?.code === 'OTHER' && (
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Hangi kırma/melez? *
              </label>
              <input
                type="text"
                value={customBreedText}
                onChange={(e) => setCustomBreedText(e.target.value)}
                placeholder="Örn: Golden + Husky karışımı"
                className="dogspace-input w-full"
              />
            </div>
          )}

          {/* Age */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Yaklaşık Yaş *
            </label>
            <input
              type="text"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="~2 yaş, 6 aylık, 5 yaş..."
              className={cn(
                "dogspace-input w-full",
                errors.approximate_age && "border-destructive"
              )}
            />
            {errors.approximate_age && (
              <p className="mt-1 text-xs text-destructive">{errors.approximate_age}</p>
            )}
          </div>

          {/* Energy Level */}
          <div className="mb-6">
            <label className="mb-3 block text-sm font-medium text-foreground">
              Enerji Seviyesi *
            </label>
            <div className="flex justify-between gap-2">
              {([1, 2, 3] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setEnergyLevel(level)}
                  className={cn(
                    "flex-1 rounded-xl border-2 py-3 text-sm font-medium transition-all",
                    energyLevel === level
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {level === 1 ? '🐢 Sakin' : level === 2 ? '🐕 Normal' : '⚡ Enerjik'}
                </button>
              ))}
            </div>
          </div>

          {/* Neutered */}
          <div className="mb-6">
            <label className="mb-3 block text-sm font-medium text-foreground">
              Kısırlaştırıldı mı? *
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setNeutered(true)}
                className={cn(
                  "flex-1 rounded-xl border-2 py-3 text-sm font-medium transition-all",
                  neutered === true
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground"
                )}
              >
                Evet
              </button>
              <button
                type="button"
                onClick={() => setNeutered(false)}
                className={cn(
                  "flex-1 rounded-xl border-2 py-3 text-sm font-medium transition-all",
                  neutered === false
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground"
                )}
              >
                Hayır
              </button>
            </div>
          </div>

          {/* Emergency Phone */}
          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Acil Durum Telefonu *
            </label>
            <input
              type="tel"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              placeholder="0555 123 45 67"
              className={cn(
                "dogspace-input w-full",
                errors.emergency_phone && "border-destructive"
              )}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              🔒 Sadece Lost Mode aktifken görünür
            </p>
            {errors.emergency_phone && (
              <p className="mt-1 text-xs text-destructive">{errors.emergency_phone}</p>
            )}
          </div>

          {/* Info box */}
          <div className="mb-6 rounded-xl bg-secondary/50 p-4">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Sosyal tarz, sevdikleri ve sevmedikleri</strong> daha sonra profil sayfasından ekleyebilirsin.
            </p>
          </div>
        </div>

        {/* Fixed Submit Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 safe-bottom">
          <button
            type="button"
            onClick={handleDogSubmit}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 font-medium text-accent-foreground transition-all hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Köpeğimi Kaydet
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Step 3: Park Selection
  return (
    <div className="flex min-h-screen flex-col bg-background safe-top">
      <div className="px-6 pt-8 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <span className="text-lg">🏞️</span>
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">
              Parkını Seç
            </h1>
            <p className="text-sm text-muted-foreground">
              Köpeğinle buluşma noktası
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 pb-24">
        <div className="space-y-3">
          {parks.map((park) => (
            <button
              key={park.id}
              type="button"
              onClick={() => setSelectedParkId(park.id)}
              className={cn(
                "w-full rounded-2xl border-2 p-4 text-left transition-all",
                selectedParkId === park.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📍</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{park.name}</h3>
                  <p className="text-sm text-muted-foreground">Aktif park</p>
                </div>
                {selectedParkId === park.id && (
                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground text-sm">✓</span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {parks.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Henüz aktif park yok</p>
          </div>
        )}
      </div>

      {/* Fixed Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 safe-bottom">
        <button
          type="button"
          onClick={handleParkSelect}
          disabled={loading || !selectedParkId}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Başla
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
