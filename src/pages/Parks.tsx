import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ParkBadge } from '@/components/ui/ParkBadge';
import { MapPin, Users, Check, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Park } from '@/types/dogspace';
import { RATE_LIMITS } from '@/types/dogspace';

export default function Parks() {
  const { profile, dogs } = useAuth();
  const [parks, setParks] = useState<Park[]>([]);
  const [approvals, setApprovals] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [parkModeActive, setParkModeActive] = useState(false);
  const [activeParkId, setActiveParkId] = useState<string | null>(null);

  const myDog = dogs[0];

  useEffect(() => {
    fetchParks();
    if (myDog) {
      fetchParkModeStatus();
    }
  }, [myDog]);

  const fetchParks = async () => {
    try {
      const { data, error } = await supabase
        .from('parks')
        .select('*')
        .order('status', { ascending: false })
        .order('name');

      if (error) throw error;
      setParks((data as Park[]) || []);

      // Fetch user's approvals
      if (profile) {
        const { data: approvalsData } = await supabase
          .from('park_approvals')
          .select('park_id')
          .eq('user_id', profile.id);

        if (approvalsData) {
          const approvalMap: Record<string, boolean> = {};
          approvalsData.forEach(a => {
            approvalMap[a.park_id] = true;
          });
          setApprovals(approvalMap);
        }
      }
    } catch (error) {
      console.error('Error fetching parks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchParkModeStatus = async () => {
    if (!myDog) return;

    const { data } = await supabase
      .from('dogs')
      .select('is_active_in_park, current_park_id')
      .eq('id', myDog.id)
      .single();

    if (data) {
      setParkModeActive(data.is_active_in_park || false);
      setActiveParkId(data.current_park_id || null);
    }
  };

  const handleApprove = async (parkId: string) => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('park_approvals')
        .insert({
          park_id: parkId,
          user_id: profile.id,
        });

      if (error) {
        if (error.code === '23505') {
          toast.info('Bu parka zaten onay verdin!');
          return;
        }
        throw error;
      }

      // Update local state
      setApprovals(prev => ({ ...prev, [parkId]: true }));
      
      // Update park approval count
      const park = parks.find(p => p.id === parkId);
      if (park) {
        const newCount = park.approval_count + 1;
        
        if (newCount >= RATE_LIMITS.PARK_APPROVAL_THRESHOLD) {
          // Park becomes active
          await supabase
            .from('parks')
            .update({ 
              status: 'active', 
              activated_at: new Date().toISOString(),
              approval_count: newCount,
              is_beta: true,
            })
            .eq('id', parkId);

          toast.success('Park aktif oldu! 🎉');
        } else {
          await supabase
            .from('parks')
            .update({ approval_count: newCount })
            .eq('id', parkId);

          toast.success(`Onay verildi! (${newCount}/${RATE_LIMITS.PARK_APPROVAL_THRESHOLD})`);
        }

        fetchParks();
      }
    } catch (error) {
      console.error('Error approving park:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const toggleParkMode = async (parkId: string) => {
    if (!myDog) return;

    const newState = activeParkId === parkId ? false : true;

    try {
      const { error } = await supabase
        .from('dogs')
        .update({
          is_active_in_park: newState,
          current_park_id: newState ? parkId : null,
          park_mode_started_at: newState ? new Date().toISOString() : null,
          last_active_at: new Date().toISOString(),
        })
        .eq('id', myDog.id);

      if (error) throw error;

      setParkModeActive(newState);
      setActiveParkId(newState ? parkId : null);
      
      if (newState) {
        toast.success('Parkta aktif oldun! 4 saat sonra otomatik kapanacak.');
      } else {
        toast.info('Park modu kapatıldı.');
      }
    } catch (error) {
      console.error('Error toggling park mode:', error);
      toast.error('Bir hata oluştu');
    }
  };

  // Count active dogs in each park
  const [activeDogCounts, setActiveDogCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchActiveCounts = async () => {
      const { data } = await supabase
        .from('dogs')
        .select('current_park_id')
        .eq('is_active_in_park', true);

      if (data) {
        const counts: Record<string, number> = {};
        data.forEach(d => {
          if (d.current_park_id) {
            counts[d.current_park_id] = (counts[d.current_park_id] || 0) + 1;
          }
        });
        setActiveDogCounts(counts);
      }
    };

    fetchActiveCounts();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-top safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <MapPin className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">
              Parklar
            </h1>
            <p className="text-xs text-muted-foreground">
              Köpeğinle buluşma noktaları
            </p>
          </div>
        </div>
      </header>

      {/* Parks List */}
      <div className="px-4 py-4 space-y-3">
        {parks.map((park) => {
          const isActive = park.status === 'active';
          const isParkModeHere = activeParkId === park.id;
          const activeDogsHere = activeDogCounts[park.id] || 0;

          return (
            <div
              key={park.id}
              className={cn(
                "rounded-2xl border-2 bg-card p-4 transition-all",
                isParkModeHere ? "border-park-active" : "border-transparent"
              )}
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display font-semibold text-foreground">
                      {park.name}
                    </h3>
                    <ParkBadge status={park.status} showBeta={park.is_beta} />
                  </div>
                  {park.location && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {park.location}
                    </p>
                  )}

                  {/* Active dogs count */}
                  {isActive && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{activeDogsHere} köpek parkta</span>
                    </div>
                  )}

                  {/* Approval progress for requested parks */}
                  {park.status === 'requested' && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <span>{park.approval_count}/{RATE_LIMITS.PARK_APPROVAL_THRESHOLD} onay</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-park-requested transition-all"
                          style={{ width: `${(park.approval_count / RATE_LIMITS.PARK_APPROVAL_THRESHOLD) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  {isActive && myDog && (
                    <button
                      onClick={() => toggleParkMode(park.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                        isParkModeHere
                          ? "bg-park-active text-white"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      )}
                    >
                      {isParkModeHere ? (
                        <>
                          <ToggleRight className="h-4 w-4" />
                          Aktif
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-4 w-4" />
                          Git
                        </>
                      )}
                    </button>
                  )}

                  {park.status === 'requested' && !approvals[park.id] && (
                    <button
                      onClick={() => handleApprove(park.id)}
                      className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-all hover:opacity-90"
                    >
                      <Check className="h-4 w-4" />
                      Onayla
                    </button>
                  )}

                  {park.status === 'requested' && approvals[park.id] && (
                    <span className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                      ✓ Onayladın
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Request new park hint */}
        <div className="rounded-2xl bg-secondary/50 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Kendi parkını önermek ister misin? Yakında...
          </p>
        </div>
      </div>
    </div>
  );
}
