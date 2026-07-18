# Seam Media Content Manager

A multi-client social content management platform where agencies can manage multiple brands, and clients can view, comment on, and approve social media posts. All data is stored in Supabase with real-time synchronization and complete data isolation between clients.

## Features

- 👥 **Multi-Client Support** - Manage unlimited clients with isolated data
- 🔐 **Master Account** - Agency access to switch between all clients
- 📊 **Client Management Dashboard** - Weekly overview of all clients with color-coded status (Posted/Approved/Awaiting/Outstanding)
- 📅 **Content Calendar** - Table view and visual calendar view with click-to-add posts
- 🗓️ **Month Filtering** - Quick navigation between months
- 🖼️ **Image & Video Upload** - Upload images or videos (mp4, mov, webm) with built-in date picker
- 🎠 **Carousel Posts** - Upload multiple images for Instagram carousel posts with slideshow preview
- 🎬 **Video Scheduling** - Schedule videos to Instagram (as Reels), Facebook, TikTok and more
- 💬 **Client Comments** - Add notes and feedback
- ✅ **Approval Workflow** - Track post status (Draft → For Approval → Approved → Posted)
- 🔄 **Real-time Updates** - Changes sync instantly across all users
- 🚀 **Performance Optimized** - Debounced database updates prevent typing lag
- 📱 **Responsive Design** - Works on all devices
- 🔐 **PIN-Based Access** - Secure client authentication
- ✨ **AI Caption Generation** - Generate captions and hashtags from images using Gemini AI (master account only)
- 🚀 **Bulk Post Generation** - Generate multiple posts at once with AI-created captions and hashtags
- 📧 **Gmail Integration** - Send review notification emails directly from the dashboard
- 📁 **Google Drive Integration** - Fetch images from client's Drive folders for post generation
- 🏷️ **Editable Hashtags** - Click to edit hashtags inline
- 📅 **Late API Scheduling** - Schedule approved posts to Instagram, Facebook, TikTok and more
- 🔄 **Auto-Schedule on Approval** - Posts automatically schedule when status changes to Approved
- 👥 **Client-Specific Social Accounts** - Assign social accounts to each client separately
- 📋 **Duplicate Posts** - Copy existing posts with one click (duplicates as Draft)
- 🎨 **Status-Colored Calendar** - Calendar view shows posts color-coded by status
- 🔒 **Hidden Drafts** - Draft posts only visible to agency, not clients
- 🖼️ **Auto Image Cropping** - Automatically crops images to fit Instagram's aspect ratio requirements
- ☁️ **Supabase Storage** - Images stored as public URLs for social media compatibility
- 🧹 **Auto Cleanup** - Old images automatically deleted after 60 days to save storage
- 📬 **Client Notes Notifications** - Email alerts when clients add feedback (via Resend)
- 🔑 **Persistent Login** - Browser remembers login for 30 days (no need to re-enter PIN)

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

### 2b. OpenAI API Setup (For AI Image Generation - gpt-image-2)

Image generation uses **OpenAI's gpt-image-2** (ChatGPT Images 2.0), released April 2026.
This replaces the previous Gemini Nano Banana Pro image generation.

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key (organisation-scoped or project-scoped both work)
3. Add to Vercel as `VITE_OPENAI_API_KEY` (mark as Sensitive, scope to Production + Preview)
4. Add the same key to your local `.env.local` file for development
5. **Verify your OpenAI organisation** at [platform.openai.com/settings/organization/general](https://platform.openai.com/settings/organization/general) - the **Individual** verification (photo ID) is required for gpt-image-2 access
6. **Usage:** Master account clicks "Generate Image (AI)" button below the upload button on any post → enter a prompt → image generates and uploads
7. **Model:** `gpt-image-2`
8. **Size:** `1024x1024` (Instagram square)
9. **Quality:** `medium` (balanced speed/quality - takes 20-40s per image)

**Cost:** approx $0.04-$0.07 per image at 1024x1024 medium quality. Monitor usage at [platform.openai.com/usage](https://platform.openai.com/usage).

**Security:** never commit the API key. Use Vercel env vars + `.env.local`. If a key leaks, rotate immediately at [platform.openai.com/api-keys](https://platform.openai.com/api-keys).

#### Per-Client Brand Assets (gpt-image-2 context)

Each client has structured brand fields that get auto-injected into every image generation prompt:

| Field | Purpose | Where to set |
|-------|---------|--------------|
| `reference_images` | Visual style guides (logos, existing posts, mood boards) - up to 8 passed to gpt-image-2 via `/v1/images/edits` | Client Notes modal → Brand Reference Images |
| `brand_colors` | Hex codes (`#RRGGBB`) listed in the prompt to guide colour palette | Client Notes modal → Brand Colours |
| `brand_style_notes` | Free-form visual style description ("clean minimal, warm lighting, no people in frame") | Client Notes modal → Brand Visual Style |
| `client_notes` | General brand voice and preferences | Client Notes modal → top textarea |

**Schema migration:** if you haven't yet, run `add-brand-fields.sql` in Supabase Dashboard SQL Editor to add the `brand_colors` and `brand_style_notes` columns.

The Generate Image modal shows which brand fields are populated before you click Generate, so you can see what context the AI has.

**"Update from Feedback" flow** also uses gpt-image-2 - when client feedback contains image-related keywords, the post image is regenerated against the existing image as the source, with all brand context applied.

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

### 4. Google Drive API Setup (For Image Sourcing)

The same Google OAuth client used for Gmail also enables Google Drive integration for fetching images from client folders.

**Setup:**
1. In [Google Cloud Console](https://console.cloud.google.com/), enable the **Google Drive API** (APIs & Services → Library)
2. Your existing OAuth Client ID will work for both Gmail and Drive (same `VITE_GOOGLE_CLIENT_ID`)
3. Add Drive scope is automatically included

**Usage:**
1. Click "Connect Drive" button (bottom-right, blue button) when logged in as master account
2. In Client Notes, add a Google Drive folder URL (e.g., `https://drive.google.com/drive/folders/xxxxx`)
3. When generating posts, the "Include Images from Google Drive" option will be auto-enabled
4. Random images from the folder will be attached to generated posts

**Folder Sharing:**
- The Drive folder must be shared with the connected Google account OR shared publicly
- Images are downloaded and re-uploaded to Supabase Storage for social media compatibility

### 5. Late API Setup (For Social Media Scheduling)

1. Go to [Late](https://getlate.dev) and create an account
2. Connect your social media accounts (Instagram, Facebook, TikTok, etc.) under **Connections**
3. Go to **API Keys** and create a new key (name it "Content Manager")
4. Add to Vercel as `VITE_LATE_API_KEY`

**Features:**
- Schedule posts to Instagram, Facebook, TikTok, LinkedIn, X, YouTube, Threads, Pinterest
- Posts scheduled when clicking "Schedule Posts" button (master account only)
- Only schedules posts with "Approved" status
- Automatically updates status to "Posted" after scheduling

**Pricing:**
- Free tier: 10 posts/month, 2 profiles
- Paid: $19/mo (120 posts) or $49/mo (unlimited)

### 6. Client Notes Email Notifications (Resend + Cron)

Get email alerts at `contact@seammedia.com.au` when clients add notes/feedback to posts.

#### 6.1 Supabase Setup

Run `add-notes-tracking.sql` in Supabase SQL Editor to add tracking columns:

```sql
-- Adds notes_updated_at and notes_notified columns
-- Creates trigger to track when notes are modified
```

#### 6.2 Resend Setup (Email Service)

1. Go to [Resend](https://resend.com) and create a free account (3,000 emails/month free)
2. Add and verify your domain:
   - Go to **Domains** → **Add Domain**
   - Enter `seammedia.com.au`
   - Add the DNS records (DKIM, SPF) to your domain registrar
   - Wait for verification (usually instant)
3. Create an API key:
   - Go to **API Keys** → **Create API Key**
   - Name: `Notes Tracking`
   - Permission: `Sending access`
4. Add to Vercel: `RESEND_API_KEY=re_xxxxx`

#### 6.3 External Cron Setup (cron-job.org)

Vercel's free plan only allows daily cron jobs. Use [cron-job.org](https://cron-job.org) (free) for more frequent checks:

1. Create account at https://cron-job.org
2. Create new cronjob:
   - **Title**: `Light Dust Notes Notifications`
   - **URL**: `https://seam-media-content-manager.vercel.app/api/notify-notes?secret=YOUR_CRON_SECRET`
   - **Schedule**: Every 15 minutes
   - **Request Method**: GET
3. Add `CRON_SECRET` to Vercel environment variables (any random string)

#### 6.4 How It Works

1. Client adds/edits notes on a post
2. Database trigger sets `notes_updated_at` timestamp and `notes_notified = false`
3. Cron job runs every 15 minutes
4. Checks for notes older than 20 minutes that haven't been notified (batching delay)
5. Sends email to `contact@seammedia.com.au` with all new notes grouped by client
6. Marks posts as `notes_notified = true`

#### 6.5 Testing

Add `&test=true` to bypass the 20-minute delay:
```
https://seam-media-content-manager.vercel.app/api/notify-notes?secret=YOUR_CRON_SECRET&test=true
```

### 7. Supabase Storage Setup (For Images & Videos)

Media files must be stored as public URLs for Late API to access them.

1. Go to Supabase Dashboard → **Storage**
2. Click **"New bucket"**
3. Name it: **`post-images`** (used for both images and videos)
4. **Enable "Public bucket"** (toggle ON)
5. Add storage policy:
   - Policy name: `Allow public uploads`
   - Operations: SELECT, INSERT, UPDATE, DELETE
   - Target roles: anon, authenticated
   - Policy definition: `true`

**Image Auto-Cropping:**
- Images automatically cropped to fit Instagram's aspect ratio (0.75 to 1.91)
- Too tall images → cropped to 4:5 portrait
- Too wide images → cropped to 1.91:1 landscape
- Crop is centered on original image

**Video Support:**
- Videos are uploaded as-is (no cropping/processing)
- Supported formats: MP4, MOV, WebM, M4V
- Max file size: 500MB
- Instagram videos are posted as Reels
- Facebook videos posted to Page timeline

**Auto-Cleanup:**
- Media files automatically deleted 60 days after post is marked "Posted"
- Runs daily via Vercel Cron (requires Pro plan) or manual trigger
- Manual cleanup: Visit `/api/cleanup-storage`

### 8. Vercel Deployment

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com) and import your repository
3. In the deployment settings, add these **Environment Variables**:

   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
   VITE_LATE_API_KEY=your_late_api_key_here
   RESEND_API_KEY=re_xxxxx
   CRON_SECRET=your_random_secret_string
   ```

   ⚠️ **Important**: Frontend variables MUST start with `VITE_`. Server-side only vars (RESEND_API_KEY, CRON_SECRET) don't need the prefix.

4. Deploy your application

### 9. Local Development

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
   VITE_LATE_API_KEY=your_late_api_key_here
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
1. **Login** - Enter PIN `1991` (browser remembers for 30 days)
2. **Select Client** - Choose which client to manage from the selector
3. **Switch Clients** - Click "Switch Client" in the header anytime
4. **Manage Content** - Full access to selected client's posts
5. **Generate Caption** - Click "Generate" button on any post to auto-generate caption and hashtags from uploaded image
6. **Update from Feedback** - Click "Update from Feedback" button to have AI update caption/hashtags based on client notes
7. **Email Client** - Click "Email Client" button to send review notification email directly from dashboard
8. **Connect Gmail** - Click floating button (bottom-right) to connect Gmail for sending emails
9. **Schedule Posts** - Click "Schedule Posts" button to schedule all approved posts to connected social media platforms via Late API
10. **Logout** - Click the logout icon (top-right) to clear session and return to login

### Client Account:
1. **Login** - Enter your unique PIN (e.g., `5678` for Light Dust) - browser remembers for 30 days
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
- **Calendar View**: Visual month view shows posts on scheduled dates, click any date to add a post, drag posts to reschedule
- **Month Filtering**: Quick navigation between past and future months
- **Bulk Approval**: Approve all posts in a month with one click
- **Real-time Sync**: Changes appear instantly for all users
- **Debounced Updates**: Type freely without lag - saves after 500ms pause

## Adding New Clients

### Option 1: CLI Script (Recommended)

Use the CLI tool to add clients directly without opening Supabase:

```bash
cd /Volumes/PortableSSD/Projects/light-dust-content-manager

# List all existing clients
node scripts/add-client.mjs --list

# Add a new client
node scripts/add-client.mjs \
  --name "Client Name" \
  --pin "1234" \
  --brand "Brand Name" \
  --contact "Contact Person" \
  --email "email@example.com" \
  --mission "Brand mission statement" \
  --tone "Brand tone descriptors" \
  --keywords "keyword1,keyword2,keyword3"
```

**CLI Options:**
| Flag | Description |
|------|-------------|
| `--name` | Client name (required) |
| `--pin` | Access PIN (required) |
| `--brand` | Brand name (defaults to client name) |
| `--contact` | Contact person name |
| `--email` | Contact email |
| `--mission` | Brand mission statement |
| `--tone` | Brand tone description |
| `--keywords` | Comma-separated keywords |
| `--list` | List all existing clients |

### Option 2: Supabase SQL Editor

For complex setups or bulk operations, use the SQL Editor:

1. Open Supabase Dashboard → SQL Editor
2. Run this SQL (replace with your client details):

```sql
INSERT INTO clients (name, pin, brand_name, brand_mission, brand_tone, brand_keywords, contact_name, contact_email)
VALUES (
  'Client Name',
  '1234',
  'Brand Name',
  'Brand mission statement',
  'Brand tone descriptors',
  '["keyword1", "keyword2"]'::jsonb,
  'Contact Person',
  'email@example.com'
);
```

3. The new client will immediately appear in the master account selector
4. Share the PIN with your client for direct access

### Adding Posts for a Client

Create a custom script in `/scripts/` folder (see `add-krystal-posts.mjs` as template):

```bash
# Run the posts script
node scripts/add-[client-name]-posts.mjs
```

Or use Claude Code to generate posts directly - just provide the client name, dates, and content pillars.

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

## Development Learnings

### Variable Declaration Order in React Components
**Problem:** White screen crash in Client Management tab after adding sorting.

**Cause:** Used `today` variable in sort function before it was defined:
```tsx
// ❌ BAD - today used before defined
const displayClients = filteredClients.sort((a, b) => {
  const aStatus = getWeeklyStatusInfo(allPosts[a.id] || [], today); // today not yet defined!
  ...
});
const today = new Date(); // defined after use
```

**Solution:** Always define variables before using them, even in React components where hoisting might seem to apply:
```tsx
// ✅ GOOD - today defined first
const today = new Date();
today.setHours(0, 0, 0, 0);

const displayClients = [...filteredClients].sort((a, b) => {
  const aStatus = getWeeklyStatusInfo(allPosts[a.id] || [], today);
  ...
});
```

**Also:** Use spread operator `[...array]` before `.sort()` to avoid mutating the original array.

### Git Remote Authentication
**Problem:** HTTPS push fails with "Device not configured" error.

**Solution:** Switch to SSH remote:
```bash
git remote set-url origin git@github.com:seammedia/Light-Dust-Content-Manager.git
```
SSH identity is already configured for the `seammedia` GitHub account.

### Vercel Auto-Deploy Timing
- Vercel deploys automatically on push to `main` branch
- Build + deploy takes roughly 30-60 seconds
- Always hard refresh (`Cmd+Shift+R`) after deploy to bypass browser cache
- Port 3000 is often in use locally - dev server auto-selects 3001

### Supabase Post ID Generation
**Problem:** Posts table requires explicit ID - insert fails with "null value in column id violates not-null constraint".

**Solution:** Generate unique IDs in scripts:
```javascript
const postId = `${clientName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

const { error } = await supabase.from('posts').insert({
  id: postId,
  client_id: client.id,
  // ... other fields
});
```

### Pricing Component Architecture (Seam Media Site)
- When adding billing toggle, use separate `monthlyPrice`/`annualPrice` number fields rather than a single formatted string - makes calculations straightforward
- Separate `monthlyLink`/`annualLink` fields for Stripe integration - toggle state drives which link the button uses
- `exclusiveOffers` field uses `null` for packages without it, array of strings for packages that have it - clean conditional rendering

### README Documentation Pattern
- Keep the README as the single source of truth for pricing, Stripe links, and feature breakdowns
- Update README whenever pricing or features change
- Include actual Stripe URLs in documentation for reference
- Document the data structure pattern so future changes are easy

### Inactive Clients Pattern
**Problem:** Need to hide clients from the dashboard without deleting them from the database.

**Solution:** Code-level filtering via `INACTIVE_CLIENTS` array at top of `App.tsx`:
```tsx
const INACTIVE_CLIENTS = ['Flagworks', 'Light Dust', 'Mabii Co', 'Efficient Finance'];
```

This filters inactive clients from:
- Master account client selector (login)
- Session restore (returning users)
- Direct PIN login (blocks their PIN)

**Why not a database column?** Supabase JS client (anon key) cannot run `ALTER TABLE`. Schema changes require the Supabase Dashboard SQL Editor or a service role key. The code-level approach is simpler and doesn't need a migration.

**To reactivate:** Remove the client name from the array and push.

### Supabase Schema Changes
- Cannot run `ALTER TABLE` or DDL via the Supabase JS client with the anon key
- The `run-sql.mjs` script only supports SELECT queries via the client
- For data changes (INSERT, UPDATE, DELETE), use the JS client in scripts

**To run DDL (ALTER TABLE etc) without opening the dashboard:**
The Supabase CLI stores a personal access token in macOS Keychain (after running `supabase login`). Pull it out and call the Management API's `/database/query` endpoint:

```bash
RAW=$(security find-generic-password -s "Supabase CLI" -w)
B64=${RAW#go-keyring-base64:}
TOKEN=$(echo -n "$B64" | base64 -d)

curl -s -X POST "https://api.supabase.com/v1/projects/<PROJECT_REF>/database/query" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"ALTER TABLE clients ADD COLUMN IF NOT EXISTS my_field TEXT;"}'
```

A successful DDL returns `[]`. Project ref for the Content Manager is `zavfantqqpvvmtbjwcfz`. This avoids the manual paste-into-SQL-Editor step.

### Client Onboarding Workflow
Standard steps for adding a new client:
1. Run `node scripts/add-client.mjs --name "Name" --pin "XXXX" --brand "Brand" --contact "Person" --email "email"`
2. Create client folder at `/clients/[client-name]/` with `readme.md` and `profile.md`
3. Update `CLIENT-PINS.md` with new PIN entry
4. Create post script at `scripts/add-[client]-posts.mjs` using existing scripts as template
5. Posts require explicit `id` field - generate with timestamp + random string pattern

### "Posted" Must Be System-Only (Critical)
**Symptom:** A client reports posts show "POSTED" in the dashboard but never appear
on their social platform / in Late.

**Root cause:** `'Posted'` was a manually selectable option in the status dropdown.
Selecting it just wrote the label to the DB via `handleUpdatePost` - it never sent
the post anywhere. The actual publish only happens via `handleAutoPost`, which fires
**only when status transitions to `'Approved'`** (App.tsx, `isStatusChange` checks
`value === 'Approved'`). A client picking "Posted" thinking it publishes the post
gets a post labelled Posted that was never sent.

**How to confirm:** a genuinely published post has a `late_post_id`. Query posts
with `status = 'Posted' AND (late_post_id IS NULL OR late_post_id = '')` - those were
mislabelled and never reached Late.

**Fix:** "Posted" is now a system-only status. The dropdown only renders the
`<option value="Posted">` when `post.status === 'Posted'` already, so it can display
the current value but can never be chosen for a not-yet-posted post. The furthest a
user can manually take a post is "Approved", which triggers the real auto-post.

**Note:** the auto-post early-returns (no assigned Late profiles, or Instagram with no
media) correctly leave the status at "Approved" rather than falsely claiming "Posted".

### Late API Scheduling Failures
**"Media fetch failed, retrying..." errors on Instagram posts:**
- This is a Late platform issue, not a Meta/Instagram problem
- Happens when Late's servers can't retrieve the image at publish time
- Facebook posts from the same schedule often succeed (same image, same time)
- Fix: Click "retry post" in Late - usually works on second attempt
- If recurring: Contact Late support about media fetching infrastructure issues

### Duplicate Scheduling Protection

Every create request must include the content-manager post ID. The server first
atomically reserves that post's `late_post_id` in Supabase, then sends a deterministic
`x-request-id` to Zernio. This protects all scheduling entry points, browsers,
and server instances with the same rules:

- A post with a `late_post_id` returns that existing Zernio post and is never
  created again.
- Concurrent requests for the same post allow only one outbound API call.
- Network or provider failures with an ambiguous outcome remain locked for
  manual reconciliation rather than risking a second post.
- Definitive validation failures can be corrected and retried safely.

The reservation uses the existing `late_post_id` column, so it remains durable
across browsers, deployments, and server restarts.

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
├── image_url (text) - primary/cover image URL
├── image_urls (text[]) - array of image URLs for carousel posts
├── media_type (text) - 'image' or 'video'
├── generated_caption (text)
├── generated_hashtags (jsonb)
├── notes (text)
└── late_post_id (text) - ID from Late API for rescheduling
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

## Late API Integration (Social Media Scheduling)

The content manager integrates with [Late API](https://getlate.dev) for scheduling posts to social media platforms.

### How It Works

1. **Upload Image** - Image is uploaded to Supabase Storage (auto-cropped for Instagram)
2. **Generate Caption** - AI generates caption and hashtags from image
3. **Client Approval** - Client reviews and approves the post
4. **Schedule** - Agency clicks "Schedule Posts" to send to Late API
5. **Published** - Late publishes to connected platforms at scheduled time

### Scheduling Flow

| Post Status | What Happens |
|-------------|--------------|
| For Approval | Not scheduled (waiting for client) |
| Needs Changes | Not scheduled (client requested changes) |
| **Approved** | Ready to schedule |
| Posted | Already scheduled, won't be re-scheduled |

### Supported Platforms

- Instagram (feed posts)
- Facebook (pages)
- TikTok
- LinkedIn
- X (Twitter)
- YouTube
- Threads
- Pinterest
- Bluesky

### Technical Details

**API Endpoints (Serverless Functions):**
- `/api/late-profiles` - Fetches connected social accounts from Late
- `/api/late-schedule` - Schedules a post to Late
- `/api/cleanup-storage` - Cleans up old images (60+ days)

**Why Serverless?**
- Late API doesn't allow direct browser requests (CORS)
- API key stays secure on server-side
- Vercel functions proxy requests to Late

**Media Requirements:**
- Must be publicly accessible URLs (not base64)
- **Images:** Instagram aspect ratio 0.75 to 1.91 (auto-cropped)
- **Videos:** MP4, MOV, WebM supported (max 500MB)
- Instagram videos are posted as Reels
- Facebook videos posted to Page timeline

### Post Rescheduling & Content Sync

When a post has been scheduled to Late, you can update it without recreating:

| Change | Syncs to Late? | How |
|--------|---------------|-----|
| **Date change** | ✅ Yes | Drag post in calendar or edit date field |
| **Caption edit** | ✅ Yes | Edit the caption text (auto-syncs after 500ms) |
| **Hashtag edit** | ✅ Yes | Edit hashtags (auto-syncs after 500ms) |
| **Image change** | ❌ No | Late API doesn't support media updates |
| **Status change** | ❌ No | Only triggers initial scheduling |

**How It Works:**
1. When a post is scheduled to Late, the `late_post_id` is saved to the database
2. When you change the date, caption, or hashtags, the system detects the change
3. After 500ms (debounced to prevent spam), it calls the Late API to update the post
4. The post remains scheduled (not converted to draft)

**Database Setup:**
Run this SQL to enable rescheduling (if not already done):
```sql
ALTER TABLE posts ADD COLUMN IF NOT EXISTS late_post_id TEXT;
CREATE INDEX IF NOT EXISTS idx_posts_late_post_id ON posts(late_post_id);
```

**API Endpoints:**
- `/api/late-reschedule` (PUT) - Updates scheduled post date/content
- `/api/late-reschedule` (DELETE) - Cancels a scheduled post

**Troubleshooting Reschedule:**

**Post becomes "Draft" after rescheduling:**
- Fixed in latest version - uses `isDraft: false` and `publishNow: false`
- If still happening, redeploy from latest code

**"Post not found" error:**
- Post may have already been published or deleted from Late
- Check Late dashboard to verify post status

**Changes not syncing:**
- Verify post has a `late_post_id` in the database
- Check browser console for sync logs
- Only works for posts with status "Posted"

### Troubleshooting Late API

**"Failed to fetch" error:**
- Check that `VITE_LATE_API_KEY` is set in Vercel
- Verify API key is valid at getlate.dev

**"Aspect ratio" error:**
- Re-upload the image (new uploads are auto-cropped)
- Existing base64 images won't work - must re-upload

**"No profiles found":**
- Connect social accounts at getlate.dev → Connections
- Make sure accounts are active (not expired)

**Posts not appearing in Late:**
- Check Late dashboard → Scheduled posts
- Verify the scheduled date/time is in the future

**"Failed to validate Instagram image: unrecognized file format" (for videos):**
- This means Late API received `type: 'image'` but the file is a video
- Fixed in latest version: videos are now auto-detected from URL extension
- If issue persists, re-upload the video to ensure `media_type` is saved correctly

### Troubleshooting Google Drive

**"Google Drive API has not been used in project" error:**
- Enable the Google Drive API in Google Cloud Console
- Go to: https://console.cloud.google.com/apis/api/drive.googleapis.com
- Click "Enable" and wait a few minutes for propagation

**"Folder not found" or no images fetched:**
- Make sure the Drive folder is shared with the Google account you connected
- Either share the folder with your connected account (Viewer access)
- Or make the folder "Anyone with the link can view"

**Images not moving to Posted folder:**
- Reconnect Google Drive to grant full Drive permissions (not just readonly)
- The newer version uses `drive` scope instead of `drive.readonly`
- Click "Drive Connected" to disconnect, then "Connect Drive" again

**Drive folder URL not detected:**
- URL must be in format: `https://drive.google.com/drive/folders/FOLDER_ID`
- Add the URL to Client Notes and save
- The modal will show "Drive folder detected" when it finds a valid URL

### Troubleshooting Video Upload

**Video shows as grey box (no thumbnail):**
- Videos are auto-detected from URL extension (.mp4, .mov, .webm, .m4v)
- Refresh the page after uploading - thumbnail should appear
- The `#t=0.5` fragment seeks to 0.5 seconds to show a frame

**"Could not find media_type column" error:**
- The `media_type` column doesn't exist in the database
- Videos still work without it (auto-detected from URL)
- Optional: Add column with SQL: `ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image';`

**Video disappears after saving new post:**
- This was fixed - videos now upload directly to Supabase Storage
- Previously videos were stored as base64 which exceeded database limits
- If still happening, check browser console for specific error message

**Video uploaded but won't play:**
- Check the video format (MP4, MOV, WebM supported)
- Video file might be corrupted - try re-uploading
- Check Supabase Storage to verify file was uploaded

## Development History

### Recent Updates (2026-01-30)

1. **Carousel/Multi-Image Posts** - Support for Instagram carousel posts
   - Upload multiple images for a single post (creates carousel)
   - Table view shows primary image with draggable thumbnail strip below
   - **Drag-and-drop reordering** - Drag thumbnails to change image order
   - First image marked as "COVER" badge - this is what appears in feeds
   - Remove individual images with X button on hover
   - Carousel indicator badge shows total image count (e.g., "3")
   - Click thumbnails to view full carousel slideshow with navigation
   - Calendar view shows purple carousel badge on posts with multiple images
   - Post editor supports adding/removing/reordering images in grid layout
   - Late API receives all images in correct order for scheduling
   - Database migration: `add-carousel-support-schema.sql`
   - Videos cannot be mixed with images in carousel (single video only)
   - **Key learnings:**
     - Always run database migration before using feature
     - Changes must be committed & pushed for Vercel deployment
     - Existing posts need multiple images uploaded to show carousel UI
     - First image in array = cover image shown in Instagram feed

2. **Post Rescheduling to Late API** - Sync date changes to scheduled posts
   - When dragging posts in calendar or editing dates, Late API is updated
   - Posts stay scheduled (don't become drafts) using `isDraft: false`
   - Late post ID stored in database for future updates
   - Database migration: `add-late-post-id-schema.sql`

3. **Caption & Hashtag Sync to Late** - Edit content after scheduling
   - Caption edits auto-sync to Late API (500ms debounce)
   - Hashtag edits auto-sync to Late API
   - Works for all clients with scheduled posts
   - Console logs show sync status

4. **Washco Express Image Guidelines** - Client feedback learnings
   - Added "Critical Learnings" section to profile.md
   - Image-caption matching rules documented
   - Touch-free messaging requirements
   - Quality control checklist added

### Recent Updates (2026-01-22)

1. **Canva MCP Workflow for Branded Templates**
   - Integrated Canva MCP for clients with specific branded templates
   - Workflow: Generate plain AI images → Export from Canva → Upload to Supabase
   - Brand kit support: Use `brand_kit_id` parameter for on-brand designs
   - Limitation: Canva AI doesn't perfectly match custom templates (logo position, text style)
   - Best practice: Generate plain images, let user apply overlay manually in their Canva template

2. **New Client Profile: Abercrombie Ridge**
   - Country retreat/holiday home near Taralga, NSW
   - Pet-friendly accommodation
   - AI generates Australian bush landscapes, golden hour lighting
   - Profile stored in `clients/abercrombie-ridge/profile.md`

3. **Washco Express Content Workflow**
   - Uses Canva brand kit "Wash Co" for font/color consistency
   - Plain AI images uploaded to platform
   - User adds logo badge + headline text manually in Canva template
   - Mix of car wash and dog wash themed content

4. **Client On-Hold Process**
   - BLVD Drinks removed from platform (client paused)
   - Local documentation preserved for when they return
   - Script pattern: `scripts/remove-[client-name].mjs`

5. **New Scripts Added**
   - `scripts/add-washco-feb-posts.mjs` - Washco Express February content
   - `scripts/add-abercrombie-feb-posts.mjs` - Abercrombie Ridge February content
   - `scripts/remove-blvd-drinks.mjs` - Remove client from platform

### Updates (2026-01-20)

1. **Click-to-Add Posts in Calendar View** - Quickly add posts by clicking on any date
   - Click anywhere on a date cell in Calendar View to add a new post for that date
   - Post Editor opens with the clicked date pre-selected
   - Clicking on existing posts still opens post details (doesn't trigger add)
   - Works alongside drag-and-drop rescheduling

**Deployment Note:** This project deploys to `seam-media-content-manager` on Vercel. To deploy:
```bash
vercel link --yes --project seam-media-content-manager
vercel --prod
```

### Updates (2025-12-18)

1. **Persistent Login (30-Day Sessions)** - Browser remembers login for 30 days
   - Sessions saved to browser localStorage with automatic expiry
   - Auto-login on return visits within 30 days (no PIN required)
   - Master account remembers which client was selected
   - Loading screen shown while restoring session
   - Logout button added to header (top-right, door icon)
   - Click logout to clear session and return to login screen

2. **Drag and Drop Calendar Rescheduling** - Easily reschedule posts by dragging
   - Drag any post in Calendar View to a different date
   - Visual feedback shows where post will be dropped
   - Date updates automatically in database
   - Works for all post statuses

3. **Revision Status** - New status option for client feedback
   - Added "Revision" status for posts that need changes
   - Shows in red to indicate action needed
   - Useful when client provides feedback requiring updates

### Updates (2025-12-11)

1. **Client-Specific Social Account Assignment** - Assign specific Late social profiles to each client
   - Open Client Notes and scroll to "Social Media Accounts" section
   - Select which Facebook, Instagram, TikTok etc. accounts belong to each client
   - Schedule Posts modal now only shows accounts assigned to the current client
   - Prevents accidentally posting to wrong client's social accounts

2. **Auto-Schedule on Approval** - Posts automatically schedule when approved
   - When post status changes to "Approved", it auto-schedules to client's assigned social accounts
   - Schedules for the post's date at 12:00 PM
   - Status automatically updates to "Posted" after successful scheduling
   - Requires social accounts to be assigned to the client first

3. **Calendar View Status Colors** - Visual status indicators in calendar
   - **Draft**: Light grey
   - **Generated**: Purple
   - **For Approval**: Amber/Yellow
   - **Approved**: Green
   - **Posted**: Darker grey
   - Hover shows status in tooltip

4. **Duplicate Post Button** - Copy existing posts easily
   - Click the copy icon (next to trash) under the post date
   - Creates exact duplicate with same image, caption, hashtags, and date
   - Duplicate is always set to "Draft" status
   - Appears below the original post

5. **Hide Drafts from Clients** - Draft posts only visible to agency
   - Clients (non-master accounts) cannot see Draft posts
   - Drafts hidden from both Table View and Calendar View
   - Agency/master account (PIN 1991) can see all posts including Drafts

6. **Database Migration Required** - Run this SQL to enable social account assignment:
   ```sql
   ALTER TABLE clients
   ADD COLUMN IF NOT EXISTS late_profile_ids JSONB DEFAULT '[]'::jsonb;
   ```

7. **Google Drive Integration** - Fetch images from client's Google Drive folders
   - Connect Google Drive via floating button (bottom-right, blue button)
   - Add Drive folder URL to Client Notes section
   - When generating posts, option to auto-attach random images from Drive folder
   - Images downloaded from Drive and uploaded to Supabase Storage
   - Uses same Google OAuth client as Gmail integration
   - Auto-enables image option when Drive folder detected in client notes
   - **Posted Folder Feature**: Used images automatically moved to "Posted" subfolder
     - Create a "Posted" folder inside your Drive image folder
     - After an image is used, it's moved to Posted so it won't be selected again
     - If "Posted" folder doesn't exist, it's created automatically
   - **Important**: Must enable Google Drive API in Google Cloud Console
     - Go to APIs & Services → Library → Search "Google Drive API" → Enable
     - Same project as Gmail API (uses same OAuth client)

2. **Video Scheduling Fix** - Videos now schedule correctly to Late API
   - Auto-detects video type from URL extension (.mp4, .mov, .webm, .m4v)
   - Sends correct `mediaType: 'video'` to Late API (not 'image')
   - Fixes "unrecognized file format" error when scheduling videos
   - Videos posted as Reels on Instagram, standard videos on Facebook/TikTok

3. **Video Upload & Thumbnail Fix** - Videos now upload and display correctly
   - Videos uploaded in "Add Post" modal now go directly to Supabase Storage (not base64)
   - Fixed "Could not find media_type column" error by removing media_type from insert
   - Video thumbnails now show properly in table view (auto-detect from URL extension)
   - Videos show "VIDEO" badge overlay and "Change Video" button
   - Video preview modal works correctly when clicking on video posts
   - `#t=0.5` added to video URLs to show first frame as thumbnail

4. **Bulk Post Generation (AI)** - Generate multiple posts at once with AI
   - Click "Generate Posts" button (agency-only, purple gradient button)
   - Select number of posts (3, 5, 7, 10, or custom)
   - Pick start date and posting frequency (daily, every 2 days, every 3 days, weekly)
   - AI generates unique captions and hashtags for each post using brand context
   - Posts created with "Generated" status ready for review
   - Uses Gemini 2.0 Flash for high-quality content generation

5. **Client Management Dashboard** - New agency-only weekly overview for all clients
   - Access via "Client Management" tab (master account only)
   - Single status row per client showing overall weekly status
   - Color-coded status indicators:
     - **Green (Posted)** - All posts for the week have been posted
     - **Blue (Approved)** - Posts approved, ready to schedule
     - **Yellow (Awaiting Approval)** - Posts waiting for client approval
     - **Grey (In Progress)** - Posts still being worked on (Draft/Generated)
     - **Red (Outstanding)** - URGENT: Posts overdue or still awaiting approval
   - Outstanding triggers when:
     - Post date has passed but not posted yet
     - Post is still "For Approval" (should have been approved by now)
   - Week navigation with previous/next buttons
   - Today's date highlighted in header
   - Shows post count per client
   - AI Status Report button (coming soon)

### Updates (2025-12-10)

1. **Video Upload & Scheduling Support** - Full video support for social media posts
   - Upload videos (MP4, MOV, WebM, M4V) up to 500MB
   - Videos displayed with play controls in editor and preview
   - Video indicator badges in table and calendar views
   - Instagram videos automatically posted as Reels
   - Facebook videos posted to Page timeline
   - Late API integration passes correct media type ('image' or 'video')
   - Database `media_type` column tracks content type
   - Run `add-video-support-schema.sql` in Supabase to enable

2. **New Client: Washco Express** - Added to CLIENT-PINS.md

### Updates (2025-12-03)

1. **Client Notes Email Notifications** - Get email alerts when clients add feedback to posts
   - Uses Resend for email delivery (free tier: 3,000 emails/month)
   - External cron via cron-job.org (every 15 minutes) - works on Vercel free plan
   - 20-minute batching delay so clients can finish typing
   - Emails grouped by client with post details
2. **Gemini Image URL Fix** - Fixed "Base64 decoding failed" error when generating captions
   - Now properly fetches images from Supabase URLs and converts to base64 for Gemini API

### Updates (2025-12-01)

1. **Late API Integration** - Schedule posts to Instagram, Facebook, TikTok, etc. via Late API
2. **Supabase Storage** - Images now stored as public URLs instead of base64
3. **Auto Image Cropping** - Images automatically cropped to fit Instagram's aspect ratio (0.75 to 1.91)
4. **Storage Cleanup** - Automatic deletion of images 60 days after posting
5. **Schedule Posts Button** - New button for agency to schedule all approved posts
6. **Platform Selection Modal** - Select which platforms to post to with visual icons

### Previous Updates (2025-11-28)

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
- `add-meta-integration-schema.sql` - Meta API integration schema
- `add-notes-tracking.sql` - Client notes notification tracking columns
- `add-video-support-schema.sql` - Video upload support (adds media_type column)
- `add-late-post-id-schema.sql` - Late post ID for rescheduling support
- `add-carousel-support-schema.sql` - Carousel/multi-image post support (adds image_urls column)

### Source Code
- `App.tsx` - Main application with scheduling logic
- `types.ts` - TypeScript interfaces including Meta credentials, Gmail settings
- `components/ClientManagement.tsx` - Weekly client overview dashboard (agency-only)
- `components/GeneratePostsModal.tsx` - Bulk AI post generation modal (agency-only)
- `components/ImageCarousel.tsx` - Carousel slideshow component for multi-image posts
- `components/PostEditor.tsx` - Post creation/editing modal with multi-image upload
- `services/geminiService.ts` - AI caption generation and feedback processing
- `services/gmailService.ts` - Gmail OAuth and email sending
- `services/driveService.ts` - Google Drive OAuth and file fetching
- `services/lateService.ts` - Late API integration for social scheduling
- `services/storageService.ts` - Supabase Storage upload with auto-cropping
- `src/services/metaService.ts` - Meta API service (legacy)
- `src/components/MetaSettings.tsx` - Settings UI for Meta integration
- `api/late-profiles.ts` - Serverless function to fetch Late accounts
- `api/late-schedule.ts` - Serverless function to schedule posts via Late
- `api/late-reschedule.ts` - Serverless function to update/cancel scheduled posts
- `api/cleanup-storage.ts` - Serverless function for storage cleanup
- `api/notify-notes.ts` - Serverless function for client notes email notifications
- `api/post-to-meta.ts` - Vercel serverless function for Meta posting (legacy)
- `public/oauth/callback/index.html` - Gmail OAuth callback handler
- `vercel.json` - Vercel configuration with cron jobs

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

## Claude Code Content Creation

Automate post creation using Claude Code with AI-generated captions, hashtags, and images.

### Folder Structure

```
clients/
  client-name/
    profile.md          # Brand voice, services, hashtags, learnings
    assets/             # Logo files, brand templates
      logo.png
      logo-white.png
  TEMPLATE.md           # Template for new clients
scripts/
  create-posts.mjs      # Main post creation script
```

### Client Profile Setup

Each client has a `profile.md` with:
- **Brand voice & tone** - How to write captions
- **Services/products** - What to promote
- **Visual style** - Image guidelines
- **Hashtags** - Commonly used tags
- **Learnings** - What works/doesn't work for AI generation

### Creating Posts with Claude Code

**Basic usage:**
```bash
VITE_SUPABASE_URL="https://xxx.supabase.co" \
VITE_SUPABASE_ANON_KEY="your_key" \
VITE_GEMINI_API_KEY="your_gemini_key" \
node scripts/create-posts.mjs \
  --client "Client Name" \
  --dates "2026-02-01,2026-02-03,2026-02-05" \
  --topics "Topic 1,Topic 2,Topic 3"
```

**Or just ask Claude Code:**
> "Create 3 posts for Pace Electrical for Feb 15, 18, and 22 about LED lighting, smoke alarms, and power points"

### Image Generation Options

| Client Type | Image Source | Example |
|-------------|--------------|---------|
| **E-commerce** | Download from client's website (Shopify CDN) | Mabii Co |
| **Service Business** | AI-generated via Gemini 3 Pro Image | Pace Electrical |
| **Finance/Corporate** | AI-generated stock-style photos | Efficient Finance |
| **Hospitality/Retreat** | AI-generated landscape/interior photos | Abercrombie Ridge |
| **Branded Template** | Canva MCP + plain AI base images | Washco Express |

### AI Image Guidelines (Learnings)

**DO:**
- Use explicit, detailed prompts
- Specify "no logos, no text, no branding"
- Focus on THE ASSET or PRODUCT, not the business
- Include "Australian setting" for local relevance
- Use "stock photography style" for clean results

**DON'T:**
- Let AI add fake logos or branding to images
- Mix up client contexts (keep prompts client-specific)
- Use generic prompts like "business image"
- Include workers/tradespeople unless relevant

### Client-Specific Learnings

**Pace Electrical (Service Business):**
- Show the work result, not workers
- Mention "25 years experience" in captions
- Include phone number (1300 070 569) in ~50% of posts
- Hashtags: #electrician #paceservices #licensedtrades

**Efficient Finance (Finance Broker):**
- Show THE ASSET being financed (boat, car, caravan)
- NOT an electrical company - don't confuse with tradespeople
- Clean stock photos without logos or text overlays
- Focus on aspirational lifestyle imagery
- Hashtags: #efficientfinance #assetfinance #boatfinance

**Mabii Co (Kids Clothing):**
- Use ACTUAL product photos from their website
- Download from Shopify CDN, don't AI generate
- Playful, warm tone with emojis
- "Meet the [Product Name]" format
- Address parent concerns (durability, washability)
- Hashtags: #mabiikids #playapproved #toddlerlife

**Washco Express (Car/Dog Wash):**
- Has branded Canva template - DO NOT generate complete posts with AI
- Generate plain base images only (no text, no logos)
- User adds logo badge and headline text overlay manually in Canva
- Mix of car wash and dog wash content (alternate themes)
- Friendly, fun tone with emojis encouraged
- Mention location: "Washco Express Broadmeadows"
- Hashtags: #washcoexpress #carwash #dogwash #K9000 #broadmeadows
- **CRITICAL - Image-Caption Matching:**
  - Image MUST match caption content (dog wash image for dog wash caption)
  - NEVER use hand washing images - Washco is TOUCH-FREE automated
  - Automated wash bays, foam jets, touchless equipment only
  - See `clients/washco-express/profile.md` for full quality checklist

**Abercrombie Ridge (Country Retreat):**
- AI-generated Australian countryside/bush landscapes
- Golden hour lighting, peaceful serene compositions
- Pet-friendly content (dogs welcome)
- Interior shots: cozy bedrooms with views, living spaces
- Outdoor features: spa/hot tub, fire pit, walking trails
- Peaceful, calming tone - "escape from the everyday"
- Themes: sunrise/sunset, stargazing, nature walks, relaxation
- Hashtags: #abercrombieridge #countryretreat #taralga #nswholidays

**Advanced Rigging (Structural Steel Erection Specialist, Perth WA):**
- B2B industrial brand - posts go to Facebook, Instagram AND LinkedIn
- ONE service only: structural steel erection. Never imply general rigging or multiple trades
- Target the INDUSTRIAL market (warehouses, factories, processing plants, distribution centres), NOT commercial/residential, even though they do both
- AI-generated stock-style industrial imagery: steel frames/portal frames being erected, cranes lifting steel beams, steel erectors in full PPE at height, industrial builds against blue sky
- Always prompt: "no logos, no text overlays, no fake branding, no readable signage, no identifiable faces"
- Professional, confident, no-nonsense B2B tone - minimal/no emojis, no hype
- Safety is a core pillar (height safety, PPE, contractor platforms: CM3, Pegasus, Rapid Global, Procore, Hammertech, Safety Culture, Aconex, 1Breadcrumb, Sign on Site)
- Tagline: "Lifting Standards." (use sparingly). Brand: black wordmark + red R, white/light grey
- No phone in posts - enquiries to admin@advancedrigging.au. Don't invent projects/clients/tonnages/safety stats
- PIN: 3703 | Contact: Jon Adams (jon@advancedrigging.au) | Launch: 3 July 2026

**HENRY @ Lawson Riverside Suites (Riverside Cafe, Wagga Wagga NSW):**
- REAL PHOTOS ONLY - use the professional photo library at `/Volumes/PortableSSD/Clients/claremont/Images/`
- Never AI-generate food images - client has professional photography for all menu items
- Short, punchy cafe captions - 1-3 short paragraphs, hook first line
- Mention the Murrumbidgee riverside setting naturally and often
- Wagga Wagga called out by name in most posts (local SEO + community)
- Cafe is NEW - don't reference loyal regulars or years of history
- Brand voice: warm, welcoming, local - friendly neighbourhood cafe, never corporate
- Wagga gets real winters - cosy/foggy morning content works here (unlike QLD clients)
- Content pillars: menu hero, coffee, riverside lifestyle, local love, hotel cross-promo, behind the counter
- Hashtags: #HenryWagga #WaggaWagga #WaggaCafe #WaggaEats #RiversideCafe #WaggaCoffee #LawsonRiversideSuites
- PIN: 2650 | Contact: Jack MacKinnon (jack@claremontgroup.com.au)

**Phoenix Hospitality Group (Hospitality Labour Hire):**
- Labour hire company for hospitality industry - NOT just cleaning
- Services: Kitchen Stewards, Apprentice Chefs, Qualified Chefs, Bar Staff, Front of House, Commercial Cleaning
- Gold Coast / Brisbane / Sunshine Coast service area
- 20+ years industry experience
- Professional, reliable, warm tone
- Caption style: Start with emoji, short punchy sentences, end with phone number
- Include contact: 1300 409 920 and admin@phoenixhospitalitygroup.com.au
- Image style: Real photos of staff in branded uniforms (dark polo with orange Phoenix logo), commercial kitchens, team photos
- Branded graphics: Dark background, orange accents, "LATEST NEWS" or "Now Hiring" headers
- Hashtags: #PhoenixHospitality #HospitalityStaff #ApprenticeChef #KitchenStaff #GoldCoast #Brisbane

### Post Status

Posts are created with status **"For Approval"** (not Draft) so clients can review immediately.

### Environment Variables Required

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### Adding a New Client

1. Create folder: `clients/client-name/`
2. Copy `clients/TEMPLATE.md` to `clients/client-name/profile.md`
3. Fill in brand details, services, tone
4. Add logo files to `assets/` folder
5. Add client to Supabase database
6. Test with a single post before bulk creation

### Putting a Client on Hold

When a client pauses their social media management:

1. **Remove from platform** (keeps it clean for active clients):
   ```javascript
   // Run script or SQL to delete client and their posts from Supabase
   // Example: scripts/remove-[client-name].mjs
   ```

2. **Keep local documentation** - Don't delete the `clients/client-name/` folder
   - Profile.md contains brand voice, hashtags, learnings
   - Useful when client returns

3. **Update CLIENT-PINS.md** - Add note that client is on hold (optional)

4. **Re-adding later** - Run SQL to recreate client:
   ```sql
   INSERT INTO clients (name, pin, contact_name, brand_name)
   VALUES ('Client Name', 'XXXX', 'Contact', 'Brand');
   ```

### Canva MCP Integration (For Branded Templates)

Some clients (e.g., Washco Express) have branded templates requiring text overlays and logos that AI can't generate directly. Use Canva MCP to create these.

**Setup:**
```bash
claude mcp add --transport http Canva https://mcp.canva.com/mcp
```

**After adding:**
1. Restart Claude Code
2. First use will prompt browser authorization
3. Click "Allow" to connect your Canva account

**Canva MCP Capabilities:**
- Search existing Canva designs
- Create new designs from prompts
- Autofill brand templates
- Export designs as images/PDFs

**Workflow for Branded Template Clients:**
1. Client provides Canva template link (add to profile.md)
2. Generate base images with AI (no text/logos)
3. Use Canva MCP to apply branded overlay
4. Export and upload to post

**Client-Specific Notes:**

**Washco Express (Car/Dog Wash):**
- Has branded Canva template with blue tint, logo badge, headline text
- Template link: https://www.canva.com/design/DAGouOYbdwo/edit (stored in profile.md)
- Brand kit available in Canva: "Wash Co" (ID: kAG5FRdLFo8)
- **Workflow Option 1 (Canva MCP):**
  1. Generate designs with brand kit using `generate-design` tool
  2. Export with `export-design` tool
  3. Download and upload to Supabase
  4. User manually adds logo/text overlay in Canva template
- **Workflow Option 2 (Plain AI images):**
  1. Generate plain images with Gemini (no text/logos)
  2. Upload directly to platform
  3. User downloads and applies overlay in Canva template manually
- Content mix: Alternate car wash / dog wash themes
- Headlines from profile: "Don't lift a finger", "Keep it glossy!", "Treat your best friend", etc.
- Emojis encouraged: 🚗 🐶 ✨ 💦 🧼

**Abercrombie Ridge (Country Retreat):**
- Holiday home rental near Taralga, NSW (7272 Taralga Road, Curraweela 2580)
- Pet-friendly accommodation - dogs welcome
- AI generates Australian bush/countryside landscapes
- Key themes: nature walks, outdoor spa, fire pit, stargazing, peaceful mornings
- Golden hour lighting preferred (sunrise/sunset)
- Interior shots: luxury bedrooms with views, cozy living spaces
- Tone: Peaceful, calming, inviting - "escape from the everyday"
- Headlines from their style: "Stroll. Relax. Enjoy.", "Peace Awaits Here", "Wake Up in Nature"
- Profile stored in: `clients/abercrombie-ridge/profile.md`

**Mediterranean Blu Spritz (Blue Wine):**
- DO NOT include bottles in AI images (can't reproduce labels correctly)
- Generate glasses of blue wine only for AI lifestyle shots
- Use actual product photos from website when bottle is needed
- Mediterranean summer aesthetic, golden hour lighting

**Mabii Co (Kids Clothing):**
- DO NOT use AI-generated images
- Download actual product photos from their Shopify website
- Use real product images to maintain authenticity

**Flagworks (Australian Flags):**
- Mix of website product images + AI-generated lifestyle shots
- AI images: flags flying on poles, backyard scenes, blue sky
- Website images: actual product photos from flagworks.com.au

**Phoenix Hospitality Group (Hospitality Labour Hire):**
- Labour hire company specialising in hospitality staffing - NOT just cleaning
- Service area: Gold Coast, Brisbane, Sunshine Coast, Queensland
- Services: Kitchen Stewards, Apprentice Chefs, Qualified Chefs, Bar Staff, Front of House, Commercial Cleaning
- 20+ years industry experience, HACCP certified
- Real photos preferred: Staff in branded uniforms (dark polo with orange Phoenix logo), commercial kitchens, team photos
- Branded graphics: Dark background, orange/gold accents, "LATEST NEWS" or "Now Hiring" headers, QR codes
- Caption structure: Start with emoji, short punchy sentences, call to action, phone number, 2-3 hashtags
- Always include phone (1300 409 920) and email (admin@phoenixhospitalitygroup.com.au)
- Mix of recruitment posts (for job seekers) and service posts (for venues)
- Profile stored in: `clients/phoenix-hospitality/profile.md`

---

## Future Enhancements

Potential features to add:
- [x] ~~Email notifications when posts are approved~~ ✅ **COMPLETED** - Gmail API integration
- [x] ~~Social media API integration~~ ✅ **COMPLETED** - Late API (replaced Meta direct integration)
- [x] ~~Automated scheduling when status = "Approved"~~ ✅ **COMPLETED**
- [x] ~~AI Caption Generation~~ ✅ **COMPLETED** - Gemini 2.0 Flash
- [x] ~~Supabase Storage for images~~ ✅ **COMPLETED** - Public URLs for Late API
- [x] ~~Auto image cropping for Instagram~~ ✅ **COMPLETED** - Aspect ratio 0.75-1.91
- [x] ~~Storage cleanup~~ ✅ **COMPLETED** - Auto-delete after 60 days
- [x] ~~Client notes notifications~~ ✅ **COMPLETED** - Resend + cron-job.org
- [x] ~~TikTok/Reels video support~~ ✅ **COMPLETED** - Full video upload and scheduling
- [x] ~~Google Drive integration~~ ✅ **COMPLETED** - Fetch images from client Drive folders
- [ ] Refresh token for Gmail (avoid re-auth every hour)
- [ ] Client-specific branding/themes
- [ ] Usage analytics per client
- [ ] Export to PDF/Excel
- [ ] Comment threads and @mentions
- [ ] File attachments beyond images/videos
- [ ] Mobile app

## License

© 2025 Seam Media

---

**Questions?** Check the troubleshooting section or create an issue on GitHub.
