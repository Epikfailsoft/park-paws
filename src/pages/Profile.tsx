import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { EnergyIndicator } from '@/components/ui/EnergyIndicator';
import { Dog, Camera, LogOut, Settings, Loader2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { BEHAVIOR_OPTIONS, ACTIVE_TIME_OPTIONS, ZODIAC_OPTIONS } from '@/types/dogspace';

export default function Profile() {
  const { profile, dogs, signOut, refreshDogs } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const myDog = dogs[0];
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Editable fields
  const [name, setName] = useState(myDog?.name || '');
  const [age, setAge] = useState(myDog?.approximate_age || '');
  const [energyLevel, setEnergyLevel] = useState(myDog?.energy_level || 3);
  const [behavior, setBehavior] = useState(myDog?.behavior || '');
  const [activeTimes, setActiveTimes] = useState<string[]>(myDog?.active_times || []);
  const [zodiacSign, setZodiacSign] = useState(myDog?.zodiac_sign || '');
  const [favoriteGame, setFavoriteGame] = useState(myDog?.favorite_game || '');
  const [isNeutered, setIsNeutered] = useState(myDog?.is_neutered);

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
          behavior: behavior || null,
          active_times: activeTimes.length > 0 ? activeTimes : null,
          zodiac_sign: zodiacSign || null,
          favorite_game: favoriteGame || null,
          is_neutered: isNeutered,
        })
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

  if (!myDog) {
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
              <Dog className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-foreground">
                Köpeğim
              </h1>
              <p className="text-xs text-muted-foreground">
                {profile?.first_name}'ın profili
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

      {/* Dog Photo */}
      <div className="px-4 pt-6">
        <div className="relative mx-auto w-fit">
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
            className="h-32 w-32 rounded-3xl object-cover shadow-elevated"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md"
          >
            <Camera className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Dog Info */}
      <div className="px-4 pt-6 pb-4">
        {editing ? (
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Ad
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="dogspace-input w-full"
              />
            </div>

            {/* Age */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Yaş
              </label>
              <input
                type="text"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="dogspace-input w-full"
              />
            </div>

            {/* Energy Level */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Enerji Seviyesi
              </label>
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

            {/* Behavior */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Davranış
              </label>
              <div className="flex flex-wrap gap-2">
                {BEHAVIOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setBehavior(behavior === opt.value ? '' : opt.value)}
                    className={cn(
                      "rounded-full border-2 px-4 py-2 text-sm font-medium transition-all",
                      behavior === opt.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Times */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Aktif Zamanlar
              </label>
              <div className="flex flex-wrap gap-2">
                {ACTIVE_TIME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setActiveTimes(prev => 
                        prev.includes(opt.value) 
                          ? prev.filter(t => t !== opt.value)
                          : [...prev, opt.value]
                      );
                    }}
                    className={cn(
                      "rounded-full border-2 px-4 py-2 text-sm font-medium transition-all",
                      activeTimes.includes(opt.value)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Zodiac */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Burç (eğlence için)
              </label>
              <select
                value={zodiacSign}
                onChange={(e) => setZodiacSign(e.target.value)}
                className="dogspace-input w-full"
              >
                <option value="">Seç...</option>
                {ZODIAC_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Favorite Game */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Favori Oyun
              </label>
              <input
                type="text"
                value={favoriteGame}
                onChange={(e) => setFavoriteGame(e.target.value)}
                placeholder="Top getirme, çekiştirme..."
                className="dogspace-input w-full"
              />
            </div>

            {/* Neutered */}
            <div className="flex items-center justify-between rounded-xl bg-secondary p-4">
              <span className="text-sm font-medium text-foreground">Kısırlaştırıldı mı?</span>
              <button
                type="button"
                onClick={() => setIsNeutered(!isNeutered)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                  isNeutered 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isNeutered ? "Evet" : "Hayır"}
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
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="text-center">
              <h2 className="font-display text-2xl font-bold text-foreground">
                {myDog.name}
              </h2>
              <p className="text-muted-foreground">{myDog.approximate_age}</p>
              <div className="mt-2 flex justify-center">
                <EnergyIndicator level={myDog.energy_level} size="lg" showLabel />
              </div>
            </div>

            {/* Info Cards */}
            <div className="space-y-3 pt-4">
              {myDog.behavior && (
                <div className="flex items-center justify-between rounded-xl bg-card p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
                  <span className="text-sm text-muted-foreground">Davranış</span>
                  <span className="font-medium text-foreground">
                    {BEHAVIOR_OPTIONS.find(o => o.value === myDog.behavior)?.label}
                  </span>
                </div>
              )}

              {myDog.active_times && myDog.active_times.length > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-card p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
                  <span className="text-sm text-muted-foreground">Aktif Zamanlar</span>
                  <span className="font-medium text-foreground">
                    {myDog.active_times.map(t => 
                      ACTIVE_TIME_OPTIONS.find(o => o.value === t)?.label
                    ).join(', ')}
                  </span>
                </div>
              )}

              {myDog.zodiac_sign && (
                <div className="flex items-center justify-between rounded-xl bg-card p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
                  <span className="text-sm text-muted-foreground">Burç</span>
                  <span className="font-medium text-foreground">
                    {ZODIAC_OPTIONS.find(o => o.value === myDog.zodiac_sign)?.label}
                  </span>
                </div>
              )}

              {myDog.favorite_game && (
                <div className="flex items-center justify-between rounded-xl bg-card p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
                  <span className="text-sm text-muted-foreground">Favori Oyun</span>
                  <span className="font-medium text-foreground">{myDog.favorite_game}</span>
                </div>
              )}

              {myDog.is_neutered !== undefined && (
                <div className="flex items-center justify-between rounded-xl bg-card p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
                  <span className="text-sm text-muted-foreground">Kısırlaştırıldı</span>
                  <span className="font-medium text-foreground">
                    {myDog.is_neutered ? 'Evet' : 'Hayır'}
                  </span>
                </div>
              )}

              {/* Edit prompt */}
              <button
                onClick={() => setEditing(true)}
                className="flex w-full items-center justify-between rounded-xl bg-secondary/50 p-4 text-left transition-all hover:bg-secondary"
              >
                <span className="text-sm text-muted-foreground">
                  Biliyorsan ekle, bilmiyorsan geç
                </span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
