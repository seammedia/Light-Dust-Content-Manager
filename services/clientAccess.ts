import { Client } from '../types';
import { supabase } from './supabaseClient';

export async function findAccessibleClient(userId: string): Promise<Client | null> {
  const { data: ownedClient, error: ownerError } = await supabase
    .from('clients')
    .select('*')
    .eq('owner_user_id', userId)
    .maybeSingle();

  if (ownerError) throw ownerError;
  if (ownedClient) return ownedClient as Client;

  const { data: membership, error: membershipError } = await supabase
    .from('client_memberships')
    .select('client:clients(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) throw membershipError;

  const relatedClient = membership?.client;
  if (Array.isArray(relatedClient)) return (relatedClient[0] as Client | undefined) || null;
  return (relatedClient as Client | null | undefined) || null;
}
