import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, BookOpen, Users, Star, Sparkles, Award } from "lucide-react";
import { Header } from "@/components/Header";
import { useContentVisibility } from "@/hooks/useContentVisibility";

export const LandingPage = () => {
  const navigate = useNavigate();
  const { isContentVisible, loading } = useContentVisibility();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16 max-w-6xl">
        {/* Hero Section */}
        {isContentVisible('landing_page', undefined, 'hero') && (
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
        )}

        {/* Features Section */}
        {isContentVisible('landing_page', undefined, 'features') && (
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-8 text-foreground">Why Choose Simple Bake Hub?</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Step-by-Step Guides</CardTitle>
                  <CardDescription>
                    Follow our detailed tutorials for perfect results every time
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Community Support</CardTitle>
                  <CardDescription>
                    Join thousands of bakers sharing tips and creations
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>AI-Powered Tips</CardTitle>
                  <CardDescription>
                    Get personalized recommendations based on your baking journey
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        )}

        {/* Benefits Section */}
        {isContentVisible('landing_page', undefined, 'benefits') && (
          <div className="mb-16 bg-muted/50 rounded-2xl p-8 md:p-12">
            <h2 className="text-3xl font-bold text-center mb-8 text-foreground">Perfect for Every Baker</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Star className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Premium Premixes</h3>
                  <p className="text-muted-foreground">High-quality gluten-free premixes designed for consistent results</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Award className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Achievement System</h3>
                  <p className="text-muted-foreground">Earn badges as you progress through your baking journey</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CTA Section */}
        {isContentVisible('landing_page', undefined, 'cta') && (
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4 text-foreground">Ready to Start Baking?</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Join our community today and discover the joy of gluten-free baking with expert guidance.
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8 py-6">
              Create Your Free Account
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};
