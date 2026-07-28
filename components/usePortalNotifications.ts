import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { PortalSection } from './ClientPortalSidebar';

export type PortalNotification = {
  id: string;
  title: string;
  body: string;
  link?: PortalSection;
  read_at?: string;
  created_at: string;
};

const NOTIFICATIONS_UPDATED_EVENT = 'portal-notifications-updated';

export function usePortalNotifications(clientId: string, pin: string) {
  const [items, setItems] = useState<PortalNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const headers = useCallback(async (): Promise<Record<string, string>> => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
  }, []);

  const refresh = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const response = await fetch(`/api/notifications?clientId=${encodeURIComponent(clientId)}`, {
        headers: { ...(await headers()), ...(pin ? { 'X-Portal-Pin': pin } : {}) },
      });
      if (response.ok) setItems((await response.json()).notifications || []);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [clientId, pin, headers]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30000);
    const sync = () => void refresh();
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, sync);
    };
  }, [refresh]);

  const markRead = useCallback(async (id?: string) => {
    const response = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(await headers()) },
      body: JSON.stringify({ clientId, pin, id }),
    });
    if (!response.ok) return;
    setItems((current) => current.map((item) => !id || item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
    window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
  }, [clientId, pin, headers]);

  return {
    items,
    loading,
    unread: items.filter((item) => !item.read_at).length,
    refresh,
    markRead,
  };
}
