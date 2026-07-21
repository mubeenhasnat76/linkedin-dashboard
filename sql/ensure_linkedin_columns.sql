-- Ensure all LinkedIn OAuth columns exist on public.profiles
-- Safe to run multiple times (IF NOT EXISTS)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS linkedin_connected       BOOLEAN          NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS linkedin_access_token     TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS linkedin_profile_id      TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_name            TEXT;
