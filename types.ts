export interface Client {
  id: string;
  name: string;
  pin: string;
  brand_name: string;
  brand_mission?: string;
  brand_tone?: string;
  brand_keywords?: string[];
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