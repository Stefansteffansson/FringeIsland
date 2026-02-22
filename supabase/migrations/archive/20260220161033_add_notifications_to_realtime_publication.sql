-- Add notifications table to Realtime publication
-- This was flagged as a manual step in the original migration but was never done.
-- Without this, Supabase Realtime rejects postgres_changes subscriptions on
-- the notifications table, causing CHANNEL_ERROR in NotificationProvider.

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
