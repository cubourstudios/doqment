-- Give every new auth user a profile row.
--
-- Doing this in a trigger rather than in application code means a profile
-- exists no matter how the user arrived — email signup, Google OAuth, or a
-- user created by hand in the Supabase dashboard. `country IS NULL` on that
-- row is what the callback route reads to decide whether to send someone to
-- onboarding.

CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, plan)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name', 'free')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
