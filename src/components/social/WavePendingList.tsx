import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface PendingWave {
  id: string;
  from_dog_id: string;
  to_dog_id: string;
  dog_name: string;
  photo_url: string;
  breed_name: string;
  wave_date: string;
}

export function WavePendingList() {
  const { dogs, profile } = useAuth();
  const [incomingWaves, setIncomingWaves] = useState<PendingWave[]>([]);
  const [outgoingWaves, setOutgoingWaves] = useState<PendingWave[]>([]);
  const [loading, setLoading] = useState(true);
  const myDog = dogs[0];

  useEffect(() => {
    if (!myDog) { setLoading(false); return; }
    fetchWaves();
  }, [myDog]);

  const fetchWaves = async () => {
    if (!myDog) return;
    try {
      // Incoming waves (others waved at me, no harmony yet)
      const { data: incoming } = await supabase
        .from('waves')
        .select('id, from_dog_id, to_dog_id, wave_date')
        .eq('to_dog_id', myDog.id)
        .order('created_at', { ascending: false })
        .limit(20);

      // Outgoing waves (I waved, no harmony yet)
      const { data: outgoing } = await supabase
        .from('waves')
        .select('id, from_dog_id, to_dog_id, wave_date')
        .eq('from_dog_id', myDog.id)
        .order('created_at', { ascending: false })
        .limit(20);

      // Get harmonies to filter out matched ones
      const { data: harmonies } = await supabase
        .from('harmonies')
        .select('dog_a_id, dog_b_id')
        .or(`dog_a_id.eq.${myDog.id},dog_b_id.eq.${myDog.id}`);

      const harmonyDogIds = new Set<string>();
      harmonies?.forEach(h => {
        harmonyDogIds.add(h.dog_a_id === myDog.id ? h.dog_b_id : h.dog_a_id);
      });

      // Filter out harmonized dogs
      const pendingIncoming = (incoming || []).filter(w => !harmonyDogIds.has(w.from_dog_id));
      const pendingOutgoing = (outgoing || []).filter(w => !harmonyDogIds.has(w.to_dog_id));

      // Fetch dog details for pending waves
      const dogIds = [
        ...pendingIncoming.map(w => w.from_dog_id),
        ...pendingOutgoing.map(w => w.to_dog_id),
      ];

      if (dogIds.length > 0) {
        const { data: dogsData } = await supabase
          .from('dogs')
          .select('id, name, photo_url, breed:breeds(name)')
          .in('id', dogIds);

        const dogMap = new Map(dogsData?.map(d => [d.id, d]) || []);

        setIncomingWaves(pendingIncoming.map(w => {
          const dog = dogMap.get(w.from_dog_id) as any;
          return {
            ...w,
            dog_name: dog?.name || '?',
            photo_url: dog?.photo_url || '',
            breed_name: dog?.breed?.name || '',
          };
        }));

        setOutgoingWaves(pendingOutgoing.map(w => {
          const dog = dogMap.get(w.to_dog_id) as any;
          return {
            ...w,
            dog_name: dog?.name || '?',
            photo_url: dog?.photo_url || '',
            breed_name: dog?.breed?.name || '',
          };
        }));
      }
    } catch (error) {
      console.error('Error fetching waves:', error);
    } finally {
      setLoading(false);
    }
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
              <div key={w.id} className="flex items-center gap-3 rounded-xl bg-card p-3 border border-primary/20">
                <img src={w.photo_url} alt={w.dog_name} className="h-10 w-10 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{w.dog_name}</p>
                  <p className="text-xs text-muted-foreground">{w.breed_name}</p>
                </div>
                <span className="text-xs text-primary font-medium">Wave bekliyor</span>
              </div>
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
              <div key={w.id} className="flex items-center gap-3 rounded-xl bg-card p-3">
                <img src={w.photo_url} alt={w.dog_name} className="h-10 w-10 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{w.dog_name}</p>
                  <p className="text-xs text-muted-foreground">{w.breed_name}</p>
                </div>
                <span className="text-xs text-muted-foreground">Yanıt bekleniyor</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
