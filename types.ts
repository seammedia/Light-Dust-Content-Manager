export interface Post {
  id: string;
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