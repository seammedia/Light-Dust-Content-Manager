-- Add late_post_id column to posts table for tracking Late API scheduled posts
-- This allows us to update/reschedule posts after they've been scheduled

ALTER TABLE posts ADD COLUMN IF NOT EXISTS late_post_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_posts_late_post_id ON posts(late_post_id);

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'posts' AND column_name = 'late_post_id';
