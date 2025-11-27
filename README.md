# Light Dust Content Manager

A social content dashboard for Light Dust Candles where clients can view, comment on, and approve social media posts. All data is stored in Supabase with real-time synchronization.

## Features

- 📅 **Content Calendar** - View and manage upcoming social media posts
- 🖼️ **Image Upload** - Upload post images directly in the dashboard
- ✨ **AI Caption Generation** - Generate Instagram captions using Google Gemini AI
- 💬 **Client Comments** - Add notes and feedback that everyone can see
- ✅ **Approval Workflow** - Track post status from Draft to Posted
- 🔄 **Real-time Updates** - Changes sync instantly across all users
- 🔐 **Password Protection** - Simple client access control

## Setup Instructions

### 1. Supabase Setup

1. Go to [Supabase](https://supabase.com) and create a new project
2. Once your project is created, go to the **SQL Editor** in the left sidebar
3. Copy the contents of `supabase-schema.sql` and run it in the SQL Editor
4. Get your Supabase credentials:
   - Go to **Project Settings** > **API**
   - Copy your **Project URL** (looks like `https://xxxxx.supabase.co`)
   - Copy your **anon/public** key

### 2. Google Gemini API Setup

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the API key for later use

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

## Default Password

The default client access password is: **1991**

You can change this in `App.tsx` on line 111.

## Usage

1. **Login** - Enter the password (1991) to access the dashboard
2. **Add Post** - Click "+ Add Post" to create a new content item
3. **Upload Image** - Click on any image placeholder to upload
4. **Generate Caption** - Click "Generate Caption" to use AI for captions and hashtags
5. **Update Status** - Use the dropdown to change post status (Draft → Generated → For Approval → Approved → Posted)
6. **Add Comments** - Use the "Additional Comments" field for client feedback
7. **Export** - Click "Export to CSV" to download all content

## Troubleshooting

### Environment Variables Not Working in Vercel

Make sure all environment variables in Vercel are prefixed with `VITE_`:
- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_SUPABASE_ANON_KEY`
- ✅ `VITE_GEMINI_API_KEY`
- ❌ `SUPABASE_URL` (won't work without VITE_ prefix)

After updating environment variables in Vercel, you must **redeploy** your application.

### "Database connection failed" Error

1. Check that your Supabase URL and key are correct in Vercel
2. Verify that you ran the SQL schema in Supabase
3. Make sure Row Level Security policies are set up (run the `supabase-schema.sql`)

### Images Not Loading

- Images are stored as base64 in the database
- Keep images under 2MB to avoid payload errors
- For production, consider using Supabase Storage instead

## Tech Stack

- **React** + **TypeScript** - Frontend framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Supabase** - Database and real-time sync
- **Google Gemini AI** - Caption generation
- **Vercel** - Deployment

## License

© 2023 Light Dust Candles
