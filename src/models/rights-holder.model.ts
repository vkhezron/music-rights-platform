// ============================================
// RIGHTS HOLDER TYPES & ORGANIZATION ROLES
// ============================================

// Support both old 'company' and new 'organization' for backward compatibility
export type RightsHolderType = 'person' | 'organization' | 'company';

export type OrganizationRole = 
  // Global
  'assignee' | 'licensee' |
  // EU / UK / Australia
  'administrator' |
  // US only
  'work_for_hire_purchaser';

export type Jurisdiction = 'EU' | 'UK' | 'AUS' | 'US' | 'other';

// ============================================
// RIGHTS HOLDER INTERFACE
// ============================================

export interface RightsHolder {
  id: string;
  workspace_id: string;
  
  // Type classification
  type: RightsHolderType;
  kind: RightsHolderKind;
  
  // Primary indicator
  is_primary?: boolean;
  
  // Privacy-first identity
  // DEPRECATED (kept for migration): first_name, last_name, phone
  first_name?: string;  // @deprecated - use nickname instead
  last_name?: string;   // @deprecated - use nickname instead
  phone?: string;       // @deprecated - removed for privacy
  
  // NEW: Nickname & Social
  nickname?: string;    // @username format, unique
  display_name?: string; // Stage/public name for surfaces
  avatar_url?: string;
  bio?: string;
  social_links?: {
    instagram?: string;   // @username or profile URL
    spotify?: string;     // artist ID or URL
    apple_music?: string; // artist link
    youtube?: string;     // channel URL
    tiktok?: string;      // @username
    website?: string;     // full URL
  };
  
  // Organization info (for type='organization' or deprecated type='company')
  company_name?: string;  // @deprecated - use organization_name instead
  organization_name?: string;
  organization_role?: OrganizationRole;
  jurisdiction?: Jurisdiction;
  
  // Contact & Professional
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  postal_code?: string;
  
  // Professional identifiers (verified)
  cmo_pro?: string;
  ipi_number?: string;
  isni?: string;
  tax_id?: string;
  
  // Visibility & Privacy
  visibility_settings?: {
    show_nickname?: boolean;      // default: true
    show_bio?: boolean;           // default: true
    show_country?: boolean;       // default: true
    show_social?: boolean;        // default: true
    show_ipi?: boolean;           // default: false
    show_email?: boolean;         // default: false (never public)
  };
  
  // AI Disclosure (per rights holder)
  ai_disclosure?: {
    creation_type: 'human' | 'ai_assisted' | 'ai_generated';
    ai_tool?: string;
    notes?: string;
  };
  
  // Platform
  linked_user_id?: string;
  profile_id?: string;  // UUID linking to auth.users(id) for registered users
  
  // Notes (internal use only)
  notes?: string;
  
  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// RIGHTS HOLDER KINDS (ROLES)
// ============================================

export type RightsHolderKind = 
  | 'author'       // Lyricist
  | 'composer'     // Music composer
  | 'artist'       // Performing artist
  | 'producer'     // Producer
  | 'publisher'    // Publisher
  | 'label'        // Record label
  | 'arranger'     // Arranger
  | 'translator'   // Translator
  | 'engineer'     // Sound engineer / mixing
  | 'mastering'    // Mastering engineer
  | 'other';

// ============================================
// FORM DATA STRUCTURE
// ============================================

export interface RightsHolderFormData {
  type: RightsHolderType;
  kind: RightsHolderKind;
  is_primary?: boolean;
  
  // Person fields (deprecated)
  first_name?: string;
  last_name?: string;
  
  // Privacy-first person fields
  nickname?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  social_links?: {
    instagram?: string;
    spotify?: string;
    apple_music?: string;
    youtube?: string;
    tiktok?: string;
    website?: string;
  };
  
  // Organization fields
  company_name?: string;  // @deprecated - use organization_name instead
  organization_name?: string;
  organization_role?: OrganizationRole;
  jurisdiction?: Jurisdiction;
  
  // Contact
  email?: string;
  phone?: string;        // @deprecated - removed for privacy
  address?: string;
  city?: string;
  country?: string;
  postal_code?: string;
  
  // Professional
  cmo_pro?: string;
  ipi_number?: string;
  isni?: string;
  tax_id?: string;
  
  // Visibility
  visibility_settings?: RightsHolder['visibility_settings'];
  
  // AI Disclosure (per rights holder)
  ai_disclosure?: {
    creation_type: 'human' | 'ai_assisted' | 'ai_generated';
    ai_tool?: string;
    notes?: string;
  };
  
  notes?: string;
}

// ============================================
// CONSTANTS & OPTIONS
// ============================================

export const RIGHTS_HOLDER_KINDS: { value: RightsHolderKind; label: string }[] = [
  { value: 'author', label: 'Author / Lyricist' },
  { value: 'composer', label: 'Composer' },
  { value: 'artist', label: 'Performing Artist' },
  { value: 'producer', label: 'Producer' },
  { value: 'publisher', label: 'Publisher' },
  { value: 'label', label: 'Record Label' },
  { value: 'arranger', label: 'Arranger' },
  { value: 'translator', label: 'Translator' },
  { value: 'engineer', label: 'Sound Engineer' },
  { value: 'mastering', label: 'Mastering Engineer' },
  { value: 'other', label: 'Other' }
];

export const ORGANIZATION_ROLES_EU_UK_AUS: OrganizationRole[] = [
  'assignee',
  'licensee',
  'administrator'
];

export const ORGANIZATION_ROLES_US: OrganizationRole[] = [
  'assignee',
  'licensee',
  'work_for_hire_purchaser'
];

export const ORGANIZATION_ROLES_OTHER: OrganizationRole[] = [
  'assignee',
  'licensee'
];

export const JURISDICTION_OPTIONS: { value: Jurisdiction; label: string }[] = [
  { value: 'EU', label: 'European Union' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'AUS', label: 'Australia' },
  { value: 'US', label: 'United States' },
  { value: 'other', label: 'Other' }
];

export const CMO_PRO_OPTIONS = [
  'ASCAP', 'BMI', 'SESAC', 'GMR',           // USA
  'GEMA', 'SUISA',                           // Germany, Switzerland
  'SACEM',                                   // France
  'PRS', 'PPL',                              // UK
  'SGAE',                                    // Spain
  'SIAE',                                    // Italy
  'SOCAN',                                   // Canada
  'APRA', 'AMCOS',                           // Australia
  'JASRAC',                                  // Japan
  'KOMCA',                                   // South Korea
  'UACRR',                                   // Ukraine
  'Other'
];

export const SOCIAL_PLATFORMS = [
  { name: 'Instagram', key: 'instagram', placeholder: '@username' },
  { name: 'Spotify', key: 'spotify', placeholder: 'spotify.com/artist/...' },
  { name: 'Apple Music', key: 'apple_music', placeholder: 'music.apple.com/...' },
  { name: 'YouTube', key: 'youtube', placeholder: 'youtube.com/@channel' },
  { name: 'TikTok', key: 'tiktok', placeholder: '@username' },
  { name: 'Website', key: 'website', placeholder: 'https://yoursite.com' }
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function getOrganizationRolesForJurisdiction(jurisdiction: Jurisdiction): OrganizationRole[] {
  switch (jurisdiction) {
    case 'EU':
    case 'UK':
    case 'AUS':
      return ORGANIZATION_ROLES_EU_UK_AUS;
    case 'US':
      return ORGANIZATION_ROLES_US;
    default:
      return ORGANIZATION_ROLES_OTHER;
  }
}

export function isValidNickname(nickname: string): boolean {
  // Must start with @, contain 3-20 characters (alphanumeric + underscore)
  const pattern = /^@[a-z0-9_]{3,20}$/i;
  return pattern.test(nickname);
}