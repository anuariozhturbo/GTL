-- Run this in your Supabase SQL Editor:
-- https://app.supabase.com → your project → SQL Editor → New query

-- 1. Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT    NOT NULL DEFAULT 'FIGHTER',
  wins         INTEGER NOT NULL DEFAULT 0,
  losses       INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Row Level Security — each user owns their own row
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 3. Auto-create profile on sign-up
--    Display name defaults to the part of the email before @
CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    UPPER(SPLIT_PART(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.on_auth_user_created();

-- 4. Atomic stat increment (no race conditions)
CREATE OR REPLACE FUNCTION public.increment_user_stat(uid UUID, stat_name TEXT)
RETURNS VOID AS $$
BEGIN
  IF stat_name = 'wins' THEN
    UPDATE public.profiles
    SET wins = wins + 1, updated_at = NOW()
    WHERE id = uid;
  ELSIF stat_name = 'losses' THEN
    UPDATE public.profiles
    SET losses = losses + 1, updated_at = NOW()
    WHERE id = uid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.increment_user_stat(UUID, TEXT) TO authenticated;

-- Optional: disable email confirmation so players can sign in immediately
-- Go to: Authentication → Providers → Email → toggle off "Confirm email"
