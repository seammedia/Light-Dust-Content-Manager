#!/usr/bin/env node
/**
 * Remove BLVD Drinks client from platform (client on hold)
 * Documentation and local files are preserved
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('Removing BLVD Drinks from platform (client on hold)...\n');

  // Find the client
  const { data: client, error: findError } = await supabase
    .from('clients')
    .select('id, name')
    .eq('name', 'BLVD Drinks')
    .single();

  if (findError || !client) {
    console.error('Could not find BLVD Drinks client');
    console.error(findError?.message);
    process.exit(1);
  }

  console.log(`Found client: ${client.name} (${client.id})`);

  // Check for any posts
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('id, date, title')
    .eq('client_id', client.id);

  if (posts && posts.length > 0) {
    console.log(`\nFound ${posts.length} posts - deleting...`);

    const { error: deletePostsError } = await supabase
      .from('posts')
      .delete()
      .eq('client_id', client.id);

    if (deletePostsError) {
      console.error('Failed to delete posts:', deletePostsError.message);
    } else {
      console.log(`✓ Deleted ${posts.length} posts`);
    }
  } else {
    console.log('No posts found for this client');
  }

  // Delete the client
  const { error: deleteError } = await supabase
    .from('clients')
    .delete()
    .eq('id', client.id);

  if (deleteError) {
    console.error('Failed to delete client:', deleteError.message);
    process.exit(1);
  }

  console.log('\n✓ BLVD Drinks removed from platform');
  console.log('  (Local documentation preserved in clients/ folder)');
}

main().catch(console.error);
