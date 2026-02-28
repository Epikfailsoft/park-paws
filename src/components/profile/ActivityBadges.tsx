import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { BarChart3 } from 'lucide-react';

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
  gradient: string;
}

const DAY_NAMES_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

export function ActivityBadges({ dogId, profileId, onActivityDays }: ActivityBadgesProps) {
  const [summary, setSummary] = useState<WeeklySummary>({ parkVisits: 0, harmonyCount: 0, wavesSent: 0, activeDays: 0 });
  const [dayActivity, setDayActivity] = useState<boolean[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [dogId, profileId]);

  const fetchData = async () => {
    try {
      const today = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 6);

      const [sessionsRes, harmoniesRes, wavesRes] = await Promise.all([
        supabase.from('park_mode_sessions').select('started_at').eq('dog_id', dogId).gte('started_at', sevenDaysAgo.toISOString()),
        supabase.from('harmonies').select('id').or(`dog_a_id.eq.${dogId},dog_b_id.eq.${dogId}`),
        supabase.from('waves').select('id').eq('from_dog_id', dogId).gte('created_at', sevenDaysAgo.toISOString()),
      ]);

      const sessions = sessionsRes.data || [];
      const harmonies = harmoniesRes.data || [];
      const waves = wavesRes.data || [];

      const days: boolean[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        days.push(sessions.some(s => s.started_at?.split('T')[0] === dateStr));
      }

      const activeDays = days.filter(Boolean).length;
      setDayActivity(days);
      setSummary({ parkVisits: sessions.length, harmonyCount: harmonies.length, wavesSent: waves.length, activeDays });
      onActivityDays?.(activeDays);

      setBadges([
        { id: 'streak_7', label: '7 Gün Seri', icon: '🔥', earned: activeDays >= 7, description: '7 gün üst üste park ziyareti', gradient: 'linear-gradient(135deg, hsl(14 90% 58%), hsl(340 80% 58%))' },
        { id: 'social_10', label: 'Sosyal Kelebek', icon: '🦋', earned: harmonies.length >= 10, description: '10 harmony bağlantısı', gradient: 'linear-gradient(135deg, hsl(260 60% 55%), hsl(290 55% 55%))' },
        { id: 'wave_master', label: 'Wave Ustası', icon: '👋', earned: waves.length >= 20, description: 'Son 7 günde 20+ wave', gradient: 'linear-gradient(135deg, hsl(42 95% 55%), hsl(28 90% 55%))' },
        { id: 'regular', label: 'Düzenli', icon: '📅', earned: activeDays >= 3, description: 'Haftada 3+ gün aktif', gradient: 'var(--gradient-hero)' },
      ]);
    } catch (error) { console.error('Error fetching activity:', error); }
    finally { setLoading(false); }
  };

  if (loading) {
    return <div className="section-card"><div className="h-20 animate-pulse bg-muted rounded-xl" /></div>;
  }

  const today = new Date();

  return (
    <div className="section-card space-y-4">
      <h3 className="font-display text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-harmony/15">
          <BarChart3 className="h-3.5 w-3.5 text-harmony" />
        </span>
        Aktivite & Rozetler
      </h3>

      {/* Weekly activity strip */}
      <div className="flex justify-between gap-1.5">
        {dayActivity.map((active, i) => {
          const date = new Date();
          date.setDate(today.getDate() - (6 - i));
          const isToday = i === 6;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className={cn(
                "w-full aspect-square rounded-xl flex items-center justify-center transition-all max-w-[40px]",
                active ? "text-white shadow-md" : "bg-muted/60 text-muted-foreground",
                isToday && !active && "ring-2 ring-primary/30"
              )} style={active ? { background: 'var(--gradient-hero)' } : {}}>
                {active ? (
                  <span className="text-xs font-bold">✓</span>
                ) : (
                  <span className="text-xs">-</span>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-semibold",
                isToday ? "text-primary" : active ? "text-foreground" : "text-muted-foreground"
              )}>
                {DAY_NAMES_TR[date.getDay()]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Weekly summary - colorful cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { value: summary.parkVisits, label: 'Park', gradient: 'var(--gradient-hero)', emoji: '🌳' },
          { value: summary.harmonyCount, label: 'Harmony', gradient: 'linear-gradient(135deg, hsl(260 60% 55%), hsl(290 55% 55%))', emoji: '💜' },
          { value: summary.wavesSent, label: 'Wave', gradient: 'var(--gradient-warm)', emoji: '👋' },
        ].map((stat) => (
          <div key={stat.label} className="relative overflow-hidden text-center rounded-xl p-3" style={{ background: stat.gradient }}>
            <p className="text-2xl font-extrabold text-white font-display">{stat.value}</p>
            <p className="text-[10px] font-medium text-white/70">{stat.emoji} {stat.label}</p>
          </div>
        ))}
      </div>

      {/* Badges - colorful chips */}
      <div className="flex flex-wrap gap-2">
        {badges.map(badge => (
          <div key={badge.id}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-all",
              !badge.earned && "opacity-30 grayscale"
            )}
            style={badge.earned ? { background: badge.gradient, color: 'white', boxShadow: '0 2px 8px hsl(0 0% 0% / 0.15)' } : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
            title={badge.description}
          >
            <span className="text-sm">{badge.icon}</span>
            <span>{badge.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
