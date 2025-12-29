import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Palette, Save, Loader2, Upload, X, Image } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface AppSettingsData {
  appName: string;
  tagline: string;
  supportEmail: string;
  maintenanceMode: boolean;
  welcomeMessage: string;
  logoUrl: string;
}

const defaultSettings: AppSettingsData = {
  appName: "Baking App",
  tagline: "Your baking companion",
  supportEmail: "",
  maintenanceMode: false,
  welcomeMessage: "Welcome to our baking community!",
  logoUrl: "",
};

export const AppSettings = () => {
  const [settings, setSettings] = useState<AppSettingsData>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .eq("setting_key", "general")
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value) {
        const value = data.setting_value as Record<string, unknown>;
        setSettings({
          appName: (value.appName as string) || defaultSettings.appName,
          tagline: (value.tagline as string) || defaultSettings.tagline,
          supportEmail: (value.supportEmail as string) || defaultSettings.supportEmail,
          maintenanceMode: (value.maintenanceMode as boolean) || defaultSettings.maintenanceMode,
          welcomeMessage: (value.welcomeMessage as string) || defaultSettings.welcomeMessage,
          logoUrl: (value.logoUrl as string) || defaultSettings.logoUrl,
        });
      }
    } catch (error) {
      console.error("Error fetching app settings:", error);
      toast.error("Failed to load app settings");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be less than 2MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // Delete old logo if exists
      if (settings.logoUrl) {
        const oldPath = settings.logoUrl.split("/branding/")[1];
        if (oldPath) {
          await supabase.storage.from("branding").remove([oldPath]);
        }
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from("branding")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("branding")
        .getPublicUrl(filePath);

      setSettings({ ...settings, logoUrl: urlData.publicUrl });
      toast.success("Logo uploaded successfully");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeLogo = async () => {
    if (!settings.logoUrl) return;

    try {
      const oldPath = settings.logoUrl.split("/branding/")[1];
      if (oldPath) {
        await supabase.storage.from("branding").remove([oldPath]);
      }
      setSettings({ ...settings, logoUrl: "" });
      toast.success("Logo removed");
    } catch (error) {
      console.error("Error removing logo:", error);
      toast.error("Failed to remove logo");
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("setting_key", "general")
        .maybeSingle();

      const settingValue = {
        appName: settings.appName,
        tagline: settings.tagline,
        supportEmail: settings.supportEmail,
        maintenanceMode: settings.maintenanceMode,
        welcomeMessage: settings.welcomeMessage,
        logoUrl: settings.logoUrl,
      } as Json;

      if (existing) {
        const { error } = await supabase
          .from("app_settings")
          .update({ setting_value: settingValue })
          .eq("setting_key", "general");

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("app_settings")
          .insert([{ setting_key: "general", setting_value: settingValue }]);

        if (error) throw error;
      }

      toast.success("App settings saved successfully");
    } catch (error) {
      console.error("Error saving app settings:", error);
      toast.error("Failed to save app settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <CardTitle>App Settings</CardTitle>
        </div>
        <CardDescription>
          Configure your app's branding and general settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Logo</h3>
          
          <div className="flex items-start gap-4">
            <div className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50 overflow-hidden">
              {settings.logoUrl ? (
                <img 
                  src={settings.logoUrl} 
                  alt="App Logo" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <Image className="h-8 w-8 text-muted-foreground/50" />
              )}
            </div>
            
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Logo
                  </>
                )}
              </Button>
              {settings.logoUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeLogo}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Recommended: 512x512px, PNG or SVG, max 2MB
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Branding Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Branding</h3>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="appName">App Name</Label>
              <Input
                id="appName"
                value={settings.appName}
                onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                placeholder="Enter app name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                placeholder="Enter tagline"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="welcomeMessage">Welcome Message</Label>
            <Textarea
              id="welcomeMessage"
              value={settings.welcomeMessage}
              onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
              placeholder="Enter welcome message shown to users"
              rows={3}
            />
          </div>
        </div>

        <Separator />

        {/* Contact Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Contact Information</h3>
          
          <div className="space-y-2">
            <Label htmlFor="supportEmail">Support Email</Label>
            <Input
              id="supportEmail"
              type="email"
              value={settings.supportEmail}
              onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
              placeholder="support@example.com"
            />
          </div>
        </div>

        <Separator />

        {/* System Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">System</h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, users will see a maintenance message
              </p>
            </div>
            <Switch
              id="maintenanceMode"
              checked={settings.maintenanceMode}
              onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
            />
          </div>
        </div>

        <Separator />

        <div className="flex justify-end">
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
