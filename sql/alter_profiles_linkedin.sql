-- Add LinkedIn OAuth columns to public.profiles
-- Each column is added conditionally to prevent errors on re-run

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS linkedin_connected       BOOLEAN          NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS linkedin_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS linkedin_profile_id      TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_name            TEXT;
