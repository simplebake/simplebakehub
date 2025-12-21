import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Copy, Download, ExternalLink, Check, Shield, Zap, CheckCircle2, Play, Loader2, AlertCircle, CheckCircle, Key, Save, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";

interface TestResult {
  success: boolean;
  status?: number;
  message: string;
  timestamp: string;
  duration?: number;
  response?: unknown;
}

const MakeSetupGuide = () => {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const incomingWebhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/incoming-webhook`;

  // Fetch existing webhook config
  const { data: savedConfig, isLoading: configLoading } = useQuery({
    queryKey: ["webhook-config-saved"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("webhook_configs")
        .select("secret_key, updated_at, created_at")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const makeBlueprint = {
    name: "Signed Webhook to Baking App",
    flow: [
      {
        id: 1,
        module: "builtin:BasicTrigger",
        version: 1,
        parameters: {},
        mapper: {},
        metadata: {
          designer: { x: 0, y: 0 },
          restore: {}
        }
      },
      {
        id: 4,
        module: "util:SetVariable2",
        version: 1,
        parameters: {},
        mapper: {
          name: "payload",
          scope: "roundtrip",
          value: "{\"eventType\": \"order.created\", \"orderId\": \"123\", \"total\": 99.99}"
        },
        metadata: {
          designer: { x: 300, y: 0 }
        }
      },
      {
        id: 5,
        module: "util:SetVariable2",
        version: 1,
        parameters: {},
        mapper: {
          name: "timestamp",
          scope: "roundtrip",
          value: "{{formatDate(now; \"YYYY-MM-DDTHH:mm:ssZ\")}}"
        },
        metadata: {
          designer: { x: 600, y: 0 }
        }
      },
      {
        id: 6,
        module: "encryptor:Sign",
        version: 1,
        parameters: {},
        mapper: {
          algorithm: "sha256",
          key: "YOUR_WEBHOOK_SECRET_HERE",
          keyencoding: "text",
          data: "{{4.payload}}",
          dataencoding: "text",
          digest: "hex"
        },
        metadata: {
          designer: { x: 900, y: 0 }
        }
      },
      {
        id: 7,
        module: "http:ActionSendData",
        version: 3,
        parameters: {},
        mapper: {
          url: incomingWebhookUrl,
          method: "post",
          headers: [
            { name: "Content-Type", value: "application/json" },
            { name: "X-Webhook-Timestamp", value: "{{5.timestamp}}" },
            { name: "X-Webhook-Signature", value: "{{6.value}}" }
          ],
          bodyType: "raw",
          contentType: "application/json",
          data: "{{4.payload}}"
        },
        metadata: {
          designer: { x: 1200, y: 0 }
        }
      }
    ],
    metadata: {
      version: 1,
      scenario: {
        roundtrips: 1,
        maxErrors: 3,
        autoCommit: true,
        autoCommitTriggerLast: true,
        sequential: false,
        confidential: false
      },
      designer: {
        orphans: []
      }
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadBlueprint = () => {
    const blob = new Blob([JSON.stringify(makeBlueprint, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "make-webhook-blueprint.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Blueprint downloaded! Import it into Make.com");
  };

  const downloadFullBlueprint = async () => {
    try {
      const response = await fetch('/make-webhook-blueprint.json');
      if (!response.ok) throw new Error('Failed to fetch');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "make-webhook-blueprint-full.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Full blueprint downloaded!");
    } catch (error) {
      toast.error("Could not download the blueprint file");
    }
  };

  const generateMakeConfig = () => {
    const secretKey = savedConfig?.secret_key || generatedKey || "YOUR_WEBHOOK_SECRET_HERE";
    
    const config = `
═══════════════════════════════════════════════════════════
        MAKE.COM WEBHOOK CONFIGURATION
═══════════════════════════════════════════════════════════

📋 STEP 3: Set Variable - Payload
────────────────────────────────────────────────────────────
Variable name: payload
Variable value: {"eventType": "order.created", "orderId": "123", "total": 99.99}

📋 STEP 4: Set Variable - Timestamp  
────────────────────────────────────────────────────────────
Variable name: timestamp
Variable value: {{formatDate(now; "YYYY-MM-DDTHH:mm:ssZ")}}

🔐 STEP 5: Encryptor → Sign Module
────────────────────────────────────────────────────────────
Algorithm:      sha256
Key:            ${secretKey}
Key encoding:   Text
Data:           {{4.payload}}
Data encoding:  Text
Digest:         Hexadecimal

🌐 STEP 6: HTTP → Make a Request
────────────────────────────────────────────────────────────
URL:            ${incomingWebhookUrl}
Method:         POST
Body type:      Raw
Content type:   JSON (application/json)
Request content: {{4.payload}}

Headers:
  X-Webhook-Signature:  {{5.value}}
  X-Webhook-Timestamp:  {{3.timestamp}}
  Content-Type:         application/json

═══════════════════════════════════════════════════════════
    Copy the values above into your Make.com modules!
═══════════════════════════════════════════════════════════
`.trim();

    return config;
  };

  const copyMakeConfig = () => {
    const config = generateMakeConfig();
    navigator.clipboard.writeText(config);
    setCopied("Make Config");
    toast.success("Make.com configuration copied to clipboard!");
    setTimeout(() => setCopied(null), 2000);
  };

  const generatePrivateKey = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const key = Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    setGeneratedKey(key);
    toast.success("Private key generated! Copy it and keep it secure.");
  };

  const saveKeyToConfig = async () => {
    if (!generatedKey) return;
    
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please log in to save your webhook configuration");
        return;
      }

      // Check if user already has a webhook config
      const { data: existingConfig } = await supabase
        .from('webhook_configs')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingConfig) {
        // Update existing config
        const { error } = await supabase
          .from('webhook_configs')
          .update({ secret_key: generatedKey, updated_at: new Date().toISOString() })
          .eq('id', existingConfig.id);

        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["webhook-config-saved"] });
        toast.success("Webhook configuration updated with new private key!");
      } else {
        // Create new config
        const { error } = await supabase
          .from('webhook_configs')
          .insert({
            user_id: user.id,
            secret_key: generatedKey,
            is_enabled: true,
            subscribed_events: ['test.webhook', 'order.created', 'bake.completed']
          });

        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["webhook-config-saved"] });
        toast.success("Webhook configuration saved with private key!");
      }
    } catch (error) {
      console.error('Error saving webhook config:', error);
      toast.error("Failed to save webhook configuration. You may need admin permissions.");
    } finally {
      setIsSaving(false);
    }
  };

  const testWebhook = async () => {
    setIsTesting(true);
    setTestResult(null);
    const startTime = Date.now();

    try {
      const testPayload = {
        eventType: "test.webhook",
        data: {
          message: "Test webhook from setup guide",
          timestamp: new Date().toISOString()
        }
      };

      const { data, error } = await supabase.functions.invoke('trigger-webhook-event', {
        body: {
          event: 'test.webhook',
          data: testPayload
        }
      });

      const duration = Date.now() - startTime;

      if (error) {
        setTestResult({
          success: false,
          message: error.message || "Failed to send test webhook",
          timestamp: new Date().toISOString(),
          duration
        });
        toast.error("Test webhook failed");
      } else {
        setTestResult({
          success: true,
          status: 200,
          message: "Webhook sent successfully",
          timestamp: new Date().toISOString(),
          duration,
          response: data
        });
        toast.success("Test webhook sent successfully");
      }
    } catch (err) {
      const duration = Date.now() - startTime;
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Unknown error occurred",
        timestamp: new Date().toISOString(),
        duration
      });
      toast.error("Test webhook failed");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/settings">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Make.com Webhook Setup</h1>
            <p className="text-muted-foreground">Complete guide for setting up signed webhooks with Make.com</p>
          </div>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Quick Start
            </CardTitle>
            <CardDescription>Download the blueprint file and import it directly into Make.com</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={downloadFullBlueprint} className="gap-2">
              <Download className="h-4 w-4" />
              Download Full Blueprint
            </Button>
            <Button onClick={downloadBlueprint} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download Basic Blueprint
            </Button>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={copyMakeConfig}
            >
              {copied === "Make Config" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              Copy Make.com Config
            </Button>
            <Button variant="outline" asChild>
              <a href="https://www.make.com/en/login" target="_blank" rel="noopener noreferrer" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Open Make.com
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Private Key Generator */}
        <Card className="mb-8 border-yellow-500/20 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-yellow-600" />
              Generate Private Key
            </CardTitle>
            <CardDescription>
              Generate a secure 256-bit private key for signing your webhooks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Saved Key Status */}
            {savedConfig && (
              <div className="p-4 rounded-lg border border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/20">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-green-700 dark:text-green-300">
                        Private Key Saved
                      </p>
                      <Badge variant="outline" className="text-xs border-green-300 text-green-700 dark:border-green-700 dark:text-green-300">
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                        {savedConfig.secret_key.substring(0, 8)}...{savedConfig.secret_key.substring(savedConfig.secret_key.length - 8)}
                      </code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-6 px-2 text-green-700 hover:text-green-800 hover:bg-green-100 dark:text-green-300 dark:hover:bg-green-900/30"
                        onClick={() => copyToClipboard(savedConfig.secret_key, "Saved Key")}
                      >
                        {copied === "Saved Key" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                      <Clock className="h-3 w-3" />
                      <span>
                        Last updated: {format(new Date(savedConfig.updated_at), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {configLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading saved configuration...</span>
              </div>
            )}

            <Button onClick={generatePrivateKey} className="gap-2">
              <Key className="h-4 w-4" />
              {savedConfig ? "Generate New Key" : "Generate Key"}
            </Button>
            
            {generatedKey && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Your New Private Key:</p>
                <div className="flex gap-2">
                  <div 
                    className="flex-1 bg-muted p-3 rounded-lg text-sm font-mono break-all select-all"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                  >
                    {generatedKey}
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(generatedKey, "Private Key")}
                  >
                    {copied === "Private Key" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Save this key securely. Use it in both your Make.com scenario and your webhook configuration.
                </p>
                <Button 
                  onClick={saveKeyToConfig} 
                  disabled={isSaving}
                  variant="secondary" 
                  className="gap-2 mt-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {savedConfig ? "Update Webhook Config" : "Save to Webhook Config"}
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Webhook URL */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Your Webhook Endpoint
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <code className="flex-1 bg-muted p-3 rounded-lg text-sm font-mono break-all">
                {incomingWebhookUrl}
              </code>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => copyToClipboard(incomingWebhookUrl, "Webhook URL")}
              >
                {copied === "Webhook URL" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Webhook */}
        <Card className="mb-8 border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Test Your Webhook
            </CardTitle>
            <CardDescription>
              Send a test request to verify your webhook configuration is working correctly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testWebhook} 
              disabled={isTesting}
              className="gap-2"
            >
              {isTesting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending Test...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Send Test Webhook
                </>
              )}
            </Button>

            {testResult && (
              <div className={`p-4 rounded-lg border ${testResult.success ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900' : 'bg-destructive/10 border-destructive/20'}`}>
                <div className="flex items-start gap-3">
                  {testResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className={`font-medium ${testResult.success ? 'text-green-700 dark:text-green-300' : 'text-destructive'}`}>
                        {testResult.success ? 'Success' : 'Failed'}
                      </p>
                      {testResult.duration && (
                        <Badge variant="outline" className="text-xs">
                          {testResult.duration}ms
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{testResult.message}</p>
                    <p className="text-xs text-muted-foreground">
                      Sent at: {new Date(testResult.timestamp).toLocaleString()}
                    </p>
                    
                    {testResult.response && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Response:</p>
                        <pre className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto max-h-40">
                          {JSON.stringify(testResult.response, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              <p>This test will:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Send a <code className="bg-muted px-1 rounded">test.webhook</code> event to your configured endpoints</li>
                <li>Show the response status and timing</li>
                <li>Help verify your webhook configuration is working</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Step-by-Step Setup</CardTitle>
            <CardDescription>Follow these steps to configure a signed webhook in Make.com</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Step 1 */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>
                <h3 className="text-lg font-semibold">Create New Scenario</h3>
              </div>
              <div className="ml-11 space-y-2 text-muted-foreground">
                <p>• Go to <strong className="text-foreground">Scenarios</strong> → <strong className="text-foreground">Create a new scenario</strong></p>
                <p>• Click the <strong className="text-foreground">+</strong> button to add your first module</p>
              </div>
            </div>

            <Separator />

            {/* Step 2 */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</div>
                <h3 className="text-lg font-semibold">Add a Trigger Module</h3>
              </div>
              <div className="ml-11 space-y-2 text-muted-foreground">
                <p>• Search for <strong className="text-foreground">"Schedule"</strong> or your data source (Airtable, Google Sheets, etc.)</p>
                <p>• Configure it to run at your desired interval</p>
                <p>• For testing, use <strong className="text-foreground">Flow Control → Set Variable</strong> with test data:</p>
                <pre className="bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto">
{`{"event": "test.event", "data": {"message": "Hello from Make!"}}`}
                </pre>
              </div>
            </div>

            <Separator />

            {/* Step 3 */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</div>
                <h3 className="text-lg font-semibold">Add "Set Variable" Module for Payload</h3>
              </div>
              <div className="ml-11 space-y-2 text-muted-foreground">
                <p>• Search for <strong className="text-foreground">Tools</strong> → <strong className="text-foreground">Set variable</strong></p>
                <p>• <strong className="text-foreground">Variable name:</strong> <code className="bg-muted px-2 py-0.5 rounded">payload</code></p>
                <p>• <strong className="text-foreground">Variable value:</strong> Your JSON payload as a string</p>
                <pre className="bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto">
{`{"eventType": "order.created", "orderId": "123", "total": 99.99}`}
                </pre>
              </div>
            </div>

            <Separator />

            {/* Step 4 */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">4</div>
                <h3 className="text-lg font-semibold">Add "Set Variable" for Timestamp</h3>
              </div>
              <div className="ml-11 space-y-2 text-muted-foreground">
                <p>• Add another <strong className="text-foreground">Tools</strong> → <strong className="text-foreground">Set variable</strong></p>
                <p>• <strong className="text-foreground">Variable name:</strong> <code className="bg-muted px-2 py-0.5 rounded">timestamp</code></p>
                <p>• <strong className="text-foreground">Variable value:</strong> Use the formula:</p>
                <pre className="bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto">
{'{{formatDate(now; "YYYY-MM-DDTHH:mm:ssZ")}}'}
                </pre>
              </div>
            </div>

            <Separator />

            {/* Step 5 */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">5</div>
                <h3 className="text-lg font-semibold">Add "Crypto → Sign" Module</h3>
              </div>
              <div className="ml-11 space-y-3 text-muted-foreground">
                <p>• Search for <strong className="text-foreground">Encryptor</strong> → <strong className="text-foreground">Sign</strong></p>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                    <span className="font-semibold text-foreground">Algorithm:</span>
                    <code>sha256</code>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                    <span className="font-semibold text-foreground">Key:</span>
                    <code className="break-all">YOUR_WEBHOOK_SECRET_HERE</code>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                    <span className="font-semibold text-foreground">Key encoding:</span>
                    <code>Text</code>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                    <span className="font-semibold text-foreground">Data:</span>
                    <code>{'{{4.payload}}'}</code>
                    <span></span>
                    <span className="text-xs">(reference to payload variable from module #4)</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                    <span className="font-semibold text-foreground">Data encoding:</span>
                    <code>Text</code>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                    <span className="font-semibold text-foreground">Digest:</span>
                    <code>Hexadecimal</code>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Step 6 */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">6</div>
                <h3 className="text-lg font-semibold">Add "HTTP → Make a Request" Module</h3>
              </div>
              <div className="ml-11 space-y-3 text-muted-foreground">
                <p>• Search for <strong className="text-foreground">HTTP</strong> → <strong className="text-foreground">Make a request</strong></p>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                    <span className="font-semibold text-foreground">URL:</span>
                    <code className="break-all">{incomingWebhookUrl}</code>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                    <span className="font-semibold text-foreground">Method:</span>
                    <code>POST</code>
                  </div>
                  <div className="mt-3">
                    <span className="font-semibold text-foreground text-sm">Headers:</span>
                    <div className="mt-2 space-y-1 ml-2">
                      <div className="flex gap-2 text-sm">
                        <Badge variant="outline">Content-Type</Badge>
                        <code>application/json</code>
                      </div>
                      <div className="flex gap-2 text-sm">
                        <Badge variant="outline">X-Webhook-Timestamp</Badge>
                        <code>{'{{5.timestamp}}'}</code>
                      </div>
                      <div className="flex gap-2 text-sm">
                        <Badge variant="outline">X-Webhook-Signature</Badge>
                        <code>{'{{6.value}}'}</code>
                        <span className="text-xs">(Crypto output)</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-sm mt-3">
                    <span className="font-semibold text-foreground">Body type:</span>
                    <code>Raw</code>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                    <span className="font-semibold text-foreground">Content type:</span>
                    <code>JSON (application/json)</code>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                    <span className="font-semibold text-foreground">Request content:</span>
                    <code>{'{{4.payload}}'}</code>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Flow Diagram */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Complete Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 flex-wrap justify-center py-4">
              <Badge className="text-sm py-1.5 px-3">Trigger</Badge>
              <span className="text-muted-foreground">→</span>
              <Badge className="text-sm py-1.5 px-3">Set Payload</Badge>
              <span className="text-muted-foreground">→</span>
              <Badge className="text-sm py-1.5 px-3">Set Timestamp</Badge>
              <span className="text-muted-foreground">→</span>
              <Badge className="text-sm py-1.5 px-3">Crypto Sign</Badge>
              <span className="text-muted-foreground">→</span>
              <Badge className="text-sm py-1.5 px-3">HTTP Request</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Troubleshooting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">401 Error</p>
                  <p className="text-sm text-muted-foreground">Check that the secret key matches exactly between Make.com and your app settings</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Timestamp expired</p>
                  <p className="text-sm text-muted-foreground">Ensure timestamp is current (within 5 minutes). Check that the formatDate function is correct.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Signature mismatch</p>
                  <p className="text-sm text-muted-foreground">Verify payload is exactly the same string used for signing. No extra spaces or formatting.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Module references wrong</p>
                  <p className="text-sm text-muted-foreground">The {'{{4.payload}}'} syntax references module #4's output - adjust based on your actual module order</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="flex justify-center">
          <Button variant="outline" asChild>
            <Link to="/settings" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Settings
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MakeSetupGuide;
