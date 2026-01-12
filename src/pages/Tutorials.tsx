import { useAuth } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Upload } from "lucide-react";

interface Tutorial {
  id: string;
  title: string;
  category: string;
  tags: string[];
  content: string;
}

interface ImportPreview {
  tutorials: Array<{ title: string; category: string; tags: string[]; content: string }>;
  fileName: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Export selection state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedForExport, setSelectedForExport] = useState<Set<string>>(new Set());
  
  // Import confirmation state
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [duplicateCount, setDuplicateCount] = useState(0);

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

  const openExportDialog = () => {
    if (tutorials.length === 0) {
      toast.error("No tutorials to export");
      return;
    }
    setSelectedForExport(new Set(tutorials.map(t => t.id)));
    setExportDialogOpen(true);
  };

  const toggleExportSelection = (id: string) => {
    const newSelection = new Set(selectedForExport);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedForExport(newSelection);
  };

  const toggleAllExport = () => {
    if (selectedForExport.size === tutorials.length) {
      setSelectedForExport(new Set());
    } else {
      setSelectedForExport(new Set(tutorials.map(t => t.id)));
    }
  };

  const handleExport = () => {
    if (selectedForExport.size === 0) {
      toast.error("Please select at least one tutorial to export");
      return;
    }
    
    const tutorialsToExport = tutorials
      .filter(t => selectedForExport.has(t.id))
      .map(({ id, ...rest }) => rest);
    
    const blob = new Blob([JSON.stringify(tutorialsToExport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tutorials-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${tutorialsToExport.length} tutorials`);
    setExportDialogOpen(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedTutorials = JSON.parse(content);
        
        if (!Array.isArray(importedTutorials)) {
          throw new Error("Invalid format: expected an array");
        }

        const validTutorials = importedTutorials.filter(
          t => t.title && t.category && t.content
        );

        if (validTutorials.length === 0) {
          toast.error("No valid tutorials found in file");
          return;
        }

        // Check for duplicates
        const existingTitles = new Set(tutorials.map(t => t.title.toLowerCase()));
        const duplicates = validTutorials.filter(t => 
          existingTitles.has(t.title.toLowerCase())
        );
        setDuplicateCount(duplicates.length);
        setSkipDuplicates(true);

        setImportPreview({
          tutorials: validTutorials,
          fileName: file.name
        });
      } catch (error: any) {
        toast.error("Failed to parse file: " + error.message);
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const confirmImport = async () => {
    if (!importPreview) return;
    
    setImporting(true);
    try {
      const existingTitles = new Set(tutorials.map(t => t.title.toLowerCase()));
      let imported = 0;
      let skipped = 0;
      
      for (const tutorial of importPreview.tutorials) {
        // Skip duplicates if option is enabled
        if (skipDuplicates && existingTitles.has(tutorial.title.toLowerCase())) {
          skipped++;
          continue;
        }
        
        const { error } = await supabase.from("tutorials").insert({
          title: tutorial.title,
          category: tutorial.category,
          tags: tutorial.tags || [],
          content: tutorial.content,
        });
        
        if (!error) imported++;
      }

      if (skipped > 0) {
        toast.success(`Imported ${imported} tutorials, skipped ${skipped} duplicates`);
      } else {
        toast.success(`Imported ${imported} tutorials`);
      }
      fetchTutorials();
    } catch (error: any) {
      toast.error("Failed to import: " + error.message);
    } finally {
      setImporting(false);
      setImportPreview(null);
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
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Tutorials</h1>
            <p className="text-muted-foreground">Learn tips, techniques, and best practices</p>
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" onClick={openExportDialog}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
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
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tutorial.tags?.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
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

      {/* Export Selection Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select Tutorials to Export</DialogTitle>
            <DialogDescription>
              Choose which tutorials you want to include in the export file.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center space-x-2 pb-4 border-b">
              <Checkbox
                id="select-all"
                checked={selectedForExport.size === tutorials.length}
                onCheckedChange={toggleAllExport}
              />
              <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                Select All ({tutorials.length})
              </label>
            </div>
            <div className="max-h-[300px] overflow-y-auto mt-4 space-y-3">
              {tutorials.map((tutorial) => (
                <div key={tutorial.id} className="flex items-start space-x-3">
                  <Checkbox
                    id={tutorial.id}
                    checked={selectedForExport.has(tutorial.id)}
                    onCheckedChange={() => toggleExportSelection(tutorial.id)}
                  />
                  <div className="flex-1">
                    <label htmlFor={tutorial.id} className="text-sm font-medium cursor-pointer">
                      {tutorial.title}
                    </label>
                    <p className="text-xs text-muted-foreground">{tutorial.category}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={selectedForExport.size === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export {selectedForExport.size} Tutorial{selectedForExport.size !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Confirmation Dialog */}
      <AlertDialog open={!!importPreview} onOpenChange={(open) => !open && setImportPreview(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Import</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>
                  You are about to import <strong>{importPreview?.tutorials.length}</strong> tutorial{importPreview?.tutorials.length !== 1 ? 's' : ''} from <strong>{importPreview?.fileName}</strong>.
                </p>
                {duplicateCount > 0 && (
                  <p className="mt-2 text-amber-600">
                    ⚠️ {duplicateCount} tutorial{duplicateCount !== 1 ? 's have' : ' has'} titles matching existing tutorials.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {duplicateCount > 0 && (
            <div className="flex items-center space-x-2 py-2">
              <Checkbox
                id="skip-duplicates"
                checked={skipDuplicates}
                onCheckedChange={(checked) => setSkipDuplicates(checked as boolean)}
              />
              <label htmlFor="skip-duplicates" className="text-sm cursor-pointer">
                Skip duplicates (tutorials with matching titles)
              </label>
            </div>
          )}
          
          <div className="max-h-[200px] overflow-y-auto my-4 border rounded-md p-3">
            <p className="text-sm font-medium mb-2">Tutorials to import:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {importPreview?.tutorials.map((t, i) => {
                const isDuplicate = tutorials.some(
                  existing => existing.title.toLowerCase() === t.title.toLowerCase()
                );
                return (
                  <li key={i} className={isDuplicate ? "text-amber-600" : ""}>
                    • {t.title} ({t.category})
                    {isDuplicate && <span className="text-xs ml-1">(duplicate)</span>}
                  </li>
                );
              })}
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={importing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport} disabled={importing}>
              {importing ? "Importing..." : skipDuplicates && duplicateCount > 0 
                ? `Import ${(importPreview?.tutorials.length || 0) - duplicateCount} Tutorial${(importPreview?.tutorials.length || 0) - duplicateCount !== 1 ? 's' : ''}`
                : "Import"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Tutorials;
