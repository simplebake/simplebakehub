import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_MESSAGE_LENGTH = 4000;
const MAX_CONVERSATION_HISTORY = 50;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validate request body
    if (!body || typeof body !== 'object') {
      throw new Error('Invalid request body');
    }

    const { conversationId, message } = body;

    // Validate message
    if (!message || typeof message !== 'string') {
      throw new Error('Message is required and must be a string');
    }

    if (message.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message must not exceed ${MAX_MESSAGE_LENGTH} characters`);
    }

    // Validate conversationId if provided
    if (conversationId !== undefined && conversationId !== null) {
      if (typeof conversationId !== 'string') {
        throw new Error('Conversation ID must be a string');
      }
      // Basic UUID validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(conversationId)) {
        throw new Error('Invalid conversation ID format');
      }
    }
    
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { Authorization: authHeader } 
        }
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get or create conversation
    let currentConversationId = conversationId;
    if (!currentConversationId) {
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, title: message.slice(0, 50) })
        .select()
        .single();
      
      if (convError) throw convError;
      currentConversationId = newConv.id;
    }

    // Save user message
    await supabase.from('messages').insert({
      conversation_id: currentConversationId,
      role: 'user',
      content: message
    });

    // Get conversation history with limit
    const { data: history, error: historyError } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', currentConversationId)
      .order('created_at', { ascending: true })
      .limit(MAX_CONVERSATION_HISTORY);

    if (historyError) throw historyError;

    // Get user profile and preferences
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, country')
      .eq('id', user.id)
      .single();

    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('preferences')
      .eq('user_id', user.id)
      .single();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build personalized system prompt
    const userName = profile?.name || 'there';
    const userContext = profile?.country ? ` from ${profile.country}` : '';
    const userPreferences = prefs?.preferences || {};
    
    let systemPrompt = `You are a helpful personal AI assistant for ${userName}${userContext}. `;
    systemPrompt += 'Be friendly, remember context from the conversation, and provide personalized assistance. ';
    
    if (Object.keys(userPreferences).length > 0) {
      systemPrompt += `User preferences: ${JSON.stringify(userPreferences)}. `;
    }
    
    systemPrompt += 'Keep your answers clear and helpful.';

    console.log('Processing personalized chat for user:', user.id);

    // Call Lovable AI Gateway with streaming
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...history
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { 
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { 
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      throw new Error('AI Gateway request failed');
    }

    // Read the stream and save assistant response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let assistantMessage = '';
    
    if (reader) {
      const stream = new ReadableStream({
        async start(controller) {
          let buffer = '';
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              buffer += chunk;
              
              // Forward chunk to client
              controller.enqueue(value);

              // Parse SSE to collect message
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (!line.trim() || line.startsWith(':')) continue;
                if (!line.startsWith('data: ')) continue;

                const data = line.slice(6).trim();
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) assistantMessage += content;
                } catch (e) {
                  console.error('Parse error:', e);
                }
              }
            }

            // Save assistant message to database
            if (assistantMessage) {
              await supabase.from('messages').insert({
                conversation_id: currentConversationId,
                role: 'assistant',
                content: assistantMessage
              });
            }

            controller.close();
          } catch (error) {
            controller.error(error);
          }
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Conversation-Id': currentConversationId,
        },
      });
    }

    throw new Error('No response stream available');

  } catch (error) {
    console.error('Chat error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
