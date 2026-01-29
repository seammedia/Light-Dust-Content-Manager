#!/usr/bin/env node
/**
 * Add CWSA February posts
 *
 * Usage:
 *   VITE_SUPABASE_URL="..." VITE_SUPABASE_ANON_KEY="..." node scripts/add-cwsa-posts.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const posts = [
  {
    date: '2025-02-02',
    caption: `Looking to buy or sell a car wash? We're here to help.

As Australia's leading specialists, we combine smart strategy, expert advice, and nationwide reach to deliver the outcome you're working towards.`,
    hashtags: ['CWSA', 'CarWashSales', 'BusinessAdvisory', 'CommercialSales', 'AustraliaWide']
  },
  {
    date: '2025-02-04',
    caption: `Selling a car wash? The sales method you choose can shape your outcome.

📊 Read more:
https://cwsa.com.au/demystifying-sales-methods-understanding-expressions-of-interest/`,
    hashtags: ['CWSA', 'SmartSelling', 'SalesStrategy']
  },
  {
    date: '2025-02-06',
    caption: `CWSA aligns your professional goals with the right partner to achieve the best outcome.

We achieve this by:
• Assisting you in setting optimal rent levels and lease terms to position your property competitively in the market.
• Delivering tailored solutions for developers with surplus land or to support planned and proposed developments.

Learn more about our leasing services.`,
    hashtags: ['CWSA', 'CarWashSales', 'Lease', 'SmartSelling', 'CommercialBusiness']
  },
  {
    date: '2025-02-09',
    caption: `What are buyers looking for in a car wash? These are the factors that matter most:
📊 Reliable financials
📍 Access, visibility, and traffic flow
🔧 Quality and condition of equipment
📍 Local competition
📈 Future growth potential

If you are considering a sale, we can help present your business at its best and connect you with qualified buyers.`,
    hashtags: ['CWSA', 'SmartSelling', 'CarWashExperts', 'BusinessSupport', 'InvestWithConfidence']
  },
  {
    date: '2025-02-11',
    caption: `Are you licensed to sell real estate in my state?

The short answer is yes.

We are licensed to facilitate the buying and selling of real estate and businesses across every state and territory in Australia, maintaining our licences through ongoing reaccreditation.`,
    hashtags: ['CWSA', 'SellerTips', 'CarWashSales', 'BusinessValue', 'SmartSelling', 'RealEstate']
  },
  {
    date: '2025-02-13',
    caption: `Thank you to Dallas and Abbey for the opportunity to work together and for the fantastic feedback.`,
    hashtags: ['CWSA', 'SmartSelling', 'CarWashExperts', 'BusinessSupport', 'InvestWithConfidence', 'Feedback']
  }
];

async function main() {
  console.log('Adding CWSA February posts...\n');

  // Get CWSA client ID
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, name')
    .eq('name', 'CWSA')
    .single();

  if (clientError || !client) {
    console.error('CWSA client not found. Please add the client first.');
    process.exit(1);
  }

  console.log(`Found client: ${client.name} (${client.id})\n`);

  let created = 0;
  for (const post of posts) {
    const postId = `cwsa-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    const { error } = await supabase.from('posts').insert({
      id: postId,
      client_id: client.id,
      title: 'CWSA Post',
      date: post.date,
      status: 'For Approval',
      image_description: '',
      image_url: '',
      generated_caption: post.caption,
      generated_hashtags: post.hashtags,
      notes: ''
    });

    if (error) {
      console.error(`Failed to create post for ${post.date}: ${error.message}`);
    } else {
      console.log(`✓ Created post for ${post.date}`);
      created++;
    }

    // Small delay between inserts
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\nDone! Created ${created}/${posts.length} posts.`);
}

main().catch(console.error);
