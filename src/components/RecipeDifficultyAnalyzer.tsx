import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Sparkles, Clock, TrendingUp, Lightbulb } from 'lucide-react';

interface RecipeAnalysis {
  difficulty: string;
  difficultyScore: number;
  reasoning: string;
  keyFactors: string[];
  timeEstimate: string;
  skillsRequired: string[];
  recommendedFor: string;
  tips: string;
}

export const RecipeDifficultyAnalyzer = () => {
  const [recipeText, setRecipeText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<RecipeAnalysis | null>(null);
  const { toast } = useToast();

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
      case 'hard': return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20';
      case 'expert': return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const analyzeRecipe = async () => {
    if (!recipeText.trim()) {
      toast({
        title: 'Recipe Required',
        description: 'Please enter a recipe to analyze.',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-recipe-difficulty', {
        body: { recipeText: recipeText.trim() }
      });

      if (error) {
        if (error.message.includes('429')) {
          toast({
            title: 'Rate Limit',
            description: 'Too many requests. Please try again later.',
            variant: 'destructive',
          });
          return;
        }
        if (error.message.includes('402')) {
          toast({
            title: 'Credits Required',
            description: 'Please add credits to continue using AI features.',
            variant: 'destructive',
          });
          return;
        }
        throw error;
      }

      setAnalysis(data.analysis);
      toast({
        title: 'Analysis Complete',
        description: 'Your recipe has been analyzed successfully.',
      });
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: 'Analysis Failed',
        description: 'Failed to analyze recipe. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">Recipe Difficulty Analyzer</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Paste your recipe below and our AI will analyze its difficulty level, required skills, and provide helpful insights.
              </p>
            </div>
          </div>

          <Textarea
            placeholder="Paste your recipe here... Include ingredients, measurements, and step-by-step instructions for the most accurate analysis."
            value={recipeText}
            onChange={(e) => setRecipeText(e.target.value)}
            className="min-h-[200px] resize-y"
            disabled={isAnalyzing}
          />

          <Button 
            onClick={analyzeRecipe} 
            disabled={isAnalyzing || !recipeText.trim()}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Recipe...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Analyze Difficulty
              </>
            )}
          </Button>
        </div>
      </Card>

      {analysis && (
        <Card className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Difficulty Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-2xl font-bold mb-2">Difficulty Assessment</h3>
              <p className="text-muted-foreground">{analysis.reasoning}</p>
            </div>
            <div className="text-center">
              <Badge className={`text-lg px-4 py-2 ${getDifficultyColor(analysis.difficulty)}`}>
                {analysis.difficulty}
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                Score: {analysis.difficultyScore}/10
              </p>
            </div>
          </div>

          {/* Key Factors */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Key Factors
            </h4>
            <ul className="space-y-2">
              {analysis.keyFactors.map((factor, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-1">•</span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Time & Skills Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Time Estimate
              </h4>
              <p className="text-sm bg-muted p-3 rounded-lg">{analysis.timeEstimate}</p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Recommended For</h4>
              <p className="text-sm bg-muted p-3 rounded-lg">{analysis.recommendedFor}</p>
            </div>
          </div>

          {/* Skills Required */}
          <div>
            <h4 className="font-semibold mb-3">Skills Required</h4>
            <div className="flex flex-wrap gap-2">
              {analysis.skillsRequired.map((skill, index) => (
                <Badge key={index} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          {/* Pro Tip */}
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
            <h4 className="font-semibold mb-2 flex items-center gap-2 text-primary">
              <Lightbulb className="h-4 w-4" />
              Pro Tip
            </h4>
            <p className="text-sm">{analysis.tips}</p>
          </div>
        </Card>
      )}
    </div>
  );
};
