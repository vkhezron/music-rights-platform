import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { BehaviorSubject, Observable } from 'rxjs';

export interface SecurityQuestion {
  id: number;
  question_key: string;
  question_text: string;
  category: string;
}

export interface RecoveryCredentials {
  security_question_1: string;
  security_answer_1: string;
  security_question_2: string;
  security_answer_2: string;
}

export interface RecoveryCode {
  code: string;
  used: boolean;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthRecoveryService {
  private recoveryState$ = new BehaviorSubject<{
    step: 'select-method' | 'verify-identity' | 'set-password' | 'complete';
    method: 'questions' | 'code' | 'email' | null;
    username: string;
  }>({
    step: 'select-method',
    method: null,
    username: ''
  });

  constructor(private supabase: SupabaseService) {}

  getRecoveryState(): Observable<any> {
    return this.recoveryState$.asObservable();
  }

  /**
   * Get list of available security questions
   */
  async getSecurityQuestions(): Promise<SecurityQuestion[]> {
    const { data, error } = await this.supabase.client
      .from('security_questions')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) throw error;
    return data || [];
  }

  /**
   * Start recovery process - Step 1: Verify username exists
   */
  async startRecovery(username: string): Promise<boolean> {
    try {
      // Check if username exists
      const { data, error } = await this.supabase.client
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .single();

      if (error || !data) {
        throw new Error('USERNAME_NOT_FOUND');
      }

      this.recoveryState$.next({
        ...this.recoveryState$.value,
        username: username.toLowerCase(),
        step: 'select-method'
      });

      return true;
    } catch (error) {
      await this.logAuthAttempt(username, 'recovery', false, 'USERNAME_NOT_FOUND');
      throw error;
    }
  }

  /**
   * Recovery Method 1: Verify with security questions
   */
  async verifyWithSecurityQuestions(
    username: string,
    answer1: string,
    answer2: string
  ): Promise<boolean> {
    try {
      // Get user and recovery credentials
      const { data: userData, error: userError } = await this.supabase.client
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .single();

      if (userError || !userData) {
        throw new Error('USER_NOT_FOUND');
      }

      const { data: credData, error: credError } = await this.supabase.client
        .from('user_recovery_credentials')
        .select('*')
        .eq('user_id', userData.id)
        .single();

      if (credError || !credData) {
        throw new Error('RECOVERY_NOT_SETUP');
      }

      // Note: In production, hash the answers with bcrypt and compare
      // This is a simplified example
      const hash1 = await this.hashString(answer1.toLowerCase().trim());
      const hash2 = await this.hashString(answer2.toLowerCase().trim());

      // Verify answers match (compare hashes)
      const answer1Match = credData.security_answer_1_hash === hash1;
      const answer2Match = credData.security_answer_2_hash === hash2;

      if (!answer1Match || !answer2Match) {
        await this.logAuthAttempt(username, 'recovery', false, 'INVALID_ANSWERS');
        throw new Error('INCORRECT_ANSWERS');
      }

      await this.logAuthAttempt(username, 'recovery', true);
      this.recoveryState$.next({
        ...this.recoveryState$.value,
        step: 'set-password',
        method: 'questions'
      });

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Recovery Method 2: Verify with recovery code
   */
  async verifyWithRecoveryCode(
    username: string,
    code: string
  ): Promise<boolean> {
    try {
      const { data: userData, error: userError } = await this.supabase.client
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .single();

      if (userError || !userData) {
        throw new Error('USER_NOT_FOUND');
      }

      const { data: credData, error: credError } = await this.supabase.client
        .from('user_recovery_credentials')
        .select('*')
        .eq('user_id', userData.id)
        .single();

      if (credError || !credData) {
        throw new Error('RECOVERY_NOT_SETUP');
      }

      // Hash the provided code and check if it's in the recovery_codes_hash array
      const codeHash = await this.hashString(code.trim());
      const isValidCode = credData.recovery_codes_hash.includes(codeHash);

      if (!isValidCode) {
        await this.logAuthAttempt(username, 'recovery', false, 'INVALID_CODE');
        throw new Error('INVALID_RECOVERY_CODE');
      }

      // Check if code has already been used
      if (credData.used_recovery_codes.includes(codeHash)) {
        await this.logAuthAttempt(username, 'recovery', false, 'CODE_ALREADY_USED');
        throw new Error('RECOVERY_CODE_ALREADY_USED');
      }

      // Mark code as used
      const updatedUsedCodes = [...credData.used_recovery_codes, codeHash];
      await this.supabase.client
        .from('user_recovery_credentials')
        .update({ used_recovery_codes: updatedUsedCodes })
        .eq('user_id', userData.id);

      await this.logAuthAttempt(username, 'recovery', true);
      this.recoveryState$.next({
        ...this.recoveryState$.value,
        step: 'set-password',
        method: 'code'
      });

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Recovery Method 3: Email-based recovery
   */
  async initiateEmailRecovery(username: string): Promise<boolean> {
    const normalizedUsername = username.toLowerCase();

    try {
      const { data, error } = await this.supabase.client.functions.invoke('send-recovery-email', {
        body: {
          username: normalizedUsername,
          locale: navigator?.language || 'en',
          redirectUrl: this.buildEmailRedirectUrl()
        }
      });

      const failureMessage = error?.message || data?.error;

      if (failureMessage) {
        throw new Error(failureMessage);
      }

      await this.logAuthAttempt(normalizedUsername, 'recovery', true);
      return true;
    } catch (error: any) {
      const reason = typeof error?.message === 'string' ? error.message : 'EMAIL_RECOVERY_FAILED';
      await this.logAuthAttempt(normalizedUsername, 'recovery', false, reason);
      throw error;
    }
  }

  async validateEmailRecoveryToken(username: string, token: string): Promise<boolean> {
    const normalizedUsername = username.toLowerCase();

    const { data, error } = await this.supabase.client.functions.invoke('verify-recovery-token', {
      body: {
        username: normalizedUsername,
        token
      }
    });

    const failureMessage = error?.message || data?.error;

    if (failureMessage) {
      throw new Error(failureMessage);
    }

    return true;
  }

  async completeEmailRecovery(username: string, token: string, newPassword: string): Promise<boolean> {
    const normalizedUsername = username.toLowerCase();

    const { data, error } = await this.supabase.client.functions.invoke('complete-recovery', {
      body: {
        username: normalizedUsername,
        token,
        newPassword
      }
    });

    const failureMessage = error?.message || data?.error;

    if (failureMessage) {
      throw new Error(failureMessage);
    }

    return true;
  }

  /**
   * Reset password after successful recovery
   */
  async resetPassword(username: string, newPassword: string): Promise<boolean> {
    try {
      // Get user
      const { data: userData, error: userError } = await this.supabase.client
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .single();

      if (userError || !userData) {
        throw new Error('USER_NOT_FOUND');
      }

      // Update password via Supabase Auth
      // Note: This requires admin access or user's session
      // For now, we'll log the attempt and let the component handle it
      
      // Update last password change timestamp
      const { error: updateError } = await this.supabase.client
        .from('profiles')
        .update({
          last_password_change_at: new Date().toISOString(),
          failed_login_attempts: 0
        })
        .eq('id', userData.id);

      if (updateError) throw updateError;

      await this.logAuthAttempt(username, 'password_reset', true);
      this.recoveryState$.next({
        step: 'complete',
        method: this.recoveryState$.value.method,
        username: ''
      });

      return true;
    } catch (error) {
      await this.logAuthAttempt(username, 'password_reset', false, 'RESET_FAILED');
      throw error;
    }
  }

  async updatePasswordWithSession(newPassword: string): Promise<void> {
    const { error } = await this.supabase.client.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw error;
    }
  }

  /**
   * Setup recovery credentials during registration
   */
  async setupRecoveryCredentials(
    userId: string,
    credentials: RecoveryCredentials,
    recoveryCodes: string[],
    recoveryEmail?: string | null
  ): Promise<boolean> {
    try {
      const hash1 = await this.hashString(credentials.security_answer_1.toLowerCase().trim());
      const hash2 = await this.hashString(credentials.security_answer_2.toLowerCase().trim());
      const codeHashes = await Promise.all(recoveryCodes.map(code => this.hashString(code.trim())));

      const { error } = await this.supabase.client
        .from('user_recovery_credentials')
        .insert({
          user_id: userId,
          security_question_1: credentials.security_question_1,
          security_answer_1_hash: hash1,
          security_question_2: credentials.security_question_2,
          security_answer_2_hash: hash2,
          recovery_codes_hash: codeHashes,
          recovery_setup_completed_at: new Date().toISOString()
        });

      if (error) throw error;

      const profileUpdate: Record<string, unknown> = {
        has_completed_recovery_setup: true
      };

      if (recoveryEmail) {
        profileUpdate['recovery_email'] = recoveryEmail;
      }

      await this.supabase.client
        .from('profiles')
        .update(profileUpdate)
        .eq('id', userId);

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Log authentication attempts for security monitoring
   */
  private async logAuthAttempt(
    username: string,
    attemptType: 'login' | 'recovery' | 'password_reset',
    success: boolean,
    failureReason?: string
  ): Promise<void> {
    try {
      await this.supabase.client
        .from('auth_attempt_log')
        .insert({
          username: username.toLowerCase(),
          attempt_type: attemptType,
          success,
          failure_reason: failureReason || null,
          ip_address: await this.getClientIp(),
          user_agent: navigator.userAgent
        });
    } catch (error) {
      console.error('Failed to log auth attempt:', error);
    }
  }

  /**
   * Utility: Hash a string (client-side, using crypto API)
   * Note: In production, use bcryptjs for stronger hashing
   */
  private async hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate recovery codes (6 chars, 5 codes)
   */
  generateRecoveryCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 5; i++) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      codes.push(`${code.substring(0, 3)}-${code.substring(3)}`);
    }
    return codes;
  }

  /**
   * Build redirect URL for email recovery flow
   */
  private buildEmailRedirectUrl(): string {
    if (typeof window === 'undefined') {
      return '';
    }

    const base = window.location.origin;
    const path = '/auth/password-recovery';
    const url = new URL(path, base);
    url.searchParams.set('mode', 'email');
    return url.toString();
  }

  /**
   * Get client IP (for logging)
   */
  private async getClientIp(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Reset recovery state (used after successful flows)
   */
  resetRecoveryState(): void {
    this.recoveryState$.next({
      step: 'select-method',
      method: null,
      username: ''
    });
  }

}
