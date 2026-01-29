-- Add Pace Electrical client
-- Run this in Supabase SQL Editor

INSERT INTO clients (name, pin, brand_name, brand_mission, brand_tone, brand_keywords, contact_name, contact_email)
VALUES (
  'Pace Electrical',
  '7834',
  'Pace Electrical',
  'Providing reliable and professional electrical services',
  'Professional, Friendly, Reliable',
  '["Electrical Services", "Electrician", "Pace Services"]'::jsonb,
  'Paul',
  'service@paceservices.com.au'
);

-- Verify the client was added
SELECT id, name, pin, brand_name, contact_name, contact_email
FROM clients
WHERE name = 'Pace Electrical';
