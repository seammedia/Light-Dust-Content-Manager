-- Update contact names for all clients
-- Run this in Supabase SQL Editor

-- Washco Express - Sal
UPDATE clients
SET contact_name = 'Sal'
WHERE name = 'Washco Express';

-- Mediterranean Blu Spritz - Astrid
UPDATE clients
SET contact_name = 'Astrid'
WHERE name = 'Mediterranean Blu Spritz';

-- Abercrombie Ridge - Russ
UPDATE clients
SET contact_name = 'Russ'
WHERE name = 'Abercrombie Ridge';

-- BLVD Drinks - Mark (already set, but ensure it's correct)
UPDATE clients
SET contact_name = 'Mark'
WHERE name = 'BLVD Drinks';

-- Light Dust - Mitch (already set, but ensure it's correct)
UPDATE clients
SET contact_name = 'Mitch'
WHERE name = 'Light Dust';

-- Verify the updates
SELECT name, contact_name FROM clients ORDER BY name;
