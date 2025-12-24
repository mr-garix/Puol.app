import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

interface AdminAuthContextType {
  isAdminAuthenticated: boolean;
  adminUser: AdminUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkSession: () => Promise<boolean>;
}

interface AdminUser {
  email: string;
  name: string;
  role: string;
  avatar?: string;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const ADMIN_SESSION_KEY = 'puol_admin_session';
const ADMIN_SESSION_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 jours

interface AdminSession {
  user: AdminUser;
  token: string;
  expiresAt: number;
}

const getCurrentTimestamp = () => Date.now();

const createSessionToken = () =>
  `token_${getCurrentTimestamp()}_${Math.random().toString(36).slice(2)}`;

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const renewSession = useCallback(async (oldSession: AdminSession): Promise<boolean> => {
    try {
      // Ici vous pouvez implémenter une vraie API de renouvellement
      // Pour l'instant, on simule un renouvellement automatique
      
      // Simuler une vérification API (normalement vous appelleriez votre backend)
      await new Promise(resolve => setTimeout(resolve, 100));

      const newSession: AdminSession = {
        user: oldSession.user,
        token: oldSession.token, // Dans un vrai système, obtenir un nouveau token
        expiresAt: getCurrentTimestamp() + ADMIN_SESSION_EXPIRY,
      };

      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(newSession));
      setAdminUser(newSession.user);
      setIsAdminAuthenticated(true);
      
      return true;
    } catch (error) {
      console.error('Erreur lors du renouvellement de session:', error);
      localStorage.removeItem(ADMIN_SESSION_KEY);
      return false;
    }
  }, []);

  const checkSession = useCallback(async (): Promise<boolean> => {
    await Promise.resolve();
    try {
      const sessionData = localStorage.getItem(ADMIN_SESSION_KEY);
      
      if (!sessionData) {
        setIsLoading(false);
        return false;
      }

      const session: AdminSession = JSON.parse(sessionData);
      
      // Vérifier si la session est expirée
      if (session.expiresAt < getCurrentTimestamp()) {
        // Session expirée, essayer de renouveler automatiquement
        const renewed = await renewSession(session);
        setIsLoading(false);
        return renewed;
      }

      // Session valide
      setAdminUser(session.user);
      setIsAdminAuthenticated(true);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Erreur lors de la vérification de session:', error);
      localStorage.removeItem(ADMIN_SESSION_KEY);
      setIsLoading(false);
      return false;
    }
  }, [renewSession]);

  // Vérifier la session au chargement
  useEffect(() => {
    const run = async () => {
      await checkSession();
    };
    void run();
  }, [checkSession]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      void password;
      // Simuler une authentification (à remplacer par votre vraie API)
      // Pour la démo, on accepte n'importe quel email/mot de passe
      
      // Simuler un délai API
      await new Promise(resolve => setTimeout(resolve, 500));

      // Créer l'utilisateur admin
      const user: AdminUser = {
        email: email,
        name: email.split('@')[0],
        role: email.includes('super') ? 'Super Admin' : 'Admin',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(email.split('@')[0])}&background=2ECC71&color=fff`,
      };

      // Créer la session
      const session: AdminSession = {
        user: user,
        token: createSessionToken(), // Générer un token (simulé)
        expiresAt: getCurrentTimestamp() + ADMIN_SESSION_EXPIRY,
      };

      // Sauvegarder la session
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
      
      setAdminUser(user);
      setIsAdminAuthenticated(true);

      return true;
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setAdminUser(null);
    setIsAdminAuthenticated(false);
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
        login,
        logout,
        checkSession,
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
