export interface Client {
  id: string;
  name: string;
  pin: string;
  brand_name: string;
  brand_mission?: string;
  brand_tone?: string;
  brand_keywords?: string[];
  client_notes?: string; // Agency-only notes about the client
  reference_images?: string[]; // URLs of brand reference images for AI image generation
  brand_colors?: string[]; // Hex codes (e.g. ['#FF6600', '#1A1A1A']) - injected into image prompts
  brand_style_notes?: string; // Free-form style guide injected into image prompts (e.g. "clean minimal, warm lighting, no people")
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  website_url?: string;
  business_description?: string;
  logo_url?: string;
  primary_font?: string;
  secondary_font?: string;
  owner_user_id?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status?: string;
  plan_name?: string;
  stripe_checkout_session_id?: string;
  billing_cycle?: 'monthly' | 'annual';
  provisioning_status?: 'pending_intake' | 'active' | 'paused' | 'cancelled';
  offboarded_at?: string;
  offboarding_reason?: string;
  zernio_profile_id?: string;
  onboarding_answers?: Record<string, unknown>;
  onboarding_completed_at?: string;
  meta_page_id?: string;
  meta_access_token?: string;
  instagram_account_id?: string;
  meta_token_expires_at?: string;
  auto_post_enabled?: boolean;
  auto_post_to_facebook?: boolean;
  auto_post_to_instagram?: boolean;
  late_profile_ids?: string[]; // IDs of Late social profiles assigned to this client
  created_at: string;
  updated_at: string;
}

// Gmail OAuth settings (stored in localStorage for single sender)
export interface GmailSettings {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  email: string;
}

export type MediaType = 'image' | 'video';
export type ContentType = 'post' | 'reel' | 'story';

export interface Post {
  id: string;
  client_id: string;
  title: string;
  imageDescription: string;
  imageUrl?: string; // URL or base64 - used for both images and videos (primary/first image)
  imageUrls?: string[]; // Array of image URLs for carousel posts
  mediaType?: MediaType; // Type of media: 'image' or 'video'
  contentType?: ContentType; // Publishing format: feed post, reel, or story
  status: 'Client Idea' | 'Draft' | 'Generated' | 'For Approval' | 'Revision' | 'Approved' | 'Posted';
  generatedCaption?: string;
  generatedHashtags?: string[];
  date: string;
  notes?: string;
  latePostId?: string; // ID from Late API for rescheduling scheduled posts
}

export interface BrandContext {
  name: string;
  mission: string;
  tone: string;
  keywords: string[];
}

export interface GenerationResult {
  caption: string;
  hashtags: string[];
}
