import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { normaliseZernioMetrics } from './clientAnalyticsReports.js';

type IntelligenceJob = {
  id: string;
  client_id: string;
  job_type: 'discover_ideas' | 'sync_analytics' | 'learn_weekly';
  attempt_count: number;
};

type IntelligenceProfile = {
  client_id: string;
  industry: string;
  audience: string | null;
  objectives: string[];
  source_queries: string[];
  trusted_domains: string[];
  excluded_topics: string[];
  compliance_notes: string | null;
  platforms: string[];
  timezone: string;
  discovery_frequency: 'daily' | 'weekly';
  daily_idea_limit: number;
  analytics_lookback_days: number;
  minimum_sample_size: number;
};

const ZERNIO_API_BASE = 'https://zernio.com/api/v1';

function responseText(payload: any): string {
  if (payload.output_text) return payload.output_text;
  return (payload.output || [])
    .flatMap((item: any) => item.content || [])
    .find((item: any) => item.type === 'output_text')?.text || '';
}

function melbourneDate(now: Date): { date: string; weekday: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return { date: `${value('year')}-${value('month')}-${value('day')}`, weekday: value('weekday') };
}

async function openAIJson(input: {
  developer: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
  webSearch?: boolean;
}) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key is not configured.');
  const body: Record<string, unknown> = {
    model: process.env.OPENAI_CONTENT_INTELLIGENCE_MODEL || 'gpt-5.6-luna',
    reasoning: { effort: 'low' },
    input: [
      { role: 'developer', content: input.developer },
      { role: 'user', content: input.user },
    ],
    text: { format: { type: 'json_schema', name: input.schemaName, strict: true, schema: input.schema } },
  };
  if (input.webSearch) body.tools = [{ type: 'web_search' }];
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`OpenAI request failed: ${response.status} ${await response.text()}`);
  const text = responseText(await response.json());
  if (!text) throw new Error('OpenAI returned no structured output.');
  return JSON.parse(text);
}

export async function enqueueContentIntelligence(db: SupabaseClient, now = new Date()) {
  const { date, weekday } = melbourneDate(now);
  const { data: profiles, error } = await db
    .from('content_intelligence_profiles')
    .select('client_id, discovery_frequency')
    .eq('enabled', true);
  if (error) throw error;
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const jobs = (profiles || []).flatMap(({ client_id, discovery_frequency }) => {
    const bucket = weekdays[parseInt(createHash('sha256').update(client_id).digest('hex').slice(0, 2), 16) % weekdays.length];
    const weeklyDue = weekday === bucket;
    const queued: Array<{ client_id: string; job_type: 'discover_ideas' | 'learn_weekly'; run_key: string }> = [];
    if (discovery_frequency === 'daily' || weeklyDue) queued.push({ client_id, job_type: 'discover_ideas', run_key: `${date}:${client_id}:discover` });
    if (weeklyDue) queued.push({ client_id, job_type: 'learn_weekly', run_key: `${date}:${client_id}:learn` });
    return queued;
  });
  if (!jobs.length) return 0;
  const { error: insertError } = await db
    .from('content_intelligence_jobs')
    .upsert(jobs, { onConflict: 'run_key', ignoreDuplicates: true });
  if (insertError) throw insertError;
  return jobs.length;
}

async function loadContext(db: SupabaseClient, job: IntelligenceJob) {
  const [{ data: profile, error: profileError }, { data: client, error: clientError }] = await Promise.all([
    db.from('content_intelligence_profiles').select('*').eq('client_id', job.client_id).single(),
    db.from('clients').select('id, name, brand_name, brand_mission, brand_tone, brand_keywords, business_description, late_profile_ids').eq('id', job.client_id).single(),
  ]);
  if (profileError || !profile) throw profileError || new Error('Content intelligence profile not found.');
  if (clientError || !client) throw clientError || new Error('Client not found.');
  return { profile: profile as IntelligenceProfile, client };
}

async function discoverIdeas(db: SupabaseClient, job: IntelligenceJob) {
  const { profile, client } = await loadContext(db, job);
  const result = await openAIJson({
    webSearch: true,
    schemaName: 'client_content_ideas',
    developer: `You are the research desk for an Australian social media agency. Find current, useful, source-backed content opportunities. Prefer primary and authoritative sources, never invent URLs, and reject weakly related trend bait. Respect regulated-industry limits. Return Australian spelling and never use em dashes.`,
    user: `Client: ${client.brand_name || client.name}\nIndustry: ${profile.industry}\nAudience: ${profile.audience || 'Not specified'}\nObjectives: ${profile.objectives.join(', ')}\nSearch themes: ${profile.source_queries.join(', ')}\nPreferred domains: ${profile.trusted_domains.join(', ') || 'Primary and authoritative industry sources'}\nExcluded topics: ${profile.excluded_topics.join(', ') || 'None'}\nCompliance: ${profile.compliance_notes || 'No additional rules'}\nPlatforms: ${profile.platforms.join(', ')}\nFind up to ${profile.daily_idea_limit} strong opportunities published or materially updated in the last 14 days. Each idea must have a working source URL and a distinct client-relevant angle.`,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        ideas: {
          type: 'array',
          maxItems: profile.daily_idea_limit,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              title: { type: 'string' }, angle: { type: 'string' }, rationale: { type: 'string' },
              suggested_format: { type: 'string' }, platform: { type: 'string' }, source_title: { type: 'string' },
              source_url: { type: 'string' }, source_published_at: { type: ['string', 'null'] }, source_summary: { type: 'string' },
              relevance_score: { type: 'number', minimum: 0, maximum: 100 }, timeliness_score: { type: 'number', minimum: 0, maximum: 100 },
              authority_score: { type: 'number', minimum: 0, maximum: 100 }, risk_notes: { type: 'string' },
            },
            required: ['title', 'angle', 'rationale', 'suggested_format', 'platform', 'source_title', 'source_url', 'source_published_at', 'source_summary', 'relevance_score', 'timeliness_score', 'authority_score', 'risk_notes'],
          },
        },
      },
      required: ['ideas'],
    },
  });
  const rows = (result.ideas || []).map((idea: any) => ({
    ...idea,
    client_id: job.client_id,
    job_id: job.id,
    source_published_at: idea.source_published_at || null,
    expires_at: new Date(Date.now() + 21 * 86400000).toISOString(),
  }));
  if (rows.length) {
    const { error } = await db.from('content_ideas').upsert(rows, { onConflict: 'client_id,source_url,angle', ignoreDuplicates: true });
    if (error) throw error;
  }
  return { ideasAdded: rows.length };
}

async function syncAnalytics(db: SupabaseClient, job: IntelligenceJob) {
  const apiKey = process.env.ZERNIO_API_KEY || process.env.VITE_LATE_API_KEY;
  if (!apiKey) throw new Error('Zernio analytics is not configured.');
  const { profile, client } = await loadContext(db, job);
  const since = new Date(Date.now() - profile.analytics_lookback_days * 86400000).toISOString().slice(0, 10);
  const { data: posts, error } = await db
    .from('posts')
    .select('id, late_post_id, date')
    .eq('client_id', job.client_id)
    .not('late_post_id', 'is', null)
    .gte('date', since)
    .order('date', { ascending: false })
    .limit(20);
  if (error) throw error;
  let snapshots = 0;
  for (const post of posts || []) {
    if (!post.late_post_id || post.late_post_id.startsWith('scheduling:')) continue;
    const response = await fetch(`${ZERNIO_API_BASE}/analytics/${encodeURIComponent(post.late_post_id)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) continue;
    const payload = await response.json();
    const platformRows = payload.platformAnalytics?.length
      ? payload.platformAnalytics
      : [{ platform: payload.platform || 'unknown', analytics: payload.analytics || {}, publishedAt: payload.publishedAt }];
    const rows = platformRows.map((entry: any) => {
      const analytics = entry.analytics || {};
      const metrics = normaliseZernioMetrics(analytics);
      return {
        client_id: job.client_id,
        post_id: post.id,
        late_post_id: post.late_post_id,
        platform: entry.platform || 'unknown',
        captured_on: new Date().toISOString().slice(0, 10),
        published_at: entry.publishedAt || payload.publishedAt || null,
        ...metrics,
        engagement_rate: analytics.engagementRate ?? analytics.engagement_rate ?? null,
        raw_metrics: analytics,
      };
    });
    if (rows.length) {
      const { error: upsertError } = await db.from('social_post_metric_snapshots').upsert(rows, { onConflict: 'post_id,platform,captured_on' });
      if (upsertError) throw upsertError;
      snapshots += rows.length;
    }
  }

  const bestTimes: any[] = [];
  for (const profileId of client.late_profile_ids || []) {
    const response = await fetch(`${ZERNIO_API_BASE}/analytics/best-time?profileId=${encodeURIComponent(profileId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (response.ok) bestTimes.push({ profileId, ...(await response.json()) });
  }
  if (bestTimes.length) await saveDeterministicLearning(db, job, 'posting_time', null, 'Connected platform best-time analysis is available.', 'Prefer the highest-engagement day and hour slots in the evidence when scheduling the next batch.', 0.8, snapshots, { bestTimes });
  return { snapshots, bestTimeProfiles: bestTimes.length };
}

async function saveDeterministicLearning(db: SupabaseClient, job: IntelligenceJob, learningType: string, platform: string | null, statement: string, recommendation: string, confidence: number, sampleSize: number, evidence: unknown) {
  const fingerprint = createHash('sha256').update(`${learningType}|${platform || ''}|${statement}`).digest('hex');
  const { error } = await db.from('content_learnings').upsert({
    client_id: job.client_id, job_id: job.id, fingerprint, learning_type: learningType, platform, statement, recommendation,
    confidence, sample_size: sampleSize, evidence, active: true, last_confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }, { onConflict: 'client_id,fingerprint' });
  if (error) throw error;
}

async function learnWeekly(db: SupabaseClient, job: IntelligenceJob) {
  const { profile, client } = await loadContext(db, job);
  const analyticsSync = await syncAnalytics(db, job);
  const since = new Date(Date.now() - profile.analytics_lookback_days * 86400000).toISOString();
  const { data, error } = await db
    .from('social_post_metric_snapshots')
    .select('*, posts(title, date, generated_caption, generated_hashtags, media_type, content_type, image_urls)')
    .eq('client_id', job.client_id)
    .gte('created_at', since)
    .order('captured_on', { ascending: false })
    .limit(250);
  if (error) throw error;
  const latest = new Map<string, any>();
  for (const row of data || []) {
    const key = `${row.post_id}:${row.platform}`;
    if (!latest.has(key)) latest.set(key, row);
  }
  const samples = [...latest.values()];
  if (samples.length < profile.minimum_sample_size) return { skipped: 'insufficient_sample', sampleSize: samples.length, analyticsSync };
  const result = await openAIJson({
    schemaName: 'content_performance_learnings',
    developer: 'You are a cautious social performance analyst. Separate correlation from causation. Produce only reusable findings supported by the supplied sample. Do not call a winner from one post. Prefer testable recommendations and Australian spelling. Never use em dashes.',
    user: `Client: ${client.brand_name || client.name}\nPlatforms: ${profile.platforms.join(', ')}\nMinimum sample: ${profile.minimum_sample_size}\nPost performance data:\n${JSON.stringify(samples)}`,
    schema: {
      type: 'object', additionalProperties: false,
      properties: {
        learnings: {
          type: 'array', maxItems: 8,
          items: {
            type: 'object', additionalProperties: false,
            properties: {
              learning_type: { type: 'string', enum: ['topic', 'format', 'hook', 'posting_time', 'platform', 'cadence', 'avoid'] },
              platform: { type: ['string', 'null'] }, statement: { type: 'string' }, recommendation: { type: 'string' },
              confidence: { type: 'number', minimum: 0, maximum: 1 }, sample_size: { type: 'integer', minimum: 1 }, evidence_post_ids: { type: 'array', items: { type: 'string' } },
            },
            required: ['learning_type', 'platform', 'statement', 'recommendation', 'confidence', 'sample_size', 'evidence_post_ids'],
          },
        },
      }, required: ['learnings'],
    },
  });
  for (const learning of result.learnings || []) {
    await saveDeterministicLearning(db, job, learning.learning_type, learning.platform, learning.statement, learning.recommendation, learning.confidence, learning.sample_size, { postIds: learning.evidence_post_ids, lookbackDays: profile.analytics_lookback_days });
  }
  return { learnings: result.learnings?.length || 0, sampleSize: samples.length, analyticsSync };
}

async function runJob(db: SupabaseClient, job: IntelligenceJob) {
  if (job.job_type === 'discover_ideas') return discoverIdeas(db, job);
  if (job.job_type === 'sync_analytics') return syncAnalytics(db, job);
  return learnWeekly(db, job);
}

export async function processContentIntelligence(db: SupabaseClient, maxJobs = 3, maxRuntimeMs = 45000) {
  const started = Date.now();
  const { data: jobs, error } = await db.from('content_intelligence_jobs').select('id, client_id, job_type, attempt_count').eq('status', 'queued').lte('next_attempt_at', new Date().toISOString()).order('created_at').limit(maxJobs);
  if (error) throw error;
  const lockedJobs: IntelligenceJob[] = [];
  for (const job of (jobs || []) as IntelligenceJob[]) {
    const lock = await db.from('content_intelligence_jobs').update({ status: 'processing', locked_at: new Date().toISOString(), attempt_count: job.attempt_count + 1, updated_at: new Date().toISOString() }).eq('id', job.id).eq('status', 'queued').select('id').maybeSingle();
    if (lock.data) lockedJobs.push(job);
  }
  return Promise.all(lockedJobs.map(async (job) => {
    if (Date.now() - started > maxRuntimeMs) {
      await db.from('content_intelligence_jobs').update({ status: 'queued', locked_at: null, updated_at: new Date().toISOString() }).eq('id', job.id);
      return { id: job.id, status: 'queued' };
    }
    try {
      const result = await runJob(db, job);
      await db.from('content_intelligence_jobs').update({ status: 'completed', result, error: null, updated_at: new Date().toISOString() }).eq('id', job.id);
      return { id: job.id, status: 'completed' };
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unknown content intelligence error';
      const retry = job.attempt_count + 1 < 3;
      await db.from('content_intelligence_jobs').update({ status: retry ? 'queued' : 'failed', next_attempt_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), error: message.slice(0, 2000), updated_at: new Date().toISOString() }).eq('id', job.id);
      return { id: job.id, status: retry ? 'queued' : 'failed' };
    }
  }));
}
