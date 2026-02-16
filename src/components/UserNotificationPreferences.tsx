import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/supabase";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, BellRing, Award, ChefHat, Loader2, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UserPreferences {
  push_enabled: boolean;
  bake_reminders: boolean;
  achievement_alerts: boolean;
}

const defaultPreferences: UserPreferences = {
  push_enabled: false,
  bake_reminders: true,
  achievement_alerts: true,
};

export function UserNotificationPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasRecord, setHasRecord] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
      setPushPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("push_enabled, bake_reminders, achievement_alerts")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          push_enabled: data.push_enabled ?? false,
          bake_reminders: data.bake_reminders ?? true,
          achievement_alerts: data.achievement_alerts ?? true,
        });
        setHasRecord(true);
      }
    } catch (error: any) {
      console.error("Error fetching preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof UserPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const requestPushPermission = async () => {
    if (!pushSupported) {
      toast.error("Push notifications are not supported in your browser");
      return;
    }

    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission === 'granted') {
        // Register service worker and subscribe
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        // Get VAPID public key - this is a demo key, replace with your own
        const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
        
        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
        
        const subscription = await (registration as any).pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
        });

        const subscriptionJson = subscription.toJSON();
        
        // Save subscription to database
        const { error } = await supabase
          .from("push_subscriptions")
          .upsert({
            user_id: user?.id,
            endpoint: subscriptionJson.endpoint!,
            p256dh: subscriptionJson.keys?.p256dh!,
            auth: subscriptionJson.keys?.auth!,
          }, {
            onConflict: 'user_id,endpoint'
          });

        if (error) throw error;

        setPreferences(prev => ({ ...prev, push_enabled: true }));
        toast.success("Push notifications enabled!");
      } else if (permission === 'denied') {
        toast.error("Push notifications were denied. You can enable them in your browser settings.");
      }
    } catch (error: any) {
      console.error("Error enabling push notifications:", error);
      toast.error("Failed to enable push notifications");
    } finally {
      setSubscribing(false);
    }
  };

  const disablePushNotifications = async () => {
    setSubscribing(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await (registration as any).pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          
          // Remove from database
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", user?.id)
            .eq("endpoint", subscription.endpoint);
        }
      }
      
      setPreferences(prev => ({ ...prev, push_enabled: false }));
      toast.success("Push notifications disabled");
    } catch (error: any) {
      console.error("Error disabling push notifications:", error);
      toast.error("Failed to disable push notifications");
    } finally {
      setSubscribing(false);
    }
  };

  const sendTestNotification = async () => {
    if (!user) return;
    
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: user.id,
          title: '🧁 Test Notification',
          body: 'Your push notifications are working! Happy baking!',
          tag: 'test',
          url: '/settings',
        },
      });

      if (error) throw error;

      if (data?.sent > 0) {
        toast.success("Test notification sent! Check your browser notifications.");
      } else {
        toast.info("No active subscriptions found. Try re-enabling push notifications.");
      }
    } catch (error: any) {
      console.error("Error sending test notification:", error);
      toast.error("Failed to send test notification");
    } finally {
      setSendingTest(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const updateData = {
        bake_reminders: preferences.bake_reminders,
        achievement_alerts: preferences.achievement_alerts,
        push_enabled: preferences.push_enabled,
      };

      if (hasRecord) {
        const { error } = await supabase
          .from("notification_preferences")
          .update(updateData)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notification_preferences")
          .insert({
            user_id: user.id,
            ...updateData,
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
      key: "bake_reminders" as const,
      label: "Baking Reminders",
      description: "Get reminders about baking sessions and tips",
      icon: ChefHat,
    },
    {
      key: "achievement_alerts" as const,
      label: "Achievement Alerts",
      description: "Be notified when you earn new badges",
      icon: Award,
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
          Choose how and when you want to be notified
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Push Notifications Section */}
        <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BellRing className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-medium">Browser Push Notifications</Label>
                  {!pushSupported && (
                    <Badge variant="secondary" className="text-xs">Not Supported</Badge>
                  )}
                  {pushPermission === 'denied' && (
                    <Badge variant="destructive" className="text-xs">Blocked</Badge>
                  )}
                  {preferences.push_enabled && pushPermission === 'granted' && (
                    <Badge variant="default" className="text-xs bg-green-500">Enabled</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Receive real-time notifications even when the app is closed
                </p>
              </div>
            </div>
          </div>
          
          {pushSupported && (
            <div className="flex gap-2">
              {!preferences.push_enabled || pushPermission !== 'granted' ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={requestPushPermission}
                  disabled={subscribing || pushPermission === 'denied'}
                >
                  {subscribing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enabling...
                    </>
                  ) : (
                    "Enable Push Notifications"
                  )}
                </Button>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={disablePushNotifications}
                    disabled={subscribing}
                  >
                    {subscribing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Disabling...
                      </>
                    ) : (
                      "Disable Push Notifications"
                    )}
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={sendTestNotification}
                    disabled={sendingTest}
                  >
                    {sendingTest ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Test
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Email Notification Options */}
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

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
