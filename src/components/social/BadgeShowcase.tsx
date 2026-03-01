import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface BadgeWithDetails {
  id: string;
  earned_at: string;
  badge: {
    code: string;
    name: string;
    description: string;
    icon: string;
  };
}

export function BadgeShowcase() {
  const { dogs } = useAuth();
  const [badges, setBadges] = useState<BadgeWithDetails[]>([]);
  const [allBadges, setAllBadges] = useState<{ code: string; name: string; description: string; icon: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const myDog = dogs[0];

  useEffect(() => {
    fetchBadges();
  }, [myDog]);

  const fetchBadges = async () => {
    try {
      // Get all available badges
      const { data: all } = await supabase.from('badges').select('code, name, description, icon');
      setAllBadges((all || []) as any);

      if (myDog) {
        const { data: earned } = await supabase
          .from('dog_badges')
          .select('id, earned_at, badge:badges(code, name, description, icon)')
          .eq('dog_id', myDog.id);
        setBadges((earned || []) as unknown as BadgeWithDetails[]);
      }
    } catch (error) {
      console.error('Error fetching badges:', error);
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

  const earnedCodes = new Set(badges.map(b => b.badge.code));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {allBadges.map(badge => {
          const earned = earnedCodes.has(badge.code);
          return (
            <div
              key={badge.code}
              className={`rounded-xl border p-3 text-center transition-all ${
                earned
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border bg-muted/30 opacity-50'
              }`}
            >
              <span className="text-2xl">{badge.icon}</span>
              <p className="mt-1 font-semibold text-xs text-foreground">{badge.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{badge.description}</p>
              {earned && (
                <span className="mt-1 inline-block text-[10px] text-primary font-medium">✅ Kazanıldı</span>
              )}
            </div>
          );
        })}
      </div>

      {allBadges.length === 0 && (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">🏆</p>
          <p className="text-sm text-muted-foreground">Rozetler yakında!</p>
        </div>
      )}
    </div>
  );
}
