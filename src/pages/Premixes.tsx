import { useAuth } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Premix {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  water_amount: number;
  oil_amount: string;
  optional_extras: string[];
  image_url: string | null;
  created_at?: string;
  updated_at?: string;
}

const Premixes = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [premixes, setPremixes] = useState<Premix[]>([]);
  const [loadingPremixes, setLoadingPremixes] = useState(true);

  const exportAsCSV = () => {
    const headers = ['Name', 'Description', 'Difficulty', 'Water Amount (ml)', 'Oil Amount', 'Optional Extras'];
    const csvContent = [
      headers.join(','),
      ...premixes.map(p => [
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.description.replace(/"/g, '""')}"`,
        p.difficulty,
        p.water_amount,
        `"${p.oil_amount}"`,
        `"${(p.optional_extras || []).join('; ')}"`
      ].join(','))
    ].join('\n');

    downloadFile(csvContent, 'recipes-export.csv', 'text/csv');
    toast.success('Recipes exported as CSV');
  };

  const exportAsJSON = () => {
    const exportData = premixes.map(({ id, created_at, updated_at, ...rest }) => rest);
    const jsonContent = JSON.stringify(exportData, null, 2);
    downloadFile(jsonContent, 'recipes-export.json', 'application/json');
    toast.success('Recipes exported as JSON');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPremixes();
    }
  }, [user]);

  const fetchPremixes = async () => {
    try {
      const { data, error } = await supabase
        .from("premixes")
        .select("*")
        .order("name");

      if (error) throw error;
      setPremixes(data || []);
    } catch (error: any) {
      toast.error("Failed to load premixes");
      console.error(error);
    } finally {
      setLoadingPremixes(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
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

  if (loading || loadingPremixes) {
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Guided Bakes</h1>
            <p className="text-muted-foreground">Choose a premix and follow step-by-step instructions</p>
          </div>
          
          {isAdmin && premixes.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export Recipes
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportAsCSV}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportAsJSON}>
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {premixes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No premixes available yet. Check back soon!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {premixes.map((premix) => (
              <Card key={premix.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                {premix.image_url && (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={premix.image_url}
                      alt={premix.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle>{premix.name}</CardTitle>
                    <Badge className={getDifficultyColor(premix.difficulty)}>
                      {premix.difficulty}
                    </Badge>
                  </div>
                  <CardDescription>{premix.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4 text-sm text-muted-foreground">
                    <p>Water: {premix.water_amount}ml</p>
                    <p>Oil: {premix.oil_amount}</p>
                    {premix.optional_extras && premix.optional_extras.length > 0 && (
                      <p>Extras: {premix.optional_extras.join(", ")}</p>
                    )}
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => navigate(`/premixes/${premix.id}/bake`)}
                  >
                    Start Baking
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Premixes;
