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
export const SECONDARY_ROLES = {
  creative: [
    { value: 'musician', label: 'Musician' },
    { value: 'session_musician', label: 'Session Musician' },
    { value: 'singer', label: 'Singer/Vocalist' },
    { value: 'arranger', label: 'Arranger' },
    { value: 'dj', label: 'DJ' }
  ],
  production: [
    { value: 'producer', label: 'Producer' },
    { value: 'recording_producer', label: 'Recording Producer' },
    { value: 'assistant_producer', label: 'Assistant Producer' },
    { value: 'mixing_engineer', label: 'Mixing Engineer' },
    { value: 'mastering_engineer', label: 'Mastering Engineer' },
    { value: 'sound_engineer', label: 'Sound Engineer' }
  ],
  business: [
    { value: 'label_manager', label: 'Label Manager' },
    { value: 'publishing_manager', label: 'Publishing Manager' },
    { value: 'anr', label: 'A&R' },
    { value: 'booking_agent', label: 'Booking Agent' }
  ],
  visual: [
    { value: 'photographer', label: 'Photographer' },
    { value: 'videographer', label: 'Videographer' },
    { value: 'graphic_designer', label: 'Graphic Designer' }
  ]
} as const;

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
  { key: 'instagram', label: 'Instagram', placeholder: '@username' },
  { key: 'twitter', label: 'Twitter/X', placeholder: '@username' },
  { key: 'facebook', label: 'Facebook', placeholder: 'profile URL' },
  { key: 'tiktok', label: 'TikTok', placeholder: '@username' },
  { key: 'youtube', label: 'YouTube', placeholder: 'channel URL' },
  { key: 'website', label: 'Website', placeholder: 'https://...' },
  { key: 'spotify', label: 'Spotify', placeholder: 'https://open.spotify.com/artist/...' }  // Add this
] as const;

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
    spotify?: string;  // Add this
  };
  spotify_artist_url?: string;  // Changed from spotify_artist_id
}


// QR code connection data
export interface QRConnectionData {
  platform: string;
  user_number: number;
  type: 'connect';
}