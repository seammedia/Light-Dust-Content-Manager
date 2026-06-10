/**
 * Generalised publish stage for the content loop.
 *
 * Takes a JSON file of approved posts (output of the content-loop workflow),
 * inserts them into the dashboard as Drafts, generates images via OpenAI
 * gpt-image-2, uploads to Supabase storage, and attaches them to the posts.
 *
 * Usage:
 *   node scripts/publish-posts.mjs --file /path/to/batch.json
 *   ONLY_DATES="2026-05-13" node scripts/publish-posts.mjs --file batch.json   # retry specific dates
 *   SKIP_IMAGES=1 node scripts/publish-posts.mjs --file batch.json             # insert posts only
 *
 * batch.json format:
 * {
 *   "clientName": "Approved Expandable Homes",      // exact name in clients table
 *   "referenceImagePaths": ["/abs/path/ref1.jpg"],  // optional local files for gpt-image-2 style refs
 *   "posts": [
 *     { "date": "YYYY-MM-DD", "title": "...", "caption": "...",
 *       "hashtags": ["NoHashPrefix"], "imagePrompt": "..." }
 *   ]
 * }
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { basename, resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Buffer } from 'buffer';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const OPENAI_KEY = process.env.VITE_OPENAI_API_KEY;

const fileArgIdx = process.argv.indexOf('--file');
if (fileArgIdx === -1 || !process.argv[fileArgIdx + 1]) {
  console.error('Usage: node scripts/publish-posts.mjs --file batch.json');
  process.exit(1);
}
const batchPath = resolve(process.cwd(), process.argv[fileArgIdx + 1]);
const batch = JSON.parse(readFileSync(batchPath, 'utf-8'));

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}
const skipImages = !!process.env.SKIP_IMAGES;
if (!OPENAI_KEY && !skipImages) {
  console.error('Missing VITE_OPENAI_API_KEY in .env.local (or set SKIP_IMAGES=1)');
  process.exit(1);
}

const onlyDates = process.env.ONLY_DATES ? process.env.ONLY_DATES.split(',').map((s) => s.trim()) : null;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const mimeFor = (path) => {
  const ext = path.toLowerCase().split('.').pop();
  return { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[ext] || 'image/jpeg';
};

async function generateImage(prompt, brandContext, refPaths) {
  const fullPrompt = [
    prompt,
    brandContext ? `\nBrand context: ${brandContext}` : '',
    '\nHigh-quality, professional Instagram square image. 1:1 composition.'
  ].join('');

  let response;
  if (refPaths && refPaths.length > 0) {
    const formData = new FormData();
    formData.append('model', 'gpt-image-2');
    formData.append('prompt', fullPrompt);
    formData.append('size', '1024x1024');
    formData.append('quality', 'medium');
    formData.append('n', '1');
    for (const p of refPaths.slice(0, 8)) {
      const buf = readFileSync(p);
      formData.append('image[]', new Blob([buf], { type: mimeFor(p) }), basename(p));
    }
    response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_KEY}` },
      body: formData
    });
  } else {
    response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-2', prompt: fullPrompt, size: '1024x1024', quality: 'medium', n: 1 })
    });
  }

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI ${response.status}: ${err.substring(0, 250)}`);
  }
  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image data returned');
  return b64;
}

async function uploadToStorage(base64, clientId, postId) {
  const buffer = Buffer.from(base64, 'base64');
  const path = `${clientId}/${postId}-${Date.now()}.png`;
  const { error } = await supabase.storage.from('post-images').upload(path, buffer, { contentType: 'image/png', upsert: true });
  if (error) throw new Error(`Storage upload: ${error.message}`);
  return supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;
}

async function main() {
  const { data: client, error: cErr } = await supabase
    .from('clients')
    .select('id, brand_name, client_notes, brand_colors, brand_style_notes, reference_images')
    .eq('name', batch.clientName)
    .single();
  if (cErr || !client) {
    console.error(`Client "${batch.clientName}" not found:`, cErr?.message);
    process.exit(1);
  }

  const brandContext = [
    `Brand: ${client.brand_name}`,
    client.client_notes,
    client.brand_colors?.length ? `Brand colours: ${client.brand_colors.join(', ')}` : null,
    client.brand_style_notes ? `Visual style: ${client.brand_style_notes}` : null
  ].filter(Boolean).join('. ');

  const slug = batch.clientName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const refPaths = batch.referenceImagePaths || [];
  console.log(`Client: ${batch.clientName} (${client.id})`);
  console.log(`Reference images: ${refPaths.length} local file(s)`);
  console.log(`Posts in batch: ${batch.posts.length}${onlyDates ? ` (filtering to ${onlyDates.join(', ')})` : ''}\n`);

  let ok = 0, failed = 0;
  for (const post of batch.posts) {
    if (onlyDates && !onlyDates.includes(post.date)) continue;
    console.log(`[${post.date}] ${post.title}`);

    try {
      // Skip if an identical post already exists (makes retries safe)
      const { data: existing } = await supabase
        .from('posts')
        .select('id, image_url')
        .eq('client_id', client.id)
        .eq('date', post.date)
        .eq('title', post.title);

      let postId;
      if (existing && existing.length > 0) {
        postId = existing[0].id;
        if (existing[0].image_url) {
          console.log('  ↷ Already exists with image - skipping\n');
          continue;
        }
        console.log('  ↷ Post exists without image - generating image only');
      } else {
        postId = `${slug}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const { error: iErr } = await supabase.from('posts').insert({
          id: postId,
          client_id: client.id,
          date: post.date,
          title: post.title,
          generated_caption: post.caption,
          generated_hashtags: post.hashtags,
          notes: `IMAGE PROMPT: ${post.imagePrompt}`,
          status: 'Draft',
          image_url: '',
          image_description: ''
        });
        if (iErr) throw new Error(`Insert: ${iErr.message}`);
        console.log('  ✓ Post inserted');
      }

      if (!skipImages) {
        console.log('  ⏳ Generating image (gpt-image-2)...');
        const t0 = Date.now();
        const b64 = await generateImage(post.imagePrompt, brandContext, refPaths);
        console.log(`  ✓ Image generated (${Math.round((Date.now() - t0) / 1000)}s)`);
        const url = await uploadToStorage(b64, client.id, postId);
        const { error: uErr } = await supabase.from('posts').update({ image_url: url }).eq('id', postId);
        if (uErr) throw new Error(`Update: ${uErr.message}`);
        console.log('  ✓ Image attached');
      }
      ok++;
      console.log('');
    } catch (e) {
      console.error(`  ✗ ${e.message}\n`);
      failed++;
    }
  }
  console.log(`=== Done: ${ok} ok, ${failed} failed ===`);
  if (failed > 0) console.log('Retry failures with: ONLY_DATES="YYYY-MM-DD,..." node scripts/publish-posts.mjs --file ' + batchPath);
}

main().catch(console.error);
