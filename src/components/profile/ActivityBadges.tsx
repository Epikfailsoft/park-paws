import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ActivityBadgesProps {
  dogId: string;
  profileId: string;
  onActivityDays?: (days: number) => void;
}

interface WeeklySummary {
  parkVisits: number;
  harmonyCount: number;
  wavesSent: number;
  activeDays: number;
}

interface Badge {
  id: string;
  label: string;
  icon: string;
  earned: boolean;
  description: string;
}

const DAY_NAMES_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

export function ActivityBadges({ dogId, profileId, onActivityDays }: ActivityBadgesProps) {
  const [summary, setSummary] = useState<WeeklySummary>({ parkVisits: 0, harmonyCount: 0, wavesSent: 0, activeDays: 0 });
  const [dayActivity, setDayActivity] = useState<boolean[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [dogId, profileId]);

  const fetchData = async () => {
    try {
      const today = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 6);

      // Parallel fetches
      const [sessionsRes, harmoniesRes, wavesRes] = await Promise.all([
        supabase
          .from('park_mode_sessions')
          .select('started_at')
          .eq('dog_id', dogId)
          .gte('started_at', sevenDaysAgo.toISOString()),
        supabase
          .from('harmonies')
          .select('id')
          .or(`dog_a_id.eq.${dogId},dog_b_id.eq.${dogId}`),
        supabase
          .from('waves')
          .select('id')
          .eq('from_dog_id', dogId)
          .gte('created_at', sevenDaysAgo.toISOString()),
      ]);

      const sessions = sessionsRes.data || [];
      const harmonies = harmoniesRes.data || [];
      const waves = wavesRes.data || [];

      // Build day activity
      const days: boolean[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        days.push(sessions.some(s => s.started_at?.split('T')[0] === dateStr));
      }

      const activeDays = days.filter(Boolean).length;
      setDayActivity(days);
      setSummary({
        parkVisits: sessions.length,
        harmonyCount: harmonies.length,
        wavesSent: waves.length,
        activeDays,
      });
      onActivityDays?.(activeDays);

      // Calculate badges
      const calculatedBadges: Badge[] = [
        {
          id: 'streak_7',
          label: '7 Gün Seri',
          icon: '🔥',
          earned: activeDays >= 7,
          description: '7 gün üst üste park ziyareti',
        },
        {
          id: 'social_10',
          label: 'Sosyal Kelebek',
          icon: '🦋',
          earned: harmonies.length >= 10,
          description: '10 harmony bağlantısı',
        },
        {
          id: 'wave_master',
          label: 'Wave Ustası',
          icon: '👋',
          earned: waves.length >= 20,
          description: 'Son 7 günde 20+ wave',
        },
        {
          id: 'regular',
          label: 'Düzenli',
          icon: '📅',
          earned: activeDays >= 3,
          description: 'Haftada 3+ gün aktif',
        },
      ];

      setBadges(calculatedBadges);
    } catch (error) {
      console.error('Error fetching activity:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-card p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="h-20 animate-pulse bg-muted rounded-xl" />
      </div>
    );
  }

  const today = new Date();

  return (
    <div className="rounded-2xl bg-card p-4 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
      <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        📊 Aktivite & Rozetler
      </h3>

      {/* Weekly activity strip */}
      <div className="flex justify-between gap-1">
        {dayActivity.map((active, i) => {
          const date = new Date();
          date.setDate(today.getDate() - (6 - i));
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className={cn(
                "w-full aspect-square rounded-lg flex items-center justify-center transition-all max-w-[36px]",
                active ? "bg-primary" : "bg-muted"
              )}>
                {active ? (
                  <span className="text-[10px] text-primary-foreground font-bold">✓</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">-</span>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium",
                i === 6 ? "text-primary" : "text-muted-foreground"
              )}>
                {DAY_NAMES_TR[date.getDay()]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Weekly summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center rounded-xl bg-secondary/50 p-2">
          <p className="text-lg font-bold text-foreground">{summary.parkVisits}</p>
          <p className="text-[10px] text-muted-foreground">Park</p>
        </div>
        <div className="text-center rounded-xl bg-secondary/50 p-2">
          <p className="text-lg font-bold text-foreground">{summary.harmonyCount}</p>
          <p className="text-[10px] text-muted-foreground">Harmony</p>
        </div>
        <div className="text-center rounded-xl bg-secondary/50 p-2">
          <p className="text-lg font-bold text-foreground">{summary.wavesSent}</p>
          <p className="text-[10px] text-muted-foreground">Wave</p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        {badges.map(badge => (
          <div
            key={badge.id}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
              badge.earned
                ? "bg-primary/10 text-primary"
                : "bg-muted/50 text-muted-foreground opacity-50"
            )}
            title={badge.description}
          >
            <span>{badge.icon}</span>
            <span>{badge.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
