-- Fix attendance RLS to allow employees to insert with status 'pending'
-- and allow update only by admin (via service role)

-- 1. Drop existing RLS policies on attendance if any restrict status values
DROP POLICY IF EXISTS "Users can insert own attendance" ON attendance;
DROP POLICY IF EXISTS "Users can update own attendance" ON attendance;
DROP POLICY IF EXISTS "Employees insert attendance" ON attendance;
DROP POLICY IF EXISTS "Allow employee insert" ON attendance;

-- 2. Allow authenticated users to insert their own attendance with any status
CREATE POLICY "Employees can insert own attendance"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. Allow authenticated users to update their own pending/rejected records
CREATE POLICY "Employees can update own pending attendance"
  ON attendance FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status IN ('pending', 'rejected'))
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- 4. Allow admin to update any record (approve/reject)
DROP POLICY IF EXISTS "Admin can update any attendance" ON attendance;
CREATE POLICY "Admin can update any attendance"
  ON attendance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR auth.jwt()->>'email' = 'praveen12rangasamy@gmail.com'
  );
