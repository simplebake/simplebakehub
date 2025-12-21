import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Copy, Download, ExternalLink, Check, Shield, Zap, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const MakeSetupGuide = () => {
  const [copied, setCopied] = useState<string | null>(null);
  
  const incomingWebhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/incoming-webhook`;

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
            <Button onClick={downloadBlueprint} className="gap-2">
              <Download className="h-4 w-4" />
              Download Blueprint
            </Button>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => copyToClipboard(JSON.stringify(makeBlueprint, null, 2), "Blueprint JSON")}
            >
              {copied === "Blueprint JSON" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              Copy Configuration
            </Button>
            <Button variant="outline" asChild>
              <a href="https://www.make.com/en/login" target="_blank" rel="noopener noreferrer" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Open Make.com
              </a>
            </Button>
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

        {/* Step by Step Guide */}
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
