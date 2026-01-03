import { CommonModule } from '@angular/common';
import { Component, inject, signal, computed, effect } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { AuthRecoveryService } from '../../services/auth-recovery.service';

// Import Lucide Icons
import { 
  LucideAngularModule, 
  Music, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Check,
  CheckCircle,
  Copy,
  Download
} from 'lucide-angular';

@Component({
  selector: 'app-register-new',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    RouterLink,
    LucideAngularModule
  ],
  templateUrl: './register-new.html',
  styleUrl: './register-new.scss',
})
export class RegisterNewComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private supabase = inject(SupabaseService);
  private recoveryService = inject(AuthRecoveryService);

  // Lucide Icons
  readonly Music = Music;
  readonly AlertCircle = AlertCircle;
  readonly Eye = Eye;
  readonly EyeOff = EyeOff;
  readonly Check = Check;
  readonly CheckCircle = CheckCircle;
  readonly Copy = Copy;
  readonly Download = Download;

  // Step tracking
  currentStep = signal<'account' | 'password' | 'recovery' | 'backup-codes' | 'success'>('account');

  // Form Groups
  accountForm: FormGroup;
  passwordForm: FormGroup;
  recoveryForm: FormGroup;
  confirmCodesForm: FormGroup;

  // State Management
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  usernameAvailable = signal<boolean | null>(null);
  checkingUsername = signal(false);
  checkingRecoveryEmail = signal(false);
  displayNameAvailable = signal<boolean | null>(null);
  checkingDisplayName = signal(false);
  private lastNormalizedDisplayNameChecked = '';
  private displayNameColumnSupported: boolean | null = null;
  private fullNameColumnSupported: boolean | null = null;

  // Recovery
  securityQuestions = signal<any[]>([]);
  selectedQuestion1 = signal('');
  selectedQuestion2 = signal('');
  backupCodes = signal<string[]>([]);
  copiedCode = signal<string | null>(null);

  // Password strength
  passwordValue = signal('');

  passwordStrength = computed(() => {
    const password = this.passwordValue();

    if (password.length === 0) {
      return { label: '', strength: 0, color: '' };
    }

    let strength = 0;
    let label = '';
    let color = '';

    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[a-z]/.test(password)) strength += 15;
    if (/[A-Z]/.test(password)) strength += 15;
    if (/\d/.test(password)) strength += 10;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 10;

    if (strength < 40) {
      label = 'AUTH.WEAK';
      color = '#ef4444';
    } else if (strength < 75) {
      label = 'AUTH.MEDIUM';
      color = '#f59e0b';
    } else {
      label = 'AUTH.STRONG';
      color = '#10b981';
    }

    return { label, strength, color };
  });

  constructor() {
    this.accountForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
      displayName: ['', [Validators.required, Validators.minLength(2)]]
    });

    this.passwordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    });

    this.recoveryForm = this.fb.group({
      question1: ['', Validators.required],
      answer1: ['', Validators.required],
      question2: ['', Validators.required],
      answer2: ['', Validators.required],
      recoveryEmail: ['', [Validators.email]]
    });

    this.confirmCodesForm = this.fb.group({
      codeConfirm: ['', Validators.required]
    });

    // Watch loading state to manage form disabled status
    effect(() => {
      const isLoading = this.isLoading();
      if (isLoading) {
        this.accountForm.disable({ emitEvent: false });
        this.passwordForm.disable({ emitEvent: false });
        this.recoveryForm.disable({ emitEvent: false });
        this.confirmCodesForm.disable({ emitEvent: false });
      } else {
        this.accountForm.enable({ emitEvent: false });
        this.passwordForm.enable({ emitEvent: false });
        this.recoveryForm.enable({ emitEvent: false });
        this.confirmCodesForm.enable({ emitEvent: false });
      }
    });

    // Listen to password changes
    this.passwordForm.get('password')?.valueChanges.subscribe(value => {
      this.passwordValue.set(value || '');
    });

    // Listen to username changes for validation
    this.accountForm.get('username')?.valueChanges.subscribe(value => {
      if (value && value.length >= 3) {
        this.checkUsernameAvailability(value);
      } else {
        this.usernameAvailable.set(null);
      }
    });

    this.accountForm.get('displayName')?.valueChanges.subscribe(value => {
      this.clearDisplayNameTakenError();

      const normalized = this.normalizeDisplayName(value || '');
      const normalizedKey = normalized.toLowerCase();

      if (!normalized || normalized.length < 2) {
        this.displayNameAvailable.set(null);
        this.lastNormalizedDisplayNameChecked = '';
        return;
      }

      if (normalizedKey === this.lastNormalizedDisplayNameChecked) {
        return;
      }

      this.checkDisplayNameAvailability(normalized).catch(error => {
        console.error('Display name availability check failed:', error);
      });
    });

    // Clear recovery email taken errors when user edits the field
    this.recoveryForm.get('recoveryEmail')?.valueChanges.subscribe(() => {
      const control = this.recoveryForm.get('recoveryEmail');
      if (!control) {
        return;
      }

      const errors = control.errors;
      if (errors?.['emailTaken']) {
        const { emailTaken, ...others } = errors;
        control.setErrors(Object.keys(others).length ? others : null);
      }

      if (this.errorMessage() === 'AUTH.RECOVERY_EMAIL_IN_USE') {
        this.errorMessage.set('');
      }
    });

    this.loadSecurityQuestions();
  }

  /**
   * Step 1: Create Account
   */
  async submitAccountForm() {
    if (this.accountForm.invalid || this.usernameAvailable() !== true) {
      return;
    }

    const displayNameControl = this.accountForm.get('displayName');
    const normalizedDisplayName = this.normalizeDisplayName(displayNameControl?.value || '');
    const normalizedDisplayNameKey = normalizedDisplayName.toLowerCase();

    if (normalizedDisplayName !== displayNameControl?.value) {
      displayNameControl?.setValue(normalizedDisplayName, { emitEvent: false });
    }

    if (normalizedDisplayName.length >= 2) {
      try {
        const mustCheck =
          this.displayNameAvailable() === null ||
          this.lastNormalizedDisplayNameChecked !== normalizedDisplayNameKey;

        const available = mustCheck
          ? await this.checkDisplayNameAvailability(normalizedDisplayName)
          : this.displayNameAvailable();

        if (!available) {
          this.setDisplayNameTakenError();
          return;
        }
      } catch (error) {
        console.error('Display name validation failed:', error);
        this.errorMessage.set('AUTH.REGISTRATION_ERROR');
        return;
      }
    }

    if (this.displayNameAvailable() !== true) {
      this.setDisplayNameTakenError();
      return;
    }

    this.currentStep.set('password');
  }

  /**
   * Step 2: Set Password
   */
  submitPasswordForm() {
    if (this.passwordForm.invalid) return;

    const password = this.passwordForm.get('password')?.value;
    const confirmPassword = this.passwordForm.get('confirmPassword')?.value;

    if (password !== confirmPassword) {
      this.errorMessage.set('AUTH.PASSWORDS_DO_NOT_MATCH');
      return;
    }

    this.currentStep.set('recovery');
  }

  /**
   * Step 3: Setup Recovery
   */
  async submitRecoveryForm() {
    if (this.recoveryForm.invalid) return;

    this.errorMessage.set('');

    const recoveryEmailControl = this.recoveryForm.get('recoveryEmail');
    const recoveryEmailRaw = (recoveryEmailControl?.value as string | null) ?? '';
    const normalizedRecoveryEmail = recoveryEmailRaw.trim().toLowerCase();

    if (normalizedRecoveryEmail) {
      this.checkingRecoveryEmail.set(true);
      try {
        const emailAvailable = await this.isRecoveryEmailAvailable(normalizedRecoveryEmail);
        if (!emailAvailable) {
          this.errorMessage.set('AUTH.RECOVERY_EMAIL_IN_USE');
          const control = this.recoveryForm.get('recoveryEmail');
          const existingErrors = control?.errors || {};
          control?.setErrors({ ...existingErrors, emailTaken: true });
          control?.markAsTouched();
          return;
        }

        recoveryEmailControl?.setValue(normalizedRecoveryEmail, { emitEvent: false });
      } catch (error) {
        console.error('Recovery email lookup failed:', error);
        this.errorMessage.set('AUTH.REGISTRATION_ERROR');
        return;
      } finally {
        this.checkingRecoveryEmail.set(false);
      }
    }

    const question1 = this.recoveryForm.get('question1')?.value;
    const question2 = this.recoveryForm.get('question2')?.value;

    if (question1 === question2) {
      this.errorMessage.set('AUTH.QUESTIONS_MUST_BE_DIFFERENT');
      return;
    }

    // Generate backup codes
    const codes = this.recoveryService.generateRecoveryCodes();
    this.backupCodes.set(codes);

    this.currentStep.set('backup-codes');
  }

  /**
   * Step 4: Confirm Backup Codes
   */
  submitBackupCodesForm() {
    if (this.confirmCodesForm.invalid) return;

    // Verify user entered one of the codes
    const enteredCode = this.confirmCodesForm.get('codeConfirm')?.value;
    const codeExists = this.backupCodes().some(code => code.includes(enteredCode));

    if (!codeExists) {
      this.errorMessage.set('AUTH.INVALID_BACKUP_CODE');
      return;
    }

    this.currentStep.set('success');
    this.createAccount();
  }

  /**
   * Create account after all steps complete
   */
  async createAccount() {
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const { username } = this.accountForm.value;
      const displayNameControl = this.accountForm.get('displayName');
      const normalizedDisplayName = this.normalizeDisplayName(displayNameControl?.value || '');
      const { password } = this.passwordForm.value;
      const {
        question1,
        answer1,
        question2,
        answer2,
        recoveryEmail: recoveryEmailValue
      } = this.recoveryForm.value;
      const normalizedRecoveryEmail = (recoveryEmailValue as string | null)?.trim().toLowerCase() || null;

      // Sign up user
      await this.supabase.signUp(username, password, normalizedDisplayName);

      // Get current user to set up recovery
      const user = this.supabase.currentUser;
      if (user) {
        // Setup recovery credentials
        await this.recoveryService.setupRecoveryCredentials(
          user.id,
          {
            security_question_1: question1,
            security_answer_1: answer1,
            security_question_2: question2,
            security_answer_2: answer2
          },
          this.backupCodes(),
          normalizedRecoveryEmail || null
        );
      }

      this.successMessage.set('AUTH.REGISTRATION_SUCCESS');
      setTimeout(() => {
        sessionStorage.setItem('displayName', normalizedDisplayName);
        this.router.navigate(['/profile-hub']);
      }, 2000);
    } catch (error: any) {
      console.error('Registration error:', error);
      const message = error?.message || 'AUTH.REGISTRATION_ERROR';

      if (message === 'AUTH.DISPLAY_NAME_TAKEN') {
        this.setDisplayNameTakenError();
      } else if (message === 'AUTH.USERNAME_TAKEN') {
        const control = this.accountForm.get('username');
        const existingErrors = control?.errors || {};
        control?.setErrors({ ...existingErrors, usernameTaken: true });
        control?.markAsTouched();
        this.usernameAvailable.set(false);
      }

      this.errorMessage.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Check if username is available
   */
  private async checkUsernameAvailability(username: string) {
    this.checkingUsername.set(true);

    try {
      // Validate format first
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        this.usernameAvailable.set(false);
        return;
      }

      // Query without .single() to avoid error when no data exists
      const { data, error } = await this.supabase.client
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase());

      // Username is available if no records found and no error
      const isAvailable = !error && (!data || data.length === 0);
      this.usernameAvailable.set(isAvailable);

      const control = this.accountForm.get('username');

      if (isAvailable && control?.errors?.['usernameTaken']) {
        const { usernameTaken, ...others } = control.errors;
        control.setErrors(Object.keys(others).length ? others : null);
      }
    } catch (error) {
      console.error('Username check error:', error);
      this.usernameAvailable.set(false); // Mark as unavailable on error
    } finally {
      this.checkingUsername.set(false);
    }
  }

  private async checkDisplayNameAvailability(displayName: string): Promise<boolean> {
    this.checkingDisplayName.set(true);

    const control = this.accountForm.get('displayName');
    const normalizedKey = displayName.toLowerCase();

    try {
      if (this.displayNameColumnSupported !== false) {
        const { data, error } = await this.supabase.client
          .from('profiles')
          .select('id')
          .eq('display_name_normalized', normalizedKey)
          .limit(1);

        if (error?.code === '42703') {
          this.displayNameColumnSupported = false;
        } else if (error) {
          throw error;
        } else {
          this.displayNameColumnSupported = true;
          const available = !data || data.length === 0;
          this.displayNameAvailable.set(available);
          this.lastNormalizedDisplayNameChecked = normalizedKey;

          if (!available) {
            this.setDisplayNameTakenError(false);
          }

          return available;
        }
      }

      if (this.fullNameColumnSupported === false) {
        this.displayNameAvailable.set(true);
        this.lastNormalizedDisplayNameChecked = normalizedKey;
        return true;
      }

      const { data: fallbackData, error: fallbackError } = await this.supabase.client
        .from('profiles')
        .select('id')
        .ilike('full_name', displayName)
        .limit(1);

      if (fallbackError?.code === '42703') {
        this.fullNameColumnSupported = false;

        this.displayNameAvailable.set(true);
        this.lastNormalizedDisplayNameChecked = normalizedKey;
        return true;
      }

      if (fallbackError) {
        throw fallbackError;
      }

      this.fullNameColumnSupported = true;

      const available = !fallbackData || fallbackData.length === 0;
      this.displayNameAvailable.set(available);
      this.lastNormalizedDisplayNameChecked = normalizedKey;

      if (!available) {
        this.setDisplayNameTakenError(false);
      }

      return available;
    } catch (error: any) {
      if (error?.code === '42703') {
        this.displayNameColumnSupported = false;
        this.fullNameColumnSupported = false;

        this.displayNameAvailable.set(true);
        this.lastNormalizedDisplayNameChecked = normalizedKey;
        return true;
      }

      this.displayNameAvailable.set(false);
      throw error;
    } finally {
      this.checkingDisplayName.set(false);
    }
  }

  private async isRecoveryEmailAvailable(email: string): Promise<boolean> {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('id')
      .ilike('recovery_email', email)
      .limit(1);

    if (error) {
      throw error;
    }

    return !data || data.length === 0;
  }

  /**
   * Load available security questions
   */
  private async loadSecurityQuestions() {
    try {
      this.securityQuestions.set(
        await this.recoveryService.getSecurityQuestions()
      );
    } catch (error) {
      console.error('Failed to load security questions:', error);
    }
  }

  /**
   * Copy backup code to clipboard
   */
  copyCode(code: string) {
    navigator.clipboard.writeText(code);
    this.copiedCode.set(code);
    setTimeout(() => this.copiedCode.set(null), 2000);
  }

  /**
   * Download backup codes as text file
   */
  downloadCodes() {
    const content = `Backup Recovery Codes\n${'='.repeat(30)}\n\n${this.backupCodes().join('\n')}\n\nKeep these codes safe. Each code can only be used once.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'backup-codes.txt';
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Navigation
   */
  goBack() {
    const steps: ('account' | 'password' | 'recovery' | 'backup-codes' | 'success')[] = 
      ['account', 'password', 'recovery', 'backup-codes'];
    const currentIndex = steps.indexOf(this.currentStep());
    
    if (currentIndex > 0) {
      this.currentStep.set(steps[currentIndex - 1]);
      this.errorMessage.set('');
    }
  }

  /**
   * Check if field has errors
   */
  hasError(form: FormGroup, fieldName: string, errorType: string): boolean {
    const field = form.get(fieldName);
    return field ? field.hasError(errorType) && (field.dirty || field.touched) : false;
  }

  togglePassword() {
    this.showPassword.set(!this.showPassword());
  }

  toggleConfirmPassword() {
    this.showConfirmPassword.set(!this.showConfirmPassword());
  }

  private normalizeDisplayName(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  private setDisplayNameTakenError(showGlobalMessage = true) {
    const control = this.accountForm.get('displayName');
    const existingErrors = control?.errors || {};
    control?.setErrors({ ...existingErrors, displayNameTaken: true });
    control?.markAsTouched();
    this.displayNameAvailable.set(false);

    if (showGlobalMessage) {
      this.errorMessage.set('AUTH.DISPLAY_NAME_TAKEN');
    }
  }

  private clearDisplayNameTakenError() {
    const control = this.accountForm.get('displayName');

    if (control?.errors?.['displayNameTaken']) {
      const { displayNameTaken, ...others } = control.errors;
      control.setErrors(Object.keys(others).length ? others : null);
    }

    if (this.errorMessage() === 'AUTH.DISPLAY_NAME_TAKEN') {
      this.errorMessage.set('');
    }
  }
}
