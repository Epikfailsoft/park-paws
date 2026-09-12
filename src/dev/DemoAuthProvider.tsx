import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AuthContext } from '@/hooks/useAuth';
import type { Park } from '@/types/dogspace';
import { demoDogs, demoProfile, demoUser } from './demoData';
import { DEMO_WRITE_BLOCKED_EVENT } from './demoMode';

// Stands in for AuthProvider in demo mode: the demo owner and dogs are held locally, so no
// Supabase session exists and nothing is written.

// The selected park is a real ACTIVE park, read-only, so the Park page has something to show.
async function fetchPark(parkId?: string) {
  const parks = supabase.from('parks').select('*').order('name').limit(1);
  const { data } = await (parkId ? parks.eq('id', parkId) : parks.eq('status', 'ACTIVE')).maybeSingle();
  return data as unknown as Park | null;
}

export function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [signedOut, setSignedOut] = useState(false);
  const [isObserver, setIsObserver] = useState(false);
  const [selectedPark, setSelectedPark] = useState<Park | null>(null);

  useEffect(() => {
    fetchPark().then(setSelectedPark);
  }, []);

  // The app's own error toasts are generic ("Bir hata oluştu"), so say why writes fail.
  useEffect(() => {
    const explain = () => toast.info('Demo modu: değişiklikler kaydedilmez.', { id: DEMO_WRITE_BLOCKED_EVENT });
    window.addEventListener(DEMO_WRITE_BLOCKED_EVENT, explain);
    return () => window.removeEventListener(DEMO_WRITE_BLOCKED_EVENT, explain);
  }, []);

  const user = signedOut ? null : demoUser;
  const loginBlocked = async () => ({ error: new Error('Demo modunda giriş yapılamaz.') });

  return (
    <AuthContext.Provider
      value={{
        user,
        session: null,
        profile: user && demoProfile,
        dogs: user ? demoDogs : [],
        selectedPark,
        loading: false,
        hasDog: !!user,
        hasPhoto: false,
        isObserver,
        signUp: loginBlocked,
        signIn: loginBlocked,
        signOut: async () => setSignedOut(true),
        refreshProfile: async () => {},
        refreshDogs: async () => {},
        selectPark: async (parkId) => setSelectedPark(await fetchPark(parkId)),
        setObserverMode: async (val) => setIsObserver(val),
      }}
    >
      {children}
      <div className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] left-2 z-[100] rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-secondary-foreground shadow-md">
        Demo · kaydedilmez
      </div>
    </AuthContext.Provider>
  );
}
