import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Users, MapPin, Hand, MessageCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminStats {
  totalUsers: number;
  usersWithDog: number;
  activeParks: number;
  requestedParks: number;
  parkModeSessions7d: number;
  avgSessionMinutes: number;
  waves7d: number;
  harmonies7d: number;
  templateMessages: { t1: number; t2: number; t3: number };
  lostModeActivations: number;
}

export default function Admin() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAndFetchStats();
  }, [user]);

  const checkAdminAndFetchStats = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Check if user is admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      // Fetch stats
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Users with dog
      const { count: usersWithDog } = await supabase
        .from('dogs')
        .select('owner_id', { count: 'exact', head: true })
        .is('deleted_at', null);

      // Parks
      const { data: parks } = await supabase
        .from('parks')
        .select('status');

      const activeParks = parks?.filter(p => p.status === 'ACTIVE').length || 0;
      const requestedParks = parks?.filter(p => p.status === 'REQUESTED').length || 0;

      // Park mode sessions (7d)
      const { data: sessions } = await supabase
        .from('park_mode_sessions')
        .select('started_at, ended_at')
        .gte('started_at', sevenDaysAgo.toISOString());

      const parkModeSessions7d = sessions?.length || 0;
      
      // Calculate average session duration
      let totalMinutes = 0;
      let completedSessions = 0;
      sessions?.forEach(s => {
        if (s.ended_at) {
          const duration = (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / (1000 * 60);
          totalMinutes += duration;
          completedSessions++;
        }
      });
      const avgSessionMinutes = completedSessions > 0 ? Math.round(totalMinutes / completedSessions) : 0;

      // Waves (7d)
      const { count: waves7d } = await supabase
        .from('waves')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      // Harmonies (7d)
      const { count: harmonies7d } = await supabase
        .from('harmonies')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      // Template messages
      const { data: messages } = await supabase
        .from('messages')
        .select('template_id')
        .eq('message_type', 'template');

      const templateMessages = { t1: 0, t2: 0, t3: 0 };
      messages?.forEach(m => {
        if (m.template_id === 1) templateMessages.t1++;
        if (m.template_id === 2) templateMessages.t2++;
        if (m.template_id === 3) templateMessages.t3++;
      });

      // Lost mode (check dogs with is_lost history via events)
      const { count: lostModeActivations } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('event_name', 'lost_mode_activated');

      setStats({
        totalUsers: totalUsers || 0,
        usersWithDog: usersWithDog || 0,
        activeParks,
        requestedParks,
        parkModeSessions7d,
        avgSessionMinutes,
        waves7d: waves7d || 0,
        harmonies7d: harmonies7d || 0,
        templateMessages,
        lostModeActivations: lostModeActivations || 0,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <Shield className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-xl font-bold text-foreground">Erişim Reddedildi</h1>
        <p className="text-center text-muted-foreground">
          Bu sayfaya erişim yetkiniz bulunmamaktadır.
        </p>
      </div>
    );
  }

  const StatCard = ({ 
    label, 
    value, 
    icon: Icon, 
    subtext,
    status 
  }: { 
    label: string; 
    value: number | string; 
    icon: any;
    subtext?: string;
    status?: 'good' | 'warning' | 'bad';
  }) => (
    <div className="rounded-xl bg-card p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center gap-3 mb-2">
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg",
          status === 'good' && "bg-primary/10 text-primary",
          status === 'warning' && "bg-amber-100 text-amber-600",
          status === 'bad' && "bg-destructive/10 text-destructive",
          !status && "bg-secondary text-secondary-foreground"
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
      {subtext && (
        <p className="text-xs text-muted-foreground border-t border-border pt-2 mt-2">
          {subtext}
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background safe-top safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">
              Admin Dashboard
            </h1>
            <p className="text-xs text-muted-foreground">
              Dogspace V1.2 Analytics
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* Users Section */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Kullanıcılar
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard 
              label="Toplam Kullanıcı" 
              value={stats?.totalUsers || 0}
              icon={Users}
              status="good"
            />
            <StatCard 
              label="Köpek Profili Var" 
              value={stats?.usersWithDog || 0}
              icon={Users}
              subtext={`${stats?.totalUsers ? Math.round((stats.usersWithDog / stats.totalUsers) * 100) : 0}% tamamlama`}
            />
          </div>
        </section>

        {/* Parks Section */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Parklar
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard 
              label="Aktif Park" 
              value={stats?.activeParks || 0}
              icon={MapPin}
              status="good"
            />
            <StatCard 
              label="Beklemede" 
              value={stats?.requestedParks || 0}
              icon={MapPin}
              status={stats?.requestedParks ? 'warning' : undefined}
            />
          </div>
        </section>

        {/* Activity Section */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Aktivite (7 Gün)
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard 
              label="Park Mode Oturumları" 
              value={stats?.parkModeSessions7d || 0}
              icon={MapPin}
              subtext={`Ort. ${stats?.avgSessionMinutes || 0} dk`}
            />
            <StatCard 
              label="Wave" 
              value={stats?.waves7d || 0}
              icon={Hand}
            />
            <StatCard 
              label="Harmony" 
              value={stats?.harmonies7d || 0}
              icon={MessageCircle}
              status={stats?.harmonies7d && stats.harmonies7d > 0 ? 'good' : undefined}
            />
            <StatCard 
              label="Kayıp Bildirimi" 
              value={stats?.lostModeActivations || 0}
              icon={AlertTriangle}
              status={stats?.lostModeActivations && stats.lostModeActivations > 0 ? 'warning' : undefined}
            />
          </div>
        </section>

        {/* Template Messages */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Template Mesajlar
          </h2>
          <div className="rounded-xl bg-card p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">T1: Playdate teklifi</span>
                <span className="font-medium text-foreground">{stats?.templateMessages.t1 || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">T2: Park seçimi</span>
                <span className="font-medium text-foreground">{stats?.templateMessages.t2 || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">T3: Zaman seçimi</span>
                <span className="font-medium text-foreground">{stats?.templateMessages.t3 || 0}</span>
              </div>
            </div>
            
            {/* Funnel visualization */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Template Akış Oranları</p>
              <div className="flex gap-1 h-4">
                <div 
                  className="bg-primary rounded-l"
                  style={{ flex: stats?.templateMessages.t1 || 1 }}
                />
                <div 
                  className="bg-primary/70"
                  style={{ flex: stats?.templateMessages.t2 || 0.5 }}
                />
                <div 
                  className="bg-primary/40 rounded-r"
                  style={{ flex: stats?.templateMessages.t3 || 0.25 }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>T1</span>
                <span>T2</span>
                <span>T3</span>
              </div>
            </div>
          </div>
        </section>

        {/* V1.3 Readiness */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            V1.3 Hazırlık
          </h2>
          <div className="rounded-xl bg-card p-4 space-y-3" style={{ boxShadow: 'var(--shadow-card)' }}>
            <ReadinessItem 
              label="Aktif kullanıcı sayısı" 
              current={stats?.usersWithDog || 0} 
              threshold={100}
            />
            <ReadinessItem 
              label="Haftalık Harmony" 
              current={stats?.harmonies7d || 0} 
              threshold={10}
            />
            <ReadinessItem 
              label="Aktif park sayısı" 
              current={stats?.activeParks || 0} 
              threshold={3}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function ReadinessItem({ label, current, threshold }: { label: string; current: number; threshold: number }) {
  const percentage = Math.min(100, (current / threshold) * 100);
  const status = percentage >= 100 ? 'good' : percentage >= 50 ? 'warning' : 'bad';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn(
          "text-sm font-medium",
          status === 'good' && "text-primary",
          status === 'warning' && "text-amber-600",
          status === 'bad' && "text-destructive"
        )}>
          {status === 'good' ? '✅' : status === 'warning' ? '⚠️' : '❌'} {current}/{threshold}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            status === 'good' && "bg-primary",
            status === 'warning' && "bg-amber-500",
            status === 'bad' && "bg-destructive"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
