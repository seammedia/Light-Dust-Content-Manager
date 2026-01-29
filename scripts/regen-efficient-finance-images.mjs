#!/usr/bin/env node
/**
 * Regenerate Efficient Finance images with proper asset-focused prompts
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const genAI = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });

// Asset-focused image prompts - NO logos, NO branding, just clean photos of the ASSET
const imagePrompts = {
  'Car Finance': 'Professional stock photo of a shiny new sedan car in a suburban Australian driveway, sunny day, clean aspirational lifestyle photography, no text, no logos, no people',
  'Boat Finance': 'Beautiful aerial drone photo of a white speedboat cruising on calm turquoise Australian coastal waters, sunny day, aspirational lifestyle photography, no text, no logos',
  'Equipment Finance for Business': 'Professional photo of a clean yellow excavator and construction machinery at a worksite, Australian setting, clear blue sky, no workers visible, stock photography style, no text, no logos',
  'Caravan and Motorhome Finance': 'Stunning photo of a modern white caravan parked at a scenic Australian beach campground, golden hour lighting, aspirational road trip lifestyle, no text, no logos, no people',
  'Truck Finance': 'Professional photo of a clean white commercial truck or ute on an Australian highway, sunny day, stock photography style, no text, no logos, no workers',
  'Why Use a Finance Broker': 'Aspirational lifestyle photo showing keys being handed over for a new car purchase, Australian setting, happy moment, bright and positive, no text, no logos',
  'Jet Ski and Watercraft Finance': 'Action photo of a jet ski on sparkling blue Australian ocean water, summer vibes, fun lifestyle photography, no text, no logos, no visible faces',
  'Business Asset Finance': 'Professional photo of a modern work ute with toolboxes in an Australian suburban setting, clean and professional, tradies lifestyle, no text, no logos, no workers visible'
};

async function generateImage(prompt) {
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
      return { data: part.inlineData.data, mimeType: part.inlineData.mimeType || 'image/png' };
    }
  }
  return null;
}

async function uploadImage(imageData, mimeType, clientId, postId) {
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const fileName = `${clientId}/${postId}-regen-${Date.now()}.${ext}`;
  const buffer = Buffer.from(imageData, 'base64');

  const { error } = await supabase.storage.from('post-images').upload(fileName, buffer, {
    contentType: mimeType, cacheControl: '3600', upsert: true
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('post-images').getPublicUrl(fileName);
  return data.publicUrl;
}

async function main() {
  const { data: client } = await supabase.from('clients').select('id').eq('name', 'Efficient Finance').single();

  // Get all Feb posts
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('client_id', client.id)
    .gte('date', '2026-02-01')
    .lte('date', '2026-02-28')
    .order('date');

  console.log(`Regenerating images for ${posts.length} Efficient Finance posts\n`);

  for (const post of posts) {
    const prompt = imagePrompts[post.title];
    if (!prompt) {
      console.log(`Skipping ${post.title} - no prompt defined`);
      continue;
    }

    console.log(`${post.date} - ${post.title}`);
    console.log('  Generating clean asset photo...');

    const imageResult = await generateImage(prompt);

    if (imageResult) {
      console.log('  Uploading...');
      const imageUrl = await uploadImage(imageResult.data, imageResult.mimeType, client.id, post.id);

      await supabase.from('posts').update({ image_url: imageUrl, media_type: 'image' }).eq('id', post.id);
      console.log('  Done!\n');
    } else {
      console.log('  Failed to generate image\n');
    }
  }

  console.log('All images regenerated!');
}

main().catch(console.error);
