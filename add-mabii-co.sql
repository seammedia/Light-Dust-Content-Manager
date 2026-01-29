-- Add Mabii Co client
-- Run this in Supabase SQL Editor

INSERT INTO clients (name, pin, brand_name, brand_mission, brand_tone, brand_keywords, contact_name, contact_email)
VALUES (
  'Mabii Co',
  '4927',
  'Mabii Co',
  '',
  '',
  '[]'::jsonb,
  'Steph',
  'stephross28@yahoo.com.au'
);

-- Verify the client was added
SELECT id, name, pin, brand_name, contact_name, contact_email
FROM clients
WHERE name = 'Mabii Co';
