export interface Client {
  id: string;
  name: string;
  pin: string;
  brand_name: string;
  brand_mission?: string;
  brand_tone?: string;
  brand_keywords?: string[];
  meta_page_id?: string;
  meta_access_token?: string;
  instagram_account_id?: string;
  meta_token_expires_at?: string;
  auto_post_enabled?: boolean;
  auto_post_to_facebook?: boolean;
  auto_post_to_instagram?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  client_id: string;
  title: string;
  imageDescription: string;
  imageUrl?: string; // URL or base64
  status: 'Draft' | 'Generated' | 'For Approval' | 'Approved' | 'Posted';
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