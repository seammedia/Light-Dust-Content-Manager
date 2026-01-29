#!/usr/bin/env node
/**
 * Add Washco Express February 2026 Posts
 *
 * Downloads images from Canva export URLs, uploads to Supabase Storage,
 * and creates posts with captions and hashtags.
 *
 * Usage:
 *   VITE_SUPABASE_URL="..." VITE_SUPABASE_ANON_KEY="..." node scripts/add-washco-feb-posts.mjs
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// February 2026 posts for Washco Express
const posts = [
  {
    date: '2026-02-02',
    headline: "Don't lift a finger",
    canvaExportUrl: 'https://export-download.canva.com/5JbX4/DAG_Gk5JbX4/-1/0/0001-1737755154925902940.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQYCGKMUH5AO7UJ26%2F20260121%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260121T164037Z&X-Amz-Expires=42643&X-Amz-Signature=2cb704aa23f6213cc5595e876324f613663d3d58261d863369c3e258b9f10374&X-Amz-SignedHeaders=host%3Bx-amz-expected-bucket-owner&response-expires=Thu%2C%2022%20Jan%202026%2004%3A31%3A20%20GMT',
    caption: `Your car deserves a spa day too! 🚗✨ Our touch-free car wash does all the work while you sit back and relax. No brushes, no scratches - just a sparkling clean finish every time. Swing by Washco Express Broadmeadows today! 💦`,
    hashtags: ['washcoexpress', 'carwash', 'touchfreecarwash', 'broadmeadows', 'melbourne', 'carcare', 'expresscarwash', 'nobrushcarwash', 'sparklingclean']
  },
  {
    date: '2026-02-04',
    headline: "Treat your best friend",
    canvaExportUrl: 'https://export-download.canva.com/PXESg/DAG_GuPXESg/-1/0/0001-4006443469313213350.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQYCGKMUH5AO7UJ26%2F20260121%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260121T065130Z&X-Amz-Expires=78894&X-Amz-Signature=832aa68e4ced0f8fd564fa8f7c252325c627e5af218ec76e24656d0fb22fd0a5&X-Amz-SignedHeaders=host%3Bx-amz-expected-bucket-owner&response-expires=Thu%2C%2022%20Jan%202026%2004%3A46%3A24%20GMT',
    caption: `Who's a good boy? YOUR dog - especially after a visit to our K9000 dog wash! 🐶💦 Warm water, shampoo, conditioner AND dryer all included. Your furry friend will thank you! Visit Washco Express Broadmeadows 🐕`,
    hashtags: ['washcoexpress', 'dogwash', 'K9000', 'dogwashmelbourne', 'broadmeadows', 'dogsofmelbourne', 'petcare', 'cleandog', 'doggrooming', 'furryfriend']
  },
  {
    date: '2026-02-06',
    headline: "Keep it glossy!",
    canvaExportUrl: 'https://export-download.canva.com/4wS6E/DAG_Gj4wS6E/-1/0/0001-1397733384180365676.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQYCGKMUH5AO7UJ26%2F20260121%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260121T112218Z&X-Amz-Expires=61692&X-Amz-Signature=932749544d181310500449753d09cdd8b0251e40aea07429d7bf7e2db2387bbe&X-Amz-SignedHeaders=host%3Bx-amz-expected-bucket-owner&response-expires=Thu%2C%2022%20Jan%202026%2004%3A30%3A30%20GMT',
    caption: `That showroom shine? You can have it every week 🤩 Our touch-free wash leaves your car looking absolutely flawless. Protect your paint, keep that gloss! 💯 Washco Express Broadmeadows`,
    hashtags: ['washcoexpress', 'carwash', 'glossycar', 'cardetailing', 'broadmeadows', 'melbourne', 'carcare', 'shineon', 'weekendvibes']
  },
  {
    date: '2026-02-09',
    headline: "Pamper your pooch",
    canvaExportUrl: 'https://export-download.canva.com/zNev0/DAG_GrzNev0/-1/0/0001-797628732413495810.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQYCGKMUH5AO7UJ26%2F20260121%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260121T102938Z&X-Amz-Expires=66058&X-Amz-Signature=161dc28fa5d7571c6f75c3b1fcc14f9386b53b869a2c3a6decc77659996b83ae&X-Amz-SignedHeaders=host%3Bx-amz-expected-bucket-owner&response-expires=Thu%2C%2022%20Jan%202026%2004%3A50%3A36%20GMT',
    caption: `Fresh, fluffy and ready for cuddles! 🐶✨ Our self-service dog wash makes bath time easy peasy. Everything you need - warm water, shampoo, conditioner & dryer. Washco Express Broadmeadows 💕`,
    hashtags: ['washcoexpress', 'dogwash', 'K9000', 'dogwashmelbourne', 'broadmeadows', 'dogspa', 'pamperpooch', 'fluffydog', 'petcare', 'dogmum']
  },
  {
    date: '2026-02-11',
    headline: "Express yourself",
    canvaExportUrl: 'https://export-download.canva.com/5V2wA/DAG_Gj5V2wA/-1/0/0001-5789868921459536359.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQYCGKMUH5AO7UJ26%2F20260121%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260121T101212Z&X-Amz-Expires=65023&X-Amz-Signature=1aa68b7f7f6bc80a18b32ed052a07b205e5b3a03569f41b306907f1a15a90b0e&X-Amz-SignedHeaders=host%3Bx-amz-expected-bucket-owner&response-expires=Thu%2C%2022%20Jan%202026%2004%3A15%3A55%20GMT',
    caption: `In and out in minutes - but your car looks like a million bucks! 🚙💦 Our express car wash fits into even the busiest schedule. Quick, convenient, quality results every time. Washco Express Broadmeadows`,
    hashtags: ['washcoexpress', 'carwash', 'expresscarwash', 'broadmeadows', 'melbourne', 'quickwash', 'carcare', 'busylife', 'cleancar']
  },
  {
    date: '2026-02-13',
    headline: "Fun for all ages",
    canvaExportUrl: 'https://export-download.canva.com/6eNJs/DAG_Gj6eNJs/-1/0/0001-8940136860928561225.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQYCGKMUH5AO7UJ26%2F20260121%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260121T190926Z&X-Amz-Expires=33478&X-Amz-Signature=0b07be72d5614c928773a2383c89633c4c4c7c29e8160e1c5f4c0258d58acce8&X-Amz-SignedHeaders=host%3Bx-amz-expected-bucket-owner&response-expires=Thu%2C%2022%20Jan%202026%2004%3A27%3A24%20GMT',
    caption: `The whole family can get involved at our self-service dog wash! 🐕💕 Let the kids help wash the pup - it's fun for everyone. Make it a family activity this weekend! Washco Express Broadmeadows`,
    hashtags: ['washcoexpress', 'dogwash', 'familyfun', 'K9000', 'broadmeadows', 'weekendactivity', 'kidsanddogs', 'dogsofmelbourne', 'familytime']
  },
  {
    date: '2026-02-16',
    headline: "Cutting edge technology",
    canvaExportUrl: 'https://export-download.canva.com/7OCfQ/DAG_Gp7OCfQ/-1/0/0001-1503567973764279274.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQYCGKMUH5AO7UJ26%2F20260121%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260121T201500Z&X-Amz-Expires=31893&X-Amz-Signature=9a1f22c374e0538cf60b86c419e176a8fb2958b3565166d8bcff75d70312c839&X-Amz-SignedHeaders=host%3Bx-amz-expected-bucket-owner&response-expires=Thu%2C%2022%20Jan%202026%2005%3A06%3A33%20GMT',
    caption: `High-pressure perfection! 💦🚗 Our state-of-the-art touch-free technology blasts away dirt and grime without ever touching your paint. The future of car washing is here at Washco Express Broadmeadows ✨`,
    hashtags: ['washcoexpress', 'carwash', 'touchfreecarwash', 'highpressure', 'broadmeadows', 'melbourne', 'cuttingedge', 'cartech', 'carcare']
  },
  {
    date: '2026-02-18',
    headline: "Shake it off!",
    canvaExportUrl: 'https://export-download.canva.com/1bJR8/DAG_Gl1bJR8/-1/0/0001-8953647657224864575.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQYCGKMUH5AO7UJ26%2F20260121%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260121T124708Z&X-Amz-Expires=57566&X-Amz-Signature=41c40bdf264ec665b1f8e30609897d9de2a94816339173f20f02fed12c072b1c&X-Amz-SignedHeaders=host%3Bx-amz-expected-bucket-owner&response-expires=Thu%2C%2022%20Jan%202026%2004%3A46%3A34%20GMT',
    caption: `That post-bath shake is EVERYTHING! 🐶💦😂 Fresh and clean never felt so good. Bring your pup in for a wash at our K9000 station - dryer included so they leave fluffy, not soggy! Washco Express Broadmeadows`,
    hashtags: ['washcoexpress', 'dogwash', 'K9000', 'shakeitoff', 'dogwashmelbourne', 'broadmeadows', 'wetdog', 'dogsofinstagram', 'bathtime']
  },
  {
    date: '2026-02-20',
    headline: "Foam party",
    canvaExportUrl: 'https://export-download.canva.com/OjIqI/DAG_GmOjIqI/-1/0/0001-2896306162165680388.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQYCGKMUH5AO7UJ26%2F20260121%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260121T093405Z&X-Amz-Expires=69433&X-Amz-Signature=87fe062f075015bf1edfe68d0dfcda24aa55cfb39734920279a6bdb3cf7966e4&X-Amz-SignedHeaders=host%3Bx-amz-expected-bucket-owner&response-expires=Thu%2C%2022%20Jan%202026%2004%3A51%3A18%20GMT',
    caption: `There's something so satisfying about watching the foam do its thing 🧼✨ Premium products for premium results. Your car's about to look AMAZING! Washco Express Broadmeadows 🚗`,
    hashtags: ['washcoexpress', 'carwash', 'foamwash', 'satisfying', 'broadmeadows', 'melbourne', 'carcare', 'soapsuds', 'cleancar', 'oddlysatisfying']
  },
  {
    date: '2026-02-23',
    headline: "Doggy spa day",
    canvaExportUrl: 'https://export-download.canva.com/yeoCQ/DAG_GtyeoCQ/-1/0/0001-8247708416421950007.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQYCGKMUH5AO7UJ26%2F20260121%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260121T124728Z&X-Amz-Expires=57145&X-Amz-Signature=e737022fca5dc014a58d423b504dc5fb5e9fe6517a6523cf3d2935bdde66e482&X-Amz-SignedHeaders=host%3Bx-amz-expected-bucket-owner&response-expires=Thu%2C%2022%20Jan%202026%2004%3A39%3A53%20GMT',
    caption: `Relaxation mode: ACTIVATED 😌🐶 Our warm water and gentle products make bath time a treat, not a chore. Look at that blissful face! Book a spa session for your pup at Washco Express Broadmeadows 💕`,
    hashtags: ['washcoexpress', 'dogwash', 'dogspa', 'K9000', 'broadmeadows', 'dogwashmelbourne', 'pampered', 'relaxeddog', 'petcare', 'spoiledpup']
  },
  {
    date: '2026-02-25',
    headline: "Premium care",
    canvaExportUrl: 'https://export-download.canva.com/yxOpw/DAG_GmyxOpw/-1/0/0001-1826701248342718108.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQYCGKMUH5AO7UJ26%2F20260121%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260121T191146Z&X-Amz-Expires=33370&X-Amz-Signature=dd48c1f6175fe4f4308ff603012c36dea12468cab0e9971f6a0f1c61f092bb2f&X-Amz-SignedHeaders=host%3Bx-amz-expected-bucket-owner&response-expires=Thu%2C%2022%20Jan%202026%2004%3A27%3A56%20GMT',
    caption: `Your car is an investment - treat it like one! 🚗💎 Our touch-free wash delivers that premium clean without any risk to your paint. Mirror finish every time at Washco Express Broadmeadows ✨`,
    hashtags: ['washcoexpress', 'carwash', 'premiumcarcare', 'touchfreecarwash', 'broadmeadows', 'melbourne', 'luxurycar', 'cardetailing', 'mirrorfinish']
  },
  {
    date: '2026-02-27',
    headline: "Fresh & fluffy",
    canvaExportUrl: 'https://export-download.canva.com/hxBdw/DAG_GkhxBdw/-1/0/0001-7977492441276650824.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQYCGKMUH5AO7UJ26%2F20260121%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260121T183817Z&X-Amz-Expires=35976&X-Amz-Signature=c1a8d1a1c56a00911d3b753953335d888c49057a645c51811244b551ebcb89c6&X-Amz-SignedHeaders=host%3Bx-amz-expected-bucket-owner&response-expires=Thu%2C%2022%20Jan%202026%2004%3A37%3A53%20GMT',
    caption: `From soggy doggy to fluffy pupper in no time! 🐶✨ Our K9000 has a dryer so your best mate leaves fresh AND dry. Perfect for those weekend park adventures! Washco Express Broadmeadows 💦`,
    hashtags: ['washcoexpress', 'dogwash', 'K9000', 'freshdog', 'fluffydog', 'broadmeadows', 'dogwashmelbourne', 'weekendready', 'dogsofmelbourne', 'cleanpup']
  }
];

/**
 * Download image from URL and return as buffer
 */
async function downloadImage(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Upload image to Supabase Storage
 */
async function uploadToSupabase(buffer, clientId, postId) {
  const fileName = `${clientId}/${postId}.png`;

  const { error } = await supabase.storage
    .from('post-images')
    .upload(fileName, buffer, {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('post-images')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

/**
 * Main function
 */
async function main() {
  console.log('Adding Washco Express February 2026 posts...\n');

  // Get Washco Express client ID
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, name')
    .eq('name', 'Washco Express')
    .single();

  if (clientError || !client) {
    console.error('Could not find Washco Express client in database');
    console.error('Error:', clientError?.message);
    process.exit(1);
  }

  console.log(`Found client: ${client.name} (${client.id})\n`);

  let successCount = 0;
  let failCount = 0;

  for (const post of posts) {
    const postId = `washco-feb-${post.date}-${Date.now()}`;
    console.log(`Processing ${post.date}: ${post.headline}`);

    try {
      // Download image from Canva
      console.log('  Downloading image...');
      const imageBuffer = await downloadImage(post.canvaExportUrl);

      // Upload to Supabase
      console.log('  Uploading to Supabase...');
      const imageUrl = await uploadToSupabase(imageBuffer, client.id, postId);
      console.log(`  Image URL: ${imageUrl}`);

      // Create post
      const postData = {
        id: postId,
        client_id: client.id,
        title: post.headline,
        date: post.date,
        status: 'For Approval',
        image_description: post.headline,
        image_url: imageUrl,
        media_type: 'image',
        generated_caption: post.caption,
        generated_hashtags: post.hashtags,
        notes: ''
      };

      const { error: insertError } = await supabase.from('posts').insert(postData);

      if (insertError) {
        throw new Error(`Insert failed: ${insertError.message}`);
      }

      console.log('  ✓ Post created successfully\n');
      successCount++;
    } catch (error) {
      console.error(`  ✗ Failed: ${error.message}\n`);
      failCount++;
    }
  }

  console.log('='.repeat(50));
  console.log(`Complete! ${successCount} posts created, ${failCount} failed`);
  console.log(`View at: https://seam-media-content-manager.vercel.app/`);
}

main().catch(console.error);
