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

export type ClientHealthConfidence = 'low' | 'medium' | 'high';
export type ClientIssueSeverity = 'none' | 'watch' | 'concern' | 'critical';
export type ClientPaymentStatus = 'unknown' | 'current' | 'overdue';
export type ClientOnboardingStatus = 'not_started' | 'in_progress' | 'complete' | 'blocked';
export type ClientRenewalSignal = 'unknown' | 'positive' | 'neutral' | 'negative';

export interface AgencyCurrentClient {
  id: string;
  name: string;
  contact_name?: string | null;
  plan_name?: string | null;
  provisioning_status?: 'pending_intake' | 'active' | 'paused' | 'cancelled';
  subscription_status?: string | null;
  monthly_value?: number | null;
  monthly_value_source: 'health' | 'lead' | 'plan' | 'missing';
  start_date?: string | null;
  relationship_health: number;
  health_note?: string | null;
  confidence: ClientHealthConfidence;
  last_meaningful_contact?: string | null;
  next_action?: string | null;
  next_action_due?: string | null;
  open_issue?: string | null;
  issue_severity: ClientIssueSeverity;
  payment_status: ClientPaymentStatus;
  onboarding_status: ClientOnboardingStatus;
  renewal_signal: ClientRenewalSignal;
  scope_pressure: boolean;
  performance_concern: boolean;
  positive_feedback_at?: string | null;
  internal_notes?: string | null;
  delivery: {
    total: number;
    outstanding: number;
    posted: number;
    awaiting: number;
    in_progress: number;
  };
  analytics: {
    last_sent_at?: string | null;
  };
  churn_risk: number;
  risk_level: 'low' | 'watch' | 'high' | 'critical';
  risk_reasons: string[];
  updated_at?: string | null;
}

export type AgencyClientHealthUpdate = Pick<AgencyCurrentClient,
  | 'id'
  | 'monthly_value'
  | 'start_date'
  | 'relationship_health'
  | 'health_note'
  | 'confidence'
  | 'last_meaningful_contact'
  | 'next_action'
  | 'next_action_due'
  | 'open_issue'
  | 'issue_severity'
  | 'payment_status'
  | 'onboarding_status'
  | 'renewal_signal'
  | 'scope_pressure'
  | 'performance_concern'
  | 'positive_feedback_at'
  | 'internal_notes'
>;

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
