import { useState } from "react";
import { Header } from "@/components/Header";
import { InfoCallout } from "@/components/InfoCallout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { Bot, Send, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const StarterAI = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("starter-ai", {
        body: { messages: newMessages.map((m) => ({ role: m.role, content: m.content })) },
      });
      if (error) throw error;
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to get response", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" /> Starter AI Assistant
          </h1>
          <p className="text-muted-foreground">Ask questions about your gluten-free sourdough starter, troubleshoot issues, or get feeding advice.</p>
        </div>

        {!user && (
          <InfoCallout variant="info" title="Sign in recommended">
            Sign in to save your conversation history.
          </InfoCallout>
        )}

        <Card className="flex flex-col" style={{ minHeight: "400px" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Chat</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px]">
              {messages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Bot className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>Ask me anything about sourdough starters!</p>
                  <p className="text-xs mt-1">e.g. "My starter hasn't risen in 3 days, what should I do?"</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question…"
                className="min-h-[60px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <Button onClick={sendMessage} disabled={loading || !input.trim()} className="shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default StarterAI;
