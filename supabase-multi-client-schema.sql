-- Multi-Client Content Manager Schema
-- This migration adds multi-tenancy support

-- 1. Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  pin TEXT NOT NULL UNIQUE,
  brand_name TEXT NOT NULL,
  brand_mission TEXT,
  brand_tone TEXT,
  brand_keywords JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add client_id to posts table
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- 3. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_posts_client_id ON posts(client_id);

-- 4. Insert default clients
-- Master account (Seam Media - can see all clients)
INSERT INTO clients (name, pin, brand_name, brand_mission, brand_tone, brand_keywords)
VALUES (
  'Seam Media',
  '1991',
  'Seam Media',
  'Content Management Agency',
  'Professional, Creative, Efficient',
  '["Content Management", "Social Media", "Marketing"]'::jsonb
) ON CONFLICT (pin) DO NOTHING;

-- Light Dust client
INSERT INTO clients (name, pin, brand_name, brand_mission, brand_tone, brand_keywords)
VALUES (
  'Light Dust',
  '5678',
  'Light Dust',
  'Transforming any container into a sustainable candle using innovative pearl wax.',
  'Cozy, Smart, Sustainable, Aesthetic, Warm, Inviting',
  '["Pearl Candle", "Sustainable Home", "DIY Candle", "Eco Friendly", "Home Decor", "Candle Lover"]'::jsonb
) ON CONFLICT (pin) DO NOTHING;

-- 5. Migrate existing posts to Light Dust client
-- Find Light Dust client ID and assign all existing posts to it
UPDATE posts
SET client_id = (SELECT id FROM clients WHERE pin = '5678')
WHERE client_id IS NULL;

-- 6. Make client_id required for future posts
ALTER TABLE posts
ALTER COLUMN client_id SET NOT NULL;

-- 7. Add Row Level Security (RLS) for additional security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for now (we'll handle auth in the app)
CREATE POLICY "Enable all access for clients" ON clients
  FOR ALL USING (true);

CREATE POLICY "Enable all access for posts" ON posts
  FOR ALL USING (true);

COMMENT ON TABLE clients IS 'Stores client/brand information for multi-tenancy';
COMMENT ON COLUMN posts.client_id IS 'References the client that owns this post';
