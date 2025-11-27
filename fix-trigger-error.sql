-- Fix the trigger error by dropping it
-- The trigger is trying to update updated_at column which doesn't exist

-- Drop the trigger
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;

-- Drop the function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Verify triggers are gone
SELECT tgname FROM pg_trigger WHERE tgrelid = 'posts'::regclass;
