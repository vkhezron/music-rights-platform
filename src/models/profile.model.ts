// ============================================
// PROFILE MODELS & CONSTANTS
// ============================================

export interface RoleGroupDefinition {
  id: string;
  labelKey: string;
  roles: readonly string[];
}

export const PRIMARY_ROLE_GROUPS: readonly RoleGroupDefinition[] = [
  {
    id: 'creative',
    labelKey: 'role.group.creative',
    roles: ['artist', 'songwriter', 'composer', 'lyricist', 'producer', 'dj']
  },
  {
    id: 'technical',
    labelKey: 'role.group.technical',
    roles: ['recording_engineer', 'mixing_engineer', 'mastering_engineer']
  },
  {
    id: 'business',
    labelKey: 'role.group.business',
    roles: ['artist_manager', 'booking_agent', 'label_rep', 'a_and_r', 'cmo']
  },
  {
    id: 'rights_legal',
    labelKey: 'role.group.rightsLegal',
    roles: ['publisher_rep', 'sync_licensing', 'royalty_analyst', 'pro_cmo_worker', 'music_lawyer', 'business_affairs']
  },
  {
    id: 'live',
    labelKey: 'role.group.live',
    roles: ['tour_manager', 'promoter', 'venue_booker']
  },
  {
    id: 'visual',
    labelKey: 'role.group.visual',
    roles: ['visual_artist', 'creative_director', 'video_director']
  }
] as const;

export const PRIMARY_ROLE_OTHER = 'other' as const;

export const PRIMARY_ROLES = PRIMARY_ROLE_GROUPS.flatMap((group) =>
  group.roles.map((role) => ({
    value: role,
    labelKey: `role.${role}`,
    groupId: group.id
  }))
);

export const SECONDARY_ROLE_GROUPS: readonly RoleGroupDefinition[] = [
  {
    id: 'artists_creative_talent',
    labelKey: 'role.group.secondary.artistsCreative',
    roles: [
      'recording_artist',
      'performing_artist',
      'singer_vocalist',
      'rapper_mc',
      'instrumentalist',
      'session_musician',
      'touring_musician',
      'featured_artist'
    ]
  },
  {
    id: 'songwriting_composition',
    labelKey: 'role.group.secondary.songwritingComposition',
    roles: ['songwriter', 'lyricist', 'composer', 'film_tv_composer', 'game_composer', 'arranger', 'orchestrator', 'topliner']
  },
  {
    id: 'production_audio_engineering',
    labelKey: 'role.group.secondary.productionAudio',
    roles: [
      'music_producer',
      'executive_producer',
      'beatmaker',
      'recording_engineer',
      'mixing_engineer',
      'mastering_engineer',
      'audio_engineer',
      'sound_designer',
      'studio_engineer',
      'studio_owner',
      'daw_operator',
      'vocal_producer'
    ]
  },
  {
    id: 'record_label_roles',
    labelKey: 'role.group.secondary.recordLabel',
    roles: [
      'label_owner',
      'label_president',
      'label_manager',
      'label_general_manager',
      'head_of_a_and_r',
      'a_and_r_manager',
      'a_and_r_scout',
      'product_manager_label',
      'catalog_manager',
      'repertoire_manager'
    ]
  },
  {
    id: 'digital_distribution_dsp',
    labelKey: 'role.group.secondary.digitalDistribution',
    roles: [
      'digital_distribution_manager',
      'distribution_operations_specialist',
      'dsp_relations_manager',
      'content_delivery_manager',
      'release_manager',
      'metadata_specialist',
      'isrc_upc_administrator',
      'content_ingestion_specialist',
      'platform_partnerships_manager'
    ]
  },
  {
    id: 'marketing_sales_growth',
    labelKey: 'role.group.secondary.marketingGrowth',
    roles: [
      'chief_marketing_officer',
      'vp_marketing',
      'head_of_digital_marketing',
      'growth_marketing_manager',
      'marketing_manager',
      'music_marketing_manager',
      'campaign_manager',
      'audience_development_manager',
      'crm_manager',
      'ecommerce_manager_music',
      'direct_to_fan_manager'
    ]
  },
  {
    id: 'promotion_pr_media',
    labelKey: 'role.group.secondary.promotionPR',
    roles: [
      'publicist',
      'pr_manager',
      'head_of_communications',
      'radio_promoter',
      'press_officer',
      'media_relations_manager',
      'playlist_pitching_manager',
      'influencer_marketing_manager'
    ]
  },
  {
    id: 'publishing_rights_admin',
    labelKey: 'role.group.secondary.publishingRights',
    roles: [
      'music_publisher',
      'head_of_publishing',
      'publishing_administrator',
      'sub_publishing_manager',
      'copyright_administrator',
      'rights_administrator',
      'royalty_administrator',
      'royalty_analyst',
      'licensing_manager',
      'sync_licensing_manager'
    ]
  },
  {
    id: 'legal_business_affairs',
    labelKey: 'role.group.secondary.legalBusiness',
    roles: [
      'entertainment_lawyer',
      'music_attorney',
      'general_counsel',
      'head_of_legal',
      'business_affairs_manager',
      'contracts_manager',
      'contract_administrator',
      'compliance_officer',
      'ip_counsel'
    ]
  },
  {
    id: 'pros_cmos_collective',
    labelKey: 'role.group.secondary.prosCmos',
    roles: [
      'pro_executive',
      'pro_member_relations_manager',
      'cmo_officer',
      'rights_registration_specialist',
      'works_registration_manager',
      'distribution_analyst_pro_cmo',
      'royalty_distribution_manager',
      'repertoire_documentation_specialist'
    ]
  },
  {
    id: 'finance_royalties_accounting',
    labelKey: 'role.group.secondary.financeRoyalties',
    roles: [
      'chief_financial_officer',
      'finance_director',
      'music_accountant',
      'royalty_accountant',
      'revenue_analyst',
      'audit_manager',
      'financial_controller',
      'payments_payouts_manager'
    ]
  },
  {
    id: 'artist_career_management',
    labelKey: 'role.group.secondary.artistManagement',
    roles: ['artist_manager', 'business_manager', 'tour_manager', 'road_manager', 'booking_agent', 'talent_agent', 'artist_development_manager']
  },
  {
    id: 'live_music_touring',
    labelKey: 'role.group.secondary.liveTouring',
    roles: ['concert_promoter', 'touring_promoter', 'venue_booker', 'festival_director', 'stage_manager', 'production_manager', 'foh_engineer', 'monitor_engineer', 'lighting_designer']
  },
  {
    id: 'visual_content_direction',
    labelKey: 'role.group.secondary.visualContent',
    roles: ['creative_director', 'visual_artist', 'music_video_director', 'video_producer', 'videographer', 'photographer', 'motion_designer', 'graphic_designer', 'brand_designer', 'art_director']
  },
  {
    id: 'sync_film_tv_games',
    labelKey: 'role.group.secondary.syncMedia',
    roles: ['music_supervisor', 'sync_agent', 'sync_coordinator', 'licensing_executive', 'audio_post_production_supervisor']
  },
  {
    id: 'music_tech_data_platforms',
    labelKey: 'role.group.secondary.musicTech',
    roles: ['dsp_editor_curator', 'playlist_editor', 'music_data_analyst', 'analytics_manager', 'rights_data_manager', 'content_policy_manager', 'trust_safety_manager_music']
  },
  {
    id: 'education_consulting_support',
    labelKey: 'role.group.secondary.educationSupport',
    roles: ['music_industry_consultant', 'artist_coach', 'music_educator', 'university_lecturer_music_business', 'career_development_advisor']
  }
] as const;

const ROLE_ALIAS_ENTRIES: readonly [string, string][] = [
  ['recording', 'recording_engineer'],
  ['recording professional', 'recording_engineer'],
  ['label', 'label_rep'],
  ['publishing', 'publisher_rep'],
  ['lyricist/songwriter', 'songwriter'],
  ['lyricist', 'lyricist'],
  ['vocalist', 'singer_vocalist'],
  ['instrumentalist', 'instrumentalist'],
  ['arranger', 'arranger'],
  ['mix engineer', 'mixing_engineer'],
  ['master engineer', 'mastering_engineer'],
  ['recording engineer', 'recording_engineer'],
  ['studio owner', 'studio_owner'],
  ['a&r', 'a_and_r'],
  ['booking agent', 'booking_agent'],
  ['promoter', 'promoter'],
  ['marketing', 'marketing_manager'],
  ['photographer', 'photographer'],
  ['videographer', 'videographer'],
  ['graphic designer', 'graphic_designer'],
  ['art director', 'art_director'],
  ['visual artist', 'visual_artist'],
  ['artist manager', 'artist_manager']
];

export const ROLE_KEY_ALIASES = ROLE_ALIAS_ENTRIES.reduce((acc, [raw, target]) => {
  acc[raw] = target;
  return acc;
}, {} as Record<string, string>);

export function normalizeRoleKey(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^[a-z0-9_]+$/.test(trimmed)) {
    return trimmed;
  }

  const lookup = ROLE_KEY_ALIASES[trimmed.toLowerCase()];
  if (lookup) {
    return lookup;
  }

  const sanitized = trimmed
    .toLowerCase()
    .replace(/&/g, '_and_')
    .replace(/\//g, '_')
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  return sanitized || trimmed.toLowerCase();
}

export function normalizeRoleList(values: readonly string[] | null | undefined): string[] {
  if (!values || values.length === 0) {
    return [];
  }

  const normalized: string[] = [];
  for (const value of values) {
    const key = normalizeRoleKey(value);
    if (key && !normalized.includes(key)) {
      normalized.push(key);
    }
  }
  return normalized;
}

// Language options
export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'ua', name: 'Українська' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' }
] as const;

// Social platform options
export const SOCIAL_PLATFORMS = [
  { name: 'Instagram', placeholder: '@username' },
  { name: 'Twitter/X', placeholder: '@username' },
  { name: 'Facebook', placeholder: 'facebook.com/username' },
  { name: 'TikTok', placeholder: '@username' },
  { name: 'YouTube', placeholder: 'youtube.com/@username' },
  { name: 'Website', placeholder: 'https://yourwebsite.com' },
  { name: 'Spotify', placeholder: 'open.spotify.com/artist/...' }
];

// Main profile interface
export interface UserProfile {
  id: string;
  nickname: string;
  user_number: number;
  is_admin: boolean;
  is_deactivated: boolean;
  deactivated_at?: string | null;
  
  display_name: string;
  // Roles
  primary_role: string;
  custom_role_text?: string;
  secondary_roles: string[];
  
  // Profile information
  bio?: string;
  primary_language: string;
  avatar_url?: string;
  
  // Social & Music
  social_links: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
    tiktok?: string;
    youtube?: string;
    website?: string;
    spotify?: string;  // Add this
  };
  spotify_artist_url?: string;  // Changed from spotify_artist_id
  spotify_required_per_project: boolean;
  
  // QR Code
  //qr_code_data?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// Form data for creating/updating profile
export interface ProfileFormData {
  nickname: string;
  display_name: string;
  primary_role: string;
  custom_role_text?: string;
  secondary_roles?: string[];
  bio?: string;
  primary_language?: string;
  social_links?: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
    tiktok?: string;
    youtube?: string;
    website?: string;
    spotify?: string;  
  };
  spotify_artist_url?: string;  // Changed from spotify_artist_id
}


// QR code connection data
export interface QRConnectionData {
  platform: string;
  user_number: number;
  type: 'connect';
}