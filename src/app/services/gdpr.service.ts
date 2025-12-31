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

      // Delete all user data (order matters due to foreign keys)
      
      // Delete work_splits
      const { error: splitsError } = await this.supabase.client
        .from('work_splits')
        .delete()
        .in('work_id', 
          (await this.supabase.client
            .from('works')
            .select('id')
            .eq('created_by', user.id)).data?.map((w: any) => w.id) || []
        );

      if (splitsError) throw splitsError;

      // Delete works
      const { error: worksError } = await this.supabase.client
        .from('works')
        .delete()
        .eq('created_by', user.id);

      if (worksError) throw worksError;

      // Delete rights_holders
      const { error: holdersError } = await this.supabase.client
        .from('rights_holders')
        .delete()
        .eq('created_by', user.id);

      if (holdersError) throw holdersError;

      // Delete workspace_members
      const { error: membersError } = await this.supabase.client
        .from('workspace_members')
        .delete()
        .eq('user_id', user.id);

      if (membersError) throw membersError;

      // Delete workspaces
      const { error: workspacesError } = await this.supabase.client
        .from('workspaces')
        .delete()
        .eq('created_by', user.id);

      if (workspacesError) throw workspacesError;

      // Delete profile
      const { error: profileError } = await this.supabase.client
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Delete auth user
      const { error: deleteError } = await this.supabase.client.auth.admin.deleteUser(user.id);
      
      if (deleteError) {
        console.warn('Could not delete auth user (requires admin)', deleteError);
      }

      // Sign out
      await this.supabase.signOut();
    } catch (error) {
      console.error('Error deleting account:', error);
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
