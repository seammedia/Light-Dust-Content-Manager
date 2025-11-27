-- Verify and Fix Client Setup
-- Run this entire script in Supabase SQL Editor

-- 1. First, check what clients currently exist
SELECT 'Current Clients:' as info;
SELECT id, name, pin, brand_name, created_at FROM clients ORDER BY name;

-- 2. Check if Abercrombie Ridge exists
SELECT 'Checking for Abercrombie Ridge:' as info;
SELECT * FROM clients WHERE name = 'Abercrombie Ridge';

-- 3. If Abercrombie Ridge doesn't exist, add it
-- (This will fail silently if PIN already exists)
INSERT INTO clients (name, pin, brand_name, brand_mission, brand_tone, brand_keywords)
VALUES (
  'Abercrombie Ridge',
  '3847',
  'Abercrombie Ridge',
  'Premium vineyard and winery experience',
  'Elegant, Refined, Premium, Sophisticated',
  '["Wine", "Vineyard", "Premium Wines", "Wine Tasting", "Luxury"]'::jsonb
)
ON CONFLICT (pin) DO NOTHING;

-- 4. Verify all three clients now exist
SELECT 'Final Client List:' as info;
SELECT id, name, pin, brand_name FROM clients ORDER BY
  CASE
    WHEN pin = '1991' THEN 1  -- Seam Media first
    ELSE 2
  END,
  name;

-- 5. Count posts per client
SELECT 'Posts per client:' as info;
SELECT c.name, COUNT(p.id) as post_count
FROM clients c
LEFT JOIN posts p ON p.client_id = c.id
GROUP BY c.name
ORDER BY c.name;

-- Expected Result:
-- You should see 3 clients:
-- - Seam Media (PIN: 1991)
-- - Light Dust (PIN: 5678)
-- - Abercrombie Ridge (PIN: 3847)
