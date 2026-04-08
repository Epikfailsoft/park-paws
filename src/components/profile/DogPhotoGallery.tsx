import { useState, useRef, useEffect } from 'react';
import { Camera, Loader2, X, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DogPhoto {
  id: string;
  photo_url: string;
  sort_order: number;
  is_primary: boolean;
}

interface DogPhotoGalleryProps {
  dogId: string;
  mainPhotoUrl: string;
  onMainPhotoChange: (url: string) => void;
}

const MAX_PHOTOS = 3;

export function DogPhotoGallery({ dogId, mainPhotoUrl, onMainPhotoChange }: DogPhotoGalleryProps) {
  const [photos, setPhotos] = useState<DogPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPhotos();
  }, [dogId]);

  const loadPhotos = async () => {
    const { data } = await supabase
      .from('dog_photos')
      .select('*')
      .eq('dog_id', dogId)
      .order('sort_order');
    if (data) setPhotos(data as DogPhoto[]);
  };

  // All displayable images: main + extras
  const allImages = [
    { id: 'main', photo_url: mainPhotoUrl, is_primary: true, sort_order: -1 },
    ...photos.filter(p => p.photo_url !== mainPhotoUrl),
  ];

  const canAddMore = allImages.length < MAX_PHOTOS;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!canAddMore) {
      toast.error('En fazla 3 fotoğraf ekleyebilirsiniz');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `dogs/${dogId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('dog-photos').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('dog-photos').getPublicUrl(path);

      await supabase.from('dog_photos').insert({
        dog_id: dogId,
        photo_url: publicUrl,
        sort_order: photos.length,
        is_primary: false,
      } as any);

      await loadPhotos();
      toast.success('Fotoğraf eklendi!');
    } catch {
      toast.error('Yükleme başarısız');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (photo: DogPhoto | { id: string; photo_url: string; is_primary: boolean }) => {
    if (photo.is_primary) {
      toast.error('Ana fotoğraf silinemez');
      return;
    }
    if (photo.id === 'main') return;
    await supabase.from('dog_photos').delete().eq('id', photo.id);
    await loadPhotos();
    setActiveIndex(0);
    toast.success('Fotoğraf silindi');
  };

  const handleSetPrimary = async (photo: DogPhoto) => {
    if (photo.photo_url === mainPhotoUrl) return;
    // Update dog's main photo
    await supabase.from('dogs').update({ photo_url: photo.photo_url } as any).eq('id', dogId);
    onMainPhotoChange(photo.photo_url);
    toast.success('Ana fotoğraf değiştirildi!');
  };

  return (
    <div className="space-y-2">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      {/* Main photo display */}
      <div className="relative w-full aspect-square max-w-[160px] mx-auto">
        <img
          src={allImages[activeIndex]?.photo_url || mainPhotoUrl}
          alt=""
          className="h-full w-full rounded-2xl object-cover ring-2 ring-primary/20 shadow-lg"
        />
        {/* Delete button for non-primary */}
        {activeIndex > 0 && allImages[activeIndex] && (
          <button
            onClick={() => handleDelete(allImages[activeIndex])}
            className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white shadow-md"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      <div className="flex items-center justify-center gap-2">
        {allImages.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setActiveIndex(i)}
            onDoubleClick={() => {
              if (i > 0 && 'sort_order' in img && img.id !== 'main') {
                handleSetPrimary(img as DogPhoto);
              }
            }}
            className={cn(
              "h-10 w-10 rounded-lg object-cover overflow-hidden ring-2 transition-all",
              i === activeIndex ? "ring-primary scale-110" : "ring-transparent opacity-60 hover:opacity-100"
            )}
          >
            <img src={img.photo_url} alt="" className="h-full w-full object-cover" />
          </button>
        ))}

        {/* Add photo button */}
        {canAddMore && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary transition-all"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </button>
        )}
      </div>

      {allImages.length > 1 && (
        <p className="text-[10px] text-center text-muted-foreground">Ana fotoğrafı değiştirmek için çift dokun</p>
      )}
    </div>
  );
}
