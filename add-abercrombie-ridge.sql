-- Add Abercrombie Ridge as a new client
-- Run this in Supabase SQL Editor

INSERT INTO clients (name, pin, brand_name, brand_mission, brand_tone, brand_keywords)
VALUES (
  'Abercrombie Ridge',
  '3847',
  'Abercrombie Ridge',
  'Premium vineyard and winery experience',
  'Elegant, Refined, Premium, Sophisticated',
  '["Wine", "Vineyard", "Premium Wines", "Wine Tasting", "Luxury"]'::jsonb
);

-- Verify all clients
SELECT name, pin, brand_name FROM clients ORDER BY name;
