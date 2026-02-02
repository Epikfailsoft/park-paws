import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { EnergyIndicator } from '@/components/ui/EnergyIndicator';
import { Dog, Camera, LogOut, Settings, Loader2, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SOCIAL_STYLE_OPTIONS, TRIGGER_OPTIONS, formatOwnerName } from '@/types/dogspace';

export default function Profile() {
  const { profile, dogs, signOut, refreshDogs } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const myDog = dogs[0];
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);

  // Editable fields
  const [name, setName] = useState(myDog?.name || '');
  const [age, setAge] = useState(myDog?.approximate_age || '');
  const [energyLevel, setEnergyLevel] = useState(myDog?.energy_level || 3);
  const [socialStyle, setSocialStyle] = useState<'FRIENDLY' | 'NEUTRAL' | 'SELECTIVE' | ''>(myDog?.social_style || '');
  const [triggers, setTriggers] = useState<string[]>(myDog?.triggers || []);
  const [neutered, setNeutered] = useState(myDog?.neutered);

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
          triggers: triggers.length > 0 ? triggers : null,
          neutered,
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

  const handleLostMode = async () => {
    if (!myDog) return;

    setLoading(true);
    try {
      const newLostState = !myDog.is_lost;
      
      await supabase
        .from('dogs')
        .update({ is_lost: newLostState })
        .eq('id', myDog.id);

      if (newLostState) {
        // Create notification for park users
        const { data: lostProfile } = await supabase
          .from('dog_lost_profile')
          .select('last_seen_park_id')
          .eq('dog_id', myDog.id)
          .single();

        if (lostProfile?.last_seen_park_id) {
          await supabase
            .from('notifications')
            .insert({
              park_id: lostProfile.last_seen_park_id,
              type: 'lost_dog',
              payload: {
                dog_id: myDog.id,
                dog_name: myDog.name,
                breed: myDog.breed?.name,
              },
            });
        }

        toast.success('Lost Mode aktif! Parkta aktiflere bildirim gönderildi.');
      } else {
        toast.info('Lost Mode kapatıldı.');
      }

      await refreshDogs();
      setShowLostModal(false);
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
            className={cn(
              "h-32 w-32 rounded-3xl object-cover shadow-elevated",
              myDog.is_lost && "ring-4 ring-[hsl(var(--energy-5))]"
            )}
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

            {/* Social Style */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Sosyal Tarz
              </label>
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
              <label className="mb-2 block text-sm font-medium text-foreground">
                Tetikleyiciler (Hassasiyetler)
              </label>
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
              <p className="mt-1 text-xs text-muted-foreground">
                Bu bilgiler güvenli playdate için kullanılır
              </p>
            </div>

            {/* Neutered */}
            <div className="flex items-center justify-between rounded-xl bg-secondary p-4">
              <span className="text-sm font-medium text-foreground">Kısırlaştırıldı mı?</span>
              <button
                type="button"
                onClick={() => setNeutered(!neutered)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                  neutered 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
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
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="text-center">
              <h2 className="font-display text-2xl font-bold text-foreground">
                {myDog.name}
              </h2>
              <p className="text-muted-foreground">
                {myDog.breed?.name} · {myDog.approximate_age}
              </p>
              <div className="mt-2 flex justify-center">
                <EnergyIndicator level={myDog.energy_level} size="lg" showLabel />
              </div>
            </div>

            {/* Neutered Badge */}
            <div className="flex justify-center">
              <span className={cn(
                "rounded-full px-4 py-2 text-sm",
                myDog.neutered 
                  ? "bg-primary/10 text-primary" 
                  : "bg-muted text-muted-foreground"
              )}>
                {myDog.neutered ? '✓ Kısırlaştırıldı' : 'Kısırlaştırılmadı'}
              </span>
            </div>

            {/* Info Cards */}
            <div className="space-y-3 pt-4">
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
                <span className="text-sm text-muted-foreground">
                  Biliyorsan ekle, bilmiyorsan geç
                </span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}

        {/* Lost Mode Section */}
        <div className="mt-8 border-t border-border pt-6">
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
              <p className="text-muted-foreground mb-6">
                Lost Mode aktif edilsin mi? İletişim numaranız yalnızca şu an parkta aktif olanlara açılacaktır.
              </p>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowLostModal(false)}
                className="flex-1 rounded-xl border border-border py-3 font-medium text-foreground"
              >
                İptal
              </button>
              <button
                onClick={handleLostMode}
                disabled={loading}
                className={cn(
                  "flex-1 rounded-xl py-3 font-semibold text-white",
                  myDog.is_lost ? "bg-primary" : "bg-[hsl(var(--energy-5))]"
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
