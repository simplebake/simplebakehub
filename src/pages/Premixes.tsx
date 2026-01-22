import { useAuth } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { Download, Upload } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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

interface ImportPreview {
  data: Omit<Premix, 'id' | 'created_at' | 'updated_at'>[];
  duplicates: string[];
}

type DuplicateAction = 'skip' | 'overwrite';

const Premixes = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [premixes, setPremixes] = useState<Premix[]>([]);
  const [loadingPremixes, setLoadingPremixes] = useState(true);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [duplicateAction, setDuplicateAction] = useState<DuplicateAction>('skip');
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const parseCSV = (content: string): Omit<Premix, 'id' | 'created_at' | 'updated_at'>[] => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];
    
    const results: Omit<Premix, 'id' | 'created_at' | 'updated_at'>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (const char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      if (values.length >= 5) {
        results.push({
          name: values[0] || '',
          description: values[1] || '',
          difficulty: values[2] || 'Beginner',
          water_amount: parseInt(values[3]) || 0,
          oil_amount: values[4] || '',
          optional_extras: values[5] ? values[5].split(';').map(s => s.trim()).filter(Boolean) : [],
          image_url: null,
        });
      }
    }
    
    return results;
  };

  const parseJSON = (content: string): Omit<Premix, 'id' | 'created_at' | 'updated_at'>[] => {
    const data = JSON.parse(content);
    const items = Array.isArray(data) ? data : [data];
    
    return items.map(item => ({
      name: item.name || '',
      description: item.description || '',
      difficulty: item.difficulty || 'Beginner',
      water_amount: parseInt(item.water_amount) || 0,
      oil_amount: item.oil_amount || '',
      optional_extras: Array.isArray(item.optional_extras) ? item.optional_extras : [],
      image_url: item.image_url || null,
    }));
  };

  const processFile = async (file: File) => {
    try {
      const content = await file.text();
      let parsedData: Omit<Premix, 'id' | 'created_at' | 'updated_at'>[];
      
      if (file.name.endsWith('.json')) {
        parsedData = parseJSON(content);
      } else if (file.name.endsWith('.csv')) {
        parsedData = parseCSV(content);
      } else {
        toast.error('Unsupported file format. Please use JSON or CSV.');
        return;
      }

      if (parsedData.length === 0) {
        toast.error('No valid recipes found in the file');
        return;
      }

      // Check for duplicates
      const existingNames = premixes.map(p => p.name.toLowerCase());
      const duplicates = parsedData
        .filter(p => existingNames.includes(p.name.toLowerCase()))
        .map(p => p.name);

      setImportPreview({ data: parsedData, duplicates });
      setImportDialogOpen(true);
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Failed to parse file. Please check the format.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const confirmImport = async () => {
    if (!importPreview) return;
    
    setIsImporting(true);
    try {
      let toInsert = importPreview.data;
      
      if (duplicateAction === 'skip' && importPreview.duplicates.length > 0) {
        toInsert = toInsert.filter(
          p => !importPreview.duplicates.map(d => d.toLowerCase()).includes(p.name.toLowerCase())
        );
      } else if (duplicateAction === 'overwrite' && importPreview.duplicates.length > 0) {
        // Delete existing duplicates first
        const { error: deleteError } = await supabase
          .from('premixes')
          .delete()
          .in('name', importPreview.duplicates);
        
        if (deleteError) throw deleteError;
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from('premixes').insert(toInsert);
        if (error) throw error;
      }

      toast.success(`Successfully imported ${toInsert.length} recipe(s)`);
      setImportDialogOpen(false);
      setImportPreview(null);
      fetchPremixes();
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error('Failed to import recipes: ' + error.message);
    } finally {
      setIsImporting(false);
    }
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
    <div 
      className="min-h-screen bg-background"
      onDragOver={isAdmin ? handleDragOver : undefined}
      onDragLeave={isAdmin ? handleDragLeave : undefined}
      onDrop={isAdmin ? handleDrop : undefined}
    >
      <Header />
      
      {/* Drag overlay */}
      {isDragging && isAdmin && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-background border-2 border-dashed border-primary rounded-lg p-12 text-center">
            <Upload className="h-16 w-16 mx-auto mb-4 text-primary" />
            <p className="text-xl font-medium">Drop your recipe file here</p>
            <p className="text-muted-foreground">Supports JSON and CSV formats</p>
          </div>
        </div>
      )}
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Guided Bakes</h1>
            <p className="text-muted-foreground">Choose a premix and follow step-by-step instructions</p>
          </div>
          
          {isAdmin && (
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                Import Recipes
              </Button>
              
              {premixes.length > 0 && (
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
          )}
        </div>

        {premixes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No premixes available yet. Check back soon!</p>
              {isAdmin && (
                <p className="text-sm text-muted-foreground mt-2">
                  Tip: Use the Import button or drag & drop a JSON/CSV file to add recipes.
                </p>
              )}
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

      {/* Import Preview Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Recipes</DialogTitle>
            <DialogDescription>
              Review the recipes to be imported
            </DialogDescription>
          </DialogHeader>
          
          {importPreview && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{importPreview.data.length} recipe(s) found</p>
                <ul className="mt-2 text-sm text-muted-foreground max-h-32 overflow-y-auto">
                  {importPreview.data.map((p, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span>• {p.name}</span>
                      {importPreview.duplicates.includes(p.name) && (
                        <Badge variant="outline" className="text-xs">duplicate</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {importPreview.duplicates.length > 0 && (
                <div className="space-y-2">
                  <Label>Handle {importPreview.duplicates.length} duplicate(s):</Label>
                  <Select 
                    value={duplicateAction} 
                    onValueChange={(v) => setDuplicateAction(v as DuplicateAction)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Skip duplicates</SelectItem>
                      <SelectItem value="overwrite">Overwrite existing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmImport} disabled={isImporting}>
              {isImporting ? 'Importing...' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Premixes;
