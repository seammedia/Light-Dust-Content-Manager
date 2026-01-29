#!/usr/bin/env node
/**
 * Regenerate Mediterranean Blu images - glasses only, NO bottles
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const genAI = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });

// New prompts - glasses only, NO bottles (AI can't reproduce labels correctly)
const updates = [
  {
    date: '2026-02-18',
    prompt: 'Elegant photograph of a single wine glass filled with vibrant bright blue wine, Mediterranean white village with terracotta rooftops and ocean view in background, golden hour sunset lighting, romantic summer evening, professional lifestyle photography, no bottle, no text, no logos'
  },
  {
    date: '2026-02-25',
    prompt: 'Stunning photograph of a wine glass filled with bright blue wine held up against a golden sunset sky over the Mediterranean sea, warm evening light, dreamy summer aesthetic, hand visible holding glass, professional lifestyle photography, no bottle, no text, no logos'
  },
  {
    date: '2026-02-27',
    prompt: 'Beautiful photograph of two elegant wine glasses filled with vibrant blue wine on a marble table, Mediterranean terrace setting with ocean view, soft evening light, celebration moment, professional lifestyle photography, no bottle, no text, no logos'
  }
];

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
  const { data: client } = await supabase.from('clients').select('id').eq('name', 'Mediterranean Blu Spritz').single();

  for (const update of updates) {
    console.log(`${update.date} - Generating new image (glass only, no bottle)...`);

    const result = await generateImage(update.prompt);
    if (!result) {
      console.log('  Failed to generate');
      continue;
    }

    // Get the post ID
    const { data: post } = await supabase
      .from('posts')
      .select('id')
      .eq('client_id', client.id)
      .eq('date', update.date)
      .single();

    if (!post) {
      console.log('  Post not found');
      continue;
    }

    console.log('  Uploading...');
    const imageUrl = await uploadImage(result.data, result.mimeType, client.id, post.id);

    await supabase.from('posts').update({ image_url: imageUrl }).eq('id', post.id);
    console.log('  Done!\n');
  }

  console.log('All images regenerated!');
}

main().catch(console.error);
