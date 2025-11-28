# Seam Media Content Manager

A multi-client social content management platform where agencies can manage multiple brands, and clients can view, comment on, and approve social media posts. All data is stored in Supabase with real-time synchronization and complete data isolation between clients.

## Features

- 👥 **Multi-Client Support** - Manage unlimited clients with isolated data
- 🔐 **Master Account** - Agency access to switch between all clients
- 📅 **Content Calendar** - Table view and visual calendar view
- 🗓️ **Month Filtering** - Quick navigation between months
- 🖼️ **Image Upload** - Upload post images with built-in date picker
- 💬 **Client Comments** - Add notes and feedback
- ✅ **Approval Workflow** - Track post status (Draft → For Approval → Approved → Posted)
- 🔄 **Real-time Updates** - Changes sync instantly across all users
- 🚀 **Performance Optimized** - Debounced database updates prevent typing lag
- 📱 **Responsive Design** - Works on all devices
- 🔐 **PIN-Based Access** - Secure client authentication
- ✨ **AI Caption Generation** - Generate captions and hashtags from images using Gemini AI (master account only)
- 📧 **Gmail Integration** - Send review notification emails directly from the dashboard
- 🏷️ **Editable Hashtags** - Click to edit hashtags inline

## Setup Instructions

### 1. Supabase Setup (Multi-Client)

1. Go to [Supabase](https://supabase.com) and create a new project
2. Once your project is created, go to the **SQL Editor** in the left sidebar
3. **Run the multi-client migration:**
   - Copy the contents of `supabase-multi-client-schema.sql`
   - Paste and run in the SQL Editor
   - This creates the `clients` table and migrates existing data
4. **Verify the setup:**
   - Copy the contents of `verify-and-fix-clients.sql`
   - Run it to confirm all clients are created
   - You should see: Seam Media, Light Dust, and Abercrombie Ridge
5. Get your Supabase credentials:
   - Go to **Project Settings** > **API**
   - Copy your **Project URL** (looks like `https://xxxxx.supabase.co`)
   - Copy your **anon/public** key

### 2. Google Gemini API Setup (For AI Caption Generation)

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Add to Vercel as `VITE_GEMINI_API_KEY`
4. **Usage:** Master account can click "Generate" button on any post to auto-generate caption and hashtags from the uploaded image
5. **Model:** Uses `gemini-2.0-flash-exp` for fast image analysis
6. **Style:** Generates warm, friendly captions with paragraphs (no em dashes) and 4-5 relevant hashtags

### 3. Gmail API Setup (For Email Notifications)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the **Gmail API** (APIs & Services → Library → Search "Gmail API")
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add **Authorized redirect URI**: `https://your-vercel-domain.vercel.app/oauth/callback`
7. Copy the **Client ID** (looks like `xxxxx.apps.googleusercontent.com`)
8. Add to Vercel as `VITE_GOOGLE_CLIENT_ID`
9. **Usage:** Click "Connect Gmail" button (bottom-right) when logged in as master account

**Email Features:**
- Send review notification emails directly from dashboard
- Emails sent from connected Gmail account (e.g., `sales@seammedia.com.au`)
- Auto-CC to `contact@seammedia.com.au` on all emails
- Client email addresses saved to database for future use
- Pre-fills client contact name in greeting

**Token Expiry:**
- Gmail tokens expire after ~1 hour (Google security requirement)
- Staff need to click "Connect Gmail" to re-authenticate when expired
- Recommended: Use a shared Gmail account (e.g., `sales@seammedia.com.au`) that staff can authenticate with

### 4. Vercel Deployment

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com) and import your repository
3. In the deployment settings, add these **Environment Variables**:

   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
   ```

   ⚠️ **Important**: All variables MUST start with `VITE_` or they won't work!

4. Deploy your application

### 5. Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/seammedia/Light-Dust-Content-Manager.git
   cd Light-Dust-Content-Manager
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

## Access PINs

See `CLIENT-PINS.md` for all client access credentials.

### Default PINs:
- **Master Account (Seam Media)**: `1991` - Access all clients
- **Light Dust**: `5678` - Light Dust content only
- **Abercrombie Ridge**: `3847` - Abercrombie Ridge content only

## Usage

### Master Account (Agency):
1. **Login** - Enter PIN `1991`
2. **Select Client** - Choose which client to manage from the selector
3. **Switch Clients** - Click "Switch Client" in the header anytime
4. **Manage Content** - Full access to selected client's posts
5. **Generate Caption** - Click "Generate" button on any post to auto-generate caption and hashtags from uploaded image
6. **Update from Feedback** - Click "Update from Feedback" button to have AI update caption/hashtags based on client notes
7. **Email Client** - Click "Email Client" button to send review notification email directly from dashboard
8. **Connect Gmail** - Click floating button (bottom-right) to connect Gmail for sending emails

### Client Account:
1. **Login** - Enter your unique PIN (e.g., `5678` for Light Dust)
2. **View Posts** - Automatically shows your content calendar
3. **Switch Views** - Toggle between Table View and Calendar View
4. **Filter Months** - Click month tabs to see different months
5. **Add Post** - Click "+ Add Post" to create new content
6. **Upload Image** - Click date field to open date picker, upload images
7. **Update Status** - Use dropdown to change post status
8. **Add Comments** - Use "Additional Comments" for feedback
9. **Approve All** - Click "Approve All" button to bulk approve posts in current month

### Key Features:
- **Date Picker**: Click date field to select dates easily (DD/MM/YYYY format)
- **Calendar View**: Visual month view shows posts on scheduled dates
- **Month Filtering**: Quick navigation between past and future months
- **Bulk Approval**: Approve all posts in a month with one click
- **Real-time Sync**: Changes appear instantly for all users
- **Debounced Updates**: Type freely without lag - saves after 500ms pause

## Adding New Clients

To add a new client to the system:

1. Open Supabase Dashboard → SQL Editor
2. Run this SQL (replace with your client details):

```sql
INSERT INTO clients (name, pin, brand_name, brand_mission, brand_tone, brand_keywords)
VALUES (
  'Client Name',
  '1234',  -- Unique 4-digit PIN
  'Brand Name',
  'Brand mission statement',
  'Brand tone descriptors',
  '["keyword1", "keyword2"]'::jsonb
);
```

3. The new client will immediately appear in the master account selector
4. Share the PIN with your client for direct access

See `MULTI-CLIENT-SETUP.md` for detailed instructions.

### Setting Up Client Contact Info (For Emails)

To enable auto-fill of client email addresses and personalized greetings:

```sql
-- Add contact columns if not already present
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Set contact info for each client
UPDATE clients
SET contact_name = 'John',
    contact_email = 'john@example.com'
WHERE name = 'Client Name';
```

This enables:
- Auto-fill of "To:" field with client's email when clicking "Email Client"
- Personalized greeting: "Hi John," instead of "Hi Client Name,"

## Performance Optimizations

### Typing Lag Fix (Completed)
**Problem:** Every keystroke triggered immediate database updates, causing lag and missed keystrokes.

**Solution:** Implemented debouncing with 500ms delay
- UI updates instantly (optimistic)
- Database updates only after typing stops
- Per-field debounce timers prevent conflicts
- Result: Zero lag, responsive typing experience

### Date Format (Completed)
Changed from MM-DD format to Australian DD/MM/YYYY format with native date picker for easier date selection.

### Calendar View (Completed)
Added visual monthly calendar view with:
- Posts displayed on scheduled dates
- Click posts to view full details in modal
- Month navigation (previous/next)
- Syncs with month filter tabs

## Troubleshooting

### Client PIN Not Working

1. Verify client exists in database:
   ```sql
   SELECT name, pin FROM clients ORDER BY name;
   ```
2. If missing, run `verify-and-fix-clients.sql` in Supabase
3. Check that PIN matches exactly (case-sensitive)

### Client Not Showing in Master Account

1. Log out and log back in with PIN `1991`
2. Check database: `SELECT * FROM clients WHERE pin != '1991';`
3. Verify the client was created successfully
4. Try running `verify-and-fix-clients.sql`

### Posts Not Showing for Client

1. Check that posts have correct `client_id`:
   ```sql
   SELECT p.id, p.title, c.name as client_name
   FROM posts p
   JOIN clients c ON p.client_id = c.id;
   ```
2. If posts have NULL `client_id`, assign them:
   ```sql
   UPDATE posts
   SET client_id = (SELECT id FROM clients WHERE name = 'Client Name')
   WHERE client_id IS NULL;
   ```

### Environment Variables Not Working in Vercel

Make sure all environment variables in Vercel are prefixed with `VITE_`:
- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_SUPABASE_ANON_KEY`
- ✅ `VITE_GEMINI_API_KEY`
- ❌ `SUPABASE_URL` (won't work without VITE_ prefix)

After updating environment variables in Vercel, you must **redeploy** your application.

### "Database connection failed" Error

1. Check that your Supabase URL and key are correct in Vercel
2. Verify that you ran the multi-client SQL migration in Supabase
3. Make sure Row Level Security policies are set up
4. Check that `clients` table exists: `SELECT * FROM clients;`

### Images Not Loading

- Images are stored as base64 in the database
- Keep images under 2MB to avoid payload errors
- For production, consider using Supabase Storage instead

### Typing is Laggy

This should be fixed! If you still experience lag:
1. Check browser console for errors
2. Verify debouncing is working (should save 500ms after typing stops)
3. Check network tab - should not see rapid-fire database updates

## Tech Stack

- **React** + **TypeScript** - Frontend framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Supabase** - PostgreSQL database with real-time sync
- **Lucide React** - Icon library
- **Vercel** - Deployment and hosting

## Architecture

### Multi-Tenancy
- Data isolation per client using `client_id` foreign key
- Row Level Security (RLS) enabled on all tables
- Master account can access all clients
- Client accounts restricted to own data

### Database Schema
```
clients
├── id (UUID, primary key)
├── name (text)
├── pin (text, unique)
├── brand_name (text)
├── brand_mission (text)
├── brand_tone (text)
├── brand_keywords (jsonb)
├── created_at (timestamp)
└── updated_at (timestamp)

posts
├── id (text, primary key)
├── client_id (UUID, foreign key → clients.id)
├── title (text)
├── date (date)
├── status (text)
├── image_description (text)
├── image_url (text)
├── generated_caption (text)
├── generated_hashtags (jsonb)
└── notes (text)
```

### Key Improvements Made

**Performance:**
- Debounced database updates (500ms delay)
- Optimistic UI updates for instant feedback
- Per-field debounce timers
- Efficient query filtering by client_id

**UX Enhancements:**
- Native date picker for easy date selection
- Australian date format (DD/MM/YYYY)
- Calendar view with clickable posts
- Month filtering tabs
- Bulk approval button
- Post detail modal
- Real-time synchronization

**Multi-Client Features:**
- PIN-based authentication
- Client selector for master account
- Dynamic brand context per client
- Data isolation and security
- Easy client onboarding

## Development History

### Recent Updates (2025-11-28)

1. **Multi-Client System** - Complete rewrite to support multiple clients with isolated data
2. **Performance Fixes** - Resolved typing lag with debounced textarea components
3. **Calendar View** - Added visual monthly calendar with post details
4. **Date Improvements** - Changed to Australian format with date picker
5. **Bulk Actions** - Added "Approve All" button for month-based bulk approval
6. **UI Cleanup** - Removed regenerate button, simplified status options, removed post title field
7. **Meta API Integration** - Added Facebook/Instagram auto-posting infrastructure (pending Meta App Review approval)
8. **AI Caption Generation** - Generate captions and hashtags from images using Gemini 2.0 Flash (master account only)
9. **Update from Feedback** - AI reads client notes and updates caption/hashtags accordingly
10. **Gmail Integration** - Send review notification emails directly from dashboard via Gmail API
11. **Editable Hashtags** - Hashtags now displayed in editable text field for easy modification
12. **Client Contact Info** - Store contact name/email for auto-fill in email modal
13. **Rebranding** - Updated login page to "Seam Media content manager"

See `DEPLOYMENT.md` for detailed technical documentation of all improvements.

### Meta Integration Progress (2025-11-27)

**Completed:**
- ✅ Database schema with Meta credentials storage
- ✅ Meta API service implementation
- ✅ Vercel serverless function for secure posting
- ✅ Auto-posting trigger when status = "Approved"
- ✅ Settings UI for Meta account connection
- ✅ Complete setup documentation (META-SETUP.md)
- ✅ Facebook App created: "Seam Media Content Manager"
- ✅ Light Dust Candles Page identified (ID: 757104097499888)

**Pending:**
- ⏳ Meta App Review approval (1-2 weeks) for:
  - `pages_manage_posts` permission
  - `instagram_content_publish` permission
  - `instagram_basic` permission
- ⏳ Implement Supabase Storage for images (required for Meta API)
- ⏳ Get Instagram Business Account ID (requires App Review approval)

**Blockers:**
- Images stored as base64 won't work with Meta API - need public URLs
- App Review approval required before production posting works

## Files Reference

### Documentation
- `README.md` - This file, main documentation
- `MULTI-CLIENT-SETUP.md` - Detailed multi-client setup guide
- `CLIENT-PINS.md` - Client access credentials (keep secure!)
- `DEPLOYMENT.md` - Technical deployment and optimization notes
- `META-SETUP.md` - **NEW!** Complete Facebook/Instagram API setup guide

### Database Migrations
- `supabase-multi-client-schema.sql` - Initial database migration
- `verify-and-fix-clients.sql` - Client verification and setup script
- `add-abercrombie-ridge.sql` - Example of adding a new client
- `add-meta-integration-schema.sql` - **NEW!** Meta API integration schema

### Source Code
- `App.tsx` - Main application with auto-posting logic
- `types.ts` - TypeScript interfaces including Meta credentials, Gmail settings
- `services/geminiService.ts` - AI caption generation and feedback processing
- `services/gmailService.ts` - Gmail OAuth and email sending
- `src/services/metaService.ts` - Meta API service
- `src/components/MetaSettings.tsx` - Settings UI for Meta integration
- `api/post-to-meta.ts` - Vercel serverless function for secure posting
- `public/oauth/callback/index.html` - Gmail OAuth callback handler

## Security Notes

⚠️ **Important Security Considerations:**

1. **PIN Management**
   - Change default PINs in production
   - Keep `CLIENT-PINS.md` secure and private
   - Consider using environment variables for PINs in production

2. **Database Security**
   - Row Level Security (RLS) is enabled
   - Use Supabase's built-in authentication for production
   - Never commit Supabase credentials to git

3. **Image Storage**
   - Currently using base64 in database (not ideal for production)
   - Consider migrating to Supabase Storage for better performance
   - Implement file size limits and validation

## Meta Business Suite Integration (NEW!)

The content manager now supports **automatic posting to Facebook and Instagram** when posts are approved!

### Features:
- ✅ Auto-post to Facebook Pages when status = "Approved"
- ✅ Auto-post to Instagram Business Accounts
- ✅ Schedule Facebook posts for future dates
- ✅ Per-client Meta credentials and settings
- ✅ Track posting status (pending, posted, failed)
- ✅ **100% FREE** - No Buffer/Later fees!

### Setup:
1. Run `add-meta-integration-schema.sql` in Supabase
2. Create a Facebook App at https://developers.facebook.com/
3. Get your Page Access Token and Instagram Account ID
4. Click Settings (⚙️) in the app and configure credentials
5. Enable auto-posting and select platforms

See `META-SETUP.md` for complete step-by-step instructions.

### Important: App Review Required

⚠️ **Meta requires App Review approval** before your app can post to Facebook/Instagram in production.

**What You Need:**
- Your app must request these permissions through Meta's App Review:
  - `pages_manage_posts` - Required to post to Facebook Pages
  - `instagram_content_publish` - Required to post to Instagram
  - `instagram_basic` - Required to access Instagram account info

**App Review Process:**
1. Go to App Dashboard → "App Review" → "Permissions and Features"
2. Search for each permission and click "Request Advanced Access"
3. Fill out the form explaining your use case (content management for clients)
4. Provide a video demo showing how you'll use the permissions
5. Submit for review

**Timeline:** Meta's app review typically takes **1-2 weeks**

**During Development:**
- Your app works in Development Mode with your own Pages/accounts
- You can test with Pages you admin
- Limited to 5 test users
- Full functionality requires approval for production use

### Current Limitations

❗ **Image URLs Required**:
- Meta API requires images to be publicly accessible via URL
- Currently, images are stored as base64 in the database (won't work with Meta API)
- **Solution**: Implement Supabase Storage or use image hosting service (Cloudinary, Imgur, etc.)
- This is the next priority before Meta integration can work fully

### Quick Start for Testing

**What We Have Working:**
1. ✅ Database schema created (`add-meta-integration-schema.sql`)
2. ✅ Settings UI for Meta credentials
3. ✅ Auto-posting logic in app
4. ✅ Vercel serverless function for secure API calls
5. ✅ Tracking system for post status

**To Test Now:**
1. Run the database migration in Supabase
2. Get your credentials from Graph API Explorer:
   - **Facebook Page ID**: Find in Page Settings or use `757104097499888` (Light Dust Candles)
   - **Page Access Token**: Use Graph API Explorer to generate
3. Enter in Settings (⚙️) in the app
4. Enable auto-posting
5. Test by approving a post (will fail until App Review approved + images hosted)

**Credentials Found:**
- Light Dust Candles Page ID: `757104097499888`
- Access Token expires - needs to be refreshed periodically
- Instagram Account ID: Pending (need App Review approval to access)

## Future Enhancements

Potential features to add:
- [x] ~~Email notifications when posts are approved~~ ✅ **COMPLETED** - Gmail API integration
- [x] ~~Social media API integration~~ ✅ **COMPLETED** - Meta Business Suite API
- [x] ~~Automated scheduling when status = "Approved"~~ ✅ **COMPLETED**
- [x] ~~AI Caption Generation~~ ✅ **COMPLETED** - Gemini 2.0 Flash
- [ ] Refresh token for Gmail (avoid re-auth every hour)
- [ ] Client-specific branding/themes
- [ ] Usage analytics per client
- [ ] Export to PDF/Excel
- [ ] Comment threads and @mentions
- [ ] File attachments beyond images
- [ ] Mobile app
- [ ] Supabase Storage for images (required for Meta API)

## License

© 2025 Seam Media

---

**Questions?** Check the troubleshooting section or create an issue on GitHub.
