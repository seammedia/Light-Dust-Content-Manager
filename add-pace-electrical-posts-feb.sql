-- Add 3 new posts for Pace Electrical (February 2026)
-- Run this in Supabase SQL Editor

-- First, get the client_id for Pace Electrical
DO $$
DECLARE
  pace_client_id UUID;
BEGIN
  SELECT id INTO pace_client_id FROM clients WHERE name = 'Pace Electrical';

  IF pace_client_id IS NULL THEN
    RAISE EXCEPTION 'Pace Electrical client not found. Please add the client first.';
  END IF;

  -- Post 1: 2nd February 2026 - Switchboard Upgrades
  INSERT INTO posts (id, client_id, title, date, status, image_description, generated_caption, generated_hashtags, notes)
  VALUES (
    'pace-post-2026-02-02',
    pace_client_id,
    'Switchboard Upgrade',
    '2026-02-02',
    'Draft',
    'Modern electrical switchboard with safety switches',
    'An outdated switchboard isn''t just inconvenient, it can be a serious safety hazard. Old fuses, missing safety switches and overloaded circuits put your home and family at risk.

Pace Electrical provides professional switchboard upgrades with over 25 years of industry experience. We ensure your electrical system meets current safety standards and can handle the demands of modern living.

📞 Phone 1300 070 569',
    ARRAY['switchboardupgrade', 'electricalsafety', 'electrician', 'paceservices', 'licensedtrades'],
    ''
  );

  -- Post 2: 5th February 2026 - Smoke Alarm Installation
  INSERT INTO posts (id, client_id, title, date, status, image_description, generated_caption, generated_hashtags, notes)
  VALUES (
    'pace-post-2026-02-05',
    pace_client_id,
    'Smoke Alarm Installation',
    '2026-02-05',
    'Draft',
    'Smoke alarm being installed on ceiling',
    'Smoke alarms save lives, but only when they''re installed correctly and working properly. Australian regulations require interconnected smoke alarms in all homes, and staying compliant is essential.

Pace Electrical installs, tests and maintains smoke alarm systems to keep your family safe. With over 25 years of experience, we ensure your home meets all current safety requirements.',
    ARRAY['smokealarms', 'homesafety', 'electrician', 'paceservices', 'licensedelectrician'],
    ''
  );

  -- Post 3: 9th February 2026 - Ceiling Fan Installation
  INSERT INTO posts (id, client_id, title, date, status, image_description, generated_caption, generated_hashtags, notes)
  VALUES (
    'pace-post-2026-02-09',
    pace_client_id,
    'Ceiling Fan Installation',
    '2026-02-09',
    'Draft',
    'Modern ceiling fan installed in living room',
    'A ceiling fan is one of the most energy-efficient ways to keep your home comfortable year-round. But improper installation can lead to wobbling, noise, or worse, electrical hazards.

Pace Electrical handles ceiling fan installations with precision and care. From wiring to mounting, our licensed technicians ensure a safe, secure and balanced installation every time.

📞 Phone 1300 070 569',
    ARRAY['ceilingfan', 'faninstallation', 'electrician', 'paceservices', 'licensedtrades'],
    ''
  );

END $$;

-- Verify the posts were added
SELECT id, title, date, status, generated_caption, generated_hashtags
FROM posts
WHERE date IN ('2026-02-02', '2026-02-05', '2026-02-09')
ORDER BY date;
