-- Add structured brand fields for AI image generation
-- Run this in Supabase Dashboard → SQL Editor (one-time migration)

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS brand_colors JSONB DEFAULT '[]'::jsonb;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS brand_style_notes TEXT;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'clients'
  AND column_name IN ('brand_colors', 'brand_style_notes');
