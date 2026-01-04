import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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

export interface RecoveryState {
  step: 'select-method' | 'verify-identity' | 'set-password' | 'complete';
  method: 'questions' | 'code' | null;
  username: string;
  securityQuestion1Id: string | null;
  securityQuestion2Id: string | null;
}

export interface StartRecoveryResult {
  securityQuestion1Id: string | null;
  securityQuestion2Id: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthRecoveryService {
  private recoveryState$ = new BehaviorSubject<RecoveryState>({
    step: 'select-method',
    method: null,
    username: '',
    securityQuestion1Id: null,
    securityQuestion2Id: null
  });
  private pendingVerifiedRecovery:
    | { method: 'questions'; username: string; answer1: string; answer2: string; verifiedAt: number }
    | { method: 'code'; username: string; recoveryCode: string; recoveryCodeHash: string; verifiedAt: number }
    | null = null;

  constructor(private supabase: SupabaseService) {}

  getRecoveryState(): Observable<RecoveryState> {
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
  async startRecovery(username: string): Promise<StartRecoveryResult> {
    const normalizedUsername = username.toLowerCase();

    try {
      // Lookup profile and recovery configuration
      const { data: profile, error: profileError } = await this.supabase.client
        .from('profiles')
        .select('id, username')
        .eq('username', normalizedUsername)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profile) {
        throw new Error('USERNAME_NOT_FOUND');
      }

      const { data: credentials, error: credentialsError } = await this.supabase.client
        .from('user_recovery_credentials')
        .select('security_question_1, security_question_2')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (credentialsError) {
        throw credentialsError;
      }

      if (!credentials) {
        throw new Error('RECOVERY_NOT_SETUP');
      }

      const securityQuestion1Id = credentials.security_question_1?.toString() ?? null;
      const securityQuestion2Id = credentials.security_question_2?.toString() ?? null;

      if (!securityQuestion1Id || !securityQuestion2Id) {
        throw new Error('RECOVERY_NOT_SETUP');
      }
      const result: StartRecoveryResult = {
        securityQuestion1Id,
        securityQuestion2Id
      };

      this.recoveryState$.next({
        ...this.recoveryState$.value,
        method: null,
        username: normalizedUsername,
        step: 'select-method',
        securityQuestion1Id,
        securityQuestion2Id
      });

      return result;
    } catch (error) {
      const failureReason = error instanceof Error && error.message
        ? error.message
        : 'RECOVERY_LOOKUP_FAILED';
      await this.logAuthAttempt(normalizedUsername, 'recovery', false, failureReason);
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
      const normalizedAnswer1 = answer1.toLowerCase().trim();
      const normalizedAnswer2 = answer2.toLowerCase().trim();
      const hash1 = await this.hashString(normalizedAnswer1);
      const hash2 = await this.hashString(normalizedAnswer2);

      // Verify answers match (compare hashes)
      const answer1Match = credData.security_answer_1_hash === hash1;
      const answer2Match = credData.security_answer_2_hash === hash2;

      if (!answer1Match || !answer2Match) {
        await this.logAuthAttempt(username, 'recovery', false, 'INVALID_ANSWERS');
        throw new Error('INCORRECT_ANSWERS');
      }

      this.pendingVerifiedRecovery = {
        method: 'questions',
        username: username.toLowerCase(),
        answer1: normalizedAnswer1,
        answer2: normalizedAnswer2,
        verifiedAt: Date.now()
      };

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
      const normalizedCode = code.trim().toUpperCase();
      const codeHash = await this.hashString(normalizedCode);
      const isValidCode = credData.recovery_codes_hash.includes(codeHash);

      if (!isValidCode) {
        await this.logAuthAttempt(username, 'recovery', false, 'INVALID_CODE');
        throw new Error('INVALID_RECOVERY_CODE');
      }

      // Check if code has already been used
      const usedCodes = Array.isArray(credData.used_recovery_codes) ? credData.used_recovery_codes : [];
      if (usedCodes.includes(codeHash)) {
        await this.logAuthAttempt(username, 'recovery', false, 'CODE_ALREADY_USED');
        throw new Error('RECOVERY_CODE_ALREADY_USED');
      }

      this.pendingVerifiedRecovery = {
        method: 'code',
        username: username.toLowerCase(),
        recoveryCode: normalizedCode,
        recoveryCodeHash: codeHash,
        verifiedAt: Date.now()
      };

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

  async completeVerifiedRecovery(newPassword: string): Promise<void> {
    const pending = this.pendingVerifiedRecovery;
    if (!pending) {
      throw new Error('RECOVERY_VERIFICATION_REQUIRED');
    }

    // 10 minutes max between verify and reset
    if (Date.now() - pending.verifiedAt > 10 * 60 * 1000) {
      this.pendingVerifiedRecovery = null;
      throw new Error('RECOVERY_VERIFICATION_EXPIRED');
    }

    const body: Record<string, any> = {
      username: pending.username,
      method: pending.method,
      newPassword
    };

    if (pending.method === 'questions') {
      body['answer1'] = pending.answer1;
      body['answer2'] = pending.answer2;
      body['recoveryCode'] = null;
    } else {
      body['recoveryCode'] = pending.recoveryCode;
      body['answer1'] = null;
      body['answer2'] = null;
    }

    const response = await fetch(`${environment.supabase.url}/functions/v1/complete-recovery`, {
      method: 'POST',
      headers: {
        apikey: environment.supabase.anonKey,
        Authorization: `Bearer ${environment.supabase.anonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const responseText = await response.text();
    let payload: any = null;
    try {
      payload = responseText ? JSON.parse(responseText) : null;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      console.error('complete-recovery edge call failed', {
        status: response.status,
        payload,
        raw: responseText
      });
      const failureMessage =
        payload?.error ||
        payload?.message ||
        payload?.details ||
        `RECOVERY_COMPLETE_FAILED:${response.status}`;
      throw new Error(failureMessage);
    }

    this.pendingVerifiedRecovery = null;
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
      const currentState = this.recoveryState$.value;
      this.recoveryState$.next({
        ...currentState,
        step: 'complete',
        username: ''
      });

      return true;
    } catch (error) {
      await this.logAuthAttempt(username, 'password_reset', false, 'RESET_FAILED');
      throw error;
    }
  }

  async getRecoveryUsage(): Promise<{ total: number; used: number; remaining: number }> {
    const userId = this.supabase.currentUser?.id;
    if (!userId) {
      throw new Error('AUTH.NOT_AUTHENTICATED');
    }

    const { data, error } = await this.supabase.client
      .from('user_recovery_credentials')
      .select('recovery_codes_hash, used_recovery_codes')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return { total: 0, used: 0, remaining: 0 };
    }

    const total = Array.isArray((data as any).recovery_codes_hash)
      ? (data as any).recovery_codes_hash.length
      : 0;
    const used = Array.isArray((data as any).used_recovery_codes)
      ? (data as any).used_recovery_codes.length
      : 0;

    return {
      total,
      used,
      remaining: Math.max(total - used, 0)
    };
  }

  async regenerateRecoveryCodes(): Promise<string[]> {
    const userId = this.supabase.currentUser?.id;
    if (!userId) {
      throw new Error('AUTH.NOT_AUTHENTICATED');
    }

    const newCodes = this.generateRecoveryCodes();
    const hashedCodes = await Promise.all(
      newCodes.map(code => this.hashString(code.trim().toUpperCase()))
    );

    const payload: Record<string, unknown> = {
      recovery_codes_hash: hashedCodes,
      used_recovery_codes: [],
      recovery_setup_completed_at: new Date().toISOString()
    };

    const { error } = await this.supabase.client
      .from('user_recovery_credentials')
      .update(payload)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return newCodes;
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
      const codeHashes = await Promise.all(
        recoveryCodes.map(code => this.hashString(code.trim().toUpperCase()))
      );
      
      const payload: Record<string, any> = {
        user_id: userId,
        security_question_1: credentials.security_question_1,
        security_answer_1_hash: hash1,
        security_question_2: credentials.security_question_2,
        security_answer_2_hash: hash2,
        recovery_codes_hash: codeHashes,
        recovery_setup_completed_at: new Date().toISOString()
      };

      await this.insertRecoveryCredentials(userId, async () => payload);

      const profileUpdate: Record<string, unknown> = {
        has_completed_recovery_setup: true
      };

      await this.supabase.client
        .from('profiles')
        .update(profileUpdate)
        .eq('id', userId);

      return true;
    } catch (error) {
      throw error;
    }
  }

  private async insertRecoveryCredentials(
    userId: string,
    buildPayload: () => Promise<Record<string, unknown>> | Record<string, unknown>
  ): Promise<void> {
    const maxAttempts = 8;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const payload = await buildPayload();

      const { error } = await this.supabase.client
        .from('user_recovery_credentials')
        .insert(payload);

      if (!error) {
        return;
      }

      if (error.code === '23503') {
        console.warn('Recovery credentials insert blocked by FK constraint, will retry.', {
          attempt,
          details: (error as any)?.details || (error as any)?.message || null
        });
        await this.delay(400 * attempt);
        continue;
      }

      console.warn('Recovery credentials insert failed', {
        attempt,
        code: error.code,
        details: (error as any)?.details || (error as any)?.message || null
      });

      if (error.code === '23505') {
        const { error: updateError } = await this.supabase.client
          .from('user_recovery_credentials')
          .update(payload)
          .eq('user_id', userId);

        if (!updateError) {
          return;
        }

        if (attempt === maxAttempts) {
          throw updateError;
        }

        await this.delay(400 * attempt);
        continue;
      }

      throw error;
    }

    throw new Error('RECOVERY_CREDENTIALS_FAILED');
  }

  private async delay(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
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
    this.pendingVerifiedRecovery = null;
    this.recoveryState$.next({
      step: 'select-method',
      method: null,
      username: '',
      securityQuestion1Id: null,
      securityQuestion2Id: null
    });
  }

}
