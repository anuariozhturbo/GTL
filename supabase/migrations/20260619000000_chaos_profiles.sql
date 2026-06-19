-- Chaos Construct: player profiles + match stats

CREATE TABLE IF NOT EXISTS public.profiles (
  id             UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name   TEXT    NOT NULL DEFAULT 'FIGHTER',
  wins           INTEGER NOT NULL DEFAULT 0,
  losses         INTEGER NOT NULL DEFAULT 0,
  unlocked_chars TEXT[]  NOT NULL DEFAULT ARRAY['ash', 'merrs'],
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='select_own') THEN
    CREATE POLICY "select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='insert_own') THEN
    CREATE POLICY "insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='update_own') THEN
    CREATE POLICY "update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, UPPER(SPLIT_PART(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.on_auth_user_created();

CREATE OR REPLACE FUNCTION public.increment_user_stat(uid UUID, stat_name TEXT)
RETURNS VOID AS $$
BEGIN
  IF stat_name = 'wins' THEN
    UPDATE public.profiles SET wins = wins + 1, updated_at = NOW() WHERE id = uid;
  ELSIF stat_name = 'losses' THEN
    UPDATE public.profiles SET losses = losses + 1, updated_at = NOW() WHERE id = uid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.increment_user_stat(UUID, TEXT) TO authenticated;

-- Unlock a character for a player (idempotent)
CREATE OR REPLACE FUNCTION public.unlock_character(uid UUID, char_key TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET unlocked_chars = array_append(unlocked_chars, char_key),
      updated_at = NOW()
  WHERE id = uid AND NOT (char_key = ANY(unlocked_chars));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.unlock_character(UUID, TEXT) TO authenticated;
