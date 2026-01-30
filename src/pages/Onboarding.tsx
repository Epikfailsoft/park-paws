import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Dog, ArrowRight, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { z } from 'zod';

const dogSchema = z.object({
  name: z.string().min(1, 'Köpeğinin adını gir'),
  approximate_age: z.string().min(1, 'Yaklaşık yaşını gir'),
  energy_level: z.number().min(1).max(5),
});

export default function Onboarding() {
  const { profile, refreshDogs } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [energyLevel, setEnergyLevel] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const result = dogSchema.safeParse({
      name,
      approximate_age: age,
      energy_level: energyLevel,
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
      const { error: dogError } = await supabase
        .from('dogs')
        .insert({
          owner_id: profile.id,
          name,
          approximate_age: age,
          energy_level: energyLevel,
          photo_url: publicUrl,
        });

      if (dogError) throw dogError;

      await refreshDogs();
      toast.success(`${name} eklendi! 🐕`);
      navigate('/discover');
    } catch (error) {
      console.error('Error creating dog:', error);
      toast.error('Bir hata oluştu. Tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

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
              Köpeğini Ekle
            </h1>
            <p className="text-sm text-muted-foreground">
              Köpeğin parkta tanışmaya hazır olsun
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 px-6">
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
            {([1, 2, 3, 4, 5] as const).map((level) => (
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
                {level}
              </button>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>Sakin</span>
            <span>Çok Enerjik</span>
          </div>
        </div>

        {/* Optional hint */}
        <div className="mb-6 rounded-xl bg-secondary/50 p-4">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Biliyorsan ekle, bilmiyorsan geç.</strong> Daha sonra profil sayfasından davranış, sağlık ve ritim bilgilerini ekleyebilirsin.
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 font-medium text-accent-foreground transition-all hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Köpeğimi Ekle
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </form>

      {/* Footer spacing */}
      <div className="h-8" />
    </div>
  );
}
