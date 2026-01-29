#!/usr/bin/env node
/**
 * Add remaining CWSA February posts
 *
 * Usage:
 *   VITE_SUPABASE_URL="..." VITE_SUPABASE_ANON_KEY="..." node scripts/add-cwsa-feb-remaining.mjs
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
    date: '2026-02-16',
    caption: `Thinking about selling your car wash? Here's what to expect.

The sales process typically takes 6-12 months from initial consultation to settlement. We guide you through every step:

📋 Strategy & preparation
📊 Market assessment & pricing
🎯 Buyer qualification
📝 Negotiation & contracts
✅ Settlement support

Read our complete guide on our website.

#CWSA #CarWashSales #SellerTips #BusinessValue #SmartSelling`,
    hashtags: ['CWSA', 'CarWashSales', 'SellerTips', 'BusinessValue', 'SmartSelling']
  },
  {
    date: '2026-02-18',
    caption: `Your car wash equipment is one of your biggest assets.

Understanding equipment lifecycles helps you:
• Plan maintenance schedules
• Budget for replacements
• Maximise resale value
• Attract quality buyers

We've seen firsthand how well-maintained equipment impacts sale outcomes.

#CWSA #CarWashExperts #BusinessValue #EquipmentMaintenance #SmartSelling`,
    hashtags: ['CWSA', 'CarWashExperts', 'BusinessValue', 'EquipmentMaintenance', 'SmartSelling']
  },
  {
    date: '2026-02-20',
    caption: `Site selection can make or break a car wash investment.

Key factors we assess:
📍 Traffic flow and visibility
🚗 Access points and parking
👥 Demographics and competition
📈 Growth potential
💰 Financial viability

Our advisory team provides comprehensive site feasibility studies.

#CWSA #CarWashExperts #SiteSelection #BusinessAdvisory #InvestWithConfidence`,
    hashtags: ['CWSA', 'CarWashExperts', 'SiteSelection', 'BusinessAdvisory', 'InvestWithConfidence']
  },
  {
    date: '2026-02-23',
    caption: `Considering entering the car wash industry?

With 250+ transactions completed nationally, we've helped first-time buyers and experienced investors alike find the right opportunity.

Our team combines:
🏢 Property and development expertise
🚿 Hands-on car wash operator experience
🤝 Extensive industry networks

Let's discuss your goals.

#CWSA #CarWashSales #BusinessSupport #InvestWithConfidence #AustraliaWide`,
    hashtags: ['CWSA', 'CarWashSales', 'BusinessSupport', 'InvestWithConfidence', 'AustraliaWide']
  },
  {
    date: '2026-02-25',
    caption: `Need finance for your car wash purchase or upgrade?

We partner with specialist lenders to offer tailored solutions:
• Land acquisition
• Site purchases
• Equipment upgrades
• Refinancing

Our finance team handles the paperwork and negotiates competitive terms on your behalf.

#CWSA #CarWashExperts #BusinessFinance #AssetFinance #SmartSelling`,
    hashtags: ['CWSA', 'CarWashExperts', 'BusinessFinance', 'AssetFinance', 'SmartSelling']
  },
  {
    date: '2026-02-27',
    caption: `What sets CWSA apart?

We're not just agents. We're industry specialists with:
✅ 28 years combined experience
✅ 250+ car washes sold
✅ Hands-on operator knowledge
✅ National reach with local expertise

We understand your business because we've been in your shoes.

#CWSA #CarWashSales #CarWashExperts #AustraliaWide #BusinessSupport`,
    hashtags: ['CWSA', 'CarWashSales', 'CarWashExperts', 'AustraliaWide', 'BusinessSupport']
  }
];

async function main() {
  console.log('Adding remaining CWSA February posts...\n');

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

    // Extract caption without hashtags for generated_caption
    const captionLines = post.caption.split('\n');
    const captionWithoutHashtags = captionLines
      .filter(line => !line.startsWith('#'))
      .join('\n')
      .trim();

    const { error } = await supabase.from('posts').insert({
      id: postId,
      client_id: client.id,
      title: 'CWSA Post',
      date: post.date,
      status: 'For Approval',
      image_description: '',
      image_url: '',
      generated_caption: captionWithoutHashtags,
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
