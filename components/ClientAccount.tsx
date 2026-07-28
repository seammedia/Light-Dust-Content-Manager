import { useEffect, useState } from 'react';
import { Building2, Check, Loader2, Palette, Upload } from 'lucide-react';
import { Client } from '../types';
import { supabase } from '../services/supabaseClient';

interface ClientAccountProps {
  client: Client;
  onSaved: (client: Client) => void;
}

interface AccountFormState {
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
  businessDescription: string;
  brandMission: string;
  brandTone: string;
  brandKeywords: string;
  primaryFont: string;
  secondaryFont: string;
  brandColors: string[];
  logoUrl: string;
}

function formFromClient(client: Client): AccountFormState {
  return {
    name: client.name || '',
    contactName: client.contact_name || '',
    contactEmail: client.contact_email || '',
    contactPhone: client.contact_phone || '',
    websiteUrl: client.website_url || '',
    businessDescription: client.business_description || '',
    brandMission: client.brand_mission || '',
    brandTone: client.brand_tone || '',
    brandKeywords: (client.brand_keywords || []).join(', '),
    primaryFont: client.primary_font || '',
    secondaryFont: client.secondary_font || '',
    brandColors: client.brand_colors || [],
    logoUrl: client.logo_url || '',
  };
}

const fieldClassName = 'mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/20';

export function ClientAccount({ client, onSaved }: ClientAccountProps) {
  const [form, setForm] = useState<AccountFormState>(() => formFromClient(client));
  const [colourInput, setColourInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => setForm(formFromClient(client)), [client]);

  const updateField = <K extends keyof AccountFormState>(field: K, value: AccountFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage('');
  };

  const addColour = () => {
    const value = colourInput.trim().toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(value) || form.brandColors.includes(value)) return;
    updateField('brandColors', [...form.brandColors, value]);
    setColourInput('');
  };

  const uploadLogo = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      setMessage('Please choose an image smaller than 5 MB.');
      return;
    }
    setUploadingLogo(true);
    setMessage('');
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${client.id}/brand-logo-${Date.now()}.${extension}`;
      const { error } = await supabase.storage.from('post-images').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('post-images').getPublicUrl(path);
      updateField('logoUrl', data.publicUrl);
    } catch (error) {
      console.error('Logo upload failed:', error);
      setMessage('The logo could not be uploaded. Please try again.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    const updates = {
      name: form.name.trim(),
      brand_name: form.name.trim(),
      contact_name: form.contactName.trim(),
      contact_email: form.contactEmail.trim(),
      contact_phone: form.contactPhone.trim(),
      website_url: form.websiteUrl.trim(),
      business_description: form.businessDescription.trim(),
      brand_mission: form.brandMission.trim(),
      brand_tone: form.brandTone.trim(),
      brand_keywords: form.brandKeywords.split(',').map((keyword) => keyword.trim()).filter(Boolean),
      primary_font: form.primaryFont.trim(),
      secondary_font: form.secondaryFont.trim(),
      brand_colors: form.brandColors,
      logo_url: form.logoUrl,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('clients').update(updates).eq('id', client.id).select('*').single();
    if (error) {
      console.error('Account update failed:', error);
      setMessage('Your changes could not be saved. Please try again.');
    } else {
      onSaved(data as Client);
      setMessage('Account details saved.');
    }
    setSaving(false);
  };

  return (
    <form onSubmit={save} className="mx-auto w-full max-w-5xl space-y-6 p-5 sm:p-7 lg:p-8">
      <div>
        <p className="text-sm font-medium text-brand-green">Account & brand</p>
        <h2 className="mt-1 font-serif text-3xl font-bold text-brand-dark">Keep your business details current</h2>
        <p className="mt-2 max-w-2xl text-stone-500">These details guide content creation and reduce the need for follow-up questions.</p>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3"><Building2 className="h-5 w-5 text-brand-green" /><h3 className="text-lg font-semibold text-brand-dark">Business details</h3></div>
        <div className="grid gap-5 md:grid-cols-2">
          <label className="text-sm font-medium text-stone-700">Business name<input required value={form.name} onChange={(event) => updateField('name', event.target.value)} className={fieldClassName} /></label>
          <label className="text-sm font-medium text-stone-700">Website<input type="url" value={form.websiteUrl} onChange={(event) => updateField('websiteUrl', event.target.value)} placeholder="https://yourbusiness.com.au" className={fieldClassName} /></label>
          <label className="text-sm font-medium text-stone-700">Primary contact<input value={form.contactName} onChange={(event) => updateField('contactName', event.target.value)} className={fieldClassName} /></label>
          <label className="text-sm font-medium text-stone-700">Contact email<input type="email" value={form.contactEmail} onChange={(event) => updateField('contactEmail', event.target.value)} className={fieldClassName} /></label>
          <label className="text-sm font-medium text-stone-700">Contact phone<input type="tel" value={form.contactPhone} onChange={(event) => updateField('contactPhone', event.target.value)} className={fieldClassName} /></label>
          <label className="text-sm font-medium text-stone-700 md:col-span-2">What your business does<textarea rows={4} value={form.businessDescription} onChange={(event) => updateField('businessDescription', event.target.value)} className={fieldClassName} /></label>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3"><Palette className="h-5 w-5 text-brand-green" /><h3 className="text-lg font-semibold text-brand-dark">Brand profile</h3></div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-stone-700">Logo</p>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <div className="flex h-24 w-40 items-center justify-center overflow-hidden rounded-xl border border-dashed border-stone-300 bg-stone-50 p-3">
                {form.logoUrl ? <img src={form.logoUrl} alt={`${form.name} logo`} className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-stone-400">No logo uploaded</span>}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-brand-green hover:text-brand-green">
                {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploadingLogo ? 'Uploading…' : 'Upload logo'}
                <input type="file" accept="image/*" className="hidden" disabled={uploadingLogo} onChange={(event) => uploadLogo(event.target.files?.[0])} />
              </label>
            </div>
          </div>
          <label className="text-sm font-medium text-stone-700">Primary font<input value={form.primaryFont} onChange={(event) => updateField('primaryFont', event.target.value)} placeholder="e.g. Lato" className={fieldClassName} /></label>
          <label className="text-sm font-medium text-stone-700">Secondary font<input value={form.secondaryFont} onChange={(event) => updateField('secondaryFont', event.target.value)} placeholder="e.g. Playfair Display" className={fieldClassName} /></label>
          <div className="text-sm font-medium text-stone-700 md:col-span-2"><p>Brand colours</p><div className="mt-2 flex flex-wrap gap-2">{form.brandColors.map((colour) => <button key={colour} type="button" onClick={() => updateField('brandColors', form.brandColors.filter((item) => item !== colour))} className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600" title={`Remove ${colour}`}><span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: colour }} />{colour} ×</button>)}</div><div className="mt-2 flex max-w-sm gap-2"><input aria-label="Add brand colour" value={colourInput} onChange={(event) => setColourInput(event.target.value)} placeholder="#1F4D3A" className={fieldClassName.replace('mt-1.5 ', '')} /><button type="button" onClick={addColour} className="rounded-lg border border-stone-300 px-4 text-sm font-semibold hover:border-brand-green hover:text-brand-green">Add</button></div></div>
          <label className="text-sm font-medium text-stone-700 md:col-span-2">Brand mission<textarea rows={3} value={form.brandMission} onChange={(event) => updateField('brandMission', event.target.value)} className={fieldClassName} /></label>
          <label className="text-sm font-medium text-stone-700 md:col-span-2">Tone of voice<textarea rows={3} value={form.brandTone} onChange={(event) => updateField('brandTone', event.target.value)} placeholder="Friendly, confident, practical…" className={fieldClassName} /></label>
          <label className="text-sm font-medium text-stone-700 md:col-span-2">Keywords<input value={form.brandKeywords} onChange={(event) => updateField('brandKeywords', event.target.value)} placeholder="Comma-separated brand and industry terms" className={fieldClassName} /></label>
        </div>
      </section>

      <div className="sticky bottom-4 flex items-center justify-end gap-3 rounded-xl border border-stone-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        {message && <p className={`mr-auto text-sm ${message.includes('saved') ? 'text-emerald-700' : 'text-red-600'}`}>{message}</p>}
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
