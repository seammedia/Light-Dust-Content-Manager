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

### 2. Google Gemini API Setup (Optional)

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the API key for later use
4. **Note:** AI caption generation has been removed but the setup remains for future use

### 3. Vercel Deployment

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com) and import your repository
3. In the deployment settings, add these **Environment Variables**:

   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

   ⚠️ **Important**: All variables MUST start with `VITE_` or they won't work!

4. Deploy your application

### 4. Local Development

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

### Recent Updates (2025-11)

1. **Multi-Client System** - Complete rewrite to support multiple clients with isolated data
2. **Performance Fixes** - Resolved typing lag with debouncing
3. **Calendar View** - Added visual monthly calendar with post details
4. **Date Improvements** - Changed to Australian format with date picker
5. **Bulk Actions** - Added "Approve All" button for month-based bulk approval
6. **UI Cleanup** - Removed regenerate button, simplified status options, removed post title field

See `DEPLOYMENT.md` for detailed technical documentation of all improvements.

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
- `types.ts` - TypeScript interfaces including Meta credentials
- `src/services/metaService.ts` - **NEW!** Meta API service
- `src/components/MetaSettings.tsx` - **NEW!** Settings UI for Meta integration
- `api/post-to-meta.ts` - **NEW!** Vercel serverless function for secure posting

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

## Future Enhancements

Potential features to add:
- [ ] Email notifications when posts are approved
- [x] ~~Social media API integration~~ ✅ **COMPLETED** - Meta Business Suite API
- [x] ~~Automated scheduling when status = "Approved"~~ ✅ **COMPLETED**
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
