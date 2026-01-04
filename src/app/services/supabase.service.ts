import { Injectable } from '@angular/core';
import { AuthApiError, createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private currentUser$ = new BehaviorSubject<User | null>(null);

  private supportsDisplayNameColumn = true;
  private supportsFullNameColumn: boolean | null = null;
  private supportsEmailInternalColumn: boolean | null = null;
  private supportsNicknameColumn: boolean | null = null;

  constructor() {
    this.supabase = createClient(environment.supabase.url, environment.supabase.anonKey);

    this.supabase.auth.getSession().then(({ data: { session } }) => {
      this.currentUser$.next(session?.user ?? null);
    });
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  get user$(): Observable<User | null> {
    return this.currentUser$.asObservable();
  }

  get currentUser(): User | null {
    return this.currentUser$.value;
  }

  async signUp(username: string, password: string, displayName: string): Promise<void> {
    const normalizedUsername = username.toLowerCase();
    const normalizedDisplayName = this.normalizeDisplayName(displayName);
    const normalizedDisplayNameKey = normalizedDisplayName.toLowerCase();
    const tempEmail = `user-${normalizedUsername}@music-rights.local`;

    await this.ensureUsernameAvailable(normalizedUsername);

    if (normalizedDisplayName) {
      await this.ensureDisplayNameAvailable(normalizedDisplayName, normalizedDisplayNameKey);
    }

    const { data, error } = await this.supabase.auth.signUp({
      email: tempEmail,
      password,
      options: {
        emailRedirectTo: undefined,
        data: {
          username: normalizedUsername,
          display_name: normalizedDisplayName
        }
      }
    });

    if (error) {
      if (error instanceof AuthApiError && error.message.includes('User already registered')) {
        throw new Error('AUTH.USERNAME_TAKEN');
      }

      throw error;
    }

    if (!data.user) {
      throw new Error('AUTH.SIGNUP_FAILED');
    }

    // Update current user observable
    this.currentUser$.next(data.user);

    // Wait for user to be committed to database
    await new Promise(resolve => setTimeout(resolve, 500));

    await this.insertProfileRecord({
      id: data.user.id,
      username: normalizedUsername,
      displayName: normalizedDisplayName,
      displayNameKey: normalizedDisplayNameKey,
      emailInternal: tempEmail
    });
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error && ![401, 403].includes((error as any)?.status ?? 0)) {
      throw error;
    }
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email);
    if (error) {
      throw error;
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const user = this.currentUser;
    if (!user) {
      throw new Error('AUTH.NOT_AUTHENTICATED');
    }

    const email = user.email || this.buildSyntheticEmail(user);
    if (!email) {
      throw new Error('AUTH.EMAIL_NOT_AVAILABLE');
    }

    const { error: verifyError } = await this.supabase.auth.signInWithPassword({
      email,
      password: currentPassword
    });

    if (verifyError) {
      if (typeof verifyError.message === 'string' && verifyError.message.toLowerCase().includes('invalid')) {
        throw new Error('AUTH.INVALID_CURRENT_PASSWORD');
      }
      throw verifyError;
    }

    const { error: updateError } = await this.supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      throw updateError;
    }

    const { data } = await this.supabase.auth.getUser();
    this.currentUser$.next(data?.user ?? null);
  }

  private buildSyntheticEmail(user: User): string | null {
    const username = (user.user_metadata as Record<string, unknown> | null)?.['username'];
    if (typeof username === 'string' && username.trim().length > 0) {
      return `user-${username.toLowerCase()}@music-rights.local`;
    }
    return null;
  }

  private async ensureUsernameAvailable(username: string): Promise<void> {
    const { data, error } = await this.client
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .limit(1);

    if (error) {
      throw error;
    }

    if (data && data.length > 0) {
      throw new Error('AUTH.USERNAME_TAKEN');
    }
  }

  private normalizeDisplayName(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  private isColumnMissingError(error: any, column: string): boolean {
    if (!error) {
      return false;
    }

    if (error.code === '42703') {
      return true;
    }

    if (error.code === 'PGRST204' && typeof error.message === 'string') {
      return error.message.includes(`'${column}'`);
    }

    return false;
  }

  private async ensureDisplayNameAvailable(displayName: string, normalizedKey: string): Promise<void> {
    if (!displayName) {
      return;
    }

    if (this.supportsDisplayNameColumn !== false) {
      const { data, error } = await this.client
        .from('profiles')
        .select('id')
        .eq('display_name_normalized', normalizedKey)
        .limit(1);

      if (this.isColumnMissingError(error, 'display_name_normalized')) {
        this.supportsDisplayNameColumn = false;
      } else if (error) {
        throw error;
      } else if (data && data.length > 0) {
        throw new Error('AUTH.DISPLAY_NAME_TAKEN');
      } else {
        this.supportsDisplayNameColumn = true;
        return;
      }
    }

    if (this.supportsFullNameColumn === false) {
      return;
    }

    const { data: fallbackData, error: fallbackError } = await this.client
      .from('profiles')
      .select('id')
      .ilike('full_name', displayName)
      .limit(1);

    if (this.isColumnMissingError(fallbackError, 'full_name')) {
      this.supportsFullNameColumn = false;
      return;
    }

    if (fallbackError) {
      throw fallbackError;
    }

    this.supportsFullNameColumn = true;

    if (fallbackData && fallbackData.length > 0) {
      throw new Error('AUTH.DISPLAY_NAME_TAKEN');
    }
  }

  private async insertProfileRecord(params: {
    id: string;
    username: string;
    displayName: string;
    displayNameKey: string;
    emailInternal: string;
  }): Promise<void> {
    const { id, username, displayName, displayNameKey, emailInternal } = params;

    const baseProfile: Record<string, any> = {
      id,
      username
    };

    if (this.supportsNicknameColumn !== false) {
      baseProfile['nickname'] = username;
    }

    // Skip email_internal - not needed for username-based auth
    // if (emailInternal && this.supportsEmailInternalColumn !== false) {
    //   baseProfile['email_internal'] = emailInternal;
    // }

    const attempts: Array<Record<string, any>> = [];

    let profileExists = false;
    try {
      const { data: existing, error: existingError } = await this.client
        .from('profiles')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (existingError && existingError.code !== 'PGRST116') {
        throw existingError;
      }

      profileExists = Boolean(existing);
    } catch (lookupError) {
      console.warn('Profile existence lookup failed; continuing with insert attempts.', lookupError);
    }

    if (displayName) {
      if (this.supportsDisplayNameColumn !== false) {
        attempts.push({
          ...baseProfile,
          display_name: displayName,
          display_name_normalized: displayNameKey
        });
      }

      if (this.supportsFullNameColumn !== false) {
        attempts.push({
          ...baseProfile,
          full_name: displayName
        });
      }
    }

    attempts.push({ ...baseProfile });

    let lastError: any = null;

    for (const payload of attempts) {
      const sanitizedPayload: Record<string, any> = { ...payload };

      if (this.supportsDisplayNameColumn === false) {
        delete sanitizedPayload['display_name'];
        delete sanitizedPayload['display_name_normalized'];
      }

      if (this.supportsFullNameColumn === false) {
        delete sanitizedPayload['full_name'];
      }

      if (this.supportsEmailInternalColumn === false) {
        delete sanitizedPayload['email_internal'];
      }

      const insertPayload = { ...sanitizedPayload };
      const updatePayload: Record<string, any> = {};

      for (const [key, value] of Object.entries(sanitizedPayload)) {
        if (key === 'id') {
          continue;
        }

        // Only include columns we know are supported.
        const supported = this.isColumnSupported(key);
        if (supported !== false) {
          updatePayload[key] = value;
        }
      }

      const mutation = profileExists
        ? this.client.from('profiles').update(updatePayload).eq('id', id)
        : this.client.from('profiles').insert(insertPayload);

      const { error } = await mutation;

      if (!error) {
        if ('display_name' in sanitizedPayload || 'display_name_normalized' in sanitizedPayload) {
          this.supportsDisplayNameColumn = true;
        }

        if ('full_name' in sanitizedPayload) {
          this.supportsFullNameColumn = true;
        }

        if ('email_internal' in sanitizedPayload) {
          this.supportsEmailInternalColumn = true;
        }

        return;
      }

      lastError = error;
      const errorDetails = (error as any)?.details || (error as any)?.message || null;
      console.error('Profile mutation failed:', {
        payload: sanitizedPayload,
        error,
        details: errorDetails
      });

      let handled = false;

      if (!profileExists && (error?.code === '23505' || error?.details?.includes('already exists'))) {
        profileExists = true;
        handled = true;
      }

      if (profileExists && (error?.code === 'PGRST116' || error?.message?.includes('Results contain 0 rows'))) {
        profileExists = false;
        handled = true;
      }

      if (this.isColumnMissingError(error, 'display_name') || this.isColumnMissingError(error, 'display_name_normalized')) {
        this.supportsDisplayNameColumn = false;
        handled = true;
      }

      if (this.isColumnMissingError(error, 'full_name')) {
        this.supportsFullNameColumn = false;
        handled = true;
      }

      if (this.isColumnMissingError(error, 'email_internal')) {
        this.supportsEmailInternalColumn = false;
        handled = true;
      }

      if (handled) {
        continue;
      }

      throw error;
    }

    if (lastError) {
      throw lastError;
    }
  }

  private isColumnSupported(column: string): boolean | null {
    switch (column) {
      case 'display_name':
      case 'display_name_normalized':
        return this.supportsDisplayNameColumn;
      case 'full_name':
        return this.supportsFullNameColumn;
      case 'email_internal':
        return this.supportsEmailInternalColumn;
      case 'nickname':
        return this.supportsNicknameColumn;
      default:
        return true;
    }
  }
}