import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Award, 
  RefreshCw, 
  Lock,
  Sparkles,
  Trophy
} from 'lucide-react';

interface BadgeData {
  type: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt: string | null;
}

interface AchievementStats {
  totalBakes: number;
  successfulBakes: number;
  highRatedBakes: number;
  differentPremixesBaked: number;
  bakesShared: number;
}

interface AchievementBadgesProps {
  className?: string;
  compact?: boolean;
}

export const AchievementBadges = ({ className = '', compact = false }: AchievementBadgesProps) => {
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [newBadges, setNewBadges] = useState<BadgeData[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const { toast } = useToast();

  const fetchAchievements = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-achievements`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch achievements');
      }

      const data = await response.json();
      setBadges(data.allBadges || []);
      setStats(data.stats);

      // Show celebration for newly earned badges
      if (data.newlyEarned && data.newlyEarned.length > 0) {
        setNewBadges(data.newlyEarned.map((b: any) => ({
          type: b.badge_type,
          name: b.badge_name,
          description: b.badge_description,
          icon: b.badge_icon,
          earned: true,
          earnedAt: new Date().toISOString(),
        })));
        setShowCelebration(true);
        
        toast({
          title: '🎉 New Achievement Unlocked!',
          description: `You earned: ${data.newlyEarned.map((b: any) => b.badge_name).join(', ')}`,
        });
      }
    } catch (err) {
      console.error('Achievement fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAchievements();
  }, []);

  const earnedCount = badges.filter(b => b.earned).length;
  const totalCount = badges.length;
  const progressPercentage = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <Card className={`${className} animate-pulse`}>
        <CardHeader className={compact ? 'pb-2' : ''}>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Achievements</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-12 w-12 bg-muted rounded-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <>
        <Card className={className}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Achievements</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">
                {earnedCount}/{totalCount}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {badges.slice(0, 5).map((badge) => (
                <div
                  key={badge.type}
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-lg
                    transition-all cursor-default
                    ${badge.earned 
                      ? 'bg-gradient-to-br from-amber-400/20 to-amber-600/20 border-2 border-amber-500/50 shadow-lg shadow-amber-500/20' 
                      : 'bg-muted/50 border border-muted-foreground/20 grayscale opacity-40'
                    }
                  `}
                  title={`${badge.name}${badge.earned ? ' ✓' : ' (Locked)'}`}
                >
                  {badge.icon}
                </div>
              ))}
              {badges.length > 5 && (
                <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-xs text-muted-foreground">
                  +{badges.length - 5}
                </div>
              )}
            </div>
            <Progress value={progressPercentage} className="h-1.5 mt-3" />
          </CardContent>
        </Card>

        {/* Celebration Dialog */}
        <Dialog open={showCelebration} onOpenChange={setShowCelebration}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-center justify-center">
                <Sparkles className="h-6 w-6 text-amber-500" />
                Achievement Unlocked!
                <Sparkles className="h-6 w-6 text-amber-500" />
              </DialogTitle>
              <DialogDescription className="text-center">
                Congratulations on your progress!
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              {newBadges.map((badge) => (
                <div key={badge.type} className="flex flex-col items-center gap-2">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400/30 to-amber-600/30 border-4 border-amber-500 flex items-center justify-center text-4xl shadow-lg shadow-amber-500/30 animate-bounce">
                    {badge.icon}
                  </div>
                  <h3 className="font-bold text-lg">{badge.name}</h3>
                  <p className="text-sm text-muted-foreground text-center">{badge.description}</p>
                </div>
              ))}
            </div>
            <Button onClick={() => setShowCelebration(false)} className="w-full">
              Awesome!
            </Button>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Achievement Badges</CardTitle>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={fetchAchievements}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <CardDescription>
            Earn badges by completing milestones on your baking journey
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress Overview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Collection Progress</span>
              <span className="font-medium text-primary">{earnedCount} of {totalCount} badges</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Badge Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {badges.map((badge) => (
              <div
                key={badge.type}
                className={`
                  group relative flex flex-col items-center p-3 rounded-xl transition-all
                  ${badge.earned 
                    ? 'bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-transparent border border-amber-500/30 hover:border-amber-500/50' 
                    : 'bg-muted/30 border border-muted-foreground/10 hover:border-muted-foreground/20'
                  }
                `}
              >
                <div
                  className={`
                    w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-2
                    transition-transform group-hover:scale-110
                    ${badge.earned 
                      ? 'bg-gradient-to-br from-amber-400/30 to-amber-600/30 border-2 border-amber-500/60 shadow-lg shadow-amber-500/20' 
                      : 'bg-muted border border-muted-foreground/20'
                    }
                  `}
                >
                  {badge.earned ? badge.icon : <Lock className="h-5 w-5 text-muted-foreground/50" />}
                </div>
                <span className={`text-xs font-medium text-center ${badge.earned ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {badge.name}
                </span>
                {badge.earned && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-emerald-500 border-0">
                    ✓
                  </Badge>
                )}
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-48">
                  <p className="text-xs font-medium">{badge.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                  {badge.earnedAt && (
                    <p className="text-xs text-emerald-500 mt-1">
                      Earned {new Date(badge.earnedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Stats Summary */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{stats.totalBakes}</p>
                <p className="text-xs text-muted-foreground">Total Bakes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-500">{stats.successfulBakes}</p>
                <p className="text-xs text-muted-foreground">Successful</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-500">{stats.highRatedBakes}</p>
                <p className="text-xs text-muted-foreground">High Rated</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-500">{stats.bakesShared}</p>
                <p className="text-xs text-muted-foreground">Shared</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Celebration Dialog */}
      <Dialog open={showCelebration} onOpenChange={setShowCelebration}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-center justify-center">
              <Sparkles className="h-6 w-6 text-amber-500" />
              Achievement Unlocked!
              <Sparkles className="h-6 w-6 text-amber-500" />
            </DialogTitle>
            <DialogDescription className="text-center">
              Congratulations on your progress!
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {newBadges.map((badge) => (
              <div key={badge.type} className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400/30 to-amber-600/30 border-4 border-amber-500 flex items-center justify-center text-4xl shadow-lg shadow-amber-500/30 animate-bounce">
                  {badge.icon}
                </div>
                <h3 className="font-bold text-lg">{badge.name}</h3>
                <p className="text-sm text-muted-foreground text-center">{badge.description}</p>
              </div>
            ))}
          </div>
          <Button onClick={() => setShowCelebration(false)} className="w-full">
            Awesome!
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};
