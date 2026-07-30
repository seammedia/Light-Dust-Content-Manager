import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import sharp from 'sharp';
import { cleanText, portalDb } from './portal.js';

const LOST_STAGES = new Set(['not_interested', 'no_response', 'not_qualified']);
const VALID_STAGES = new Set([
  'new', 'warm', 'contacted_1', 'contacted_2', 'called', 'call_booked',
  'interested', 'proposal_sent', 'on_hold', 'onboarding_sent', 'converted',
  'not_interested', 'no_response', 'not_qualified',
]);
const VALID_SOURCES = new Set(['meta_ads', 'google_ads', 'referral', 'website', 'instagram', 'facebook_organic', 'linkedin', 'email', 'existing_client', 'prospecting', 'networking', 'manual', 'other']);
const VALID_OUTREACH_STATUSES = new Set(['ready', 'sent', 'archived']);

function nullableText(value: unknown, max: number) {
  const cleaned = cleanText(value, max);
  return cleaned || null;
}

function nullableNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function nullableDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function dateOnly(value: unknown) {
  const cleaned = cleanText(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(cleaned) ? cleaned : null;
}

function safeStorageSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'instagram-lead';
}

function stripMessageDashes(value: string) {
  return value.replace(/[—–]/g, ' - ').replace(/[ \t]+\n/g, '\n').trim();
}

async function generateOutreachCopy(input: Record<string, unknown>) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_NOT_CONFIGURED');

  const contactName = cleanText(input.contact_name, 120);
  const businessName = cleanText(input.business_name, 200);
  const industry = cleanText(input.industry, 160);
  const location = cleanText(input.location, 160);
  const profileNotes = cleanText(input.profile_notes, 3000);
  const offerFocus = cleanText(input.offer_focus, 300) || 'social media content and strategy';
  const graphicDirection = cleanText(input.graphic_direction, 1000);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.6-flash',
    systemInstruction: `You write thoughtful Instagram outreach for Heath at Seam Media, an Australian social media agency.

Rules:
- Use Australian spelling and a friendly-professional, natural tone.
- Never use em dashes or en dashes.
- The message is a first DM to a business that has recently followed Seam Media.
- Mention one specific, credible detail from the supplied profile notes.
- Explain that Heath made a quick example Reel cover for their business.
- Do not pretend to have researched anything beyond the supplied details.
- Keep the message between 65 and 105 words in 2 or 3 short paragraphs.
- Use the contact's first name in a casual greeting when provided.
- End with one low-pressure question.
- Do not use hashtags, Markdown, a formal sign-off or more than one emoji.`,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          message: { type: SchemaType.STRING },
          graphic_headline: { type: SchemaType.STRING },
          graphic_prompt: { type: SchemaType.STRING },
        },
        required: ['message', 'graphic_headline', 'graphic_prompt'],
      },
    },
  });

  const result = await model.generateContent(`Create an outreach message and vertical Instagram Reel cover concept using only these details:

Contact: ${contactName || 'Not provided'}
Business: ${businessName}
Industry: ${industry || 'Not provided'}
Location: ${location || 'Not provided'}
Profile notes: ${profileNotes}
Seam Media offer: ${offerFocus}
Requested graphic direction: ${graphicDirection || 'Choose a polished concept that suits the business'}

For graphic_headline, write one bold hook of 3 to 7 words. It must be grounded in the supplied notes, mobile-readable and suitable for oversized uppercase lettering. Do not include the business name unless it is essential to the hook.

For graphic_prompt, describe only the topic-relevant subject, scene and visual story for a premium vertical Reel cover. Do not request extra visible copy. Do not invent a person, logo, pricing, claim, contact detail or offer. The cover must communicate its subject within one second and look like a real high-performing social thumbnail, not an advertisement for Seam Media.`);
  const parsed = JSON.parse(result.response.text()) as {
    message: string;
    graphic_headline: string;
    graphic_prompt: string;
  };

  return {
    message: stripMessageDashes(parsed.message),
    graphic_headline: stripMessageDashes(parsed.graphic_headline).slice(0, 300),
    graphic_prompt: stripMessageDashes(parsed.graphic_prompt).slice(0, 4000),
  };
}

async function generateAndStoreOutreachGraphic(
  db: ReturnType<typeof portalDb>,
  username: string,
  input: {
    businessName: string;
    headline: string;
    industry: string;
    location: string;
    visualDirection: string;
  },
) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_NOT_CONFIGURED');

  const headline = input.headline.toUpperCase();
  const productionPrompt = `Use case: ads-marketing
Asset type: vertical Instagram Reel cover, 9:16
Primary request: Create one bold, credible Reel cover concept for ${input.businessName}.
Input images: No identity or style reference supplied. Do not invent a recognisable business owner or copy another creator's branding.
Subject: ${input.industry || 'The business service described by the visual direction'} shown through a strong topic-relevant scene or object.
Scene/backdrop: ${input.visualDirection}
Composition/framing: One dominant subject or visual story, strong depth, generous separation for the headline, and all important content kept inside the central crop-safe area. Keep text clear of faces, eyes and mouths.
Style: bold professional social-media thumbnail, energetic and credible, not a quiet static brand tile.
Colour palette: high contrast and suited to the business category, with one bright accent colour on a key headline word.
Text (verbatim): "${headline}"
Typography: oversized condensed uppercase lettering, very high contrast, dark stroke or dimensional shadow, readable instantly at phone thumbnail size.
Localisation: Australian spelling, architecture, currency, terminology and visual cues${input.location ? ` appropriate to ${input.location}` : ''}.
Constraints: exact headline spelling; headline is the only visible text; final composition must survive Reel UI and profile-grid crops; no unsupported claims.
Avoid: business-name lockup, extra text, duplicate words, invented logo, watermark, Instagram interface, captions, clutter, tiny type, foreign-market cues, distorted people or hands.`;

  const generateCover = async (prompt: string) => {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-2',
        prompt,
        size: '1024x1536',
        quality: 'medium',
        n: 1,
      }),
    });
    if (!response.ok) {
      const details = await response.text();
      console.error('Outreach Reel cover generation failed:', response.status, details.slice(0, 1000));
      throw new Error('GRAPHIC_GENERATION_FAILED');
    }

    const result = await response.json() as { data?: Array<{ b64_json?: string }> };
    const base64 = result.data?.[0]?.b64_json;
    if (!base64) throw new Error('GRAPHIC_GENERATION_FAILED');

    return sharp(Buffer.from(base64, 'base64'))
      .resize(1080, 1920, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer();
  };

  const inspectCover = async (image: Buffer) => {
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!geminiApiKey) throw new Error('GEMINI_NOT_CONFIGURED');
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            passed: { type: SchemaType.BOOLEAN },
            text_accurate: { type: SchemaType.BOOLEAN },
            issues: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          },
          required: ['passed', 'text_accurate', 'issues'],
        },
      },
    });
    const result = await model.generateContent([
      { inlineData: { data: image.toString('base64'), mimeType: 'image/png' } },
      { text: `Quality-check this vertical Instagram Reel cover.

Expected headline, verbatim: "${headline}"

Pass only when:
- the expected headline is exact, complete and readable at phone thumbnail size
- the cover communicates the business topic within one second
- all important content is inside the central crop-safe area
- text does not cover a person's eyes or mouth
- there is no extra text, duplicate wording, invented logo, watermark or platform interface
- the layout is bold, credible and high contrast rather than cluttered or gimmicky
- visual and spelling cues suit an Australian business

Return concise, actionable issues for a targeted regeneration.` },
    ]);
    return JSON.parse(result.response.text()) as {
      passed: boolean;
      text_accurate: boolean;
      issues: string[];
    };
  };

  let image = await generateCover(productionPrompt);
  let inspection = await inspectCover(image);
  if (!inspection.passed) {
    const correction = inspection.issues.length
      ? inspection.issues.join('; ')
      : 'Improve headline accuracy, mobile legibility and central crop safety.';
    image = await generateCover(`${productionPrompt}

TARGETED CORRECTION: ${correction}
Keep the exact headline "${headline}" and change only what is needed to fix these issues.`);
    inspection = await inspectCover(image);
  }
  if (!inspection.passed || !inspection.text_accurate) {
    console.error('Outreach Reel cover failed quality check:', inspection.issues);
    throw new Error('REEL_COVER_QA_FAILED');
  }

  const storagePath = `outreach/instagram/${safeStorageSegment(username)}/${Date.now()}-${randomUUID()}.png`;
  const { error } = await db.storage.from('post-images').upload(storagePath, image, {
    cacheControl: '31536000',
    contentType: 'image/png',
    upsert: false,
  });
  if (error) {
    console.error('Outreach graphic upload failed:', error);
    throw new Error('GRAPHIC_UPLOAD_FAILED');
  }
  return db.storage.from('post-images').getPublicUrl(storagePath).data.publicUrl;
}

async function authenticateAgency(req: VercelRequest) {
  const db = portalDb();
  const pinHeader = Array.isArray(req.headers['x-portal-pin']) ? req.headers['x-portal-pin'][0] : req.headers['x-portal-pin'];
  const suppliedPin = cleanText(req.body?.pin || pinHeader, 30);
  const { data: master, error } = await db.from('clients').select('pin').eq('name', 'Seam Media').maybeSingle();
  if (error || !suppliedPin || suppliedPin !== master?.pin) throw new Error('UNAUTHORISED');
  return db;
}

function leadPayload(input: Record<string, unknown>, creating = false) {
  const payload: Record<string, unknown> = {};
  if (creating || input.name !== undefined) payload.name = cleanText(input.name, 160);
  if (creating || input.company !== undefined) payload.company = cleanText(input.company, 200);
  if (input.email !== undefined) payload.email = nullableText(input.email, 320)?.toLowerCase();
  if (input.phone !== undefined) payload.phone = nullableText(input.phone, 80);
  if (input.stage !== undefined && VALID_STAGES.has(String(input.stage))) {
    payload.stage = input.stage;
    payload.archived = LOST_STAGES.has(String(input.stage));
    if (input.stage === 'converted') payload.converted_at = nullableDate(input.converted_at) || new Date().toISOString();
  }
  if (input.source !== undefined) payload.source = VALID_SOURCES.has(String(input.source)) ? input.source : 'other';
  if (input.conversion_source !== undefined) {
    payload.conversion_source = input.conversion_source && VALID_SOURCES.has(String(input.conversion_source))
      ? input.conversion_source
      : null;
  }
  if (input.source_platform !== undefined) payload.source_platform = nullableText(input.source_platform, 100);
  if (input.source_campaign !== undefined) payload.source_campaign = nullableText(input.source_campaign, 300);
  if (input.owner !== undefined) payload.owner = cleanText(input.owner, 120) || 'Heath';
  if (input.conversion_probability !== undefined) payload.conversion_probability = Math.min(100, Math.max(0, Number(input.conversion_probability) || 0));
  if (input.monthly_value !== undefined) payload.monthly_value = nullableNumber(input.monthly_value);
  if (input.lifetime_value !== undefined) payload.lifetime_value = nullableNumber(input.lifetime_value);
  if (input.churn_reason !== undefined) payload.churn_reason = nullableText(input.churn_reason, 1000);
  if (input.notes !== undefined) payload.notes = nullableText(input.notes, 10_000);
  if (input.next_action !== undefined) payload.next_action = nullableText(input.next_action, 500);
  if (input.last_contacted !== undefined) payload.last_contacted = nullableDate(input.last_contacted);
  if (input.follow_up_at !== undefined) payload.follow_up_at = nullableDate(input.follow_up_at);
  if (input.sign_on_date !== undefined) payload.sign_on_date = dateOnly(input.sign_on_date);
  if (input.exit_date !== undefined) payload.exit_date = dateOnly(input.exit_date);
  if (input.archived !== undefined && input.stage === undefined) payload.archived = Boolean(input.archived);
  payload.updated_at = new Date().toISOString();
  return payload;
}

export async function agencyLeadsHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = await authenticateAgency(req);

    if (req.method === 'GET') {
      const [
        { data: leads, error: leadsError },
        { data: periods, error: periodsError },
        { data: outreachDrafts, error: outreachError },
      ] = await Promise.all([
        db.from('agency_leads').select('*, client:clients(id, name, provisioning_status, subscription_status, offboarded_at, offboarding_reason)').order('created_at', { ascending: false }).limit(3000),
        db.from('agency_marketing_periods').select('*').order('period_end', { ascending: false }).limit(120),
        db.from('agency_outreach_drafts').select('*').order('created_at', { ascending: false }).limit(300),
      ]);
      if (leadsError) throw leadsError;
      if (periodsError) throw periodsError;
      if (outreachError) throw outreachError;
      return res.status(200).json({ leads: leads || [], periods: periods || [], outreachDrafts: outreachDrafts || [] });
    }

    const action = cleanText(req.body?.action, 50);

    if (action === 'createLead') {
      const input = (req.body?.lead || {}) as Record<string, unknown>;
      const payload = leadPayload(input, true);
      if (!payload.name) return res.status(400).json({ error: 'A lead name is required.' });
      if (payload.stage === 'converted' && !payload.conversion_source) payload.conversion_source = payload.source || 'other';
      const { data: lead, error } = await db.from('agency_leads').insert(payload).select('*').single();
      if (error) throw error;
      await db.from('agency_lead_activities').insert({ lead_id: lead.id, activity_type: 'created', description: 'Lead added to the agency pipeline.' });
      return res.status(200).json({ lead });
    }

    if (action === 'updateLead') {
      const input = (req.body?.lead || {}) as Record<string, unknown>;
      const id = cleanText(input.id, 80);
      if (!id) return res.status(400).json({ error: 'Lead is required.' });
      const { data: existing, error: existingError } = await db.from('agency_leads').select('id, client_id, stage, source, conversion_source, last_contacted, monthly_value, lifetime_value').eq('id', id).maybeSingle();
      if (existingError) throw existingError;
      if (!existing) return res.status(404).json({ error: 'That lead could not be found.' });
      const payload = leadPayload(input);
      const requestedClientStatus = cleanText(input.client_status, 20);
      if (existing.client_id && ['active', 'paused', 'cancelled'].includes(requestedClientStatus)) {
        if (requestedClientStatus === 'cancelled') {
          payload.exit_date = dateOnly(input.exit_date) || new Date().toISOString().slice(0, 10);
          payload.churn_reason = nullableText(input.churn_reason, 1000) || 'Client offboarded';
        } else if (requestedClientStatus === 'active') {
          payload.exit_date = null;
          payload.churn_reason = null;
        }
      }
      if (payload.stage === 'converted' && !payload.conversion_source) {
        payload.conversion_source = existing.conversion_source || payload.source || existing.source || 'other';
      }
      const { data: lead, error } = await db.from('agency_leads').update(payload).eq('id', id).select('*').single();
      if (error) throw error;

      if (existing.client_id && ['active', 'paused', 'cancelled'].includes(requestedClientStatus)) {
        const clientUpdate: Record<string, unknown> = {
          provisioning_status: requestedClientStatus,
          updated_at: new Date().toISOString(),
        };
        if (requestedClientStatus === 'active') {
          clientUpdate.offboarded_at = null;
          clientUpdate.offboarding_reason = null;
        } else {
          clientUpdate.auto_post_enabled = false;
          clientUpdate.offboarded_at = requestedClientStatus === 'cancelled'
            ? new Date(`${String(payload.exit_date)}T00:00:00.000Z`).toISOString()
            : null;
          clientUpdate.offboarding_reason = payload.churn_reason || (requestedClientStatus === 'paused' ? 'Client paused' : 'Client offboarded');
        }
        const { error: clientUpdateError } = await db.from('clients').update(clientUpdate).eq('id', existing.client_id);
        if (clientUpdateError) throw clientUpdateError;
      }

      const activities: Array<Record<string, unknown>> = [];
      if (payload.stage && payload.stage !== existing.stage) activities.push({ lead_id: id, activity_type: 'stage_change', description: `Stage changed from ${existing.stage} to ${payload.stage}.`, metadata: { from: existing.stage, to: payload.stage } });
      if (payload.last_contacted && payload.last_contacted !== existing.last_contacted) activities.push({ lead_id: id, activity_type: 'contact', description: 'Lead marked as contacted.', metadata: { contacted_at: payload.last_contacted } });
      if ((payload.monthly_value !== undefined && payload.monthly_value !== existing.monthly_value) || (payload.lifetime_value !== undefined && payload.lifetime_value !== existing.lifetime_value)) activities.push({ lead_id: id, activity_type: 'value_change', description: 'Lead value updated.' });
      if (payload.conversion_source !== undefined && payload.conversion_source !== existing.conversion_source) activities.push({ lead_id: id, activity_type: 'note', description: 'Conversion attribution source updated.', metadata: { from: existing.conversion_source, to: payload.conversion_source } });
      if (existing.client_id && ['active', 'paused', 'cancelled'].includes(requestedClientStatus)) activities.push({ lead_id: id, activity_type: 'note', description: `Client lifecycle status set to ${requestedClientStatus}.`, metadata: { client_status: requestedClientStatus } });
      if (activities.length) await db.from('agency_lead_activities').insert(activities);
      return res.status(200).json({ lead });
    }

    if (action === 'generateOutreachDraft') {
      const input = (req.body?.draft || {}) as Record<string, unknown>;
      const instagramUsername = cleanText(input.instagram_username, 100).replace(/^@+/, '').replace(/[^a-zA-Z0-9._]/g, '');
      const businessName = cleanText(input.business_name, 200);
      const profileNotes = cleanText(input.profile_notes, 3000);
      if (!instagramUsername || !businessName || !profileNotes) {
        return res.status(400).json({ error: 'Instagram username, business name and profile notes are required.' });
      }

      const generated = await generateOutreachCopy({ ...input, business_name: businessName, profile_notes: profileNotes });
      const graphicUrl = await generateAndStoreOutreachGraphic(db, instagramUsername, {
        businessName,
        headline: generated.graphic_headline,
        industry: cleanText(input.industry, 160),
        location: cleanText(input.location, 160),
        visualDirection: generated.graphic_prompt,
      });
      const payload = {
        instagram_username: instagramUsername,
        contact_name: nullableText(input.contact_name, 120),
        business_name: businessName,
        industry: nullableText(input.industry, 160),
        location: nullableText(input.location, 160),
        profile_notes: profileNotes,
        offer_focus: nullableText(input.offer_focus, 300),
        graphic_direction: nullableText(input.graphic_direction, 1000),
        graphic_headline: generated.graphic_headline,
        graphic_prompt: generated.graphic_prompt,
        graphic_url: graphicUrl,
        message: generated.message,
        status: 'ready',
      };
      const { data: draft, error } = await db.from('agency_outreach_drafts').insert(payload).select('*').single();
      if (error) throw error;
      return res.status(200).json({ draft });
    }

    if (action === 'regenerateOutreachGraphic') {
      const id = cleanText(req.body?.id, 80);
      if (!id) return res.status(400).json({ error: 'An outreach draft is required.' });
      const { data: existing, error: existingError } = await db.from('agency_outreach_drafts').select('*').eq('id', id).maybeSingle();
      if (existingError) throw existingError;
      if (!existing) return res.status(404).json({ error: 'That outreach draft could not be found.' });

      const generated = await generateOutreachCopy(existing as Record<string, unknown>);
      const graphicUrl = await generateAndStoreOutreachGraphic(db, existing.instagram_username, {
        businessName: existing.business_name,
        headline: generated.graphic_headline,
        industry: existing.industry || '',
        location: existing.location || '',
        visualDirection: generated.graphic_prompt,
      });
      const { data: draft, error } = await db.from('agency_outreach_drafts').update({
        graphic_headline: generated.graphic_headline,
        graphic_prompt: generated.graphic_prompt,
        graphic_url: graphicUrl,
        updated_at: new Date().toISOString(),
      }).eq('id', id).select('*').single();
      if (error) throw error;
      return res.status(200).json({ draft });
    }

    if (action === 'updateOutreachDraft') {
      const input = (req.body?.draft || {}) as Record<string, unknown>;
      const id = cleanText(input.id, 80);
      if (!id) return res.status(400).json({ error: 'An outreach draft is required.' });
      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (input.message !== undefined) payload.message = stripMessageDashes(cleanText(input.message, 5000));
      if (input.status !== undefined && VALID_OUTREACH_STATUSES.has(String(input.status))) payload.status = input.status;
      const { data: draft, error } = await db.from('agency_outreach_drafts').update(payload).eq('id', id).select('*').single();
      if (error) throw error;
      return res.status(200).json({ draft });
    }

    if (action === 'markOutreachSent') {
      const id = cleanText(req.body?.id, 80);
      if (!id) return res.status(400).json({ error: 'An outreach draft is required.' });
      const { data: draft, error: draftError } = await db.from('agency_outreach_drafts').select('*').eq('id', id).maybeSingle();
      if (draftError) throw draftError;
      if (!draft) return res.status(404).json({ error: 'That outreach draft could not be found.' });

      let agencyLeadId = draft.agency_lead_id;
      const contactedAt = draft.sent_at || new Date().toISOString();
      const messageSent = req.body?.message !== undefined
        ? stripMessageDashes(cleanText(req.body.message, 5000))
        : draft.message;
      if (!agencyLeadId) {
        const leadPayload = {
          name: draft.contact_name || `@${draft.instagram_username}`,
          company: draft.business_name,
          stage: 'contacted_1',
          source: 'instagram',
          source_platform: 'Instagram',
          owner: 'Heath',
          conversion_probability: 20,
          notes: stripMessageDashes([
            `Instagram outreach sent to @${draft.instagram_username}.`,
            draft.profile_notes ? `Profile notes: ${draft.profile_notes}` : '',
            `Message sent:\n${messageSent}`,
          ].filter(Boolean).join('\n\n')),
          next_action: 'Watch for a reply on Instagram',
          last_contacted: contactedAt,
          updated_at: new Date().toISOString(),
        };
        const { data: lead, error: leadError } = await db.from('agency_leads').insert(leadPayload).select('*').single();
        if (leadError) throw leadError;
        agencyLeadId = lead.id;
        await db.from('agency_lead_activities').insert([
          { lead_id: lead.id, activity_type: 'created', description: 'Lead added from Instagram Outreach Studio.' },
          { lead_id: lead.id, activity_type: 'contact', description: `Instagram outreach sent to @${draft.instagram_username}.`, metadata: { outreach_draft_id: id } },
        ]);
      }

      const { data: updated, error } = await db.from('agency_outreach_drafts').update({
        agency_lead_id: agencyLeadId,
        message: messageSent,
        status: 'sent',
        sent_at: contactedAt,
        updated_at: new Date().toISOString(),
      }).eq('id', id).select('*').single();
      if (error) throw error;
      return res.status(200).json({ draft: updated });
    }

    if (action === 'saveMarketingPeriod') {
      const input = (req.body?.period || {}) as Record<string, unknown>;
      const periodStart = dateOnly(input.period_start);
      const periodEnd = dateOnly(input.period_end);
      if (!periodStart || !periodEnd || periodEnd < periodStart) return res.status(400).json({ error: 'Please provide a valid reporting period.' });
      const payload = {
        period_start: periodStart,
        period_end: periodEnd,
        source: VALID_SOURCES.has(String(input.source)) ? input.source : 'meta_ads',
        source_platform: nullableText(input.source_platform, 100),
        source_campaign: nullableText(input.source_campaign, 300),
        spend: nullableNumber(input.spend) || 0,
        impressions: Math.max(0, Math.round(Number(input.impressions) || 0)),
        clicks: Math.max(0, Math.round(Number(input.clicks) || 0)),
        leads: Math.max(0, Math.round(Number(input.leads) || 0)),
        conversions: Math.max(0, Math.round(Number(input.conversions) || 0)),
        conversion_revenue: nullableNumber(input.conversion_revenue) || 0,
        lifetime_revenue: nullableNumber(input.lifetime_revenue) || 0,
        notes: nullableText(input.notes, 2000),
        is_estimate: Boolean(input.is_estimate),
        updated_at: new Date().toISOString(),
      };
      let id = cleanText(input.id, 80);
      let periodPayload = payload;

      // "Add ad stats" represents the totals for a source and reporting window.
      // If that row already exists, replace its ad totals instead of creating a
      // duplicate. Keep confirmed conversion attribution/revenue when the add
      // form did not provide those values.
      if (!id) {
        const { data: existingPeriod, error: existingPeriodError } = await db
          .from('agency_marketing_periods')
          .select('*')
          .eq('period_start', periodStart)
          .eq('period_end', periodEnd)
          .eq('source', payload.source)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (existingPeriodError) throw existingPeriodError;

        if (existingPeriod) {
          id = existingPeriod.id;
          periodPayload = {
            ...payload,
            source_platform: payload.source_platform || existingPeriod.source_platform,
            source_campaign: payload.source_campaign || existingPeriod.source_campaign,
            conversion_revenue: payload.conversion_revenue || Number(existingPeriod.conversion_revenue || 0),
            lifetime_revenue: payload.lifetime_revenue || Number(existingPeriod.lifetime_revenue || 0),
            notes: payload.notes || existingPeriod.notes,
          };
        }
      }

      const query = id
        ? db.from('agency_marketing_periods').update(periodPayload).eq('id', id)
        : db.from('agency_marketing_periods').insert(periodPayload);
      const { data: period, error } = await query.select('*').single();
      if (error) throw error;
      return res.status(200).json({ period });
    }

    return res.status(400).json({ error: 'Unknown lead management action.' });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORISED') return res.status(401).json({ error: 'Agency access is required.' });
    if (error instanceof Error && error.message === 'GEMINI_NOT_CONFIGURED') return res.status(503).json({ error: 'Gemini is not configured for outreach message generation.' });
    if (error instanceof Error && error.message === 'OPENAI_NOT_CONFIGURED') return res.status(503).json({ error: 'OpenAI is not configured for outreach graphic generation.' });
    if (error instanceof Error && error.message === 'GRAPHIC_GENERATION_FAILED') return res.status(502).json({ error: 'The custom graphic could not be generated. Please try again.' });
    if (error instanceof Error && error.message === 'GRAPHIC_UPLOAD_FAILED') return res.status(502).json({ error: 'The custom graphic was created but could not be saved. Please try again.' });
    if (error instanceof Error && error.message === 'REEL_COVER_QA_FAILED') return res.status(502).json({ error: 'The Reel cover did not pass its text and mobile-readability check. Please regenerate it.' });
    console.error('Agency lead management failed:', error);
    return res.status(500).json({ error: 'Lead management could not be updated. Please try again.' });
  }
}
