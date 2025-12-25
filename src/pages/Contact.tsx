import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/supabase";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Send, HelpCircle, Bug, Lightbulb, Loader2 } from "lucide-react";
import { z } from "zod";

// Patterns to detect potential malicious content
const dangerousPatterns = [
  /<script\b[^>]*>[\s\S]*?<\/script>/gi,
  /<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<\s*img[^>]+onerror/gi,
];

const sqlPatterns = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b.*\b(FROM|INTO|TABLE|DATABASE)\b)/gi,
  /(--)|(\/\*)/g,
  /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/gi,
];

const containsDangerousContent = (text: string): boolean => {
  return dangerousPatterns.some(pattern => pattern.test(text)) ||
         sqlPatterns.some(pattern => pattern.test(text));
};

const excessiveUrlPattern = /(https?:\/\/[^\s]+)/gi;
const hasExcessiveUrls = (text: string): boolean => {
  const matches = text.match(excessiveUrlPattern);
  return matches ? matches.length > 3 : false;
};

const sanitizeInput = (text: string): string => {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

const messageSchema = z.object({
  subject: z.string()
    .trim()
    .min(1, "Subject is required")
    .max(200, "Subject must be less than 200 characters")
    .refine(val => !containsDangerousContent(val), "Subject contains invalid content"),
  category: z.enum(["feedback", "help", "bug", "suggestion"], { required_error: "Please select a category" }),
  message: z.string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message must be less than 2000 characters")
    .refine(val => !containsDangerousContent(val), "Message contains invalid content")
    .refine(val => !hasExcessiveUrls(val), "Too many links detected"),
});

const categories = [
  { value: "feedback", label: "General Feedback", icon: MessageSquare },
  { value: "help", label: "Need Help", icon: HelpCircle },
  { value: "bug", label: "Report a Bug", icon: Bug },
  { value: "suggestion", label: "Suggestion", icon: Lightbulb },
];

const Contact = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    category: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = messageSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Sanitize inputs before storing
      const sanitizedSubject = sanitizeInput(result.data.subject);
      const sanitizedMessage = sanitizeInput(result.data.message);

      // Insert the message
      const { data: insertedMessage, error } = await supabase.from("customer_messages").insert({
        user_id: user?.id,
        subject: sanitizedSubject,
        category: result.data.category,
        message: sanitizedMessage,
        email: user?.email,
      }).select().single();

      if (error) throw error;

      // Notify moderators via edge function (fire and forget)
      supabase.functions.invoke('notify-moderators', {
        body: {
          type: 'new_message',
          data: {
            messageId: insertedMessage.id,
            subject: result.data.subject,
            category: result.data.category,
            message: result.data.message,
            email: user?.email,
          }
        }
      }).catch((notifyError) => {
        console.error('Failed to notify moderators:', notifyError);
      });

      toast({
        title: "Message sent!",
        description: "Thank you for reaching out. We'll get back to you soon.",
      });

      setFormData({ subject: "", category: "", message: "" });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Failed to send message",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">Get in Touch</h1>
          <p className="text-muted-foreground">
            We'd love to hear from you! Send us feedback, ask for help, or share your ideas.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Send us a Message
            </CardTitle>
            <CardDescription>
              Fill out the form below and we'll respond as soon as possible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category" className={errors.category ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <cat.icon className="h-4 w-4" />
                          {cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-destructive">{errors.category}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Brief summary of your message"
                  className={errors.subject ? "border-destructive" : ""}
                  maxLength={200}
                />
                {errors.subject && (
                  <p className="text-sm text-destructive">{errors.subject}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell us what's on your mind..."
                  rows={6}
                  className={errors.message ? "border-destructive" : ""}
                  maxLength={2000}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  {errors.message ? (
                    <p className="text-destructive">{errors.message}</p>
                  ) : (
                    <span>Minimum 10 characters</span>
                  )}
                  <span>{formData.message.length}/2000</span>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {!user && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <a href="/auth" className="text-primary hover:underline">Sign in</a> to track your messages and get faster responses.
          </p>
        )}
      </main>
    </div>
  );
};

export default Contact;
