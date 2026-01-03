import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ProfileService } from './profile.service';
import { environment } from '../../environments/environment';

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
  private consentTableSupported: boolean | null = null;
  private allowClientAdminDelete = environment.supabase?.allowClientAdminDelete === true;
  private readonly deleteAccountFunction = environment.supabase?.deleteAccountFunction || null;

  /**
   * Export user's personal data as JSON
   */
  async exportPersonalData(): Promise<Blob> {
    const user = this.supabase.currentUser;
    if (!user) throw new Error('No user logged in');

    try {
      // Fetch all user data
      const profile = await this.profileService.loadProfile(user.id);

      const workspaces = await this.safeCollectionFetch('workspaces', async () =>
        await this.supabase.client
          .from('workspaces')
          .select('*')
          .eq('created_by', user.id)
      );

      const workspaceIds = workspaces
        .map((workspace: any) => workspace?.id)
        .filter((value: any) => Boolean(value));

      const works = await this.safeCollectionFetch('works', async () =>
        await this.supabase.client
          .from('works')
          .select('*')
          .eq('created_by', user.id)
      );

      const workIds = works
        .map((work: any) => work?.id)
        .filter((value: any) => Boolean(value));

      const rightsHolders = workspaceIds.length > 0
        ? await this.safeCollectionFetch('rights_holders', async () =>
            await this.supabase.client
              .from('rights_holders')
              .select('*')
              .in('workspace_id', workspaceIds)
          )
        : [];

      const splits = workIds.length > 0
        ? await this.safeCollectionFetch('work_splits', async () =>
            await this.supabase.client
              .from('work_splits')
              .select('*')
              .in('work_id', workIds)
          )
        : [];

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
        workspaces,
        works,
        rights_holders: rightsHolders,
        work_splits: splits
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

    let reauthAccessToken: string | null = null;

    try {
      // Verify password by attempting to re-authenticate
      const { data: reauthData, error: authError } = await this.supabase.client.auth.signInWithPassword({
        email: user.email || '',
        password: password
      });

      if (authError) {
        throw new Error('Incorrect password');
      }

      reauthAccessToken = reauthData?.session?.access_token ?? null;

      console.log('Starting account deletion for user:', user.id);

      const workspaces = await this.safeCollectionFetch('workspaces lookup', async () =>
        await this.supabase.client
          .from('workspaces')
          .select('id')
          .eq('created_by', user.id)
      );

      const workspaceIds = workspaces
        .map((workspace: any) => workspace?.id)
        .filter((value: string | null | undefined): value is string => Boolean(value));

      const works = await this.safeCollectionFetch('works lookup', async () =>
        await this.supabase.client
          .from('works')
          .select('id')
          .eq('created_by', user.id)
      );

      const workIds = works
        .map((work: any) => work?.id)
        .filter((value: string | null | undefined): value is string => Boolean(value));

      let protocolIds: string[] = [];

      if (workspaceIds.length > 0) {
        const protocols = await this.safeCollectionFetch('protocol lookup', async () =>
          await this.supabase.client
            .from('protocols')
            .select('id')
            .in('workspace_id', workspaceIds)
        );

        protocolIds = protocols
          .map((protocol: any) => protocol?.id)
          .filter((value: string | null | undefined): value is string => Boolean(value));

        if (protocolIds.length > 0) {
          if (
            await this.safeDelete('protocol lyric authors cleanup', async () =>
              await this.supabase.client
                .from('protocol_lyric_authors')
                .delete()
                .in('protocol_id', protocolIds)
            )
          ) {
            console.log(`Deleted protocol lyric authors for ${protocolIds.length} protocols`);
          }

          if (
            await this.safeDelete('protocol music authors cleanup', async () =>
              await this.supabase.client
                .from('protocol_music_authors')
                .delete()
                .in('protocol_id', protocolIds)
            )
          ) {
            console.log(`Deleted protocol music authors for ${protocolIds.length} protocols`);
          }

          if (
            await this.safeDelete('protocol neighbouring rightsholders cleanup', async () =>
              await this.supabase.client
                .from('protocol_neighbouring_rightsholders')
                .delete()
                .in('protocol_id', protocolIds)
            )
          ) {
            console.log(`Deleted protocol neighbouring rightsholders for ${protocolIds.length} protocols`);
          }
        }

        if (
          await this.safeDelete('protocol cleanup', async () =>
            await this.supabase.client
              .from('protocols')
              .delete()
              .in('workspace_id', workspaceIds)
          )
        ) {
          console.log('Deleted protocols');
        }
      }

      if (workIds.length > 0) {
        if (
          await this.safeDelete('work creation declarations cleanup', async () =>
            await this.supabase.client
              .from('work_creation_declarations')
              .delete()
              .in('work_id', workIds)
          )
        ) {
          console.log('Deleted work creation declarations');
        }

        if (
          await this.safeDelete('work splits cleanup', async () =>
            await this.supabase.client
              .from('work_splits')
              .delete()
              .in('work_id', workIds)
          )
        ) {
          console.log('Deleted work splits');
        }
      }

      if (
        await this.safeDelete('works cleanup', async () =>
          await this.supabase.client
            .from('works')
            .delete()
            .eq('created_by', user.id)
        )
      ) {
        console.log('Deleted works');
      }

      if (workspaceIds.length > 0) {
        if (
          await this.safeDelete('rights holders cleanup', async () =>
            await this.supabase.client
              .from('rights_holders')
              .delete()
              .in('workspace_id', workspaceIds)
          )
        ) {
          console.log('Deleted rights holders');
        }
      }

      if (
        await this.safeDelete('workspace members cleanup', async () =>
          await this.supabase.client
            .from('workspace_members')
            .delete()
            .eq('user_id', user.id)
        )
      ) {
        console.log('Deleted workspace members');
      }

      if (
        await this.safeDelete('workspace cleanup', async () =>
          await this.supabase.client
            .from('workspaces')
            .delete()
            .eq('created_by', user.id)
        )
      ) {
        console.log('Deleted workspaces');
      }

      // Step 9: Delete user_consents (if table exists)
      if (this.consentTableSupported !== false) {
        const deletedConsents = await this.safeDelete('user consents cleanup', async () =>
          await this.supabase.client
            .from('user_consents')
            .delete()
            .eq('user_id', user.id)
        );

        if (deletedConsents) {
          this.consentTableSupported = true;
          console.log('Deleted user consents');
        } else {
          this.consentTableSupported = false;
        }
      }

      // Step 10: Delete profile
      if (
        await this.safeDelete('profile cleanup', async () =>
          await this.supabase.client
            .from('profiles')
            .delete()
            .eq('id', user.id)
        )
      ) {
        console.log('Deleted profile');
      }

      // Step 11: Clear local storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem(this.localConsentKey);
        console.log('Cleared local storage');
      }

      // Step 12: Delete auth user (requires service-role access)
      if (this.deleteAccountFunction) {
        try {
          let accessToken: string | null = reauthAccessToken;

          if (!accessToken) {
            const { data: sessionData } = await this.supabase.client.auth.getSession();
            accessToken = sessionData?.session?.access_token ?? null;
          }

          if (!accessToken) {
            console.warn('No access token available for edge function invocation.');
          } else {
            console.log('Invoking edge function with token length:', accessToken.length);
            
            // Debug: decode token locally to verify it's valid
            try {
              const parts = accessToken.split('.');
              const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
              console.log('Token payload (client-side decode):', payload);
            } catch (e) {
              console.warn('Failed to decode token on client:', e);
            }
            
            const functionUrl = `${environment.supabase.url}/functions/v1/${this.deleteAccountFunction}`;
            
            const response = await fetch(functionUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${environment.supabase.anonKey}`,
                'apikey': environment.supabase.anonKey,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ token: accessToken })
            });

            console.log('Edge function response status:', response.status);
            
            if (!response.ok) {
              const errorText = await response.text();
              console.warn('Edge function account deletion failed:', response.status, errorText);
            } else {
              const data = await response.json();
              if (data?.success) {
                console.log('Deleted auth user via edge function');
              } else {
                console.warn('Edge function did not confirm auth deletion. Response:', data);
              }
            }
          }
        } catch (error) {
          console.warn('Edge function invocation for account deletion failed:', error);
        }
      } else if (this.allowClientAdminDelete) {
        try {
          const { error: deleteError } = await this.supabase.client.auth.admin.deleteUser(user.id);

          if (deleteError) {
            console.warn('Could not delete auth user via admin API:', deleteError.message);
          } else {
            console.log('Deleted auth user');
          }
        } catch (error) {
          console.warn('Auth admin deletion failed:', error);
        }
      } else {
        console.info('Skipping auth user deletion from client; remove the user via Supabase dashboard or secure service role automation.');
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

      this.consentTableSupported = true;

      if (data) {
        this.saveLocalConsentPreferences(data);
      }

      return data ?? this.getLocalConsentPreferences();
    } catch (error) {
      if (this.isMissingConsentTableError(error)) {
        this.consentTableSupported = false;
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

    if (this.consentTableSupported === false) {
      console.info('Consent table unavailable; stored preferences locally only.');
      return;
    }

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

      if (error) {
        if (this.isMissingConsentTableError(error)) {
          this.consentTableSupported = false;
          console.info('Consent table missing; stored preferences locally only.');
          return;
        }

        throw error;
      }

      this.consentTableSupported = true;
    } catch (error) {
      if (this.isMissingConsentTableError(error)) {
        this.consentTableSupported = false;
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
    return Boolean(err.message && err.message.includes('user_consents'));
  }

  private isSkippableDataStoreError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const err = error as { code?: string; message?: string; status?: number };
    const missingRelationCodes = new Set(['PGRST205', 'PGRST204', 'PGRST201', '42703']);
    const permissionCodes = new Set(['PGRST302', '42501']);

    if (err.code && (missingRelationCodes.has(err.code) || permissionCodes.has(err.code))) {
      return true;
    }

    if (typeof err.status === 'number' && [401, 403, 404].includes(err.status)) {
      return true;
    }

    if (err.message && /does not exist|not exist|unknown column/i.test(err.message)) {
      return true;
    }

    if (err.message && /permission denied|not authorized|violates row-level/i.test(err.message)) {
      return true;
    }

    return false;
  }

  private logSkippedOperation(description: string, error: unknown): void {
    console.info(`${description} skipped: relation unavailable or access denied.`, error);
  }

  private async safeCollectionFetch<T>(
    description: string,
    fetcher: () => Promise<{ data: T[] | null; error: { code?: string; message?: string } | null }>
  ): Promise<T[]> {
    try {
      const { data, error } = await fetcher();

      if (error) {
        if (this.isSkippableDataStoreError(error)) {
          this.logSkippedOperation(description, error);
          return [];
        }

        throw error;
      }

      return data ?? [];
    } catch (error) {
      if (this.isSkippableDataStoreError(error)) {
        this.logSkippedOperation(description, error);
        return [];
      }

      throw error;
    }
  }

  private async safeDelete(
    description: string,
    executor: () => Promise<{ error: { code?: string; message?: string } | null }>
  ): Promise<boolean> {
    try {
      const { error } = await executor();

      if (error) {
        if (this.isSkippableDataStoreError(error)) {
          this.logSkippedOperation(description, error);
          return false;
        }

        throw error;
      }

      return true;
    } catch (error) {
      if (this.isSkippableDataStoreError(error)) {
        this.logSkippedOperation(description, error);
        return false;
      }

      throw error;
    }
  }
}
