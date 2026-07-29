import { useEffect, useState } from 'react';
import { Check, Leaf, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { getAuthSession, signInWithEmail, signInWithGoogle, signUpWithEmail } from '../services/authClient';
import { recoverPaidOnboarding } from '../services/onboardingRecovery';

type Plan = 'basic' | 'pro' | 'max';
type Billing = 'monthly' | 'annual';

const PLAN_STORAGE_KEY = 'seam_signup_plan';
const BILLING_STORAGE_KEY = 'seam_signup_billing';
const AUTH_MODE_STORAGE_KEY = 'seam_auth_mode';

async function findOrRecoverClient(session: Awaited<ReturnType<typeof getAuthSession>>) {
  if (!session?.user) return null;
  const { data: existing, error } = await supabase
    .from('clients')
    .select('provisioning_status, subscription_status')
    .eq('owner_user_id', session.user.id)
    .maybeSingle();
  if (error) throw error;
  if (existing) return existing;

  const result = await recoverPaidOnboarding(session);
  return result.recovered ? result.client : null;
}

const PACKAGES: Record<Plan, { name: string; monthly: number; annual: number; features: string[]; links: Record<Billing, string> }> = {
  basic: {
    name: 'Basic', monthly: 199, annual: 179,
    features: ['1–2 posts per week', 'Graphic design', 'Weekly content calendar', 'Email support'],
    links: {
      monthly: 'https://buy.stripe.com/6oU4gA1wN3cc0Qr05J0Fj0y',
      annual: 'https://buy.stripe.com/eVq8wQcbr8ww7eP9Gj0Fj0I',
    },
  },
  pro: {
    name: 'Pro', monthly: 399, annual: 359,
    features: ['2–3 posts per week', 'Content creation', 'IG Reels', 'TikTok Reels', 'YouTube Shorts', 'Video editing', 'Priority email support'],
    links: {
      monthly: 'https://buy.stripe.com/9B6cN6a3j000eHh4lZ0Fj0z',
      annual: 'https://buy.stripe.com/9B6eVea3jaEE42DdWz0Fj0J',
    },
  },
  max: {
    name: 'Max', monthly: 599, annual: 539,
    features: ['3–4 posts per week', 'Premium graphic design', 'IG Reels', 'TikTok Reels', 'YouTube Shorts', 'Video editing', 'Monthly performance report'],
    links: {
      monthly: 'https://buy.stripe.com/cNi14o3EV00056H3hV0Fj0A',
      annual: 'https://buy.stripe.com/aFaaEYa3j7ssgPp4lZ0Fj0K',
    },
  },
};

function getInitialPlan(): Plan {
  const value = new URLSearchParams(window.location.search).get('plan') || localStorage.getItem(PLAN_STORAGE_KEY);
  return value === 'pro' || value === 'max' ? value : 'basic';
}

function getInitialBilling(): Billing {
  const value = new URLSearchParams(window.location.search).get('billing') || localStorage.getItem(BILLING_STORAGE_KEY);
  return value === 'annual' ? 'annual' : 'monthly';
}

function getInitialMode(): 'signup' | 'signin' {
  const requestedMode = new URLSearchParams(window.location.search).get('mode');
  const callbackMode = window.location.pathname === '/auth/callback' ? sessionStorage.getItem(AUTH_MODE_STORAGE_KEY) : null;
  return window.location.pathname === '/login' || requestedMode === 'signin' || callbackMode === 'signin' ? 'signin' : 'signup';
}

export function SelfServeSignup() {
  const [plan, setPlan] = useState<Plan>(getInitialPlan);
  const [billing, setBilling] = useState<Billing>(getInitialBilling);
  const [mode, setMode] = useState<'signup' | 'signin'>(getInitialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sessionEmail, setSessionEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [noPortal, setNoPortal] = useState(false);

  const selectedPackage = PACKAGES[plan];
  const displayPrice = billing === 'annual' ? selectedPackage.annual : selectedPackage.monthly;

  useEffect(() => {
    localStorage.setItem(PLAN_STORAGE_KEY, plan);
    localStorage.setItem(BILLING_STORAGE_KEY, billing);
  }, [plan, billing]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await getAuthSession();
      if (cancelled || !session?.user) { setLoading(false); return; }
      setUserId(session.user.id);
      setSessionEmail(session.user.email || '');

      let client;
      try {
        client = await findOrRecoverClient(session);
      } catch (recoveryError) {
        if (!cancelled) setError(recoveryError instanceof Error ? recoveryError.message : 'Your portal could not be prepared.');
      }
      if (cancelled) return;
      if (client?.provisioning_status === 'pending_intake') {
        window.location.replace('/onboarding');
        return;
      }
      if (client?.provisioning_status === 'active' && client.subscription_status !== 'cancelled') {
        window.location.replace('/');
        return;
      }
      if (mode === 'signin') setNoPortal(true);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [mode]);

  async function submitEmail() {
    setSubmitting(true); setError('');
    try {
      const result = mode === 'signup'
        ? await signUpWithEmail(email.trim(), password)
        : await signInWithEmail(email.trim(), password);
      if (result.error) { setError(result.error.message); return; }
      if (result.data.session?.user) {
        const authenticatedUser = result.data.session.user;
        const client = await findOrRecoverClient(result.data.session);
        if (client?.provisioning_status === 'pending_intake') { window.location.replace('/onboarding'); return; }
        if (client?.provisioning_status === 'active' && client.subscription_status !== 'cancelled') { window.location.replace('/'); return; }
        if (mode === 'signin') {
          setNoPortal(true);
        } else {
          setUserId(authenticatedUser.id);
          setSessionEmail(authenticatedUser.email || email.trim());
        }
      } else if (mode === 'signup') {
        setConfirmEmail(true);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Your portal could not be prepared.');
    } finally {
      setSubmitting(false);
    }
  }

  async function continueWithGoogle() {
    setError('');
    sessionStorage.setItem(AUTH_MODE_STORAGE_KEY, mode);
    const { error: authError } = await signInWithGoogle();
    if (authError) setError(authError.message);
  }

  function beginCheckout() {
    const url = new URL(selectedPackage.links[billing]);
    url.searchParams.set('client_reference_id', userId);
    if (sessionEmail) url.searchParams.set('prefilled_email', sessionEmail);
    window.location.href = url.toString();
  }

  if (loading) return <div className="min-h-screen bg-[#F5F5F0] grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-brand-green" /></div>;

  return (
    <div className="min-h-screen bg-[#F5F5F0] px-4 py-10 sm:py-16">
      <div className={`mx-auto ${mode === 'signin' ? 'max-w-md' : 'max-w-5xl'}`}>
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-green text-white"><Leaf className="h-6 w-6" /></div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-green">Seam Media</p>
          <h1 className="mt-2 font-serif text-3xl text-brand-dark sm:text-4xl">{mode === 'signin' ? 'Client login' : 'Create your client portal'}</h1>
          <p className="mt-2 text-stone-500">{mode === 'signin' ? 'Sign in securely to access your Seam Media dashboard.' : 'Create an account, complete secure checkout, add your brand details, then access your dashboard straight away.'}</p>
        </div>

        <div className={`grid overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl ${mode === 'signup' ? 'lg:grid-cols-[0.9fr_1.1fr]' : ''}`}>
          {mode === 'signup' && <section className="bg-brand-dark p-7 text-white sm:p-9">
            <p className="text-xs font-bold uppercase tracking-widest text-white/60">Your package</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {(Object.keys(PACKAGES) as Plan[]).map((key) => (
                <button key={key} type="button" onClick={() => setPlan(key)} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${plan === key ? 'border-white bg-white text-brand-dark' : 'border-white/20 text-white/70 hover:border-white/50'}`}>{PACKAGES[key].name}</button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(['monthly', 'annual'] as Billing[]).map((value) => (
                <button key={value} type="button" onClick={() => setBilling(value)} className={`rounded-lg px-3 py-2 text-sm ${billing === value ? 'bg-brand-green text-white' : 'bg-white/10 text-white/70'}`}>{value === 'monthly' ? 'Monthly' : 'Annual · save 10%'}</button>
              ))}
            </div>
            <div className="mt-7"><span className="text-4xl font-bold">${displayPrice}</span><span className="text-white/60"> /month</span></div>
            <p className="mt-1 text-sm text-white/60">{billing === 'annual' ? `A$${displayPrice * 12} billed annually` : 'Billed monthly'} · GST included</p>
            <ul className="mt-7 space-y-3 text-sm text-white/80">{selectedPackage.features.map((feature) => <li key={feature} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />{feature}</li>)}</ul>
            <p className="mt-7 text-xs text-white/50">No lock-in contract. Manage your subscription from the dashboard.</p>
          </section>}

          <section className="p-7 sm:p-9">
            {noPortal ? (
              <div className="text-center">
                <h2 className="font-serif text-2xl text-brand-dark">No active client portal found</h2>
                <p className="mt-3 text-sm leading-6 text-stone-500">This Google or email account is not connected to an active Seam Media dashboard.</p>
                <a href="https://www.seammedia.com.au/social-media-packages" className="mt-6 block w-full rounded-xl bg-brand-green px-5 py-3 font-semibold text-white shadow hover:brightness-95">View social media packages</a>
                <button type="button" onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="mt-4 text-sm text-stone-500 underline">Try a different account</button>
              </div>
            ) : userId ? (
              <div className="flex h-full flex-col justify-center">
                <p className="text-sm text-stone-500">Signed in as</p>
                <p className="mt-1 font-semibold text-brand-dark">{sessionEmail}</p>
                <h2 className="mt-7 font-serif text-2xl text-brand-dark">Ready for secure checkout</h2>
                <p className="mt-2 text-sm leading-6 text-stone-500">Stripe will securely collect your payment details. After checkout, you’ll complete a short brand setup and your dashboard will open immediately.</p>
                <button type="button" onClick={beginCheckout} className="mt-7 w-full rounded-xl bg-brand-green px-5 py-3 font-semibold text-white shadow hover:brightness-95">Continue to secure checkout</button>
                <button type="button" onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="mt-3 text-sm text-stone-400 underline">Use a different account</button>
              </div>
            ) : confirmEmail ? (
              <div className="flex h-full flex-col justify-center text-center">
                <h2 className="font-serif text-2xl text-brand-dark">Check your inbox</h2>
                <p className="mt-3 text-sm leading-6 text-stone-500">We sent a confirmation link to <strong>{email}</strong>. Open it to continue to checkout.</p>
              </div>
            ) : (
              <>
                <h2 className="font-serif text-2xl text-brand-dark">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
                <p className="mt-1 text-sm text-stone-500">Use Google or your business email.</p>
                <button type="button" onClick={continueWithGoogle} className="mt-6 w-full rounded-xl border border-stone-300 px-4 py-3 font-semibold text-brand-dark hover:bg-stone-50">Continue with Google</button>
                <div className="my-5 flex items-center gap-3"><div className="h-px flex-1 bg-stone-200" /><span className="text-xs text-stone-400">or</span><div className="h-px flex-1 bg-stone-200" /></div>
                <label className="text-sm font-medium text-stone-700">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" placeholder="you@business.com.au" />
                <label className="mt-4 block text-sm font-medium text-stone-700">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && email && password && submitEmail()} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" placeholder="At least 8 characters" />
                {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
                <button type="button" onClick={submitEmail} disabled={submitting || !email || password.length < 8} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green px-5 py-3 font-semibold text-white disabled:opacity-50">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}{mode === 'signup' ? 'Create account' : 'Sign in'}</button>
                <button type="button" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setNoPortal(false); setError(''); }} className="mt-4 w-full text-sm text-stone-500 underline">{mode === 'signup' ? 'Already have an account? Sign in' : 'New to Seam Media? Create an account'}</button>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
