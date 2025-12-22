import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Copy, Download, ExternalLink, Check, Shield, Zap, CheckCircle2, Play, Loader2, AlertCircle, CheckCircle, Key, Save, Clock, ArrowRight, HelpCircle } from "lucide-react";
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

MODULE 1: Trigger (Webhook or Schedule)
────────────────────────────────────────────────────────────
This is your starting module that triggers the scenario.

MODULE 2: Set Variable - Payload
────────────────────────────────────────────────────────────
Variable name: payload
Variable value: {"eventType": "order.created", "orderId": "123", "total": 99.99}

MODULE 3: Set Variable - Timestamp  
────────────────────────────────────────────────────────────
Variable name: timestamp
Variable value: {{formatDate(now; "YYYY-MM-DDTHH:mm:ssZ")}}

MODULE 4: Encryptor → Sign
────────────────────────────────────────────────────────────
Algorithm:      sha256
Key:            ${secretKey}
Key encoding:   Text
Data:           {{2.payload}}
Data encoding:  Text
Digest:         Hexadecimal

MODULE 5: HTTP → Make a Request
────────────────────────────────────────────────────────────
URL:            ${incomingWebhookUrl}
Method:         POST
Body type:      Raw
Content type:   JSON (application/json)
Request content: {{2.payload}}

Headers:
  X-Webhook-Signature:  {{4.value}}
  X-Webhook-Timestamp:  {{3.timestamp}}
  Content-Type:         application/json

═══════════════════════════════════════════════════════════
  Module references: 2=payload, 3=timestamp, 4=signature
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

  const [isTestingSignature, setIsTestingSignature] = useState(false);
  const [signatureTestResult, setSignatureTestResult] = useState<TestResult | null>(null);
  
  // Debug signature tool state
  const [debugPayload, setDebugPayload] = useState('{"eventType": "order.created", "orderId": "123", "total": 99.99}');
  const [debugSignature, setDebugSignature] = useState<string | null>(null);
  const [isGeneratingSignature, setIsGeneratingSignature] = useState(false);
  
  const generateDebugSignature = async () => {
    const secretKey = savedConfig?.secret_key || generatedKey;
    
    if (!secretKey) {
      toast.error("Please generate and save a private key first");
      return;
    }

    if (!debugPayload.trim()) {
      toast.error("Please enter a payload to sign");
      return;
    }

    setIsGeneratingSignature(true);
    
    try {
      // Normalize the payload - remove extra whitespace for consistent signing
      const normalizedPayload = debugPayload.trim();
      
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secretKey);
      const messageData = encoder.encode(normalizedPayload);
      
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
      const signature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      setDebugSignature(signature);
      toast.success("Signature generated! Compare with Make.com output.");
    } catch (error) {
      console.error("Error generating signature:", error);
      toast.error("Failed to generate signature");
      setDebugSignature(null);
    } finally {
      setIsGeneratingSignature(false);
    }
  };

  const testSignatureValidation = async () => {
    const secretKey = savedConfig?.secret_key || generatedKey;
    
    if (!secretKey) {
      toast.error("Please generate and save a private key first");
      return;
    }

    setIsTestingSignature(true);
    setSignatureTestResult(null);
    const startTime = Date.now();

    try {
      const payload = JSON.stringify({
        eventType: "test.signature",
        data: {
          message: "Signature validation test",
          timestamp: new Date().toISOString()
        }
      });

      const timestamp = new Date().toISOString();
      
      // Create HMAC signature using Web Crypto API
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secretKey);
      const messageData = encoder.encode(payload);
      
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
      const signature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Send the signed request directly to the incoming-webhook endpoint
      const response = await fetch(incomingWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': timestamp,
        },
        body: payload,
      });

      const duration = Date.now() - startTime;
      const responseData = await response.json().catch(() => null);

      if (response.ok) {
        setSignatureTestResult({
          success: true,
          status: response.status,
          message: "Signature validated successfully! Your webhook is configured correctly.",
          timestamp: new Date().toISOString(),
          duration,
          response: responseData
        });
        toast.success("Signature validation passed!");
      } else {
        setSignatureTestResult({
          success: false,
          status: response.status,
          message: responseData?.error || `Validation failed with status ${response.status}`,
          timestamp: new Date().toISOString(),
          duration,
          response: responseData
        });
        toast.error("Signature validation failed");
      }
    } catch (err) {
      const duration = Date.now() - startTime;
      setSignatureTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Unknown error occurred",
        timestamp: new Date().toISOString(),
        duration
      });
      toast.error("Signature test failed");
    } finally {
      setIsTestingSignature(false);
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


        {/* Visual Flow Diagram */}
        <Card className="mb-8 border-blue-500/20 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Module Flow Diagram
            </CardTitle>
            <CardDescription>Visual overview of how your Make.com scenario should be connected</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto pb-4">
              <div className="flex items-center gap-2 min-w-max">
                {/* Module 1 - Trigger */}
                <div className="flex flex-col items-center">
                  <div className="w-28 h-20 rounded-lg border-2 border-purple-400 bg-purple-100 dark:bg-purple-900/30 flex flex-col items-center justify-center p-2">
                    <Play className="h-5 w-5 text-purple-600 dark:text-purple-400 mb-1" />
                    <span className="text-xs font-medium text-center text-purple-700 dark:text-purple-300">Trigger</span>
                    <span className="text-[10px] text-purple-500 dark:text-purple-400">Module 1</span>
                  </div>
                </div>

                {/* Animated Arrow */}
                <div className="flex items-center relative">
                  <div className="w-8 h-0.5 bg-gradient-to-r from-purple-400 to-blue-400 animate-flow-pulse" />
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="w-2 h-0.5 bg-white/80 animate-flow-arrow" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-blue-400 -ml-1" />
                </div>

                {/* Module 2 - Set Payload */}
                <div className="flex flex-col items-center">
                  <div className="w-28 h-20 rounded-lg border-2 border-blue-400 bg-blue-100 dark:bg-blue-900/30 flex flex-col items-center justify-center p-2">
                    <span className="text-lg mb-0.5">📦</span>
                    <span className="text-xs font-medium text-center text-blue-700 dark:text-blue-300">Set Payload</span>
                    <span className="text-[10px] text-blue-500 dark:text-blue-400">Module 2</span>
                  </div>
                  <code className="text-[10px] mt-1 text-muted-foreground">{"{{2.payload}}"}</code>
                </div>

                {/* Animated Arrow */}
                <div className="flex items-center relative">
                  <div className="w-8 h-0.5 bg-gradient-to-r from-blue-400 to-cyan-400 animate-flow-pulse" style={{ animationDelay: '0.3s' }} />
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="w-2 h-0.5 bg-white/80 animate-flow-arrow" style={{ animationDelay: '0.3s' }} />
                  </div>
                  <ArrowRight className="h-4 w-4 text-cyan-400 -ml-1" />
                </div>

                {/* Module 3 - Set Timestamp */}
                <div className="flex flex-col items-center">
                  <div className="w-28 h-20 rounded-lg border-2 border-cyan-400 bg-cyan-100 dark:bg-cyan-900/30 flex flex-col items-center justify-center p-2">
                    <Clock className="h-5 w-5 text-cyan-600 dark:text-cyan-400 mb-1" />
                    <span className="text-xs font-medium text-center text-cyan-700 dark:text-cyan-300">Set Timestamp</span>
                    <span className="text-[10px] text-cyan-500 dark:text-cyan-400">Module 3</span>
                  </div>
                  <code className="text-[10px] mt-1 text-muted-foreground">{"{{3.timestamp}}"}</code>
                </div>

                {/* Animated Arrow */}
                <div className="flex items-center relative">
                  <div className="w-8 h-0.5 bg-gradient-to-r from-cyan-400 to-yellow-400 animate-flow-pulse" style={{ animationDelay: '0.6s' }} />
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="w-2 h-0.5 bg-white/80 animate-flow-arrow" style={{ animationDelay: '0.6s' }} />
                  </div>
                  <ArrowRight className="h-4 w-4 text-yellow-400 -ml-1" />
                </div>

                {/* Module 4 - Sign */}
                <div className="flex flex-col items-center">
                  <div className="w-28 h-20 rounded-lg border-2 border-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 flex flex-col items-center justify-center p-2">
                    <Key className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mb-1" />
                    <span className="text-xs font-medium text-center text-yellow-700 dark:text-yellow-300">Encryptor Sign</span>
                    <span className="text-[10px] text-yellow-500 dark:text-yellow-400">Module 4</span>
                  </div>
                  <code className="text-[10px] mt-1 text-muted-foreground">{"{{4.value}}"}</code>
                </div>

                {/* Animated Arrow */}
                <div className="flex items-center relative">
                  <div className="w-8 h-0.5 bg-gradient-to-r from-yellow-400 to-green-400 animate-flow-pulse" style={{ animationDelay: '0.9s' }} />
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="w-2 h-0.5 bg-white/80 animate-flow-arrow" style={{ animationDelay: '0.9s' }} />
                  </div>
                  <ArrowRight className="h-4 w-4 text-green-400 -ml-1" />
                </div>

                {/* Module 5 - HTTP Request */}
                <div className="flex flex-col items-center">
                  <div className="w-28 h-20 rounded-lg border-2 border-green-400 bg-green-100 dark:bg-green-900/30 flex flex-col items-center justify-center p-2">
                    <ExternalLink className="h-5 w-5 text-green-600 dark:text-green-400 mb-1" />
                    <span className="text-xs font-medium text-center text-green-700 dark:text-green-300">HTTP Request</span>
                    <span className="text-[10px] text-green-500 dark:text-green-400">Module 5</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Connection legend */}
            <div className="mt-4 p-3 rounded-lg bg-muted/50 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Module Connections:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-background px-1.5 py-0.5 rounded">{"{{2.payload}}"}</span>
                  <span className="text-muted-foreground">→ Used in Module 4 & 5</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-background px-1.5 py-0.5 rounded">{"{{3.timestamp}}"}</span>
                  <span className="text-muted-foreground">→ HTTP header</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-background px-1.5 py-0.5 rounded">{"{{4.value}}"}</span>
                  <span className="text-muted-foreground">→ Signature header</span>
                </div>
              </div>
            </div>
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

            <Separator className="my-4" />

            {/* Signature Validation Test */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Test Signature Validation
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Verify that the saved key correctly signs and validates webhook requests
                </p>
              </div>

              <Button 
                onClick={testSignatureValidation} 
                disabled={isTestingSignature || (!savedConfig?.secret_key && !generatedKey)}
                variant="secondary"
                className="gap-2"
              >
                {isTestingSignature ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Validating Signature...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    Test Signature Validation
                  </>
                )}
              </Button>

              {!savedConfig?.secret_key && !generatedKey && (
                <p className="text-xs text-muted-foreground">
                  Generate and save a private key above to test signature validation.
                </p>
              )}

              {signatureTestResult && (
                <div className={`p-4 rounded-lg border ${signatureTestResult.success ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900' : 'bg-destructive/10 border-destructive/20'}`}>
                  <div className="flex items-start gap-3">
                    {signatureTestResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className={`font-medium ${signatureTestResult.success ? 'text-green-700 dark:text-green-300' : 'text-destructive'}`}>
                          {signatureTestResult.success ? 'Signature Valid' : 'Signature Invalid'}
                        </p>
                        {signatureTestResult.duration && (
                          <Badge variant="outline" className="text-xs">
                            {signatureTestResult.duration}ms
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{signatureTestResult.message}</p>
                      {signatureTestResult.response && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Response:</p>
                          <pre className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto max-h-40">
                            {JSON.stringify(signatureTestResult.response, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator className="my-4" />

            <div className="text-sm text-muted-foreground">
              <p>The basic test will:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Send a <code className="bg-muted px-1 rounded">test.webhook</code> event to your configured endpoints</li>
                <li>Show the response status and timing</li>
                <li>Help verify your webhook configuration is working</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting Section */}
        <Card className="mb-8 border-orange-500/20 bg-orange-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-orange-500" />
              Troubleshooting Guide
            </CardTitle>
            <CardDescription>Common signature validation errors and how to fix them</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Error 1 */}
            <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <p className="font-medium text-destructive">"Missing signature"</p>
                  <p className="text-sm text-muted-foreground">
                    The <code className="bg-muted px-1 rounded">X-Webhook-Signature</code> header is not being sent.
                  </p>
                  <div className="text-sm space-y-1">
                    <p className="font-medium">Solutions:</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>Add the Encryptor → Sign module before your HTTP request</li>
                      <li>In HTTP module headers, add: <code className="bg-muted px-1 rounded">X-Webhook-Signature: {"{{4.value}}"}</code></li>
                      <li>Ensure the Encryptor module is connected and configured correctly</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Error 2 */}
            <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <p className="font-medium text-destructive">"Invalid signature"</p>
                  <p className="text-sm text-muted-foreground">
                    The signature doesn't match what the server expects.
                  </p>
                  <div className="text-sm space-y-1">
                    <p className="font-medium">Solutions:</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li><strong>Key mismatch:</strong> Ensure the key in Make.com matches your saved private key exactly</li>
                      <li><strong>Wrong data signed:</strong> Sign the exact payload string, not a modified version</li>
                      <li><strong>Algorithm:</strong> Use <code className="bg-muted px-1 rounded">sha256</code> with <code className="bg-muted px-1 rounded">Hexadecimal</code> digest</li>
                      <li><strong>Encoding:</strong> Set both Key encoding and Data encoding to <code className="bg-muted px-1 rounded">Text</code></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Error 3 */}
            <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <p className="font-medium text-destructive">"Timestamp expired" or "Missing timestamp"</p>
                  <p className="text-sm text-muted-foreground">
                    The <code className="bg-muted px-1 rounded">X-Webhook-Timestamp</code> header is missing or too old.
                  </p>
                  <div className="text-sm space-y-1">
                    <p className="font-medium">Solutions:</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>Add the Set Variable module for timestamp with: <code className="bg-muted px-1 rounded">{'{{formatDate(now; "YYYY-MM-DDTHH:mm:ssZ")}}'}</code></li>
                      <li>Add the header: <code className="bg-muted px-1 rounded">X-Webhook-Timestamp: {"{{3.timestamp}}"}</code></li>
                      <li>Ensure your scenario runs promptly (timestamps older than 5 minutes may be rejected)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Error 4 */}
            <div className="p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <p className="font-medium text-yellow-700 dark:text-yellow-400">"Module references non-existing module"</p>
                  <p className="text-sm text-muted-foreground">
                    Make.com can't find the referenced module number.
                  </p>
                  <div className="text-sm space-y-1">
                    <p className="font-medium">Solutions:</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>Module numbers depend on your scenario layout - check the module IDs in Make.com</li>
                      <li>Click on a module and look at the URL or module info for the actual number</li>
                      <li>Update references to match your actual module numbers (e.g., if your payload is module 3, use <code className="bg-muted px-1 rounded">{"{{3.payload}}"}</code>)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Error 5 */}
            <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/5">
              <div className="flex items-start gap-3">
                <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <p className="font-medium text-blue-700 dark:text-blue-400">"CORS error" or "Network error"</p>
                  <p className="text-sm text-muted-foreground">
                    The request is being blocked by browser security or network issues.
                  </p>
                  <div className="text-sm space-y-1">
                    <p className="font-medium">Solutions:</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>This is normal when testing from a browser - the webhook endpoint handles CORS for Make.com requests</li>
                      <li>Use the "Test Signature Validation" button above which makes a proper signed request</li>
                      <li>Check your network connection and ensure the Supabase project is running</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Checklist */}
            <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/5">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <p className="font-medium text-green-700 dark:text-green-400">Quick Verification Checklist</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Private key is saved and matches Make.com Encryptor key
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Encryptor uses SHA256 algorithm with Hexadecimal digest
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Both encoding settings are set to "Text"
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      HTTP headers include X-Webhook-Signature and X-Webhook-Timestamp
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Request content matches the data that was signed
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug Signature Tool */}
        <Card className="mb-8 border-purple-500/20 bg-purple-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-purple-500" />
              Debug Signature Tool
            </CardTitle>
            <CardDescription>
              Paste your payload and generate the expected signature to compare with Make.com's output
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Exact Payload Format for Make.com */}
            <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/5">
              <h4 className="font-medium flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
                Exact Payload Format for Make.com
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                In Make.com's <strong>Set Variable</strong> module, your payload must be a <strong>single-line JSON string</strong> with no extra spaces or formatting:
              </p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-green-600 mb-1">✓ CORRECT (single line, no extra spaces):</p>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-green-100 dark:bg-green-900/30 p-3 rounded-lg text-sm font-mono break-all text-green-800 dark:text-green-200">
                      {`{"eventType":"order.created","orderId":"123","total":99.99}`}
                    </code>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="shrink-0"
                      onClick={() => {
                        copyToClipboard('{"eventType":"order.created","orderId":"123","total":99.99}', "Correct payload");
                        setDebugPayload('{"eventType":"order.created","orderId":"123","total":99.99}');
                      }}
                    >
                      {copied === "Correct payload" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-destructive mb-1">✗ WRONG (extra spaces, multi-line):</p>
                  <code className="block bg-destructive/10 p-3 rounded-lg text-sm font-mono break-all text-destructive">
                    {`{ "eventType": "order.created", "orderId": "123" }`}
                  </code>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                <strong>Important:</strong> The signature is generated from the exact bytes of your payload string. Even a single extra space will produce a completely different signature!
              </p>
            </div>

            {/* Payload Input */}
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Paste Your Payload (exactly as used in Make.com):
              </label>
              <textarea
                value={debugPayload}
                onChange={(e) => setDebugPayload(e.target.value)}
                className="w-full h-32 p-3 rounded-lg border bg-muted font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder='{"eventType":"order.created","orderId":"123"}'
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Characters: {debugPayload.length}</span>
                <span>•</span>
                <span>Bytes: {new TextEncoder().encode(debugPayload).length}</span>
              </div>
            </div>

            {/* Generate Button */}
            <Button 
              onClick={generateDebugSignature}
              disabled={isGeneratingSignature || (!savedConfig?.secret_key && !generatedKey)}
              className="gap-2"
            >
              {isGeneratingSignature ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4" />
                  Generate Expected Signature
                </>
              )}
            </Button>

            {!savedConfig?.secret_key && !generatedKey && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Please generate and save a private key first (Step 1 above)
              </p>
            )}

            {/* Generated Signature */}
            {debugSignature && (
              <div className="space-y-3">
                <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/5">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                    <div className="flex-1 space-y-3">
                      <p className="font-medium text-green-700 dark:text-green-300">Expected Signature:</p>
                      <div className="flex gap-2">
                        <code className="flex-1 bg-green-100 dark:bg-green-900/30 p-3 rounded-lg text-sm font-mono break-all text-green-800 dark:text-green-200 select-all">
                          {debugSignature}
                        </code>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="shrink-0"
                          onClick={() => copyToClipboard(debugSignature, "Debug signature")}
                        >
                          {copied === "Debug signature" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        This is the signature your backend expects. Compare this with the output from Make.com's Encryptor module.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Comparison Instructions */}
                <div className="p-4 rounded-lg border bg-muted/50">
                  <h4 className="font-medium text-sm mb-2">How to compare in Make.com:</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Run your scenario once</li>
                    <li>Click on the Encryptor module's output bubble</li>
                    <li>Look at the <code className="bg-muted px-1 rounded">value</code> field</li>
                    <li>Compare it character-by-character with the signature above</li>
                  </ol>
                  <p className="text-sm text-muted-foreground mt-3">
                    <strong>If they don't match:</strong> Your payload in Make.com differs from what you pasted here. Check for extra spaces, different formatting, or encoding issues.
                  </p>
                </div>
              </div>
            )}

            {/* Current Key Being Used */}
            {(savedConfig?.secret_key || generatedKey) && (
              <div className="p-3 rounded-lg border bg-muted/30 text-sm">
                <span className="text-muted-foreground">Using key: </span>
                <code className="font-mono">
                  {(savedConfig?.secret_key || generatedKey || '').substring(0, 8)}...{(savedConfig?.secret_key || generatedKey || '').slice(-8)}
                </code>
              </div>
            )}
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
                <div className="h-8 w-8 rounded-full bg-yellow-500 text-white flex items-center justify-center font-bold">5</div>
                <h3 className="text-lg font-semibold">Add "Encryptor → Sign" Module</h3>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">Key Step</Badge>
              </div>
              <div className="ml-11 space-y-4 text-muted-foreground">
                <p>• Search for <strong className="text-foreground">Encryptor</strong> → <strong className="text-foreground">Sign</strong></p>
                
                {/* Visual Sign Module Guide */}
                <div className="border-2 border-yellow-400 rounded-lg overflow-hidden">
                  <div className="bg-yellow-400 px-4 py-2 flex items-center gap-2">
                    <Key className="h-4 w-4 text-yellow-900" />
                    <span className="font-semibold text-yellow-900">Encryptor - Sign Module Configuration</span>
                  </div>
                  
                  <div className="bg-card p-4 space-y-4">
                    {/* Algorithm Field */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        Algorithm
                        <Badge variant="outline" className="text-[10px] font-normal">Required</Badge>
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted border rounded-md px-3 py-2 text-sm font-mono">
                          sha256
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard("sha256", "Algorithm")}
                        >
                          {copied === "Algorithm" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Select "sha256" from the dropdown menu</p>
                    </div>

                    {/* Key Field */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        Key
                        <Badge variant="outline" className="text-[10px] font-normal border-yellow-500 text-yellow-600">Your Secret</Badge>
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-md px-3 py-2 text-sm font-mono break-all">
                          {savedConfig?.secret_key || generatedKey || "YOUR_WEBHOOK_SECRET_HERE"}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard(savedConfig?.secret_key || generatedKey || "YOUR_WEBHOOK_SECRET_HERE", "Sign Key")}
                        >
                          {copied === "Sign Key" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {savedConfig?.secret_key || generatedKey 
                          ? "✓ Paste your saved private key (shown above)" 
                          : "Generate and save a private key in the section above first"}
                      </p>
                    </div>

                    {/* Key Encoding Field */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Key encoding</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted border rounded-md px-3 py-2 text-sm font-mono">
                          Text
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard("Text", "Key Encoding")}
                        >
                          {copied === "Key Encoding" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Select "Text" - this means your key is plain text, not base64</p>
                    </div>

                    {/* Data Field */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        Data
                        <Badge variant="outline" className="text-[10px] font-normal border-blue-500 text-blue-600">Module Reference</Badge>
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-md px-3 py-2 text-sm font-mono">
                          {"{{2.payload}}"}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard("{{2.payload}}", "Data Reference")}
                        >
                          {copied === "Data Reference" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Reference to the payload from Module 2. Click the input field, then select "payload" from Module 2's output.
                      </p>
                    </div>

                    {/* Data Encoding Field */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Data encoding</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted border rounded-md px-3 py-2 text-sm font-mono">
                          Text
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard("Text", "Data Encoding")}
                        >
                          {copied === "Data Encoding" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Select "Text" - the payload is a JSON string</p>
                    </div>

                    {/* Digest Field */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        Digest
                        <Badge variant="outline" className="text-[10px] font-normal border-green-500 text-green-600">Output Format</Badge>
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-md px-3 py-2 text-sm font-mono">
                          Hexadecimal
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard("Hexadecimal", "Digest")}
                        >
                          {copied === "Digest" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Select "Hexadecimal" - this outputs the signature as a hex string</p>
                    </div>
                  </div>

                  {/* Output Section */}
                  <div className="bg-green-50 dark:bg-green-900/20 px-4 py-3 border-t border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">Output</span>
                      </div>
                      <code className="text-sm font-mono bg-green-100 dark:bg-green-800 px-2 py-1 rounded text-green-800 dark:text-green-200">
                        {"{{4.value}}"} → signature hex string
                      </code>
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Use this in your HTTP module headers as X-Webhook-Signature
                    </p>
                  </div>
                </div>

                {/* Pro Tips */}
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    Pro Tips for the Sign Module
                  </p>
                  <ul className="text-sm space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-500 mt-1">•</span>
                      <span><strong>Finding module references:</strong> Click the data field, then browse the module tree on the left to find "payload" under your Set Variable module</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-500 mt-1">•</span>
                      <span><strong>Module numbers:</strong> If your scenario layout is different, adjust the module number (e.g., {"{{3.payload}}"} if payload is in module 3)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-500 mt-1">•</span>
                      <span><strong>Testing:</strong> Run your scenario once and check the Sign module output - it should be a 64-character hex string</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Step 6 */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">6</div>
                <h3 className="text-lg font-semibold">Add "HTTP → Make a Request" Module</h3>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Final Step</Badge>
              </div>
              <div className="ml-11 space-y-4 text-muted-foreground">
                <p>• Search for <strong className="text-foreground">HTTP</strong> → <strong className="text-foreground">Make a request</strong></p>
                
                {/* Visual HTTP Module Guide */}
                <div className="border-2 border-blue-400 rounded-lg overflow-hidden">
                  <div className="bg-blue-400 px-4 py-2 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-900" />
                    <span className="font-semibold text-blue-900">HTTP - Make a request Module Configuration</span>
                  </div>
                  
                  <div className="bg-card p-4 space-y-4">
                    {/* URL Field */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        URL
                        <Badge variant="outline" className="text-[10px] font-normal">Required</Badge>
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted border rounded-md px-3 py-2 text-sm font-mono break-all">
                          {incomingWebhookUrl}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard(incomingWebhookUrl, "HTTP URL")}
                        >
                          {copied === "HTTP URL" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Your webhook endpoint URL</p>
                    </div>

                    {/* Method Field */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Method</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted border rounded-md px-3 py-2 text-sm font-mono">
                          POST
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard("POST", "HTTP Method")}
                        >
                          {copied === "HTTP Method" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Select "POST" from the dropdown</p>
                    </div>

                    {/* Headers Section */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        Headers
                        <Badge variant="outline" className="text-[10px] font-normal border-orange-500 text-orange-600">3 Required</Badge>
                      </label>
                      <p className="text-xs text-muted-foreground">Click "Add a header" button 3 times to add each header below:</p>
                      
                      <div className="space-y-3 pl-4 border-l-2 border-blue-300 dark:border-blue-700">
                        {/* Header 1: Content-Type */}
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-foreground">Header 1:</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <span className="text-xs text-muted-foreground">Name:</span>
                              <div className="flex items-center gap-1">
                                <div className="flex-1 bg-muted border rounded-md px-2 py-1.5 text-xs font-mono">
                                  Content-Type
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => copyToClipboard("Content-Type", "Header1Name")}
                                >
                                  {copied === "Header1Name" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-xs text-muted-foreground">Value:</span>
                              <div className="flex items-center gap-1">
                                <div className="flex-1 bg-muted border rounded-md px-2 py-1.5 text-xs font-mono">
                                  application/json
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => copyToClipboard("application/json", "Header1Value")}
                                >
                                  {copied === "Header1Value" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Header 2: X-Webhook-Timestamp */}
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-foreground">Header 2:</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <span className="text-xs text-muted-foreground">Name:</span>
                              <div className="flex items-center gap-1">
                                <div className="flex-1 bg-muted border rounded-md px-2 py-1.5 text-xs font-mono">
                                  X-Webhook-Timestamp
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => copyToClipboard("X-Webhook-Timestamp", "Header2Name")}
                                >
                                  {copied === "Header2Name" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-xs text-muted-foreground">Value:</span>
                              <div className="flex items-center gap-1">
                                <div className="flex-1 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-md px-2 py-1.5 text-xs font-mono">
                                  {"{{3.timestamp}}"}
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => copyToClipboard("{{3.timestamp}}", "Header2Value")}
                                >
                                  {copied === "Header2Value" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </Button>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">References the timestamp from Module 3 (Set Variable)</p>
                        </div>

                        {/* Header 3: X-Webhook-Signature */}
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-foreground">Header 3:</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <span className="text-xs text-muted-foreground">Name:</span>
                              <div className="flex items-center gap-1">
                                <div className="flex-1 bg-muted border rounded-md px-2 py-1.5 text-xs font-mono">
                                  X-Webhook-Signature
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => copyToClipboard("X-Webhook-Signature", "Header3Name")}
                                >
                                  {copied === "Header3Name" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-xs text-muted-foreground">Value:</span>
                              <div className="flex items-center gap-1">
                                <div className="flex-1 bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-md px-2 py-1.5 text-xs font-mono">
                                  {"{{4.value}}"}
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => copyToClipboard("{{4.value}}", "Header3Value")}
                                >
                                  {copied === "Header3Value" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </Button>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">References the signature from Module 4 (Encryptor Sign)</p>
                        </div>
                      </div>
                    </div>

                    {/* Body Type Field */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Body type</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted border rounded-md px-3 py-2 text-sm font-mono">
                          Raw
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard("Raw", "Body Type")}
                        >
                          {copied === "Body Type" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Select "Raw" from the dropdown</p>
                    </div>

                    {/* Content Type Field */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Content type</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted border rounded-md px-3 py-2 text-sm font-mono">
                          JSON (application/json)
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard("JSON (application/json)", "Content Type Select")}
                        >
                          {copied === "Content Type Select" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Select "JSON (application/json)" from the dropdown</p>
                    </div>

                    {/* Request Content Field */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        Request content
                        <Badge variant="outline" className="text-[10px] font-normal border-blue-500 text-blue-600">Module Reference</Badge>
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-md px-3 py-2 text-sm font-mono">
                          {"{{2.payload}}"}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard("{{2.payload}}", "Request Content")}
                        >
                          {copied === "Request Content" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        References the payload from Module 2. <strong>Must be the same payload used in the Sign module!</strong>
                      </p>
                    </div>

                    {/* Parse Response Field */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Parse response</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted border rounded-md px-3 py-2 text-sm font-mono">
                          Yes
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Enable this to easily access the JSON response from your webhook</p>
                    </div>
                  </div>

                  {/* Success Section */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-3 border-t border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Expected Response</span>
                      </div>
                      <code className="text-sm font-mono bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded text-blue-800 dark:text-blue-200">
                        Status: 200 OK
                      </code>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      If successful, you'll see: {"{"}"success": true, "message": "Webhook received and processed"{"}"}
                    </p>
                  </div>
                </div>

                {/* Pro Tips */}
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-500" />
                    Pro Tips for the HTTP Module
                  </p>
                  <ul className="text-sm space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span><strong>Module numbers matter:</strong> Adjust references if your modules are in different positions (e.g., {"{{5.value}}"} if Sign is module 5)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span><strong>Payload consistency:</strong> The Request content must use the exact same variable as the Sign module's Data field</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span><strong>Error debugging:</strong> If you get 401 errors, check the signature. If 400 errors, check the payload format</span>
                    </li>
                  </ul>
                </div>

                {/* Module Reference Summary */}
                <div className="p-4 rounded-lg border bg-muted/30">
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    Quick Reference: Module Mapping
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-2 rounded bg-muted">
                      <span className="text-muted-foreground block">Module 2</span>
                      <code className="font-mono">{"{{2.payload}}"}</code>
                    </div>
                    <div className="p-2 rounded bg-muted">
                      <span className="text-muted-foreground block">Module 3</span>
                      <code className="font-mono">{"{{3.timestamp}}"}</code>
                    </div>
                    <div className="p-2 rounded bg-muted">
                      <span className="text-muted-foreground block">Module 4</span>
                      <code className="font-mono">{"{{4.value}}"}</code>
                    </div>
                    <div className="p-2 rounded bg-blue-100 dark:bg-blue-900/30">
                      <span className="text-blue-600 dark:text-blue-400 block">Module 5</span>
                      <span className="font-mono text-blue-700 dark:text-blue-300">HTTP Request</span>
                    </div>
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
