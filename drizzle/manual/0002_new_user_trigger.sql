-- Give every new auth user a profile row.
--
-- Doing this in a trigger rather than in application code means a profile
-- exists no matter how the user arrived — email signup, Google OAuth, or a
-- user created by hand in the Supabase dashboard. `country IS NULL` on that
-- row is what the callback route reads to decide whether to send someone to
-- onboarding.

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, plan)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name', 'free')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Take this function off the public API.
--
-- Postgres grants EXECUTE on a new function to PUBLIC by default, and anything
-- executable in the `public` schema is published by PostgREST — so this was
-- reachable as POST /rest/v1/rpc/handle_new_user by `anon`, with no session at
-- all. It is SECURITY DEFINER, meaning a caller would run it as the owner,
-- which is precisely the combination Supabase's linter flags
-- (`anon_security_definer_function_executable`).
--
-- A direct call happens to fail — a function returning `trigger` cannot be
-- invoked as a plain function — so this closed no known hole. It is fixed
-- anyway: an internal trigger helper should not be part of the API surface,
-- and the next edit to its return type should not be what decides whether it
-- is.
--
-- Revoking from PUBLIC is what removes `anon` and `authenticated`; the two
-- roles that must keep it are named explicitly. Signup runs as
-- `supabase_auth_admin`, which is what inserts into auth.users and therefore
-- what fires the trigger, so revoking the default grant does not touch the
-- signup path.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- Postgres checks EXECUTE on a trigger function when the trigger is created,
-- not each time it fires, so the revoke above does not stop the trigger. These
-- grants are belt and braces for the roles that do the inserting: GoTrue
-- connects as `supabase_auth_admin`, and a user created by hand in SQL arrives
-- as `postgres`. Both roles exist on every Supabase project — this file
-- already triggers on `auth.users`, so it is Supabase-specific either way.
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
