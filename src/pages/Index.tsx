import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChefHat, Book, Users, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/supabase";
import { SmartTipCard } from "@/components/SmartTipCard";
import { RelatedPremixes } from "@/components/RelatedPremixes";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <ChefHat className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
            Simple Bake Lab
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Your journey to perfect gluten-free bread starts here
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Button size="lg" onClick={() => navigate("/dashboard")} className="text-lg px-8 py-6">
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8 py-6">
                  Get Started
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="text-lg px-8 py-6">
                  Sign In
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-card p-8 rounded-xl shadow-sm border border-border text-center">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <ChefHat className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-3">Guided Baking</h3>
            <p className="text-muted-foreground">
              Step-by-step instructions for every premix, from prep to perfect loaf
            </p>
          </div>

          <div className="bg-card p-8 rounded-xl shadow-sm border border-border text-center">
            <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Book className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-xl font-bold mb-3">Expert Tutorials</h3>
            <p className="text-muted-foreground">
              Learn techniques, tips, and tricks from beginner to advanced
            </p>
          </div>

          <div className="bg-card p-8 rounded-xl shadow-sm border border-border text-center">
            <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-secondary-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-3">Community</h3>
            <p className="text-muted-foreground">
              Share your bakes, get inspired, and connect with fellow bakers
            </p>
          </div>
        </div>

        {/* Why Choose Us */}
        <div className="mt-20 text-center max-w-3xl mx-auto">
          <Sparkles className="h-8 w-8 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-6">Why Simple Bake Lab?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            We make gluten-free baking simple, accessible, and delicious. With our curated premixes and 
            detailed guidance, you'll achieve bakery-quality results every time.
          </p>
          <div className="grid sm:grid-cols-2 gap-6 text-left">
            <div className="flex gap-3">
              <div className="text-primary text-xl">✓</div>
              <div>
                <h4 className="font-semibold mb-1">Premium Premixes</h4>
                <p className="text-sm text-muted-foreground">
                  Carefully crafted blends for consistent results
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-primary text-xl">✓</div>
              <div>
                <h4 className="font-semibold mb-1">Interactive Guides</h4>
                <p className="text-sm text-muted-foreground">
                  Follow along at your own pace with clear instructions
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-primary text-xl">✓</div>
              <div>
                <h4 className="font-semibold mb-1">Mobile-First</h4>
                <p className="text-sm text-muted-foreground">
                  Access your recipes anywhere, anytime
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-primary text-xl">✓</div>
              <div>
                <h4 className="font-semibold mb-1">Supportive Community</h4>
                <p className="text-sm text-muted-foreground">
                  Learn from and inspire other bakers
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Smart Tip Section */}
        <div className="mt-20 max-w-2xl mx-auto">
          <SmartTipCard context="home" />
        </div>

        {/* Featured Premixes */}
        <div className="mt-20">
          <RelatedPremixes limit={3} />
        </div>
      </div>
    </div>
  );
};

export default Index;
