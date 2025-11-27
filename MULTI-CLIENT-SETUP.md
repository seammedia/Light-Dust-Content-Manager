# Multi-Client Setup Instructions

## Overview
This content manager now supports multiple clients with isolated data access. Each client has their own PIN and can only see their own posts.

## Database Setup

### Step 1: Run the SQL Migration

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Copy the contents of `supabase-multi-client-schema.sql`
4. Paste and run the SQL script

This will:
- Create the `clients` table
- Add `client_id` column to `posts` table
- Insert default clients (Seam Media master account + Light Dust)
- Migrate existing posts to Light Dust
- Set up Row Level Security

### Step 2: Verify the Migration

Run this query to check your clients:
```sql
SELECT * FROM clients;
```

You should see:
- **Seam Media** (PIN: 1991) - Master account
- **Light Dust** (PIN: 5678) - Client account

### Step 3: Test Login

**Master Account (Seam Media):**
- PIN: `1991`
- Access: Can see all clients and switch between them
- Shows client selector after login

**Client Account (Light Dust):**
- PIN: `5678`
- Access: Only sees Light Dust posts
- Goes directly to content manager

## Adding New Clients

To add a new client, run this SQL in Supabase:

```sql
INSERT INTO clients (name, pin, brand_name, brand_mission, brand_tone, brand_keywords)
VALUES (
  'Client Name',           -- Display name
  '1234',                  -- Unique PIN (4 digits)
  'Brand Name',            -- Brand name for content
  'Brand mission statement',
  'Brand tone descriptors',
  '["keyword1", "keyword2"]'::jsonb  -- Brand keywords as JSON array
);
```

### Example: Adding "Green Candle Co"
```sql
INSERT INTO clients (name, pin, brand_name, brand_mission, brand_tone, brand_keywords)
VALUES (
  'Green Candle Co',
  '4567',
  'Green Candle Co',
  'Eco-friendly candles for sustainable living',
  'Fresh, Natural, Eco-conscious',
  '["Eco Candles", "Sustainable Living", "Natural Wax"]'::jsonb
);
```

## How It Works

### User Flow:

1. **Enter PIN**
2. **If PIN = 1991** (Master):
   - Show list of all clients
   - Select a client to manage
   - Can switch between clients
3. **If PIN = client PIN**:
   - Log directly into that client
   - See only that client's posts
   - Cannot see other clients

### Data Isolation:

- All posts are filtered by `client_id`
- Clients cannot access each other's data
- Master account can switch between clients
- Brand context is dynamic per client

### Security:

- Row Level Security (RLS) enabled
- Client data isolated by `client_id`
- PINs stored in database
- No cross-client data leakage

## Troubleshooting

### "Database connection failed"
- Check Supabase environment variables in Vercel
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### "No posts showing after migration"
- Run: `SELECT * FROM posts WHERE client_id IS NULL;`
- If any posts have null client_id, assign them:
  ```sql
  UPDATE posts
  SET client_id = (SELECT id FROM clients WHERE name = 'Light Dust')
  WHERE client_id IS NULL;
  ```

### "Can't add new posts"
- Ensure `client_id` is not null in posts table
- Check that `client_id` foreign key constraint exists

## Managing Clients

### View all clients:
```sql
SELECT id, name, pin, brand_name FROM clients;
```

### Change a client's PIN:
```sql
UPDATE clients
SET pin = 'new_pin'
WHERE name = 'Client Name';
```

### Delete a client (and all their posts):
```sql
DELETE FROM clients WHERE name = 'Client Name';
-- This cascades and deletes all posts for that client
```

### Count posts per client:
```sql
SELECT c.name, COUNT(p.id) as post_count
FROM clients c
LEFT JOIN posts p ON p.client_id = c.id
GROUP BY c.name;
```

## Features

✅ Multi-client support
✅ Isolated data per client
✅ Master account with client switcher
✅ Dynamic brand context
✅ Secure PIN-based authentication
✅ Easy client onboarding
✅ Scalable architecture

## Next Steps

Consider adding:
- Email notifications per client
- Custom branding per client
- Usage analytics per client
- Social media API integration per client
- Client-specific templates
