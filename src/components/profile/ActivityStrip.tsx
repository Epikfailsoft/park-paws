import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ActivityStripProps {
  dogId: string;
}

interface DayActivity {
  date: string;
  dayName: string;
  hasActivity: boolean;
  sessionCount: number;
}

const DAY_NAMES_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

export function ActivityStrip({ dogId }: ActivityStripProps) {
  const [days, setDays] = useState<DayActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivity();
  }, [dogId]);

  const fetchActivity = async () => {
    try {
      // Get last 7 days
      const today = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 6);

      const { data: sessions } = await supabase
        .from('park_mode_sessions')
        .select('started_at')
        .eq('dog_id', dogId)
        .gte('started_at', sevenDaysAgo.toISOString())
        .order('started_at', { ascending: true });

      // Build 7-day array
      const daysArray: DayActivity[] = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const sessionsOnDay = sessions?.filter(s => 
          s.started_at.split('T')[0] === dateStr
        ) || [];

        daysArray.push({
          date: dateStr,
          dayName: DAY_NAMES_TR[date.getDay()],
          hasActivity: sessionsOnDay.length > 0,
          sessionCount: sessionsOnDay.length,
        });
      }

      setDays(daysArray);
    } catch (error) {
      console.error('Error fetching activity:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-card p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="h-16 animate-pulse bg-muted rounded-xl" />
      </div>
    );
  }

  const activeDays = days.filter(d => d.hasActivity).length;

  return (
    <div className="rounded-2xl bg-card p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          📊 Son 7 Gün
        </h3>
        <span className="text-xs text-muted-foreground">
          {activeDays}/7 gün aktif
        </span>
      </div>

      <div className="flex justify-between gap-1">
        {days.map((day, index) => (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5">
            {/* Activity Dot */}
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
              day.hasActivity 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted"
            )}>
              {day.hasActivity ? (
                <span className="text-xs font-bold">{day.sessionCount}</span>
              ) : (
                <span className="text-xs text-muted-foreground">-</span>
              )}
            </div>
            {/* Day Name */}
            <span className={cn(
              "text-[10px] font-medium",
              index === 6 ? "text-primary" : "text-muted-foreground"
            )}>
              {day.dayName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
