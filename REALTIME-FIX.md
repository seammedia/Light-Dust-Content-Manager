# Real-time Sync Not Working? Here's How to Fix It

## The Issue
Changes you make in one browser aren't immediately visible in another browser. You need to manually refresh to see updates.

## The Cause
Supabase Realtime needs to be enabled for your database table.

## The Fix - Enable Realtime in Supabase

### Step 1: Go to Your Supabase Dashboard
1. Visit https://supabase.com
2. Open your Light Dust Content Manager project

### Step 2: Enable Realtime for the Posts Table
1. Click **Database** in the left sidebar
2. Click **Replication** in the submenu
3. Find the `posts` table in the list
4. Toggle the switch next to `posts` to **ON** (it should turn green)

### Step 3: Verify It's Working
1. The toggle should say "Realtime enabled" or show a green checkmark
2. You may need to wait 10-30 seconds for the change to take effect

### Step 4: Test Real-time Sync
1. Open your app in two different browsers (or one normal + one incognito)
2. Log in to both with password `1991`
3. Make a change in one browser (edit a caption, change status, etc.)
4. The other browser should update within 1-2 seconds automatically

---

## Alternative: Manual Refresh Button

If you prefer not to use real-time sync (or want a backup), you can use the **Refresh button** (↻ icon) in the top navigation bar to manually reload the data.

---

## Still Not Working?

If real-time still doesn't work after enabling it:

1. **Check Browser Console** for errors:
   - Open Developer Tools (F12)
   - Look for any red errors related to "realtime" or "websocket"

2. **Verify Your Supabase Plan**:
   - Free tier has real-time enabled
   - Check you haven't hit any limits

3. **Clear Browser Cache**:
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

4. **Check Supabase Status**:
   - Visit https://status.supabase.com
   - Make sure all services are operational

---

## How Real-time Works

When enabled, the app:
1. Establishes a WebSocket connection to Supabase
2. Subscribes to changes on the `posts` table
3. Automatically refetches data whenever any user makes a change
4. Updates all connected browsers in real-time

This means multiple users can collaborate seamlessly without manual refreshing!
