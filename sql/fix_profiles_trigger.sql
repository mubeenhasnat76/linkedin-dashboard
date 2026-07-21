-- ═══════════════════════════════════════════════════════════════════════════
--  Fix: Create profiles table + handle_new_user() trigger + RLS policies
--  Run this in your Supabase SQL Editor to resolve the 500 error on signup.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Create public.profiles if it doesn't exist at all
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Add ALL needed columns — works whether table was just created or already existed
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email               TEXT,
  ADD COLUMN IF NOT EXISTS full_name           TEXT,
  ADD COLUMN IF NOT EXISTS organization_name   TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url          TEXT,
  ADD COLUMN IF NOT EXISTS created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS linkedin_connected       BOOLEAN          NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS linkedin_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS linkedin_profile_id      TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_name            TEXT;

-- 3. Create or replace the trigger function
--    Extracts full_name & organization_name from auth.users.raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, organization_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'organization_name'
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 4. Drop existing trigger (if any) then create it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Enable Row-Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies — drop existing to avoid conflicts, then recreate
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 7. Backfill profiles for existing users who signed up before the trigger existed
INSERT INTO public.profiles (id, email, full_name, organization_name)
SELECT
  id,
  email,
  raw_user_meta_data ->> 'full_name',
  raw_user_meta_data ->> 'organization_name'
FROM auth.users
ON CONFLICT (id) DO NOTHING;
