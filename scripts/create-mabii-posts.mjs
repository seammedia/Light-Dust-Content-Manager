#!/usr/bin/env node
/**
 * Create Mabii Co posts using actual product images from their website
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// Posts to create - using actual product images from mabii.co
const posts = [
  // Week 1 - Jan 24
  {
    date: '2026-01-24',
    title: 'Lola Kids Terry Towel Set',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0652/6222/3427/files/mabii-046.jpg',
    caption: `Weekend uniform: sorted. ☀️🩷

Meet the Lola Kids Terry Towel Set. Soft as a cloud, tough as your little tornado. We designed this one for maximum comfort and minimum "I don't wanna wear that" moments.

It's the kind of set that goes from beach to backyard to bedtime without missing a beat. Oeko-Tex certified, because we care about what touches their skin as much as you do.`,
    hashtags: ['mabiikids', 'weekendvibes', 'toddlerstyle', 'playapproved', 'kidsfashionau']
  },

  // Week 2 - Jan 27, 30
  {
    date: '2026-01-27',
    title: 'Coco Loco Kids Linen Set',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0652/6222/3427/files/mabii-026.jpg',
    caption: `A little bit classic. A little bit loco. A whole lot of cool. 🥥🌴

Meet the Coco Loco Kids Linen Button Up Set. This cotton-linen blend is giving coastal holiday vibes, even if you're just doing the school run.

Light, breathable, and fancy enough for dinner but comfy enough for sandcastles. Limited edition, because the best things don't stick around forever.`,
    hashtags: ['mabiikids', 'coastalvibes', 'linenforkids', 'summerstyle', 'limitededition']
  },
  {
    date: '2026-01-30',
    title: 'Tutti Frutti Corduroy Cap',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0652/6222/3427/files/mabii-021.jpg',
    caption: `Protect the noggin. Look adorable doing it. 🍒🧢

The Tutti Frutti Corduroy Cap is here for sunny days, bad hair days, and "I'm not wearing that hat" days (we made it cute enough that they actually want to).

Soft cotton corduroy, adjustable strap for growing heads, and a print that screams summer fun.`,
    hashtags: ['mabiikids', 'kidsaccessories', 'summerhats', 'sunprotection', 'fruityvibes']
  },

  // Week 3 - Feb 4, 7
  {
    date: '2026-02-04',
    title: 'The Sweetie Heart Shirt',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0652/6222/3427/files/Copilot_20260119_205929.png',
    caption: `Cute. Effortless. A little bit iconic. 💕

Meet The Sweetie Kids Heart Shirt. It's the tee that makes getting dressed easy and looking adorable even easier.

Soft cotton, red trim details, and a bold heart graphic that says "yes, I know I'm cute" without saying a word. Perfect for playdates, parties, or just being the main character at daycare.`,
    hashtags: ['mabiikids', 'valentinesday', 'heartstyle', 'kidstee', 'toddlerfashion']
  },
  {
    date: '2026-02-07',
    title: 'Lola Terry Set - Beach Ready',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0652/6222/3427/files/mabii-049.jpg',
    caption: `That "ready for anything" energy. 🌊✨

The Lola Kids Terry Towel Set was made for little ones who don't know the meaning of "sit still." Soft terry cotton that feels like a hug, but handles sand, snacks, and spontaneous puddle jumping like a champ.

Easy on, easy off, easy to wash. Parenting win.`,
    hashtags: ['mabiikids', 'beachkids', 'terrycloth', 'summeressentials', 'easyoutfits']
  },

  // Week 4 - Feb 10, 12, 14 (Valentine's week!)
  {
    date: '2026-02-10',
    title: 'Sweetie Heart Pants',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0652/6222/3427/files/mabii-062.jpg',
    caption: `Red-hot, heart-down-the-side comfort. ❤️🔥

The Sweetie Kids Red Heart Pants are here to steal hearts (and make getting dressed way less of a battle).

Vibrant red, adorable heart stripe detail, and soft enough that they'll actually want to wear pants today. Machine washable, kid-proof, parent-approved.`,
    hashtags: ['mabiikids', 'valentinesoutfit', 'heartpants', 'kidsootd', 'redpants']
  },
  {
    date: '2026-02-12',
    title: 'Coco Loco - Detail Shot',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0652/6222/3427/files/mabii-025.jpg',
    caption: `The details that make you look twice. 👀🥥

Every button, every stitch, every playful print on the Coco Loco Set was designed with intention. Because your little ones deserve clothes that are made with care, not just mass-produced.

Cotton-linen blend. Oeko-Tex certified. Ready for summer adventures.`,
    hashtags: ['mabiikids', 'qualitykidsclothes', 'slowfashion', 'detailsmatter', 'linenkids']
  },
  {
    date: '2026-02-14',
    title: 'Sweetie Set - Valentines',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0652/6222/3427/files/mabii-058.jpg',
    caption: `Happy Valentine's Day from our little sweethearts to yours. 💝💕

The Sweetie Collection was made for days like today – full of love, cuddles, and maybe a little bit of chocolate on their shirt (don't worry, it washes out).

Sending all the love to the tiny humans who fill our hearts.`,
    hashtags: ['mabiikids', 'valentinesday', 'sweetiecollection', 'kidslove', 'heartday']
  },

  // Week 5 - Feb 18, 20
  {
    date: '2026-02-18',
    title: 'Tutti Frutti Cap - Action',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0652/6222/3427/files/mabii-017.jpg',
    caption: `Sun's out, cap's on. 🍓☀️

The Tutti Frutti Corduroy Cap isn't just cute – it's practical too. Keeps the sun off their face while they're too busy exploring to notice.

Adjustable fit that grows with them (well, their head at least). Soft cotton corduroy because we don't do scratchy.`,
    hashtags: ['mabiikids', 'sunhat', 'outdoorkids', 'corduroycap', 'australiansummer']
  },
  {
    date: '2026-02-20',
    title: 'Lola Set - Play Mode',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0652/6222/3427/files/mabii-048.jpg',
    caption: `Built for play. Designed for real life. 💪🩷

The Lola Kids Terry Towel Set handles everything your little one can throw at it – literally. Grass stains? Handled. Sunscreen smears? No problem. Ice cream drips? Bring it on.

Soft, stretchy, and ready for round two (or twelve) of whatever today brings.`,
    hashtags: ['mabiikids', 'madeforplay', 'toughkidsclothes', 'terrytowel', 'momapproved']
  },

  // Week 6 - Feb 24, 26
  {
    date: '2026-02-24',
    title: 'Heart Shirt - Close Up',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0652/6222/3427/files/Copilot_20260119_212657.png',
    caption: `The little details that make big impressions. 💗

The Sweetie Heart Shirt with that signature red trim and bold heart graphic. Simple, cute, and effortlessly cool.

Because sometimes the best outfits are the ones that don't try too hard – just like your little one.`,
    hashtags: ['mabiikids', 'kidstshirt', 'heartgraphic', 'simpleoutfits', 'toddlerstyle']
  },
  {
    date: '2026-02-26',
    title: 'Coco Loco - Full Look',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0652/6222/3427/files/mabii-027.jpg',
    caption: `End of summer, but the vibes are still immaculate. 🌴✨

The Coco Loco Kids Linen Button Up Set is that outfit. The one that makes other parents ask "where did you get that?"

Answer: mabii.co 😉 Limited edition, so grab it before it's gone.`,
    hashtags: ['mabiikids', 'endofsummer', 'linenset', 'kidsstyle', 'wheretoshop']
  }
];

async function downloadImage(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download: ${url}`);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
}

async function uploadImage(buffer, clientId, postId, ext = 'jpg') {
  const fileName = `${clientId}/${postId}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from('post-images').upload(fileName, buffer, {
    contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    cacheControl: '3600',
    upsert: true
  });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from('post-images').getPublicUrl(fileName);
  return data.publicUrl;
}

async function main() {
  // Get Mabii Co client
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('name', 'Mabii Co')
    .single();

  if (clientError || !client) {
    console.error('Mabii Co client not found');
    process.exit(1);
  }

  console.log(`Creating ${posts.length} posts for Mabii Co\n`);

  for (const post of posts) {
    const postId = `mabii-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    console.log(`${post.date} - ${post.title}`);

    // Download image from mabii.co
    console.log('  Downloading image from website...');
    const ext = post.imageUrl.includes('.png') ? 'png' : 'jpg';
    const imageBuffer = await downloadImage(post.imageUrl);

    // Upload to Supabase
    console.log('  Uploading to storage...');
    const uploadedUrl = await uploadImage(imageBuffer, client.id, postId, ext);

    // Create post
    const { error } = await supabase.from('posts').insert({
      id: postId,
      client_id: client.id,
      title: post.title,
      date: post.date,
      status: 'For Approval',
      image_description: post.title,
      image_url: uploadedUrl,
      media_type: 'image',
      generated_caption: post.caption,
      generated_hashtags: post.hashtags,
      notes: ''
    });

    if (error) {
      console.log(`  Error: ${error.message}`);
    } else {
      console.log('  Done!\n');
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\nCreated ${posts.length} posts for Mabii Co!`);
}

main().catch(console.error);
