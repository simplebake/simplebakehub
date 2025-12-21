import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, BookOpen } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Tutorial {
  id: string;
  title: string;
  category: string;
  tags: string[];
  content: string;
  created_at: string;
  updated_at: string;
}

interface TutorialForm {
  title: string;
  category: string;
  tags: string;
  content: string;
}

const emptyForm: TutorialForm = {
  title: "",
  category: "Beginner",
  tags: "",
  content: "",
};

export function TutorialsManager() {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TutorialForm>(emptyForm);

  useEffect(() => {
    fetchTutorials();
  }, []);

  const fetchTutorials = async () => {
    try {
      const { data, error } = await supabase
        .from("tutorials")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTutorials(data || []);
    } catch (error: any) {
      toast.error("Failed to load tutorials");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  const handleEdit = (tutorial: Tutorial) => {
    setForm({
      title: tutorial.title,
      category: tutorial.category,
      tags: tutorial.tags?.join(", ") || "",
      content: tutorial.content,
    });
    setEditingId(tutorial.id);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    setSaving(true);
    try {
      const tagsArray = form.tags
        .split(",")
        .map(t => t.trim())
        .filter(Boolean);

      const tutorialData = {
        title: form.title.trim(),
        category: form.category,
        tags: tagsArray,
        content: form.content.trim(),
      };

      if (editingId) {
        const { error } = await supabase
          .from("tutorials")
          .update(tutorialData)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Tutorial updated successfully");
      } else {
        const { error } = await supabase
          .from("tutorials")
          .insert(tutorialData);

        if (error) throw error;
        toast.success("Tutorial created successfully");
      }

      setDialogOpen(false);
      fetchTutorials();
    } catch (error: any) {
      toast.error(error.message || "Failed to save tutorial");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("tutorials")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Tutorial deleted");
      fetchTutorials();
    } catch (error: any) {
      toast.error("Failed to delete tutorial");
      console.error(error);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Beginner":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Intermediate":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "Advanced":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Tutorials Management
          </CardTitle>
          <CardDescription>Create and manage learning tutorials</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenNew}>
              <Plus className="h-4 w-4 mr-2" />
              New Tutorial
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Tutorial" : "Create New Tutorial"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Enter tutorial title"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(value) => setForm({ ...form, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="e.g. bread, yeast, proofing"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Write the tutorial content..."
                  className="min-h-[200px]"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {tutorials.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No tutorials yet. Create your first one!
          </p>
        ) : (
          <div className="space-y-4">
            {tutorials.map((tutorial) => (
              <div
                key={tutorial.id}
                className="flex items-start justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{tutorial.title}</h3>
                    <Badge className={getCategoryColor(tutorial.category)}>
                      {tutorial.category}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {tutorial.tags?.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {tutorial.content}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(tutorial)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Tutorial?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete "{tutorial.title}". This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(tutorial.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
