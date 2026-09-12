import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Shield, Users, MapPin, Hand, MessageCircle, AlertTriangle, Loader2,
  Dog, Trash2, CheckCircle, XCircle, Flag, RefreshCw, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────

interface AdminStats {
  totalUsers: number;
  usersWithDog: number;
  observerUsers: number;
  totalDogs: number;
  activeParks: number;
  requestedParks: number;
  parkModeSessions7d: number;
  avgSessionMinutes: number;
  waves7d: number;
  harmonies7d: number;
  wavesToday: number;
  templateMessages: { t1: number; t2: number; t3: number };
  lostModeActivations: number;
  totalBadgesEarned: number;
  reportedAnnouncements: number;
}

interface UserRow {
  id: string;
  user_id: string;
  display_name: string;
  last_name: string | null;
  photo_url: string | null;
  created_at: string | null;
  observer_mode: boolean | null;
  dog_count?: number;
}

interface ParkRow {
  id: string;
  name: string;
  status: string | null;
  approval_count: number | null;
  required_approvals: number | null;
  created_at: string | null;
  dog_count?: number;
}

interface AnnouncementRow {
  id: string;
  title: string;
  body: string | null;
  report_count: number | null;
  created_at: string | null;
  park_name?: string;
  author_name?: string;
}

// ── Component ──────────────────────────────────────────

export default function Admin() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // User management
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // Park management
  const [parks, setParks] = useState<ParkRow[]>([]);
  const [parksLoading, setParksLoading] = useState(false);

  // Moderation
  const [reportedAnnouncements, setReportedAnnouncements] = useState<AnnouncementRow[]>([]);
  const [moderationLoading, setModerationLoading] = useState(false);

  useEffect(() => {
    if (user) checkAdmin();
    else setLoading(false);
  }, [user]);

  const checkAdmin = async () => {
    try {
      const { data } = await supabase.rpc('is_admin');
      if (data) {
        setIsAdmin(true);
        await fetchStats();
      } else {
        setIsAdmin(false);
      }
    } catch {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const iso7d = sevenDaysAgo.toISOString();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    try {
      const [
        { count: totalUsers },
        { count: totalDogs },
        { count: observerUsers },
        { data: parksData },
        { data: sessions },
        { count: waves7d },
        { count: wavesToday },
        { count: harmonies7d },
        { data: messages },
        { count: lostModeActivations },
        { count: totalBadgesEarned },
        { count: reportedCount },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('dogs').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('observer_mode', true),
        supabase.from('parks').select('status'),
        supabase.from('park_mode_sessions').select('started_at, ended_at').gte('started_at', iso7d),
        supabase.from('waves').select('*', { count: 'exact', head: true }).gte('created_at', iso7d),
        supabase.from('waves').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
        supabase.from('harmonies').select('*', { count: 'exact', head: true }).gte('created_at', iso7d),
        supabase.from('messages').select('template_id').eq('message_type', 'template'),
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('event_name', 'lost_mode_activated'),
        supabase.from('dog_badges').select('*', { count: 'exact', head: true }),
        supabase.from('park_announcements').select('*', { count: 'exact', head: true }).gt('report_count', 0),
      ]);

      const activeParks = parksData?.filter(p => p.status === 'ACTIVE').length || 0;
      const requestedParks = parksData?.filter(p => p.status === 'REQUESTED').length || 0;

      let totalMinutes = 0, completedSessions = 0;
      sessions?.forEach(s => {
        if (s.ended_at) {
          totalMinutes += (new Date(s.ended_at).getTime() - new Date(s.started_at!).getTime()) / 60000;
          completedSessions++;
        }
      });

      const templateMessages = { t1: 0, t2: 0, t3: 0 };
      messages?.forEach(m => {
        if (m.template_id === 1) templateMessages.t1++;
        if (m.template_id === 2) templateMessages.t2++;
        if (m.template_id === 3) templateMessages.t3++;
      });

      setStats({
        totalUsers: totalUsers || 0,
        usersWithDog: totalDogs || 0,
        observerUsers: observerUsers || 0,
        totalDogs: totalDogs || 0,
        activeParks,
        requestedParks,
        parkModeSessions7d: sessions?.length || 0,
        avgSessionMinutes: completedSessions > 0 ? Math.round(totalMinutes / completedSessions) : 0,
        waves7d: waves7d || 0,
        wavesToday: wavesToday || 0,
        harmonies7d: harmonies7d || 0,
        templateMessages,
        lostModeActivations: lostModeActivations || 0,
        totalBadgesEarned: totalBadgesEarned || 0,
        reportedAnnouncements: reportedCount || 0,
      });
    } catch (err) {
      console.error('Stats error:', err);
    }
  };

  // ── User Management ──
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      let query = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100);
      if (userSearch.trim()) {
        query = query.ilike('display_name', `%${userSearch.trim()}%`);
      }
      const { data } = await query;
      if (data) {
        // Get dog counts
        const { data: dogCounts } = await supabase.from('dogs').select('owner_id').is('deleted_at', null);
        const countMap: Record<string, number> = {};
        dogCounts?.forEach(d => { countMap[d.owner_id] = (countMap[d.owner_id] || 0) + 1; });
        setUsers((data as UserRow[]).map(u => ({ ...u, dog_count: countMap[u.id] || 0 })));
      }
    } catch (err) { console.error(err); }
    finally { setUsersLoading(false); }
  }, [userSearch]);

  // ── Park Management ──
  const fetchParks = useCallback(async () => {
    setParksLoading(true);
    try {
      const { data } = await supabase.from('parks').select('*').order('created_at', { ascending: false });
      if (data) {
        // Get active dog counts per park
        const { data: dogs } = await supabase.from('dogs').select('current_park_id').eq('park_checkin_active', true).not('current_park_id', 'is', null);
        const countMap: Record<string, number> = {};
        dogs?.forEach(d => { if (d.current_park_id) countMap[d.current_park_id] = (countMap[d.current_park_id] || 0) + 1; });
        setParks((data as ParkRow[]).map(p => ({ ...p, dog_count: countMap[p.id] || 0 })));
      }
    } catch (err) { console.error(err); }
    finally { setParksLoading(false); }
  }, []);

  const activatePark = async (parkId: string) => {
    try {
      await supabase.from('parks').update({ status: 'ACTIVE' as any, activated_at: new Date().toISOString() }).eq('id', parkId);
      toast.success('Park aktifleştirildi');
      fetchParks();
      fetchStats();
    } catch { toast.error('Hata'); }
  };

  const closePark = async (parkId: string) => {
    try {
      await supabase.from('parks').update({ status: 'CLOSED' as any }).eq('id', parkId);
      toast.success('Park kapatıldı');
      fetchParks();
      fetchStats();
    } catch { toast.error('Hata'); }
  };

  // ── Moderation ──
  const fetchReportedAnnouncements = useCallback(async () => {
    setModerationLoading(true);
    try {
      const { data } = await supabase
        .from('park_announcements')
        .select('id, title, body, report_count, created_at, park_id, author_id')
        .gt('report_count', 0)
        .order('report_count', { ascending: false })
        .limit(50);

      if (data) {
        // Enrich with park names and author names
        const parkIds = [...new Set(data.map(a => a.park_id))];
        const authorIds = [...new Set(data.map(a => a.author_id).filter(Boolean))] as string[];

        const [{ data: parksData }, { data: authorsData }] = await Promise.all([
          supabase.from('parks').select('id, name').in('id', parkIds),
          authorIds.length > 0 ? supabase.from('profiles').select('id, display_name').in('id', authorIds) : Promise.resolve({ data: [] }),
        ]);

        const parkMap: Record<string, string> = {};
        parksData?.forEach(p => { parkMap[p.id] = p.name; });
        const authorMap: Record<string, string> = {};
        authorsData?.forEach(a => { authorMap[a.id] = a.display_name; });

        setReportedAnnouncements(data.map(a => ({
          id: a.id,
          title: a.title,
          body: a.body,
          report_count: a.report_count,
          created_at: a.created_at,
          park_name: parkMap[a.park_id] || 'Bilinmiyor',
          author_name: a.author_id ? authorMap[a.author_id] || 'Anonim' : 'Anonim',
        })));
      }
    } catch (err) { console.error(err); }
    finally { setModerationLoading(false); }
  }, []);

  const deleteAnnouncement = async (id: string) => {
    try {
      await supabase.from('park_announcements').delete().eq('id', id);
      toast.success('Duyuru silindi');
      fetchReportedAnnouncements();
    } catch { toast.error('Hata'); }
  };

  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'parks') fetchParks();
    if (activeTab === 'moderation') fetchReportedAnnouncements();
  }, [activeTab, isAdmin]);

  // ── Render ──────────────────────────────────────────

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <Shield className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-xl font-bold text-foreground">Erişim Reddedildi</h1>
        <p className="text-center text-muted-foreground">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-top safe-bottom pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b px-4 py-3 bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-foreground">Admin</h1>
              <p className="text-xs text-muted-foreground">DOGSPACE Yönetim</p>
            </div>
          </div>
          <button onClick={() => { fetchStats(); toast.success('Yenilendi'); }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start px-4 pt-2 bg-transparent gap-1">
          <TabsTrigger value="overview" className="text-xs rounded-full">📊 Genel</TabsTrigger>
          <TabsTrigger value="users" className="text-xs rounded-full">👥 Kullanıcılar</TabsTrigger>
          <TabsTrigger value="parks" className="text-xs rounded-full">🌳 Parklar</TabsTrigger>
          <TabsTrigger value="moderation" className="text-xs rounded-full">🚩 Moderasyon</TabsTrigger>
        </TabsList>

        {/* ══════ OVERVIEW TAB ══════ */}
        <TabsContent value="overview" className="px-4 py-4 space-y-5">
          {/* Key metrics */}
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Kullanıcılar</h2>
            <div className="grid grid-cols-3 gap-2">
              <MetricCard label="Toplam" value={stats?.totalUsers || 0} icon={Users} />
              <MetricCard label="Köpekli" value={stats?.usersWithDog || 0} icon={Dog} />
              <MetricCard label="Gözlemci" value={stats?.observerUsers || 0} icon={Users} />
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Parklar</h2>
            <div className="grid grid-cols-3 gap-2">
              <MetricCard label="Aktif" value={stats?.activeParks || 0} icon={MapPin} accent />
              <MetricCard label="Beklemede" value={stats?.requestedParks || 0} icon={MapPin} warning={!!stats?.requestedParks} />
              <MetricCard label="Oturum (7g)" value={stats?.parkModeSessions7d || 0} icon={MapPin} sub={`~${stats?.avgSessionMinutes || 0}dk`} />
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Aktivite (7 Gün)</h2>
            <div className="grid grid-cols-2 gap-2">
              <MetricCard label="Woof" value={stats?.waves7d || 0} icon={Hand} sub={`Bugün: ${stats?.wavesToday || 0}`} />
              <MetricCard label="Harmony" value={stats?.harmonies7d || 0} icon={MessageCircle} accent={!!stats?.harmonies7d} />
              <MetricCard label="Rozet Kazanılan" value={stats?.totalBadgesEarned || 0} icon={CheckCircle} />
              <MetricCard label="Kayıp Bildirimi" value={stats?.lostModeActivations || 0} icon={AlertTriangle} warning={!!stats?.lostModeActivations} />
            </div>
          </section>

          {/* Template funnel */}
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Template Akışı</h2>
            <div className="rounded-xl bg-card p-3 border border-border">
              <div className="space-y-2">
                {[
                  { label: 'T1: Playdate teklifi', count: stats?.templateMessages.t1 || 0 },
                  { label: 'T2: Park seçimi', count: stats?.templateMessages.t2 || 0 },
                  { label: 'T3: Zaman seçimi', count: stats?.templateMessages.t3 || 0 },
                ].map(t => (
                  <div key={t.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t.label}</span>
                    <span className="font-semibold text-foreground">{t.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Readiness */}
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">V1.3 Hazırlık</h2>
            <div className="rounded-xl bg-card p-3 border border-border space-y-3">
              <ReadinessItem label="Aktif kullanıcı" current={stats?.usersWithDog || 0} threshold={100} />
              <ReadinessItem label="Haftalık Harmony" current={stats?.harmonies7d || 0} threshold={10} />
              <ReadinessItem label="Aktif park" current={stats?.activeParks || 0} threshold={3} />
            </div>
          </section>
        </TabsContent>

        {/* ══════ USERS TAB ══════ */}
        <TabsContent value="users" className="px-4 py-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                placeholder="İsim ile ara..."
                className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2.5 text-sm"
              />
            </div>
            <button onClick={fetchUsers} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
              Ara
            </button>
          </div>

          {usersLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-2">
              {users.map(u => (
                <div key={u.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center gap-3">
                    {u.photo_url ? (
                      <img src={u.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {u.display_name?.[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {u.display_name} {u.last_name || ''}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>🐕 {u.dog_count || 0}</span>
                        {u.observer_mode && <span className="text-amber-500">👁 Gözlemci</span>}
                        <span>{u.created_at ? new Date(u.created_at).toLocaleDateString('tr-TR') : ''}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {users.length === 0 && !usersLoading && (
                <p className="text-center text-sm text-muted-foreground py-8">Kullanıcı bulunamadı</p>
              )}
            </div>
          )}
        </TabsContent>

        {/* ══════ PARKS TAB ══════ */}
        <TabsContent value="parks" className="px-4 py-4 space-y-3">
          {parksLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-2">
              {parks.map(p => (
                <div key={p.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-foreground truncate">{p.name}</p>
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold",
                          p.status === 'ACTIVE' ? "bg-primary/15 text-primary" :
                          p.status === 'REQUESTED' ? "bg-amber-500/15 text-amber-600" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {p.status === 'ACTIVE' ? '✅ Aktif' : p.status === 'REQUESTED' ? '⏳ Beklemede' : '🔒 Kapalı'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>🐕 {p.dog_count || 0} şu an</span>
                        <span>👍 {p.approval_count || 0}/{p.required_approvals || 5} onay</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 ml-2">
                      {p.status !== 'ACTIVE' && (
                        <button onClick={() => activatePark(p.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      {p.status === 'ACTIVE' && (
                        <button onClick={() => closePark(p.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ══════ MODERATION TAB ══════ */}
        <TabsContent value="moderation" className="px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Raporlanan Duyurular</h2>
            <button onClick={fetchReportedAnnouncements}
              className="flex items-center gap-1 text-xs text-primary font-medium">
              <RefreshCw className="h-3 w-3" /> Yenile
            </button>
          </div>

          {moderationLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : reportedAnnouncements.length === 0 ? (
            <div className="text-center py-12">
              <Flag className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Raporlanan duyuru yok 🎉</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reportedAnnouncements.map(a => (
                <div key={a.id} className="rounded-xl border border-destructive/20 bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{a.title}</p>
                      {a.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.body}</p>}
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                        <span>🌳 {a.park_name}</span>
                        <span>✍️ {a.author_name}</span>
                        <span className="text-destructive font-semibold">🚩 {a.report_count} rapor</span>
                      </div>
                    </div>
                    <button onClick={() => deleteAnnouncement(a.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors flex-shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────

function MetricCard({ label, value, icon: Icon, sub, accent, warning }: {
  label: string; value: number; icon: any; sub?: string; accent?: boolean; warning?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={cn("h-3.5 w-3.5",
          accent ? "text-primary" : warning ? "text-amber-500" : "text-muted-foreground"
        )} />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ReadinessItem({ label, current, threshold }: { label: string; current: number; threshold: number }) {
  const pct = Math.min(100, (current / threshold) * 100);
  const status = pct >= 100 ? 'good' : pct >= 50 ? 'warning' : 'bad';
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={cn("text-xs font-semibold",
          status === 'good' ? "text-primary" : status === 'warning' ? "text-amber-500" : "text-destructive"
        )}>
          {status === 'good' ? '✅' : status === 'warning' ? '⚠️' : '❌'} {current}/{threshold}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all",
          status === 'good' ? "bg-primary" : status === 'warning' ? "bg-amber-500" : "bg-destructive"
        )} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
