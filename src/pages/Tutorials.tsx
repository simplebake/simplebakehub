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
import { Download, Upload, FileText, ChevronDown, ChevronUp, HelpCircle, ArrowRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";

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

type FileFormat = "json" | "csv" | "markdown";
type DuplicateAction = "skip" | "overwrite";

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
  const [exportFormat, setExportFormat] = useState<FileFormat>("json");
  
  // Import confirmation state
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [duplicateAction, setDuplicateAction] = useState<DuplicateAction>("skip");
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [expandedPreview, setExpandedPreview] = useState<number | null>(null);
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

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

  const escapeCSV = (value: string) => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const formatAsCSV = (tutorialsToExport: Array<{ title: string; category: string; tags: string[]; content: string }>) => {
    const headers = ["title", "category", "tags", "content"];
    const rows = tutorialsToExport.map(t => [
      escapeCSV(t.title),
      escapeCSV(t.category),
      escapeCSV((t.tags || []).join("; ")),
      escapeCSV(t.content)
    ].join(","));
    return [headers.join(","), ...rows].join("\n");
  };

  const formatAsMarkdown = (tutorialsToExport: Array<{ title: string; category: string; tags: string[]; content: string }>) => {
    return tutorialsToExport.map(t => {
      const tagsStr = (t.tags || []).length > 0 ? `**Tags:** ${t.tags.join(", ")}\n\n` : "";
      return `# ${t.title}\n\n**Category:** ${t.category}\n\n${tagsStr}${t.content}\n\n---\n`;
    }).join("\n");
  };

  const handleExport = () => {
    if (selectedForExport.size === 0) {
      toast.error("Please select at least one tutorial to export");
      return;
    }
    
    const tutorialsToExport = tutorials
      .filter(t => selectedForExport.has(t.id))
      .map(({ id, ...rest }) => rest);
    
    let content: string;
    let mimeType: string;
    let extension: string;

    switch (exportFormat) {
      case "csv":
        content = formatAsCSV(tutorialsToExport);
        mimeType = "text/csv";
        extension = "csv";
        break;
      case "markdown":
        content = formatAsMarkdown(tutorialsToExport);
        mimeType = "text/markdown";
        extension = "md";
        break;
      default:
        content = JSON.stringify(tutorialsToExport, null, 2);
        mimeType = "application/json";
        extension = "json";
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tutorials-${new Date().toISOString().split("T")[0]}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${tutorialsToExport.length} tutorials as ${exportFormat.toUpperCase()}`);
    setExportDialogOpen(false);
  };

  const parseCSV = (content: string): Array<{ title: string; category: string; tags: string[]; content: string }> => {
    const lines = content.split("\n");
    if (lines.length < 2) throw new Error("CSV must have header and at least one row");
    
    const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    const titleIdx = headers.indexOf("title");
    const categoryIdx = headers.indexOf("category");
    const tagsIdx = headers.indexOf("tags");
    const contentIdx = headers.indexOf("content");
    
    if (titleIdx === -1 || categoryIdx === -1 || contentIdx === -1) {
      throw new Error("CSV must have title, category, and content columns");
    }
    
    const tutorials: Array<{ title: string; category: string; tags: string[]; content: string }> = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Simple CSV parsing (handles quoted fields)
      const values: string[] = [];
      let current = "";
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          if (inQuotes && line[j + 1] === '"') {
            current += '"';
            j++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      const title = values[titleIdx] || "";
      const category = values[categoryIdx] || "";
      const tagsStr = tagsIdx !== -1 ? values[tagsIdx] || "" : "";
      const tutorialContent = values[contentIdx] || "";
      
      if (title && category && tutorialContent) {
        tutorials.push({
          title,
          category,
          tags: tagsStr ? tagsStr.split(";").map(t => t.trim()).filter(Boolean) : [],
          content: tutorialContent
        });
      }
    }
    
    return tutorials;
  };

  const parseMarkdown = (content: string): Array<{ title: string; category: string; tags: string[]; content: string }> => {
    const tutorials: Array<{ title: string; category: string; tags: string[]; content: string }> = [];
    const sections = content.split(/^---$/m).filter(s => s.trim());
    
    for (const section of sections) {
      const titleMatch = section.match(/^#\s+(.+)$/m);
      const categoryMatch = section.match(/\*\*Category:\*\*\s*(.+)$/m);
      const tagsMatch = section.match(/\*\*Tags:\*\*\s*(.+)$/m);
      
      if (titleMatch && categoryMatch) {
        const title = titleMatch[1].trim();
        const category = categoryMatch[1].trim();
        const tags = tagsMatch ? tagsMatch[1].split(",").map(t => t.trim()).filter(Boolean) : [];
        
        // Extract content (everything after metadata)
        let tutorialContent = section
          .replace(/^#\s+.+$/m, "")
          .replace(/\*\*Category:\*\*\s*.+$/m, "")
          .replace(/\*\*Tags:\*\*\s*.+$/m, "")
          .trim();
        
        if (title && category && tutorialContent) {
          tutorials.push({ title, category, tags, content: tutorialContent });
        }
      }
    }
    
    return tutorials;
  };

  const processFile = (file: File) => {
    const fileName = file.name.toLowerCase();
    const validExtensions = [".json", ".csv", ".md", ".markdown"];
    
    if (!validExtensions.some(ext => fileName.endsWith(ext))) {
      toast.error("Unsupported file type. Please use JSON, CSV, or Markdown files.");
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let importedTutorials: Array<{ title: string; category: string; tags: string[]; content: string }>;
        
        if (fileName.endsWith(".csv")) {
          importedTutorials = parseCSV(content);
        } else if (fileName.endsWith(".md") || fileName.endsWith(".markdown")) {
          importedTutorials = parseMarkdown(content);
        } else {
          // Default to JSON
          const parsed = JSON.parse(content);
          if (!Array.isArray(parsed)) {
            throw new Error("Invalid JSON format: expected an array");
          }
          // Support both "content" and "body" field names
          importedTutorials = parsed
            .map(t => ({
              title: t.title,
              category: t.category,
              tags: t.tags || [],
              content: t.content || t.body || ""
            }))
            .filter(t => t.title && t.category && t.content);
        }

        if (importedTutorials.length === 0) {
          toast.error("No valid tutorials found in file");
          return;
        }

        // Check for duplicates
        const existingTitles = new Set(tutorials.map(t => t.title.toLowerCase()));
        const duplicates = importedTutorials.filter(t => 
          existingTitles.has(t.title.toLowerCase())
        );
        setDuplicateCount(duplicates.length);
        setDuplicateAction("skip");
        setExpandedPreview(null);

        setImportPreview({
          tutorials: importedTutorials,
          fileName: file.name
        });
      } catch (error: any) {
        toast.error("Failed to parse file: " + error.message);
      }
    };
    reader.readAsText(file);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    processFile(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set dragging to false if we're leaving the drop zone entirely
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const confirmImport = async () => {
    if (!importPreview) return;
    
    setImporting(true);
    try {
      const existingTutorialsMap = new Map(
        tutorials.map(t => [t.title.toLowerCase(), t.id])
      );
      let imported = 0;
      let skipped = 0;
      let updated = 0;
      
      for (const tutorial of importPreview.tutorials) {
        const existingId = existingTutorialsMap.get(tutorial.title.toLowerCase());
        const isDuplicate = !!existingId;
        
        if (isDuplicate) {
          if (duplicateAction === "skip") {
            skipped++;
            continue;
          } else if (duplicateAction === "overwrite") {
            // Update existing tutorial
            const { error } = await supabase.from("tutorials").update({
              category: tutorial.category,
              tags: tutorial.tags || [],
              content: tutorial.content,
            }).eq("id", existingId);
            
            if (!error) updated++;
            continue;
          }
        }
        
        const { error } = await supabase.from("tutorials").insert({
          title: tutorial.title,
          category: tutorial.category,
          tags: tutorial.tags || [],
          content: tutorial.content,
        });
        
        if (!error) imported++;
      }

      const messages = [];
      if (imported > 0) messages.push(`${imported} imported`);
      if (updated > 0) messages.push(`${updated} updated`);
      if (skipped > 0) messages.push(`${skipped} skipped`);
      toast.success(`Tutorials: ${messages.join(", ")}`);
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
    <div 
      ref={dropZoneRef}
      className={`min-h-screen bg-background relative ${isDragging ? 'ring-4 ring-primary ring-inset' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-background border-2 border-dashed border-primary rounded-lg p-12 text-center shadow-lg">
            <FileText className="h-16 w-16 mx-auto mb-4 text-primary" />
            <p className="text-xl font-semibold text-primary">Drop your file here</p>
            <p className="text-muted-foreground mt-2">Supports JSON, CSV, and Markdown</p>
          </div>
        </div>
      )}
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
              accept=".json,.csv,.md,.markdown"
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
            <DialogTitle>Export Tutorials</DialogTitle>
            <DialogDescription>
              Choose tutorials and format for export.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Export Format</label>
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as FileFormat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON (for re-importing)</SelectItem>
                  <SelectItem value="csv">CSV (spreadsheet)</SelectItem>
                  <SelectItem value="markdown">Markdown (readable)</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <div className="max-h-[250px] overflow-y-auto space-y-3">
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
              Export as {exportFormat.toUpperCase()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Confirmation Dialog */}
      <Dialog open={!!importPreview} onOpenChange={(open) => !open && setImportPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Import Preview</DialogTitle>
            <DialogDescription>
              Review <strong>{importPreview?.tutorials.length}</strong> tutorial{importPreview?.tutorials.length !== 1 ? 's' : ''} from <strong>{importPreview?.fileName}</strong>
            </DialogDescription>
          </DialogHeader>
          
          {duplicateCount > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-amber-700 dark:text-amber-400 text-sm font-medium">
                ⚠️ {duplicateCount} tutorial{duplicateCount !== 1 ? 's match' : ' matches'} existing titles
              </p>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="duplicateAction"
                    checked={duplicateAction === "skip"}
                    onChange={() => setDuplicateAction("skip")}
                    className="h-4 w-4"
                  />
                  Skip duplicates
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="duplicateAction"
                    checked={duplicateAction === "overwrite"}
                    onChange={() => setDuplicateAction("overwrite")}
                    className="h-4 w-4"
                  />
                  Overwrite existing
                </label>
              </div>
            </div>
          )}
          
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-3 py-2">
              {importPreview?.tutorials.map((tutorial, index) => {
                const isDuplicate = tutorials.some(
                  existing => existing.title.toLowerCase() === tutorial.title.toLowerCase()
                );
                const isExpanded = expandedPreview === index;
                
                return (
                  <Collapsible key={index} open={isExpanded} onOpenChange={() => setExpandedPreview(isExpanded ? null : index)}>
                    <div className={`border rounded-lg overflow-hidden ${isDuplicate ? 'border-amber-300 dark:border-amber-700' : 'border-border'}`}>
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3 text-left">
                            <FileText className={`h-5 w-5 ${isDuplicate ? 'text-amber-500' : 'text-muted-foreground'}`} />
                            <div>
                              <p className="font-medium text-sm">{tutorial.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="text-xs py-0">
                                  {tutorial.category}
                                </Badge>
                                {isDuplicate && (
                                  <span className="text-xs text-amber-600 dark:text-amber-400">Duplicate</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-3 pb-3 border-t bg-muted/30">
                          {tutorial.tags && tutorial.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 py-2">
                              {tutorial.tags.map((tag, tagIndex) => (
                                <Badge key={tagIndex} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className="mt-2 text-sm text-muted-foreground max-h-32 overflow-y-auto">
                            <p className="whitespace-pre-wrap">{tutorial.content.length > 500 ? tutorial.content.slice(0, 500) + '...' : tutorial.content}</p>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>
          
          <DialogFooter className="border-t pt-4 mt-2">
            <Button variant="outline" onClick={() => setImportPreview(null)} disabled={importing}>
              Cancel
            </Button>
            <Button onClick={confirmImport} disabled={importing}>
              {importing ? "Importing..." : duplicateAction === "skip" && duplicateCount > 0 
                ? `Import ${(importPreview?.tutorials.length || 0) - duplicateCount} Tutorial${(importPreview?.tutorials.length || 0) - duplicateCount !== 1 ? 's' : ''}`
                : duplicateAction === "overwrite" && duplicateCount > 0
                  ? `Import & Update ${importPreview?.tutorials.length}`
                  : `Import ${importPreview?.tutorials.length} Tutorial${(importPreview?.tutorials.length || 0) !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tutorials;
