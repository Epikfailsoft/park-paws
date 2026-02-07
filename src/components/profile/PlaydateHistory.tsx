import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Calendar } from 'lucide-react';

interface PlaydateHistoryProps {
  dogId: string;
}

interface PlaydateEntry {
  id: string;
  partner_dog_name: string;
  partner_dog_photo: string;
  park_name?: string;
  playdate_date: string;
}

export function PlaydateHistory({ dogId }: PlaydateHistoryProps) {
  const [history, setHistory] = useState<PlaydateEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [dogId]);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('playdate_history')
        .select(`
          id,
          playdate_date,
          notes,
          partner_dog:dogs!playdate_history_partner_dog_id_fkey(name, photo_url),
          park:parks!playdate_history_park_id_fkey(name)
        `)
        .eq('dog_id', dogId)
        .order('playdate_date', { ascending: false })
        .limit(7);

      if (error) throw error;

      const entries: PlaydateEntry[] = (data || []).map((item: any) => ({
        id: item.id,
        partner_dog_name: item.partner_dog?.name || 'Bilinmiyor',
        partner_dog_photo: item.partner_dog?.photo_url || '',
        park_name: item.park?.name,
        playdate_date: item.playdate_date,
      }));

      setHistory(entries);
    } catch (error) {
      console.error('Error fetching playdate history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-card p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="h-24 animate-pulse bg-muted rounded-xl" />
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="rounded-2xl bg-card p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
      <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        🐕 Playdate Geçmişi
      </h3>

      {history.length === 0 ? (
        <div className="text-center py-6">
          <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Henüz kayıtlı playdate yok
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3"
            >
              {entry.partner_dog_photo ? (
                <img
                  src={entry.partner_dog_photo}
                  alt={entry.partner_dog_name}
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-lg">
                  🐕
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {entry.partner_dog_name} ile
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.park_name && `${entry.park_name} · `}
                  {formatDate(entry.playdate_date)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
