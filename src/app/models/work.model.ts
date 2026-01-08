// ============================================
// WORK MODELS & CONSTANTS
// ============================================

import { WorkCreationDeclaration, WorkCreationDeclarationDraft } from './work-creation-declaration.model';

export type WorkType = 'standard' | 'instrumental' | 'remix';

export interface WorkOriginalReference {
  title: string;
  isrc?: string | null;
  iswc?: string | null;
  additional_info?: string | null;
}

export interface WorkLanguageSelection {
  language: string;
  iso_639_1: string | null;
  iso_639_3: string | null;
  is_custom?: boolean;
}

export interface Work {
  id: string;
  workspace_id: string;
  work_title: string;
  release_title?: string;
  alternative_titles?: string[];
  catalog_number?: string;
  ean?: string;
  
  // Identification codes
  isrc?: string;
  iswc?: string;
  
  // Work details
  duration_seconds?: number;
  languages?: string[];
  primary_languages?: WorkLanguageSelection[] | null;
  secondary_languages?: WorkLanguageSelection[] | null;
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
  work_type: WorkType;
  is_100_percent_human?: boolean;
  uses_sample_libraries?: boolean;
  sample_library_names?: string | null;
  has_commercial_license?: boolean;
  original_works?: WorkOriginalReference[] | null;
  
  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkFormData {
  work_title: string;
  release_title?: string;
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
  ai_disclosures?: WorkCreationDeclarationDraft[];
  work_type: WorkType;
  is_100_percent_human?: boolean;
  uses_sample_libraries?: boolean;
  sample_library_names?: string | null;
  has_commercial_license?: boolean;
  original_works?: WorkOriginalReference[] | null;
  primary_languages?: WorkLanguageSelection[] | null;
  secondary_languages?: WorkLanguageSelection[] | null;
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

export interface WorkChangeRecord {
  id: string;
  work_id: string;
  split_id?: string | null;
  entity_type: 'work' | 'split';
  change_type: string;
  field_changed?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  notes?: string | null;
  change_summary?: string | null;
  changed_by?: string | null;
  changed_at: string;
  changed_by_nickname?: string | null;
  changed_by_display_name?: string | null;
}