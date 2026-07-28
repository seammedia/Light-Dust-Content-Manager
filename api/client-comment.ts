import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticatePortalRequest, cleanText, kickPortalAutomation } from '../server/portal.js';

export const maxDuration = 60;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const clientId = cleanText(req.body?.clientId, 80);
  const postId = cleanText(req.body?.postId, 100);
  const comment = cleanText(req.body?.comment, 5000);
  if (!clientId || !postId || !comment) return res.status(400).json({ error: 'Please add your feedback before submitting.' });
  try {
    const { db, client, isAgency } = await authenticatePortalRequest(req, clientId);
    const { data: post } = await db.from('posts').select('id, title, date').eq('id', postId).eq('client_id', clientId).maybeSingle();
    if (!post) return res.status(404).json({ error: 'That post could not be found.' });
    await db.from('posts').update({ notes: comment, status: 'Revision' }).eq('id', postId).eq('client_id', clientId);
    // The legacy notes trigger marks notes_notified=false. The portal queue now owns
    // this notification, so mark it handled to prevent the old email cron duplicating it.
    await db.from('posts').update({ notes_notified: true }).eq('id', postId).eq('client_id', clientId);
    if (isAgency) return res.status(200).json({ ok: true });

    let { data: conversation } = await db.from('portal_conversations').select('id').eq('client_id', clientId).eq('kind', 'content_comment').eq('post_id', postId).neq('status', 'resolved').maybeSingle();
    if (!conversation) {
      const created = await db.from('portal_conversations').insert({ client_id: clientId, kind: 'content_comment', subject: `Feedback: ${post.title || post.date}`, post_id: postId }).select('id').single();
      if (created.error) throw created.error;
      conversation = created.data;
    }
    const message = await db.from('portal_messages').insert({ conversation_id: conversation.id, client_id: clientId, sender_type: 'client', sender_name: client.contact_name, sender_email: client.contact_email, body: comment }).select('id').single();
    if (message.error) throw message.error;
    await Promise.all([
      db.from('portal_conversations').update({ status: 'open', automation_status: 'queued', last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', conversation.id),
      db.from('portal_notifications').insert({ client_id: clientId, audience: 'agency', type: 'content_comment', title: `Change requested by ${client.name}`, body: comment.slice(0, 240), link: 'comments', conversation_id: conversation.id }),
      db.from('portal_automation_jobs').insert({ client_id: clientId, conversation_id: conversation.id, source_type: 'content_comment', source_id: message.data.id, payload: { postId, comment } }),
    ]);
    await kickPortalAutomation().catch((error) => console.error('Immediate comment automation failed:', error));
    return res.status(200).json({ ok: true, conversationId: conversation.id });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORISED') return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
    console.error('Client comment failed:', error);
    return res.status(500).json({ error: 'Your feedback could not be logged. Please try again.' });
  }
}
