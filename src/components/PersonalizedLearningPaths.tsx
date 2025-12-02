import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  GraduationCap, 
  Target, 
  TrendingUp, 
  Award, 
  RefreshCw,
  ChevronRight,
  Sparkles,
  BookOpen,
  AlertCircle
} from 'lucide-react';

interface LearningPathItem {
  tutorialId: string;
  priority: number;
  reason: string;
  skillGap: string;
  tutorial: {
    id: string;
    title: string;
    category: string;
    tags: string[];
    content: string;
  };
}

interface SkillAssessment {
  strengths: string[];
  areasToImprove: string[];
  recommendedNextLevel: string;
}

interface LearningPathData {
  learningPath: LearningPathItem[];
  skillAssessment: SkillAssessment;
  encouragement: string;
  stats: {
    totalBakes: number;
    avgRating: string;
    tutorialsAvailable: number;
  };
}

interface PersonalizedLearningPathsProps {
  className?: string;
  onSelectTutorial?: (tutorial: LearningPathItem['tutorial']) => void;
}

export const PersonalizedLearningPaths = ({ 
  className = '',
  onSelectTutorial 
}: PersonalizedLearningPathsProps) => {
  const [data, setData] = useState<LearningPathData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchLearningPath = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Please sign in to view your personalised learning path');
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/personalized-learning-paths`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast({
            title: 'Rate Limited',
            description: 'Too many requests. Please try again later.',
            variant: 'destructive',
          });
          return;
        }
        if (response.status === 402) {
          toast({
            title: 'Credits Required',
            description: 'Please add credits to use AI features.',
            variant: 'destructive',
          });
          return;
        }
        throw new Error('Failed to fetch learning path');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Learning path error:', err);
      setError('Unable to generate learning path. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to generate your personalised learning path.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLearningPath();
  }, []);

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'intermediate': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'advanced': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default: return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'basics': return 'bg-blue-500/20 text-blue-400';
      case 'techniques': return 'bg-purple-500/20 text-purple-400';
      case 'troubleshooting': return 'bg-orange-500/20 text-orange-400';
      case 'advanced': return 'bg-rose-500/20 text-rose-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <Card className={`${className} animate-pulse`}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Personalised Learning Path</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-20 bg-muted rounded-lg" />
          <div className="h-32 bg-muted rounded-lg" />
          <div className="h-24 bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Personalised Learning Path</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchLearningPath} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const progressPercentage = Math.min(
    ((data.stats.totalBakes / 10) * 100),
    100
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Personalised Learning Path</CardTitle>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={fetchLearningPath}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>
          AI-curated tutorials based on your baking journey
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Encouragement Banner */}
        {data.encouragement && (
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg p-4 border border-primary/20">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/90 italic">
                "{data.encouragement}"
              </p>
            </div>
          </div>
        )}

        {/* Progress Overview */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-primary">{data.stats.totalBakes}</p>
            <p className="text-xs text-muted-foreground">Bakes Completed</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-primary">{data.stats.avgRating}</p>
            <p className="text-xs text-muted-foreground">Avg. Rating</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <Badge className={`${getLevelColor(data.skillAssessment.recommendedNextLevel)} text-xs`}>
              {data.skillAssessment.recommendedNextLevel}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">Your Level</p>
          </div>
        </div>

        {/* Skill Assessment */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Skill Assessment
          </h4>
          
          {data.skillAssessment.strengths.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Award className="h-3 w-3" /> Strengths
              </p>
              <div className="flex flex-wrap gap-1.5">
                {data.skillAssessment.strengths.map((strength, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs"
                  >
                    {strength}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {data.skillAssessment.areasToImprove.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Areas to Develop
              </p>
              <div className="flex flex-wrap gap-1.5">
                {data.skillAssessment.areasToImprove.map((area, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs"
                  >
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Learning Path Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Learning Progress</span>
            <span className="text-primary font-medium">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Recommended Tutorials */}
        {data.learningPath.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Recommended Next Steps
            </h4>
            
            <div className="space-y-2">
              {data.learningPath.map((item, idx) => (
                <button
                  key={item.tutorialId}
                  onClick={() => onSelectTutorial?.(item.tutorial)}
                  className="w-full text-left group"
                >
                  <div className="bg-muted/30 hover:bg-muted/50 rounded-lg p-3 transition-all border border-transparent hover:border-primary/20">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="font-medium text-sm truncate">
                              {item.tutorial.title}
                            </h5>
                            <Badge className={`${getCategoryColor(item.tutorial.category)} text-xs`}>
                              {item.tutorial.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {item.reason}
                          </p>
                          <Badge 
                            variant="outline" 
                            className="mt-2 text-xs bg-background/50"
                          >
                            Addresses: {item.skillGap}
                          </Badge>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {data.learningPath.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Complete more bakes to unlock personalised recommendations!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
