-- Add notes tracking for email notifications
-- Run this SQL in your Supabase SQL Editor

-- 1. Add column to track when notes were last updated
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS notes_updated_at TIMESTAMP WITH TIME ZONE;

-- 2. Add column to track if notification was sent for this note update
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS notes_notified BOOLEAN DEFAULT FALSE;

-- 3. Create trigger to automatically update notes_updated_at when notes change
CREATE OR REPLACE FUNCTION update_notes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if notes actually changed (and isn't null -> null)
  IF (OLD.notes IS DISTINCT FROM NEW.notes) AND (NEW.notes IS NOT NULL AND NEW.notes != '') THEN
    NEW.notes_updated_at = NOW();
    NEW.notes_notified = FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger on posts table
DROP TRIGGER IF EXISTS track_notes_update ON posts;
CREATE TRIGGER track_notes_update
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_notes_timestamp();

-- 5. Create index for efficient querying of unnotified notes
CREATE INDEX IF NOT EXISTS idx_posts_notes_notified
ON posts(notes_notified, notes_updated_at)
WHERE notes_notified = FALSE AND notes IS NOT NULL;

COMMENT ON COLUMN posts.notes_updated_at IS 'Timestamp of when notes were last modified';
COMMENT ON COLUMN posts.notes_notified IS 'Whether an email notification has been sent for this note update';
