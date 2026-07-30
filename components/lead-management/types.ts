export type AgencyLeadStage =
  | 'new'
  | 'warm'
  | 'contacted_1'
  | 'contacted_2'
  | 'called'
  | 'call_booked'
  | 'interested'
  | 'proposal_sent'
  | 'on_hold'
  | 'onboarding_sent'
  | 'converted'
  | 'not_interested'
  | 'no_response'
  | 'not_qualified';

export interface AgencyLead {
  id: string;
  legacy_id?: string | null;
  client_id?: string | null;
  name: string;
  company: string;
  email?: string | null;
  phone?: string | null;
  stage: AgencyLeadStage;
  source: string;
  conversion_source?: string | null;
  source_platform?: string | null;
  source_campaign?: string | null;
  owner: string;
  conversion_probability: number;
  monthly_value?: number | null;
  lifetime_value?: number | null;
  churn_reason?: string | null;
  notes?: string | null;
  next_action?: string | null;
  last_contacted?: string | null;
  follow_up_at?: string | null;
  sign_on_date?: string | null;
  exit_date?: string | null;
  converted_at?: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
  client_status?: 'active' | 'paused' | 'cancelled';
  client?: {
    id: string;
    name: string;
    provisioning_status?: 'pending_intake' | 'active' | 'paused' | 'cancelled';
    subscription_status?: string | null;
    offboarded_at?: string | null;
    offboarding_reason?: string | null;
  } | null;
}

export interface AgencyMarketingPeriod {
  id: string;
  period_start: string;
  period_end: string;
  source: string;
  source_platform?: string | null;
  source_campaign?: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  conversions: number;
  conversion_revenue: number;
  lifetime_revenue: number;
  notes?: string | null;
  is_estimate: boolean;
}

export type OutreachDraftStatus = 'pending' | 'generating' | 'ready' | 'failed' | 'sent' | 'archived';

export interface OutreachDraft {
  id: string;
  agency_lead_id?: string | null;
  instagram_username: string;
  contact_name?: string | null;
  business_name: string;
  industry?: string | null;
  location?: string | null;
  profile_notes?: string | null;
  offer_focus?: string | null;
  graphic_direction?: string | null;
  graphic_headline?: string | null;
  graphic_prompt?: string | null;
  graphic_url?: string | null;
  message: string;
  status: OutreachDraftStatus;
  generation_error?: string | null;
  generation_attempts: number;
  sent_at?: string | null;
  created_at: string;
  updated_at: string;
}

export const LEAD_STAGES: Array<{ value: AgencyLeadStage; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'warm', label: 'Warm Lead' },
  { value: 'contacted_1', label: 'Contacted 1' },
  { value: 'contacted_2', label: 'Contacted 2' },
  { value: 'called', label: 'Called' },
  { value: 'call_booked', label: 'Call Booked' },
  { value: 'interested', label: 'Interested' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'onboarding_sent', label: 'Onboarding Sent' },
  { value: 'converted', label: 'Converted' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'no_response', label: 'No Response' },
  { value: 'not_qualified', label: 'Not Qualified' },
];

export const LEAD_SOURCES = [
  { value: 'meta_ads', label: 'Meta Ads' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
  { value: 'instagram', label: 'Instagram organic' },
  { value: 'facebook_organic', label: 'Facebook organic' },
  { value: 'linkedin', label: 'LinkedIn organic' },
  { value: 'email', label: 'Email' },
  { value: 'existing_client', label: 'Existing client' },
  { value: 'prospecting', label: 'Prospecting' },
  { value: 'networking', label: 'Networking' },
  { value: 'manual', label: 'Manual' },
  { value: 'other', label: 'Other' },
];

export const STAGE_LABELS = Object.fromEntries(LEAD_STAGES.map((stage) => [stage.value, stage.label])) as Record<AgencyLeadStage, string>;

export const STAGE_STYLES: Record<AgencyLeadStage, string> = {
  new: 'bg-stone-100 text-stone-700',
  warm: 'bg-orange-100 text-orange-800',
  contacted_1: 'bg-amber-100 text-amber-800',
  contacted_2: 'bg-pink-100 text-pink-800',
  called: 'bg-purple-100 text-purple-800',
  call_booked: 'bg-violet-100 text-violet-800',
  interested: 'bg-blue-100 text-blue-800',
  proposal_sent: 'bg-cyan-100 text-cyan-800',
  on_hold: 'bg-yellow-100 text-yellow-800',
  onboarding_sent: 'bg-teal-100 text-teal-800',
  converted: 'bg-emerald-100 text-emerald-800',
  not_interested: 'bg-red-100 text-red-700',
  no_response: 'bg-stone-200 text-stone-600',
  not_qualified: 'bg-slate-200 text-slate-700',
};
