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
  contact_name?: string;
  contact_email?: string;
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

export interface Post {
  id: string;
  client_id: string;
  title: string;
  imageDescription: string;
  imageUrl?: string; // URL or base64 - used for both images and videos
  mediaType?: MediaType; // Type of media: 'image' or 'video'
  status: 'Draft' | 'Generated' | 'For Approval' | 'Revision' | 'Approved' | 'Posted';
  generatedCaption?: string;
  generatedHashtags?: string[];
  date: string;
  notes?: string;
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