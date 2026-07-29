import type { SupabaseClient } from '@supabase/supabase-js';

const ZERNIO_API_BASE = 'https://zernio.com/api/v1';

type ClientProfileRecord = {
  id: string;
  name: string;
  zernio_profile_id?: string | null;
};

type ZernioProfile = {
  _id?: string;
  id?: string;
  name?: string;
  description?: string;
};

async function zernioRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = process.env.ZERNIO_API_KEY || process.env.VITE_LATE_API_KEY;
  if (!apiKey) throw new Error('Zernio profile provisioning is not configured.');

  const response = await fetch(`${ZERNIO_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error || data.message || `Zernio returned ${response.status}.`;
    throw new Error(message);
  }
  return data as T;
}

export async function ensureZernioProfile(db: SupabaseClient, client: ClientProfileRecord) {
  const marker = `[Seam client ${client.id}]`;
  const profileName = client.name.trim() || 'New Seam Media client';
  if (client.zernio_profile_id) {
    const current = await zernioRequest<{ profile?: ZernioProfile }>(`/profiles/${encodeURIComponent(client.zernio_profile_id)}`);
    if (current.profile?.name?.trim() !== profileName) {
      await zernioRequest(`/profiles/${encodeURIComponent(client.zernio_profile_id)}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: profileName,
          description: `Seam Media client profile for ${profileName}. ${marker}`,
          color: '#4F6B47',
        }),
      });
    }
    return client.zernio_profile_id;
  }

  const listed = await zernioRequest<{ profiles?: ZernioProfile[] }>('/profiles?includeOverLimit=true');
  const profiles = listed.profiles || [];
  const markedProfile = profiles.find((profile) => profile.description?.includes(marker));
  const exactNameProfiles = profiles.filter((profile) => profile.name?.trim().toLowerCase() === profileName.toLowerCase());
  const reusableProfile = markedProfile || (exactNameProfiles.length === 1 ? exactNameProfiles[0] : null);

  let profileId = reusableProfile?._id || reusableProfile?.id;
  if (!profileId) {
    const created = await zernioRequest<{ profile?: ZernioProfile }>('/profiles', {
      method: 'POST',
      headers: { 'Idempotency-Key': `seam-social-client-${client.id}` },
      body: JSON.stringify({
        name: profileName,
        description: `Seam Media client profile for ${profileName}. ${marker}`,
        color: '#4F6B47',
      }),
    });
    profileId = created.profile?._id || created.profile?.id;
  }
  if (!profileId) throw new Error('Zernio created the profile but returned no profile ID.');

  const { error } = await db
    .from('clients')
    .update({ zernio_profile_id: profileId, updated_at: new Date().toISOString() })
    .eq('id', client.id);
  if (error) throw error;
  return profileId;
}
