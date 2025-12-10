# Client Access PINs

## ⚠️ IMPORTANT: Database Setup Required

Before these PINs will work, you MUST run the SQL migration in Supabase!

### Steps:
1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy and paste `verify-and-fix-clients.sql`
3. Run the entire script
4. Verify all 3 clients appear in the output

---

## Master Account
**Seam Media**
- PIN: `1991`
- Access: All clients
- Can switch between any client

---

## Client Accounts

### Light Dust
- PIN: `5678`
- Access: Light Dust content only
- Brand: Sustainable candles using pearl wax

### Abercrombie Ridge
- PIN: `3847`
- Access: Abercrombie Ridge content only
- Brand: Premium vineyard and winery

### Mediterranean Blu Spritz
- PIN: `98765`
- Access: Mediterranean Blu Spritz content only
- Brand: Mediterranean-inspired spritz beverages

### Washco Express
- PIN: `4729`
- Access: Washco Express content only
- Brand: Car wash services
- Contact: Sal (sally@cwsa.com.au)

---

## Adding New Clients

To add a new client, run this SQL in Supabase:

```sql
INSERT INTO clients (name, pin, brand_name, brand_mission, brand_tone, brand_keywords)
VALUES (
  'Client Name',
  'XXXX',  -- 4-digit PIN
  'Brand Name',
  'Brand mission',
  'Brand tone',
  '["keyword1", "keyword2"]'::jsonb
);
```

---

**Security Note:** Keep these PINs confidential. Each PIN provides access to that client's entire content library.
