import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AtSign,
  Camera,
  CheckCircle2,
  ExternalLink,
  Facebook,
  Image,
  Instagram,
  Linkedin,
  Loader2,
  MapPin,
  MessageCircle,
  Music2,
  RefreshCw,
  Youtube,
  type LucideIcon,
} from 'lucide-react';
import { Client } from '../types';
import { supabase } from '../services/supabaseClient';

interface ClientConnectionsProps {
  client: Client;
  pin: string;
}

type ConnectedAccount = {
  id: string;
  platform: string;
  username?: string;
  displayName?: string;
  profileUrl?: string;
  connected: boolean;
};

type PlatformDefinition = {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: string;
};

const PLATFORMS: PlatformDefinition[] = [
  { value: 'facebook', label: 'Facebook', description: 'Business Page and Reels', icon: Facebook, tone: 'bg-blue-50 text-blue-700' },
  { value: 'instagram', label: 'Instagram', description: 'Posts, Reels and Stories', icon: Instagram, tone: 'bg-pink-50 text-pink-700' },
  { value: 'tiktok', label: 'TikTok', description: 'Short-form video publishing', icon: Music2, tone: 'bg-stone-100 text-stone-900' },
  { value: 'youtube', label: 'YouTube', description: 'Videos and YouTube Shorts', icon: Youtube, tone: 'bg-red-50 text-red-700' },
  { value: 'googlebusiness', label: 'Google Business', description: 'Updates, offers and photos', icon: MapPin, tone: 'bg-emerald-50 text-emerald-700' },
  { value: 'linkedin', label: 'LinkedIn', description: 'Company or personal profile', icon: Linkedin, tone: 'bg-sky-50 text-sky-700' },
  { value: 'threads', label: 'Threads', description: 'Text, images and video', icon: AtSign, tone: 'bg-stone-100 text-stone-800' },
  { value: 'twitter', label: 'X', description: 'Posts, images and video', icon: AtSign, tone: 'bg-stone-100 text-stone-900' },
  { value: 'pinterest', label: 'Pinterest', description: 'Image and video Pins', icon: Image, tone: 'bg-rose-50 text-rose-700' },
  { value: 'reddit', label: 'Reddit', description: 'Posts to approved communities', icon: MessageCircle, tone: 'bg-orange-50 text-orange-700' },
  { value: 'snapchat', label: 'Snapchat', description: 'Stories and Spotlight', icon: Camera, tone: 'bg-yellow-50 text-yellow-700' },
];

export function ClientConnections({ client, pin }: ClientConnectionsProps) {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const authHeaders = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      'x-portal-pin': pin,
      ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
    };
  }, [pin]);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const headers = await authHeaders();
      const response = await fetch(`/api/social-connections?clientId=${encodeURIComponent(client.id)}`, { headers });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Social connections are unavailable.');
      setAccounts(result.accounts || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Social connections are unavailable.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, client.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('social_connected')) {
      const platform = params.get('connected') || params.get('platform') || 'social account';
      setNotice(`${platform.replace(/_/g, ' ')} connected successfully.`);
      window.history.replaceState({}, '', window.location.pathname);
    }
    loadAccounts();
  }, [loadAccounts]);

  const accountByPlatform = useMemo(() => new Map(accounts.map((account) => [account.platform, account])), [accounts]);

  const connect = async (platform: PlatformDefinition) => {
    setConnecting(platform.value);
    setError('');
    setNotice('');
    try {
      const headers = await authHeaders();
      const response = await fetch('/api/social-connections', {
        method: 'POST',
        headers,
        body: JSON.stringify({ clientId: client.id, pin, action: 'connect', platform: platform.value }),
      });
      const result = await response.json();
      if (!response.ok || !result.authUrl) throw new Error(result.error || `Could not connect ${platform.label}.`);
      window.location.assign(result.authUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `Could not connect ${platform.label}.`);
      setConnecting('');
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-5 sm:p-7 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-brand-green">Social accounts</p>
          <h2 className="mt-1 font-serif text-3xl font-bold text-brand-dark">Connect your channels</h2>
          <p className="mt-2 max-w-3xl text-stone-500">Sign in directly with each platform to let Seam Media publish approved content. Your passwords are never shared with us.</p>
        </div>
        <button type="button" onClick={loadAccounts} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {notice && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800"><CheckCircle2 className="h-5 w-5" />{notice}</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="ui-stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PLATFORMS.map((platform) => {
          const account = accountByPlatform.get(platform.value);
          const connected = Boolean(account?.connected);
          const Icon = platform.icon;
          return (
            <section key={platform.value} className="ui-surface ui-surface-interactive flex min-h-[190px] flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className={`rounded-xl p-3 ${platform.tone}`}><Icon className="h-6 w-6" /></div>
                <ConnectionStatus connected={connected} />
              </div>
              <h3 className="mt-4 font-semibold text-brand-dark">{platform.label}</h3>
              <p className="mt-1 text-sm text-stone-500">{connected ? account?.displayName || account?.username || platform.description : platform.description}</p>
              <div className="mt-auto flex items-center gap-2 pt-5">
                <button type="button" onClick={() => connect(platform)} disabled={Boolean(connecting)} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold ${connected ? 'border border-stone-300 text-stone-600 hover:bg-stone-50' : 'bg-brand-green text-white hover:bg-emerald-800'} disabled:opacity-50`}>
                  {connecting === platform.value ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  {connecting === platform.value ? 'Opening…' : connected ? 'Reconnect' : 'Connect'}
                </button>
                {connected && account?.profileUrl && <a href={account.profileUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-stone-300 p-2.5 text-stone-500 hover:text-brand-green" aria-label={`Open ${platform.label} profile`}><ExternalLink className="h-4 w-4" /></a>}
              </div>
            </section>
          );
        })}
      </div>

      <section className="rounded-2xl border border-stone-200 bg-stone-50 p-5 text-sm leading-6 text-stone-600">
        Each connection is authorised through the social platform and securely managed by Zernio. Some platforms ask you to choose the correct Business Page, channel or Google Business location after signing in.
      </section>
    </div>
  );
}

function ConnectionStatus({ connected }: { connected: boolean }) {
  return connected ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Connected</span>
  ) : (
    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-500">Not connected</span>
  );
}
