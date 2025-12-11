-- Add late_profile_ids column to clients table
-- This stores the IDs of Late social profiles assigned to each client
-- When scheduling posts, only the assigned profiles will be shown

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS late_profile_ids JSONB DEFAULT '[]'::jsonb;

-- Add a comment to document the column
COMMENT ON COLUMN clients.late_profile_ids IS 'Array of Late social profile IDs assigned to this client for scheduling posts';
