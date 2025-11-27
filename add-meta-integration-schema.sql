-- Meta API Integration Schema
-- Run this in Supabase SQL Editor to add Meta/Facebook/Instagram integration

-- 1. Add Meta credentials to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS meta_page_id TEXT,
ADD COLUMN IF NOT EXISTS meta_access_token TEXT,
ADD COLUMN IF NOT EXISTS instagram_account_id TEXT,
ADD COLUMN IF NOT EXISTS meta_token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS auto_post_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_post_to_facebook BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_post_to_instagram BOOLEAN DEFAULT true;

-- 2. Create table to track scheduled/posted content
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'scheduled', 'posted', 'failed')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  posted_at TIMESTAMP WITH TIME ZONE,
  meta_post_id TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_posts_post_id ON social_posts(post_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_client_id ON social_posts(client_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled_for ON social_posts(scheduled_for);

-- 4. Add function to update timestamp
CREATE OR REPLACE FUNCTION update_social_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger for updated_at
DROP TRIGGER IF EXISTS social_posts_updated_at ON social_posts;
CREATE TRIGGER social_posts_updated_at
  BEFORE UPDATE ON social_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_social_posts_updated_at();

-- 6. Enable RLS
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

-- 7. Create policy for social_posts
CREATE POLICY "Enable all access for social_posts" ON social_posts
  FOR ALL USING (true);

-- 8. Verify the setup
SELECT 'Meta Integration Schema Created Successfully!' as status;

-- View updated clients structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'clients'
  AND column_name LIKE '%meta%' OR column_name LIKE '%instagram%' OR column_name LIKE '%auto_post%'
ORDER BY ordinal_position;

-- View social_posts table
SELECT * FROM social_posts LIMIT 5;

COMMENT ON TABLE social_posts IS 'Tracks posts scheduled/posted to social media platforms';
COMMENT ON COLUMN clients.meta_page_id IS 'Facebook Page ID for posting';
COMMENT ON COLUMN clients.meta_access_token IS 'Facebook/Meta API access token';
COMMENT ON COLUMN clients.instagram_account_id IS 'Instagram Business Account ID';
COMMENT ON COLUMN clients.auto_post_enabled IS 'Enable auto-posting when status = Approved';
