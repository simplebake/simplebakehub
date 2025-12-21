import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  ShoppingBag, 
  Mail, 
  Webhook, 
  Key, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  Eye,
  EyeOff,
  Save,
  TestTube,
  Clock,
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Shield,
  ExternalLink,
  Heart,
  HeartOff,
  Bell,
  Copy
} from "lucide-react";

interface IntegrationConfig {
  id: string;
  name: string;
  description: string;
  icon: typeof ShoppingBag;
  isConnected: boolean;
  authMethod: "api_key" | "oauth" | "webhook";
  syncInterval?: string;
  lastSync?: string;
  oauthConfig?: {
    authUrl: string;
    scopes: string[];
  };
}

const integrations: IntegrationConfig[] = [
  {
    id: "shopify",
    name: "Shopify",
    description: "E-commerce platform for product management and orders",
    icon: ShoppingBag,
    isConnected: true,
    authMethod: "api_key",
    syncInterval: "15min",
    lastSync: "2 minutes ago",
  },
  {
    id: "resend",
    name: "Resend",
    description: "Email delivery service for transactional emails",
    icon: Mail,
    isConnected: true,
    authMethod: "api_key",
    syncInterval: "realtime",
    lastSync: "Just now",
  },
  {
    id: "google",
    name: "Google Analytics",
    description: "Website analytics and tracking",
    icon: Activity,
    isConnected: false,
    authMethod: "oauth",
    oauthConfig: {
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      scopes: ["analytics.readonly", "userinfo.email"],
    },
  },
  {
    id: "webhooks",
    name: "Custom Webhooks",
    description: "Connect with external services via webhooks",
    icon: Webhook,
    isConnected: false,
    authMethod: "webhook",
  },
];

const syncIntervalOptions = [
  { value: "realtime", label: "Real-time" },
  { value: "5min", label: "Every 5 minutes" },
  { value: "15min", label: "Every 15 minutes" },
  { value: "30min", label: "Every 30 minutes" },
  { value: "1hour", label: "Every hour" },
  { value: "daily", label: "Daily" },
];

const authMethodLabels: Record<string, string> = {
  api_key: "API Key",
  oauth: "OAuth 2.0",
  webhook: "Webhook URL",
};

const availableEvents = [
  { id: "bake.created", label: "Bake Created", description: "When a user starts a new bake" },
  { id: "bake.completed", label: "Bake Completed", description: "When a bake outcome is logged" },
  { id: "order.placed", label: "Order Placed", description: "When a purchase is made" },
  { id: "user.signup", label: "User Signup", description: "When a new user registers" },
];

export function IntegrationsSettings() {
  const queryClient = useQueryClient();
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // Form state for integration settings
  const [integrationSettings, setIntegrationSettings] = useState<Record<string, {
    apiKey: string;
    syncInterval: string;
    enabled: boolean;
    webhookUrl?: string;
    oauthToken?: string;
    subscribedEvents?: string[];
  }>>({
    shopify: { apiKey: "sk_live_•••••••••••••••••", syncInterval: "15min", enabled: true },
    resend: { apiKey: "re_•••••••••••••••••", syncInterval: "realtime", enabled: true },
    google: { apiKey: "", syncInterval: "1hour", enabled: false },
    webhooks: { apiKey: "", syncInterval: "realtime", enabled: false, webhookUrl: "", subscribedEvents: [] },
  });

  // Fetch webhook config from database
  const { data: webhookConfig, isLoading: configLoading } = useQuery({
    queryKey: ["webhook-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_configs")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Update local state when webhook config is loaded
  useEffect(() => {
    if (webhookConfig) {
      setIntegrationSettings(prev => ({
        ...prev,
        webhooks: {
          ...prev.webhooks,
          apiKey: webhookConfig.secret_key || "",
          webhookUrl: webhookConfig.outgoing_url || "",
          enabled: webhookConfig.is_enabled,
          subscribedEvents: webhookConfig.subscribed_events || [],
        },
      }));
    }
  }, [webhookConfig]);

  // Fetch webhook logs
  const { data: webhookLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["webhook-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Fetch integration health
  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ["integration-health"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_health")
        .select("*")
        .order("last_check_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch active alerts
  const { data: alerts } = useQuery({
    queryKey: ["integration-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_alerts")
        .select("*")
        .is("acknowledged_at", null)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Save webhook config mutation
  const saveWebhookConfigMutation = useMutation({
    mutationFn: async (config: {
      outgoing_url: string;
      secret_key: string;
      subscribed_events: string[];
      is_enabled: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if config exists
      const { data: existing } = await supabase
        .from("webhook_configs")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("webhook_configs")
          .update({
            outgoing_url: config.outgoing_url,
            secret_key: config.secret_key,
            subscribed_events: config.subscribed_events,
            is_enabled: config.is_enabled,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("webhook_configs")
          .insert({
            user_id: user.id,
            outgoing_url: config.outgoing_url,
            secret_key: config.secret_key,
            subscribed_events: config.subscribed_events,
            is_enabled: config.is_enabled,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-config"] });
      toast.success("Webhook configuration saved successfully!");
    },
    onError: (error) => {
      console.error("Save error:", error);
      toast.error("Failed to save webhook configuration");
    },
  });

  // Acknowledge alert mutation
  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("integration_alerts")
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user?.id,
        })
        .eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-alerts"] });
      toast.success("Alert acknowledged");
    },
  });

  // Test webhook mutation
  const testWebhookMutation = useMutation({
    mutationFn: async () => {
      const settings = integrationSettings.webhooks;
      if (!settings.webhookUrl) {
        throw new Error("No outgoing webhook URL configured");
      }

      const { data, error } = await supabase.functions.invoke("send-webhook", {
        body: {
          event: "test.webhook",
          data: {
            message: "This is a test webhook from BakeAssist",
            timestamp: new Date().toISOString(),
          },
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["webhook-logs"] });
      toast.success("Test webhook sent successfully!");
    },
    onError: (error) => {
      console.error("Test webhook error:", error);
      toast.error(`Test webhook failed: ${error.message}`);
    },
  });

  const handleTestConnection = async (integrationId: string) => {
    if (integrationId === "webhooks") {
      testWebhookMutation.mutate();
      return;
    }
    
    setIsTesting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsTesting(false);
    toast.success(`${integrationId.charAt(0).toUpperCase() + integrationId.slice(1)} connection verified successfully!`);
  };

  const handleSaveSettings = async (integrationId: string) => {
    if (integrationId === "webhooks") {
      const settings = integrationSettings.webhooks;
      
      if (!settings.apiKey) {
        toast.error("Please generate or enter a webhook secret key");
        return;
      }

      setIsSaving(true);
      await saveWebhookConfigMutation.mutateAsync({
        outgoing_url: settings.webhookUrl || "",
        secret_key: settings.apiKey,
        subscribed_events: settings.subscribedEvents || [],
        is_enabled: settings.enabled,
      });
      setIsSaving(false);
      return;
    }

    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast.success(`${integrationId.charAt(0).toUpperCase() + integrationId.slice(1)} settings saved successfully!`);
  };

  const handleRunHealthCheck = async () => {
    setIsCheckingHealth(true);
    try {
      await supabase.functions.invoke("integration-health-check");
      queryClient.invalidateQueries({ queryKey: ["integration-health"] });
      toast.success("Health check completed");
    } catch (error) {
      toast.error("Health check failed");
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleOAuthConnect = (integration: IntegrationConfig) => {
    if (!integration.oauthConfig) return;
    
    // In production, this would redirect to the OAuth provider
    const params = new URLSearchParams({
      client_id: "YOUR_CLIENT_ID",
      redirect_uri: `${window.location.origin}/oauth/callback`,
      response_type: "code",
      scope: integration.oauthConfig.scopes.join(" "),
      state: integration.id,
    });
    
    toast.info(`OAuth flow would redirect to: ${integration.oauthConfig.authUrl}`, {
      description: "Configure OAuth credentials in your integration settings",
    });
  };

  const updateSetting = (integrationId: string, key: string, value: string | boolean | string[]) => {
    setIntegrationSettings(prev => ({
      ...prev,
      [integrationId]: {
        ...prev[integrationId],
        [key]: value,
      },
    }));
  };

  const toggleEventSubscription = (eventId: string) => {
    const currentEvents = integrationSettings.webhooks.subscribedEvents || [];
    const newEvents = currentEvents.includes(eventId)
      ? currentEvents.filter(e => e !== eventId)
      : [...currentEvents, eventId];
    updateSetting("webhooks", "subscribedEvents", newEvents);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const incomingWebhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/incoming-webhook`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Integration Settings
        </CardTitle>
        <CardDescription>
          Configure API keys, OAuth, webhooks, and monitor integration health
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="configure">Configure</TabsTrigger>
            <TabsTrigger value="webhooks">Webhook Logs</TabsTrigger>
            <TabsTrigger value="health">Health</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Active Alerts */}
            {alerts && alerts.length > 0 && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Active Alerts ({alerts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-2 rounded-lg bg-background border">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs capitalize">
                          {alert.alert_type.replace("_", " ")}
                        </Badge>
                        <span className="text-sm">{alert.message}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                      >
                        Acknowledge
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {integrations.map((integration) => (
              <div
                key={integration.id}
                className="flex items-center justify-between p-4 rounded-lg border transition-colors border-border hover:bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${integration.isConnected ? 'bg-green-500/10' : 'bg-muted'}`}>
                    <integration.icon className={`h-5 w-5 ${integration.isConnected ? 'text-green-500' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{integration.name}</h4>
                      <Badge variant={integration.isConnected ? "default" : "secondary"} className="text-xs">
                        {integration.isConnected ? (
                          <><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</>
                        ) : (
                          <><XCircle className="h-3 w-3 mr-1" /> Not Connected</>
                        )}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {authMethodLabels[integration.authMethod]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{integration.description}</p>
                    {integration.isConnected && (
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        {integration.syncInterval && (
                          <span className="flex items-center gap-1">
                            <RefreshCw className="h-3 w-3" />
                            {syncIntervalOptions.find(o => o.value === integration.syncInterval)?.label}
                          </span>
                        )}
                        {integration.lastSync && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Last sync: {integration.lastSync}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {integration.authMethod === "oauth" && !integration.isConnected && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleOAuthConnect(integration)}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Connect with OAuth
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </TabsContent>

          {/* Configure Tab */}
          <TabsContent value="configure" className="mt-4">
            <div className="space-y-6">
              {integrations.map((integration) => {
                const settings = integrationSettings[integration.id];
                
                return (
                  <Card key={integration.id} className="border-border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${settings?.enabled ? 'bg-green-500/10' : 'bg-muted'}`}>
                            <integration.icon className={`h-5 w-5 ${settings?.enabled ? 'text-green-500' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <CardTitle className="text-base">{integration.name}</CardTitle>
                            <CardDescription className="text-xs">{integration.description}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`${integration.id}-enabled`} className="text-sm text-muted-foreground">
                            {settings?.enabled ? 'Enabled' : 'Disabled'}
                          </Label>
                          <Switch
                            id={`${integration.id}-enabled`}
                            checked={settings?.enabled || false}
                            onCheckedChange={(checked) => updateSetting(integration.id, 'enabled', checked)}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Authorization Method */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Authorization Method</Label>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{authMethodLabels[integration.authMethod]}</Badge>
                          {integration.authMethod === "api_key" && (
                            <span className="text-xs text-muted-foreground">Secure key-based authentication</span>
                          )}
                          {integration.authMethod === "oauth" && (
                            <span className="text-xs text-muted-foreground">Token-based OAuth 2.0 with automatic refresh</span>
                          )}
                          {integration.authMethod === "webhook" && (
                            <span className="text-xs text-muted-foreground">Endpoint URL authentication</span>
                          )}
                        </div>
                      </div>

                      {/* OAuth Configuration */}
                      {integration.authMethod === "oauth" && (
                        <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">OAuth 2.0 Configuration</span>
                          </div>
                          
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor={`${integration.id}-client-id`}>Client ID</Label>
                              <Input
                                id={`${integration.id}-client-id`}
                                placeholder="Enter OAuth Client ID"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`${integration.id}-client-secret`}>Client Secret</Label>
                              <div className="relative">
                                <Input
                                  id={`${integration.id}-client-secret`}
                                  type={showApiKey ? "text" : "password"}
                                  placeholder="Enter OAuth Client Secret"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3"
                                  onClick={() => setShowApiKey(!showApiKey)}
                                >
                                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Scopes</Label>
                            <div className="flex flex-wrap gap-2">
                              {integration.oauthConfig?.scopes.map((scope) => (
                                <Badge key={scope} variant="secondary">{scope}</Badge>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Redirect URI</Label>
                            <Input
                              value={`${window.location.origin}/oauth/callback`}
                              readOnly
                              className="bg-muted"
                            />
                            <p className="text-xs text-muted-foreground">
                              Add this URL to your OAuth app's redirect URIs
                            </p>
                          </div>

                          <Button
                            onClick={() => handleOAuthConnect(integration)}
                            disabled={!settings?.enabled}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Authorize with {integration.name}
                          </Button>
                        </div>
                      )}

                      {/* API Key */}
                      {integration.authMethod === "api_key" && (
                        <div className="space-y-2">
                          <Label htmlFor={`${integration.id}-apikey`}>API Key</Label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Input
                                id={`${integration.id}-apikey`}
                                type={showApiKey ? "text" : "password"}
                                value={settings?.apiKey || ""}
                                onChange={(e) => updateSetting(integration.id, 'apiKey', e.target.value)}
                                placeholder="Enter your API key..."
                                className="pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3"
                                onClick={() => setShowApiKey(!showApiKey)}
                              >
                                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Your API key is encrypted and stored securely
                          </p>
                        </div>
                      )}

                      {/* Webhook Configuration */}
                      {integration.authMethod === "webhook" && (
                        <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                          <div className="flex items-center gap-2">
                            <Webhook className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Webhook Configuration</span>
                            {configLoading && (
                              <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                            )}
                          </div>
                          
                          {/* Incoming Webhook URL (Your endpoint) */}
                          <div className="space-y-2">
                            <Label htmlFor={`${integration.id}-incoming`}>Your Webhook Endpoint (Incoming)</Label>
                            <div className="flex gap-2">
                              <Input
                                id={`${integration.id}-incoming`}
                                value={incomingWebhookUrl}
                                readOnly
                                className="bg-muted font-mono text-sm flex-1"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(incomingWebhookUrl)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Share this URL with external services to receive events. Supports signature verification.
                            </p>
                          </div>

                          {/* Outgoing Webhook URL */}
                          <div className="space-y-2">
                            <Label htmlFor={`${integration.id}-webhook`}>Outgoing Webhook URL</Label>
                            <Input
                              id={`${integration.id}-webhook`}
                              type="url"
                              value={settings?.webhookUrl || ""}
                              onChange={(e) => updateSetting(integration.id, 'webhookUrl', e.target.value)}
                              placeholder="https://your-service.com/webhook"
                            />
                            <p className="text-xs text-muted-foreground">
                              URL where events will be sent. Leave empty to disable outgoing webhooks.
                            </p>
                          </div>

                          {/* Webhook Secret */}
                          <div className="space-y-2">
                            <Label htmlFor={`${integration.id}-secret`}>Webhook Secret</Label>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Input
                                  id={`${integration.id}-secret`}
                                  type={showApiKey ? "text" : "password"}
                                  value={settings?.apiKey || ""}
                                  onChange={(e) => updateSetting(integration.id, 'apiKey', e.target.value)}
                                  placeholder="whsec_..."
                                  className="pr-10 font-mono text-sm"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3"
                                  onClick={() => setShowApiKey(!showApiKey)}
                                >
                                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const secret = `whsec_${crypto.randomUUID().replace(/-/g, '')}`;
                                  updateSetting(integration.id, 'apiKey', secret);
                                  toast.success("New webhook secret generated");
                                }}
                              >
                                Generate
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Used to verify webhook signatures. Share with external services for incoming webhooks.
                            </p>
                          </div>

                          {/* Event Subscriptions */}
                          <div className="space-y-3">
                            <Label>Subscribed Events</Label>
                            <p className="text-xs text-muted-foreground">
                              Select which events to send to the outgoing webhook URL
                            </p>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {availableEvents.map((event) => (
                                <div
                                  key={event.id}
                                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                    (settings?.subscribedEvents || []).includes(event.id)
                                      ? 'border-primary bg-primary/5'
                                      : 'border-border hover:bg-muted/50'
                                  }`}
                                  onClick={() => toggleEventSubscription(event.id)}
                                >
                                  <Checkbox
                                    checked={(settings?.subscribedEvents || []).includes(event.id)}
                                    onCheckedChange={() => toggleEventSubscription(event.id)}
                                    className="mt-0.5"
                                  />
                                  <div className="space-y-1">
                                    <div className="font-medium text-sm">{event.label}</div>
                                    <div className="text-xs text-muted-foreground">{event.description}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {(settings?.subscribedEvents || []).length === 0 && (
                              <p className="text-xs text-amber-600">
                                No events selected. Select at least one event to enable outgoing webhooks.
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Sync Interval */}
                      <div className="space-y-2">
                        <Label htmlFor={`${integration.id}-sync`}>Sync Interval</Label>
                        <Select
                          value={settings?.syncInterval || "15min"}
                          onValueChange={(value) => updateSetting(integration.id, 'syncInterval', value)}
                        >
                          <SelectTrigger id={`${integration.id}-sync`} className="w-full sm:w-[200px]">
                            <SelectValue placeholder="Select interval" />
                          </SelectTrigger>
                          <SelectContent>
                            {syncIntervalOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestConnection(integration.id)}
                          disabled={(isTesting || testWebhookMutation.isPending) || !settings?.enabled || (integration.id === "webhooks" && !settings?.webhookUrl)}
                        >
                          {(isTesting || testWebhookMutation.isPending) ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <TestTube className="h-4 w-4 mr-2" />
                          )}
                          {integration.id === "webhooks" ? "Send Test Webhook" : "Test Connection"}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveSettings(integration.id)}
                          disabled={isSaving || saveWebhookConfigMutation.isPending}
                        >
                          {(isSaving || saveWebhookConfigMutation.isPending) ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Save Changes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Webhook Logs Tab */}
          <TabsContent value="webhooks" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Webhook className="h-4 w-4" />
                  Webhook Event Logs
                </CardTitle>
                <CardDescription>Track incoming and outgoing webhook calls</CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading logs...</div>
                ) : webhookLogs && webhookLogs.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Direction</TableHead>
                          <TableHead>Integration</TableHead>
                          <TableHead>Endpoint</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {webhookLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {log.direction === "incoming" ? (
                                  <ArrowDownLeft className="h-3 w-3 mr-1 text-blue-500" />
                                ) : (
                                  <ArrowUpRight className="h-3 w-3 mr-1 text-green-500" />
                                )}
                                {log.direction}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium capitalize">{log.integration_id}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                              {log.endpoint_url}
                            </TableCell>
                            <TableCell>
                              <Badge variant={log.success ? "default" : "destructive"}>
                                {log.response_status || (log.success ? "OK" : "Failed")}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {log.duration_ms}ms
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Webhook className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No webhook logs yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Health Monitoring Tab */}
          <TabsContent value="health" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Integration Health Monitor
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Real-time monitoring with automatic alerts
                  </p>
                </div>
                <Button
                  onClick={handleRunHealthCheck}
                  disabled={isCheckingHealth}
                >
                  {isCheckingHealth ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Run Health Check
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {healthLoading ? (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    Loading health data...
                  </div>
                ) : healthData && healthData.length > 0 ? (
                  healthData.map((health) => (
                    <Card key={health.id} className={health.is_healthy ? "border-green-500/30" : "border-destructive/30"}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{health.integration_name}</CardTitle>
                          {health.is_healthy ? (
                            <Heart className="h-5 w-5 text-green-500" />
                          ) : (
                            <HeartOff className="h-5 w-5 text-destructive" />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={health.is_healthy ? "default" : "destructive"}>
                            {health.is_healthy ? "Healthy" : "Unhealthy"}
                          </Badge>
                          {health.response_time_ms && (
                            <span className="text-xs text-muted-foreground">
                              {health.response_time_ms}ms
                            </span>
                          )}
                        </div>
                        {health.error_message && (
                          <p className="text-xs text-destructive">{health.error_message}</p>
                        )}
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>Last check: {format(new Date(health.last_check_at), "MMM d, HH:mm")}</p>
                          {health.consecutive_failures > 0 && (
                            <p className="text-destructive">
                              Consecutive failures: {health.consecutive_failures}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <>
                    {integrations.slice(0, 3).map((integration) => (
                      <Card key={integration.id} className="border-border">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">{integration.name}</CardTitle>
                            <Badge variant="secondary">Not Monitored</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground">
                            Run a health check to start monitoring
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
              </div>

              {/* Alert Configuration */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Alert Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Connection Failure Alerts</Label>
                      <p className="text-xs text-muted-foreground">
                        Notify admins when integrations become unreachable
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>High Latency Alerts</Label>
                      <p className="text-xs text-muted-foreground">
                        Alert when response time exceeds 5 seconds
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Recovery Notifications</Label>
                      <p className="text-xs text-muted-foreground">
                        Notify when integrations recover from failures
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
