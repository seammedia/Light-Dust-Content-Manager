#!/usr/bin/env node
/**
 * Create Flagworks posts for February 2026
 * Mix of website product images + AI-generated lifestyle shots
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const genAI = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });

// Posts for February - alternating website images and AI-generated
const posts = [
  // Week 1: Mon 2, Wed 4, Fri 6
  {
    date: '2026-02-02',
    title: 'Fully Sewn Australian Flag',
    type: 'website',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0781/1153/9438/files/Fully_Sewn_Australian_Flag.jpg?v=1765245845',
    caption: `Crafted the traditional way. Built for the Australian outdoors. 🇦🇺

Our Fully Sewn Australian Flags feature appliqued stars, UV-treated woven polyester bunting, and reinforced headings with double stitching throughout.

This isn't your average printed flag — it's a premium piece built to fly proud for years to come.

✔️ Free Australia-wide shipping
✔️ Fast dispatch`,
    hashtags: ['australianflag', 'fullysewn', 'flagworks', 'aussiepride', 'qualityyoucansee', 'australianowned']
  },
  {
    date: '2026-02-04',
    title: 'Flag Flying Proud',
    type: 'ai',
    aiPrompt: 'Professional photograph of an Australian flag flying proudly on a tall white flagpole against a bright blue sky with white clouds, sunny day, patriotic, inspiring, stock photography style, no text, no logos',
    caption: `There's something about seeing our flag fly high. 🇦🇺

Whether it's in your backyard, at your business, or outside the local RSL — a quality flag makes all the difference.

Our flags are made to handle the Aussie sun, wind and rain. UV-treated fabric, reinforced stitching, and built to last.

Fly it proud.`,
    hashtags: ['flyitproud', 'australianflag', 'flagpole', 'aussiepride', 'outdoorflag', 'flagworks']
  },
  {
    date: '2026-02-06',
    title: 'Woven Polyester Flag',
    type: 'website',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0781/1153/9438/files/IMG20251121162904.jpg?v=1763708424',
    caption: `Our Woven Polyester Australian Flag is the perfect balance of quality and value. 🇦🇺

Made from durable woven polyester with plastic sister clips, it's ready to fly straight out of the pack. Great for outdoor flagpoles and built to handle the elements.

1800mm x 900mm | $95
Free shipping Australia-wide`,
    hashtags: ['australianflag', 'wovenpolyester', 'flagworks', 'outdoorflag', 'freeshipping', 'australianowned']
  },

  // Week 2: Mon 9, Wed 11, Fri 13
  {
    date: '2026-02-09',
    title: 'Australian Red Ensign',
    type: 'website',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0781/1153/9438/files/rn-image_picker_lib_temp_d90c0b9d-48db-41a8-94d6-3112bdad5bcc.jpg?v=1768167802',
    caption: `The Australian Red Ensign — a flag with history and purpose. 🇦🇺

Originally the flag of the Australian Merchant Navy, the Red Ensign is now commonly flown on boats and vessels across the country.

Our Fully Sewn Red Ensign is handcrafted with the same attention to detail as our Australian flags — appliqued stars, UV-treated fabric, and reinforced headings.

Perfect for maritime use.`,
    hashtags: ['redensign', 'australianredensign', 'maritimeflag', 'boatflag', 'flagworks', 'fullysewn']
  },
  {
    date: '2026-02-11',
    title: 'Backyard Flagpole',
    type: 'ai',
    aiPrompt: 'Professional photograph of an Australian flag on a residential flagpole in a neat Australian suburban backyard, green grass, blue sky, sunny day, proud homeowner aesthetic, stock photography style, no text, no logos, no people',
    caption: `Your backyard. Your flag. Your pride. 🇦🇺

More and more Aussies are putting up flagpoles at home — and we're here for it.

Whether it's a special occasion or just because, there's nothing quite like seeing our flag fly in your own backyard.

Shop our range of premium Australian flags, built for the outdoors and made to last.`,
    hashtags: ['backyardflagpole', 'australianflag', 'homeflag', 'aussiepride', 'flagworks', 'flyitproud']
  },
  {
    date: '2026-02-13',
    title: 'Sister Clips',
    type: 'website',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0781/1153/9438/files/rn-image_picker_lib_temp_3be1581a-955e-4886-b1dc-2498d6296f3f.jpg?v=1764899662',
    caption: `The little things matter. 🇦🇺

Our metal sister clips are zinc-coated for durability and designed to work perfectly with our flag range.

They might be small, but they're built tough — just like the rest of our gear.

Metal 2-Pack: $5
Nylon 2-Pack: $4
Free shipping on orders over $50`,
    hashtags: ['flagaccessories', 'sisterclips', 'flagworks', 'flaghardware', 'australianowned', 'qualitymatters']
  },

  // Week 3: Mon 16, Wed 18, Fri 20
  {
    date: '2026-02-16',
    title: 'Knitted Polyester Flag',
    type: 'website',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0781/1153/9438/files/IMG20251121163000.jpg?v=1763707728',
    caption: `Lightweight. Versatile. Ready to fly. 🇦🇺

Our Knitted Polyester Australian Flag is perfect for both indoor and outdoor use. The lightweight fabric flows beautifully in the breeze while still standing up to the elements.

A great option for events, displays, or everyday flying.

1800mm x 900mm | $70
Free shipping Australia-wide`,
    hashtags: ['australianflag', 'knittedpolyester', 'flagworks', 'indoorflag', 'outdoorflag', 'lightweight']
  },
  {
    date: '2026-02-18',
    title: 'Flag Against Blue Sky',
    type: 'ai',
    aiPrompt: 'Stunning close-up photograph of Australian flag fabric waving in the wind against a deep blue sky, showing the stars and Union Jack detail, patriotic, beautiful lighting, professional stock photography, no text, no logos',
    caption: `That feeling when our flag catches the wind. 🇦🇺

There's a reason we use UV-treated woven polyester bunting — it holds its colour in the harsh Australian sun and moves beautifully in the breeze.

Quality fabric. Quality craftsmanship. Quality flags.

Shop now at flagworks.com.au`,
    hashtags: ['australianflag', 'flagdetail', 'uvtreated', 'flagworks', 'qualityflag', 'aussiepride']
  },
  {
    date: '2026-02-20',
    title: 'Craftsmanship Detail',
    type: 'website',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0781/1153/9438/files/rn-image_picker_lib_temp_412bb035-eae0-44c9-8f73-b05dd97c7c6e.jpg?v=1764896721',
    caption: `It's all in the details. 🇦🇺

Every Fully Sewn flag we make features:
✔️ Appliqued stars (not printed)
✔️ Double stitching throughout
✔️ Reinforced heading
✔️ UV-treated fabric
✔️ Quality sister clips

Handcrafted. Built to last. Made for Australia.`,
    hashtags: ['fullysewn', 'craftsmanship', 'flagworks', 'appliquedstars', 'doublestitching', 'qualityflag']
  },

  // Week 4: Mon 23, Wed 25, Fri 27
  {
    date: '2026-02-23',
    title: 'Flagpole Rope',
    type: 'website',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0781/1153/9438/files/rn-image_picker_lib_temp_415b448c-a192-4774-b9b4-337a9dd2bdc0.jpg?v=1764892843',
    caption: `Need new rope for your flagpole? We've got you covered. 🇦🇺

Our braided polyester flagpole rope is:
✔️ 6mm thick
✔️ Cut to your length
✔️ UV resistant
✔️ Built to last

Just $2.50 per metre. Add it to your order and get free shipping over $50.`,
    hashtags: ['flagpolerope', 'flagaccessories', 'flagworks', 'flagpole', 'australianowned', 'cuttosize']
  },
  {
    date: '2026-02-25',
    title: 'Commercial Flagpole',
    type: 'ai',
    aiPrompt: 'Professional photograph of Australian flag flying on a commercial building flagpole, modern Australian office or retail building, professional business setting, blue sky, daytime, stock photography style, no text, no logos, no people',
    caption: `Flying the flag at your business? Make sure it's a good one. 🇦🇺

A quality flag says a lot about your business. Our commercial-grade flags are built to handle daily outdoor use — UV-treated, reinforced, and made to look great for longer.

We supply flags to businesses, schools, councils and clubs across Australia.

Bulk orders welcome. Contact us for a quote.`,
    hashtags: ['commercialflag', 'businessflag', 'australianflag', 'flagworks', 'corporateflag', 'bulkorder']
  },
  {
    date: '2026-02-27',
    title: 'Red Ensign for Boats',
    type: 'website',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0781/1153/9438/files/rn-image_picker_lib_temp_374d4055-0cd8-43c3-be8d-7e9ece3d2171.jpg?v=1767837569',
    caption: `Heading out on the water? Don't forget your Red Ensign. 🇦🇺

The Australian Red Ensign is the proper flag to fly on recreational boats and vessels. Our knitted polyester version is lightweight, quick-drying and built for maritime conditions.

1800mm x 900mm | $70
Free shipping Australia-wide`,
    hashtags: ['redensign', 'boatflag', 'maritimeflag', 'australianboating', 'flagworks', 'sailingaustralia']
  }
];

async function downloadImage(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download: ${url}`);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
}

async function generateAIImage(prompt) {
  console.log('  Generating AI image...');
  const response = await genAI.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: prompt,
    config: {
      responseModalities: ['image', 'text'],
      imageConfig: { aspectRatio: '1:1', imageSize: '1K' }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return {
        data: Buffer.from(part.inlineData.data, 'base64'),
        mimeType: part.inlineData.mimeType || 'image/png'
      };
    }
  }
  return null;
}

async function uploadImage(buffer, mimeType, clientId, postId) {
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const fileName = `${clientId}/${postId}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from('post-images').upload(fileName, buffer, {
    contentType: mimeType,
    cacheControl: '3600',
    upsert: true
  });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from('post-images').getPublicUrl(fileName);
  return data.publicUrl;
}

async function main() {
  // Get Flagworks client
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('name', 'Flagworks')
    .single();

  if (clientError || !client) {
    console.error('Flagworks client not found');
    process.exit(1);
  }

  console.log(`Creating ${posts.length} posts for Flagworks\n`);

  for (const post of posts) {
    const postId = `flagworks-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    console.log(`${post.date} - ${post.title} (${post.type})`);

    let imageBuffer, mimeType;

    if (post.type === 'website') {
      console.log('  Downloading from website...');
      imageBuffer = await downloadImage(post.imageUrl);
      mimeType = 'image/jpeg';
    } else {
      const result = await generateAIImage(post.aiPrompt);
      if (!result) {
        console.log('  AI image generation failed, skipping...');
        continue;
      }
      imageBuffer = result.data;
      mimeType = result.mimeType;
    }

    console.log('  Uploading to storage...');
    const uploadedUrl = await uploadImage(imageBuffer, mimeType, client.id, postId);

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

    // Small delay
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\nCreated ${posts.length} posts for Flagworks!`);
}

main().catch(console.error);
