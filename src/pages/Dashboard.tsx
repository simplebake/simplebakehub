import { useAuth } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Book, ChefHat, Share2, User } from "lucide-react";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome back!</h1>
          <p className="text-muted-foreground">Let's create something delicious today</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/premixes")}>
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <ChefHat className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Guided Bakes</CardTitle>
              <CardDescription>
                Step-by-step instructions for each premix
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full">
                Start Baking →
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/tutorials")}>
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <Book className="h-6 w-6 text-accent" />
              </div>
              <CardTitle>Tutorials</CardTitle>
              <CardDescription>
                Learn tips, techniques, and best practices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full">
                Learn More →
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/share")}>
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center mb-4">
                <Share2 className="h-6 w-6 text-secondary-foreground" />
              </div>
              <CardTitle>Share Your Bake</CardTitle>
              <CardDescription>
                Show off your creations to the community
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full">
                Share Now →
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
