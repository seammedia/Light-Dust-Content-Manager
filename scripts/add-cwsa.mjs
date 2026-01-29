#!/usr/bin/env node
/**
 * Add CWSA client with shared PIN access for Sal
 *
 * Usage:
 *   node scripts/add-cwsa.mjs
 *
 * Environment variables required:
 *   VITE_SUPABASE_URL - Supabase project URL
 *   VITE_SUPABASE_ANON_KEY - Supabase anon key
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('Adding CWSA client...\n');

  // Check if CWSA already exists
  const { data: existing } = await supabase
    .from('clients')
    .select('*')
    .eq('name', 'CWSA');

  if (existing && existing.length > 0) {
    console.log('CWSA client already exists!');
    console.log(existing[0]);
    return;
  }

  // Add CWSA client with same PIN as Washco Express
  const { data: newClient, error: insertError } = await supabase
    .from('clients')
    .insert({
      name: 'CWSA',
      pin: '4729',  // Same PIN as Washco Express
      brand_name: 'CWSA',
      brand_mission: 'Professional car wash services association',
      brand_tone: 'Professional, industry-focused, informative',
      brand_keywords: ['carwash', 'industry', 'association', 'professional'],
      contact_name: 'Sal',
      contact_email: 'sally@cwsa.com.au'
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error adding CWSA:', insertError);
    process.exit(1);
  }

  console.log('CWSA client added successfully!');
  console.log(newClient);

  // Update Washco Express contact info
  console.log('\nUpdating Washco Express contact info...');

  const { error: updateError } = await supabase
    .from('clients')
    .update({
      contact_name: 'Sal',
      contact_email: 'sally@cwsa.com.au'
    })
    .eq('name', 'Washco Express');

  if (updateError) {
    console.error('Error updating Washco Express:', updateError);
  } else {
    console.log('Washco Express contact info updated!');
  }

  // Verify both clients share PIN 4729
  console.log('\nClients with PIN 4729:');
  const { data: sharedPinClients } = await supabase
    .from('clients')
    .select('name, pin, contact_name, contact_email')
    .eq('pin', '4729');

  console.table(sharedPinClients);
}

main().catch(console.error);
