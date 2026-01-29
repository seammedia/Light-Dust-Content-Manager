-- Add CWSA client with same PIN as Washco Express (shared access for Sal)
-- Run this in Supabase SQL Editor

-- STEP 1: Remove the unique constraint on PIN to allow shared PINs
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_pin_key;

-- STEP 2: Add CWSA client
INSERT INTO clients (name, pin, brand_name, brand_mission, brand_tone, brand_keywords, contact_name, contact_email)
VALUES (
  'CWSA',
  '4729',  -- Same PIN as Washco Express for shared access
  'CWSA',
  'Professional car wash services association',
  'Professional, industry-focused, informative',
  '["carwash", "industry", "association", "professional"]'::jsonb,
  'Sal',
  'sally@cwsa.com.au'
);

-- Update Washco Express contact info to match
UPDATE clients
SET contact_name = 'Sal',
    contact_email = 'sally@cwsa.com.au'
WHERE name = 'Washco Express';

-- Verify both clients now share PIN 4729
SELECT name, pin, contact_name, contact_email
FROM clients
WHERE pin = '4729';
