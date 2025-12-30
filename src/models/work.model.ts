// ============================================
// WORK MODELS & CONSTANTS
// ============================================

export interface Work {
  id: string;
  workspace_id: string;
  work_title: string;
  alternative_titles?: string[];
  
  // Identification codes
  isrc?: string;
  iswc?: string;
  
  // Work details
  duration_seconds?: number;
  languages?: string[];
  genre?: string;
  
  // Dates
  recording_date?: string;
  release_date?: string;
  
  // Cover version information
  is_cover_version: boolean;
  original_work_title?: string;
  original_work_isrc?: string;
  original_work_iswc?: string;
  original_work_info?: string;
  
  // Status and notes
  status: 'draft' | 'registered' | 'published' | 'archived';
  notes?: string;
  
  // Primary rights holder requirement
  primary_rights_holder_id?: string;
  
  // AI Disclosure sections
  ai_disclosures?: {
    ip?: AIDisclosure;           // Intellectual property
    mixing?: AIDisclosure;       // Mixing/Production
    mastering?: AIDisclosure;    // Mastering
    session_musicians?: AIDisclosure;
    visuals?: AIDisclosure;
  };
  
  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkFormData {
  work_title: string;
  alternative_titles?: string[];
  isrc?: string;
  iswc?: string;
  duration_seconds?: number;
  languages?: string[];
  genre?: string;
  recording_date?: string;
  release_date?: string;
  is_cover_version: boolean;
  original_work_title?: string;
  original_work_isrc?: string;
  original_work_iswc?: string;
  original_work_info?: string;
  status: 'draft' | 'registered' | 'published' | 'archived';
  notes?: string;
  
  // Primary rights holder requirement
  primary_rights_holder_id?: string;
  
  // AI Disclosure sections
  ai_disclosures?: {
    ip?: AIDisclosure;
    mixing?: AIDisclosure;
    mastering?: AIDisclosure;
    session_musicians?: AIDisclosure;
    visuals?: AIDisclosure;
  };
}

// ============================================
// AI DISCLOSURE
// ============================================

export interface AIDisclosure {
  creation_type: 'human' | 'ai_assisted' | 'ai_generated';
  ai_tool?: string;     // Suno, Udio, ChatGPT, Midjourney, etc.
  notes?: string;
}

// Split types
export type SplitType = 
  | 'lyrics' 
  | 'music' 
  | 'performance' 
  | 'master_recording' 
  | 'publishing' 
  | 'neighboring_rights';

export interface WorkSplit {
  id: string;
  work_id: string;
  rights_holder_id: string;
  split_type: SplitType;
  percentage: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// AI TOOLS & LABELS
// ============================================

export const AI_TOOLS = [
  { name: 'Suno', category: 'Music Generation' },
  { name: 'Udio', category: 'Music Generation' },
  { name: 'Stable Audio', category: 'Music Generation' },
  { name: 'ChatGPT', category: 'Text/Lyrics' },
  { name: 'Midjourney', category: 'Visual' },
  { name: 'Stable Diffusion', category: 'Visual' },
  { name: 'DALL-E', category: 'Visual' },
  { name: 'Other', category: 'Other' }
];

export const CREATION_TYPE_LABELS = {
  'human': '100% Human Created',
  'ai_assisted': 'AI-Assisted (Human + AI)',
  'ai_generated': 'AI-Generated (No Human Creation)'
};