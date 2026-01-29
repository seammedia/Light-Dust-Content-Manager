#!/usr/bin/env node
/**
 * Add Abercrombie Ridge February 2026 Posts
 * Country retreat near Taralga, NSW - pet-friendly luxury accommodation
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

if (!GEMINI_KEY) {
  console.error('Missing Gemini API key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenAI({ apiKey: GEMINI_KEY });

// February 2026 posts - 3 per week (Mon/Wed/Fri)
const posts = [
  {
    date: '2026-02-02',
    headline: 'Stroll. Relax. Enjoy.',
    imagePrompt: 'Photograph of a peaceful walking path through Australian bush countryside at golden hour, dried grass, eucalyptus trees, warm sunset light, no people, serene landscape, rural NSW Australia',
    caption: `There's something magical about stepping outside and being surrounded by nothing but nature. No traffic. No crowds. Just you, the bush, and the sound of birds. This is what weekends were made for. 🌿\n\nAbercrombie Ridge, Taralga`,
    hashtags: ['abercrombieridge', 'countryretreat', 'taralga', 'nswholidays', 'weekendgetaway', 'naturewalk', 'australiancountryside', 'escapethecity']
  },
  {
    date: '2026-02-04',
    headline: 'Wake Up in Nature',
    imagePrompt: 'Interior photograph of luxury bedroom with large window showing Australian countryside view at sunrise, comfortable bed with white linens and yellow accent pillows, warm morning light streaming in, cozy retreat aesthetic',
    caption: `Imagine waking up to this view every morning. No alarm, no rush - just soft morning light and the peaceful sounds of the countryside. Your perfect escape is waiting. ☀️\n\nBook your stay at Abercrombie Ridge`,
    hashtags: ['abercrombieridge', 'countryretreat', 'luxuryaccommodation', 'taralga', 'morningviews', 'weekendaway', 'nswgetaway', 'wakeuptonature']
  },
  {
    date: '2026-02-06',
    headline: 'Paws Welcome Here',
    imagePrompt: 'Photograph of a happy kelpie dog sitting in Australian bush landscape at sunset, golden grass, rural property, warm evening light, peaceful countryside setting, dog looking content',
    caption: `The best holidays are the ones where the whole family can come - furry friends included! 🐕 Our pet-friendly retreat means no guilty goodbyes. Bring your best mate and explore the countryside together.\n\nAbercrombie Ridge - where paws are always welcome`,
    hashtags: ['abercrombieridge', 'petfriendly', 'dogfriendlynsw', 'countryretreat', 'bringthedog', 'taralga', 'petfriendlyaccommodation', 'dogsofnsw']
  },
  {
    date: '2026-02-09',
    headline: 'Soak & Relax',
    imagePrompt: 'Outdoor spa hot tub on wooden deck overlooking Australian bush landscape at dusk, steam rising, fairy lights, peaceful countryside view, luxury retreat setting, warm evening ambiance',
    caption: `End your day the right way - soaking under the stars with nothing but the sounds of nature around you. Pure bliss. ✨\n\nOur outdoor spa is the perfect way to unwind after a day exploring the property.\n\nAbercrombie Ridge, Taralga`,
    hashtags: ['abercrombieridge', 'outdoorspa', 'luxuryretreat', 'relaxation', 'taralga', 'weekendvibes', 'spaday', 'undertheestars']
  },
  {
    date: '2026-02-11',
    headline: 'Peace Awaits Here',
    imagePrompt: 'Scenic photograph of Australian countryside sunset view from hilltop property, golden hour light, rolling hills, eucalyptus trees silhouetted, dramatic sky, peaceful rural NSW landscape',
    caption: `Some places just make you breathe a little deeper. Where the sunsets paint the sky and the only sound is the wind through the trees. This is your invitation to slow down. 🌅\n\nAbercrombie Ridge - your peaceful escape`,
    hashtags: ['abercrombieridge', 'peacefulretreat', 'sunsetviews', 'taralga', 'nswholidays', 'countrylife', 'escapethecity', 'serenity']
  },
  {
    date: '2026-02-13',
    headline: 'Long Weekend Luxury',
    imagePrompt: 'Interior photograph of stylish living room in country retreat, comfortable couch, warm lighting, large windows with bush views, cozy luxury aesthetic, fireplace, Australian country home interior',
    caption: `Long weekends were made for places like this. Cozy interiors, stunning views, and absolutely nothing on the agenda except relaxation. Your February escape starts here. 🏡\n\nBook now for the perfect long weekend at Abercrombie Ridge`,
    hashtags: ['abercrombieridge', 'longweekend', 'luxuryretreat', 'countryescape', 'taralga', 'nswgetaway', 'weekendluxury', 'holidayhome']
  },
  {
    date: '2026-02-16',
    headline: 'Sunset Sessions',
    imagePrompt: 'Photograph of outdoor fire pit area at Australian country property during sunset, two chairs facing the view, golden evening light, rural landscape, peaceful entertaining area',
    caption: `Pull up a chair and watch the day melt away. There's no better place to end the evening than around the fire pit, watching the sun dip below the hills. 🔥\n\nAbercrombie Ridge - where every sunset is a show`,
    hashtags: ['abercrombieridge', 'sunsetvibes', 'firepit', 'countryretreat', 'taralga', 'eveningviews', 'outdoorliving', 'australiancountryside']
  },
  {
    date: '2026-02-18',
    headline: 'Morning Magic',
    imagePrompt: 'Photograph of steaming coffee cup on outdoor table with misty Australian bush sunrise view in background, early morning light, dew on grass, peaceful country morning scene',
    caption: `Those quiet morning moments before the world wakes up. Just you, your coffee, and a view that makes everything feel right. ☕\n\nStart your day in peace at Abercrombie Ridge`,
    hashtags: ['abercrombieridge', 'morningcoffee', 'countrymornings', 'peacefulmoments', 'taralga', 'weekendgetaway', 'naturelovers', 'slowmorning']
  },
  {
    date: '2026-02-20',
    headline: 'Explore & Discover',
    imagePrompt: 'Photograph of scenic bushwalking trail through Australian eucalyptus forest, dappled sunlight through trees, natural landscape, hiking path, rural NSW countryside',
    caption: `Lace up your boots and discover what's waiting just beyond your door. Miles of bushland, native wildlife, and trails that lead to the best views. Adventure is calling. 🥾\n\nAbercrombie Ridge - explore the great outdoors`,
    hashtags: ['abercrombieridge', 'bushwalking', 'hikingnessw', 'naturewalk', 'taralga', 'outdooradventure', 'australianbush', 'exploremore']
  },
  {
    date: '2026-02-23',
    headline: 'Your Private Escape',
    imagePrompt: 'Aerial style photograph of secluded country property surrounded by Australian bush, luxury accommodation nestled in nature, golden hour light, private retreat setting, rural NSW',
    caption: `Tucked away from the everyday, surrounded by nature on all sides. This is what a true escape looks like - your own private slice of paradise. 🌳\n\nAbercrombie Ridge, Taralga - book your escape today`,
    hashtags: ['abercrombieridge', 'privateretreat', 'secludedgetaway', 'luxuryescape', 'taralga', 'nswholidays', 'countryretreat', 'hideaway']
  },
  {
    date: '2026-02-25',
    headline: 'Starry Nights',
    imagePrompt: 'Night sky photograph with stars visible over Australian country property silhouette, milky way, dark sky, rural setting with no light pollution, peaceful night scene',
    caption: `When was the last time you really looked up at the stars? Out here, away from the city lights, the night sky puts on a show you won't forget. ⭐\n\nAbercrombie Ridge - where the stars shine brighter`,
    hashtags: ['abercrombieridge', 'stargazing', 'nightsky', 'darkskies', 'taralga', 'countryskies', 'milkyway', 'natureatnight']
  },
  {
    date: '2026-02-27',
    headline: 'Come Back Soon',
    imagePrompt: 'Photograph of welcoming country property entrance at golden hour, rustic gate, tree-lined driveway, Australian bush setting, warm inviting light, arrival scene at rural retreat',
    caption: `The hardest part about staying here? Leaving. But don't worry - the countryside will be waiting for you whenever you need it. Until next time... 💛\n\nAbercrombie Ridge - your home away from home`,
    hashtags: ['abercrombieridge', 'comebacksoon', 'countryretreat', 'taralga', 'homeawayfromhome', 'weekendgetaway', 'nswholidays', 'untilnexttime']
  }
];

/**
 * Generate image using Gemini
 */
async function generateImage(prompt) {
  console.log('  Generating image...');

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash-exp-image-generation',
      contents: prompt + '. Professional photograph, high quality, no text, no logos, no watermarks.',
      config: {
        responseModalities: ['image', 'text'],
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return {
          data: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png'
        };
      }
    }
    return null;
  } catch (error) {
    console.error(`  Image generation failed: ${error.message}`);
    return null;
  }
}

/**
 * Upload image to Supabase Storage
 */
async function uploadImage(imageData, mimeType, clientId, postId) {
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const fileName = `${clientId}/${postId}.${ext}`;
  const buffer = Buffer.from(imageData, 'base64');

  const { error } = await supabase.storage
    .from('post-images')
    .upload(fileName, buffer, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: true,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from('post-images').getPublicUrl(fileName);
  return data.publicUrl;
}

async function main() {
  console.log('Adding Abercrombie Ridge February 2026 posts...\n');

  // Get client
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, name')
    .eq('name', 'Abercrombie Ridge')
    .single();

  if (clientError || !client) {
    console.error('Could not find Abercrombie Ridge client');
    process.exit(1);
  }

  console.log(`Found client: ${client.name} (${client.id})\n`);

  let successCount = 0;
  let failCount = 0;

  for (const post of posts) {
    const postId = `abercrombie-feb-${post.date}-${Date.now()}`;
    console.log(`Processing ${post.date}: ${post.headline}`);

    try {
      // Generate image
      const imageResult = await generateImage(post.imagePrompt);

      let imageUrl = '';
      if (imageResult) {
        console.log('  Uploading image...');
        imageUrl = await uploadImage(imageResult.data, imageResult.mimeType, client.id, postId);
        console.log(`  Image URL: ${imageUrl}`);
      } else {
        console.log('  No image generated, continuing without image');
      }

      // Create post
      const postData = {
        id: postId,
        client_id: client.id,
        title: post.headline,
        date: post.date,
        status: 'For Approval',
        image_description: post.headline,
        image_url: imageUrl,
        media_type: imageUrl ? 'image' : null,
        generated_caption: post.caption,
        generated_hashtags: post.hashtags,
        notes: ''
      };

      const { error: insertError } = await supabase.from('posts').insert(postData);
      if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

      console.log('  ✓ Post created\n');
      successCount++;
    } catch (error) {
      console.error(`  ✗ Failed: ${error.message}\n`);
      failCount++;
    }
  }

  console.log('='.repeat(50));
  console.log(`Complete! ${successCount} posts created, ${failCount} failed`);
}

main().catch(console.error);
