import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, ArrowUp, ArrowDown, Loader2 } from "lucide-react";

interface Premix {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  water_amount: number;
  oil_amount: string;
  optional_extras: string[];
  image_url: string | null;
}

interface Step {
  id?: string;
  step_number: number;
  title: string;
  content: string;
  _deleted?: boolean;
  _new?: boolean;
}

interface Props {
  premix: Premix | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export const EditPremixDialog = ({ premix, open, onOpenChange, onSaved }: Props) => {
  const [form, setForm] = useState<Premix | null>(null);
  const [extrasText, setExtrasText] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !premix) return;
    setForm({ ...premix });
    setExtrasText((premix.optional_extras || []).join(", "));
    setLoading(true);
    supabase
      .from("premix_steps")
      .select("*")
      .eq("premix_id", premix.id)
      .order("step_number")
      .then(({ data, error }) => {
        if (error) {
          toast.error("Failed to load steps");
        } else {
          setSteps(
            (data || []).map((s) => ({
              id: s.id,
              step_number: s.step_number,
              title: s.title,
              content: s.content,
            }))
          );
        }
        setLoading(false);
      });
  }, [open, premix]);

  if (!form) return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent /></Dialog>
  );

  const visibleSteps = steps.filter((s) => !s._deleted);

  const updateStep = (index: number, patch: Partial<Step>) => {
    setSteps((prev) => {
      const next = [...prev];
      // Map visible index to actual index
      let visIdx = -1;
      for (let i = 0; i < next.length; i++) {
        if (!next[i]._deleted) {
          visIdx++;
          if (visIdx === index) {
            next[i] = { ...next[i], ...patch };
            break;
          }
        }
      }
      return next;
    });
  };

  const deleteStep = (index: number) => {
    setSteps((prev) => {
      const next = [...prev];
      let visIdx = -1;
      for (let i = 0; i < next.length; i++) {
        if (!next[i]._deleted) {
          visIdx++;
          if (visIdx === index) {
            if (next[i]._new) {
              next.splice(i, 1);
            } else {
              next[i] = { ...next[i], _deleted: true };
            }
            break;
          }
        }
      }
      return next;
    });
  };

  const moveStep = (index: number, dir: -1 | 1) => {
    const vis = steps.map((s, i) => ({ s, i })).filter((x) => !x.s._deleted);
    const target = index + dir;
    if (target < 0 || target >= vis.length) return;
    const a = vis[index].i;
    const b = vis[target].i;
    setSteps((prev) => {
      const next = [...prev];
      [next[a], next[b]] = [next[b], next[a]];
      return next;
    });
  };

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      { step_number: 0, title: "", content: "", _new: true },
    ]);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const optional_extras = extrasText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const { error: upErr } = await supabase
        .from("premixes")
        .update({
          name: form.name,
          description: form.description,
          difficulty: form.difficulty,
          water_amount: form.water_amount,
          oil_amount: form.oil_amount,
          optional_extras,
          image_url: form.image_url,
        })
        .eq("id", form.id);
      if (upErr) throw upErr;

      // Process steps
      const toDelete = steps.filter((s) => s._deleted && s.id).map((s) => s.id!);
      if (toDelete.length) {
        const { error } = await supabase.from("premix_steps").delete().in("id", toDelete);
        if (error) throw error;
      }

      // Renumber visible steps and upsert
      const visible = steps.filter((s) => !s._deleted);
      for (let i = 0; i < visible.length; i++) {
        const s = visible[i];
        const step_number = i + 1;
        if (s._new) {
          if (!s.title.trim() && !s.content.trim()) continue;
          const { error } = await supabase.from("premix_steps").insert({
            premix_id: form.id,
            step_number,
            title: s.title,
            content: s.content,
          });
          if (error) throw error;
        } else if (s.id) {
          const { error } = await supabase
            .from("premix_steps")
            .update({
              step_number,
              title: s.title,
              content: s.content,
            })
            .eq("id", s.id);
          if (error) throw error;
        }
      }

      toast.success("Recipe updated");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error("Save failed: " + (e.message || "unknown"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Recipe</DialogTitle>
          <DialogDescription>Update recipe details and step-by-step instructions.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Difficulty</Label>
                <Select
                  value={form.difficulty}
                  onValueChange={(v) => setForm({ ...form, difficulty: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Water (ml)</Label>
                <Input
                  type="number"
                  value={form.water_amount}
                  onChange={(e) => setForm({ ...form, water_amount: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-2">
                <Label>Oil</Label>
                <Input
                  value={form.oil_amount}
                  onChange={(e) => setForm({ ...form, oil_amount: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>Optional extras (comma-separated)</Label>
                <Input value={extrasText} onChange={(e) => setExtrasText(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Image URL</Label>
                <Input
                  value={form.image_url || ""}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value || null })}
                />
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base">Instructions</Label>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                  <Plus className="h-4 w-4 mr-1" /> Add step
                </Button>
              </div>
              {loading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : visibleSteps.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No steps yet. Click "Add step" to create the first one.
                </p>
              ) : (
                <div className="space-y-3">
                  {visibleSteps.map((s, i) => (
                    <div key={s.id ?? `new-${i}`} className="border rounded-lg p-3 space-y-2 bg-card">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-muted-foreground">Step {i + 1}</span>
                        <div className="flex gap-1">
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => moveStep(i, -1)} disabled={i === 0}>
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => moveStep(i, 1)} disabled={i === visibleSteps.length - 1}>
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                            onClick={() => deleteStep(i)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <Input
                        placeholder="Step title"
                        value={s.title}
                        onChange={(e) => updateStep(i, { title: e.target.value })}
                      />
                      <Textarea
                        placeholder="Step instructions..."
                        value={s.content}
                        rows={3}
                        onChange={(e) => updateStep(i, { content: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};