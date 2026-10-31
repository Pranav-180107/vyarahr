-- Fix: Allow admins and superadmins to update the hired_by field on employee profiles
-- This is needed for Employee Management Portal's Swap Admin & Bulk Assign features

-- Drop any existing update policy that might be too restrictive
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual user to update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update employee profiles" ON public.profiles;

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow admins and superadmins to update any employee's hired_by field
-- This checks if the calling user has admin or superadmin role in profiles OR is in the known superadmin email list
CREATE POLICY "Admins can update employee profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  -- The row being updated is an employee
  role = 'employee'
  AND (
    -- The caller is a known super admin email
    (SELECT email FROM public.profiles WHERE id = auth.uid()) IN (
      'praveen12rangasamy@gmail.com',
      'pranavanandan18@gmail.com',
      'pranavananthan18@gmail.com',
      'jin@gmail.com',
      'superadmin@vyarahr.com',
      'superadmin@gmail.com'
    )
    OR
    -- The caller is an admin or superadmin by role
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
  )
)
WITH CHECK (
  role = 'employee'
  AND (
    (SELECT email FROM public.profiles WHERE id = auth.uid()) IN (
      'praveen12rangasamy@gmail.com',
      'pranavanandan18@gmail.com',
      'pranavananthan18@gmail.com',
      'jin@gmail.com',
      'superadmin@vyarahr.com',
      'superadmin@gmail.com'
    )
    OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
  )
);
