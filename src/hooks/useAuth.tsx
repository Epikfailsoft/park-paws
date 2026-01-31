import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, Dog } from '@/types/dogspace';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  dogs: Dog[];
  loading: boolean;
  hasDog: boolean;
  signUp: (email: string, password: string, firstName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshDogs: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (data) {
      setProfile(data as Profile);
    }
    return data;
  };

  const fetchDogs = async (profileId: string) => {
    const { data } = await supabase
      .from('dogs')
      .select('*')
      .eq('owner_id', profileId);
    
    if (data) {
      setDogs(data as Dog[]);
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

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile fetch
          setTimeout(() => {
            fetchProfile(session.user.id).then((profileData) => {
              if (profileData) {
                fetchDogs(profileData.id);
              }
            });
          }, 0);
        } else {
          setProfile(null);
          setDogs([]);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id).then(async (profileData) => {
          if (profileData) {
            await fetchDogs(profileData.id);
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, firstName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) return { error };

    // Create profile
    if (data.user) {
      const nameParts = firstName.trim().split(' ');
      const firstNameOnly = nameParts[0];
      const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1][0].toUpperCase() : undefined;

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: data.user.id,
          first_name: firstNameOnly,
          last_name_initial: lastInitial,
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
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        dogs,
        loading,
        hasDog: dogs.length > 0,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        refreshDogs,
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
