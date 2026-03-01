import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Plus, Megaphone, AlertTriangle, Calendar, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  park_id: string;
  author_id: string | null;
  announcement_type: string;
  title: string;
  body: string | null;
  pinned: boolean;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  general: { icon: <Megaphone className="h-4 w-4" />, label: 'Duyuru', color: 'text-primary' },
  lost_found: { icon: <AlertTriangle className="h-4 w-4" />, label: 'Kayıp/Bulundu', color: 'text-destructive' },
  event: { icon: <Calendar className="h-4 w-4" />, label: 'Etkinlik', color: 'text-[hsl(var(--harmony))]' },
  municipal: { icon: <Building2 className="h-4 w-4" />, label: 'Belediye', color: 'text-amber-600' },
};

export function ParkBulletinBoard() {
  const { selectedPark, profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newType, setNewType] = useState('general');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selectedPark) fetchAnnouncements();
    else setLoading(false);
  }, [selectedPark]);

  const fetchAnnouncements = async () => {
    if (!selectedPark) return;
    try {
      const { data } = await supabase
        .from('park_announcements')
        .select('*')
        .eq('park_id', selectedPark.id)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);
      setAnnouncements((data || []) as Announcement[]);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPark || !profile || !newTitle.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('park_announcements').insert({
        park_id: selectedPark.id,
        author_id: profile.id,
        announcement_type: newType,
        title: newTitle.trim(),
        body: newBody.trim() || null,
      });
      if (error) throw error;
      toast.success('Duyuru paylaşıldı!');
      setNewTitle('');
      setNewBody('');
      setShowForm(false);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  if (!selectedPark) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">Park seçilmedi</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add announcement button */}
      {profile && (
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="h-4 w-4" />
          Duyuru Paylaş
        </button>
      )}

      {/* New announcement form */}
      {showForm && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex gap-2">
            {Object.entries(TYPE_CONFIG).map(([type, config]) => (
              <button
                key={type}
                onClick={() => setNewType(type)}
                className={cn(
                  "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                  newType === type ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground"
                )}
              >
                {config.icon}
                {config.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Başlık"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <textarea
            placeholder="Detay (opsiyonel)"
            value={newBody}
            onChange={e => setNewBody(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none resize-none"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg px-4 py-2 text-sm text-muted-foreground"
            >
              İptal
            </button>
            <button
              onClick={handleSubmit}
              disabled={!newTitle.trim() || submitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Paylaş'}
            </button>
          </div>
        </div>
      )}

      {/* Announcements list */}
      {announcements.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm text-muted-foreground">
            {selectedPark.name} için henüz duyuru yok
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {announcements.map(a => {
            const config = TYPE_CONFIG[a.announcement_type] || TYPE_CONFIG.general;
            return (
              <div
                key={a.id}
                className={cn(
                  "rounded-xl border bg-card p-3",
                  a.pinned && "border-primary/30 bg-primary/5"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={config.color}>{config.icon}</span>
                  <span className={cn("text-xs font-medium", config.color)}>{config.label}</span>
                  {a.pinned && <span className="text-xs text-primary">📌</span>}
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString('tr-TR')}
                  </span>
                </div>
                <h4 className="font-semibold text-sm text-foreground">{a.title}</h4>
                {a.body && <p className="text-xs text-muted-foreground mt-1">{a.body}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
