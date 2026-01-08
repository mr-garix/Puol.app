import { useEffect } from "react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminRoleProvider } from "@/contexts/AdminRoleContext";
import { AdminAuthProvider, useAdminAuth } from "@/contexts/AdminAuthContext";
import { initializeAdminAccount } from "@/lib/initializeAdmin";

function AppContent() {
  const { logout } = useAdminAuth();

  useEffect(() => {
    console.log('[App] Initializing admin account on app start...');
    const initAdmin = async () => {
      try {
        const success = await initializeAdminAccount();
        if (success) {
          console.log('[App] Admin account initialization completed');
        } else {
          console.warn('[App] Admin account initialization failed');
        }
      } catch (err) {
        console.error('[App] Error during admin initialization:', err);
      }
    };
    void initAdmin();
  }, []);

  const handleLogout = async () => {
    console.log('[App] Logging out...');
    await logout();
    console.log('[App] Logged out successfully');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminDashboard onLogout={handleLogout} />
      <Toaster position="top-right" />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AdminAuthProvider>
        <AdminRoleProvider>
          <AppContent />
        </AdminRoleProvider>
      </AdminAuthProvider>
    </AuthProvider>
  );
}

export default App;
