export interface Work {
  id: string;
  workspace_id: string;
  work_title: string;
  alternative_titles?: string[];
  isrc?: string;
  iswc?: string;
  duration_seconds?: number;
  languages?: string[];
  genre?: string;
  subgenre?: string;
  recording_date?: string;
  release_date?: string;
  is_cover: boolean;
  is_derivative: boolean;
  is_public_domain: boolean;
  original_work_title?: string;
  original_work_id?: string;
  status: WorkStatus;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type WorkStatus = 'draft' | 'complete' | 'registered' | 'archived';

export interface WorkFormData {
  work_title: string;
  alternative_titles?: string[];
  isrc?: string;
  iswc?: string;
  duration_seconds?: number;
  languages?: string[];
  genre?: string;
  subgenre?: string;
  recording_date?: string;
  release_date?: string;
  is_cover: boolean;
  is_derivative: boolean;
  is_public_domain: boolean;
  original_work_title?: string;
  notes?: string;
}

export interface WorkSplit {
  id: string;
  work_id: string;
  rights_holder_id: string;
  split_type: SplitType;
  percentage: number;
  notes?: string;
  version: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type SplitType = 'lyric' | 'music' | 'performance' | 'master' | 'publishing' | 'neighboring';

export const WORK_STATUSES: { value: WorkStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: '#718096' },
  { value: 'complete', label: 'Complete', color: '#48bb78' },
  { value: 'registered', label: 'Registered', color: '#667eea' },
  { value: 'archived', label: 'Archived', color: '#a0aec0' }
];

export const MUSIC_GENRES = [
  'Pop', 'Rock', 'Hip Hop', 'R&B', 'Electronic', 'Jazz', 'Classical',
  'Country', 'Folk', 'Latin', 'Reggae', 'Blues', 'Metal', 'Punk',
  'Indie', 'Alternative', 'Soul', 'Funk', 'Gospel', 'World', 'Other'
];