import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

// Import Lucide Icons
import { LucideAngularModule, Music, AlertCircle, Eye, EyeOff, Check } from 'lucide-angular';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    RouterLink,
    LucideAngularModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private supabase = inject(SupabaseService);

  // Lucide Icons
  readonly Music = Music;
  readonly AlertCircle = AlertCircle;
  readonly Eye = Eye;
  readonly EyeOff = EyeOff;
  readonly Check = Check;

  loginForm: FormGroup;
  isLoading = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);
  private emailInternalColumnSupported: boolean | null = null;

  constructor() {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  async onSubmit() {
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    
    try {
      const { username, password } = this.loginForm.value;
      const rawUsername = (username as string).trim();
      const normalizedUsername = rawUsername.toLowerCase();

      // If the user entered an email address, sign in directly with it
      if (normalizedUsername.includes('@')) {
        await this.supabase.signIn(normalizedUsername, password);
        this.router.navigate(['/profile-hub']);
        return;
      }

      const syntheticEmail = this.buildSyntheticEmail(normalizedUsername);
      let fallbackAuthError: any = null;

      // Attempt direct login using synthetic email (works for new username-first accounts)
      try {
        await this.supabase.signIn(syntheticEmail, password);
        this.router.navigate(['/profile-hub']);
        return;
      } catch (authError: any) {
        if (!this.isRecoverableAuthError(authError)) {
          throw authError;
        }

        fallbackAuthError = authError;
      }

      // Get user email from username lookup (for legacy accounts with real emails)
      let email: string | null = null;

      if (this.emailInternalColumnSupported !== false) {
        try {
          const { data: profile, error: lookupError } = await this.supabase.client
            .from('profiles')
            .select('email_internal')
            .eq('username', normalizedUsername)
            .maybeSingle();

          if (lookupError?.code === '42703' || lookupError?.message?.includes('email_internal')) {
            this.emailInternalColumnSupported = false;
          } else if (lookupError) {
            throw lookupError;
          } else if (profile) {
            email = profile.email_internal ?? null;
          }
        } catch (lookupError: any) {
          if (lookupError?.code === '42703' || lookupError?.message?.includes('email_internal')) {
            this.emailInternalColumnSupported = false;
          } else {
            throw lookupError;
          }
        }
      }

      if (!email) {
        // Fall back to synthetic email if column unavailable, otherwise surface invalid credentials
        if (this.emailInternalColumnSupported === false) {
          email = syntheticEmail;
        } else {
          throw (fallbackAuthError ?? new Error('AUTH.INVALID_CREDENTIALS'));
        }
      }

      await this.supabase.signIn(email, password);

      // Successful login
      this.router.navigate(['/profile-hub']);
    } catch (error: any) {
      if (error.message === 'AUTH.USERNAME_NOT_FOUND') {
        this.errorMessage.set('AUTH.INVALID_CREDENTIALS');
      } else if (error.message?.includes('Invalid login credentials')) {
        this.errorMessage.set('AUTH.INVALID_CREDENTIALS');
      } else {
        this.errorMessage.set(error.message || 'AUTH.LOGIN_ERROR');
      }
    } finally {
      // Stop loading indicator
      this.isLoading.set(false);
    }
  }

  // Toggle password visibility
  togglePassword() {
    this.showPassword.set(!this.showPassword());
  }

  // Check if field has errors
  hasError(fieldName: string, errorType: string): boolean {
    const field = this.loginForm.get(fieldName);
    return field ? field.hasError(errorType) && (field.dirty || field.touched) : false;
  }

  private buildSyntheticEmail(username: string): string {
    return `user-${username}@music-rights.local`;
  }

  private isRecoverableAuthError(error: any): boolean {
    if (!error) {
      return false;
    }

    const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
    if (message.includes('invalid login credentials') || message.includes('user not found')) {
      return true;
    }

    const status = typeof error.status === 'number' ? error.status : null;
    return status === 400 || status === 401;
  }
}