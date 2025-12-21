import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
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
  Clock
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

export function IntegrationsSettings() {
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state for integration settings
  const [integrationSettings, setIntegrationSettings] = useState<Record<string, {
    apiKey: string;
    syncInterval: string;
    enabled: boolean;
    webhookUrl?: string;
  }>>({
    shopify: { apiKey: "sk_live_•••••••••••••••••", syncInterval: "15min", enabled: true },
    resend: { apiKey: "re_•••••••••••••••••", syncInterval: "realtime", enabled: true },
    webhooks: { apiKey: "", syncInterval: "realtime", enabled: false, webhookUrl: "" },
  });

  const handleTestConnection = async (integrationId: string) => {
    setIsTesting(true);
    // Simulate API test
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsTesting(false);
    toast.success(`${integrationId.charAt(0).toUpperCase() + integrationId.slice(1)} connection verified successfully!`);
  };

  const handleSaveSettings = async (integrationId: string) => {
    setIsSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast.success(`${integrationId.charAt(0).toUpperCase() + integrationId.slice(1)} settings saved successfully!`);
  };

  const updateSetting = (integrationId: string, key: string, value: string | boolean) => {
    setIntegrationSettings(prev => ({
      ...prev,
      [integrationId]: {
        ...prev[integrationId],
        [key]: value,
      },
    }));
  };

  const getIntegration = (id: string) => integrations.find(i => i.id === id);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Integration Settings
        </CardTitle>
        <CardDescription>
          Configure API keys, authorization methods, and sync intervals for connected services
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">All Integrations</TabsTrigger>
            <TabsTrigger value="configure">Configure</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {integrations.map((integration) => (
              <div
                key={integration.id}
                className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                  selectedIntegration === integration.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                }`}
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
                    </div>
                    <p className="text-sm text-muted-foreground">{integration.description}</p>
                    {integration.isConnected && (
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Key className="h-3 w-3" />
                          {authMethodLabels[integration.authMethod]}
                        </span>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIntegration(
                    selectedIntegration === integration.id ? null : integration.id
                  )}
                >
                  Configure
                </Button>
              </div>
            ))}
          </TabsContent>

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
                            <span className="text-xs text-muted-foreground">Token-based OAuth 2.0</span>
                          )}
                          {integration.authMethod === "webhook" && (
                            <span className="text-xs text-muted-foreground">Endpoint URL authentication</span>
                          )}
                        </div>
                      </div>

                      {/* API Key / Webhook URL */}
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

                      {integration.authMethod === "webhook" && (
                        <div className="space-y-2">
                          <Label htmlFor={`${integration.id}-webhook`}>Webhook URL</Label>
                          <Input
                            id={`${integration.id}-webhook`}
                            type="url"
                            value={settings?.webhookUrl || ""}
                            onChange={(e) => updateSetting(integration.id, 'webhookUrl', e.target.value)}
                            placeholder="https://your-service.com/webhook"
                          />
                          <p className="text-xs text-muted-foreground">
                            Incoming webhook URL for receiving events
                          </p>
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
                        <p className="text-xs text-muted-foreground">
                          How often data should sync with {integration.name}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestConnection(integration.id)}
                          disabled={isTesting || !settings?.enabled}
                        >
                          {isTesting ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <TestTube className="h-4 w-4 mr-2" />
                          )}
                          Test Connection
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveSettings(integration.id)}
                          disabled={isSaving}
                        >
                          {isSaving ? (
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
        </Tabs>
      </CardContent>
    </Card>
  );
}
