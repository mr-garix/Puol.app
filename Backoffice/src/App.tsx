import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminUnifiedAuthPage } from "@/components/admin/AdminUnifiedAuthPage";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminRoleProvider } from "@/contexts/AdminRoleContext";
import { AdminAuthProvider, useAdminAuth } from "@/contexts/AdminAuthContext";

function AppContent() {
  const { isAdminAuthenticated, logout } = useAdminAuth();

  const handleLogout = async () => {
    console.log('[App] Logging out...');
    await logout();
    console.log('[App] Logged out successfully');
  };

  const handleLoginSuccess = (profile: any) => {
    console.log('[App] Admin login successful:', profile.id);
  };

  // Si l'utilisateur n'est pas authentifié, afficher la page de login
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AdminUnifiedAuthPage onLoginSuccess={handleLoginSuccess} />
        <Toaster position="top-right" />
      </div>
    );
  }

  // Si l'utilisateur est authentifié, afficher le dashboard
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
