import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { logoutAdmin } from '@/lib/adminAuthService';
import { supabase } from '@/lib/supabaseClient';

interface AdminAuthContextType {
  isAdminAuthenticated: boolean;
  adminUser: AdminUser | null;
  loginWithOtp: (phone: string, otp: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: () => Promise<boolean>;
  isLoading: boolean;
}

interface AdminUser {
  id: string;
  phone: string;
  first_name: string;
  last_name: string | null;
  role: string;
  avatar?: string;
}

interface AdminAuthContextType {
  isAdminAuthenticated: boolean;
  adminUser: AdminUser | null;
  loginWithOtp: (phone: string, otp: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: () => Promise<boolean>;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
  setAuthenticatedUser: (user: AdminUser) => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const ADMIN_SESSION_KEY = 'puol_admin_session';

interface AdminSession {
  user: AdminUser;
  expiresAt: number;
}

const ADMIN_SUPABASE_SESSION_KEY = 'puol_admin_supabase_session';

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = useCallback(async (): Promise<boolean> => {
    try {
      console.log('[AdminAuthContext.checkSession] START');
      const sessionData = localStorage.getItem(ADMIN_SESSION_KEY);
      console.log('[AdminAuthContext.checkSession] sessionData exists:', !!sessionData);
      
      if (!sessionData) {
        console.log('[AdminAuthContext.checkSession] No session found in localStorage');
        setIsLoading(false);
        return false;
      }

      const session: AdminSession = JSON.parse(sessionData);
      console.log('[AdminAuthContext.checkSession] Parsed session:', { userId: session.user.id, expiresAt: new Date(session.expiresAt).toISOString() });
      
      // Vérifier si la session est expirée
      if (session.expiresAt < Date.now()) {
        console.log('[AdminAuthContext.checkSession] Session expired');
        localStorage.removeItem(ADMIN_SESSION_KEY);
        localStorage.removeItem(ADMIN_SUPABASE_SESSION_KEY);
        setIsLoading(false);
        return false;
      }

      // Restaurer la session Supabase si elle existe
      const supabaseSessionData = localStorage.getItem(ADMIN_SUPABASE_SESSION_KEY);
      if (supabaseSessionData && supabase) {
        try {
          console.log('[AdminAuthContext.checkSession] Restoring Supabase session from localStorage...');
          const supabaseSession = JSON.parse(supabaseSessionData);
          const { error: setSessionError } = await supabase.auth.setSession(supabaseSession);
          if (setSessionError) {
            console.warn('[AdminAuthContext.checkSession] Warning: Could not restore Supabase session:', setSessionError);
          } else {
            console.log('[AdminAuthContext.checkSession] Supabase session restored successfully');
          }
        } catch (err) {
          console.warn('[AdminAuthContext.checkSession] Warning: Error restoring Supabase session:', err);
        }
      }

      // Session valide
      console.log('[AdminAuthContext.checkSession] Session valid, setting authenticated state');
      setAdminUser(session.user);
      setIsAdminAuthenticated(true);
      setIsLoading(false);
      console.log('[AdminAuthContext.checkSession] SUCCESS');
      return true;
    } catch (error) {
      console.error('[AdminAuthContext.checkSession] ERROR:', error);
      localStorage.removeItem(ADMIN_SESSION_KEY);
      localStorage.removeItem(ADMIN_SUPABASE_SESSION_KEY);
      setIsLoading(false);
      return false;
    }
  }, []);

  // Vérifier la session au chargement
  useEffect(() => {
    console.log('[AdminAuthContext] useEffect: checking session on mount');
    const run = async () => {
      console.log('[AdminAuthContext] useEffect: calling checkSession');
      await checkSession();
    };
    void run();
  }, [checkSession]);

  // Rafraîchir la session Supabase toutes les 5 minutes pour éviter l'expiration
  useEffect(() => {
    if (!isAdminAuthenticated) {
      return;
    }

    console.log('[AdminAuthContext] Setting up session refresh interval (5 minutes)');
    const interval = setInterval(async () => {
      console.log('[AdminAuthContext] Refreshing Supabase session...');
      if (supabase) {
        try {
          const { data: sessionData, error: sessionError } = await supabase.auth.refreshSession();
          if (sessionError) {
            console.warn('[AdminAuthContext] Error refreshing session:', sessionError);
          } else if (sessionData.session) {
            console.log('[AdminAuthContext] Session refreshed successfully');
            // Sauvegarder la nouvelle session
            try {
              localStorage.setItem(ADMIN_SUPABASE_SESSION_KEY, JSON.stringify(sessionData.session));
              console.log('[AdminAuthContext] Updated session saved to localStorage');
            } catch (err) {
              console.warn('[AdminAuthContext] Warning: Could not save updated session:', err);
            }
          }
        } catch (err) {
          console.error('[AdminAuthContext] Exception during session refresh:', err);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      console.log('[AdminAuthContext] Clearing session refresh interval');
      clearInterval(interval);
    };
  }, [isAdminAuthenticated]);

  const loginWithOtp = async (phone: string, otp: string): Promise<boolean> => {
    try {
      console.log('[AdminAuthContext] Logging in with OTP');
      const { verifyAdminOtp } = await import('@/lib/adminAuthService');
      
      const result = await verifyAdminOtp(phone, otp);
      
      if (!result.profile) {
        throw new Error('Admin profile not found');
      }

      // Vérifier que le profil a bien le rôle 'admin'
      if (result.profile.role !== 'admin') {
        console.error('[AdminAuthContext] User is not an admin. Role:', result.profile.role);
        throw new Error(`Unauthorized: User role is '${result.profile.role}', expected 'admin'`);
      }

      const firstName = result.profile.first_name || 'Admin';
      const lastName = result.profile.last_name || '';
      const role = result.profile.role;
      const user: AdminUser = {
        id: result.profile.id,
        phone: result.profile.phone,
        first_name: firstName,
        last_name: lastName,
        role: role,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}&background=2ECC71&color=fff`,
      };

      // Créer la session (30 jours)
      const session: AdminSession = {
        user: user,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      };

      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
      
      setAdminUser(user);
      setIsAdminAuthenticated(true);

      console.log('[AdminAuthContext] Login successful, admin role verified');
      return true;
    } catch (error) {
      console.error('[AdminAuthContext] Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      console.log('[AdminAuthContext] Logging out');
      await logoutAdmin();
      localStorage.removeItem(ADMIN_SESSION_KEY);
      localStorage.removeItem(ADMIN_SUPABASE_SESSION_KEY);
      setAdminUser(null);
      setIsAdminAuthenticated(false);
      console.log('[AdminAuthContext] Logout successful');
    } catch (error) {
      console.error('[AdminAuthContext] Logout error:', error);
      localStorage.removeItem(ADMIN_SESSION_KEY);
      localStorage.removeItem(ADMIN_SUPABASE_SESSION_KEY);
      setAdminUser(null);
      setIsAdminAuthenticated(false);
    }
  };

  const refreshSession = async () => {
    console.log('[AdminAuthContext] Refreshing session...');
    await checkSession();
  };

  const setAuthenticatedUser = (user: AdminUser) => {
    console.log('[AdminAuthContext.setAuthenticatedUser] Setting user:', user.id);
    
    // Sauvegarder dans localStorage
    const session: AdminSession = {
      user: user,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 jours
    };
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
    console.log('[AdminAuthContext.setAuthenticatedUser] Session saved to localStorage');
    
    // Mettre à jour l'état
    setAdminUser(user);
    setIsAdminAuthenticated(true);
    console.log('[AdminAuthContext.setAuthenticatedUser] State updated');
  };

  // Afficher un loader pendant la vérification initiale
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#2ECC71] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Vérification de la session...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminAuthContext.Provider
      value={{
        isAdminAuthenticated,
        adminUser,
        loginWithOtp,
        logout,
        checkSession,
        isLoading,
        refreshSession,
        setAuthenticatedUser,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
