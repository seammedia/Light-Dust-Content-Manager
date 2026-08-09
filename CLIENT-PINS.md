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
- Access: Washco Express content only (shared PIN with CWSA)
- Brand: Car wash services
- Contact: Sal (sally@cwsa.com.au)

### CWSA
- PIN: `4729`
- Access: CWSA content only (shared PIN with Washco Express)
- Brand: Car wash services association
- Contact: Sal (sally@cwsa.com.au)
- Note: Sal can switch between Washco Express and CWSA using the "Switch Client" button

### NSW Fishing League
- PIN: `638271`
- Access: NSW Fishing League content only
- Note: Isolated from Sal's shared CWSA and Washco Express access; hidden from the client selector while inactive

### Flagworks
- PIN: `191816`
- Access: Flagworks content only
- Brand: Flagworks
- Contact: Steve (info@flagworks.com.au)

### Pace Electrical
- PIN: `7834`
- Access: Pace Electrical content only
- Brand: Pace Electrical / Pace Services
- Contact: Paul (service@paceservices.com.au)

### Goochs Garage
- PIN: `4208`
- Access: Goochs Garage content only
- Brand: Gooch's Garage - Ormeau's Honest Car Mechanic
- Contact: Brent (brent@goochsgarage.com)
- Website: https://goochsgarage.com/
- Frequency: 2 posts per week

### Australian Lending Centre
- PIN: `5521`
- Access: Australian Lending Centre content only

### Just Budget
- PIN: `6632`
- Access: Just Budget content only

### Bad Credit Loans
- PIN: `7743`
- Access: Bad Credit Loans content only

### Sandhurst Roofing
- PIN: `8854`
- Access: Sandhurst Roofing content only

### National Probate
- PIN: `9965`
- Access: National Probate content only

### Bark Hair
- PIN: `2847`
- Access: Bark Hair content only

### Lease of Mind
- PIN: `6194`
- Access: Lease of Mind content only
- Brand: Novated leasing consultancy
- Contact: Emma Lane (info@leaseofmind.com.au)

### Tint A Car
- PIN: `3956`
- Access: Tint A Car content only
- Brand: Tint A Car
- Contact: Fiona (accounts@tactownsville.com.au)

### Mascot Kings Football Club
- PIN: `4167`
- Access: Mascot Kings Football Club content only
- Brand: Mascot Kings Football (Soccer) Club

### Club Thai Massage
- PIN: `5283`
- Access: Club Thai Massage content only

### KHY Physio
- PIN: `6394`
- Access: KHY Physio content only

### Familia Fitness
- PIN: `7251`
- Access: Familia Fitness content only
- Contact: Jordan (admin@familiafitness.com.au)

### Forum Coffee
- PIN: `8362`
- Access: Forum Coffee content only

### Ballarat VAC and Pumping
- PIN: `9473`
- Access: Ballarat VAC and Pumping content only
- Brand: Ballarat Vac and Pumping Solutions
- Contact: Luke (info@ballaratvaps.com.au)
- Website: https://ballaratvaps.com.au/

### Approved Expandable Homes
- PIN: `1058`
- Access: Approved Expandable Homes content only

### Claremont (HENRY @ Lawson Riverside Suites)
- PIN: `2650`
- Access: Claremont content only
- Brand: HENRY - riverside cafe at Lawson Riverside Suites, Wagga Wagga NSW
- Contact: Jack MacKinnon (jack@claremontgroup.com.au)
- Frequency: 3-4 posts per week

### Advanced Rigging
- PIN: `3703`
- Access: Advanced Rigging content only
- Brand: Advanced Rigging - structural steel erection specialist, Perth WA
- Contact: Jon Adams (jon@advancedrigging.au)
- Package: Pro - 2-3 posts per week (FB, IG, LinkedIn)
- Note: website + socials launch 3 July 2026

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
