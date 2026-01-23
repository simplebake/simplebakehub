import { useAuth } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Header } from "@/components/Header";
import { TutorialsManager } from "@/components/TutorialsManager";
import { useUserRole } from "@/hooks/useUserRole";

const TutorialsManagement = () => {
  const { user, loading } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    // Redirect non-admin users
    if (!loading && user && !isAdmin) {
      navigate("/tutorials");
    }
  }, [user, loading, isAdmin, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground">Tutorials Management</h1>
          <p className="text-muted-foreground mt-1">
            Create, edit, and manage learning tutorials for the community
          </p>
        </div>
        <TutorialsManager />
      </main>
    </div>
  );
};

export default TutorialsManagement;
