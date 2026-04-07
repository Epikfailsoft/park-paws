import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, AlertTriangle } from 'lucide-react';
import { DogProfileModal } from '@/components/social/DogProfileModal';
import type { Dog, Profile } from '@/types/dogspace';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface LostDog {
  id: string;
  name: string;
  photo_url: string;
  breed_name: string;
  emergency_phone: string;
  last_seen_park: string | null;
  lost_started_at: string;
}

interface ActivityItem {
  id: string;
  type: 'wave_in' | 'wave_out' | 'harmony';
  dog_name: string;
  photo_url: string;
  created_at: string;
}

export function ActivityLog() {
  const { dogs, selectedPark } = useAuth();
  const [lostDogs, setLostDogs] = useState<LostDog[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDog, setSelectedDog] = useState<(Dog & { owner: Profile }) | null>(null);
  const myDog = dogs[0];

  useEffect(() => {
    fetchData();
  }, [myDog]);

  const fetchData = async () => {
    try {
      // Fetch lost dogs
      const { data: lost } = await supabase
        .from('dogs')
        .select('id, name, photo_url, breed:breeds(name), dog_lost_profile(emergency_phone, last_seen_park_id, lost_started_at)')
        .eq('is_lost', true)
        .is('deleted_at', null)
        .limit(10);

      if (lost) {
        const lostMapped: LostDog[] = lost
          .filter((d: any) => d.dog_lost_profile && d.dog_lost_profile.length > 0)
          .map((d: any) => ({
            id: d.id,
            name: d.name,
            photo_url: d.photo_url,
            breed_name: d.breed?.name || '',
            emergency_phone: d.dog_lost_profile[0]?.emergency_phone || '',
            last_seen_park: null,
            lost_started_at: d.dog_lost_profile[0]?.lost_started_at || '',
          }));
        setLostDogs(lostMapped);
      }

      // Fetch recent activity (waves)
      if (myDog) {
        const { data: inWaves } = await supabase
          .from('waves')
          .select('id, from_dog_id, created_at, dog:dogs!waves_from_dog_id_fkey(name, photo_url)')
          .eq('to_dog_id', myDog.id)
          .order('created_at', { ascending: false })
          .limit(10);

        const { data: outWaves } = await supabase
          .from('waves')
          .select('id, to_dog_id, created_at, dog:dogs!waves_to_dog_id_fkey(name, photo_url)')
          .eq('from_dog_id', myDog.id)
          .order('created_at', { ascending: false })
          .limit(10);

        const items: ActivityItem[] = [
          ...(inWaves || []).map((w: any) => ({
            id: `in-${w.id}`,
            type: 'wave_in' as const,
            dog_name: w.dog?.name || '?',
            photo_url: w.dog?.photo_url || '',
            created_at: w.created_at,
          })),
          ...(outWaves || []).map((w: any) => ({
            id: `out-${w.id}`,
            type: 'wave_out' as const,
            dog_name: w.dog?.name || '?',
            photo_url: w.dog?.photo_url || '',
            created_at: w.created_at,
          })),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 20);

        setActivities(items);
      }
    } catch (err) {
      console.error('Error fetching activity:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Lost Dogs */}
      {lostDogs.length > 0 && (
        <div>
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-destructive uppercase tracking-wide mb-3">
            <AlertTriangle className="h-3.5 w-3.5" /> Kayıp Köpekler ({lostDogs.length})
          </h3>
          <div className="space-y-2">
            {lostDogs.map(d => (
              <div key={d.id} className="flex items-center gap-3 rounded-xl bg-destructive/10 border border-destructive/20 p-3">
                <img src={d.photo_url} alt={d.name} className="h-12 w-12 rounded-xl object-cover ring-2 ring-destructive/40" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.breed_name}</p>
                  {d.lost_started_at && (
                    <p className="text-[10px] text-destructive">
                      {formatDistanceToNow(new Date(d.lost_started_at), { addSuffix: true, locale: tr })} kayboldu
                    </p>
                  )}
                </div>
                {d.emergency_phone && (
                  <a href={`tel:${d.emergency_phone}`} className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground">
                    Ara
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          📋 Son Aktivite
        </h3>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Henüz aktivite yok</p>
        ) : (
          <div className="space-y-2">
            {activities.map(a => (
              <div key={a.id} className="flex items-center gap-3 rounded-xl bg-card p-2.5 border border-border">
                <img src={a.photo_url} alt={a.dog_name} className="h-9 w-9 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground">
                    {a.type === 'wave_in' ? (
                      <><span className="font-semibold">{a.dog_name}</span> sana woof attı 👋</>
                    ) : (
                      <>Sen <span className="font-semibold">{a.dog_name}</span>'a woof attın 👋</>
                    )}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: tr })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
