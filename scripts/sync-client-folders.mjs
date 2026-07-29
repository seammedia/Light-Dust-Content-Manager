#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

function loadEnv() {
  try {
    for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator < 1) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Environment variables may already be supplied by the caller.
  }
}

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'new-client';
}

function folderKey(value) {
  return slugify(value).replace(/-/g, '');
}

function initialReadme(client) {
  return `# ${client.brand_name || client.name}

## Client overview

- **Platform client ID:** ${client.id}
- **Contact:** ${client.contact_name || 'Awaiting intake'}
- **Email:** ${client.contact_email || 'Awaiting intake'}
- **Package:** ${client.plan_name || 'Not recorded'} (${client.billing_cycle || 'billing cycle not recorded'})
- **Onboarding status:** ${client.provisioning_status || 'Not recorded'}
- **Zernio profile ID:** ${client.zernio_profile_id || 'Pending automatic provisioning'}
- **Client since:** ${new Date(client.created_at).toLocaleDateString('en-AU')}

## Folder structure

- \`assets/incoming/\` - original files supplied by the client
- \`assets/approved/\` - approved brand assets and final references
- Add campaign notes, content plans and working documents alongside this file.

## Onboarding notes

This workspace was created automatically from the Content Manager client record. Update this file after the client completes their brand intake.
`;
}

loadEnv();

const root = readArgument('--root') || '/Volumes/PortableSSD/Clients';
const email = readArgument('--email').trim().toLowerCase();
const since = readArgument('--since').trim();
const dryRun = process.argv.includes('--dry-run');

if (!email && !since) {
  console.error('Use --email customer@example.com or --since YYYY-MM-DD.');
  process.exit(1);
}
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('Supabase environment variables are unavailable.');
  process.exit(1);
}
if (!existsSync(root)) {
  console.error(`Client workspace root is unavailable: ${root}`);
  process.exit(1);
}

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
let query = db
  .from('clients')
  .select('id,name,brand_name,contact_name,contact_email,plan_name,billing_cycle,provisioning_status,subscription_status,created_at,zernio_profile_id')
  .not('stripe_subscription_id', 'is', null)
  .in('subscription_status', ['active', 'trialing', 'past_due'])
  .order('created_at', { ascending: true });
if (email) query = query.ilike('contact_email', email);
if (since) query = query.gte('created_at', `${since}T00:00:00`);

const { data: clients, error } = await query;
if (error) throw error;

const folderEntries = readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory());
const foldersByKey = new Map(folderEntries.map((entry) => [folderKey(entry.name), entry.name]));
const foldersByClientId = new Map();
for (const entry of folderEntries) {
  const folderPath = join(root, entry.name);
  const readmePath = [join(folderPath, 'README.md'), join(folderPath, 'readme.md')].find(existsSync);
  if (!readmePath) continue;
  const clientId = readFileSync(readmePath, 'utf8').match(/\*\*Platform client ID:\*\*\s+([0-9a-f-]{36})/i)?.[1];
  if (clientId) foldersByClientId.set(clientId, entry.name);
}
const results = [];
const missingZernioProfiles = [];

for (const client of clients || []) {
  if (!client.zernio_profile_id) missingZernioProfiles.push({ id: client.id, client: client.brand_name || client.name });
  const displayName = client.brand_name || client.name;
  const matchingFolder = foldersByClientId.get(client.id)
    || foldersByKey.get(folderKey(displayName))
    || foldersByKey.get(folderKey(client.name));
  const folderName = matchingFolder || slugify(displayName);
  const folderPath = join(root, folderName);
  const readmePath = join(folderPath, 'README.md');
  const actions = [];

  if (!matchingFolder) actions.push(`create ${folderPath}`);
  if (!existsSync(readmePath) && !existsSync(join(folderPath, 'readme.md'))) actions.push(`create ${readmePath}`);
  for (const subfolder of ['assets/incoming', 'assets/approved']) {
    if (!existsSync(join(folderPath, subfolder))) actions.push(`create ${join(folderPath, subfolder)}`);
  }

  if (!dryRun) {
    mkdirSync(join(folderPath, 'assets', 'incoming'), { recursive: true });
    mkdirSync(join(folderPath, 'assets', 'approved'), { recursive: true });
    if (!existsSync(readmePath) && !existsSync(join(folderPath, 'readme.md'))) {
      writeFileSync(readmePath, initialReadme(client), { flag: 'wx' });
    }
  }

  foldersByKey.set(folderKey(displayName), folderName);
  foldersByClientId.set(client.id, folderName);
  results.push({ client: displayName, folder: folderPath, actions });
}

console.log(JSON.stringify({ dryRun, matchedClients: results.length, missingZernioProfiles, results }, null, 2));
if (missingZernioProfiles.length) process.exitCode = 2;
