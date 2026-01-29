-- Add Efficient Finance client
-- Run this in Supabase SQL Editor

INSERT INTO clients (name, pin, brand_name, brand_mission, brand_tone, brand_keywords, contact_name, contact_email)
VALUES (
  'Efficient Finance',
  '3816',
  'Efficient Finance',
  '',
  '',
  '[]'::jsonb,
  'Monique',
  'monique@efficientfinance.com.au'
);

-- Verify the client was added
SELECT id, name, pin, brand_name, contact_name, contact_email
FROM clients
WHERE name = 'Efficient Finance';
