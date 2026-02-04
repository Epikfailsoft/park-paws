import { useAuth } from '@/hooks/useAuth';
import { Info, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Settings() {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background safe-top safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Info className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">
              Ayarlar
            </h1>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* About Section */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Hakkında
          </h2>
          <div className="rounded-2xl bg-card p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="font-display text-xl font-bold text-foreground mb-3">
              Dogspace Nedir?
            </h3>
            <p className="text-lg font-medium text-primary mb-4">
              Köpekler tanışır, sahipler buluşur.
            </p>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Dogspace, köpeklerin parkta sosyalleşmesini kolaylaştıran bir uygulamadır. 
                Sahipler bu süreçte doğal olarak buluşur.
              </p>
              <div className="flex gap-4 py-2">
                <div className="flex-1 rounded-xl bg-secondary/50 p-3 text-center">
                  <p className="text-sm font-medium text-foreground">Amaç</p>
                  <p className="text-xs text-muted-foreground">Köpeklerin mutlu olması</p>
                </div>
                <div className="flex-1 rounded-xl bg-secondary/50 p-3 text-center">
                  <p className="text-sm font-medium text-foreground">Yan Etki</p>
                  <p className="text-xs text-muted-foreground">Sahiplerin tanışması</p>
                </div>
              </div>
              <p className="text-sm border-t border-border pt-3">
                <strong>Dogspace bir flört uygulaması değildir.</strong><br />
                Odak köpeklerin sosyalleşmesidir.
              </p>
            </div>
          </div>
        </section>

        {/* Quick Links */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Hızlı Erişim
          </h2>
          <div className="space-y-2">
            <Link 
              to="/profile"
              className="flex items-center justify-between rounded-xl bg-card p-4 transition-colors hover:bg-secondary/50"
              style={{ boxShadow: 'var(--shadow-soft)' }}
            >
              <span className="font-medium text-foreground">Köpeğim</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
            <Link 
              to="/parks"
              className="flex items-center justify-between rounded-xl bg-card p-4 transition-colors hover:bg-secondary/50"
              style={{ boxShadow: 'var(--shadow-soft)' }}
            >
              <span className="font-medium text-foreground">Parklar</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          </div>
        </section>

        {/* Account */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Hesap
          </h2>
          <div className="space-y-2">
            {profile && (
              <div className="rounded-xl bg-card p-4" style={{ boxShadow: 'var(--shadow-soft)' }}>
                <p className="text-sm text-muted-foreground">Giriş yapıldı</p>
                <p className="font-medium text-foreground">{profile.display_name}</p>
              </div>
            )}
            <button
              onClick={signOut}
              className="w-full rounded-xl border-2 border-destructive bg-destructive/5 p-4 text-center font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              Çıkış Yap
            </button>
          </div>
        </section>

        {/* Version */}
        <div className="text-center text-xs text-muted-foreground pt-4">
          <p>Dogspace V1.2</p>
          <p className="mt-1">Tamamen ücretsiz. Reklamsız. Spam yok.</p>
        </div>
      </div>
    </div>
  );
}
