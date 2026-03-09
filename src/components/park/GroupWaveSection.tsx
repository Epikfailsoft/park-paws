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
{ id: 'silent', text: 'Sessiz oyun saati', icon: '🤫', hour: 15 }];


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
      const { data: gwData, error } = await supabase.
      from('group_waves').
      select('*').
      eq('park_id', parkId).
      gte('expires_at', new Date().toISOString()).
      order('scheduled_time', { ascending: true });

      if (error) throw error;
      if (!gwData) {setWaves([]);return;}

      // Get RSVP counts
      const waveIds = gwData.map((w) => w.id);
      const { data: rsvpData } = await supabase.
      from('group_wave_rsvps').
      select('group_wave_id, dog_id').
      in('group_wave_id', waveIds.length > 0 ? waveIds : ['00000000-0000-0000-0000-000000000000']);

      const rsvpCounts: Record<string, number> = {};
      const userRsvps = new Set<string>();
      (rsvpData || []).forEach((r) => {
        rsvpCounts[r.group_wave_id] = (rsvpCounts[r.group_wave_id] || 0) + 1;
        if (myDog && r.dog_id === myDog.id) userRsvps.add(r.group_wave_id);
      });

      setWaves(gwData.map((w) => ({
        ...w,
        rsvp_count: rsvpCounts[w.id] || 0,
        user_rsvped: userRsvps.has(w.id)
      })));
    } catch (err) {
      console.error('Error fetching group waves:', err);
    } finally {
      setLoading(false);
    }
  }, [parkId, myDog]);

  useEffect(() => {fetchGroupWaves();}, [fetchGroupWaves]);

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
        expires_at: addHours(scheduled, 2).toISOString()
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

  return;











































































}