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
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setFirebaseUser(user);

      if (user) {
        fetchSupabaseProfile(user.uid).finally(() => {
          setIsBootstrapping(false);
        });
      } else {
        setSupabaseProfile(null);
        setIsBootstrapping(false);
      }
    });

    return unsubscribe;
  }, [fetchSupabaseProfile]);

  const refreshProfile = useCallback(async () => {
    if (!firebaseUser) {
      setSupabaseProfile(null);
      return null;
    }

    setIsRefreshingProfile(true);
    try {
      return await fetchSupabaseProfile(firebaseUser.uid);
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
      setSupabaseProfile(null);
      setFirebaseUser(null);
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
