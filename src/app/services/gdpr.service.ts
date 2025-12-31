import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ProfileService } from './profile.service';

/**
 * GDPR Compliance Service
 * Handles data export, account deletion, and consent management
 */
@Injectable({
  providedIn: 'root'
})
export class GdprService {
  private supabase = inject(SupabaseService);
  private profileService = inject(ProfileService);
  private readonly localConsentKey = 'gdpr_consent_preferences';

  /**
   * Export user's personal data as JSON
   */
  async exportPersonalData(): Promise<Blob> {
    const user = this.supabase.currentUser;
    if (!user) throw new Error('No user logged in');

    try {
      // Fetch all user data
      const profile = await this.profileService.loadProfile(user.id);
      
      // Fetch workspaces
      const { data: workspaces } = await this.supabase.client
        .from('workspaces')
        .select('*')
        .eq('created_by', user.id);

      // Fetch works
      const { data: works } = await this.supabase.client
        .from('works')
        .select('*')
        .eq('created_by', user.id);

      // Fetch rights holders
      const { data: rightsHolders } = await this.supabase.client
        .from('rights_holders')
        .select('*')
        .eq('created_by', user.id);

      // Fetch splits
      const { data: splits } = await this.supabase.client
        .from('work_splits')
        .select('*');

      // Compile user data
      const userData = {
        exported_at: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at
        },
        profile: profile,
        workspaces: workspaces || [],
        works: works || [],
        rights_holders: rightsHolders || [],
        work_splits: splits || []
      };

      // Convert to JSON and create blob
      const json = JSON.stringify(userData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });

      return blob;
    } catch (error) {
      console.error('Error exporting personal data:', error);
      throw error;
    }
  }

  /**
   * Download exported data
   */
  async downloadPersonalData(): Promise<void> {
    try {
      const blob = await this.exportPersonalData();
      const user = this.supabase.currentUser;
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `music-rights-platform-data-${user?.email || 'export'}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading personal data:', error);
      throw error;
    }
  }

  /**
   * Delete user account and all associated data
   * WARNING: This is irreversible
   * 
   * Deletion order (from leaf nodes to root):
   * 1. Protocol author tables (protocol_lyric_authors, protocol_music_authors, protocol_neighbouring_rightsholders)
   * 2. Protocols
   * 3. Work creation declarations
   * 4. Work splits
   * 5. Works
   * 6. Rights holders
   * 7. Workspace members
   * 8. Workspaces
   * 9. User consents (if table exists)
   * 10. Profile
   * 11. Auth user
   */
  async deleteAccount(password: string): Promise<void> {
    const user = this.supabase.currentUser;
    if (!user) throw new Error('No user logged in');

    try {
      // Verify password by attempting to re-authenticate
      const { error: authError } = await this.supabase.client.auth.signInWithPassword({
        email: user.email || '',
        password: password
      });

      if (authError) {
        throw new Error('Incorrect password');
      }

      console.log('Starting account deletion for user:', user.id);

      // Get user's workspace IDs first (needed for cascade deletes)
      const { data: workspaces } = await this.supabase.client
        .from('workspaces')
        .select('id')
        .eq('created_by', user.id);

      const workspaceIds = workspaces?.map((w: any) => w.id) || [];

      // Get user's work IDs (needed for protocol and split cleanup)
      const { data: works } = await this.supabase.client
        .from('works')
        .select('id')
        .eq('created_by', user.id);

      const workIds = works?.map((w: any) => w.id) || [];

      // Step 1: Delete protocol author records
      // These reference protocols, which reference works, which reference workspaces
      if (workspaceIds.length > 0) {
        // Get all protocol IDs for user's workspaces
        const { data: protocols } = await this.supabase.client
          .from('protocols')
          .select('id')
          .in('workspace_id', workspaceIds);

        const protocolIds = protocols?.map((p: any) => p.id) || [];

        if (protocolIds.length > 0) {
          // Delete protocol_lyric_authors
          const { error: lyricAuthorsError } = await this.supabase.client
            .from('protocol_lyric_authors')
            .delete()
            .in('protocol_id', protocolIds);

          if (lyricAuthorsError && lyricAuthorsError.code !== 'PGRST116') {
            console.warn('Error deleting lyric authors:', lyricAuthorsError);
          }

          // Delete protocol_music_authors
          const { error: musicAuthorsError } = await this.supabase.client
            .from('protocol_music_authors')
            .delete()
            .in('protocol_id', protocolIds);

          if (musicAuthorsError && musicAuthorsError.code !== 'PGRST116') {
            console.warn('Error deleting music authors:', musicAuthorsError);
          }

          // Delete protocol_neighbouring_rightsholders
          const { error: neighbouringError } = await this.supabase.client
            .from('protocol_neighbouring_rightsholders')
            .delete()
            .in('protocol_id', protocolIds);

          if (neighbouringError && neighbouringError.code !== 'PGRST116') {
            console.warn('Error deleting neighbouring rightsholders:', neighbouringError);
          }

          console.log(`Deleted protocol author records for ${protocolIds.length} protocols`);
        }

        // Step 2: Delete protocols
        const { error: protocolsError } = await this.supabase.client
          .from('protocols')
          .delete()
          .in('workspace_id', workspaceIds);

        if (protocolsError && protocolsError.code !== 'PGRST116') {
          console.warn('Error deleting protocols:', protocolsError);
        } else {
          console.log('Deleted protocols');
        }
      }

      // Step 3: Delete work creation declarations
      if (workIds.length > 0) {
        const { error: declarationsError } = await this.supabase.client
          .from('work_creation_declarations')
          .delete()
          .in('work_id', workIds);

        if (declarationsError && declarationsError.code !== 'PGRST116') {
          console.warn('Error deleting work creation declarations:', declarationsError);
        } else {
          console.log('Deleted work creation declarations');
        }
      }

      // Step 4: Delete work_splits
      if (workIds.length > 0) {
        const { error: splitsError } = await this.supabase.client
          .from('work_splits')
          .delete()
          .in('work_id', workIds);

        if (splitsError) {
          console.warn('Error deleting work splits:', splitsError);
        } else {
          console.log('Deleted work splits');
        }
      }

      // Step 5: Delete works
      const { error: worksError } = await this.supabase.client
        .from('works')
        .delete()
        .eq('created_by', user.id);

      if (worksError) {
        console.warn('Error deleting works:', worksError);
      } else {
        console.log('Deleted works');
      }

      // Step 6: Delete rights_holders
      if (workspaceIds.length > 0) {
        const { error: holdersError } = await this.supabase.client
          .from('rights_holders')
          .delete()
          .in('workspace_id', workspaceIds);

        if (holdersError) {
          console.warn('Error deleting rights holders:', holdersError);
        } else {
          console.log('Deleted rights holders');
        }
      }

      // Step 7: Delete workspace_members
      const { error: membersError } = await this.supabase.client
        .from('workspace_members')
        .delete()
        .eq('user_id', user.id);

      if (membersError) {
        console.warn('Error deleting workspace members:', membersError);
      } else {
        console.log('Deleted workspace members');
      }

      // Step 8: Delete workspaces
      const { error: workspacesError } = await this.supabase.client
        .from('workspaces')
        .delete()
        .eq('created_by', user.id);

      if (workspacesError) {
        console.warn('Error deleting workspaces:', workspacesError);
      } else {
        console.log('Deleted workspaces');
      }

      // Step 9: Delete user_consents (if table exists)
      try {
        const { error: consentsError } = await this.supabase.client
          .from('user_consents')
          .delete()
          .eq('user_id', user.id);

        if (consentsError && consentsError.code !== 'PGRST116') {
          console.warn('Error deleting user consents:', consentsError);
        } else if (!consentsError) {
          console.log('Deleted user consents');
        }
      } catch (error) {
        console.warn('user_consents table may not exist:', error);
      }

      // Step 10: Delete profile
      const { error: profileError } = await this.supabase.client
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) {
        console.warn('Error deleting profile:', profileError);
      } else {
        console.log('Deleted profile');
      }

      // Step 11: Clear local storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem(this.localConsentKey);
        console.log('Cleared local storage');
      }

      // Step 12: Delete auth user (requires admin access)
      // Note: This will fail if called from client-side without admin privileges
      // The user can still be deleted manually from Supabase dashboard
      try {
        const { error: deleteError } = await this.supabase.client.auth.admin.deleteUser(user.id);
        
        if (deleteError) {
          console.warn('Could not delete auth user via admin API (expected if not admin):', deleteError.message);
          console.info('User data has been deleted. Auth user can be removed from Supabase dashboard.');
        } else {
          console.log('Deleted auth user');
        }
      } catch (error) {
        console.warn('Auth admin deletion not available from client:', error);
      }

      // Step 13: Sign out
      await this.supabase.signOut();
      console.log('Account deletion complete. User signed out.');

    } catch (error) {
      console.error('Error during account deletion:', error);
      throw error;
    }
  }

  /**
   * Get user's consent preferences
   */
  async getConsentPreferences(): Promise<any> {
    const user = this.supabase.currentUser;
    if (!user) return this.getLocalConsentPreferences();

    try {
      const { data } = await this.supabase.client
        .from('user_consents')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        this.saveLocalConsentPreferences(data);
      }

      return data ?? this.getLocalConsentPreferences();
    } catch (error) {
      if (this.isMissingConsentTableError(error)) {
        console.warn('Consent table missing; falling back to local storage.');
        return this.getLocalConsentPreferences();
      }

      console.error('Failed to load consent preferences:', error);
      throw error;
    }
  }

  /**
   * Save user's consent preferences
   */
  async saveConsentPreferences(preferences: {
    marketing: boolean;
    analytics: boolean;
    essential: boolean;
    third_party: boolean;
  }): Promise<void> {
    const user = this.supabase.currentUser;
    if (!user) throw new Error('No user logged in');

    this.saveLocalConsentPreferences({ ...preferences, user_id: user.id });

    try {
      const { error } = await this.supabase.client
        .from('user_consents')
        .upsert({
          user_id: user.id,
          marketing: preferences.marketing,
          analytics: preferences.analytics,
          essential: preferences.essential,
          third_party: preferences.third_party,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      if (this.isMissingConsentTableError(error)) {
        console.warn('Consent table missing; stored preferences locally only.');
        return;
      }

      console.error('Error saving consent preferences:', error);
      throw error;
    }
  }

  /**
   * Check if user has accepted cookies
   */
  hasAcceptedCookies(): boolean {
    const consent = localStorage.getItem('gdpr_consent');
    return consent === 'accepted';
  }

  /**
   * Set cookie acceptance
   */
  setCookieConsent(accepted: boolean): void {
    localStorage.setItem('gdpr_consent', accepted ? 'accepted' : 'rejected');
    localStorage.setItem('gdpr_consent_date', new Date().toISOString());
  }

  private saveLocalConsentPreferences(preferences: any): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.localConsentKey, JSON.stringify(preferences));
    } catch (error) {
      console.warn('Unable to cache consent preferences locally.', error);
    }
  }

  private getLocalConsentPreferences(): any {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(this.localConsentKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn('Unable to parse cached consent preferences.', error);
      return null;
    }
  }

  private isMissingConsentTableError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const err = error as { code?: string; message?: string };
    if (err.code === 'PGRST205') return true;
    return Boolean(err.message && err.message.includes("user_consents"));
  }
}
