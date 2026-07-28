import type { VercelRequest, VercelResponse } from '@vercel/node';
import { portalDb, sendPortalEmail } from '../server/portal.js';
import { enqueueContentIntelligence, processContentIntelligence } from '../server/contentIntelligence.js';

export const maxDuration = 60;

type Decision = { action: 'auto_reply' | 'acknowledge_and_escalate' | 'escalate'; priority: 'normal' | 'high'; summary: string; reply: string };

function responseText(payload: any) {
  if (payload.output_text) return payload.output_text;
  return (payload.output || []).flatMap((item: any) => item.content || []).find((item: any) => item.type === 'output_text')?.text || '';
}

async function decide(input: { kind: string; subject: string; body: string; clientName: string }): Promise<Decision> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
  if (!apiKey) return { action: 'escalate', priority: 'normal', summary: 'AI automation is not configured.', reply: '' };
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_AUTOMATION_MODEL || 'gpt-5.6-luna',
      reasoning: { effort: 'none' },
      input: [
        { role: 'developer', content: `You triage requests for Seam Media, an Australian social media agency. Return only the requested JSON. Use Australian spelling and never use em dashes. Auto-reply only to low-risk how-to, status and general portal questions. Content change requests must be acknowledged and escalated for production. Always escalate billing changes, refunds, cancellation, credentials, account access, legal threats, complaints, ad spend or budgets, publishing approval, privacy, security, urgent outages, and anything uncertain. Never claim work has been completed unless the supplied facts prove it.` },
        { role: 'user', content: `Client: ${input.clientName}\nType: ${input.kind}\nSubject: ${input.subject}\nRequest: ${input.body}` },
      ],
      text: { format: { type: 'json_schema', name: 'portal_triage', strict: true, schema: { type: 'object', additionalProperties: false, properties: { action: { type: 'string', enum: ['auto_reply', 'acknowledge_and_escalate', 'escalate'] }, priority: { type: 'string', enum: ['normal', 'high'] }, summary: { type: 'string' }, reply: { type: 'string' } }, required: ['action', 'priority', 'summary', 'reply'] } } },
    }),
  });
  if (!response.ok) throw new Error(`OpenAI request failed: ${response.status} ${await response.text()}`);
  return JSON.parse(responseText(await response.json())) as Decision;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!['GET', 'POST'].includes(req.method || '')) return res.status(405).json({ error: 'Method not allowed' });
  const auth = String(req.headers.authorization || '');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'Unauthorised' });
  if (req.query.health === 'ai') {
    try {
      const result = await decide({ kind: 'support', subject: 'Portal health check', body: 'How do I update my business details in the portal?', clientName: 'Seam Media Test' });
      return res.status(200).json({ ok: true, provider: 'openai', action: result.action });
    } catch (error) {
      console.error('AI health check failed:', error);
      return res.status(502).json({ ok: false, error: error instanceof Error ? error.message : 'AI health check failed.' });
    }
  }
  const db = portalDb();
  const isScheduledRun = Boolean(req.headers['x-vercel-cron-schedule']);
  let contentIntelligence: Array<{ id: string; status: string }> = [];
  const { data: jobs, error } = await db.from('portal_automation_jobs').select('id, client_id, conversation_id, source_type, attempt_count').eq('status', 'queued').lte('next_attempt_at', new Date().toISOString()).order('created_at').limit(5);
  if (error) return res.status(500).json({ error: error.message });
  const results: Array<{ id: string; status: string }> = [];

  for (const job of jobs || []) {
    const locked = await db.from('portal_automation_jobs').update({ status: 'processing', locked_at: new Date().toISOString(), attempt_count: job.attempt_count + 1, updated_at: new Date().toISOString() }).eq('id', job.id).eq('status', 'queued').select('id').maybeSingle();
    if (!locked.data) continue;
    try {
      const [{ data: conversation }, { data: messages }, { data: client }] = await Promise.all([
        db.from('portal_conversations').select('id, kind, subject').eq('id', job.conversation_id).single(),
        db.from('portal_messages').select('body, sender_type').eq('conversation_id', job.conversation_id).eq('is_internal', false).order('created_at'),
        db.from('clients').select('name, contact_name, contact_email').eq('id', job.client_id).single(),
      ]);
      if (!conversation || !client || !messages?.length) throw new Error('Conversation data is incomplete.');
      const latest = [...messages].reverse().find((message) => ['client', 'email'].includes(message.sender_type));
      if (!latest) throw new Error('No client message was found.');
      const decision = await decide({ kind: conversation.kind, subject: conversation.subject, body: latest.body, clientName: client.name });
      const needsAgency = decision.action !== 'auto_reply';
      const reply = (decision.reply || (needsAgency ? 'Thanks, your request has been logged and sent to the Seam Media team for review. You will receive an update here.' : '')).split('—').join(' - ');
      if (reply) {
        await db.from('portal_messages').insert({ conversation_id: conversation.id, client_id: job.client_id, sender_type: 'ai', sender_name: 'Seam Media Assistant', body: reply, metadata: { automated: true } });
        await db.from('portal_notifications').insert({ client_id: job.client_id, audience: 'client', type: 'conversation_reply', title: needsAgency ? 'Request sent for review' : 'New reply from Seam Media', body: reply.slice(0, 240), link: conversation.kind === 'support' ? 'support' : 'comments', conversation_id: conversation.id });
        if (client.contact_email) await sendPortalEmail({ to: [client.contact_email], subject: `Update from Seam Media: ${conversation.subject}`, text: `Hi ${client.contact_name || 'there'},\n\n${reply}\n\nYou can view and track this request in your Seam Media client portal.\n\nThanks,\nSeam Media` });
      }
      if (needsAgency) {
        await db.from('portal_notifications').insert({ client_id: job.client_id, audience: 'agency', type: 'automation_escalation', title: `${decision.priority === 'high' ? 'Urgent: ' : ''}${conversation.subject}`, body: decision.summary, link: conversation.kind === 'support' ? 'support' : 'comments', conversation_id: conversation.id });
        await sendPortalEmail({ to: ['contact@seammedia.com.au'], subject: `${decision.priority === 'high' ? '[URGENT] ' : ''}Portal escalation: ${conversation.subject}`, text: `${decision.summary}\n\nClient: ${client.name}\n\nThis request is tracked in the Seam Media portal.` });
      }
      await Promise.all([
        db.from('portal_conversations').update({ status: needsAgency ? 'escalated' : 'waiting_on_client', priority: decision.priority, automation_status: needsAgency ? 'escalated' : 'completed', summary: decision.summary, last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', conversation.id),
        db.from('portal_automation_jobs').update({ status: needsAgency ? 'escalated' : 'completed', result: decision, error: null, updated_at: new Date().toISOString() }).eq('id', job.id),
      ]);
      results.push({ id: job.id, status: needsAgency ? 'escalated' : 'completed' });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unknown automation error';
      const retry = job.attempt_count + 1 < 3;
      await db.from('portal_automation_jobs').update({ status: retry ? 'queued' : 'failed', next_attempt_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), error: message.slice(0, 2000), updated_at: new Date().toISOString() }).eq('id', job.id);
      if (!retry) await sendPortalEmail({ to: ['contact@seammedia.com.au'], subject: 'Portal automation needs attention', text: `A client request could not be processed automatically.\n\nJob: ${job.id}\nError: ${message}` }).catch(() => undefined);
      results.push({ id: job.id, status: retry ? 'queued' : 'failed' });
    }
  }
  if (isScheduledRun) {
    try {
      await enqueueContentIntelligence(db);
      // Protect client portal replies from long research jobs. The backlog remains
      // durable and is picked up by the next daily run.
      if (results.length === 0) contentIntelligence = await processContentIntelligence(db, 6, 35000);
    } catch (contentError) {
      console.error('Content intelligence loop failed:', contentError);
    }
  }
  return res.status(200).json({ processed: results.length, results, contentIntelligence });
}
