import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

import { supabase } from '@/src/supabaseClient';
import type { Tables } from '@/src/types/supabase.generated';
import { getOrCreateVisitorId, resetVisitorIdCache, deleteVisitorId } from '@/src/utils/visitorId';

export type SupabaseProfile = Tables<'profiles'>;

// Deprecated alias kept for backward compatibility during the refactor period
export type AuthUser = SupabaseProfile;

type AuthContextValue = {
  supabaseUser: SupabaseUser | null;
  supabaseProfile: SupabaseProfile | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<SupabaseProfile | null>;
  session: Session | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseProfile, setSupabaseProfile] = useState<SupabaseProfile | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isRefreshingProfile, setIsRefreshingProfile] = useState(false);

  const fetchSupabaseProfile = useCallback(async (phone: string | null | undefined) => {
    console.log('[AuthContext.fetchSupabaseProfile] START - phone:', phone);
    
    if (!phone) {
      console.log('[AuthContext.fetchSupabaseProfile] No phone provided - setting profile to null');
      setSupabaseProfile(null);
      return null;
    }

    try {
      // Normaliser le téléphone avec le + si absent
      const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      console.log('[AuthContext.fetchSupabaseProfile] Normalized phone:', normalizedPhone);
      console.log('[AuthContext.fetchSupabaseProfile] Querying profiles table for phone:', normalizedPhone);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', normalizedPhone)
        .maybeSingle();

      console.log('[AuthContext.fetchSupabaseProfile] Query result:', { 
        found: !!data, 
        error: error?.message,
        profileId: (data as any)?.id 
      });

      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('[AuthContext.fetchSupabaseProfile] Query error:', error);
        }
        setSupabaseProfile(null);
        return null;
      }

      const profile = (data as SupabaseProfile) ?? null;
      console.log('[AuthContext.fetchSupabaseProfile] Setting profile:', { found: !!profile, id: profile?.id });
      setSupabaseProfile(profile);
      return profile;
    } catch (err) {
      console.error('[AuthContext.fetchSupabaseProfile] Unexpected error:', err);
      setSupabaseProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('[AuthContext.onAuthStateChange] EVENT:', event);
      console.log('[AuthContext.onAuthStateChange] Session exists:', !!currentSession);
      console.log('[AuthContext.onAuthStateChange] User phone:', currentSession?.user?.phone);
      
      setSession(currentSession ?? null);
      setSupabaseUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        console.log('[AuthContext.onAuthStateChange] User authenticated - phone:', currentSession.user.phone);
        
        // Merge du visitor_id au login
        try {
          const visitorId = await getOrCreateVisitorId();
          const phone = currentSession.user.phone;
          console.log('[AuthContext.onAuthStateChange] Merging visitor_id:', visitorId, 'with phone:', phone);
          
          const { error } = await supabase
            .from('visitor_activity_heartbeat')
            .update({
              linked_user_id: phone,
              merged_at: new Date().toISOString(),
              last_activity_at: new Date().toISOString(),
            })
            .eq('visitor_id', visitorId);
          
          if (error) {
            console.error('[AuthContext.onAuthStateChange] Error merging visitor_id:', error);
          } else {
            console.log('[AuthContext.onAuthStateChange] Visitor merged successfully');
          }
        } catch (err) {
          console.error('[AuthContext.onAuthStateChange] Unexpected error during visitor merge:', err);
        }
        
        // Charger le profil basé sur le téléphone
        console.log('[AuthContext.onAuthStateChange] Fetching profile for phone:', currentSession.user.phone);
        const profile = await fetchSupabaseProfile(currentSession.user.phone);
        console.log('[AuthContext.onAuthStateChange] Profile fetched:', { found: !!profile, id: profile?.id });
      } else {
        console.log('[AuthContext.onAuthStateChange] User logged out');
        setSupabaseProfile(null);
        resetVisitorIdCache();
      }

      console.log('[AuthContext.onAuthStateChange] Setting isBootstrapping to false');
      setIsBootstrapping(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchSupabaseProfile]);

  const refreshProfile = useCallback(async () => {
    console.log('[AuthContext.refreshProfile] START');
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    console.log('[AuthContext.refreshProfile] Current session:', { 
      exists: !!currentSession, 
      phone: (currentSession?.user as any)?.phone 
    });

    if (!currentSession?.user) {
      console.log('[AuthContext.refreshProfile] No session - setting profile to null');
      setSupabaseProfile(null);
      return null;
    }

    setIsRefreshingProfile(true);
    try {
      console.log('[AuthContext.refreshProfile] Fetching profile for phone:', currentSession.user.phone);
      const profile = await fetchSupabaseProfile(currentSession.user.phone);
      console.log('[AuthContext.refreshProfile] Profile fetched:', { found: !!profile, id: profile?.id });
      return profile;
    } finally {
      setIsRefreshingProfile(false);
    }
  }, [fetchSupabaseProfile]);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('[AuthContext] Supabase logout error', error);
    } finally {
      setSupabaseProfile(null);
      setSupabaseUser(null);
      setSession(null);
      // Supprimer le visitor_id pour que l'utilisateur soit traité comme nouveau visiteur
      await deleteVisitorId();
    }
  }, []);

  const isLoggedIn = Boolean(supabaseUser && supabaseProfile);
  const value = useMemo<AuthContextValue>(
    () => ({
      supabaseUser,
      supabaseProfile,
      isLoggedIn,
      isLoading: isBootstrapping || isRefreshingProfile,
      logout,
      refreshProfile,
      session,
    }),
    [supabaseUser, supabaseProfile, isBootstrapping, isRefreshingProfile, isLoggedIn, logout, refreshProfile, session],
  );

  useEffect(() => {
    const profileId = supabaseProfile?.id;

    if (!profileId) {
      return;
    }

    const channel = supabase
      .channel(`profiles:id=${profileId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${profileId}` },
        (payload) => {
          const nextProfile = (payload.new as SupabaseProfile | null) ?? null;

          if (nextProfile) {
            setSupabaseProfile(nextProfile);
          } else if (payload.eventType === 'DELETE') {
            setSupabaseProfile(null);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabaseProfile?.id]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
