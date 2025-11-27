# Meta Business Suite API Setup Guide

Complete guide to setting up Facebook and Instagram auto-posting for the Seam Media Content Manager.

## Overview

This integration allows you to automatically post content to Facebook Pages and Instagram Business Accounts when a post's status is changed to "Approved". It's **completely FREE** and uses Meta's official Business Suite API.

## Prerequisites

- Facebook Business Manager account
- Facebook Page (for Facebook posting)
- Instagram Business Account connected to your Facebook Page (for Instagram posting)
- Admin access to both accounts

## Step 1: Create a Facebook App

1. **Go to Meta for Developers**
   - Visit: https://developers.facebook.com/
   - Log in with your Facebook account

2. **Create a New App**
   - Click "My Apps" in the top right
   - Click "Create App"
   - Select "Business" as the app type
   - Click "Next"

3. **App Details**
   - **Display Name**: "Seam Media Content Manager" (or your agency name)
   - **App Contact Email**: Your email address
   - **Business Account**: Select your Business Manager account
   - Click "Create App"

## Step 2: Configure App Permissions

1. **Add Facebook Login Product**
   - In your app dashboard, find "Add Products"
   - Click "Set Up" on "Facebook Login"
   - Choose "Web" as the platform

2. **Add Required Products**
   - Also add these products:
     - **Instagram Basic Display** - Click "Set Up"
     - **Instagram Graph API** - Click "Set Up"

3. **Configure OAuth Redirect URIs**
   - Go to "Facebook Login" → "Settings"
   - Add these Valid OAuth Redirect URIs:
     ```
     https://seam-media-content-manager.vercel.app/
     http://localhost:5173/
     ```

## Step 3: Request Permissions

Your app needs specific permissions to post to Facebook and Instagram.

### Required Permissions:

1. **For Facebook Posting:**
   - `pages_show_list` - See list of Pages
   - `pages_read_engagement` - Read Page content
   - `pages_manage_posts` - Create, edit, and delete Page posts
   - `publish_to_groups` - Publish to groups (optional)

2. **For Instagram Posting:**
   - `instagram_basic` - Read Instagram account info
   - `instagram_content_publish` - Publish posts to Instagram
   - `pages_read_engagement` - Read engagement data

### How to Request Permissions:

1. Go to your app dashboard
2. Click "App Review" → "Permissions and Features"
3. Search for each permission listed above
4. Click "Request Advanced Access" for each permission
5. Fill out the required forms explaining your use case

**Note:** Some permissions require App Review approval from Meta. This can take 1-2 weeks.

## Step 4: Generate Access Token

### Get a Page Access Token:

1. **Using Graph API Explorer**
   - Go to: https://developers.facebook.com/tools/explorer/
   - Select your app from the dropdown
   - Click "Generate Access Token"
   - Check all the permissions you requested earlier
   - Click "Generate Access Token" and approve the permissions

2. **Convert to Long-Lived Token**
   - Copy the generated access token
   - Go to: https://developers.facebook.com/tools/accesstoken/
   - Find your token and click "Extend Access Token"
   - This creates a token that lasts 60 days

3. **Get Never-Expiring Page Token**
   - Use Graph API Explorer: https://developers.facebook.com/tools/explorer/
   - Make a GET request to: `me/accounts`
   - Use your long-lived User Access Token
   - Find your Page in the response
   - Copy the `access_token` for your Page
   - **This Page Access Token never expires!** ✅

### Save Your Credentials:

You'll need these values:
- **Facebook Page ID**: Found in response from `me/accounts` or in Page settings
- **Access Token**: The never-expiring Page Access Token
- **Instagram Account ID**: (We'll get this next)

## Step 5: Get Instagram Business Account ID

1. **Using Graph API Explorer**
   - Go to: https://developers.facebook.com/tools/explorer/
   - Use your Page Access Token
   - Make a GET request to: `{page-id}?fields=instagram_business_account`
   - Copy the `instagram_business_account.id` value

2. **Alternative Method**
   - Make a GET request to: `me/accounts?fields=instagram_business_account`
   - Find your Page and copy the Instagram Business Account ID

## Step 6: Configure in Seam Media Content Manager

Now that you have all your credentials, configure them in the app:

1. **Run the Database Migration**
   - Open Supabase Dashboard → SQL Editor
   - Copy the contents of `add-meta-integration-schema.sql`
   - Run the entire script
   - This creates the necessary database columns and tables

2. **Add Credentials to Your Client**
   - Login to the content manager
   - Click the **Settings** icon (⚙️) in the header
   - Fill in the Meta Integration Settings:
     - **Facebook Page ID**: Your Page ID (e.g., `123456789012345`)
     - **Meta Access Token**: Your never-expiring Page Access Token
     - **Instagram Business Account ID**: Your IG Business Account ID
   - Enable auto-posting:
     - ✅ Enable auto-posting when status = "Approved"
     - ✅ Auto-post to Facebook
     - ✅ Auto-post to Instagram
   - Click "Save Settings"

## Step 7: Test Your Integration

1. **Create a Test Post**
   - Add a new post in the content manager
   - Upload an image
   - Add caption and hashtags
   - Set date to today

2. **Approve the Post**
   - Change status to "Approved"
   - Check the browser console for any errors
   - The post should automatically be sent to Facebook/Instagram

3. **Verify on Social Media**
   - Check your Facebook Page
   - Check your Instagram account
   - Posts should appear as scheduled

## Troubleshooting

### Error: "Invalid OAuth access token"
- Your access token may have expired
- Generate a new never-expiring Page Access Token (Step 4)
- Update in Settings

### Error: "Permissions error"
- Your app may not have the required permissions
- Go to App Review and request missing permissions
- Wait for Meta approval

### Error: "Instagram posts require an image URL"
- Instagram requires images for all posts
- Make sure your post has an image uploaded
- The image URL must be publicly accessible

### Error: "(#100) The parameter image_url is required"
- The image may be stored as base64 in the database
- For Meta API, images must be accessible via public URL
- Consider using Supabase Storage instead of base64

### Posts Not Auto-Posting
- Check that `auto_post_enabled` is true in Settings
- Check browser console for errors
- Verify credentials are correct
- Check that post has status "Approved"

## Important Notes

### Image Storage
Currently, images are stored as base64 in the database. For Meta API posting to work reliably:

1. **Option 1**: Upload images to Supabase Storage
   - Images get a public URL
   - Meta API can access them directly

2. **Option 2**: Use a third-party image host
   - Imgur, Cloudinary, etc.
   - Store the URL in the database

3. **Current Limitation**: Base64 images in database won't work with Meta API
   - You'll need to implement image hosting first

### Scheduled Posts
- Facebook supports scheduled posts (up to 75 days in advance)
- Instagram does **NOT** support scheduled posts via API
- Instagram posts are published immediately
- To schedule Instagram posts, use a cron job or task scheduler

### Rate Limits
Meta has rate limits on API calls:
- **Page-level**: 200 calls per hour per user
- **User-level**: 200 calls per hour
- For high-volume posting, implement rate limiting in your code

## Advanced: Webhook Setup (Optional)

To get real-time updates when posts are published:

1. Go to your App Dashboard
2. Click "Webhooks" → "Instagram" → "Subscribe to this topic"
3. Select `feed` topic
4. Add your webhook URL (you'll need to create an endpoint)
5. Verify the webhook

## Resources

- **Meta for Developers**: https://developers.facebook.com/
- **Graph API Explorer**: https://developers.facebook.com/tools/explorer/
- **Access Token Tool**: https://developers.facebook.com/tools/accesstoken/
- **Instagram Graph API Docs**: https://developers.facebook.com/docs/instagram-api
- **Facebook Pages API Docs**: https://developers.facebook.com/docs/pages/
- **Permissions Reference**: https://developers.facebook.com/docs/permissions/reference

## Security Best Practices

1. **Never commit access tokens to git**
   - Store in environment variables
   - Use Supabase's secure storage

2. **Rotate tokens regularly**
   - Generate new tokens every 60 days (or use never-expiring)
   - Update in all clients

3. **Use Row Level Security**
   - Ensure RLS is enabled on clients table
   - Only authenticated users can see tokens

4. **Monitor API usage**
   - Check Meta's analytics dashboard
   - Watch for unusual activity

## Cost

✅ **100% FREE** - Meta's Business Suite API is completely free to use for posting to your own Pages and Instagram accounts.

No fees, no subscriptions, no hidden costs!

---

**Need Help?** If you encounter issues, check the Meta for Developers support forums or open an issue on the GitHub repository.
