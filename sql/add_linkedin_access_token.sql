-- ═══════════════════════════════════════════════════════════════════════════
--  Add linkedin_access_token column to profiles table
--  The token-exchange n8n webhook stores the active token here so the
--  frontend can read it and pass it to the trigger webhook.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS linkedin_access_token TEXT;

UPDATE public.profiles
SET linkedin_access_token = NULL
WHERE linkedin_access_token IS NULL;
