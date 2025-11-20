import { useAuth } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Tutorial {
  id: string;
  title: string;
  category: string;
  tags: string[];
  content: string;
}

const Tutorials = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [filteredTutorials, setFilteredTutorials] = useState<Tutorial[]>([]);
  const [loadingTutorials, setLoadingTutorials] = useState(true);
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchTutorials();
    }
  }, [user]);

  useEffect(() => {
    filterTutorials();
  }, [tutorials, categoryFilter, tagFilter]);

  const fetchTutorials = async () => {
    try {
      const { data, error } = await supabase
        .from("tutorials")
        .select("*")
        .order("title");

      if (error) throw error;
      setTutorials(data || []);
      
      // Extract all unique tags
      const tags = new Set<string>();
      data?.forEach(tutorial => {
        tutorial.tags?.forEach((tag: string) => tags.add(tag));
      });
      setAllTags(Array.from(tags).sort());
    } catch (error: any) {
      toast.error("Failed to load tutorials");
      console.error(error);
    } finally {
      setLoadingTutorials(false);
    }
  };

  const filterTutorials = () => {
    let filtered = [...tutorials];
    
    if (categoryFilter !== "all") {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }
    
    if (tagFilter !== "all") {
      filtered = filtered.filter(t => t.tags?.includes(tagFilter));
    }
    
    setFilteredTutorials(filtered);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Beginner":
        return "bg-green-100 text-green-800";
      case "Intermediate":
        return "bg-yellow-100 text-yellow-800";
      case "Advanced":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading || loadingTutorials) {
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
          <h1 className="text-4xl font-bold mb-2">Tutorials</h1>
          <p className="text-muted-foreground">Learn tips, techniques, and best practices</p>
        </div>

        <div className="flex gap-4 mb-6">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Beginner">Beginner</SelectItem>
              <SelectItem value="Intermediate">Intermediate</SelectItem>
              <SelectItem value="Advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>

          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {allTags.map(tag => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filteredTutorials.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No tutorials match your filters.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTutorials.map((tutorial) => (
              <Card key={tutorial.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getCategoryColor(tutorial.category)}>
                      {tutorial.category}
                    </Badge>
                  </div>
                  <CardTitle>{tutorial.title}</CardTitle>
                  <CardDescription>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tutorial.tags?.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => setSelectedTutorial(tutorial)}
                  >
                    Read Tutorial →
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={!!selectedTutorial} onOpenChange={() => setSelectedTutorial(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedTutorial?.title}</DialogTitle>
          </DialogHeader>
          <div className="prose max-w-none">
            <p className="whitespace-pre-wrap">{selectedTutorial?.content}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tutorials;
