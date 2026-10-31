-- Allow authenticated users to upsert (insert or update) their own profile row.
-- The onConflict:'email' upsert in AuthContext needs UPDATE permission on the matching email row.
-- This policy covers the case where auth.uid() differs from the stored profile id (ID resync).

-- Allow users to insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to update the row that matches their email (for ID resync via onConflict:'email')
DROP POLICY IF EXISTS "Users can update profile by email match" ON public.profiles;
CREATE POLICY "Users can update profile by email match"
ON public.profiles
FOR UPDATE
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
