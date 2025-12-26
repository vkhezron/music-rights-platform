export interface RightsHolder {
  id: string;
  workspace_id: string;
  type: 'person' | 'company';
  kind: RightsHolderKind;
  
  // Personal info
  first_name?: string;
  last_name?: string;
  
  // Company info
  company_name?: string;
  
  // Contact
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postal_code?: string;
  
  // Professional
  cmo_pro?: string;
  ipi_number?: string;
  isni?: string;
  tax_id?: string;
  
  // Platform
  linked_user_id?: string;
  
  // Notes
  notes?: string;
  
  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type RightsHolderKind = 
  | 'author'
  | 'composer'
  | 'artist'
  | 'producer'
  | 'publisher'
  | 'label'
  | 'arranger'
  | 'translator'
  | 'other';

export interface RightsHolderFormData {
  type: 'person' | 'company';
  kind: RightsHolderKind;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postal_code?: string;
  cmo_pro?: string;
  ipi_number?: string;
  isni?: string;
  tax_id?: string;
  notes?: string;
}

export const RIGHTS_HOLDER_KINDS: { value: RightsHolderKind; label: string }[] = [
  { value: 'author', label: 'Author / Lyricist' },
  { value: 'composer', label: 'Composer' },
  { value: 'artist', label: 'Performing Artist' },
  { value: 'producer', label: 'Producer' },
  { value: 'publisher', label: 'Publisher' },
  { value: 'label', label: 'Record Label' },
  { value: 'arranger', label: 'Arranger' },
  { value: 'translator', label: 'Translator' },
  { value: 'other', label: 'Other' }
];

export const CMO_PRO_OPTIONS = [
  'ASCAP', 'BMI', 'SESAC', 'GMR', // USA
  'GEMA', 'SUISA', // Germany, Switzerland
  'SACEM', // France
  'PRS', 'PPL', // UK
  'SGAE', // Spain
  'SIAE', // Italy
  'SOCAN', // Canada
  'APRA', 'AMCOS', // Australia
  'JASRAC', // Japan
  'KOMCA', // South Korea
  'UACRR', // Ukraine
  'Other'
];