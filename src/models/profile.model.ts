// ============================================
// PROFILE MODELS & CONSTANTS
// ============================================

// Primary role options
export const PRIMARY_ROLES = [
  { value: 'artist', label: 'Artist' },
  { value: 'recording', label: 'Recording Professional' },
  { value: 'lyricist', label: 'Lyricist/Songwriter' },
  { value: 'composer', label: 'Composer' },
  { value: 'artist_manager', label: 'Artist Manager' },
  { value: 'label', label: 'Label Representative' },
  { value: 'publishing', label: 'Publishing Representative' },
  { value: 'visual_artist', label: 'Visual Artist' },
  { value: 'other', label: 'Other (Specify)' }
] as const;

// Secondary roles grouped by category
export const SECONDARY_ROLES = [
  {
    category: 'CREATIVE_ROLES',
    roles: ['Lyricist', 'Vocalist', 'Instrumentalist', 'Arranger']
  },
  {
    category: 'PRODUCTION_ROLES',
    roles: ['Mix Engineer', 'Master Engineer', 'Recording Engineer', 'Studio Owner']
  },
  {
    category: 'BUSINESS_ROLES',
    roles: ['A&R', 'Booking Agent', 'Promoter', 'Marketing']
  },
  {
    category: 'VISUAL_ROLES',
    roles: ['Photographer', 'Videographer', 'Graphic Designer', 'Art Director']
  }
];

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