-- Fix RLS Policies for Posts Table
-- Run this in Supabase SQL Editor if data is not saving

-- First, drop existing policy if it exists
DROP POLICY IF EXISTS "Enable all access for posts table" ON posts;

-- Disable RLS temporarily to test
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create a permissive policy that allows all operations
CREATE POLICY "Allow all access to posts" ON posts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'posts';
