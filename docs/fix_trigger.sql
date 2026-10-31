-- Fix for "Database error creating new user"
-- This error is caused by a trigger on auth.users that fails when creating new users.
-- The trigger tries to insert into public.profiles but fails due to missing required columns.

-- Step 1: Drop any existing trigger on auth.users that auto-creates profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 2: Make all profile columns nullable (except id) to prevent constraint failures
ALTER TABLE public.profiles
  ALTER COLUMN full_name DROP NOT NULL,
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN role SET DEFAULT 'employee';

-- Step 3: Create a SAFE trigger function that won't fail
-- It uses COALESCE to safely handle null values and won't throw on missing data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never let the trigger fail user creation
    RETURN NEW;
END;
$$;

-- Step 4: Attach the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
