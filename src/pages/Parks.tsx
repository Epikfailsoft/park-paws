import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ParkBadge } from '@/components/ui/ParkBadge';
import { MapPin, Users, Check, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Park, ParkModeSession } from '@/types/dogspace';
import { RATE_LIMITS, isParkModeActive } from '@/types/dogspace';

export default function Parks() {
  const { profile, dogs, selectedPark, selectPark, hasPhoto } = useAuth();
  const [parks, setParks] = useState<Park[]>([]);
  const [approvals, setApprovals] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState<ParkModeSession | null>(null);
  const [activeDogCounts, setActiveDogCounts] = useState<Record<string, number>>({});

  const myDog = dogs[0];

  useEffect(() => {
    fetchParks();
    if (myDog) {
      fetchParkModeStatus();
      fetchActiveCounts();
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
      setParks((data as unknown as Park[]) || []);

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

    // Check for active session
    const fourHoursAgo = new Date();
    fourHoursAgo.setHours(fourHoursAgo.getHours() - RATE_LIMITS.PARK_MODE_AUTO_OFF_HOURS);

    const { data } = await supabase
      .from('park_mode_sessions')
      .select('*')
      .eq('dog_id', myDog.id)
      .is('ended_at', null)
      .gte('started_at', fourHoursAgo.toISOString())
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data && isParkModeActive(data as ParkModeSession)) {
      setCurrentSession(data as ParkModeSession);
    } else {
      setCurrentSession(null);
    }
  };

  const fetchActiveCounts = async () => {
    const fourHoursAgo = new Date();
    fourHoursAgo.setHours(fourHoursAgo.getHours() - RATE_LIMITS.PARK_MODE_AUTO_OFF_HOURS);

    const { data } = await supabase
      .from('park_mode_sessions')
      .select('park_id')
      .is('ended_at', null)
      .gte('started_at', fourHoursAgo.toISOString());

    if (data) {
      const counts: Record<string, number> = {};
      data.forEach(d => {
        counts[d.park_id] = (counts[d.park_id] || 0) + 1;
      });
      setActiveDogCounts(counts);
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
              status: 'ACTIVE',
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
    if (!myDog || !profile) return;

    // Check if user has photo
    if (!hasPhoto && !myDog.photo_url) {
      toast.error('Parkta görünür olmak için önce fotoğraf eklemelisin');
      return;
    }

    const isCurrentlyActive = currentSession?.park_id === parkId;

    try {
      if (isCurrentlyActive && currentSession) {
        // End current session
        await supabase
          .from('park_mode_sessions')
          .update({ ended_at: new Date().toISOString() })
          .eq('id', currentSession.id);

        setCurrentSession(null);
        toast.info('Park modu kapatıldı.');
      } else {
        // End any existing session
        if (currentSession) {
          await supabase
            .from('park_mode_sessions')
            .update({ ended_at: new Date().toISOString() })
            .eq('id', currentSession.id);
        }

        // Start new session
        const { data: newSession, error } = await supabase
          .from('park_mode_sessions')
          .insert({
            dog_id: myDog.id,
            park_id: parkId,
          })
          .select()
          .single();

        if (error) throw error;

        setCurrentSession(newSession as ParkModeSession);
        toast.success('Parkta aktif oldun! 4 saat sonra otomatik kapanacak.');

        // Also select this park
        await selectPark(parkId);
      }

      fetchActiveCounts();
    } catch (error) {
      console.error('Error toggling park mode:', error);
      toast.error('Bir hata oluştu');
    }
  };

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

      {/* Validation Warning */}
      {myDog && !hasPhoto && (
        <div className="mx-4 mt-4 rounded-xl bg-amber-100 border border-amber-300 p-3">
          <p className="text-sm text-amber-800">
            ⚠️ Parkta görünür olmak için önce fotoğraf eklemelisin
          </p>
        </div>
      )}

      {/* Parks List */}
      <div className="px-4 py-4 space-y-3">
        {parks.map((park) => {
          const isActive = park.status === 'ACTIVE';
          const isParkModeHere = currentSession?.park_id === park.id;
          const activeDogsHere = activeDogCounts[park.id] || 0;

          return (
            <div
              key={park.id}
              className={cn(
                "rounded-2xl border-2 bg-card p-4 transition-all",
                isParkModeHere ? "border-[hsl(var(--park-active))]" : "border-transparent"
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

                  {/* Active dogs count */}
                  {isActive && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{activeDogsHere} köpek parkta</span>
                    </div>
                  )}

                  {/* Approval progress for requested parks */}
                  {park.status === 'REQUESTED' && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <span>{park.approval_count}/{RATE_LIMITS.PARK_APPROVAL_THRESHOLD} onay</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[hsl(var(--park-requested))] transition-all"
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
                      disabled={!hasPhoto && !myDog.photo_url}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all disabled:opacity-50",
                        isParkModeHere
                          ? "bg-[hsl(var(--park-active))] text-white"
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

                  {park.status === 'REQUESTED' && !approvals[park.id] && (
                    <button
                      onClick={() => handleApprove(park.id)}
                      className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-all hover:opacity-90"
                    >
                      <Check className="h-4 w-4" />
                      Onayla
                    </button>
                  )}

                  {park.status === 'REQUESTED' && approvals[park.id] && (
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
