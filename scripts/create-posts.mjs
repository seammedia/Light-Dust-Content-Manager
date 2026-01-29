#!/usr/bin/env node
/**
 * Create Posts Script with AI Image Generation
 *
 * Usage:
 *   node scripts/create-posts.mjs --client "Pace Electrical" --dates "2026-02-15,2026-02-18" --topics "LED lighting upgrade,Hot water system repairs"
 *
 * Environment variables required:
 *   VITE_SUPABASE_URL - Supabase project URL
 *   VITE_SUPABASE_ANON_KEY - Supabase anon key
 *   VITE_GEMINI_API_KEY - Google Gemini API key
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;

// Validate environment
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

if (!GEMINI_API_KEY) {
  console.error('Missing Gemini API key. Set VITE_GEMINI_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/**
 * Load client profile from markdown file
 */
function loadClientProfile(clientName) {
  const folderName = clientName.toLowerCase().replace(/\s+/g, '-');

  // Try new folder structure first: clients/client-name/profile.md
  let filePath = path.join(__dirname, '..', 'clients', folderName, 'profile.md');

  if (!fs.existsSync(filePath)) {
    // Fall back to old structure: clients/client-name.md
    filePath = path.join(__dirname, '..', 'clients', folderName + '.md');
  }

  if (!fs.existsSync(filePath)) {
    console.warn(`No profile found for ${clientName}, using defaults`);
    return null;
  }

  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Generate caption using Gemini
 */
async function generateCaption(topic, clientProfile, clientName) {
  const prompt = `You are a social media copywriter. Create a social media caption for ${clientName}.

${clientProfile ? `Client Profile:\n${clientProfile}\n\n` : ''}

Topic: ${topic}

Requirements:
- Write in a professional but friendly tone
- Include a hook that addresses a pain point or situation
- Mention their expertise/experience if relevant
- Keep it concise (2-3 short paragraphs)
- Do NOT include hashtags (those will be added separately)
- If the client has a phone number in their profile, optionally include it with a phone emoji

Return ONLY the caption text, nothing else.`;

  const response = await genAI.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  });

  return response.candidates[0].content.parts[0].text.trim();
}

/**
 * Generate hashtags using Gemini
 */
async function generateHashtags(topic, caption, clientProfile) {
  const prompt = `Generate 5 relevant Instagram hashtags for this social media post.

Topic: ${topic}
Caption: ${caption}

${clientProfile ? `Common hashtags from client profile:\n${clientProfile.match(/##.*Hashtags[\s\S]*?(?=##|$)/)?.[0] || ''}\n` : ''}

Requirements:
- Return exactly 5 hashtags
- No # symbol, just the words
- Lowercase, no spaces
- Mix of specific and broader reach hashtags
- Return as comma-separated list, nothing else

Example output: electrician, homesafety, licensedtrades, melbourneelectrician, safetyfirst`;

  const response = await genAI.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  });

  const text = response.candidates[0].content.parts[0].text.trim();
  return text.split(',').map(h => h.trim().replace('#', ''));
}

/**
 * Generate image using Gemini 3 Pro Image (Nano Banana Pro)
 */
async function generateImage(topic, caption, clientName) {
  const imagePrompt = `Professional social media photograph for ${clientName}, an electrical services company in Australia.

Topic: ${topic}

Style requirements:
- Photorealistic, professional quality
- Clean, well-lit composition
- Australian residential or commercial setting
- Show the service or result, not faces of workers
- Modern, trustworthy aesthetic
- Square format (1:1 aspect ratio) for Instagram

Scene suggestion based on topic: ${topic}`;

  console.log(`  Generating image for: ${topic}`);

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: imagePrompt,
      config: {
        responseModalities: ['image', 'text'],
        imageConfig: {
          aspectRatio: '1:1',
          imageSize: '1K'
        }
      }
    });

    // Extract image data from response
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return {
          data: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png'
        };
      }
    }

    console.warn('  No image in response, skipping image generation');
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
  const fileName = `${clientId}/${postId}-${Date.now()}.${ext}`;

  // Convert base64 to buffer
  const buffer = Buffer.from(imageData, 'base64');

  const { error } = await supabase.storage
    .from('post-images')
    .upload(fileName, buffer, {
      contentType: mimeType,
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
 * Create a single post
 */
async function createPost(clientId, clientName, clientProfile, date, topic) {
  const postId = `${clientName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

  console.log(`\nCreating post for ${date}: ${topic}`);

  // Generate caption
  console.log('  Generating caption...');
  const caption = await generateCaption(topic, clientProfile, clientName);

  // Generate hashtags
  console.log('  Generating hashtags...');
  const hashtags = await generateHashtags(topic, caption, clientProfile);

  // Generate image
  const imageResult = await generateImage(topic, caption, clientName);

  let imageUrl = '';
  if (imageResult) {
    console.log('  Uploading image...');
    imageUrl = await uploadImage(imageResult.data, imageResult.mimeType, clientId, postId);
    console.log(`  Image uploaded: ${imageUrl}`);
  }

  // Create post in database
  const post = {
    id: postId,
    client_id: clientId,
    title: topic,
    date: date,
    status: 'For Approval',
    image_description: topic,
    image_url: imageUrl,
    media_type: imageUrl ? 'image' : null,
    generated_caption: caption,
    generated_hashtags: hashtags,
    notes: ''
  };

  const { error } = await supabase.from('posts').insert(post);

  if (error) {
    throw new Error(`Failed to create post: ${error.message}`);
  }

  return post;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let clientName = '';
  let dates = [];
  let topics = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--client' && args[i + 1]) {
      clientName = args[++i];
    } else if (args[i] === '--dates' && args[i + 1]) {
      dates = args[++i].split(',').map(d => d.trim());
    } else if (args[i] === '--topics' && args[i + 1]) {
      topics = args[++i].split(',').map(t => t.trim());
    }
  }

  if (!clientName || dates.length === 0 || topics.length === 0) {
    console.log(`
Usage: node scripts/create-posts.mjs --client "Client Name" --dates "YYYY-MM-DD,..." --topics "Topic 1,Topic 2,..."

Example:
  node scripts/create-posts.mjs \\
    --client "Pace Electrical" \\
    --dates "2026-02-15,2026-02-18,2026-02-22" \\
    --topics "LED lighting upgrade,Hot water system repairs,Outdoor power points"
    `);
    process.exit(1);
  }

  if (dates.length !== topics.length) {
    console.error(`Error: Number of dates (${dates.length}) must match number of topics (${topics.length})`);
    process.exit(1);
  }

  // Get client from database
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, name')
    .eq('name', clientName)
    .single();

  if (clientError || !client) {
    console.error(`Client "${clientName}" not found`);
    process.exit(1);
  }

  console.log(`Found client: ${client.name} (${client.id})`);

  // Load client profile
  const clientProfile = loadClientProfile(clientName);
  if (clientProfile) {
    console.log('Loaded client profile from markdown file');
  }

  // Create posts
  const createdPosts = [];
  for (let i = 0; i < dates.length; i++) {
    try {
      const post = await createPost(client.id, client.name, clientProfile, dates[i], topics[i]);
      createdPosts.push(post);
    } catch (error) {
      console.error(`Failed to create post for ${dates[i]}: ${error.message}`);
    }
  }

  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Created ${createdPosts.length} posts for ${clientName}:`);
  createdPosts.forEach(p => {
    console.log(`  - ${p.date}: ${p.title}${p.image_url ? ' (with image)' : ''}`);
  });
}

main().catch(console.error);
