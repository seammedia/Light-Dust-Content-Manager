import React, { useEffect, useState } from 'react';
import { Check, Leaf, Loader2, Upload } from 'lucide-react';
import { Client } from '../types';
import { getAuthSession } from '../services/authClient';
import { recoverPaidOnboarding } from '../services/onboardingRecovery';
import { supabase } from '../services/supabaseClient';
import { uploadImage } from '../services/storageService';

const PLATFORM_OPTIONS = ['Instagram', 'Facebook', 'LinkedIn', 'TikTok'];

export function SelfServeOnboarding() {
  const [client, setClient] = useState<Client | null>(null);
  const [userId, setUserId] = useState('');
  const [waiting, setWaiting] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    businessName: '', contactName: '', contactEmail: '', contactPhone: '', website: '',
    businessDescription: '', targetAudience: '', goals: '', tone: '', brandKeywords: '',
    brandColours: '', primaryFont: '', secondaryFont: '', contentNotes: '', platforms: ['Instagram', 'Facebook'],
  });

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let attempts = 0;
    let recoveryAttempted = false;
    const load = async () => {
      const session = await getAuthSession();
      if (!session?.user) { window.location.replace('/signup'); return; }
      if (cancelled) return;
      setUserId(session.user.id);
      const { data } = await supabase.from('clients').select('*').eq('owner_user_id', session.user.id).maybeSingle();
      if (cancelled) return;
      if (!data) {
        if (!recoveryAttempted) {
          recoveryAttempted = true;
          try {
            const result = await recoverPaidOnboarding(session);
            if (result.recovered && !cancelled) {
              timer = window.setTimeout(load, 250);
              return;
            }
          } catch (recoveryError) {
            if (!cancelled) {
              setWaiting(false);
              setError(recoveryError instanceof Error ? recoveryError.message : 'Your portal could not be prepared.');
            }
            return;
          }
        }
        attempts += 1;
        if (attempts < 30) timer = window.setTimeout(load, 1500);
        else { setWaiting(false); setError('We could not confirm a paid subscription for this email. Please sign in with the same email used at checkout or contact Seam Media.'); }
        return;
      }
      if (data.provisioning_status === 'active') { window.location.replace('/'); return; }
      setClient(data);
      setForm((current) => ({
        ...current,
        businessName: data.brand_name || data.name || '',
        contactName: data.contact_name || session.user.user_metadata?.full_name || '',
        contactEmail: data.contact_email || session.user.email || '',
        contactPhone: data.contact_phone || '',
        website: data.website_url || '',
        businessDescription: data.business_description || '',
        tone: data.brand_tone || '',
        brandKeywords: (data.brand_keywords || []).join(', '),
        brandColours: (data.brand_colors || []).join(', '),
        primaryFont: data.primary_font || '',
        secondaryFont: data.secondary_font || '',
      }));
      setWaiting(false);
    };
    load();
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); };
  }, []);

  function update(field: string, value: string | string[]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function togglePlatform(platform: string) {
    update('platforms', form.platforms.includes(platform) ? form.platforms.filter((item) => item !== platform) : [...form.platforms, platform]);
  }

  async function submit() {
    if (!client || !userId || !form.businessName.trim() || !form.contactName.trim() || !form.contactEmail.trim()) {
      setError('Business name, contact name and email are required.');
      return;
    }
    setSaving(true); setError('');
    try {
      let logoUrl = client.logo_url || null;
      if (logoFile) {
        if (logoFile.size > 5 * 1024 * 1024) throw new Error('Please choose a logo under 5 MB.');
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Could not read the logo file.'));
          reader.readAsDataURL(logoFile);
        });
        logoUrl = await uploadImage(dataUrl, client.id, `brand-logo-${Date.now()}`);
      }

      const brandKeywords = form.brandKeywords.split(',').map((value) => value.trim()).filter(Boolean).slice(0, 20);
      const brandColours = form.brandColours.split(',').map((value) => value.trim()).filter(Boolean).slice(0, 10);
      const onboardingAnswers = {
        target_audience: form.targetAudience.trim(),
        social_goals: form.goals.trim(),
        platforms: form.platforms,
        content_notes: form.contentNotes.trim(),
        submitted_at: new Date().toISOString(),
      };

      const { data, error: updateError } = await supabase.from('clients').update({
        name: form.businessName.trim(),
        brand_name: form.businessName.trim(),
        contact_name: form.contactName.trim(),
        contact_email: form.contactEmail.trim(),
        contact_phone: form.contactPhone.trim() || null,
        website_url: form.website.trim() || null,
        business_description: form.businessDescription.trim() || null,
        brand_tone: form.tone.trim() || null,
        brand_keywords: brandKeywords,
        brand_colors: brandColours,
        primary_font: form.primaryFont.trim() || null,
        secondary_font: form.secondaryFont.trim() || null,
        logo_url: logoUrl,
        onboarding_answers: onboardingAnswers,
        provisioning_status: 'active',
        onboarding_completed_at: new Date().toISOString(),
      }).eq('owner_user_id', userId).select('*').single();

      if (updateError || !data) throw new Error(updateError?.message || 'Could not save your details.');
      window.location.replace('/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save your details.');
      setSaving(false);
    }
  }

  if (waiting) return (
    <div className="min-h-screen bg-[#F5F5F0] grid place-items-center p-6 text-center">
      <div><Loader2 className="mx-auto h-9 w-9 animate-spin text-brand-green" /><h1 className="mt-5 font-serif text-2xl text-brand-dark">Preparing your portal…</h1><p className="mt-2 text-sm text-stone-500">Stripe is confirming your subscription. This usually takes only a few seconds.</p></div>
    </div>
  );

  if (!client) return <div className="min-h-screen bg-[#F5F5F0] grid place-items-center p-6"><div className="max-w-md rounded-xl bg-white p-8 text-center shadow"><p className="text-red-600">{error}</p><button onClick={() => window.location.reload()} className="mt-5 rounded-lg bg-brand-dark px-5 py-2 text-white">Refresh</button></div></div>;

  return (
    <div className="min-h-screen bg-[#F5F5F0] px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-7 text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-green text-white"><Leaf className="h-6 w-6" /></div><p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-green">Payment confirmed · {client.plan_name}</p><h1 className="mt-2 font-serif text-3xl text-brand-dark">Set up your brand</h1><p className="mt-2 text-stone-500">Give us the essentials once. You can update everything later from Account.</p></div>
        <div className="space-y-7 rounded-2xl border border-stone-200 bg-white p-6 shadow-xl sm:p-9">
          <Section title="Business details">
            <Field label="Business name *"><input value={form.businessName} onChange={(e) => update('businessName', e.target.value)} className="input" /></Field>
            <Field label="Website"><input value={form.website} onChange={(e) => update('website', e.target.value)} className="input" placeholder="https://" /></Field>
            <Field label="Contact name *"><input value={form.contactName} onChange={(e) => update('contactName', e.target.value)} className="input" /></Field>
            <Field label="Contact email *"><input type="email" value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} className="input" /></Field>
            <Field label="Contact phone"><input value={form.contactPhone} onChange={(e) => update('contactPhone', e.target.value)} className="input" /></Field>
            <Field label="What does your business do?" wide><textarea value={form.businessDescription} onChange={(e) => update('businessDescription', e.target.value)} className="input min-h-24" /></Field>
          </Section>

          <Section title="Brand kit">
            <Field label="Logo" wide><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 px-4 py-5 text-sm text-stone-500 hover:border-brand-green"><Upload className="h-4 w-4" />{logoFile ? logoFile.name : 'Upload PNG, JPG or WebP'}<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} /></label></Field>
            <Field label="Brand colours"><input value={form.brandColours} onChange={(e) => update('brandColours', e.target.value)} className="input" placeholder="#1A1A1A, #FFFFFF" /></Field>
            <Field label="Brand keywords"><input value={form.brandKeywords} onChange={(e) => update('brandKeywords', e.target.value)} className="input" placeholder="trusted, local, premium" /></Field>
            <Field label="Primary font"><input value={form.primaryFont} onChange={(e) => update('primaryFont', e.target.value)} className="input" placeholder="e.g. Lato" /></Field>
            <Field label="Secondary font"><input value={form.secondaryFont} onChange={(e) => update('secondaryFont', e.target.value)} className="input" /></Field>
            <Field label="Brand voice"><textarea value={form.tone} onChange={(e) => update('tone', e.target.value)} className="input min-h-20" placeholder="Friendly, professional, down-to-earth…" /></Field>
          </Section>

          <Section title="Social media goals">
            <Field label="Your audience"><textarea value={form.targetAudience} onChange={(e) => update('targetAudience', e.target.value)} className="input min-h-20" /></Field>
            <Field label="What should social media achieve?"><textarea value={form.goals} onChange={(e) => update('goals', e.target.value)} className="input min-h-20" /></Field>
            <Field label="Platforms" wide><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{PLATFORM_OPTIONS.map((platform) => <button key={platform} type="button" onClick={() => togglePlatform(platform)} className={`rounded-xl border px-3 py-2 text-sm ${form.platforms.includes(platform) ? 'border-brand-green bg-brand-green/10 text-brand-green' : 'border-stone-300 text-stone-500'}`}>{form.platforms.includes(platform) && <Check className="mr-1 inline h-3.5 w-3.5" />}{platform}</button>)}</div></Field>
            <Field label="Anything else we should know?" wide><textarea value={form.contentNotes} onChange={(e) => update('contentNotes', e.target.value)} className="input min-h-24" placeholder="Topics to avoid, offers to promote, approval preferences…" /></Field>
          </Section>

          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          <button type="button" onClick={submit} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green px-5 py-3.5 font-semibold text-white shadow disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{saving ? 'Saving your brand…' : 'Finish setup and open dashboard'}</button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="mb-4 font-serif text-xl text-brand-dark">{title}</h2><div className="grid gap-4 sm:grid-cols-2">{children}</div></section>;
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={`block text-sm font-medium text-stone-700 ${wide ? 'sm:col-span-2' : ''}`}><span className="mb-1.5 block">{label}</span>{children}</label>;
}
