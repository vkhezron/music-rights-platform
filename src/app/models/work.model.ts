// ============================================
// WORK MODELS & CONSTANTS
// ============================================

import { WorkCreationDeclaration } from './work-creation-declaration.model';

export interface Work {
  id: string;
  workspace_id: string;
  work_title: string;
  alternative_titles?: string[];
  catalog_number?: string;
  ean?: string;
  
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
  ai_disclosures?: WorkCreationDeclaration[];
  
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
  catalog_number?: string;
  ean?: string;
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
  ai_disclosures?: WorkCreationDeclaration[];
}

// Split types
export type SplitType = 
  | 'lyrics' 
  | 'music' 
  | 'performance' 
  | 'master_recording' 
  | 'publishing' 
  | 'neighboring_rights';

export interface ContributionTypes {
  melody?: boolean;
  harmony?: boolean;
  arrangement?: boolean;
}

export interface WorkSplit {
  id: string;
  work_id: string;
  rights_holder_id: string;
  split_type: SplitType;
  ownership_percentage: number;
  percentage?: number;
  rights_layer?: 'ip' | 'neighboring';
  contribution_types?: ContributionTypes | null;
  roles?: string[] | null;
  notes?: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}