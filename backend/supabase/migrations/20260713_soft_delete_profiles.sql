-- Migration: Handle Auth User Deletion (Soft Delete Profiles)
-- This ensures that when a user is deleted from auth.users, their public.profiles row is kept
-- and set to 'inactive' to preserve their tax declarations, payroll history, and employment terms.

-- 1. Drop the foreign key cascade constraint on profiles if it exists
-- (This prevents the profile from being deleted when the Auth user is deleted)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 1.5. Update the profiles_role_check constraint to allow 'inactive'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('superadmin', 'admin', 'employee', 'inactive'));

-- 2. Create a trigger function to handle future Auth user deletions
CREATE OR REPLACE FUNCTION public.handle_deleted_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Change the deleted user's profile role to 'inactive' to hide them from lists
  -- while keeping the profile row itself so foreign keys are not broken
  UPDATE public.profiles
  SET role = 'inactive'
  WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

-- Drop the trigger if it already exists
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- 3. Attach the trigger to run BEFORE a user is deleted from auth.users
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_user();
