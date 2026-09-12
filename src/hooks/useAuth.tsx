import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, Dog, UserPark, Park } from '@/types/dogspace';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  dogs: Dog[];
  selectedPark: Park | null;
  loading: boolean;
  hasDog: boolean;
  hasPhoto: boolean;
  isObserver: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshDogs: () => Promise<void>;
  selectPark: (parkId: string) => Promise<void>;
  setObserverMode: (val: boolean) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedPark, setSelectedPark] = useState<Park | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, userMetadata?: Record<string, unknown>) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      setProfile(data as Profile);
      return data as Profile;
    }

    const fullName = (userMetadata?.full_name as string) || (userMetadata?.name as string) || '';
    const nameParts = fullName.trim().split(' ');
    const displayName = nameParts[0] || 'Kullanıcı';
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : undefined;

    const { data: newProfile, error } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        display_name: displayName,
        last_name: lastName,
      })
      .select()
      .single();

    if (!error && newProfile) {
      setProfile(newProfile as Profile);
      return newProfile as Profile;
    }

    return null;
  };

  const fetchDogs = async (profileId: string) => {
    const { data } = await supabase
      .from('dogs')
      .select('*, breed:breeds(*)')
      .eq('owner_id', profileId)
      .is('deleted_at', null);

    if (data) {
      setDogs(data as unknown as Dog[]);
    }
  };

  const fetchSelectedPark = async (profileId: string) => {
    const { data: userPark } = await supabase
      .from('user_parks')
      .select('park_id')
      .eq('user_id', profileId)
      .maybeSingle();

    if (userPark) {
      const { data: park } = await supabase
        .from('parks')
        .select('*')
        .eq('id', userPark.park_id)
        .single();

      if (park) {
        setSelectedPark(park as unknown as Park);
      }
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const refreshDogs = async () => {
    if (profile) {
      await fetchDogs(profile.id);
    }
  };

  const selectPark = async (parkId: string) => {
    if (!profile) return;

    await supabase
      .from('user_parks')
      .upsert({
        user_id: profile.id,
        park_id: parkId,
        selected_at: new Date().toISOString(),
      });

    await fetchSelectedPark(profile.id);
  };

  const setObserverMode = async (val: boolean) => {
    if (!profile) return;
    await supabase.from('profiles').update({ observer_mode: val } as any).eq('id', profile.id);
    setProfile({ ...profile, observer_mode: val } as any);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id, session.user.user_metadata).then((profileData) => {
              if (profileData) {
                fetchDogs(profileData.id);
                fetchSelectedPark(profileData.id);
              }
            });
          }, 0);
        } else {
          setProfile(null);
          setDogs([]);
          setSelectedPark(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id, session.user.user_metadata).then(async (profileData) => {
          if (profileData) {
            await fetchDogs(profileData.id);
            await fetchSelectedPark(profileData.id);
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) return { error };

    if (data.user) {
      const nameParts = displayName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : undefined;

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: data.user.id,
          display_name: firstName,
          last_name: lastName,
        });

      if (profileError) return { error: profileError };
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setDogs([]);
    setSelectedPark(null);
  };

  const isObserver = !!(profile as any)?.observer_mode;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        dogs,
        selectedPark,
        loading,
        hasDog: dogs.length > 0,
        hasPhoto: !!profile?.photo_url,
        isObserver,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        refreshDogs,
        selectPark,
        setObserverMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
