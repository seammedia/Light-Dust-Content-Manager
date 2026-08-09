import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticatePortalRequest, cleanText } from '../server/portal.js';

export const maxDuration = 60;

type CaptionResult = { caption: string; hashtags: string[] };
type ContentIdea = CaptionResult & { sourceIdeaId: string; sourceUrl: string };

function responseText(payload: any) {
  if (payload.output_text) return payload.output_text;
  return (payload.output || [])
    .flatMap((item: any) => item.content || [])
    .find((item: any) => item.type === 'output_text')?.text || '';
}

function cleanCaptionResult(value: any, fallback?: CaptionResult): CaptionResult {
  const caption = cleanText(value?.caption || fallback?.caption || '', 12000)
    .replace(/[—–]/g, ', ');
  const hashtags = Array.isArray(value?.hashtags) ? value.hashtags : fallback?.hashtags || [];
  return {
    caption,
    hashtags: hashtags
      .map((hashtag: unknown) => cleanText(hashtag, 80).replace(/^#+/, '').replace(/\s+/g, ''))
      .filter(Boolean)
      .slice(0, 5),
  };
}

function captionSchema(name: string) {
  return {
    type: 'json_schema',
    name,
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        caption: { type: 'string' },
        hashtags: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 5 },
      },
      required: ['caption', 'hashtags'],
    },
  };
}

async function requestOpenAI(input: unknown, format: unknown) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_NOT_CONFIGURED');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_CAPTION_MODEL || 'gpt-5.6-luna',
      reasoning: { effort: 'none' },
      instructions: 'You are a social media copywriter for an Australian agency. Use Australian spelling. Never use em dashes or en dashes. Follow the supplied client guidelines. Return only the requested JSON.',
      input,
      text: { format },
    }),
  });

  if (!response.ok) throw new Error(`OPENAI_${response.status}:${await response.text()}`);
  const text = responseText(await response.json());
  if (!text) throw new Error('OPENAI_EMPTY_RESPONSE');
  return JSON.parse(text);
}

function errorResponse(res: VercelResponse, error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  if (message === 'UNAUTHORISED') return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  if (message === 'OPENAI_NOT_CONFIGURED') return res.status(503).json({ error: 'OpenAI caption generation is not configured.' });
  if (message.startsWith('OPENAI_429')) return res.status(429).json({ error: 'OpenAI is busy. Please try again in a moment.' });
  console.error('Caption generation failed:', error);
  return res.status(502).json({ error: 'Caption generation failed. Please try again.' });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const clientId = cleanText(body.clientId, 100);
    const action = cleanText(body.action, 40);
    if (!clientId) return res.status(400).json({ error: 'Client is required.' });

    const { isAgency } = await authenticatePortalRequest(req, clientId);
    if (!isAgency) return res.status(403).json({ error: 'Agency access is required.' });

    const brandName = cleanText(body.brandName, 200);
    const clientNotes = cleanText(body.clientNotes, 12000);

    if (action === 'from_image') {
      const imageSource = cleanText(body.imageSource, 8_000_000);
      if (!imageSource || !brandName) return res.status(400).json({ error: 'Image and brand name are required.' });

      const result = await requestOpenAI([
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `Brand: ${brandName}\nClient guidelines: ${clientNotes || 'None supplied'}\n\nWrite an engaging Instagram caption for the supplied image. Use a warm, friendly, conversational tone, 3 to 5 short paragraphs, 1 to 3 appropriate emojis, a subtle call to action, and exactly 4 or 5 relevant hashtags without # symbols.`,
            },
            { type: 'input_image', image_url: imageSource, detail: 'low' },
          ],
        },
      ], captionSchema('social_caption'));
      return res.status(200).json(cleanCaptionResult(result));
    }

    if (action === 'update_from_feedback') {
      const fallback = cleanCaptionResult({ caption: body.currentCaption, hashtags: body.currentHashtags });
      const feedback = cleanText(body.feedback, 12000);
      if (!feedback || !brandName) return res.status(400).json({ error: 'Feedback and brand name are required.' });

      const result = await requestOpenAI([
        {
          role: 'user',
          content: `Brand: ${brandName}\nClient guidelines: ${clientNotes || 'None supplied'}\n\nCurrent caption:\n${fallback.caption}\n\nCurrent hashtags:\n${fallback.hashtags.map((hashtag) => `#${hashtag}`).join(' ')}\n\nClient feedback:\n${feedback}\n\nUpdate only what the feedback requests. Preserve unaffected content and return the updated caption with 4 or 5 relevant hashtags without # symbols.`,
        },
      ], captionSchema('updated_social_caption'));
      return res.status(200).json(cleanCaptionResult(result, fallback));
    }

    if (action === 'generate_posts') {
      const numberOfPosts = Math.min(12, Math.max(1, Number(body.numberOfPosts) || 1));
      const brandMission = cleanText(body.brandMission, 4000);
      const brandTone = cleanText(body.brandTone, 1000);
      const brandKeywords = Array.isArray(body.brandKeywords)
        ? body.brandKeywords.map((keyword: unknown) => cleanText(keyword, 100)).filter(Boolean).slice(0, 30)
        : [];
      const context = body.context && typeof body.context === 'object' ? body.context : null;
      const ideas = Array.isArray(context?.ideas) ? context.ideas.slice(0, 20) : [];
      const learnings = Array.isArray(context?.learnings) ? context.learnings.slice(0, 20) : [];

      const postsFormat = {
        type: 'json_schema',
        name: 'social_post_batch',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            posts: {
              type: 'array',
              minItems: numberOfPosts,
              maxItems: numberOfPosts,
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  caption: { type: 'string' },
                  hashtags: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 5 },
                  sourceIdeaId: { type: 'string' },
                  sourceUrl: { type: 'string' },
                },
                required: ['caption', 'hashtags', 'sourceIdeaId', 'sourceUrl'],
              },
            },
          },
          required: ['posts'],
        },
      };

      const result = await requestOpenAI([
        {
          role: 'user',
          content: `Create ${numberOfPosts} distinct Instagram posts.\n\nBrand: ${brandName}\nMission: ${brandMission || 'Not supplied'}\nTone: ${brandTone || 'Warm, friendly and professional'}\nKeywords: ${brandKeywords.join(', ') || 'Not supplied'}\nClient guidelines: ${clientNotes || 'None supplied'}\nIndustry: ${cleanText(context?.profile?.industry, 500) || 'Not supplied'}\nAudience: ${cleanText(context?.profile?.audience, 1000) || 'Not supplied'}\nCompliance: ${cleanText(context?.profile?.compliance_notes, 2000) || 'No additional rules'}\n\nCurrent sourced opportunities:\n${ideas.map((idea: any) => `- ID ${cleanText(idea.id, 100)}: ${cleanText(idea.title, 500)}. Angle: ${cleanText(idea.angle, 1000)}. Source: ${cleanText(idea.source_title, 500)} ${cleanText(idea.source_url, 2000)}. ${cleanText(idea.risk_notes, 1000)}`).join('\n') || '- None. Use evergreen brand expertise.'}\n\nProven content learnings:\n${learnings.map((learning: any) => `- ${cleanText(learning.recommendation, 1000)} (confidence ${Number(learning.confidence) || 0}, sample ${Number(learning.sample_size) || 0})`).join('\n') || '- None. Do not invent performance claims.'}\n\nEach post needs a different angle, a strong hook, useful body copy, a subtle call to action, 1 to 3 appropriate emojis, and exactly 4 or 5 hashtags without # symbols. Use a sourced opportunity only when genuinely relevant. Never copy article wording. If using one, return its exact ID and URL; otherwise use empty strings. Treat analytics as directional and do not overfit to one post.`,
        },
      ], postsFormat);

      const allowedIdeas = new Map(ideas.map((idea: any) => [String(idea.id || ''), String(idea.source_url || '')]));
      const posts: ContentIdea[] = (Array.isArray(result.posts) ? result.posts : []).map((post: any) => {
        const cleaned = cleanCaptionResult(post);
        const sourceIdeaId = allowedIdeas.has(String(post.sourceIdeaId || '')) ? String(post.sourceIdeaId) : '';
        return { ...cleaned, sourceIdeaId, sourceUrl: sourceIdeaId ? allowedIdeas.get(sourceIdeaId) || '' : '' };
      });
      return res.status(200).json({ posts });
    }

    return res.status(400).json({ error: 'Unsupported caption action.' });
  } catch (error) {
    return errorResponse(res, error);
  }
}
