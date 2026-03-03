import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Users, Plus, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, addHours, isAfter } from 'date-fns';

const GROUP_WAVE_TEMPLATES = [
  { id: 'evening', text: 'Bugün 18:00 buradayım', icon: '🌇', hour: 18 },
  { id: 'morning', text: 'Sabah yürüyüş grubu', icon: '🌅', hour: 9 },
  { id: 'silent', text: 'Sessiz oyun saati', icon: '🤫', hour: 15 },
];

interface GroupWave {
  id: string;
  park_id: string;
  creator_dog_id: string;
  template: string;
  scheduled_time: string;
  created_at: string;
  expires_at: string;
  rsvp_count: number;
  user_rsvped: boolean;
}

interface GroupWaveSectionProps {
  parkId: string;
}

export function GroupWaveSection({ parkId }: GroupWaveSectionProps) {
  const { profile, dogs } = useAuth();
  const myDog = dogs[0];
  const [waves, setWaves] = useState<GroupWave[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const fetchGroupWaves = useCallback(async () => {
    try {
      const { data: gwData, error } = await supabase
        .from('group_waves')
        .select('*')
        .eq('park_id', parkId)
        .gte('expires_at', new Date().toISOString())
        .order('scheduled_time', { ascending: true });

      if (error) throw error;
      if (!gwData) { setWaves([]); return; }

      // Get RSVP counts
      const waveIds = gwData.map(w => w.id);
      const { data: rsvpData } = await supabase
        .from('group_wave_rsvps')
        .select('group_wave_id, dog_id')
        .in('group_wave_id', waveIds.length > 0 ? waveIds : ['00000000-0000-0000-0000-000000000000']);

      const rsvpCounts: Record<string, number> = {};
      const userRsvps = new Set<string>();
      (rsvpData || []).forEach(r => {
        rsvpCounts[r.group_wave_id] = (rsvpCounts[r.group_wave_id] || 0) + 1;
        if (myDog && r.dog_id === myDog.id) userRsvps.add(r.group_wave_id);
      });

      setWaves(gwData.map(w => ({
        ...w,
        rsvp_count: rsvpCounts[w.id] || 0,
        user_rsvped: userRsvps.has(w.id),
      })));
    } catch (err) {
      console.error('Error fetching group waves:', err);
    } finally {
      setLoading(false);
    }
  }, [parkId, myDog]);

  useEffect(() => { fetchGroupWaves(); }, [fetchGroupWaves]);

  const handleCreate = async (template: typeof GROUP_WAVE_TEMPLATES[0]) => {
    if (!myDog || !profile) return;
    setCreating(true);
    try {
      const now = new Date();
      const scheduled = new Date();
      scheduled.setHours(template.hour, 0, 0, 0);
      if (!isAfter(scheduled, now)) scheduled.setDate(scheduled.getDate() + 1);

      const { error } = await supabase.from('group_waves').insert({
        park_id: parkId,
        creator_dog_id: myDog.id,
        template: template.text,
        scheduled_time: scheduled.toISOString(),
        expires_at: addHours(scheduled, 2).toISOString(),
      } as any);

      if (error) throw error;
      toast.success('Grup Wave oluşturuldu! 🐕');
      setShowCreate(false);
      fetchGroupWaves();
    } catch (err) {
      console.error('Error creating group wave:', err);
      toast.error('Bir hata oluştu');
    } finally {
      setCreating(false);
    }
  };

  const handleRSVP = async (waveId: string, isRsvped: boolean) => {
    if (!myDog) return;
    try {
      if (isRsvped) {
        await supabase.from('group_wave_rsvps').delete().eq('group_wave_id', waveId).eq('dog_id', myDog.id);
        toast.info('Katılım iptal edildi');
      } else {
        await supabase.from('group_wave_rsvps').insert({ group_wave_id: waveId, dog_id: myDog.id } as any);
        toast.success('Katılım onaylandı! 🎉');
      }
      fetchGroupWaves();
    } catch (err) {
      console.error('Error toggling RSVP:', err);
      toast.error('Bir hata oluştu');
    }
  };

  if (loading) return null;

  return (
    <div className="section-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: 'hsl(var(--page-park))' }}>
            <Users className="h-3.5 w-3.5 text-white" />
          </span>
          Grup Wave
        </h3>
        {myDog && (
          <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1 text-xs font-medium text-primary">
            <Plus className="h-3.5 w-3.5" /> Oluştur
          </button>
        )}
      </div>

      {/* Create templates */}
      {showCreate && (
        <div className="mb-3 space-y-2">
          {GROUP_WAVE_TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => handleCreate(t)}
              disabled={creating}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left hover:bg-secondary/50 transition-all"
            >
              <span className="text-xl">{t.icon}</span>
              <span className="flex-1 text-sm font-medium text-foreground">{t.text}</span>
              {creating ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Plus className="h-4 w-4 text-muted-foreground" />}
            </button>
          ))}
        </div>
      )}

      {/* Active group waves */}
      {waves.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">
          Henüz aktif grup wave yok. İlk sen oluştur!
        </p>
      ) : (
        <div className="space-y-2">
          {waves.map(wave => (
            <div key={wave.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{wave.template}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(wave.scheduled_time), 'HH:mm')}
                  </span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs font-semibold" style={{ color: 'hsl(var(--page-park))' }}>
                    {wave.rsvp_count} katılımcı
                  </span>
                </div>
              </div>
              {myDog && (
                <button
                  onClick={() => handleRSVP(wave.id, wave.user_rsvped)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-bold transition-all",
                    wave.user_rsvped
                      ? "text-white" 
                      : "bg-muted text-muted-foreground hover:bg-primary/10"
                  )}
                  style={wave.user_rsvped ? { background: 'hsl(var(--page-park))' } : {}}
                >
                  {wave.user_rsvped ? '✓ Katılıyorum' : 'Katıl'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
