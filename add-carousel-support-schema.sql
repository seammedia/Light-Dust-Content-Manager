-- Carousel Support Schema Migration
-- Adds support for multiple images per post (carousel posts)
-- Run this in Supabase SQL Editor

-- 1. Add image_urls column to store array of image URLs
-- This will coexist with image_url for backward compatibility
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- 2. Migrate existing single images to the new array column
-- Only migrate if image_url is not null and image_urls is empty
UPDATE posts
SET image_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL
  AND image_url != ''
  AND (image_urls IS NULL OR array_length(image_urls, 1) IS NULL);

-- 3. Create index for faster queries on image_urls
CREATE INDEX IF NOT EXISTS idx_posts_image_urls ON posts USING GIN (image_urls);

-- 4. Add comment explaining the column
COMMENT ON COLUMN posts.image_urls IS 'Array of image URLs for carousel posts. First image is the primary/cover image.';

-- Verification: Check the migration worked
-- SELECT id, image_url, image_urls FROM posts LIMIT 10;
