import { useAuth } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Heart, MessageCircle, Upload } from "lucide-react";
import { z } from "zod";

interface Premix {
  id: string;
  name: string;
}

interface BakeShare {
  id: string;
  user_id: string;
  premix_id: string;
  image_url: string;
  description: string;
  rating: number;
  created_at: string;
  profiles: {
    name: string;
  };
  premixes: {
    name: string;
  };
  bake_likes: { id: string; user_id: string }[];
  bake_comments: { id: string; comment: string; profiles: { name: string } }[];
}

const shareSchema = z.object({
  premix_id: z.string().min(1, "Please select a premix"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  rating: z.number().min(1).max(5),
});

const ShareBake = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [premixes, setPremixes] = useState<Premix[]>([]);
  const [bakeShares, setBakeShares] = useState<BakeShare[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: premixData, error: premixError } = await supabase
        .from("premixes")
        .select("id, name")
        .order("name");

      if (premixError) throw premixError;
      setPremixes(premixData || []);

      const { data: sharesData, error: sharesError } = await supabase
        .from("bake_shares")
        .select(`
          *,
          profiles (name),
          premixes (name),
          bake_likes (id, user_id),
          bake_comments (id, comment, profiles (name))
        `)
        .eq("is_visible", true)
        .order("created_at", { ascending: false });

      if (sharesError) throw sharesError;
      setBakeShares(sharesData || []);
    } catch (error: any) {
      toast.error("Failed to load data");
      console.error(error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !selectedFile) {
      toast.error("Please select an image");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const premix_id = formData.get("premix_id") as string;
      const description = formData.get("description") as string;
      const rating = parseInt(formData.get("rating") as string);

      shareSchema.parse({ premix_id, description, rating });

      // Upload image
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("bake-photos")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("bake-photos")
        .getPublicUrl(fileName);

      // Create bake share
      const { error: insertError } = await supabase
        .from("bake_shares")
        .insert({
          user_id: user.id,
          premix_id,
          image_url: publicUrl,
          description,
          rating,
        });

      if (insertError) throw insertError;

      toast.success("Bake shared successfully!");
      setSelectedFile(null);
      setPreviewUrl(null);
      e.currentTarget.reset();
      fetchData();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to share bake");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleLike = async (bakeShareId: string, isLiked: boolean) => {
    if (!user) return;

    try {
      if (isLiked) {
        const { error } = await supabase
          .from("bake_likes")
          .delete()
          .eq("bake_share_id", bakeShareId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("bake_likes")
          .insert({
            bake_share_id: bakeShareId,
            user_id: user.id,
          });

        if (error) throw error;
      }

      fetchData();
    } catch (error: any) {
      toast.error("Failed to update like");
    }
  };

  if (loading || loadingData) {
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
          <h1 className="text-4xl font-bold mb-2">Share Your Bake</h1>
          <p className="text-muted-foreground">Show off your delicious creations</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Post Your Bake</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="image">Photo *</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    {previewUrl ? (
                      <div className="space-y-2">
                        <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover rounded" />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedFile(null);
                            setPreviewUrl(null);
                          }}
                        >
                          Change Image
                        </Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Click to upload</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                          required
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="premix_id">Premix Used *</Label>
                  <Select name="premix_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a premix" />
                    </SelectTrigger>
                    <SelectContent>
                      {premixes.map(premix => (
                        <SelectItem key={premix.id} value={premix.id}>
                          {premix.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Tell us about your bake..."
                    maxLength={500}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rating">Rating *</Label>
                  <Select name="rating" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Rate your result" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(n => (
                        <SelectItem key={n} value={n.toString()}>
                          {"⭐".repeat(n)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full" disabled={uploading}>
                  {uploading ? "Sharing..." : "Share My Bake"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-4">Community Feed</h2>
            
            {bakeShares.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No bakes shared yet. Be the first!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {bakeShares.map(share => {
                  const isLiked = share.bake_likes?.some(like => like.user_id === user.id);
                  
                  return (
                    <Card key={share.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="flex-1">
                            <h3 className="font-semibold">{share.profiles?.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {share.premixes?.name} • {"⭐".repeat(share.rating)}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(share.created_at).toLocaleDateString()}
                          </p>
                        </div>

                        <img
                          src={share.image_url}
                          alt="Baked bread"
                          className="w-full h-64 object-cover rounded-lg mb-4"
                        />

                        {share.description && (
                          <p className="text-sm mb-4">{share.description}</p>
                        )}

                        <div className="flex items-center gap-4 text-sm">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLike(share.id, isLiked)}
                            className={isLiked ? "text-red-500" : ""}
                          >
                            <Heart className={`h-4 w-4 mr-1 ${isLiked ? "fill-current" : ""}`} />
                            {share.bake_likes?.length || 0}
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MessageCircle className="h-4 w-4 mr-1" />
                            {share.bake_comments?.length || 0}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ShareBake;
