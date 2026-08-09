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
- ✨ **AI Caption Generation** - Generate captions and hashtags from images using OpenAI (master account only)
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
- 🔔 **Client Portal Notifications** - In-platform feedback, support and automation notifications; bulk portal emails are disabled
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

### 2. OpenAI API Setup (For AI Caption Generation)

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a project API key
3. Add it to Vercel as the server-side `OPENAI_API_KEY` for Production and Preview
4. Optionally set `OPENAI_CAPTION_MODEL`; it defaults to `gpt-5.6-luna`
5. **Usage:** The master account can generate captions from post images, update captions from feedback, and create batches of post ideas
6. **Security:** Never use a `VITE_` prefix for the caption key because Vite exposes those values to browsers
7. **Style:** Generates warm, friendly captions with Australian spelling, short paragraphs, no em dashes, and 4-5 relevant hashtags

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

### 6. Client Notes and Portal Notifications

Automated portal change-notification emails are hard-disabled. In-platform notifications, feedback tracking and automation remain active. Do not re-enable the legacy notes email cron without an explicit product decision. Weekly analytics reports are a separate, explicit opt-in email flow controlled by `CLIENT_ANALYTICS_EMAILS_ENABLED`.

### Monday Client Scheduling Check

A Codex automation runs every Monday at 9:00 am in the `Australia/Melbourne` timezone and posts its report in the originating Codex task.

The check reviews the current Monday-to-Sunday window for every active client shown in the management dashboard. A client is reported as outstanding when:

- no posts are scheduled for the week; or
- one or more scheduled posts are not yet `Approved` or `Posted`.

The check ignores:

- Krystal Perkins
- Abercrombie Ridge
- Mascot Kings Football Club

It also excludes the master account and records that are cancelled or hidden as inactive in the live dashboard.

Run the same read-only check manually with:

```bash
npm run check:weekly-scheduling
```

#### 6.1 Supabase Setup

Run `add-notes-tracking.sql` in Supabase SQL Editor to add tracking columns:

```sql
-- Adds notes_updated_at and notes_notified columns
-- Creates trigger to track when notes are modified
```

#### 6.2 Resend Setup (Weekly Analytics Email Service)

The Resend transport is used by the separate weekly analytics report flow. It is not used for portal feedback, support or automation alerts.

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

#### 6.3 Legacy External Cron Setup (cron-job.org)

This is retained as historical documentation only. Do not configure it to send portal notifications. `api/notify-notes.ts` now exits without sending when portal email notifications are disabled.

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
3. The legacy cron endpoint may still be called for compatibility
4. The endpoint exits without sending while portal email notifications are disabled
5. In-platform notifications and the tracked feedback workflow continue to operate

#### 6.5 Testing

The old test URL is retained for reference only. It must not be used to send portal email alerts while the application-level shutdown is in place:
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

### Product UI and Motion Redesign (2026-08-08)

The production interface received two visual passes. The first pass established a reusable motion and surface system, but it was too restrained to be noticeable in normal use. The second pass made the product hierarchy visibly different while preserving the existing workflows and data behaviour.

#### Core product lesson

Micro-interactions alone do not create a perceptible redesign. The first pass added polished transitions, softened surfaces and improved focus states, but most of the changes appeared only during interaction. A user who remained on the main calendar screen could reasonably conclude that nothing had changed.

For a redesign to feel meaningful:

- Change the first viewport and the screens used most often.
- Improve information hierarchy before decorating individual controls.
- Pair motion with visible structural changes such as contrast, spacing, grouping and typography.
- Keep important actions and current state readable without requiring hover.
- Validate the result from the user's normal starting screen, not only from isolated components.

The stronger pass therefore prioritised the app shell, home screen, calendar workspace, monthly status summary, command bar, table and visual calendar.

#### Visual direction

The current direction uses a high-contrast dark navigation rail with a bright editorial workspace:

- The sidebar uses deep forest green with a pale green active state.
- Home and calendar screens begin with a large dark hero panel.
- Primary workspace content sits on a soft green-grey canvas with a subtle grid texture.
- White surfaces use quieter borders and purposeful shadows instead of heavy card chrome.
- Rounded corners are consistent and generally larger on major containers than on controls.
- Brand green remains the primary action colour. Purple and blue are reserved for distinct feature or scheduling actions.

This creates a stronger separation between navigation, page context, controls and editable content.

#### Information hierarchy

The calendar now exposes the most important monthly state before the table:

- Total content
- Needs review, combining `For Approval` and `Revision`
- Approved
- Published

Month selection and table/calendar switching live in one command bar. Table actions are grouped in a separate row with the current item count and month label. This is easier to scan than several unrelated rows of buttons.

The inactive `Export to CSV` control was removed because it had no behaviour. Do not show controls that imply a completed feature unless the action works.

#### Table and calendar learnings

The content table is the highest-density screen and needs stronger hierarchy than a generic bordered grid:

- Use a distinct outer surface with one shadow rather than adding emphasis to every cell.
- Keep column headings sticky, compact and high contrast.
- Use shorter labels such as `Caption`, `Status`, `Content idea` and `Comments` where context is already clear.
- Give a hovered row a left-edge accent so the user's eye can follow wide rows.
- Keep editable fields visually quiet at rest, then strengthen their border and background on hover or focus.
- Stagger row entrance animation slightly, but cap the delay so long months do not feel slow.
- Preserve the sticky date column and existing editing, approval, upload and scheduling behaviour.

The visual calendar follows the same system with rounded day cells, quieter empty days, pale green weekday headings, clearer navigation controls and slightly elevated post cards.

#### Motion system

Motion is defined centrally in `styles.css` and state transitions are started through `runUiTransition()` in `ui-motion.ts`.

Current motion rules:

- Page changes fade and move approximately 5 to 12 pixels.
- Modal backdrops fade in and blur gently.
- Dialog panels enter with a small upward movement and scale from `0.985` to `1`.
- Dashboard cards, metrics, notifications and content rows can enter in short staggered sequences.
- Buttons use a small pressed scale state.
- Interactive cards lift by 2 pixels on hover.
- Navigation, month selection and view changes use the browser View Transition API when available.
- Unsupported browsers fall back to immediate React state updates.
- `prefers-reduced-motion: reduce` shortens all non-essential animation and transition durations to effectively zero.

Keep motion between roughly 160ms and 460ms. Avoid bounce, large travel distances, scroll trapping or animation that delays editing.

#### Styling architecture

The app still uses Tailwind through the existing CDN configuration. The stronger design layer is a small conventional stylesheet imported by `index.tsx` after the existing page styles.

Reusable classes include:

| Class | Purpose |
| --- | --- |
| `.ui-page` | Page entry and View Transition target |
| `.ui-stagger` | Short sequential entrance for direct children |
| `.ui-surface` | Shared border, background and shadow treatment |
| `.ui-surface-interactive` | Hover lift for interactive cards |
| `.content-hero` | Calendar hero presentation |
| `.home-hero` | Home hero presentation |
| `.calendar-command-bar` | Sticky month and view controls |
| `.content-table-shell` | Main table surface |
| `.content-row` | Row entrance, hover and field styling |

When adding global modal styles, do not apply `overflow: hidden` to every modal panel. Several existing panels rely on `overflow-y-auto`; overriding it would make long forms impossible to scroll.

#### Accessibility and interaction requirements

- Preserve keyboard navigation and visible focus rings.
- Keep button and input labels available to assistive technology.
- Use `aria-label` when an icon-only control has no visible label.
- Keep status information in text as well as colour.
- Do not animate SVG icons directly when a wrapper can be animated instead.
- Maintain `prefers-reduced-motion` support whenever new motion is added.
- Avoid changing data, approval or scheduling logic during purely visual work.

#### React implementation lessons

- Derive monthly totals from the already filtered post collection during render. Do not duplicate them in state.
- Keep transition code in one helper so feature components do not repeat browser capability checks.
- Use stable database IDs as row keys.
- Avoid introducing new effects for values that can be derived synchronously.
- Keep animation primarily in CSS so it does not create extra React render state.
- Preserve the existing debounced editor inputs, which protect typing performance.

#### Deployment and verification

Vercel deploys the current workspace contents, including uncommitted files. A dirty worktree may contain unrelated unpublished features, so production deployment requires an explicit decision to publish the complete current workspace.

The release sequence used for this redesign was:

1. Run `npm run build`.
2. Run `git diff --check`.
3. Deploy the current project with Vercel production targeting.
4. Confirm the deployment reports `Ready`.
5. Confirm the stable production URL returns HTTP 200.
6. Confirm the stable alias points at the new deployment.

The existing build currently reports two non-blocking optimisation warnings:

- `@google/generative-ai` is imported both dynamically and statically, so it remains in the main chunk.
- The main JavaScript bundle is larger than Vite's default 500 kB warning threshold.

These warnings do not indicate a failed release, but future performance work should split heavy agency-only tools such as bulk generation into lazy-loaded modules.

#### Implementation files

| Purpose | File |
| --- | --- |
| App shell, calendar hero, command bar, table and visual calendar | `App.tsx` |
| Dark navigation rail | `components/ClientPortalSidebar.tsx` |
| Home hero and overview cards | `components/ClientHome.tsx` |
| Shared visual and motion system | `styles.css` |
| View Transition helper and reduced-motion fallback | `ui-motion.ts` |
| Global stylesheet import | `index.tsx` |

#### Known limitations and next improvements

- The dense table still uses a desktop-first minimum width and horizontal scrolling on smaller screens.
- The strongest next mobile improvement would be a purpose-built card view rather than compressing every table column.
- The main bundle should eventually be split by route or feature.
- Browser-based visual regression coverage would make future style changes safer.
- New features should reuse the shared surface and motion classes rather than introducing one-off visual systems.

### Instagram Warm Outreach for New Business Followers

When a business follows the Seam Media Instagram account, treat it as a warm lead rather than a cold prospect. They have already seen enough of the page to show interest, so the first message should be conversational, personalised and easy to answer.

**Recommended approach:**
- Send the message soon after the business follows.
- Lead with the fact that they followed the account and thank them in the opening sentence. A natural opener is `Thanks for the follow legends!`
- Do not begin with `Hi`, `Hey` or another generic greeting. The thank-you should be the opening line.
- Look through their account before writing.
- Mention one genuine, specific content opportunity based on what they already post.
- For graphic-design outreach, offer to mock up a complimentary sample using one of their existing projects if they are interested.
- When producing complimentary warm-lead graphics, create and deliver exactly one strong concept per warm lead unless Heath explicitly requests a different quantity. The historical Dwellix case study below is not the current default.
- Depending on the conversation, either make the complimentary sample offer directly or ask whether they manage their socials themselves or in-house.
- Keep the first message helpful and low pressure. Do not lead with follower numbers or a full service pitch.
- Adjust the observation to the maturity of the account. For a basic page, suggest transformation or process reels. For a polished brand, suggest ways to build on its existing content.
- If they reply, provide useful ideas before transitioning into an offer to create or manage the content.

**Reusable complimentary graphic structure:**

```text
Thanks for the follow legends! Love the [specific work, projects or transformations] you’re sharing. You’ve got [genuine positive observation about their photos, work or brand].

I think the work would look great as [specific graphic ideas suited to the account]. If you’re interested, I’d be happy to mock up a complimentary sample using one of your existing projects. No pressure at all.

Cheers,
Heath
```

**Message formatting rules:**
- Use Australian spelling and Heath's friendly-professional tone.
- Never use em dashes.
- Keep paragraphs short and natural for Instagram.
- Always finish outreach messages with either `Thanks,` and `Heath`, or `Cheers,` and `Heath`, on separate lines.
- Never send a warm-lead outreach message without one of these sign-offs.
- Leave one blank line before the sign-off and keep the sign-off correctly spaced:

```text
Thanks,
Heath
```

or

```text
Cheers,
Heath
```

- Personalise every new lead rather than sending the same generic pitch.

### Dwellix Client Acquisition: Cross-Platform Short-Form Pitch

Research and pitch work completed 23 July 2026 for:

- Instagram: `https://www.instagram.com/dwellix.au/`
- Website: `https://dwellix.com.au/`
- Business: premium architecturally designed secondary dwellings and granny flats across Melbourne

#### Lead and conversion context

- Dwellix originated as a cold lead and converted into a client through organic Instagram outreach.
- Engagement included an Instagram follow and direct-message conversation.
- The opening message thanked them for the follow, positively acknowledged the brand and projects, identified an opportunity for more project-led Reels, and asked whether content was managed in-house.
- Dwellix confirmed that content is managed in-house and invited Seam Media to explain the offer.
- Seam Media created three custom cover concepts, simplified the offer around video editing and multi-channel distribution, and offered to send packages.
- Dwellix subsequently converted into a client.
- The supplied Instagram snapshot showed 13 posts and 294 followers. Treat these numbers as a dated snapshot only, not an evergreen sales claim.
- The account already had polished architectural visuals, façade packages, before-and-after concepts and educational carousel content. The opportunity was to increase distribution and turn existing project material into consistent video content, not to criticise the current brand.

#### Verified brand positioning

The website positions Dwellix as:

- "Not a granny flat. A second home."
- Architecturally designed secondary dwellings across Melbourne.
- Premium inclusions with transparent pricing.
- A fully managed, end-to-end experience covering design, approvals, finance, build and handover.
- Three 60 m², two-bedroom designs with multiple façade and specification tiers.
- A potential backyard-income and property-value proposition.

Be careful with numerical claims:

- The website states a 12 to 16-week build time once started.
- The website displays potential rent of $350 to $500 per week, subject to location and design.
- Do not place these figures on covers or in captions without the relevant qualification and client approval.
- Generated concept buildings must never be presented as completed Dwellix projects.

#### Core sales opportunity

Position the service as a simple content-repurposing and distribution system:

1. Start with Dwellix's existing project footage, renders, site visits, walkthroughs and team knowledge.
2. Turn each source asset into several short, useful vertical videos.
3. Add hooks, editing, voiceover, subtitles, covers and platform-ready formatting.
4. Distribute the content across multiple channels so Dwellix is not relying only on its existing Instagram audience.
5. Reuse one project across several angles to reduce the amount of new filming required.

The easy-buy benefit is not simply "more posts". It is more brand awareness, reach and potential enquiries from content Dwellix already has or can capture during normal project activity.

#### Recommended platform distribution

| Platform | Best use for Dwellix |
|----------|----------------------|
| Instagram Reels | Premium project visuals, transformations, façade choices, FAQs and enquiry-led videos |
| Facebook Reels | Broader homeowner reach, local sharing, project stories and retargetable engagement |
| YouTube Shorts | Searchable questions about permits, costs, timelines, designs and secondary dwellings |
| TikTok | Fast site updates, myth-busting, process clips and conversational education |
| LinkedIn | Investment insights, project milestones, partnerships, credibility and referral relationships |
| Google Business Profile | Completed projects, progress updates, reviews, services and local Melbourne visibility |
| Website | Embed the strongest videos on design, service and enquiry pages to build trust |

Do not describe distribution as identical copy-and-paste posting. The core edit can be reused, but hooks, captions, calls to action and pacing should be adjusted for each platform.

#### Strong Dwellix content pillars

- Empty backyard to finished second home.
- Potential backyard income and property use.
- Design, permits and build process.
- Façade and finish comparisons.
- Floor-plan and inclusion walkthroughs.
- What is included at each specification tier.
- Common site-assessment questions.
- Build-stage progress updates.
- Permit and approval education.
- Timeline explanations with correct qualifications.
- Client journeys and handovers.
- Frequently asked questions and objection handling.
- "What would you build here?" site or backyard reviews.
- Short explanations from designers, builders or project managers.

#### Reel and Shorts cover learnings

Three 9:16 concept covers were created with the built-in OpenAI image workflow using the supplied screenshots as sales-context, brand-style and architectural references:

- `assets/dwellix-pitch/01-backyard-earn-reel-cover.png`
  - Hook: `WHAT COULD YOUR BACKYARD EARN?`
  - Purpose: lead with the homeowner's commercial curiosity.
- `assets/dwellix-pitch/02-empty-yard-second-home-reel-cover.png`
  - Hook: `EMPTY YARD TO SECOND HOME`
  - Purpose: communicate the transformation within one second.
- `assets/dwellix-pitch/03-design-permits-build-reel-cover.png`
  - Hook: `DESIGN. PERMITS. BUILD.`
  - Purpose: make the end-to-end offer feel simple and managed.

Visual direction:

- Use a vertical 9:16 composition for Instagram Reels, Facebook Reels, YouTube Shorts and TikTok.
- Match Dwellix's premium charcoal, warm off-white and restrained bronze palette.
- Use oversized condensed uppercase typography that remains readable on a phone.
- Keep one short hook per cover.
- Show realistic Melbourne backyards and contemporary Australian architecture.
- Keep all important text and imagery inside a central safe area for app overlays and profile-grid crops.
- Avoid invented logos, fake project claims, foreign-market cues, tiny text and clutter.
- Prefer actual approved Dwellix project photos or renders for published content.
- AI-generated buildings are suitable for pitch mock-ups and ideation only unless Dwellix explicitly approves another use.

#### Instagram reply length and sales lesson

The first detailed reply was too long for Instagram. Once a warm lead says they are happy to hear the pitch, the next message should:

- Stay short and easy to scan.
- Explain the offer in plain language.
- Mention the visual mock-ups immediately.
- Emphasise multi-channel distribution, especially YouTube Shorts and TikTok.
- Include editing, voiceovers, subtitles, hooks, covers and platform formatting.
- Sell the outcome as increased reach and brand awareness.
- Avoid a large strategic explanation or platform-by-platform breakdown inside the DM.
- Finish with one low-friction call to action.
- Offer to send packages rather than asking for a meeting.

**Approved short reply pattern:**

```text
Thanks guys, appreciate it!

I mocked up the examples below to show how we could help build the Dwellix brand across Instagram, Facebook, YouTube Shorts, TikTok, LinkedIn and Google.

We can turn your existing footage into engaging short-form content, or edit new videos as needed with strong hooks, voiceovers, subtitles, covers and platform-ready formatting. Getting the content across multiple channels helps increase reach, brand awareness and enquiries without creating everything from scratch.

Happy to send over some of our packages if that sounds of interest!
```

#### Reusable positive-lead follow-up formula

Use this structure when a polished business replies positively to the initial outreach:

```text
Thanks [name/team], appreciate it!

I mocked up the examples below to show how we could help build the [business] brand across Instagram, Facebook, YouTube Shorts, TikTok, LinkedIn and Google.

We can turn your existing footage into engaging short-form content, or edit new videos as needed with strong hooks, voiceovers, subtitles, covers and platform-ready formatting. Getting the content across multiple channels helps increase reach, brand awareness and enquiries without creating everything from scratch.

Happy to send over some of our packages if that sounds of interest!
```

Keep the wording focused on the prospect's brand and existing assets. If the business has weak visuals, offer filming or content capture separately rather than implying that repurposing alone will be enough.

### Smartlead Cold Email Outreach: Website Outreach Campaign

This is the current cold email sequence used to approach businesses about Instagram and social media content work.

**Campaign snapshot recorded 23 July 2026:**
- Campaign name: `Website Outreach`
- Status: Active
- Leads: 163
- Sending email accounts: 3
- Sequence steps: 2
- Delay between steps: 3 days

#### Email Step 1

**Subject:** `A free Instagram post idea for {{company_name}}`

```text
Hi {{first_name}},

I came across {{company_name}} on Instagram and had an idea for a post that could work well for your page.

Would you be interested in a free sample showing what your content could look like? We’ll create one custom post concept for your business, including the visual and caption.

There’s no cost or commitment. If you like it, we can have a chat about creating more. If not, the sample is still yours to use.

Would you like me to put one together?
```

#### Email Step 2

Send three days after Email Step 1. The subject field is intentionally blank in Smartlead so the follow-up remains in the existing email thread.

```text
Hi {{first_name}},

Just following up in case my last email got buried.

I’d be happy to create a free Instagram post sample for {{company_name}}, including the visual and caption, so you can see what we could do for your page.

No meeting or commitment needed. Just reply “yes” and I’ll put one together.
```

### Smartlead Personalised Visual Outreach

The original Smartlead campaigns produced opens and some replies, but no positive outcomes:

- `Website Outreach`: 163 leads, 315 sends, 61.35% opens, 1 reply, 0 positive replies and 3.17% bounces.
- `Warmer Lead Outreach`: 105 leads, 188 sends, 4 replies and 0 positive replies.
- `TendCall Outreach`: 140 leads, 6 replies and 0 positive replies.

The next campaign should lead with a useful, finished visual concept instead of asking whether the prospect wants one. This follows the Dwellix lesson: showing relevant creative work early is more persuasive than offering generic social media management.

#### Pilot recorded 29 July 2026

**Campaign name:** `Personalised Visual Outreach - Pilot`

**SmartProspect filters:**

- Country: Australia
- State: Victoria
- Industry: Real Estate & Construction
- Sub-industries: Construction and Architecture & Planning
- Headcount: 0-25 and 25-100
- Seniority: C-Level and Director-Level
- Job titles: Owner, Founder and Managing Director
- Exclude previously fetched contacts: On

The search produced 1,442 potential contacts. Five were selected for enrichment and three contacts were returned, using five SmartProspect credits:

- Ikonikdesign: verified and suitable for the first visual pilot.
- Botanic Horticulture: verified, but its mature content system makes a generic content offer a poor fit. Requalify it for content repurposing or multi-channel distribution.
- Terravista Landscapes: not verified by Smartlead. Do not contact until its address and social account have been checked.

The first Ikonikdesign mock-up uses the prospect's real Newtown duplex post and the hook `HOW WE UNLOCKED THIS SITE`. It is clearly treated as a complimentary concept, not published client work.

#### Repeatable workflow

1. Source a small batch of visual businesses in SmartProspect.
2. Verify each email address and exclude uncertain contacts.
3. Review the business's website and at least 15 recent Instagram posts.
4. Qualify the offer. Do not pitch basic content creation to businesses that already have a mature content system.
5. Search every existing Smartlead campaign for the exact email address before creating an asset. Reject prior non-responders and other duplicate contacts unless a documented, approved re-engagement basis exists.
6. Choose one real project or post and record its source URL.
7. Create one strong mock-up using the prospect's real asset. Do not invent logos, results or claims.
8. Export a full-resolution version and a compressed email preview. Aim for a preview below 500KB.
9. Upload the preview to a versioned public Storage path. Keep the full-resolution file out of the first cold email.
10. Generate the Smartlead import CSV:

   ```bash
   node scripts/prepare-smartlead-visual-outreach.mjs \
     --manifest tmp/smartlead-visual-outreach/personalised-visual-pilot-2026-07-29.json \
     --upload
   ```

11. Import the generated CSV and embed `{{preview_image_url}}` as a variable image in Smartlead. Use an inline image rather than a file attachment.
12. Send a test to an internal inbox and check desktop, mobile, image loading, personalisation and the unsubscribe line.
13. Target 10 new qualified leads per weekday, keeping total daily sends around 10-20 once follow-ups begin. Review replies manually before increasing this.

Live manifests and CSV files belong in `tmp/smartlead-visual-outreach/`, which is ignored because it contains contact data. Use `docs/smartlead-visual-outreach-manifest.example.json` as the reusable template.

**Live status recorded 29 July 2026:**

- Smartlead campaign ID: `3734239`
- One verified Ikonikdesign lead imported with the global block list, unsubscribe list and community bounce list safeguards enabled.
- Two email steps saved, with the follow-up set to three days and kept in the original thread.
- Smartlead's lead preview successfully resolved the company name, personalised research line and inline image.
- The campaign is active from 9:00 am to 6:00 pm, Monday to Friday, in the Australia/Melbourne timezone.
- The campaign uses all three Lumenyard sending accounts: Carl, Ryder and Alec.
- The campaign is limited to 10 new leads per weekday. With the three-day follow-up, the working target is approximately 10-20 total sends per day.
- Open and click tracking remain disabled. Bounce auto-protection, domain rate limiting, the campaign unsubscribe message and one-click unsubscribe header are enabled.

#### Daily automation

The Codex heartbeat automation `Daily Smartlead visual outreach` runs every morning at 9:00 am Australia/Melbourne time.

Each run:

1. Reads this README and continues the existing campaign rather than creating a duplicate.
2. Sources prospects through SmartProspect with previously fetched contacts excluded.
3. Reviews the official website and at least 15 recent Instagram posts.
4. Rejects unverified contacts, duplicates, opt-outs and businesses that do not fit the offer.
5. Creates a personalised mock-up from a real public prospect asset.
6. Exports and uploads the email preview, generates the Smartlead CSV and imports no more than 10 qualified leads.
7. Checks the rendered variables and visual for every imported lead.
8. Updates this README with the day's sourcing results, exclusions, credit usage, assets and new lessons.

This is a quality target, not a quota. The automation must import fewer than 10 leads when suitable verified prospects or strong visual sources are unavailable.

#### Daily run recorded 30 July 2026

Smartlead was checked before sourcing:

- `Personalised Visual Outreach - Pilot` remained active with one lead at Step 1.
- There were no campaign replies or bounces.
- All three Lumenyard senders were in use and the campaign showed 2% of sending capacity used.
- Carl Alexander had used 1 of 15 daily sends. Alec James and Ryder Haynes were each at 0 of 15.
- The campaign showed no follow-ups due and the next email was scheduled by Smartlead.

Three SmartProspect credits were used to enrich a deliberately small Victorian architecture
batch. All three contacts returned a verified email, but none passed the complete campaign gate:

- **Neil Fletcher Design:** `neil@fletcherdesign.com.au` was verified by SmartProspect, but the
  official website conspicuously publishes only `mail@fletcherdesign.com.au`. Its Instagram link
  is an empty generic destination, so the required social review and matching contact-basis
  evidence could not be completed.
- **RBI Architects:** `rbi@rbiarchitects.com.au` is both verified and conspicuously published for
  business enquiries. The website links Facebook and LinkedIn but no Instagram account. An
  Instagram Reel-cover email would therefore be mismatched to the business's visible channels.
- **Nairn Architecture:** `andrew@nairnarchitecture.com.au` was verified, but the original site
  was unavailable and current public information indicates that Nairn Architecture joined with
  Jacan Design Group to form Aspire Architecture in 2016. Treat the SmartProspect company record
  as stale unless the current business and contact basis are independently reconfirmed.

SmartProspect showed 1,998 credits before enrichment and 1,995 after it. No LocalProspects credits
were used. No mock-ups were created, no previews were uploaded and no leads were imported because
all three candidates failed a mandatory gate.

Durable sourcing lesson: filter selections must be verified against the actual result rows. In
this run the SmartProspect interface appeared to accept Victoria and small-company selections,
but the resulting request and table still included other Australian states and larger
organisations. Do not rely on the filter badge alone. Confirm the location, headcount, role,
official business, current website and social-channel fit for every selected row before spending
an enrichment credit.

#### Daily run recorded 31 July 2026

Smartlead was checked before sourcing:

- `Personalised Visual Outreach - Pilot` remained active with one lead and two email steps.
- One of the lead's two scheduled sends had been processed. There were no opens, campaign replies,
  unsubscribes or bounces, and no follow-ups were due.
- Today's actual send count was zero at the morning check. Smartlead forecast ten sends, but there
  were no additional qualified leads available to send to.
- All three Lumenyard mailboxes were connected, in use and at 0 of 15 daily sends. Their displayed
  warm-up scores were 60% for Carl Alexander, 43% for Alec James and 53% for Ryder Haynes.
- Smartlead reported no volume or performance issues. The three linked mailboxes showed a combined
  daily capacity of 45, while this campaign remained capped at five emails across its 9:00 am to
  6:00 pm sending window.
- The Master Inbox contained no new reply from this campaign. The visible replies were from older
  campaigns and were not changed.

No SmartProspect credits were used. The existing 50-contact completed search from 22 July was
reviewed instead, so the previously recorded exact balance remained 1,995 credits. Several
potentially visual businesses were checked, but none passed the complete gate:

- **Dan Webster Architecture:** the SmartProspect record points to the former
  `dwarchitecture.com.au` identity and address. The current business is Webster Architecture &
  Interiors at `websterarchitecture.com.au`; its official site links the current Instagram profile
  but publishes only an enquiry form, not an email address that matches the enriched record.
- **Corporate Shooting Stars:** current public information shows the operation trading as Go
  Shooting and states that Russell and Lauryn Mark sold the corporate licences in 2023. The
  SmartProspect company and decision-maker record is therefore stale.
- **Back In Line Chiropractic:** the current Southbank practice was verified, but its official site
  publishes a phone number and booking flow rather than the enriched personal email. A verified
  database address alone is not sufficient contact-basis evidence.
- **Parker Invest:** the old domain redirects to Parker Buyer Advocates. The current site publishes
  a phone number and enquiry form but no matching public email or Instagram link, so the old
  SmartProspect identity was not used.
- **Metropolitan Stone & Joinery:** an existing research candidate was independently checked. Its
  official site publishes a role-relevant business email, but no Instagram account was available
  for the required 15-post review, and the site's copyright notice expressly prohibits reusing its
  images. It was rejected before asset creation.

No LocalProspects credits were used and no new LocalProspects search was started before the
3 August reset. No mock-ups were created, no previews were uploaded and no leads were imported.

Durable sourcing lesson: completed SmartProspect results can be reused without further credit
spend, but older rows frequently preserve former brands, domains and decision-makers. Reconfirm the
current identity, conspicuously published contact route, Instagram channel and image-use basis
before treating an old verified email as campaign-ready.

#### Weekend check recorded 1 August 2026

Saturday was treated as a non-working day, consistent with the campaign's Monday-to-Friday sending
schedule. No lead sourcing, enrichment, credit spend, mock-up creation, upload or import was due.

The live Smartlead health check could not be completed because the signed-in Chrome session was not
connected to Codex. The in-app browser reached the Smartlead login page but was not authenticated.
Local diagnostics confirmed that Google Chrome, the ChatGPT browser extension and the native host
configuration were installed and enabled; no browser session was available to inspect the account.
The campaign, replies, bounces, unsubscribes, suppressions and sender health were therefore not
represented as checked. No Smartlead or LocalProspects state was changed.

Operational reminder: the live campaign and this README contain two email steps. Automation wording
must not be used as authority to invent or add a third step when the live campaign still shows two.

#### Weekend check recorded 2 August 2026

Sunday was treated as a non-working day. The live Smartlead account was available for a read-only
health check, but no lead sourcing, enrichment, credit spend, mock-up creation, upload or import was
performed.

- `Personalised Visual Outreach - Pilot` remained active with one lead and two email steps.
- One of two sends had been processed. The campaign still showed zero opens, replies and bounces,
  with no follow-ups due and no emails sent during the preceding 30 minutes.
- Smartlead showed the next email due on Monday morning. Sunday's actual send count was zero.
- The Master Inbox contained no reply from this campaign; the newest visible reply remained an
  older `Website Outreach` reply dated 15 July.
- Carl Alexander, Alec James and Ryder Haynes were all connected and in use at 0 of 15 daily sends.
  Their displayed warm-up scores were 59%, 45% and 51% respectively.
- Smartlead reported no volume issues, no performance issues, no disconnected mailboxes and no
  mailbox without warm-up enabled.

No SmartProspect or LocalProspects credits were used and no external campaign state was changed.

#### Daily run recorded 3 August 2026

Smartlead was checked before sourcing:

- `Personalised Visual Outreach - Pilot` remained active with one lead and two email steps. Both
  scheduled sends had completed, with zero opens, replies and bounces and no active or failed
  campaign leads.
- Smartlead showed one actual send during the morning check against a forecast of ten. The live
  campaign retained its five-email cap inside the 9:00 am to 6:00 pm Melbourne sending window.
- Carl Alexander had used 1 of 15 daily sends and showed a 57% warm-up score. Alec James and Ryder
  Haynes were each at 0 of 15, with displayed warm-up scores of 44% and 51%.
- All three Lumenyard mailboxes were connected and in use. Smartlead reported no volume or
  performance issues, no disconnected mailboxes and no mailbox without warm-up enabled.
- The Master Inbox contained no new reply from this campaign. The newest visible reply remained an
  older `Website Outreach` reply dated 15 July.

No SmartProspect credits were used. The completed 22 July search was reused, so the last recorded
exact balance remained 1,995 credits. Abode Construction was rejected because it is a Brisbane
business, while Roberts Gardiner Architects was rejected because it is based in Albany, Western
Australia.

Design Edge Associates initially passed the current-business, Victorian-location, role and public
contact gates. Its official Richmond contact page conspicuously publishes
`mario@designedgeassociates.com.au`, matching SmartProspect's verified address. Its live Instagram
profile showed 24 posts, 39 followers and 13 following. Twelve recent grid links were sampled; nine
post pages remained accessible and three older links were unavailable. The accessible sample showed
only two posts in 2026, a cluster in late 2025 and an older 2021 post, with one Reel among the recent
formats. This supported the inference that strong project material was available but the visible
content system was small and irregular.

A brand-specific `RICHMOND TERRACE, TRANSFORMED` Reel-cover concept was created from the business's
own public Richmond terrace Reel and quality-checked. The 131,537-byte email preview was uploaded to
a versioned public Storage URL and returned HTTP 200. No lead was added to the live campaign:
Smartlead's duplicate protections found Mario in another campaign. A direct check confirmed that he
had already received the completed two-email `Website Outreach` sequence in campaign `3641683` and
had not replied. The global block, unsubscribe, community-bounce and cross-campaign duplicate guards
were all retained; the import was closed without bypassing the duplicate.

LocalProspects still showed 52 credits and `resets Aug 3` at the morning check, so the reset had not
yet been applied. No new search was started, no existing job was exported and no LocalProspects
credits were consumed.

Durable process lesson: perform the exact-email cross-campaign check before creating or uploading a
mock-up. A verified address, relevant role and strong visual opportunity are not enough when the
contact has already received a materially similar offer and did not respond.

#### Daily run recorded 4 August 2026

The live Smartlead account was checked before any sourcing or asset work:

- `Personalised Visual Outreach - Pilot` showed **Completed**, one lead and two sends, with zero
  opens, replies or bounces. It was not reactivated and no lead was imported because the daily
  automation is scoped to the active campaign and must stop on a campaign-state problem.
- The three connected Lumenyard senders were healthy: Carl Alexander `0 / 15` with 60% warm-up,
  Alec James `0 / 15` with 45% warm-up, and Ryder Haynes `0 / 15` with 52% warm-up. Warm-up was
  enabled for all three accounts.

SmartProspect showed 1.9K available credits out of 2K. No credits were used. The completed
`C-Level Owner in Australia` search was reused for review. RBi Architects was a strong Victorian
architecture candidate: its current official site identifies Melbourne commercial architecture,
conspicuously publishes `rbi@rbiarchitects.com.au`, links a current Facebook page, and documents
the Showroom South Melbourne project with three gallery URLs and a `Photography: Darren Wood`
credit. It was held without a mock-up because the target campaign was already completed and the
required exact-email cross-campaign duplicate check could not be completed before that guard
stopped the run. Lisa Parker / Parker Buyer Advocates was rejected because the current official
site published a phone number and contact form but no public email matching the SmartProspect
record. CBE was rejected as a biopharmaceutical consultancy rather than a visual construction or
architecture prospect. Corporate Shooting Stars could not be verified securely because its
domain returned a certificate-name error.

LocalProspects had reset: 9,049 leads remained, 951 had been found in the current period, and the
dashboard now showed `resets Sep 3`. Five recent broad searches consumed exactly those 951 credits
(painter / Toowoomba 150, physiotherapist / Cairns 160, builder / Brisbane 247, physiotherapist /
Canberra 181, and physiotherapist / Sunshine Coast 213). These searches were already present when
the account was checked; this run started none, exported none and imported none. They are not
Victorian visual-graphics candidates and remain outside the personalised campaign until separately
reviewed under the TendCall issue-led workflow.

Durable process lesson: a completed target campaign is a hard stop. Do not bypass it by importing
leads or creating mock-ups; first restore an approved active campaign state, then perform the
exact-email duplicate check before any asset work. Record unexpected source searches separately and
never treat their contact data as consent.

#### LocalProspects batch staged 4 August 2026

At the user's request, 25 Ballarat-area trade records with a website and an email field were
staged from the completed `Plumber-Ballarat, Victoria` job (`jobId`
`8ac5736e-7d69-43ef-8c8f-2b564d2b9ee2`). This reused existing results and consumed **zero** new
LocalProspects credits. The review file is
`tmp/localprospects/ballarat-plumber-review-2026-08-04.csv`.

The file is a research queue, not an approved send list. Each address is labelled as a
LocalProspects public-business-email field and not consent. Before any TendCall or Smartlead use,
each row still requires the official-site audit, one objective customer-facing issue with reliable
proof, a documented lawful contact basis, suppression and duplicate checks, and human approval for
upload. No leads were uploaded or contacted in this step.

#### Instagram graphics review batch recorded 4 August 2026

The user asked for social-media graphic concepts rather than website audits. The 25 staged
Ballarat trade records were therefore reviewed for an official public image suitable for a
brand-specific vertical Reel cover. Built-in image generation was used to create one concept per
lead where the source passed the visual gate. The contact sheet was checked at phone size.

- **17 concepts created:** 14 marked review-ready and 3 marked review-with-caveat.
- **8 leads held:** no suitable real project/service image was available, or only a logo/icon was
  visible. Held ranks were 11, 23, 24, 29, 38, 39, 53 and 60.
- The three caveat concepts use a streetscape hero image (rank 1), an existing business graphic
  (rank 26) or a commercial development image that may be a render (rank 27). They must remain
  review-only until the prospect confirms the image and intended use.
- Cameron's Plumbing used an alternate official team image after the first banner was unsuitable
  for image generation. McPherson Commercial Plumbing's AVIF response was converted locally for
  generation; the original source URL remains recorded.
- Files and source evidence are recorded in
  `tmp/outreach-graphics/localprospects-2026-08-04/cover-manifest.json` and
  `source-manifest.json`.

These are cold LocalProspects records, not confirmed Instagram followers. Do not send a warm
`thanks for following` message, publish a concept as completed client work, or import a contact
until exact-email duplicate and suppression checks, lawful contact-basis review, and an approved
campaign state are complete. No messages, uploads or Smartlead imports were made for this batch.

#### Smartlead launch completed 4 August 2026

The `Personalised Visual Outreach - Pilot` campaign (`3734239`) was corrected, verified and
relaunched for the approved LocalProspects graphics batch.

- The earlier CNAME warning was a custom tracking-domain warning, not a mailbox delivery failure.
  Open and click tracking are disabled for this pilot, so the warning did not block sending.
- The three Lumenyard accounts were connected and healthy. Their earlier `Not In Use` labels were
  a consequence of the campaign having completed its original lead, not disconnected senders.
- The saved first email still identified the sender as `Tendcall`. It was corrected in Smartlead,
  saved in the visual editor and rechecked on a scheduled lead. Both steps now identify Heath and
  Seam Media, include `contact@seammedia.com.au`, and retain the plain-language unsubscribe line.
- Twelve review-ready concepts passed the official-site email, image-source and manual graphic
  checks. Grade A Plumbing was excluded before asset work as an exact-email duplicate from the
  earlier TendCall campaign. New Image Plumbing was excluded because the supplied email was not
  published on its current official website. The three caveat concepts and eight held concepts
  stayed out of the send.
- Twelve compressed previews were uploaded to the public `post-images` storage bucket and their
  public JPEG URLs returned HTTP 200. The import mapped all 11 CSV columns, including
  `preview_image_url` and `personalisation_line`, and enabled the global block, unsubscribe,
  community-bounce and cross-campaign duplicate guards.
- Smartlead accepted 11 of the 12 imported rows and suppressed one additional address already in
  another campaign. Eleven verification credits were used from the 6,000-credit balance. Nine
  addresses passed verification and two failed, so only the nine valid new leads entered the live
  queue.
- The campaign was updated and explicitly resumed. It is **Active**, with a two-email sequence,
  a three-day follow-up delay, Monday-Friday sending from 09:00 to 18:00 Melbourne time, 20-minute
  trigger checks and a limit of 10 new leads per day.
- The first live trigger completed at 11:40 AM Melbourne time: three new-lead emails were sent
  successfully, one from each of Carl, Alec and Ryder. Smartlead recorded zero skips and zero
  failures, with the next trigger scheduled for 12:00 PM.

Durable process lesson: after a verification run, Smartlead may pause an otherwise valid campaign.
Updating the campaign does not necessarily resume it. Explicitly resume the campaign, then confirm
the activity log contains a real next-send time and observe one completed trigger before reporting
the setup as working. Treat a CNAME warning as a tracking issue only when tracking is enabled, and
do not misclassify a completed campaign's sender labels as disconnected mailboxes.

#### Daily run recorded 5 August 2026

The live campaign and all three sender accounts were checked before sourcing or creating another
graphics batch.

- `Personalised Visual Outreach - Pilot` remained **Active**. All nine new leads had received Email
  Step 1 and were active with Email Step 2 due in two days. The campaign showed 11 of 20 total sends
  processed, including the original pilot lead.
- Smartlead showed zero replies, zero positive replies, zero bounced emails, zero sender bounces,
  zero failed leads and zero blocked leads. Open and click tracking remain disabled, so the zero-open
  figure is not an engagement signal.
- The three Lumenyard mailboxes were connected, in use and warm-up enabled. Their warm-up scores were
  Carl 59%, Alec 46% and Ryder 54%, with no performance issue reported.
- All three mailboxes had already reached their shared daily limits across four campaigns: Carl
  `15 / 15`, Alec `15 / 15` and Ryder `15 / 15`. Smartlead showed **100% Used**, `Mailboxes exhausted
  capacity` and a campaign-pause risk for all three accounts.
- No new lead was sourced, no graphic was created, no lead was imported and no SmartProspect or
  LocalProspects credit was consumed. The run stopped at the stricter live mailbox limit instead of
  adding contacts that could not be sent safely.

Durable process lesson: mailbox daily limits are shared across every campaign using the account.
The campaign's `10 new leads/day` setting does not reserve capacity. Check each mailbox's live
`used / limit` value before sourcing or importing, and add no new leads when the shared accounts are
at capacity.

#### Daily run recorded 6 August 2026

The live campaign, campaign activity and all three sender accounts were checked before sourcing.

- `Personalised Visual Outreach - Pilot` remained **Active** with ten leads in total. Nine leads were
  active at 50%, with Email Step 2 due the following day. Smartlead had processed 11 of 20 sequence
  sends and showed zero replies, positive replies, bounces, sender bounces, failed leads and blocked
  leads. Open and click tracking remained disabled.
- Carl, Alec and Ryder were connected, in use and warm-up enabled. Each mailbox had reset to `0 / 15`,
  giving 45 combined sends of live mailbox capacity. Warm-up scores were 59%, 48% and 53%, with no
  volume, performance or disconnection issue reported.
- SmartProspect showed approximately 1,900 of 2,000 credits available. The existing 50-lead search
  result was reused, so no SmartProspect or LocalProspects credit was consumed.
- Twenty-five visible records were reviewed. Three Melbourne contacts initially matched the visual
  offer and had verified decision-maker emails. Each exact email returned no match in the Website
  Outreach, Warmer Lead Outreach, TendCall Outreach or Personalised Visual Outreach campaigns.
- Dan Webster of Dan Webster Architecture was rejected because the supplied business website domain
  did not resolve. Lauryn Mark of Corporate Shooting Stars was rejected because the supplied website
  presented a certificate/domain mismatch, preventing a trustworthy website and source-asset check.
- Roy Smith of Back In Line Chiropractic passed the business, role, website and duplicate checks. An
  official portrait from the business's current team page was saved with its source URL, and one
  reviewed 9:16 concept was created with the exact hook `MOVE FREELY. FEEL LIKE YOU.` The source and
  finished asset are under `assets/smartlead-visual-outreach/2026-08-06/back-in-line/`.
- The Back In Line lead was held from upload and import because the required recent Instagram-content
  review was not completed during the run. No public preview was uploaded, no CSV was imported and no
  campaign email was queued. The campaign remained unchanged rather than treating a verified email or
  one official image as the complete qualification gate.

Durable process lesson: a SmartProspect `Verified` email does not verify the website or visual source.
Reject unresolved or certificate-mismatched business domains before asset production. For a candidate
that passes those checks, keep the finished concept held until the recent social-content review is also
documented; do not import merely because mailbox capacity is available.

#### Daily run recorded 7 August 2026

The live campaign and shared senders were checked before completing the held Back In Line review.

- `Personalised Visual Outreach - Pilot` remained **Active** with ten leads. Nine leads were active at
  50% and their second email was scheduled across the day. Smartlead predicted ten sends for the day,
  showed zero replies, bounces, sender bounces, failed leads and blocked leads, and reported the next
  campaign send as due shortly after the morning check.
- Carl, Alec and Ryder were connected, in use and warm-up enabled at `0 / 15`. Their warm-up scores were
  64%, 57% and 57%. Smartlead reported no volume, performance or disconnection issue. The nine scheduled
  follow-ups left room for no more than ten new first emails under the campaign's 20-send daily ceiling.
- Back In Line Chiropractic's live Instagram profile was reviewed while signed in. More than fifteen
  recent posts were present, with a useful mix of Reels and feed posts. The active Southbank profile,
  practitioner-led presentation and practical wellbeing focus supported the existing educational cover
  concept.
- The role-specific SmartProspect address was not treated as public contact evidence. The business's
  Cloudflare-protected address was instead decoded from its official privacy page as
  `wellness@backinline.com.au`. That published business inbox returned no exact-email match in the
  Website Outreach, Warmer Lead Outreach, TendCall Outreach or Personalised Visual Outreach campaigns.
- The existing cover passed the image review. A 900 x 1600 JPEG email preview was created at 227,663
  bytes, uploaded to the public `post-images` Storage bucket and verified with HTTP 200. No new sourcing
  or enrichment credit was consumed.
- Smartlead import did not complete. The campaign's Add Leads dialog opened correctly, but the signed-in
  browser could not attach the prepared CSV through the site's file chooser after two attempts. The
  public preview and resolved one-lead CSV remain under `tmp/smartlead-visual-outreach/` for a later safe
  retry. No lead was added or campaign email queued, and the existing scheduled follow-ups were left
  unchanged.

Durable process lesson: when an official website protects a published email with Cloudflare, verify and
record the decoded business inbox rather than substituting a private enrichment address. Treat successful
Storage upload and CSV preparation as separate from Smartlead import; do not report the lead as queued
until the campaign lead count and scheduled state confirm it.

#### Email Step 1

**Subject:** `Made this for {{company_name}}`

```text
Hi {{first_name}},

I came across {{company_name}} and liked {{personalisation_line}}.

I mocked up this Reel cover using one of your existing projects to show the sort of content we could build around it.

[Inline image from {{preview_image_url}}]

There is no charge or obligation. If the direction is useful, I would be happy to send the full-resolution version and a couple more ideas.

Would you like me to send them through?

Thanks,
Heath

Seam Media
contact@seammedia.com.au

If you would rather not hear from me, just reply "unsubscribe".
```

#### Email Step 2

Send three days after Email Step 1 and leave the subject blank so it stays in the same thread.

```text
Hi {{first_name}},

Just checking you saw the Reel cover I mocked up for {{company_name}}.

If it is useful, I can send the full-resolution version and two more content ideas based on your recent work. No meeting or commitment needed.

Would you like me to send them through?

Thanks,
Heath

Seam Media
contact@seammedia.com.au

If you would rather not hear from me, just reply "unsubscribe".
```

#### Launch gate and compliance

- Do not launch while any sending account has a mailbox issue or weak warm-up health.
- Confirm SPF, DKIM and DMARC before sending.
- Disable open and click tracking for the pilot to reduce unnecessary deliverability risk.
- The sender must be clearly identified and include working contact details and a simple unsubscribe instruction.
- A publicly listed email address is not automatically consent. Record the lawful basis for contacting each lead and keep the message relevant to the person's role.
- Remove opt-outs immediately and maintain a suppression list across future campaigns.
- Keep the pilot as a draft until the sender accounts, test email and imported variables have all been reviewed.

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

## Client Portal, Self-Service Onboarding and Automation (2026-07-21)

This section is the source of truth for the Seam Media self-service client journey and the platform-first support workflow.

### Production URLs and route behaviour

- Portal: `https://seam-media-content-manager.vercel.app`
- Existing client login: `https://seam-media-content-manager.vercel.app/login`
- New account signup: `https://seam-media-content-manager.vercel.app/signup`
- Onboarding: `https://seam-media-content-manager.vercel.app/onboarding`
- Public package page: `https://www.seammedia.com.au/social-media-packages`
- The website's **Client Login** link must use `/login`. This is a login-only screen and must not display package pricing.
- Package buttons use `/signup?plan=basic|pro|max&billing=monthly|annual`. Pricing appears only in the signup journey.
- `/auth/callback` preserves whether the visitor was signing in or creating an account.

### Automated customer lifecycle

The intended new-customer flow is:

1. Customer chooses a package on the Seam Media website.
2. Customer creates an account with Google or email/password.
3. The selected plan and billing cycle are retained in browser storage.
4. Stripe Checkout receives the Supabase user ID as `client_reference_id` and the authenticated email as `prefilled_email`.
5. The Stripe webhook creates or updates the matching `clients` record with `provisioning_status = 'pending_intake'`.
6. `/onboarding` polls for the new client record and collects business details, contact details, website, logo, colours, fonts, brand voice, audience, goals, platforms and content notes.
7. Completing onboarding sets `provisioning_status = 'active'` and opens the dashboard immediately.
8. Billing controls create a Stripe customer portal session so the customer can manage invoices and their subscription without contacting Seam Media.
9. Stripe cancellation updates the client lifecycle to `cancelled`; cancelled accounts must not regain dashboard access simply by signing in again.

Existing PIN-based clients remain supported during the transition. New self-service accounts are linked through `clients.owner_user_id` and Supabase Auth.

### Revenue attribution and offboarding

- A converted lead is linked to its real client record through `agency_leads.client_id`.
- `/api/revenue-sync` imports paid Stripe invoices into `agency_client_revenue`. Provider references are unique, so running the sync repeatedly does not double-count revenue.
- `agency_leads.lifetime_value` is the sum of collected invoice revenue for that client. Lead Management uses this value for collected lifetime revenue and source-level lifetime ROAS.
- The lead's `sign_on_date` records when the customer first became active. `exit_date` and `churn_reason` record when and why the relationship ended.
- Stripe subscription status is checked by the daily recovery job. Cancelled or unpaid subscriptions set the linked client to `provisioning_status = 'cancelled'`, disable automatic posting and remove the client from active dashboard lists without deleting their historical content or revenue.
- Agency users can also mark a linked converted client Active, Paused or Cancelled from the lead record. Paused and cancelled clients keep their conversion history; cancellation is not rewritten as a lost lead.
- Manual lifecycle changes in Lead Management do not cancel billing at Stripe. Cancel the subscription in Stripe when billing must stop; the revenue sync will then reconcile the portal lifecycle.

### Self-service social connections

- Each client receives one Zernio profile, created automatically on their first connection attempt.
- `Social accounts` displays Facebook, Instagram, TikTok, YouTube, Google Business, LinkedIn, Threads, X, Pinterest, Reddit and Snapchat.
- Clicking Connect opens Zernio's hosted OAuth flow for that platform. The client signs in with the platform directly and chooses the relevant Page, channel, organisation or location. Seam Media never receives the client's social password.
- `/api/social-connections` authenticates the client, creates or reuses their Zernio profile, returns the hosted connection URL and lists only accounts belonging to that client profile.
- Connected account IDs are mirrored to `clients.late_profile_ids` for compatibility with the existing scheduler.
- Keep `ZERNIO_API_KEY` server-only. `VITE_LATE_API_KEY` remains a temporary backwards-compatible server fallback and must not be referenced by browser code.

### Production learnings from the first self-service client

The first converted self-service client was Goran Poposki from **Dwellix** on 23 July 2026. Seven tailored warm Instagram DMs were sent that day and one converted. Keep the person and business as separate fields:

- `clients.name` and `clients.brand_name`: `Dwellix`
- `clients.contact_name`: `Goran Poposki`
- `agency_leads.client_id`: links the original Dwellix lead to the created client
- `agency_leads.stage`: remains `converted` for historical conversion reporting
- `clients.provisioning_status`: controls whether the client is active, paused or cancelled

Do not replace a converted lead with a cancelled lead when the client eventually leaves. Churn is a client-lifecycle event, not a reversal of the original conversion. Preserve the conversion source, sign-up date and collected revenue, then record `exit_date`, `churn_reason`, `offboarded_at` and the cancelled client status.

Other operational and technical learnings:

1. **The business name must drive the workspace UI.** A self-service signup can initially supply a person's name. Onboarding and provisioning must store the business name separately so client lists, headers and exports do not show the contact as the business.
2. **A browser refresh may be required after changing a live client record or deploying a new client bundle.** The Dwellix name appeared correctly after the existing portal session was refreshed.
3. **One Zernio profile per client prevents account mixing.** The app creates the profile only when the client starts their first connection, then scopes all returned social accounts to that profile.
4. **Connection is client-controlled.** Seam Media should direct the client to `Social accounts`, not request passwords or manually trade platform-access links through messages.
5. **YouTube Shorts uses the YouTube connection.** Reels and Stories use the relevant Facebook or Instagram connection rather than separate account types.
6. **OAuth completion is not the same as publishing verification.** After connecting a platform, schedule one controlled test item and confirm the correct Page, channel, organisation or Google Business location was selected.
7. **Lifetime ROAS must use collected revenue, not package value.** Paid Stripe invoices are imported into an append-only revenue ledger and deduplicated by Stripe invoice ID. The current package price remains useful for pipeline forecasting but must not be counted as collected lifetime revenue.
8. **The sign-up date and revenue date answer different questions.** `sign_on_date` records the start of the client relationship. `paid_at` records each collected payment. Lifetime revenue is the sum of the payment ledger.
9. **Manual offboarding does not stop billing.** Marking a client Paused or Cancelled in Lead Management controls portal access and automation only. Billing must also be cancelled in Stripe when charges need to stop.
10. **Cancelled clients are hidden, not deleted.** Their posts, assets, lead, attribution and revenue remain available for reporting until a separate retention and deletion policy is approved.
11. **Server credentials must stay outside the browser bundle.** A `VITE_` variable is browser-visible if frontend code references it. The social UI no longer checks or exposes the Zernio key; server routes hold provider access.
12. **Vercel Hobby currently allows only 12 Serverless Functions and daily cron schedules.** The initial release exceeded the function limit. Social connections are therefore served through `api/late-profiles.ts`, revenue sync through `api/billing-portal.ts`, and friendly endpoint rewrites preserve `/api/social-connections` and `/api/revenue-sync`. Do not add another top-level `api/*.ts` file without first consolidating or upgrading the Vercel plan.
13. **Protected endpoints were verified in production.** The live home page returned HTTP 200, while unauthorised social-connection and revenue-sync requests returned HTTP 401.
14. **Production visual verification matters.** The deployed Dwellix portal was checked after refresh and displayed all eleven supported connection choices.

### Portal notification and access learnings (2026-08-03)

1. **Bulk portal alerts and weekly analytics emails are separate systems.** Portal feedback, support and automation events continue in the notification bell and conversation history, while the portal email transport is hard-disabled. Weekly analytics delivery uses its own global switch and per-client opt-ins.
2. **Keep a global analytics switch as well as client-level consent.** `CLIENT_ANALYTICS_EMAILS_ENABLED=true` allows the weekly flow to run, but a client must also be explicitly opted in and meet the normal eligibility checks. Setting the global switch to `false` pauses analytics delivery without changing saved client settings.
3. **Never reuse an access PIN across client records.** A shared PIN caused the NSW Fishing League workspace to appear in another client's portal access. Every client must have a unique PIN, even when the client contact or agency relationship is shared.
4. **Hide inactive clients in every access path.** Filtering only the client selector is insufficient. Session restoration, direct client selection and PIN-based access must all apply the same visibility rules.
5. **Verify both the deployment and the email boundary.** After notification changes, run the focused analytics tests and production build, confirm the live deployment is `READY`, check the portal returns HTTP 200, and verify portal email code paths make no Resend calls while the separate analytics flow remains available.

### Seven-day growth and FITxG4 onboarding audit (2026-07-30)

#### Growth snapshot

Five new clients signed within the seven days ending 30 July 2026:

- Dwellix: 23 July
- Philotimo Freestyle Jujitsu: 27 July
- Built3d: 29 July
- Microdemo: 29 July
- FITxG4: 30 July

The five clients added `$2,195` in monthly recurring revenue, an average of `$439` per client. Three conversions came from Instagram organic and two came from Meta Ads. Recorded Meta spend was `$406.44`, with `$998` in initial revenue from the two paid conversions:

- Paid-source initial ROAS: `2.46x`
- Blended initial ROAS, including organic conversion revenue against paid spend: `5.40x`

This was an exceptionally strong acquisition week, but it is still a small sample. Treat it as a positive demand signal rather than a guaranteed long-term baseline.

If the same five-client-per-seven-day pace, package mix and zero churn continued for 90 days, the business would add approximately 64 clients and reach approximately 69 active clients and `$30,400` MRR. This is a capacity-planning scenario, not a committed revenue forecast.

For the current five-client cohort, the `5.40x` blended ROAS becomes approximately `16.20x` after three total monthly payments if no additional acquisition spend is attributed to that cohort. It becomes `21.60x` after the initial payment plus three further renewals. Do not multiply ROAS this way when reporting a campaign that continues spending and acquiring newer cohorts; use collected attributed revenue divided by total campaign spend instead.

Immediate growth priorities:

1. Retain the five new clients through their first 90 days and track both customer churn and revenue churn.
2. Deliver a clear first result quickly, complete onboarding follow-ups and monitor fulfilment capacity.
3. Continue Instagram organic outreach because it produced three of the five conversions.
4. Scale the winning Meta campaign in controlled increments, allowing a stable measurement period after each material budget change.
5. Monitor leads, conversion rate, paid customer acquisition cost, collected revenue, gross margin, time to first delivery and production hours per client.

#### FITxG4 live onboarding verification

The live Content Manager record was checked on 30 July 2026:

- Business and brand name: `FITxG4`
- Package: `Pro`, monthly
- Subscription status: `active`
- Provisioning status: `active`
- Onboarding completion is recorded
- Website and contact details are present
- A Zernio profile is linked
- Four active Zernio accounts are attached to the `FITxG4` profile: Facebook `FITxG4`, Instagram `fitxg4`, LinkedIn `FITxG4` and TikTok `fitxg4`
- The standard local workspace exists at `/Volumes/PortableSSD/Clients/fitxg4`
- The local workspace contains `README.md`, `assets/incoming/` and `assets/approved/`

The onboarding form completed successfully and the client is available to the active dashboard and content-calendar UI. This does not mean a content batch has been created: FITxG4 currently has zero post records. Initial content research, planning, asset preparation and creation of `For Approval` calendar records remain a separate production workflow.

The intake contains a logo, phone number, business description, target audience, launch goal, launch context, brand keywords, brand colours and a primary font. The remaining clean-up items are:

- `contact_name` is `FITxG4 Support`, not Dalveer Sangha.
- Brand voice is blank.
- Secondary font is blank.
- The stored website uses `http://www.fitxg4.com.au`; use the canonical HTTPS URL when the final website is confirmed.
- The local folder README still shows `pending_intake` because generated folder metadata is not refreshed automatically.

#### Automation boundaries confirmed by the audit

- Paid signup provisioning creates or updates the Supabase client record, links the Stripe subscription, links a matching agency lead when the email matches and ensures the Zernio profile exists.
- Completing brand intake activates the client and records `onboarding_completed_at`.
- Social account connection remains client-controlled through Zernio OAuth. A profile can be automatic, but the client must authorise and select the correct Page, account, channel or business location.
- Active clients appear automatically in the client selector and content calendar because the UI reads active client records.
- Onboarding does not automatically research the brand, generate content, create posts or schedule publishing.
- `scripts/sync-client-folders.mjs` safely creates the standard PortableSSD workspace, but it is a local script and is not currently invoked by the Stripe webhook, onboarding flow, Vercel cron or an always-on local automation.
- A Vercel serverless function cannot write to `/Volumes/PortableSSD/Clients`; automatic local folder creation requires a trusted local runner on the Mac while the drive is mounted.
- The generated FITxG4 folder README was created while the client was still `pending_intake`, so its onboarding status is stale even though the live client is now active. The folder synchronisation process currently creates missing files but does not refresh an existing README after intake is completed.

Relevant implementation:

- `components/SelfServeSignup.tsx`
- `components/SelfServeOnboarding.tsx`
- `components/ClientBilling.tsx`
- `components/ClientConnections.tsx`
- `components/lead-management/LeadModal.tsx`
- `server/socialConnections.ts`
- `server/revenueSync.ts`
- `server/agencyLeads.ts`
- `api/billing-portal.ts`
- `api/late-profiles.ts`
- `supabase/migrations/20260723095317_add_client_lifecycle_revenue_and_zernio.sql`
- `supabase/client-portal-foundation.sql`
- `supabase/self-serve-social-onboarding.sql`

## Heath action list

This list contains the work that requires Heath's provider access, client coordination or business decision. Engineering follow-ups remain in **Outstanding Automation TODO**.

### Required now

- [ ] **Add Stripe's live secret key to Vercel Production.**
  1. Open the Stripe account that receives Seam Media package payments.
  2. Copy the live secret key from Stripe's API keys area. It normally starts with `sk_live_`.
  3. In Vercel, open `seam-media-content-manager` → Settings → Environment Variables.
  4. Add it as `STRIPE_SECRET_KEY`, select Production and mark it Sensitive.
  5. Redeploy the current production deployment.
  6. Open Lead Management and click **Sync Revenue**.
  7. Confirm Dwellix shows collected lifetime revenue matching the paid Stripe invoice and that Instagram Organic receives the corresponding lifetime revenue attribution.
- [ ] **Ask Goran to connect only the Dwellix channels he wants Seam Media to manage.** He should sign in to the Content Manager, open **Social accounts**, press **Connect** for each platform and choose the correct Dwellix Page, account, channel or business location.
- [ ] **Confirm the Dwellix onboarding details.** Check the business name, contact name, website, plan, billing cycle, logo, brand details, service information, audience, goals and preferred platforms.
- [ ] **Run one controlled publishing test after Goran connects the first platform.** Use an approved low-risk item, verify the destination account and confirm the resulting Zernio post ID is stored before relying on automatic publishing.

### Provider-key tidy-up

- [ ] Create or rotate a Zernio API key and add it to Vercel Production as the Sensitive server-only variable `ZERNIO_API_KEY`.
- [ ] Redeploy and test account refresh plus one connection.
- [ ] Remove the legacy `VITE_LATE_API_KEY` only after the server-only key is confirmed working in production.
- [ ] Create a fresh OpenAI API key, add it as the Sensitive server-only variable `OPENAI_API_KEY`, verify the AI health check, then remove `VITE_OPENAI_API_KEY`.
- [ ] Never paste a masked Vercel placeholder such as `********` into another environment. Sensitive values must be entered from the original provider.

### Before the first client offboarding

- [ ] Decide how long Seam Media retains former-client posts, brand assets, source files, conversations, analytics and invoices.
- [ ] Decide whether every former client receives an export and which formats are included.
- [ ] Decide the permanent-deletion timetable and any financial-record exceptions.
- [ ] Prepare the cancellation communication and confirm who is responsible for cancelling Stripe billing.
- [ ] For the first real cancellation, cancel billing in Stripe, run **Sync Revenue**, then verify:
  - the final payment remains in lifetime revenue;
  - the lead remains `converted`;
  - the client status becomes `cancelled`;
  - the exit date and churn reason are recorded;
  - automatic publishing is disabled;
  - the client disappears from active dashboards;
  - the former client cannot regain portal access by signing in again;
  - historical content, attribution and revenue remain available.

### Decisions for later

- [ ] Decide whether to remain on Vercel Hobby with consolidated endpoints and daily recovery jobs, or upgrade when more server functions or frequent cron schedules are needed.
- [ ] Decide when PIN-based legacy clients should move to Supabase Auth and self-service connections.
- [ ] Choose the next one or two clients for a controlled self-service social-connection rollout after Dwellix.

### Plan entitlement rules

- Basic and Pro retain the standard dashboard, social calendar, account, social accounts, billing and support areas.
- Analytics and Comments are available only when `clients.plan_name`, normalised to lowercase, is `max`.
- Basic and Pro users can see Analytics and Comments in the navigation, but opening them shows a locked state and an upgrade-to-Max message.
- The agreed package rule is that **Max**, not Pro, includes Analytics, Comments and Meta Ads.
- Meta Ads is currently a package/website entitlement. It is not yet implemented as a separate portal module in this repository.
- Agency/master access can open all portal features regardless of the selected client plan.

Keep the landing-page package copy, Stripe Checkout links and these entitlement rules in sync whenever packages change.

### Platform-first support and content feedback

The dashboard is the system of record. Email is an alert and escalation channel, not the primary ticket database.

Support flow:

1. A client submits a ticket from **Support**.
2. `api/support-ticket.ts` authenticates the Supabase owner or legacy PIN, records the legacy support ticket, creates a portal conversation and message, adds notifications and queues an automation job.
3. The AI worker triages the job immediately.
4. A low-risk portal or status question can receive an automatic reply.
5. Sensitive, uncertain or production-related work is acknowledged in-platform and escalated to `contact@seammedia.com.au`.
6. The client sees the conversation history on the Support page and receives an unread notification under the bell.

Content feedback flow:

1. A client adds or changes an Additional Comment in the calendar or Max Comments view.
2. `api/client-comment.ts` saves the comment and moves the post to `Revision`.
3. The request becomes a trackable `content_comment` conversation and automation job.
4. The client receives an acknowledgement; production work is escalated for review.
5. The new queue marks the legacy note notification as handled so the old notes email job does not send a duplicate alert.

Automated portal email delivery is hard-disabled at the application level. The client and agency notification bell continues to receive these events, while Resend is not called for portal feedback, support or automation alerts. Weekly analytics reports use the separate `CLIENT_ANALYTICS_EMAILS_ENABLED` switch.

Never restore the old behaviour where client feedback only overwrites `posts.notes`. Every client-originated comment must pass through the server endpoint so it is authenticated, tracked, triaged and recoverable.

### Notification bell

- `components/NotificationBell.tsx` appears in the top-right header for the selected client.
- It polls every 30 seconds, shows an unread count, supports individual or bulk read acknowledgement and navigates to the related Support or Comments area.
- Client and agency notifications are separate through the `audience` field.
- Notification API requests authenticate with a Supabase bearer token or the transitional PIN header.
- Do not put a PIN in a query string. Legacy PINs use the `X-Portal-Pin` request header to avoid URL and log exposure.

### AI triage and safety boundaries

`api/automation-worker.ts` uses the OpenAI Responses API for structured triage. Classification is a high-volume routing task, so the default model is `gpt-5.6-luna` with reasoning effort `none`. Override it with `OPENAI_AUTOMATION_MODEL` only after testing cost, latency and output quality.

The protected `POST /api/automation-worker?health=ai` check validates the provider and model without creating a client conversation. It requires the normal `CRON_SECRET` bearer token. The production fallback key returned HTTP 200 on 2026-07-21; moving that working key out of `VITE_OPENAI_API_KEY` and into a fresh server-only key remains a P0 task.

Automatic replies are limited to low-risk how-to, status and general portal questions. The worker must escalate:

- Billing changes, refunds and cancellation requests
- Credentials, account access, privacy or security issues
- Legal threats or serious complaints
- Meta Ads spend, budgets or campaign authority
- Publishing approval or actions that could publish content
- Urgent outages
- Any request where the model is uncertain
- All content production/change requests until an approved production agent is implemented

The worker must never claim work was completed unless the supplied system facts prove it. AI-generated client email copy uses Australian spelling and must not contain em dashes.

### Escalation inbox and Google Workspace limitation

- No new inbox is required. Use `contact@seammedia.com.au`.
- The automation worker sends only escalations and exhausted-job failures to this inbox. Routine requests should remain in the platform and be answered automatically.
- Messages sent by the platform to clients also appear in the client's portal conversation and notification bell.
- Direct inbound emails received by `contact@seammedia.com.au` are **not yet imported into portal conversations**.
- Importing direct inbox replies requires a one-time Google Workspace server authorisation using Gmail OAuth with a refresh token, or Gmail push notifications through Google Cloud Pub/Sub. The existing browser Gmail connection cannot act as a reliable unattended server credential.
- Do not replace the root domain's Google Workspace MX records to add inbound automation. An inbound service should connect to Gmail or use a dedicated subdomain/forwarding rule.

### Database model

Apply `supabase/portal-automation.sql`. It adds:

- `portal_conversations`: one lifecycle record for each support, content comment or inbound email thread
- `portal_messages`: client, AI, agency, system and email messages
- `portal_notifications`: client/agency notifications and read timestamps
- `portal_automation_jobs`: idempotent queued work with attempts, retry timing, results and errors
- `social_support_tickets.conversation_id`: compatibility link from the original ticket table

All four new tables have Row Level Security enabled, browser-role privileges revoked and service-role-only writes. Portal APIs validate ownership or the transitional PIN before using the service role.

The older `clients` and `posts` tables still contain permissive legacy policies used by PIN-era browser access. These should be replaced with ownership-based authenticated policies as a dedicated migration after every remaining legacy client has a safe transition path. Do not attempt this casually because it can break existing client logins and direct calendar updates.

### Processing and Vercel plan constraint

- The current Vercel Hobby plan allows only daily cron schedules.
- The Hobby plan also caps this project at 12 top-level Serverless Functions. Keep social-connections and revenue-sync logic consolidated behind existing API functions unless the plan changes.
- New platform events therefore invoke the worker immediately after the job is queued. Clients do not wait for a five-minute polling cycle.
- `/api/automation-worker` also runs daily at `0 4 * * *` as recovery for queued failures.
- The worker processes up to five ready jobs per invocation, claims each job before processing, retries transient failures up to three attempts and emails `contact@seammedia.com.au` after the final failure.
- `CRON_SECRET` protects the worker. Vercel Cron supplies `Authorization: Bearer <CRON_SECRET>` automatically.
- If the project moves to Vercel Pro, a five-minute recovery schedule can be restored with `*/5 * * * *`, but immediate event processing should remain.

### Required production environment variables

Server-only values must never be exposed in frontend code:

> **Production configuration check (2026-07-21):** the correct `SUPABASE_SERVICE_ROLE_KEY` has been added to the `seam-media-content-manager` Vercel Production environment and validated against the Content Manager project. The Content Manager and `ai-receptionist` use different Supabase projects, so their service-role keys are not interchangeable. Vercel does not export values marked Sensitive, and attempting to copy them through `vercel env pull` returns a masked placeholder. Rejected placeholder values for `STRIPE_SECRET_KEY` and `OPENAI_API_KEY` were removed. Enter fresh provider values directly in the portal project; never treat a copied Sensitive placeholder as a valid credential.

> **Production configuration check (2026-07-23):** `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `RESEND_API_KEY` and the legacy `VITE_LATE_API_KEY` are present. `STRIPE_SECRET_KEY`, `OPENAI_API_KEY` and the dedicated server-only `ZERNIO_API_KEY` are not yet present. Revenue importing will remain unavailable until the Stripe key is added. Social connections continue through the legacy Zernio-key fallback, but that key should be rotated into `ZERNIO_API_KEY`.

```env
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=...
ZERNIO_API_KEY=...
RESEND_API_KEY=...
CRON_SECRET=...
OPENAI_API_KEY=...
OPENAI_AUTOMATION_MODEL=gpt-5.6-luna
```

Frontend values:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_GOOGLE_CLIENT_ID=...
```

`VITE_OPENAI_API_KEY` is supported temporarily by the server worker for compatibility, but a proper server-only `OPENAI_API_KEY` is the required long-term configuration. Any `VITE_` value can be bundled into browser code and must not be treated as secret.

### Deployment and verification checklist

1. Apply new Supabase migrations before deploying code that queries the new tables.
2. Run `npm run build` and fix all TypeScript failures.
3. Run `git diff --check`.
4. Deploy with `npx vercel --prod --yes`.
5. Confirm the production deployment is `Ready` and aliased to `https://seam-media-content-manager.vercel.app`.
6. Verify `/login` returns HTTP 200.
7. Verify an unauthorised call to `/api/automation-worker` returns HTTP 401.
8. Submit a real low-risk support test and confirm the reply appears in Support and under the bell.
9. Submit a test content comment and confirm the post becomes `Revision`, an acknowledgement appears and only one escalation email is sent.
10. Review Vercel runtime error logs and the Supabase security/performance advisers after schema changes.

### Current automation boundaries

Live now:

- Self-service authentication, Stripe checkout hand-off and onboarding
- Immediate dashboard access after the webhook provisions the paid client and onboarding is completed, subject to the Stripe webhook being correctly configured
- Account/brand management; authenticated self-service billing currently routes through the shared TendCall billing endpoint
- Support conversations, content change requests and client notifications are deployed, but require `SUPABASE_SERVICE_ROLE_KEY` in the portal's Vercel environment
- Safe AI triage, routine automatic replies, escalations and retry recovery are deployed, but require the server credentials listed above
- `contact@seammedia.com.au` as the escalation destination

Still requires a separate implementation or authorisation:

- Importing messages received directly by the Google Workspace inbox
- An agency operations view spanning conversations for every client
- Automated editing/regeneration of captions and graphics followed by client resubmission
- A controlled content-production agent with approval gates
- Final data-retention, export and deletion policy after operational offboarding

### Files added for this workflow

- `api/_portal.ts`: shared service-role database, authentication, email and worker kick helpers
- `api/support-ticket.ts`: authenticated support intake and queue creation
- `api/client-comment.ts`: authenticated content feedback and Revision transition
- `api/conversations.ts`: client conversation history
- `api/notifications.ts`: notification list and read acknowledgement
- `api/automation-worker.ts`: OpenAI triage, replies, escalation and retries
- `components/ClientSupport.tsx`: ticket form and conversation history
- `components/NotificationBell.tsx`: top-right notification centre
- `supabase/portal-automation.sql`: conversation, notification and queue schema
- `vercel.json`: daily automation recovery schedule

## Outstanding Automation TODO

Keep this as the single prioritised list for unfinished client-portal automation work. Move an item to completed only after it has been tested in production.

Items requiring provider access, client coordination or a business decision are also summarised in the earlier **Heath action list**.

### P0 - production validation and security

- [ ] Add a valid `STRIPE_SECRET_KEY` directly to the `seam-media-content-manager` Vercel Production environment, then redeploy and validate it. Vercel Sensitive values cannot be copied with `env pull`.
- [ ] Create or rotate a valid OpenAI key, add it directly as server-only `OPENAI_API_KEY`, verify `/api/automation-worker?health=ai`, then remove the browser-exposed `VITE_OPENAI_API_KEY`.
- [x] First real paid signup completed by Dwellix: account creation, Stripe Checkout, provisioning, onboarding and immediate dashboard access.
- [ ] Repeat the full signup using a controlled customer/test account before changing checkout or webhook behaviour.
- [ ] Verify the shared Stripe webhook records the correct social `plan_name`, `billing_cycle`, Stripe customer/subscription IDs and `pending_intake` lifecycle for all six Basic/Pro/Max monthly and annual links.
- [ ] Verify subscription cancellation and failed-payment events update portal access correctly without deleting client content prematurely.
- [ ] Submit one low-risk support request in production and confirm the AI reply appears in Support, under the notification bell and by client email.
- [ ] Submit one content change request and confirm the post moves to `Revision`, one automation job is created and only one escalation reaches `contact@seammedia.com.au`.
- [ ] Migrate any remaining browser OpenAI calls behind authenticated server endpoints after the server-only key is confirmed.
- [ ] Replace permissive legacy `clients` and `posts` policies with ownership-based RLS after every PIN-only client has a tested migration path.
- [ ] Revoke public execution of the legacy `submit_social_support_ticket` SECURITY DEFINER RPC after legacy PIN support is removed.

### P1 - hands-off operations

- [ ] Run `scripts/sync-client-folders.mjs` from a trusted local scheduled runner so paid clients receive a PortableSSD workspace without manual intervention. The runner must verify that `/Volumes/PortableSSD/Clients` is mounted and must report failures rather than writing elsewhere.
- [ ] Extend the folder sync to refresh generated client metadata after onboarding while preserving human-authored client notes.
- [ ] Authorise `contact@seammedia.com.au` for unattended Gmail access using server-side OAuth and a refresh token.
- [ ] Import direct inbound emails and replies into the correct `portal_conversations` thread with message-ID-based deduplication.
- [ ] Add an agency-wide operations inbox showing every client's open, escalated, failed and waiting-on-client conversations.
- [ ] Add agency replies, internal notes, assignment, status changes and resolution controls to the operations inbox.
- [ ] Add client replies to an existing Support conversation instead of requiring a new ticket for every follow-up.
- [ ] Add service-level timers and reminders for escalated requests that have not been handled.
- [ ] Add attachments to support tickets and content change requests with private storage and file validation.
- [ ] Add structured audit events for automatic replies, emails, status changes and agency actions.
- [ ] Add monitoring for failed Resend, Stripe, OpenAI and Supabase calls with a clear owner alert.

### P2 - content production automation

- [ ] Add an approval-gated first-calendar workflow after onboarding. It should create a client brief and proposed content batch, then add posts as `For Approval`; it must not schedule or publish automatically.
- [ ] Build an approval-gated production agent that can revise captions and hashtags from client feedback, save a new version and resubmit it for approval.
- [ ] Add image/graphic revision automation only where brand assets and templates make the result predictable; uncertain visual work must remain escalated.
- [ ] Store content versions so clients and the agency can compare the original, requested change and resubmitted version.
- [ ] Add explicit approval gates before publishing, changing ad spend or modifying social-account connections.
- [ ] Implement a portal Meta Ads area for Max clients; Meta Ads is currently a package entitlement only.
- [ ] Expand Max analytics from calendar-derived metrics to connected platform performance data.

### P3 - offboarding and infrastructure

- [ ] Define and implement offboarding retention rules for posts, brand assets, conversations, invoices and analytics.
- [ ] Give clients a self-service export before account deletion or retention expiry.
- [ ] Add scheduled deletion/anonymisation only after the retention policy and recovery window are approved.
- [ ] Document how paused subscriptions differ from cancelled and fully offboarded clients.
- [ ] Consider Vercel Pro if five-minute recovery processing is required; immediate event processing should remain even after upgrading.
- [ ] Remove transitional PIN authentication after all clients use Supabase Auth.

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
- `api/notify-notes.ts` - Legacy notes notification endpoint; portal email delivery is currently disabled
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

## Social content intelligence loop

This system adapts Alex Lieberman's content-machine workflow into a client-safe agency process. Its purpose is not to let AI publish more generic content. Its purpose is to reduce research and blank-page work, preserve real client expertise, and make each future content batch more informed by evidence.

### Current implementation status

- [x] Production Supabase migration applied: `supabase/migrations/20260721203418_content_intelligence_learning_loop.sql`.
- [x] 36 client intelligence profiles seeded in production.
- [x] Seam Media configured for daily research into SEO, Google Search, Google Business Profile, social platform releases, marketing tools, and AI marketing workflows.
- [x] Finance-like clients seeded with RBA, ASIC, MoneySmart, APRA, ATO, ABS, lending, and financial-wellbeing sources.
- [x] Current ideas and active learnings connected to the Generate Posts workflow.
- [x] Generated content defaults to `For Approval`.
- [x] Client analytics screen can display connected-platform performance and active learnings.
- [x] Production build passes.
- [x] Application code deployed to Vercel.
- [x] Analytics access is an explicit per-client entitlement rather than a plan-wide unlock.
- [x] Weekly analytics opt-in enables the matching 30-day content-intelligence profile.
- [x] Bulk scheduling defaults to varied posting times and adopts Zernio best-time slots when enough evidence is available.
- [ ] Fresh server-only `OPENAI_API_KEY` configured.
- [ ] Dedicated server-only `ZERNIO_API_KEY` configured; production currently uses the legacy server fallback.
- [ ] Pilot clients selected and non-pilot profiles disabled.

The daily `/api/automation-worker` cron processes the content queue only when no client portal replies are waiting. Seam Media receives daily current-idea discovery. Analytics-enabled clients are distributed across stable weekdays for weekly discovery and 30-day analytics reviews. Durable queued jobs continue on a later run if the worker reaches its execution limit.

The scheduler initially rotates approved posts through varied morning, midday, afternoon and evening times. Once Zernio returns reliable best-time slots, the strongest learned slots replace that fallback automatically. The weekly review also receives captions, hashtags, content type, media type and carousel metadata so it can compare format and creative patterns. Posting-time findings remain correlations and are treated as scheduling guidance rather than proof of causation.

### Core learnings from the content-machine workflow

1. Trusted distribution is a durable business advantage. Every client business can benefit from behaving partly like a media company.
2. Map the complete content workflow before automating it. Inspiration, research, point of view, format, drafting, editing, derivatives, publishing, and measurement are separate jobs.
3. Design the ideal workflow without today's staffing constraints, then decide where AI drives, assists, or stays out.
4. AI is particularly useful for reducing blank-page friction by scanning recent internal and external signals and ranking specific content opportunities.
5. Strong opportunities contain a real story, clear position, concrete example, useful decision, or recurring customer question.
6. Research should include internal signals, authoritative industry sources, and previous strong content that could be repurposed.
7. Lived experience may not need external research, but current facts, releases, statistics, regulations, and claims must be verified.
8. The interview or client-input step is the main quality bottleneck. Generic input produces generic output.
9. AI must not manufacture the client's opinion. The client or account manager supplies the point of view, examples, anecdotes, objections, and recognisable language.
10. Voice should be learned from approved, high-performing work, including tone, hook patterns, structure, length, themes, and language preferences.
11. Drafting should shape the client's supplied expertise rather than invent a new persona or unsupported expertise.
12. Confirmed editing feedback should become durable content lessons so the same error is not repeated.
13. Editorial review needs observable criteria: usefulness, specificity, voice, evidence, compliance, novelty, platform fit, and objective alignment.
14. The final human edit and approval remain mandatory. If AI takes longer than writing manually, write the piece manually.
15. One approved anchor idea can be adapted into suitable derivatives for each platform.
16. Performance closes the loop, but a single high-performing or failed post must never become a permanent rule.
17. Compare posts at similar ages and segment results by platform, topic, objective, format, and posting window.
18. Every durable learning must include its sample size, evidence, confidence, recommendation, and last-confirmed date.
19. Platform best-time data is a scheduling prior, not proof that posting time caused the result.
20. Optimise for the client's actual objective, not reach alone. Awareness, consideration, conversion, and community require different measures.
21. Run one controlled experiment at a time where practical, such as hook, topic framing, format, caption length, posting window, or call to action.
22. Current news is an input, not a complete post. High-quality content adds a client-specific interpretation, example, or decision.
23. Employee advocacy can extend distribution and recruitment when participation is voluntary and rewards contribution rather than impressions alone.
24. Discovery, analytics, and learning jobs never approve, schedule, or publish content.

### Content research defaults

#### Seam Media

- SEO and Google Search updates
- Google Business Profile changes
- Meta, Instagram, LinkedIn, and other platform releases
- Marketing tools and workflow improvements
- AI-assisted marketing operations
- Practical Australian local-business marketing
- Primary sources from Google, Meta, Instagram, LinkedIn, and OpenAI
- Reputable trade reporting for discovery, followed by primary-source verification

#### Australian finance clients

- Reserve Bank decisions and publications
- ASIC and MoneySmart consumer guidance
- APRA lending and banking updates
- Relevant ATO changes
- ABS economic releases
- Lending, mortgage, small-business finance, and financial-wellbeing education
- No guaranteed rates, approvals, eligibility, savings, or outcomes
- Client-specific licence, disclaimer, and compliance review requirements always apply

### Rollout to-do list

Use this checklist when ready to proceed.

#### Phase 1: isolate a safe release

- [ ] Create a dedicated branch, recommended: `codex/social-learning-loop-rollout`.
- [ ] Do not deploy the current working directory directly because it contains extensive unrelated work.
- [ ] Audit the complete dependency set for `App.tsx`, the portal components, `api/automation-worker.ts`, and `api/_portal.ts`.
- [ ] Include the content-intelligence API, content-context API, UI changes, migration history, skill, research documents, and `vercel.json`.
- [ ] Confirm the isolated branch still passes `npm run build`.
- [ ] Review the final branch diff for unrelated client assets, scripts, and unfinished portal work.

#### Phase 2: production secrets

- [ ] Create a fresh OpenAI API key.
- [ ] Add it to Vercel Production as sensitive server-only `OPENAI_API_KEY`.
- [ ] Verify the AI health endpoint, then remove the browser-exposed `VITE_OPENAI_API_KEY`.
- [ ] Create or rotate a Zernio API key.
- [ ] Add it to Vercel Production as sensitive server-only `ZERNIO_API_KEY`.
- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` remain present in Production.
- [ ] Never copy a masked Vercel sensitive-variable placeholder into another environment.

Required production variables:

```text
OPENAI_API_KEY
ZERNIO_API_KEY
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Optional model override:

```text
OPENAI_CONTENT_INTELLIGENCE_MODEL
```

#### Phase 3: configure the pilot

- [ ] Disable every `content_intelligence_profiles` record before the first application deployment.
- [ ] Enable Seam Media.
- [ ] Select and enable one finance client with connected social profiles and enough published history.
- [ ] Review each pilot's audience, objectives, topics, trusted domains, exclusions, platforms, timezone, frequency, lookback, and minimum sample.
- [ ] Record the finance client's real licence details, required disclaimers, prohibited claims, and approval process.
- [ ] Confirm each pilot has valid Zernio profile IDs in `clients.late_profile_ids`.
- [ ] Confirm published posts contain valid `late_post_id` values.
- [ ] Expect `insufficient_sample` until at least five comparable posts are available.

#### Phase 4: preview deployment

- [ ] Create a Vercel preview deployment from the isolated branch.
- [ ] Test agency login and client login.
- [ ] Test the Generate Posts modal.
- [ ] Test the client analytics screen.
- [ ] Test `/api/content-context` authentication and client isolation.
- [ ] Run the protected AI health check without creating content jobs.
- [ ] Confirm generated test posts remain `For Approval`.
- [ ] Confirm nothing schedules or publishes automatically.
- [ ] Confirm a used idea retains its exact verified source URL in internal notes.
- [ ] Confirm finance drafts do not introduce unsupported claims.
- [ ] Do not run the full worker from a preview connected to the production database.

Protected AI health check:

```text
GET /api/automation-worker?health=ai
Authorization: Bearer <CRON_SECRET>
```

#### Phase 5: production deployment

- [ ] Promote the exact preview deployment that passed testing.
- [ ] Confirm the production cron routes appear in Vercel.
- [ ] Confirm `/api/automation-worker` rejects requests without the correct bearer secret.
- [ ] Confirm the content-manager production environment points to the correct Supabase project.
- [ ] Check deployment and function logs immediately after promotion.
- [ ] Confirm the daily worker schedule. `0 4 * * *` is 4:00 am UTC and currently 2:00 pm Melbourne during AEST.

#### Phase 6: first production cycle

- [ ] Manually trigger one authenticated production worker run.
- [ ] Confirm pilot jobs move from `queued` to `completed`.
- [ ] Confirm Seam Media receives current sourced ideas.
- [ ] Open every first-run source URL and verify freshness, authority, and angle support.
- [ ] Confirm finance research uses appropriate authoritative sources.
- [ ] Confirm metric snapshot rows are created for eligible published posts.
- [ ] Confirm best-time data is treated as guidance.
- [ ] Confirm no post is automatically approved, scheduled, or published.
- [ ] Review failed jobs and correct authentication, model, source, or analytics issues before continuing.

Expected production tables:

```text
content_intelligence_profiles
content_intelligence_jobs
content_ideas
social_post_metric_snapshots
content_learnings
```

#### Phase 7: two-week pilot process

- [ ] Manually review every discovered idea during the pilot.
- [ ] Reject stale, duplicated, weakly related, unsupported, or overly generic ideas.
- [ ] Select ideas where the client can add a real opinion, example, customer question, or decision.
- [ ] Gather client point of view before drafting thought-leadership content.
- [ ] Verify every unstable fact against a primary source.
- [ ] Review every draft for brand voice, usefulness, source support, compliance, and platform fit.
- [ ] Keep final client approval in the existing approval workflow.
- [ ] Select one controlled experiment for each pilot's next batch.
- [ ] Record whether the system improves draft quality or reduces production time.

#### Phase 8: monitoring and operations

- [ ] Alert the agency when a content-intelligence job fails three times.
- [ ] Alert when the oldest queued job is more than 48 hours old.
- [ ] Alert when OpenAI or Zernio authentication fails.
- [ ] Alert when a pilot repeatedly produces no usable ideas.
- [ ] Create a weekly internal summary of completed jobs, failed jobs, new ideas, used ideas, analytics coverage, new learnings, and estimated AI usage.
- [ ] Review active learnings weekly and retire or weaken contradicted findings.
- [ ] Monitor Vercel duration limits and content-job backlog.

#### Phase 9: remaining learning improvements

- [ ] Store the original generated caption separately from the approved final caption.
- [ ] Compare first draft versus approved copy.
- [ ] Require human confirmation before an editing preference becomes a permanent voice lesson.
- [ ] Add post metadata for content pillar, objective, hook type, format, and experiment ID.
- [ ] Add an agency idea inbox with shortlist, reject, request client input, and used actions.
- [ ] Add learning states: candidate, active, contradicted, and retired.
- [ ] Add automated failure and backlog notifications.
- [ ] Add conversion data later through reliable GA4, CRM, lead, or revenue attribution.

#### Phase 10: staged client expansion

- [ ] Week 1: Seam Media and one finance client.
- [ ] Week 2: add three to five clients with reliable account connections.
- [ ] Week 3: add clients with more complex compliance review.
- [ ] Week 4: enable the remaining suitable clients.
- [ ] Do not enable clients with unclear compliance, missing connections, insufficient history, or no interest in news-led content.
- [ ] Review research sources and compliance profiles quarterly.

#### Pilot success criteria

- [ ] At least 90% of scheduled jobs complete successfully.
- [ ] Every used current-affairs idea has a valid supporting source URL.
- [ ] Zero posts publish without explicit approval.
- [ ] Account managers find the ranked idea queue useful.
- [ ] Draft quality improves or production time decreases.
- [ ] Durable learnings show evidence, sample size, and confidence.
- [ ] No permanent rule is created from one post.
- [ ] No regulated claim is published without verification.
- [ ] OpenAI and Zernio costs remain acceptable.
- [ ] The worker remains within Vercel execution limits.

#### Security work before broad rollout

- [ ] Review and replace the existing permissive RLS policies on `clients` and `posts`.
- [ ] Review the public storage-bucket listing policy.
- [ ] Review publicly executable security-definer functions.
- [ ] Test security changes in preview because tightening existing policies may break current frontend access.
- [ ] Re-run Supabase security advisors after the security migration.

### Supporting resources

- Reusable workflow: `codex-skills/run-social-learning-loop/`
- Full video transcript: `docs/research/alex-lieberman-content-machine-transcript.md`
- Video analysis and implementation map: `docs/research/alex-lieberman-content-machine-analysis.md`
- Analytics test utility: `codex-skills/run-social-learning-loop/scripts/analyse_performance.mjs`

## Weekly Social Stat Emails

This is the production operating guide for the opt-in Monday social performance emails sent to Seam Media clients. Use this section as the source of truth when reviewing the system, adding a client, sending a test, changing the email, or diagnosing a missed report.

### Current production status

Recorded 3 August 2026:

- Weekly analytics report delivery is controlled separately by `CLIENT_ANALYTICS_EMAILS_ENABLED` and per-client opt-ins.
- Portal feedback, support and automation emails remain hard-disabled at the application level.
- Existing client opt-ins, report previews and run history remain available.
- Client portal analytics access is controlled by `clients.analytics_enabled` and is synchronised with weekly report opt-in.
- Comments and Social Inbox remain locked for client accounts while agency administration access is preserved.

Rollout recorded 5 August 2026:

- Analytics entitlement and 30-day weekly learning are enabled for Built3d, Micro Demo, Salters, Dwellix, FITxG4 and Philotimo Freestyle Jujitsu.
- Weekly Monday 9:00 am reports are enabled for Built3d, Micro Demo, FITxG4 and Philotimo Freestyle Jujitsu.
- Salters has connected Zernio accounts, the client mapping is synchronised, and Monday report delivery is enabled.
- Dwellix has no connected Zernio social account yet, so report delivery remains disabled.
- Client portal Analytics loads the live 30 completed-day Zernio report on demand and uses stored snapshots only as a provider-failure fallback.

Email analytics expansion recorded 9 August 2026:

- The existing opt-in Monday email now includes the same richer story as the client Analytics page: a daily performance chart, channel contribution, engagement breakdown and top-performing content.
- Every live preview and scheduled email requests received-attribution daily data plus the leading Zernio posts for the same completed 30-day period.
- The email includes a direct link to the full client analytics dashboard.
- The recipient list, opt-in state, send schedule and duplicate protection were not changed by this template expansion.

Vercel Pro resolved the earlier function-count and hourly-cron plan limits. It did not by itself configure the email provider, analytics provider, environment variables, database migration, client mapping, opt-in, or delivery testing. Those remain separate requirements.

### End-to-end flow

1. Vercel invokes the protected report endpoint hourly.
2. The endpoint authenticates the request with `CRON_SECRET`.
3. It loads only clients explicitly enabled in `client_analytics_report_settings`.
4. It checks the saved Monday time in `Australia/Melbourne`.
5. It skips inactive, cancelled, unpaid, incompletely configured, or not-yet-due clients.
6. It requests two completed 30-day comparison periods, the current received-attribution daily series and the current period's top posts from Zernio using the client's `zernio_profile_id`.
7. It builds headline totals, a daily performance chart, channel contribution, engagement mix, top-performing content, percentage changes and per-platform comparison charts.
8. It creates and claims a run record before sending.
9. Resend delivers only explicitly enabled weekly analytics reports; the portal alert shutdown does not use this path.
10. The run record is updated with `sent` or `failed`, the provider message ID, timestamps and any error.

The provider chain is:

```text
Zernio analytics -> Content Manager report builder -> Vercel scheduler -> Resend -> client inbox
```

Gmail is not the sending transport for these reports.

The client portal uses the same live Zernio provider and reporting-period calculation. Opening **Analytics** requests the latest 30 completed Melbourne days immediately, so the dashboard does not wait for the weekly learning job to create stored post snapshots. The dashboard displays headline totals and all returned metrics by platform. Stored snapshots remain a fallback when the live provider is temporarily unavailable.

### Reporting rules

- Each email covers the 30 completed Melbourne calendar days ending yesterday.
- It compares that period with the immediately preceding 30 completed days.
- The report is grouped by platform.
- Supported metrics are impressions, reach, likes, comments, shares, saves, clicks and video views.
- Only metrics returned by Zernio are shown.
- A missing provider metric must not be presented as a measured zero.
- Percentage change is shown only when a valid non-zero previous value exists.
- Positive changes are green.
- Negative changes are red.
- Steady results are grey.
- The HTML email includes a daily performance bar chart using received-attribution data when Zernio returns it. If that optional call is unavailable, it falls back to data grouped by post publish date.
- The daily chart shows the latest 10 active days within the current period and identifies the peak day. It does not imply that missing days were measured zeros.
- The HTML email includes a channel-contribution chart using the first available meaningful total in this order: reach, impressions, video views, then engagements.
- The HTML email includes a measured engagement breakdown across likes, comments, shares and saves.
- Up to three top-performing posts are shown when Zernio returns post-level analytics, including platform, date, content excerpt, leading metrics and a post link when available.
- The HTML email includes an email-safe current-versus-previous comparison chart for up to four leading metrics on each platform.
- Charts use nested HTML tables and inline styles so they render reliably in Gmail and Outlook. Do not replace them with JavaScript, canvas or unsupported interactive charts.
- The current-versus-previous chart still compares two fixed 30-day periods. The daily chart is an activity view inside the current period, not a long-term multi-month trend.
- If usable data is unavailable, the client receives a clear waiting-for-data explanation rather than invented figures.
- The plain-text fallback contains the same core figures, daily trend, channel contribution, engagement breakdown, top content, comparison wording and dashboard link without the visual charts.

### Live Zernio contract

The production provider calls:

```text
GET https://zernio.com/api/v1/analytics/daily-metrics
Authorization: Bearer <ZERNIO_API_KEY>
```

Query parameters:

```text
profileId=<clients.zernio_profile_id>
fromDate=<period start at 00:00:00.000Z>
toDate=<period end at 23:59:59.999Z>
source=all
attribution=publish
```

The two fixed-period comparisons use `platformBreakdown` from this response. The email also requests the current period from the same endpoint with `attribution=received` for the daily chart, then falls back to the current published-attribution `dailyData` if received-attribution data is unavailable.

Top-performing content is requested from:

```text
GET https://zernio.com/api/v1/analytics
Authorization: Bearer <ZERNIO_API_KEY>
```

with the same `profileId`, current completed 30-day date range, `source=all`, `sortBy=engagement`, `order=desc` and a maximum of six returned posts. The email displays up to the leading three. A top-post request failure does not block the core weekly report.

The following metric aliases are normalised:

| Report metric | Accepted provider fields |
| --- | --- |
| Impressions | `impressions` |
| Reach | `reach` |
| Likes | `likes`, `likeCount`, `like_count` |
| Comments | `comments`, `commentCount`, `comment_count` |
| Shares | `shares`, `shareCount`, `share_count` |
| Saves | `saves`, `saved` |
| Clicks | `clicks`, `linkClicks`, `link_clicks` |
| Video views | `views`, `videoViews`, `video_views`, `playCount`, `play_count` |

Use the dedicated server-only `ZERNIO_API_KEY`. `VITE_LATE_API_KEY` remains a legacy fallback in the code, but browser-exposed credentials should not be the production analytics standard.

### Required production configuration

Server-only Vercel environment variables:

```text
CLIENT_ANALYTICS_EMAILS_ENABLED=true
CLIENT_ANALYTICS_FROM=Seam Media <notifications@seammedia.com.au>
CLIENT_ANALYTICS_REPLY_TO=contact@seammedia.com.au
CRON_SECRET
RESEND_API_KEY
ZERNIO_API_KEY
SUPABASE_SERVICE_ROLE_KEY
```

The application also requires its normal Supabase URL and public key configuration.

Never place secret values in this README, application logs, screenshots, test output, browser code or client-facing messages. If a secret is exposed, rotate it.

The required database migration is:

```text
supabase/migrations/20260729221304_add_client_analytics_email_reports.sql
```

It creates:

- `client_analytics_report_settings` for per-client opt-in, recipient and schedule settings.
- `client_analytics_report_runs` for generation, delivery, provider IDs and errors.
- A unique constraint on `(client_id, period_end)` to prevent duplicate sends for the same reporting period.
- service-role-only table access.

### Add a new client

Do not enable a client only because their email address exists. Complete every step:

1. Confirm the client is active and should receive the report.
2. Confirm `provisioning_status` is not `paused` or `cancelled`.
3. Confirm `subscription_status` is not `cancelled`, `unpaid` or `incomplete_expired`.
4. Confirm `clients.zernio_profile_id` contains the correct Zernio profile.
5. Confirm `clients.late_profile_ids` contains at least one connected social account ID.
6. Sign in to the Content Manager as the Seam Media master account.
7. Open **Analytics emails** in the agency sidebar.
8. Find the client and confirm the readiness indicators are healthy.
9. Enter the recipient name and email address.
10. Set the required Monday send time. The saved timezone remains `Australia/Melbourne`.
11. Select **Preview available data**.
12. Confirm the preview says provider `zernio_api`, uses the correct client name, and contains the expected platforms and recent post counts.
13. Reconcile reach, impressions and other important totals with Zernio or the native platform for the same completed date range.
14. Confirm the percentage direction and chart comparison are sensible.
15. Tick **Opt client in** and save the settings.
16. Reopen or refresh the screen and confirm the opt-in remained saved and client portal analytics is unlocked.
17. Send a controlled test to `contact@seammedia.com.au` if requested.
18. Confirm the test appears in the inbox from `notifications@seammedia.com.au`, has the expected charts, and replies route to `contact@seammedia.com.au`.
19. Monitor the first Monday run in the Analytics emails run history and in Resend.

Enabling one client must not alter any other client's settings. Leave all clients disabled unless specifically approved.

Saving an enabled opt-in also enables the client's 30-day content-intelligence profile. Disabling the opt-in locks client portal analytics and pauses future learning jobs for that client without deleting historical metrics or learnings.

### Preview and test-send rules

- **Preview available data** is read-only for delivery. It renders the real current report and updates `last_previewed_at`, but it does not send.
- **Preview example data** is for layout testing only. Never represent mock figures as real client performance.
- The production preview endpoint requires the Seam Media master PIN.
- Send tests only when explicitly requested.
- Send tests to the address named by the requester, normally `contact@seammedia.com.au`.
- Prefix test subjects with `[TEST]`.
- Use the exact production-generated HTML and text, not a hand-recreated approximation.
- Use the production Resend sender and reply-to settings.
- After Resend accepts the message, confirm inbox arrival when mailbox access is available.
- A Resend message ID proves provider acceptance. Inbox confirmation provides stronger end-to-end evidence.
- A test send must not create or consume the client's scheduled Monday run record.
- Never temporarily change Joe's or another client's saved recipient to send an internal test.

### Scheduler and duplicate prevention

The Vercel cron entry is:

```json
{
  "path": "/api/client-analytics-report-run",
  "schedule": "0 * * * *"
}
```

The hourly schedule is intentional:

- Individual clients can have different Monday send times.
- The endpoint performs the Melbourne weekday and time check.
- Melbourne daylight-saving changes do not require editing a fixed UTC Monday schedule.
- The due window lasts one hour.

The protected endpoint accepts `GET` or `POST` only with:

```text
Authorization: Bearer <CRON_SECRET>
```

Duplicate protection is layered:

1. A unique database constraint prevents a second run for the same client and period end.
2. The worker records the run before delivery.
3. A conditional status change from `generated` to `sending` claims the run.
4. Competing or repeated workers return `duplicate_prevented`.

Do not remove this protection when changing scheduling or delivery code.

### Pause and recovery controls

To pause one client:

1. Open **Analytics emails**.
2. Untick **Opt client in**.
3. Save.

To pause all weekly analytics reports temporarily, set the separate global switch below to `false`:

```text
CLIENT_ANALYTICS_EMAILS_ENABLED=false
```

Saved client opt-ins remain in the database, but the run endpoint sends nothing while the global switch is off. This switch does not re-enable portal feedback, support or automation emails; those remain hard-disabled separately.

If a run fails:

1. Read the latest `client_analytics_report_runs` row and Vercel function logs.
2. Identify whether the failure came from eligibility, Zernio, Resend, authentication, missing environment configuration or the database.
3. Correct the cause before retrying.
4. Check whether a run row already exists for that client and period.
5. Do not delete or bypass duplicate protection casually. Confirm whether Resend accepted the original message first.
6. If a deliberate retry is necessary, resolve the exact client and period and preserve an audit trail.

### Verification checklist after changing the system

Run:

```bash
npm run test:analytics-reports
npm run build
```

Then verify:

- All focused analytics tests pass.
- The production build succeeds.
- No em dash appears in the email text or HTML.
- Positive, negative and steady change colours render correctly.
- Charts show current and previous labels and values.
- The daily trend, channel contribution and engagement breakdown appear when the corresponding provider data exists.
- Top-performing content appears when Zernio returns post-level analytics, and disappears cleanly when it does not.
- The dashboard button links to `https://seam-media-content-manager.vercel.app/`.
- The HTML contains no JavaScript, canvas or SVG charts.
- Clients without a valid previous value do not receive a misleading percentage.
- Preview mode still reports `sent: false`.
- The cron endpoint still rejects an invalid secret.
- The production deployment reaches `READY`.
- A controlled test reaches the requested inbox when the email template or transport changes materially.

Existing bundle-size warnings are not specific to this reporting workflow if the build otherwise succeeds.

### Troubleshooting

| Symptom | Check |
| --- | --- |
| Client is missing from Analytics emails | Confirm the client is not the Seam Media master record, is active, and has a plan or connected social setup. |
| Opt-in is disabled | Confirm `zernio_profile_id` and at least one `late_profile_ids` value exist. |
| Preview says analytics are not configured | Confirm server-only `ZERNIO_API_KEY` exists in the deployed environment. |
| Preview has no data | Check the profile mapping, requested dates, Zernio `platformBreakdown`, post history and provider metric availability. |
| Percentage is absent | The previous value is missing or zero, so a percentage would be misleading. |
| Chart is absent | No comparable previous-period metrics were returned. |
| Daily trend is absent | Zernio returned no usable daily reach, impressions, video-view or engagement values for the current period. |
| Top content is absent | Zernio returned no post-level analytics for the period, or the optional top-post request failed. The core report can still send. |
| Email did not send | Check the global switch, client opt-in, Monday time, active status, cron authentication and run history. |
| Resend rejected the email | Check the API key, verified sending domain, sender address and Resend logs. |
| Duplicate was prevented | A run already exists for that client and reporting period. Confirm the original outcome before considering any retry. |
| Email was accepted but not visible | Search spam and other categories, then inspect Resend delivery events and the exact recipient. |
| Monday timing is wrong | Confirm the saved time and that calculations use `Australia/Melbourne`, not a fixed UTC assumption. |

### Implementation files

| Purpose | File |
| --- | --- |
| Report periods, Zernio adapter, metrics, email HTML/text, charts and Resend transport | `server/clientAnalyticsReports.ts` |
| Agency settings and per-client opt-in API | `api/client-analytics-report-settings.ts` |
| Live and mock preview API | `api/client-analytics-report-preview.ts` |
| Scheduled generation and delivery worker | `api/client-analytics-report-run.ts` |
| Agency Analytics emails screen | `components/ClientAnalyticsEmailSettings.tsx` |
| Agency sidebar route | `components/ClientPortalSidebar.tsx` and `App.tsx` |
| Database schema | `supabase/migrations/20260729221304_add_client_analytics_email_reports.sql` |
| Vercel scheduler | `vercel.json` |
| Focused tests | `tests/client-analytics-reports.test.ts` |

### Safe improvement backlog

- Add a controlled **Send test** action to the agency screen so internal tests do not require a separate operational call.
- Add Resend delivery-event visibility alongside application run history.
- Add alerting for failed Monday sends.
- Add a true multi-week or multi-month trend chart backed by stored historical series.
- Consider client-specific branding only after the shared template remains stable.
- Keep Resend as the unattended transport unless a Gmail migration includes durable OAuth refresh-token storage, quota handling and operational monitoring.

## Current Client Retention Dashboard

The agency Lead Management area now includes a **Current clients** tab beside **Lead pipeline**. It turns relationship context, current-week delivery and analytics-reporting activity into one retention queue.

### Baseline shown by the first live version

- The tab is intentionally limited to the new Basic, Pro and Max social-service cohort.
- The initial cohort is Built3d, FITxG4, Micro Demo, Philotimo Freestyle Jujitsu and Dwellix.
- Known MRR is initially `$2,195` across these five newly converted clients.
- Legacy social-management clients are excluded for now and can be handled as a separate retention project.
- A missing contact record, missing analytics report and no scheduled content are treated as warning signals, not proof that a client will churn.

### Health and risk model

- **Relationship health** is Heath's human assessment from 0 to 100, where 100 is healthiest.
- **Churn risk** is an explainable prioritisation score from 0 to 100, where 100 needs the most urgent attention.
- Churn risk is not presented as a statistical probability until enough historical retention data exists to calibrate a real model.
- Signals include relationship health, issue severity, payment status, onboarding progress, renewal sentiment, scope pressure, performance concerns, time since meaningful contact, overdue next actions, delivery status, analytics-report recency and recent positive feedback.
- Every client review records the assessment confidence so uncertain judgements are not treated as hard facts.

### Weekly operating habit

1. Open **Lead Management → Current clients**.
2. Start with **Needs attention**.
3. Record MRR, relationship health, the latest meaningful contact and one dated next action.
4. Record expectation or revision pressure as scope pressure, and describe the exact issue.
5. Review all new clients weekly through their first 90 days.
6. Use the analytics email as a proactive retention touchpoint, then record any reply or positive feedback in the health review.

### Analytics email improvements

The client email now starts with a compact **At a glance** summary, then shows **Daily performance trend**, **Channel contribution**, **How people responded** and **Top-performing content** before explaining **What changed**, **Our focus for the next period** and detailed platform comparisons. It finishes with a link to the full analytics dashboard. This makes the value easier to understand without removing the underlying evidence.

Inactive legacy workspaces are excluded from the Analytics emails setup list. The enabled-delivery status copy now reflects the actual global switch instead of always warning that delivery is disabled.

### Implementation files

| Purpose | File |
| --- | --- |
| Current client table, filters and review form | `components/lead-management/CurrentClients.tsx` |
| Lead Management tab integration | `components/LeadManagement.tsx` |
| Client health and risk types | `components/lead-management/types.ts` |
| Agency-only aggregation and health updates | `server/agencyLeads.ts` |
| Private client-health database table | `supabase/migrations/20260731024051_agency_client_health.sql` |
| Improved analytics email | `server/clientAnalyticsReports.ts` |
| Active-client email eligibility | `api/client-analytics-report-settings.ts` |

## Future Enhancements

Potential features to add:
- [x] ~~Email notifications when posts are approved~~ ✅ **COMPLETED** - Gmail API integration
- [x] ~~Social media API integration~~ ✅ **COMPLETED** - Late API (replaced Meta direct integration)
- [x] ~~Automated scheduling when status = "Approved"~~ ✅ **COMPLETED**
- [x] ~~AI Caption Generation~~ ✅ **COMPLETED** - Gemini 2.0 Flash
- [x] ~~Supabase Storage for images~~ ✅ **COMPLETED** - Public URLs for Late API
- [x] ~~Auto image cropping for Instagram~~ ✅ **COMPLETED** - Aspect ratio 0.75-1.91
- [x] ~~Storage cleanup~~ ✅ **COMPLETED** - Auto-delete after 60 days
- [x] ~~Client notes tracking and in-platform notifications~~ ✅ **COMPLETED** - Tracked feedback, notification bell and automation queue; legacy portal email delivery disabled
- [x] ~~TikTok/Reels video support~~ ✅ **COMPLETED** - Full video upload and scheduling
- [x] ~~Google Drive integration~~ ✅ **COMPLETED** - Fetch images from client Drive folders
- [x] ~~Client notification bell~~ ✅ **COMPLETED** - Unread client and agency notifications
- [x] ~~Trackable support conversations~~ ✅ **COMPLETED** - In-platform history with AI triage
- [x] ~~Automated content feedback queue~~ ✅ **COMPLETED** - Revision status, acknowledgement and escalation
- [x] ~~Opt-in Monday client analytics emails~~ ✅ **LIVE** - Zernio analytics, Monday scheduling, Resend delivery, comparison charts, duplicate prevention and agency setup UI. Operating guide: **Weekly Social Stat Emails** in this README.
- [x] ~~Current client health and retention queue~~ ✅ **LIVE** - Relationship health, explainable churn-risk signals, delivery status, MRR gaps and dated next actions.
- [ ] Import direct replies from `contact@seammedia.com.au` into portal conversations
- [ ] Agency-wide operations inbox for all client conversations
- [ ] Approved content-production agent for automatic revisions and resubmission
- [ ] Automated offboarding retention, export and deletion workflow
- [ ] Refresh token for Gmail (avoid re-auth every hour)
- [ ] Client-specific branding/themes
- [ ] Usage analytics per client
- [ ] Export to PDF/Excel
- [ ] Comment threads and @mentions
- [ ] File attachments beyond images/videos
- [ ] Mobile app

## License

© 2026 Seam Media

---

**Questions?** Check the troubleshooting section or create an issue on GitHub.
