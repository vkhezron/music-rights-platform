// ============================================
// PROTOCOL MODELS & TYPES
// ============================================
// Represents the Musical Works Protocol form system
// Based on DUMA protocol structure for music rights management

// ============ ROLES/PROFESSIONS ============
export type ProtocolRoleKind = 
  | 'lyricist' 
  | 'composer' 
  | 'arranger' 
  | 'performer' 
  | 'conductor' 
  | 'producer' 
  | 'engineer' 
  | 'mixer'
  | 'other';

export interface ProtocolRole {
  value: ProtocolRoleKind;
  label: string;
}

export const PROTOCOL_ROLES: ProtocolRole[] = [
  { value: 'lyricist', label: 'Lyricist' },
  { value: 'composer', label: 'Composer' },
  { value: 'arranger', label: 'Arranger' },
  { value: 'performer', label: 'Performer' },
  { value: 'conductor', label: 'Conductor' },
  { value: 'producer', label: 'Producer' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'mixer', label: 'Mixer' },
  { value: 'other', label: 'Other' }
];

// ============ AUTHOR TYPES ============
export interface LyricAuthor {
  id?: string;
  protocol_id?: string;
  name: string;
  middle_name?: string;
  surname: string;
  aka?: string;
  cmo_name?: string;
  pro_name?: string;
  participation_percentage: number;
  created_at?: string;
}

export interface MusicAuthor {
  id?: string;
  protocol_id?: string;
  name: string;
  middle_name?: string;
  surname: string;
  aka?: string;
  cmo_name?: string;
  pro_name?: string;
  participation_percentage: number;
  melody: boolean;
  harmony: boolean;
  arrangement: boolean;
  created_at?: string;
}

export interface NeighbouringRightsholder {
  id?: string;
  protocol_id?: string;
  name: string;
  middle_name?: string;
  surname: string;
  aka?: string;
  cmo_name?: string;
  pro_name?: string;
  participation_percentage: number;
  roles: ProtocolRoleKind[]; // Can have multiple roles
  created_at?: string;
}

// ============ WORK METADATA ============
export interface ProtocolWorkMetadata {
  work_title: string;
  alternative_title?: string;
  release_title?: string;
  isrc?: string;
  iswc?: string;
  ean?: string;
  primary_language?: string;
  secondary_language?: string;
  is_cover_version: boolean;
  original_work_title?: string;
}

// ============ MAIN PROTOCOL ============
export interface Protocol {
  id: string;
  workspace_id: string;
  work_id: string;
  
  // Work metadata
  work_title: string;
  alternative_title?: string;
  release_title?: string;
  isrc?: string;
  iswc?: string;
  ean?: string;
  primary_language?: string;
  secondary_language?: string;
  is_cover_version: boolean;
  original_work_title?: string;
  
  // Status
  status: 'draft' | 'submitted' | 'approved' | 'archived';
  
  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
}

export interface ProtocolFormData {
  work_title: string;
  alternative_title?: string;
  release_title?: string;
  isrc?: string;
  iswc?: string;
  ean?: string;
  primary_language?: string;
  secondary_language?: string;
  is_cover_version: boolean;
  original_work_title?: string;
  
  lyric_authors: LyricAuthor[];
  music_authors: MusicAuthor[];
  neighbouring_rightsholders: NeighbouringRightsholder[];
}

// ============ FORM STATE ============
export interface ProtocolFormState {
  // Work info
  work_title: string;
  alternative_title: string;
  release_title: string;
  isrc: string;
  iswc: string;
  ean: string;
  primary_language: string;
  secondary_language: string;
  is_cover_version: boolean;
  original_work_title: string;
  
  // Author collections
  lyric_authors: LyricAuthor[];
  music_authors: MusicAuthor[];
  neighbouring_rightsholders: NeighbouringRightsholder[];
}

// ============ UI HELPER TYPES ============
export interface AuthorFormGroup {
  name: string;
  middle_name: string;
  surname: string;
  aka: string;
  cmo_name: string;
  pro_name: string;
  participation_percentage: string;
}

export interface MusicAuthorFormGroup extends AuthorFormGroup {
  melody: boolean;
  harmony: boolean;
  arrangement: boolean;
}

export interface NeighbouringFormGroup extends AuthorFormGroup {
  roles: ProtocolRoleKind[];
}
