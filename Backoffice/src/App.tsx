import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminRoleProvider } from "@/contexts/AdminRoleContext";

function App() {
  return (
    <AuthProvider>
      <AdminRoleProvider>
        <div className="min-h-screen bg-background text-foreground">
          <AdminDashboard
            onLogout={() => {
              console.info("Mock logout");
            }}
          />
          <Toaster position="top-right" />
        </div>
      </AdminRoleProvider>
    </AuthProvider>
  );
}

export default App;
