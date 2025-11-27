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

**Need help?** Check the main [README.md](./README.md) or create an issue on GitHub.
