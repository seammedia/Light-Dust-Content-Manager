#!/usr/bin/env node
/**
 * Create Mediterranean Blu Spritz posts
 * Jan 26 - end of Feb, 3 posts per week
 * Mix of AI-generated lifestyle images and product shots
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const genAI = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });

const productImageUrl = 'https://pureplatinumbeverages.com/cdn/shop/files/MediterraneanBlu11.png?v=1761029176';

const posts = [
  // Week 1: Jan 26, 28, 30
  {
    date: '2026-01-26',
    title: 'Australia Day Blue',
    type: 'ai',
    aiPrompt: 'Elegant photograph of a glass of vibrant blue wine on a white marble table by a luxury pool, golden afternoon sunlight, Mediterranean summer aesthetic, palm trees in background, no text, no logos, professional lifestyle photography',
    caption: `Happy Australia Day! 🇦🇺💙

What better way to celebrate than with something truly unique? Mediterranean Blu brings the vibrant blue of the Mediterranean Sea to your glass.

Made from 99% Xynisteri grapes in Cyprus, this stunning blue wine is 100% natural – no artificial colours, just pure Mediterranean magic.

Poolside, beachside, or backyard BBQ – wherever you're celebrating today, make it memorable.`,
    hashtags: ['AustraliaDay', 'MediterraneanBlu', 'BlueWine', 'PoolsideVibes', 'AussieSummer', 'CelebrateInStyle']
  },
  {
    date: '2026-01-28',
    title: 'Sunset Sips',
    type: 'ai',
    aiPrompt: 'Stunning photograph of hands holding a glass of bright blue wine against a golden orange sunset over the ocean, warm lighting, romantic summer evening vibes, professional lifestyle photography, no text, no logos',
    caption: `When the sky turns golden and the wine turns blue. 🌅💙

There's something magical about watching the sunset with a glass of Mediterranean Blu in hand. Light, fruity, and impossibly refreshing – it's the perfect companion for golden hour.

Made in the mountain village of Omodos, Cyprus, this is the Mediterranean in a bottle.

Where are you watching the sunset tonight?`,
    hashtags: ['SunsetSips', 'GoldenHour', 'MediterraneanBlu', 'BlueWine', 'SummerNights', 'WineOClock']
  },
  {
    date: '2026-01-30',
    title: 'Natural Blue',
    type: 'website',
    imageUrl: productImageUrl,
    caption: `Yes, it's really that blue. And yes, it's 100% natural. 💙✨

No artificial colours. No gimmicks. Just pure Mediterranean magic from Cyprus's first-ever blue wine.

The stunning hue comes naturally from a blend of 99% Xynisteri grapes with a touch of Alicante and Mataro – all grown in the mountain village of Omodos.

Light, fruity notes of berries, lychee, and citrus. Technically dry but beautifully balanced.

This is Mediterranean Blu.`,
    hashtags: ['MediterraneanBlu', 'BlueWine', 'NaturalWine', 'CyprusWine', 'NoArtificialColours', 'WineLovers']
  },

  // Week 2: Feb 2, 4, 6
  {
    date: '2026-02-02',
    title: 'Poolside Perfection',
    type: 'ai',
    aiPrompt: 'Luxurious photograph of a bottle of blue wine and two glasses on a poolside table, sparkling turquoise pool in background, white Mediterranean-style loungers, bright sunny day, summer lifestyle, professional photography, no text, no logos',
    caption: `Poolside essentials: sunshine, good company, and Mediterranean Blu. ☀️🏊‍♀️💙

There's no better way to spend a summer afternoon than lounging by the pool with a glass of Cyprus's first blue wine. Light, refreshing, and impossibly vibrant.

The natural blue colour makes every pour Instagram-worthy – but trust us, the taste is even better.

What's in your poolside glass today?`,
    hashtags: ['PoolsideVibes', 'MediterraneanBlu', 'SummerWine', 'BlueWine', 'PoolParty', 'WeekendVibes']
  },
  {
    date: '2026-02-04',
    title: 'Seafood Pairing',
    type: 'ai',
    aiPrompt: 'Elegant flat lay photograph of a glass of vibrant blue wine next to a fresh seafood platter with oysters, prawns, and lemon on white marble, Mediterranean dining aesthetic, natural lighting, professional food photography, no text, no logos',
    caption: `The perfect pairing doesn't exi— 🦪💙

Mediterranean Blu and fresh seafood were made for each other. The crisp, fruity profile with hints of citrus and berries cuts through rich seafood like a dream.

Whether it's oysters, prawns, or your favourite fish, this blue beauty elevates every bite.

What's on your plate tonight?`,
    hashtags: ['SeafoodLovers', 'WinePairing', 'MediterraneanBlu', 'FineDining', 'FoodAndWine', 'OceanToTable']
  },
  {
    date: '2026-02-06',
    title: 'Boat Life',
    type: 'ai',
    aiPrompt: 'Stunning photograph of a glass of bright blue wine on a yacht deck with sparkling ocean water in background, luxury boating lifestyle, Mediterranean summer, golden sunlight, professional lifestyle photography, no text, no logos',
    caption: `Set sail with something special. ⛵💙

Mediterranean Blu was made for moments like this – ocean breeze, endless horizon, and a glass of Cyprus's most stunning wine in hand.

Light and refreshing with notes of berries and lychee, it's the ultimate companion for life on the water.

Where's your next adventure taking you?`,
    hashtags: ['BoatLife', 'YachtLife', 'MediterraneanBlu', 'SailingLife', 'OceanViews', 'LuxuryLifestyle']
  },

  // Week 3: Feb 9, 11, 13
  {
    date: '2026-02-09',
    title: 'Sunday Sessions',
    type: 'ai',
    aiPrompt: 'Cozy photograph of two glasses of vibrant blue wine being clinked together in a toast, outdoor terrace setting with Mediterranean views, afternoon golden light, celebration moment, professional lifestyle photography, no text, no logos',
    caption: `Sunday sessions hit different with Mediterranean Blu. 🥂💙

Grab your favourite humans, pour something beautiful, and make the most of the long weekend.

This natural blue wine from Cyprus is light, fruity, and perfect for those lazy Sunday afternoons that turn into evenings.

Who are you toasting with today?`,
    hashtags: ['SundaySessions', 'MediterraneanBlu', 'WeekendVibes', 'Cheers', 'BlueWine', 'GoodTimesOnly']
  },
  {
    date: '2026-02-11',
    title: 'Valentines Preview',
    type: 'website',
    imageUrl: productImageUrl,
    caption: `Valentine's Day is just around the corner... 💙🌹

Skip the traditional red this year and surprise your special someone with something as unique as they are.

Mediterranean Blu is Cyprus's first-ever blue wine – striking, romantic, and unforgettable. Just like your love story.

Light, fruity, and beautifully balanced. The perfect pour for a romantic dinner.

Tag someone you'd share this with! 💕`,
    hashtags: ['ValentinesDay', 'DateNight', 'MediterraneanBlu', 'RomanticDinner', 'GiftIdeas', 'LoveInAGlass']
  },
  {
    date: '2026-02-13',
    title: 'Valentines Eve',
    type: 'ai',
    aiPrompt: 'Romantic photograph of a bottle of blue wine and two glasses on an elegantly set dinner table with candles and roses, intimate Valentine\'s Day setting, soft warm lighting, professional lifestyle photography, no text, no logos',
    caption: `Tomorrow is the day of love. Are you ready? 💙❤️

Mediterranean Blu adds a touch of magic to any romantic dinner. The stunning natural blue colour, the light fruity notes, the delicate sweetness – it's romance in a glass.

Pair it with seafood, sushi, or fresh fruit for the ultimate Valentine's experience.

Happy Valentine's Eve! 🌹`,
    hashtags: ['ValentinesEve', 'MediterraneanBlu', 'RomanticDinner', 'DateNight', 'LoveIsInTheAir', 'BlueWine']
  },

  // Week 4: Feb 16, 18, 20
  {
    date: '2026-02-16',
    title: 'Beach Days',
    type: 'ai',
    aiPrompt: 'Beautiful photograph of a glass of vibrant blue wine on a sandy beach with turquoise ocean waves in background, summer beach day aesthetic, bright natural lighting, Mediterranean vibes, professional lifestyle photography, no text, no logos',
    caption: `Sandy toes and blue wine flows. 🏖️💙

Mediterranean Blu was practically made for beach days. The colour matches the ocean, the taste matches the vibe – light, refreshing, and impossibly summery.

Cyprus's first blue wine is 100% natural, with notes of berries, lychee, and citrus that taste like summer in a glass.

Beach day essentials: sunscreen, good music, and this. ☀️`,
    hashtags: ['BeachDay', 'MediterraneanBlu', 'SummerVibes', 'BlueWine', 'OceanVibes', 'BeachLife']
  },
  {
    date: '2026-02-18',
    title: 'Cyprus Origins',
    type: 'website',
    imageUrl: productImageUrl,
    caption: `From the mountain village of Omodos, Cyprus – to your glass. 🇨🇾💙

Mediterranean Blu is crafted at Lino's Winery using 99% Xynisteri grapes, a variety that's been grown in Cyprus for centuries.

The result? A wine that's light, fruity, and impossibly beautiful. The stunning blue comes naturally from a blend with Alicante and Mataro grapes – no artificial colours needed.

This is the Mediterranean, captured in a bottle.`,
    hashtags: ['CyprusWine', 'MediterraneanBlu', 'Omodos', 'LinosWinery', 'NaturalWine', 'WineOrigins']
  },
  {
    date: '2026-02-20',
    title: 'Sushi Night',
    type: 'ai',
    aiPrompt: 'Elegant photograph of a glass of bright blue wine next to a beautifully arranged sushi platter on a dark slate surface, Japanese-Mediterranean fusion aesthetic, professional food photography, natural lighting, no text, no logos',
    caption: `Sushi + Blue Wine = the crossover we didn't know we needed. 🍣💙

Mediterranean Blu's crisp, fruity profile pairs beautifully with fresh sushi. The subtle notes of citrus and berries complement the delicate flavours of fish perfectly.

Try it with salmon sashimi, tuna rolls, or your favourite Japanese bites.

What's your go-to sushi order?`,
    hashtags: ['SushiNight', 'MediterraneanBlu', 'WinePairing', 'FoodieFinds', 'BlueWine', 'SushiLovers']
  },

  // Week 5: Feb 23, 25, 27
  {
    date: '2026-02-23',
    title: 'Girls Night',
    type: 'ai',
    aiPrompt: 'Fun photograph of multiple glasses of vibrant blue wine being clinked together in a group toast, outdoor patio setting, fairy lights in background, celebration with friends, warm evening lighting, professional lifestyle photography, no text, no logos',
    caption: `Call the girls. It's happening. 👯‍♀️💙

Mediterranean Blu is the ultimate girls' night wine. It's gorgeous, it's unique, and it tastes as good as it looks.

Light, fruity, and refreshing – perfect for those catch-up sessions that turn into late nights.

Tag your wine crew! 🥂✨`,
    hashtags: ['GirlsNight', 'MediterraneanBlu', 'WineNight', 'SquadGoals', 'BlueWine', 'CheersToUs']
  },
  {
    date: '2026-02-25',
    title: 'Golden Hour',
    type: 'ai',
    aiPrompt: 'Stunning photograph of a bottle of blue wine and glass on a balcony railing with Mediterranean village and ocean view at golden hour, warm sunset lighting, dreamy summer evening aesthetic, professional lifestyle photography, no text, no logos',
    caption: `Golden hour. Blue wine. Good vibes only. 🌅💙

There's something about that magic hour when the sun starts to set and everything turns golden. Add a glass of Mediterranean Blu and the moment becomes unforgettable.

Light, fruity, and beautifully balanced – this Cyprus wine was made for moments like this.

Cheers to summer evenings. ✨`,
    hashtags: ['GoldenHour', 'MediterraneanBlu', 'SunsetVibes', 'BlueWine', 'SummerEvenings', 'MagicMoments']
  },
  {
    date: '2026-02-27',
    title: 'End of Month Toast',
    type: 'website',
    imageUrl: productImageUrl,
    caption: `February, you've been a vibe. 💙🥂

As we close out the month, let's raise a glass to good times, great memories, and plenty more to come.

Mediterranean Blu – Cyprus's first blue wine, 100% natural, and 100% unforgettable.

What was your favourite moment this month? Tell us below! 👇✨`,
    hashtags: ['MediterraneanBlu', 'BlueWine', 'Cheers', 'GoodVibesOnly', 'EndOfMonth', 'WineMoments']
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
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('name', 'Mediterranean Blu Spritz')
    .single();

  if (clientError || !client) {
    console.error('Mediterranean Blu Spritz client not found');
    process.exit(1);
  }

  console.log(`Creating ${posts.length} posts for Mediterranean Blu Spritz\n`);

  for (const post of posts) {
    const postId = `medblu-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    console.log(`${post.date} - ${post.title} (${post.type})`);

    let imageBuffer, mimeType;

    try {
      if (post.type === 'website') {
        console.log('  Downloading from website...');
        imageBuffer = await downloadImage(post.imageUrl);
        mimeType = 'image/png';
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
    } catch (err) {
      console.log(`  Error: ${err.message}\n`);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\nCreated posts for Mediterranean Blu Spritz!`);
}

main().catch(console.error);
