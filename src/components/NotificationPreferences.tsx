import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/supabase";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, Mail, Shield, Users, MessageSquare } from "lucide-react";

interface Preferences {
  new_messages: boolean;
  status_updates: boolean;
  security_alerts: boolean;
  community_reports: boolean;
}

const defaultPreferences: Preferences = {
  new_messages: true,
  status_updates: true,
  security_alerts: true,
  community_reports: true,
};

export function NotificationPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasRecord, setHasRecord] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          new_messages: data.new_messages,
          status_updates: data.status_updates,
          security_alerts: data.security_alerts,
          community_reports: data.community_reports,
        });
        setHasRecord(true);
      }
    } catch (error: any) {
      console.error("Error fetching preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof Preferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      if (hasRecord) {
        const { error } = await supabase
          .from("notification_preferences")
          .update(preferences)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notification_preferences")
          .insert({
            user_id: user.id,
            ...preferences,
          });

        if (error) throw error;
        setHasRecord(true);
      }

      toast.success("Notification preferences saved");
    } catch (error: any) {
      toast.error("Failed to save preferences");
      console.error(error);
    } finally {
      setSaving(false);
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

  const notificationOptions = [
    {
      key: "new_messages" as const,
      label: "New Customer Messages",
      description: "Get notified when customers submit new messages or inquiries",
      icon: MessageSquare,
    },
    {
      key: "status_updates" as const,
      label: "Status Updates",
      description: "Receive updates when message statuses change",
      icon: Mail,
    },
    {
      key: "security_alerts" as const,
      label: "Security Alerts",
      description: "Get notified about security events and blocked IPs",
      icon: Shield,
    },
    {
      key: "community_reports" as const,
      label: "Community Reports",
      description: "Receive notifications about reported content",
      icon: Users,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose which email notifications you want to receive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {notificationOptions.map((option) => (
          <div
            key={option.key}
            className="flex items-start justify-between space-x-4 pb-4 border-b last:border-0 last:pb-0"
          >
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-muted rounded-lg">
                <option.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <Label htmlFor={option.key} className="text-base font-medium">
                  {option.label}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {option.description}
                </p>
              </div>
            </div>
            <Switch
              id={option.key}
              checked={preferences[option.key]}
              onCheckedChange={() => handleToggle(option.key)}
            />
          </div>
        ))}

        <div className="pt-4">
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
