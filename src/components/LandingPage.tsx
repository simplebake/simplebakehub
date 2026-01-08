import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChefHat } from "lucide-react";
import { Header } from "@/components/Header";
export const LandingPage = () => {
  const navigate = useNavigate();
  return <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <ChefHat className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">Simple Bake Hub</h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Your journey to perfect gluten-free bread starts here
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8 py-6">
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/tutorials")} className="text-lg px-8 py-6">
              View Tutorials
            </Button>
          </div>
        </div>
      </main>
    </div>;
};