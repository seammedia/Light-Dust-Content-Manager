import { useState } from 'react';
import { CreditCard, ExternalLink, Loader2, ReceiptText } from 'lucide-react';
import { Client } from '../types';
import { supabase } from '../services/supabaseClient';

interface ClientBillingProps {
  client: Client;
  pin: string;
}

export function ClientBilling({ client, pin }: ClientBillingProps) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');
  const hasSelfServeBilling = Boolean(client.stripe_customer_id);

  const openPortal = async () => {
    setOpening(true);
    setError('');
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch(token
        ? 'https://app.tendcall.com/api/intake?mode=social-billing-portal'
        : '/api/billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ clientId: client.id, pin }),
      });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || 'Could not open billing.');
      window.location.assign(result.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not open billing.');
      setOpening(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-5 sm:p-7 lg:p-8">
      <div>
        <p className="text-sm font-medium text-brand-green">Billing</p>
        <h2 className="mt-1 font-serif text-3xl font-bold text-brand-dark">Plan and subscription</h2>
        <p className="mt-2 max-w-2xl text-stone-500">Manage invoices, payment details, and your subscription without contacting Seam Media.</p>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-4 inline-flex rounded-xl bg-emerald-50 p-3 text-brand-green"><CreditCard className="h-6 w-6" /></div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-400">Current plan</p>
            <h3 className="mt-1 text-xl font-semibold text-brand-dark">{client.plan_name || 'Seam Media social content'}</h3>
            <p className="mt-2 text-sm text-stone-500">Status: <span className="font-medium text-stone-700">{client.subscription_status || (hasSelfServeBilling ? 'Active' : 'Managed by Seam Media')}</span></p>
          </div>
          {hasSelfServeBilling && (
            <button type="button" onClick={openPortal} disabled={opening} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:opacity-50">
              {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}{opening ? 'Opening…' : 'Manage subscription'}
            </button>
          )}
        </div>
        {!hasSelfServeBilling && (
          <div className="mt-6 flex items-start gap-3 rounded-xl bg-stone-50 p-4 text-sm text-stone-600"><ReceiptText className="mt-0.5 h-5 w-5 shrink-0 text-stone-400" /><p>This account predates online signup. Self-service invoices and subscription controls will appear here once its billing record is linked to Stripe.</p></div>
        )}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </section>
    </div>
  );
}
