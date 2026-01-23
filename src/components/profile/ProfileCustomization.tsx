import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Camera, Image as ImageIcon, Eye, EyeOff } from "lucide-react";

interface ProfileCustomizationProps {
  userId: string;
  profile: {
    avatar_url: string | null;
    cover_image_url: string | null;
    bio: string | null;
    is_public: boolean;
    favorite_bread_type: string | null;
    baking_since: string | null;
  };
  onUpdate: () => void;
}

const BREAD_TYPES = [
  "Sourdough",
  "Baguette",
  "Ciabatta",
  "Focaccia",
  "Brioche",
  "Rye Bread",
  "Whole Wheat",
  "Challah",
  "Bagels",
  "Pizza Dough",
  "Croissants",
  "Pretzels",
  "Other"
];

export const ProfileCustomization = ({ userId, profile, onUpdate }: ProfileCustomizationProps) => {
  const { toast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [bio, setBio] = useState(profile.bio || "");
  const [isPublic, setIsPublic] = useState(profile.is_public);
  const [favoriteBreadType, setFavoriteBreadType] = useState(profile.favorite_bread_type || "");
  const [bakingSince, setBakingSince] = useState(profile.baking_since || "");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const uploadImage = async (file: File, type: "avatar" | "cover") => {
    const isAvatar = type === "avatar";
    const setUploading = isAvatar ? setUploadingAvatar : setUploadingCover;
    
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${type}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("bake-photos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("bake-photos")
        .getPublicUrl(fileName);

      const columnName = isAvatar ? "avatar_url" : "cover_image_url";
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ [columnName]: urlData.publicUrl })
        .eq("id", userId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: `${isAvatar ? "Avatar" : "Cover image"} updated successfully`,
      });
      
      onUpdate();
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      toast({
        title: "Error",
        description: `Failed to upload ${type}`,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "cover") => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 5MB",
          variant: "destructive",
        });
        return;
      }
      uploadImage(file, type);
    }
  };

  const handleSave = async () => {
    if (bio.length > 300) {
      toast({
        title: "Bio too long",
        description: "Bio must be 300 characters or less",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          bio: bio || null,
          is_public: isPublic,
          favorite_bread_type: favoriteBreadType || null,
          baking_since: bakingSince || null,
        })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile customization saved",
      });
      
      onUpdate();
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Customization</CardTitle>
        <CardDescription>
          Personalize your public profile to share with the community
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar Upload */}
        <div className="space-y-2">
          <Label>Profile Picture</Label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-muted overflow-hidden flex items-center justify-center">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <Camera className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, "avatar")}
            />
            <Button
              variant="outline"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Photo
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Cover Image Upload */}
        <div className="space-y-2">
          <Label>Cover Image</Label>
          <div className="space-y-2">
            <div className="w-full h-24 rounded-lg bg-muted overflow-hidden flex items-center justify-center">
              {profile.cover_image_url ? (
                <img src={profile.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, "cover")}
            />
            <Button
              variant="outline"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              className="w-full"
            >
              {uploadingCover ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Cover Image
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell the community about yourself and your baking journey..."
            className="min-h-[100px]"
            maxLength={300}
          />
          <p className="text-sm text-muted-foreground text-right">
            {bio.length}/300 characters
          </p>
        </div>

        {/* Favorite Bread Type */}
        <div className="space-y-2">
          <Label>Favorite Bread Type</Label>
          <Select value={favoriteBreadType} onValueChange={setFavoriteBreadType}>
            <SelectTrigger>
              <SelectValue placeholder="Select your favorite" />
            </SelectTrigger>
            <SelectContent>
              {BREAD_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Baking Since */}
        <div className="space-y-2">
          <Label htmlFor="bakingSince">Baking Since</Label>
          <Input
            id="bakingSince"
            type="date"
            value={bakingSince}
            onChange={(e) => setBakingSince(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            When did you start your baking journey?
          </p>
        </div>

        {/* Privacy Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              {isPublic ? (
                <Eye className="h-4 w-4 text-primary" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
              <Label>Public Profile</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              {isPublic
                ? "Other bakers can view your profile and bakes"
                : "Your profile is hidden from other users"}
            </p>
          </div>
          <Switch checked={isPublic} onCheckedChange={setIsPublic} />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
