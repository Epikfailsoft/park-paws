import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { DogProfileModal } from '@/components/social/DogProfileModal';
import type { Dog, Profile } from '@/types/dogspace';

interface PendingWave {
  id: string;
  from_dog_id: string;
  to_dog_id: string;
  dog_name: string;
  photo_url: string;
  breed_name: string;
  wave_date: string;
  // Extra fields for modal
  dog_id: string;
  approximate_age: string;
  energy_level: number;
  gender: string | null;
  social_style: string | null;
  neutered: boolean;
  bio: string | null;
  likes: string[] | null;
  dislikes: string[] | null;
  triggers: string[] | null;
  weight_kg: number | null;
  owner_display_name: string;
  owner_photo_url: string | null;
}

export function WavePendingList() {
  const { dogs, profile } = useAuth();
  const [incomingWaves, setIncomingWaves] = useState<PendingWave[]>([]);
  const [outgoingWaves, setOutgoingWaves] = useState<PendingWave[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDog, setSelectedDog] = useState<(Dog & { owner: Profile }) | null>(null);
  const myDog = dogs[0];

  useEffect(() => {
    if (!myDog) { setLoading(false); return; }
    fetchWaves();
  }, [myDog]);

  const fetchWaves = async () => {
    if (!myDog) return;
    try {
      const { data: incoming } = await supabase
        .from('waves')
        .select('id, from_dog_id, to_dog_id, wave_date')
        .eq('to_dog_id', myDog.id)
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: outgoing } = await supabase
        .from('waves')
        .select('id, from_dog_id, to_dog_id, wave_date')
        .eq('from_dog_id', myDog.id)
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: harmonies } = await supabase
        .from('harmonies')
        .select('dog_a_id, dog_b_id')
        .or(`dog_a_id.eq.${myDog.id},dog_b_id.eq.${myDog.id}`);

      const harmonyDogIds = new Set<string>();
      harmonies?.forEach(h => {
        harmonyDogIds.add(h.dog_a_id === myDog.id ? h.dog_b_id : h.dog_a_id);
      });

      const pendingIncoming = (incoming || []).filter(w => !harmonyDogIds.has(w.from_dog_id));
      const pendingOutgoing = (outgoing || []).filter(w => !harmonyDogIds.has(w.to_dog_id));

      const dogIds = [
        ...pendingIncoming.map(w => w.from_dog_id),
        ...pendingOutgoing.map(w => w.to_dog_id),
      ];

      if (dogIds.length > 0) {
        const { data: dogsData } = await supabase
          .from('dogs')
          .select('id, name, photo_url, approximate_age, energy_level, gender, social_style, neutered, bio, likes, dislikes, triggers, weight_kg, owner_name_stub, owner_photo_stub, breed:breeds(name)')
          .in('id', dogIds);

        const dogMap = new Map(dogsData?.map(d => [d.id, d]) || []);

        const mapWave = (w: any, dogId: string): PendingWave => {
          const dog = dogMap.get(dogId) as any;
          return {
            ...w,
            dog_id: dogId,
            dog_name: dog?.name || '?',
            photo_url: dog?.photo_url || '',
            breed_name: dog?.breed?.name || '',
            approximate_age: dog?.approximate_age || '',
            energy_level: dog?.energy_level || 2,
            gender: dog?.gender || null,
            social_style: dog?.social_style || null,
            neutered: dog?.neutered || false,
            bio: dog?.bio || null,
            likes: dog?.likes || null,
            dislikes: dog?.dislikes || null,
            triggers: dog?.triggers || null,
            weight_kg: dog?.weight_kg || null,
            owner_display_name: dog?.owner_name_stub || '',
            owner_photo_url: dog?.owner_photo_stub || null,
          };
        };

        setIncomingWaves(pendingIncoming.map(w => mapWave(w, w.from_dog_id)));
        setOutgoingWaves(pendingOutgoing.map(w => mapWave(w, w.to_dog_id)));
      }
    } catch (error) {
      console.error('Error fetching waves:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDogModal = (wave: PendingWave) => {
    setSelectedDog({
      id: wave.dog_id,
      name: wave.dog_name,
      photo_url: wave.photo_url,
      approximate_age: wave.approximate_age,
      energy_level: wave.energy_level as any,
      gender: wave.gender as any,
      social_style: wave.social_style as any,
      neutered: wave.neutered,
      bio: wave.bio,
      likes: wave.likes,
      dislikes: wave.dislikes,
      triggers: wave.triggers,
      weight_kg: wave.weight_kg,
      breed: wave.breed_name ? { id: '', name: wave.breed_name, code: '', created_at: '' } : undefined,
      owner: {
        id: '',
        user_id: '',
        display_name: wave.owner_display_name,
        photo_url: wave.owner_photo_url,
        created_at: '',
        updated_at: '',
      },
    } as any);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (incomingWaves.length === 0 && outgoingWaves.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-3xl mb-2">👋</p>
        <p className="text-sm text-muted-foreground">
          Henüz bekleyen wave yok. Keşfet'ten yeni köpeklere wave gönder!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {incomingWaves.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            📥 Sana wave atan ({incomingWaves.length})
          </h3>
          <div className="space-y-2">
            {incomingWaves.map(w => (
              <button
                key={w.id}
                onClick={() => openDogModal(w)}
                className="flex items-center gap-3 rounded-xl bg-card p-3 border border-primary/20 w-full text-left transition-all active:scale-[0.98]"
              >
                <img src={w.photo_url} alt={w.dog_name} className="h-12 w-12 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{w.dog_name}</p>
                  <p className="text-xs text-muted-foreground">{w.breed_name} · {w.approximate_age}</p>
                </div>
                <span className="text-xs text-primary font-medium">Profili Gör →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {outgoingWaves.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            📤 Senin wave'lerin ({outgoingWaves.length})
          </h3>
          <div className="space-y-2">
            {outgoingWaves.map(w => (
              <button
                key={w.id}
                onClick={() => openDogModal(w)}
                className="flex items-center gap-3 rounded-xl bg-card p-3 w-full text-left transition-all active:scale-[0.98]"
              >
                <img src={w.photo_url} alt={w.dog_name} className="h-12 w-12 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{w.dog_name}</p>
                  <p className="text-xs text-muted-foreground">{w.breed_name} · {w.approximate_age}</p>
                </div>
                <span className="text-xs text-muted-foreground">Yanıt bekleniyor</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <DogProfileModal dog={selectedDog} onClose={() => setSelectedDog(null)} />
    </div>
  );
}
