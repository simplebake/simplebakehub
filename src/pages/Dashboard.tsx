import { useAuth } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Book, ChefHat, Share2, Camera, Sparkles } from "lucide-react";
import { PersonalizedRecommendations } from "@/components/PersonalizedRecommendations";
import { CommunityInsights } from "@/components/CommunityInsights";
import { RecipeDifficultyAnalyzer } from "@/components/RecipeDifficultyAnalyzer";
import { PersonalizedLearningPaths } from "@/components/PersonalizedLearningPaths";
import { AchievementBadges } from "@/components/AchievementBadges";
import { FollowingFeed } from "@/components/FollowingFeed";
import { useContentVisibility } from "@/hooks/useContentVisibility";

interface Tutorial {
  id: string;
  title: string;
  category: string;
  tags: string[];
  content: string;
}

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const { isContentVisible, loading: visibilityLoading } = useContentVisibility();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const isLoading = loading || visibilityLoading;

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
          {isContentVisible('premixes') && (
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
          )}

          {isContentVisible('tutorials') && (
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
          )}

          {isContentVisible('community_bakes') && (
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
          )}

          {/* AI Tools */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/bake-analysis")}>
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Camera className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Bake Photo Analysis</CardTitle>
              <CardDescription>
                Upload a photo and get AI feedback on your bake
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full">
                Analyse Now →
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/recipe-generator")}>
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Recipe Generator</CardTitle>
              <CardDescription>
                Create custom gluten-free recipes from your ingredients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full">
                Create Recipe →
              </Button>
            </CardContent>
          </Card>

        </div>
        {isContentVisible('dashboard_sections', undefined, 'achievements') && (
          <div className="mt-12">
            <AchievementBadges />
          </div>
        )}

        {/* Following Feed */}
        <div className="mt-8">
          <FollowingFeed />
        </div>

        {/* AI-Powered Features */}
        <div className="mt-8 grid lg:grid-cols-2 gap-8">
          {isContentVisible('dashboard_sections', undefined, 'learning_paths') && (
            <PersonalizedLearningPaths 
              onSelectTutorial={(tutorial) => setSelectedTutorial(tutorial)}
            />
          )}
          {isContentVisible('dashboard_sections', undefined, 'recommendations') && (
            <PersonalizedRecommendations limit={3} />
          )}
        </div>

        <div className="mt-8 space-y-8">
          {isContentVisible('dashboard_sections', undefined, 'community_insights') && (
            <CommunityInsights context="Dashboard overview - general baking insights" />
          )}
          
          {isContentVisible('dashboard_sections', undefined, 'recipe_analyzer') && (
            <RecipeDifficultyAnalyzer />
          )}
        </div>

        {/* Tutorial Dialog */}
        <Dialog open={!!selectedTutorial} onOpenChange={() => setSelectedTutorial(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTutorial?.title}</DialogTitle>
            </DialogHeader>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {selectedTutorial?.content.split('\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Dashboard;
