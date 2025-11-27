# Deployment Guide - Light Dust Content Manager

## Quick Fix Summary

The deployment was failing because **Vite requires all client-side environment variables to be prefixed with `VITE_`**.

### What Was Fixed:

1. ✅ Updated all environment variable references from `process.env.X` to `import.meta.env.VITE_X`
2. ✅ Simplified `vite.config.ts` to remove manual env variable injection
3. ✅ Added TypeScript definitions for environment variables in `vite-env.d.ts`
4. ✅ Updated Gemini AI SDK from deprecated `@google/genai` to `@google/generative-ai`
5. ✅ Created `supabase-schema.sql` for easy database setup
6. ✅ Created comprehensive README with step-by-step instructions

---

## Step-by-Step Deployment to Vercel

### 1. Set Up Supabase Database

1. Go to https://supabase.com and sign in/create account
2. Create a new project (choose a region close to you)
3. Wait for project to be created (~2 minutes)
4. Go to **SQL Editor** (left sidebar)
5. Click **New Query**
6. Copy and paste the entire contents of `supabase-schema.sql`
7. Click **Run** to create the tables

### 2. Get Your Supabase Credentials

1. In Supabase, go to **Project Settings** (gear icon at bottom left)
2. Click **API** in the left menu
3. Copy these two values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon/public key** (long string under "Project API keys")

### 3. Get Your Google Gemini API Key

1. Go to https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click **Create API Key**
4. Choose a Google Cloud project (or create new)
5. Copy the API key

### 4. Update Environment Variables in Vercel

**IMPORTANT**: You need to rename your existing environment variables!

Go to your Vercel project settings → Environment Variables and:

#### Delete Old Variables (if they exist):
- ❌ `SUPABASE_URL`
- ❌ `SUPABASE_ANON_KEY`
- ❌ `API_KEY`
- ❌ `GEMINI_API_KEY`
- ❌ `VITE_SUPABASE_ANON_KEY` (if it has wrong value from old Supabase)

#### Add New Variables:

| Name | Value | Environments |
|------|-------|--------------|
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `your_supabase_anon_key_here` | Production, Preview, Development |
| `VITE_GEMINI_API_KEY` | `your_gemini_api_key_here` | Production, Preview, Development |

⚠️ **Critical**: All three variable names MUST start with `VITE_` or they won't work!

### 5. Push Changes to GitHub

```bash
git add .
git commit -m "Fix: Update environment variables to use VITE_ prefix for Vite compatibility"
git push origin main
```

### 6. Redeploy in Vercel

After pushing to GitHub, Vercel should automatically redeploy. If not:

1. Go to your Vercel dashboard
2. Click on your project
3. Go to **Deployments** tab
4. Click the **3 dots** menu on the latest deployment
5. Click **Redeploy**

### 7. Verify Deployment

Once deployed:

1. Visit your Vercel URL: `https://light-dust-content-manager.vercel.app`
2. You should see the login screen
3. Enter password: `1991`
4. You should see the dashboard (possibly empty at first)
5. Click **"+ Add Post"** to create a test post
6. Upload an image, add description, save
7. Click **"Generate Caption"** to test AI integration

---

## Troubleshooting

### Build Still Failing?

Check the build logs for:
- TypeScript errors → Make sure all changes were committed
- Missing dependencies → Run `npm install` locally first

### "Setup Required" Error After Login?

This means the app can't read the environment variables:
1. Verify all three variables are spelled correctly with `VITE_` prefix
2. Make sure you selected all environments (Production, Preview, Development)
3. Redeploy after changing environment variables

### Database Connection Failed?

1. Test your Supabase URL by visiting it in a browser (should show "ok")
2. Verify you ran the SQL schema in Supabase SQL Editor
3. Check that the anon key matches exactly (no extra spaces)

### AI Caption Generation Not Working?

1. Verify your Gemini API key is valid
2. Check the browser console for error messages
3. Make sure the API key has no quotation marks or extra characters

---

## Testing Locally

To test on your local machine:

```bash
# Install dependencies
npm install

# Create .env.local file
cat > .env.local << EOF
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
EOF

# Run dev server
npm run dev

# Open http://localhost:5173
```

---

## What's Next?

Once deployed successfully, you can:

1. **Customize the password** in `App.tsx` (line 111)
2. **Add more sample posts** using the "Add Post" button
3. **Test real-time sync** by opening the app in two browser windows
4. **Share the URL** with your client (light-dust-content-manager.vercel.app)

---

## Recent Updates & Performance Improvements

### 2025-11-27: Fixed Typing Lag & UI Improvements

#### Problem: Typing Lag
The application was experiencing significant typing lag where keystrokes would be missed or delayed when editing any text field (dates, titles, captions, notes).

**Root Cause:**
Every single keystroke was immediately triggering:
1. Optimistic UI update
2. Database update via Supabase
3. Network round-trip delay
4. This caused visible lag and missed keystrokes

**Solution: Debouncing**
- Implemented debounced database updates with 500ms delay
- UI updates are still instant (optimistic)
- Database only updates after user stops typing for 500ms
- Each field tracks its own debounce timer independently

**Code Changes:**
```typescript
// Added to App.tsx
const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

const handleUpdatePost = useCallback((id: string, field: keyof Post, value: any) => {
  // Immediate UI update - no lag
  setPosts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));

  // Debounced DB update
  const timerKey = `${id}-${field}`;
  if (debounceTimers.current[timerKey]) {
    clearTimeout(debounceTimers.current[timerKey]);
  }

  debounceTimers.current[timerKey] = setTimeout(async () => {
    // DB update happens here after 500ms of no typing
    const updates = mapPostToDb({ [field]: value });
    await supabase.from('posts').update(updates).eq('id', id);
    delete debounceTimers.current[timerKey];
  }, 500);
}, []);
```

#### UI Improvements

**1. Date Format Changed to Australian (DD/MM/YYYY)**
- Was: `10-25` (MM-DD, cut off)
- Now: `25/10/2025` (DD/MM/YYYY, full date visible)
- Date column width increased from `w-24` to `w-32`

**Code Changes:**
```typescript
// Display: YYYY-MM-DD → DD/MM/YYYY
value={post.date ? (() => {
  const [year, month, day] = post.date.split('-');
  return `${day}/${month}/${year}`;
})() : ''}

// Save: DD/MM/YYYY → YYYY-MM-DD (ISO format for DB)
onChange={(e) => {
  const parts = e.target.value.split('/');
  if (parts.length === 3) {
    handleUpdatePost(post.id, 'date', `${parts[2]}-${parts[1]}-${parts[0]}`);
  }
}}
```

**2. Removed "Regenerate" Button**
- The "Regenerate" button below captions was removed
- Only "Copy" button remains
- Reduces UI clutter and prevents accidental caption regeneration

**3. Simplified Status Dropdown**
- Removed: "Generated" status option
- Current options: Draft, For Approval, Approved, Posted
- Cleaner workflow progression

**Commits:**
- `92cdcd3` - Fix typing lag and add AU date format
- `5453b2e` - UI improvements: widen date column and clean up interface

---

## Performance Best Practices

### Database Update Patterns

**❌ Don't Do This:**
```typescript
// Updates DB on every keystroke - causes lag!
onChange={(e) => {
  updateDatabase(e.target.value); // BAD
}}
```

**✅ Do This Instead:**
```typescript
// Debounce DB updates, instant UI updates
onChange={(e) => {
  setStateImmediately(e.target.value); // Good - instant feedback
  debouncedDatabaseUpdate(e.target.value); // Good - delayed save
}}
```

### Key Learnings

1. **Optimistic UI Updates**: Always update the UI immediately for responsive feel
2. **Debounce Network Calls**: Delay expensive operations (DB, API) until user stops interacting
3. **Per-Field Debouncing**: Track separate timers for each field to avoid conflicts
4. **500ms Sweet Spot**: Long enough to prevent excessive updates, short enough users don't notice

---

**Need help?** Check the main [README.md](./README.md) or create an issue on GitHub.
