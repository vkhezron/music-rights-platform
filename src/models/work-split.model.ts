import { RightsHolder } from './rights-holder.model';
export type SplitType = 'ip' | 'neighboring';

export interface WorkSplit {
  id?: string;
  work_id: string;
  rights_holder_id: string;
  rights_holder?: RightsHolder;
  split_type: SplitType; // NEW: Distinguishes IP vs Neighboring
  role: SplitRole;
  ownership_percentage: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type SplitRole = 
  // IP Rights roles
  | 'writer'
  | 'composer'
  | 'lyricist'
  | 'arranger'
  | 'publisher'
  // Neighboring Rights roles
  | 'artist'
  | 'performer'
  | 'producer'
  | 'master_owner'
  | 'record_label'
  | 'studio_owner'
  | 'engineer'
  | 'other';

export interface WorkSplitFormData {
  rights_holder_id: string;
  split_type: SplitType;
  role: SplitRole;
  ownership_percentage: number;
  notes?: string;
}

// IP Rights Roles (Copyright - Musical Work)
export const IP_ROLES = [
  { value: 'writer', label: 'Writer' },
  { value: 'composer', label: 'Composer' },
  { value: 'lyricist', label: 'Lyricist' },
  { value: 'arranger', label: 'Arranger' },
  { value: 'publisher', label: 'Publisher' }
] as const;

// Neighboring Rights Roles (Master Recording)
export const NEIGHBORING_ROLES = [
  { value: 'artist', label: 'Artist/Performer' },
  { value: 'performer', label: 'Featured Performer' },
  { value: 'producer', label: 'Producer' },
  { value: 'master_owner', label: 'Master Owner' },
  { value: 'record_label', label: 'Record Label' },
  { value: 'studio_owner', label: 'Studio Owner' },
  { value: 'engineer', label: 'Recording/Mix Engineer' }
] as const;

export const ALL_ROLES = [...IP_ROLES, ...NEIGHBORING_ROLES, { value: 'other', label: 'Other' }];
