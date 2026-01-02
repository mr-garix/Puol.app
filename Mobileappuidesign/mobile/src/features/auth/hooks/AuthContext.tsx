import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';

import { firebaseAuth } from '@/src/firebaseClient';
import { supabase } from '@/src/supabaseClient';
import type { Tables } from '@/src/types/supabase.generated';
import { clearSupabaseSession, syncSupabaseSession } from '../supabaseSession';
import { getOrCreateVisitorId, resetVisitorIdCache, deleteVisitorId } from '@/src/utils/visitorId';

export type SupabaseProfile = Tables<'profiles'>;

// Deprecated alias kept for backward compatibility during the refactor period
export type AuthUser = SupabaseProfile;

type AuthContextValue = {
  firebaseUser: User | null;
  supabaseProfile: SupabaseProfile | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<SupabaseProfile | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [supabaseProfile, setSupabaseProfile] = useState<SupabaseProfile | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isRefreshingProfile, setIsRefreshingProfile] = useState(false);

  const fetchSupabaseProfile = useCallback(async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('[AuthContext] Failed to load Supabase profile', error);
        }
        setSupabaseProfile(null);
        return null;
      }

      const profile = (data as SupabaseProfile) ?? null;
      setSupabaseProfile(profile);
      return profile;
    } catch (err) {
      console.error('[AuthContext] Unexpected Supabase profile error', err);
      setSupabaseProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      setFirebaseUser(user);

      if (user) {
        // Synchroniser la session Supabase pour que les services backend reconnaissent l'utilisateur
        await syncSupabaseSession(user);
        
        // Merge du visitor_id au login
        try {
          const visitorId = await getOrCreateVisitorId();
          console.log('[AuthContext] Merging visitor_id:', visitorId, 'with user_id:', user.uid);
          
          const { error } = await supabase
            .from('visitor_activity_heartbeat')
            .update({
              linked_user_id: user.uid,
              merged_at: new Date().toISOString(),
              last_activity_at: new Date().toISOString(),
            })
            .eq('visitor_id', visitorId);
          
          if (error) {
            console.error('[AuthContext] Error merging visitor_id:', error);
          } else {
            console.log('[AuthContext] Visitor merged successfully');
          }
        } catch (err) {
          console.error('[AuthContext] Unexpected error during visitor merge:', err);
        }
        
        fetchSupabaseProfile(user.uid).finally(() => {
          setIsBootstrapping(false);
        });
      } else {
        await clearSupabaseSession();
        setSupabaseProfile(null);
        resetVisitorIdCache();
        setIsBootstrapping(false);
      }
    });

    return unsubscribe;
  }, [fetchSupabaseProfile]);

  const refreshProfile = useCallback(async () => {
    const currentUser = firebaseAuth.currentUser ?? firebaseUser;

    if (!currentUser) {
      setSupabaseProfile(null);
      return null;
    }

    // Synchroniser à nouveau la session Supabase au cas où le token Firebase a été rafraîchi
    await syncSupabaseSession(currentUser);

    setIsRefreshingProfile(true);
    try {
      return await fetchSupabaseProfile(currentUser.uid);
    } finally {
      setIsRefreshingProfile(false);
    }
  }, [fetchSupabaseProfile, firebaseUser]);

  const logout = useCallback(async () => {
    try {
      await signOut(firebaseAuth);
    } catch (error) {
      console.error('[AuthContext] Firebase logout error', error);
    } finally {
      await clearSupabaseSession();
      setSupabaseProfile(null);
      setFirebaseUser(null);
      // Supprimer le visitor_id pour que l'utilisateur soit traité comme nouveau visiteur
      await deleteVisitorId();
    }
  }, []);

  const isLoggedIn = Boolean(firebaseUser && supabaseProfile);
  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      supabaseProfile,
      isLoggedIn,
      isLoading: isBootstrapping || isRefreshingProfile,
      logout,
      refreshProfile,
    }),
    [firebaseUser, supabaseProfile, isBootstrapping, isRefreshingProfile, isLoggedIn, logout, refreshProfile],
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
