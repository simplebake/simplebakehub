-- Add DELETE policies for user data privacy (GDPR compliance)

-- Allow users to delete their own baking sessions
CREATE POLICY "Users can delete their own baking sessions"
ON public.baking_sessions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to delete their own preferences
CREATE POLICY "Users can delete their own preferences"
ON public.user_preferences
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to delete their own messages (within their conversations)
CREATE POLICY "Users can delete their own messages"
ON public.messages
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM conversations
  WHERE conversations.id = messages.conversation_id
  AND conversations.user_id = auth.uid()
));