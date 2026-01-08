import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getCurrentAdminSession, logoutAdmin } from '@/lib/adminAuthService';

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

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = useCallback(async (): Promise<boolean> => {
    try {
      console.log('[AdminAuthContext.checkSession] START');
      const sessionData = localStorage.getItem(ADMIN_SESSION_KEY);
      console.log('[AdminAuthContext.checkSession] sessionData exists:', !!sessionData);
      console.log('[AdminAuthContext.checkSession] sessionData raw:', sessionData);
      
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
        setIsLoading(false);
        return false;
      }

      // Session valide - on fait confiance au localStorage sans vérifier Supabase
      // (La vérification Supabase peut échouer si persistSession est false)
      console.log('[AdminAuthContext.checkSession] Session valid, setting authenticated state');
      setAdminUser(session.user);
      setIsAdminAuthenticated(true);
      setIsLoading(false);
      console.log('[AdminAuthContext.checkSession] SUCCESS');
      return true;
    } catch (error) {
      console.error('[AdminAuthContext.checkSession] ERROR:', error);
      localStorage.removeItem(ADMIN_SESSION_KEY);
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

  const loginWithOtp = async (phone: string, otp: string): Promise<boolean> => {
    try {
      console.log('[AdminAuthContext] Logging in with OTP');
      const { verifyAdminOtp } = await import('@/lib/adminAuthService');
      
      const result = await verifyAdminOtp(phone, otp);
      
      if (!result.profile) {
        throw new Error('Admin profile not found');
      }

      const firstName = result.profile.first_name || 'Admin';
      const lastName = result.profile.last_name || '';
      const role = result.profile.role || 'admin';
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

      console.log('[AdminAuthContext] Login successful');
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
      setAdminUser(null);
      setIsAdminAuthenticated(false);
      console.log('[AdminAuthContext] Logout successful');
    } catch (error) {
      console.error('[AdminAuthContext] Logout error:', error);
      localStorage.removeItem(ADMIN_SESSION_KEY);
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
