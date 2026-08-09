import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { authenticatePortalRequest, cleanText, isPortalEmailNotificationsEnabled, kickPortalAutomation } from '../server/portal.js';
import { agencyLeadsHandler } from '../server/agencyLeads.js';

export const maxDuration = 300;

function serverClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.query.mode === 'agency-leads') return agencyLeadsHandler(req, res);

  if (req.method === 'GET') {
    const clientId = cleanText(req.query.clientId, 80);
    if (!clientId) return res.status(400).json({ error: 'Client is required.' });
    try {
      const { db } = await authenticatePortalRequest(req, clientId);
      const { data, error } = await db.from('portal_conversations').select('id, kind, subject, status, priority, last_message_at, portal_messages(id, sender_type, sender_name, body, created_at)').eq('client_id', clientId).order('last_message_at', { ascending: false }).limit(20);
      if (error) throw error;
      return res.status(200).json({ conversations: data || [] });
    } catch (error) {
      if (error instanceof Error && error.message === 'UNAUTHORISED') return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
      console.error('Conversation list failed:', error);
      return res.status(500).json({ error: 'Requests are unavailable right now.' });
    }
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { clientId, pin, subject, message, priority } = req.body || {};
  if (!clientId || !subject?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Please complete the subject and details.' });
  }

  const supabase = serverClient();
  if (!supabase) return res.status(500).json({ error: 'Support is not configured yet.' });

  const bearer = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
  const { data: authData } = bearer ? await supabase.auth.getUser(bearer) : { data: { user: null } };
  const { data: client } = await supabase
    .from('clients')
    .select('id, name, contact_name, contact_email, pin, owner_user_id')
    .eq('id', clientId)
    .maybeSingle();
  const { data: master } = await supabase
    .from('clients')
    .select('pin')
    .eq('name', 'Seam Media')
    .maybeSingle();

  const authenticatedOwner = Boolean(authData.user && client?.owner_user_id === authData.user.id);
  if (!client || (!authenticatedOwner && client.pin !== pin && master?.pin !== pin)) {
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }

  const cleanSubject = subject.trim().slice(0, 160);
  const cleanMessage = message.trim().slice(0, 5000);
  const cleanPriority = priority === 'high' ? 'high' : 'normal';
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const directInsert = hasServiceRole || authenticatedOwner;
  const { data: ticketResult, error } = directInsert
    ? await supabase.from('social_support_tickets').insert({
        client_id: client.id,
        subject: cleanSubject,
        message: cleanMessage,
        priority: cleanPriority,
        submitted_by_name: client.contact_name,
        submitted_by_email: client.contact_email,
      }).select('id').single()
    : await supabase.rpc('submit_social_support_ticket', {
        p_client_id: client.id,
        p_pin: pin,
        p_subject: cleanSubject,
        p_message: cleanMessage,
        p_priority: cleanPriority,
      });

  if (error) {
    console.error('Support ticket insert failed:', error);
    return res.status(500).json({ error: 'The request could not be logged. Please try again.' });
  }

  const ticketId = directInsert ? ticketResult?.id : ticketResult;

  let conversationId: string | undefined;
  if (hasServiceRole) {
    const { data: conversation, error: conversationError } = await supabase.from('portal_conversations').insert({
      client_id: client.id,
      kind: 'support',
      subject: cleanSubject,
      priority: cleanPriority,
    }).select('id').single();
    if (conversationError) {
      console.error('Support conversation insert failed:', conversationError);
    } else {
      conversationId = conversation.id;
      const { data: portalMessage, error: messageError } = await supabase.from('portal_messages').insert({
        conversation_id: conversation.id,
        client_id: client.id,
        sender_type: 'client',
        sender_name: client.contact_name,
        sender_email: client.contact_email,
        body: cleanMessage,
      }).select('id').single();
      if (messageError) console.error('Support message insert failed:', messageError);
      await Promise.all([
        supabase.from('social_support_tickets').update({ conversation_id: conversation.id }).eq('id', ticketId),
        supabase.from('portal_notifications').insert([
          { client_id: client.id, audience: 'client', type: 'support_received', title: 'Support request received', body: cleanSubject, link: 'support', conversation_id: conversation.id },
          { client_id: client.id, audience: 'agency', type: 'support_request', title: `Support request from ${client.name}`, body: cleanSubject, link: 'support', conversation_id: conversation.id },
        ]),
        portalMessage?.id
          ? supabase.from('portal_automation_jobs').insert({ client_id: client.id, conversation_id: conversation.id, source_type: 'support', source_id: portalMessage.id, payload: { ticketId, priority: cleanPriority } })
          : Promise.resolve(),
      ]);
    }
  }

  if (isPortalEmailNotificationsEnabled() && process.env.RESEND_API_KEY && !conversationId) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Seam Media Portal <notifications@seammedia.com.au>',
        to: ['contact@seammedia.com.au'],
        subject: `[${cleanPriority.toUpperCase()}] Support request from ${client.name}: ${cleanSubject}`,
        text: `${cleanMessage}\n\nClient: ${client.name}\nContact: ${client.contact_name || ''} ${client.contact_email || ''}\nTicket: ${ticketId}\n\nThis request is now tracked in the Seam Media portal.`,
      }),
    }).catch((notificationError) => console.error('Support notification failed:', notificationError));
  }

  if (conversationId) await kickPortalAutomation().catch((automationError) => console.error('Immediate support automation failed:', automationError));

  return res.status(200).json({ ok: true, ticketId, conversationId });
}
