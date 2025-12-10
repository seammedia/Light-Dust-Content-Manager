-- Add Video Support Schema Migration
-- Run this in Supabase SQL Editor

-- 1. Add media type column to posts table
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video'));

-- 2. Add comment for documentation
COMMENT ON COLUMN posts.media_type IS 'Type of media attached to the post: image or video';

-- 3. Update existing posts to have media_type = image (if they have an image_url)
UPDATE posts
SET media_type = 'image'
WHERE image_url IS NOT NULL AND image_url != '' AND media_type IS NULL;

-- 4. Verify the migration
SELECT 'Migration complete. Posts by media type:' as info;
SELECT media_type, COUNT(*) as count
FROM posts
GROUP BY media_type;
