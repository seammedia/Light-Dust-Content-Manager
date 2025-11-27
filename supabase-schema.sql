-- Light Dust Content Manager - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor to create the necessary tables

-- Create the posts table
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft',
  image_description TEXT,
  image_url TEXT,
  generated_caption TEXT,
  generated_hashtags TEXT[], -- Array of strings
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create an index on the date column for faster sorting
CREATE INDEX IF NOT EXISTS posts_date_idx ON posts(date);

-- Create an index on the status column for filtering
CREATE INDEX IF NOT EXISTS posts_status_idx ON posts(status);

-- Enable Row Level Security (RLS)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for now
-- NOTE: For production, you should implement proper authentication and authorization
CREATE POLICY "Enable all access for posts table" ON posts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to call the function on updates
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data (optional - remove if you don't want sample data)
INSERT INTO posts (id, title, date, status, image_description, notes) VALUES
  ('sample-1', 'Gift Glowfully Box', '2023-10-25', 'For Approval', 'Pearl candle gift set with warm sunset lighting', 'Client loves the packaging shot.'),
  ('sample-2', 'Halloween Pumpkin', '2023-10-31', 'Draft', 'A carved Jack-o-lantern pumpkin used as a candle holder. Inside is white pearl wax with a burning wick. Dark, moody, spooky Halloween aesthetic.', 'Make sure to mention it''s scent-free for dining.'),
  ('sample-3', 'Dine by Candlelight', '2023-11-05', 'Draft', 'A beautiful dinner table setting with crystal glasses. A unique glass container filled with white pearl wax is the centerpiece. Warm, romantic lighting.', '')
ON CONFLICT (id) DO NOTHING;
