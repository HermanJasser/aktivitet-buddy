import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const pendingOnboardingRef = useRef(false);

  async function fetchProfile(userId) {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data ?? null);
  }

  const refreshProfile = useCallback(async () => {
    const { data: { session: current } } = await supabase.auth.getSession();
    await fetchProfile(current?.user?.id ?? null);
  }, []);

  // Kalles fra register-skjermen for å sette onboarding-flagget synkront
  function triggerOnboarding() {
    pendingOnboardingRef.current = true;
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      await fetchProfile(session?.user?.id ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('onAuthStateChange event:', event, 'pendingOnboarding:', pendingOnboardingRef.current);
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return;

      if (event === 'SIGNED_IN') {
        // Les ref synkront og sett begge states atomisk
        const onboarding = pendingOnboardingRef.current;
        pendingOnboardingRef.current = false;
        setSession(session);
        setNeedsOnboarding(onboarding);
        setLoading(false);
        await new Promise(resolve => setTimeout(resolve, 800));
        fetchProfile(session?.user?.id ?? null);
      } else {
        setSession(session);
        setLoading(false);
        fetchProfile(session?.user?.id ?? null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const profileComplete = !!profile?.full_name;

  return (
    <AuthContext.Provider value={{ session, loading, profile, profileComplete, refreshProfile, needsOnboarding, setNeedsOnboarding, triggerOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
