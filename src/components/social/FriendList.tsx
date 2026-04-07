import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, MessageCircle } from 'lucide-react';
import { DogProfileModal } from '@/components/social/DogProfileModal';
import type { Dog, Profile } from '@/types/dogspace';

interface FriendDog {
  harmonyId: string;
  dog: Dog & { owner: Profile };
}

interface FriendListProps {
  onOpenChat: (harmonyId: string) => void;
}

export function FriendList({ onOpenChat }: FriendListProps) {
  const { dogs } = useAuth();
  const [friends, setFriends] = useState<FriendDog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDog, setSelectedDog] = useState<(Dog & { owner: Profile }) | null>(null);
  const myDog = dogs[0];

  useEffect(() => {
    if (!myDog) { setLoading(false); return; }
    fetchFriends();
  }, [myDog]);

  const fetchFriends = async () => {
    if (!myDog) return;
    try {
      const { data, error } = await supabase
        .from('harmonies')
        .select(`*, dog_a:dogs!harmonies_dog_a_id_fkey(*, owner:profiles(*), breed:breeds(*)), dog_b:dogs!harmonies_dog_b_id_fkey(*, owner:profiles(*), breed:breeds(*))`)
        .or(`dog_a_id.eq.${myDog.id},dog_b_id.eq.${myDog.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((h: any) => ({
        harmonyId: h.id,
        dog: h.dog_a.id === myDog.id ? h.dog_b : h.dog_a,
      }));
      setFriends(mapped);
    } catch (err) {
      console.error('Error fetching friends:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  if (friends.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-3xl mb-2">🐾</p>
        <p className="text-sm text-muted-foreground">Henüz köpek arkadaşın yok. Keşfet'ten woof gönder, karşılıklı woof = Harmony!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        🐾 Arkadaşlar ({friends.length})
      </h3>
      {friends.map(f => (
        <div key={f.harmonyId} className="flex items-center gap-3 rounded-xl bg-card p-3 border border-border">
          <button onClick={() => setSelectedDog(f.dog)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
            <img src={f.dog.photo_url} alt={f.dog.name} className="h-12 w-12 rounded-xl object-cover" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground">{f.dog.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {(f.dog as any).breed?.name || ''} · {f.dog.approximate_age}
              </p>
            </div>
          </button>
          <button
            onClick={() => onOpenChat(f.harmonyId)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
        </div>
      ))}
      <DogProfileModal dog={selectedDog} onClose={() => setSelectedDog(null)} />
    </div>
  );
}
