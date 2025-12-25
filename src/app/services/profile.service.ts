import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { UserProfile, ProfileFormData, QRConnectionData } from '../../models/profile.model'; 
import QRCode from 'qrcode';

/**
 * PROFILE SERVICE
 * Manages user profile data and operations
 */

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private supabase = inject(SupabaseService);
  private currentProfile$ = new BehaviorSubject<UserProfile | null>(null);

  constructor() {
    // Load profile when user logs in
    this.supabase.user$.subscribe(async (user) => {
      if (user) {
        await this.loadProfile(user.id);
      } else {
        this.currentProfile$.next(null);
      }
    });
  }

  /**
   * Get current profile as observable
   */
  get profile$(): Observable<UserProfile | null> {
    return this.currentProfile$.asObservable();
  }

  /**
   * Get current profile value
   */
  get currentProfile(): UserProfile | null {
    return this.currentProfile$.value;
  }

  /**
   * Load user profile
   */
  async loadProfile(userId: string): Promise<UserProfile | null> {
    // Don't try to load if userId is empty
    if (!userId) {
      this.currentProfile$.next(null);
      return null;
    }

    try {
      const { data, error } = await this.supabase.client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // Profile doesn't exist yet
        if (error.code === 'PGRST116') {
          this.currentProfile$.next(null);
          return null;
        }
        throw error;
      }

      this.currentProfile$.next(data);
      return data;
    } catch (error: any) {
      console.error('Error loading profile:', error);
      return null;
    }
  }

  /**
   * Check if user has completed profile
   */
  async hasProfile(userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.client
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }

  /**
   * Check if nickname is available
   */
  async isNicknameAvailable(nickname: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.client
        .from('profiles')
        .select('nickname')
        .eq('nickname', nickname)
        .maybeSingle();

      return !data; // Available if no data found
    } catch {
      return false;
    }
  }

  /**
   * Generate QR code as base64 string
   */
  private async generateQRCode(userNumber: number): Promise<string> {
    const qrData: QRConnectionData = {
      platform: 'music-rights-platform',
      user_number: userNumber,
      type: 'connect'
    };

    try {
      // Generate QR code as base64 data URL
      const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return qrCodeDataUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  /**
   * Create new profile
   */
  async createProfile(formData: ProfileFormData): Promise<UserProfile> {
    const userId = this.supabase.currentUser?.id;
    if (!userId) throw new Error('Not authenticated');

    try {
      // Create profile with auto-generated user_number
      const { data: profile, error: profileError } = await this.supabase.client
        .from('profiles')
        .insert({
          id: userId,
          nickname: formData.nickname,
          primary_role: formData.primary_role,
          custom_role_text: formData.custom_role_text,
          secondary_roles: formData.secondary_roles || [],
          bio: formData.bio,
          primary_language: formData.primary_language || 'en',
          social_links: formData.social_links || {},
          spotify_artist_url: formData.spotify_artist_url
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // QR code is generated on-demand, not stored
      this.currentProfile$.next(profile);
      return profile;
    } catch (error: any) {
      console.error('Error creating profile:', error);
      throw new Error(error.message || 'Failed to create profile');
    }
  }

  /**
   * Generate QR code for current user (on-demand)
   */
  async getQRCode(): Promise<string> {
    const profile = this.currentProfile;
    if (!profile) throw new Error('No profile found');

    return await this.generateQRCode(profile.user_number);
  }

  /**
   * Update existing profile
   */
  async updateProfile(formData: Partial<ProfileFormData>): Promise<UserProfile> {
    const userId = this.supabase.currentUser?.id;
    if (!userId) throw new Error('Not authenticated');

    try {
      const { data, error } = await this.supabase.client
        .from('profiles')
        .update({
          nickname: formData.nickname,
          primary_role: formData.primary_role,
          custom_role_text: formData.custom_role_text,
          secondary_roles: formData.secondary_roles,
          bio: formData.bio,
          primary_language: formData.primary_language,
          social_links: formData.social_links,
          spotify_artist_url: formData.spotify_artist_url
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      this.currentProfile$.next(data);
      return data;
    } catch (error: any) {
      console.error('Error updating profile:', error);
      throw new Error(error.message || 'Failed to update profile');
    }
  }

  /**
   * Upload avatar image
   */
  async uploadAvatar(file: File): Promise<string> {
    const userId = this.supabase.currentUser?.id;
    if (!userId) throw new Error('Not authenticated');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await this.supabase.client.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = this.supabase.client.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with avatar URL
      const { error: updateError } = await this.supabase.client
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      return data.publicUrl;
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      throw new Error(error.message || 'Failed to upload avatar');
    }
  }

  /**
   * Get profile by user number (for QR code scanning)
   */
  async getProfileByUserNumber(userNumber: number): Promise<UserProfile | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('profiles')
        .select('*')
        .eq('user_number', userNumber)
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error fetching profile by user number:', error);
      return null;
    }
  }
}