// Script to add Pace Electrical posts for February 2026
// Run with: node scripts/add-pace-posts.mjs

import { createClient } from '@supabase/supabase-js';

// You can set these as environment variables or paste them here temporarily
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_KEY === 'YOUR_SUPABASE_ANON_KEY') {
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
  console.log('\nExample:');
  console.log('VITE_SUPABASE_URL=https://xxx.supabase.co VITE_SUPABASE_ANON_KEY=xxx node scripts/add-pace-posts.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function addPosts() {
  // Get Pace Electrical client ID
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('name', 'Pace Electrical')
    .single();

  if (clientError || !client) {
    console.error('Could not find Pace Electrical client:', clientError?.message);
    process.exit(1);
  }

  console.log('Found Pace Electrical client:', client.id);

  const posts = [
    {
      id: `pace-post-${Date.now()}-1`,
      client_id: client.id,
      title: 'Switchboard Upgrade',
      date: '2026-02-02',
      status: 'Draft',
      image_description: 'Modern electrical switchboard with safety switches',
      generated_caption: `An outdated switchboard isn't just inconvenient, it can be a serious safety hazard. Old fuses, missing safety switches and overloaded circuits put your home and family at risk.

Pace Electrical provides professional switchboard upgrades with over 25 years of industry experience. We ensure your electrical system meets current safety standards and can handle the demands of modern living.

📞 Phone 1300 070 569`,
      generated_hashtags: ['switchboardupgrade', 'electricalsafety', 'electrician', 'paceservices', 'licensedtrades'],
      notes: ''
    },
    {
      id: `pace-post-${Date.now()}-2`,
      client_id: client.id,
      title: 'Smoke Alarm Installation',
      date: '2026-02-05',
      status: 'Draft',
      image_description: 'Smoke alarm being installed on ceiling',
      generated_caption: `Smoke alarms save lives, but only when they're installed correctly and working properly. Australian regulations require interconnected smoke alarms in all homes, and staying compliant is essential.

Pace Electrical installs, tests and maintains smoke alarm systems to keep your family safe. With over 25 years of experience, we ensure your home meets all current safety requirements.`,
      generated_hashtags: ['smokealarms', 'homesafety', 'electrician', 'paceservices', 'licensedelectrician'],
      notes: ''
    },
    {
      id: `pace-post-${Date.now()}-3`,
      client_id: client.id,
      title: 'Ceiling Fan Installation',
      date: '2026-02-09',
      status: 'Draft',
      image_description: 'Modern ceiling fan installed in living room',
      generated_caption: `A ceiling fan is one of the most energy-efficient ways to keep your home comfortable year-round. But improper installation can lead to wobbling, noise, or worse, electrical hazards.

Pace Electrical handles ceiling fan installations with precision and care. From wiring to mounting, our licensed technicians ensure a safe, secure and balanced installation every time.

📞 Phone 1300 070 569`,
      generated_hashtags: ['ceilingfan', 'faninstallation', 'electrician', 'paceservices', 'licensedtrades'],
      notes: ''
    }
  ];

  const { data, error } = await supabase
    .from('posts')
    .insert(posts)
    .select();

  if (error) {
    console.error('Error adding posts:', error.message);
    process.exit(1);
  }

  console.log('\n✅ Successfully added 3 posts for Pace Electrical:');
  data.forEach(post => {
    console.log(`  - ${post.date}: ${post.title}`);
  });
}

addPosts();
