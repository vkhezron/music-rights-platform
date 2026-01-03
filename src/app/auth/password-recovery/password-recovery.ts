import { CommonModule } from '@angular/common';
import { Component, inject, signal, computed, effect, DestroyRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthRecoveryService } from '../../services/auth-recovery.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Lucide Icons
import { 
  LucideAngularModule, 
  Music, 
  AlertCircle, 
  CheckCircle, 
  Lock,
  Key,
  MessageSquare,
  Mail,
  ArrowLeft
} from 'lucide-angular';

@Component({
  selector: 'app-password-recovery',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    RouterLink,
    LucideAngularModule
  ],
  templateUrl: './password-recovery.html',
  styleUrl: './password-recovery.scss',
})
export class PasswordRecoveryComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private recoveryService = inject(AuthRecoveryService);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  // Icons
  readonly Music = Music;
  readonly AlertCircle = AlertCircle;
  readonly CheckCircle = CheckCircle;
  readonly Lock = Lock;
  readonly Key = Key;
  readonly MessageSquare = MessageSquare;
  readonly Mail = Mail;
  readonly ArrowLeft = ArrowLeft;

  // Form Groups
  usernameForm: FormGroup;
  recoveryMethodForm: FormGroup;
  questionsForm: FormGroup;
  codeForm: FormGroup;
  passwordForm: FormGroup;

  // State Management
  currentStep = signal<'username' | 'method' | 'verify' | 'password' | 'success'>('username');
  recoveryMethod = signal<'questions' | 'code' | 'email' | null>(null);
  username = signal('');
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  emailToken = signal<string | null>(null);

  // Security Questions
  availableQuestions = signal<any[]>([]);
  selectedQuestion1 = signal('');
  selectedQuestion2 = signal('');

  // Questions for display
  selectedQuestion1Text = computed(() => {
    return this.availableQuestions().find(q => q.id === Number(this.selectedQuestion1()))?.question_text || '';
  });

  selectedQuestion2Text = computed(() => {
    return this.availableQuestions().find(q => q.id === Number(this.selectedQuestion2()))?.question_text || '';
  });

  constructor() {
    this.usernameForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]]
    });

    this.recoveryMethodForm = this.fb.group({
      method: ['questions', Validators.required]
    });

    this.questionsForm = this.fb.group({
      answer1: ['', Validators.required],
      answer2: ['', Validators.required]
    });

    this.codeForm = this.fb.group({
      recoveryCode: ['', [Validators.required, Validators.minLength(7)]]
    });

    this.passwordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    });

    // Watch loading state to manage form disabled status
    effect(() => {
      const isLoading = this.isLoading();
      if (isLoading) {
        this.usernameForm.disable({ emitEvent: false });
        this.recoveryMethodForm.disable({ emitEvent: false });
        this.questionsForm.disable({ emitEvent: false });
        this.codeForm.disable({ emitEvent: false });
        this.passwordForm.disable({ emitEvent: false });
      } else {
        this.usernameForm.enable({ emitEvent: false });
        this.recoveryMethodForm.enable({ emitEvent: false });
        this.questionsForm.enable({ emitEvent: false });
        this.codeForm.enable({ emitEvent: false });
        this.passwordForm.enable({ emitEvent: false });
      }
    });

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const mode = params.get('mode');
        if (mode !== 'email') {
          return;
        }
  
        const token = (params.get('token') || '').trim();
        const usernameFromLink = (params.get('username') || '').trim();
  
        if (!token || !usernameFromLink) {
          this.errorMessage.set('AUTH.RECOVERY_EMAIL_INVALID_LINK');
          return;
        }
  
        if (this.emailToken()) {
          return;
        }
  
        this.bootstrapEmailRecovery(usernameFromLink, token);
      });
  
    this.loadSecurityQuestions();
  }

  /**
   * Step 1: Verify Username
   */
  async submitUsername() {
    if (this.usernameForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const usernameValue = (this.usernameForm.get('username')?.value || '').toString().trim();
      const normalizedUsername = usernameValue.toLowerCase();

      await this.recoveryService.startRecovery(normalizedUsername);
      this.username.set(normalizedUsername);
      this.usernameForm.get('username')?.setValue(normalizedUsername, { emitEvent: false });
      this.currentStep.set('method');
    } catch (error: any) {
      this.errorMessage.set(error.message === 'USERNAME_NOT_FOUND' 
        ? 'AUTH.USERNAME_NOT_FOUND' 
        : 'AUTH.RECOVERY_ERROR');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Step 2: Select Recovery Method
   */
  async submitRecoveryMethod() {
    if (this.recoveryMethodForm.invalid) return;

    const method = this.recoveryMethodForm.get('method')?.value as 'questions' | 'code' | 'email';
    this.errorMessage.set('');

    if (method === 'email') {
      this.isLoading.set(true);

      try {
        await this.recoveryService.initiateEmailRecovery(this.username());
        this.recoveryMethod.set(method);
        this.currentStep.set('verify');
      } catch (error: any) {
        const message = error?.message;
        let translationKey = 'AUTH.RECOVERY_EMAIL_FAILED';

        if (message === 'NO_RECOVERY_EMAIL') {
          translationKey = 'AUTH.RECOVERY_EMAIL_NOT_AVAILABLE';
        } else if (message === 'RECOVERY_EMAIL_THROTTLED') {
          translationKey = 'AUTH.RECOVERY_EMAIL_THROTTLED';
        } else if (message === 'USERNAME_NOT_FOUND') {
          translationKey = 'AUTH.USERNAME_NOT_FOUND';
        }

        this.errorMessage.set(translationKey);
        return;
      } finally {
        this.isLoading.set(false);
      }
    } else {
      this.recoveryMethod.set(method);
      this.currentStep.set('verify');
    }
  }

  /**
   * Step 3A: Verify with Security Questions
   */
  async submitSecurityQuestions() {
    if (this.questionsForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const { answer1, answer2 } = this.questionsForm.value;
      await this.recoveryService.verifyWithSecurityQuestions(
        this.username(),
        answer1,
        answer2
      );
      this.currentStep.set('password');
    } catch (error: any) {
      this.errorMessage.set(error.message === 'INCORRECT_ANSWERS'
        ? 'AUTH.INCORRECT_ANSWERS'
        : 'AUTH.RECOVERY_VERIFICATION_FAILED');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Step 3B: Verify with Recovery Code
   */
  async submitRecoveryCode() {
    if (this.codeForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const { recoveryCode } = this.codeForm.value;
      await this.recoveryService.verifyWithRecoveryCode(
        this.username(),
        recoveryCode
      );
      this.currentStep.set('password');
    } catch (error: any) {
      this.errorMessage.set(error.message === 'INVALID_RECOVERY_CODE'
        ? 'AUTH.INVALID_RECOVERY_CODE'
        : error.message === 'RECOVERY_CODE_ALREADY_USED'
        ? 'AUTH.RECOVERY_CODE_ALREADY_USED'
        : 'AUTH.RECOVERY_VERIFICATION_FAILED');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Step 4: Reset Password
   */
  async submitNewPassword() {
    if (this.passwordForm.invalid) return;

    const { password, confirmPassword } = this.passwordForm.value;
    if (password !== confirmPassword) {
      this.errorMessage.set('AUTH.PASSWORDS_DO_NOT_MATCH');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      if (this.recoveryMethod() === 'email' && this.emailToken()) {
        await this.recoveryService.completeEmailRecovery(this.username(), this.emailToken()!, password);
        this.emailToken.set(null);
      } else {
        await this.recoveryService.updatePasswordWithSession(password);
        await this.recoveryService.resetPassword(this.username(), password);
      }

      this.currentStep.set('success');
      this.successMessage.set('AUTH.PASSWORD_RESET_SUCCESS');
    } catch (error: any) {
      const message = error?.message;
      if (message === 'RECOVERY_TOKEN_EXPIRED') {
        this.errorMessage.set('AUTH.RECOVERY_EMAIL_EXPIRED');
      } else if (message === 'RECOVERY_TOKEN_INVALID') {
        this.errorMessage.set('AUTH.RECOVERY_EMAIL_INVALID_LINK');
      } else if (message === 'PASSWORD_TOO_SHORT') {
        this.errorMessage.set('AUTH.PASSWORD_MIN_LENGTH');
      } else if (message === 'PASSWORD_UPDATE_FAILED') {
        this.errorMessage.set('AUTH.PASSWORD_RESET_FAILED');
      } else {
        this.errorMessage.set('AUTH.PASSWORD_RESET_FAILED');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Handle email recovery links
   */
  private async bootstrapEmailRecovery(usernameFromLink: string, token: string) {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const normalizedUsername = usernameFromLink.toLowerCase();

    try {
      await this.recoveryService.validateEmailRecoveryToken(normalizedUsername, token);

      this.username.set(normalizedUsername);
      this.emailToken.set(token);
      this.recoveryMethod.set('email');
      this.currentStep.set('password');
      this.successMessage.set('AUTH.RECOVERY_EMAIL_VERIFIED');

      this.usernameForm.get('username')?.setValue(normalizedUsername, { emitEvent: false });
      this.recoveryMethodForm.get('method')?.setValue('email', { emitEvent: false });
    } catch (error: any) {
      const message = error?.message;
      if (message === 'RECOVERY_TOKEN_EXPIRED') {
        this.errorMessage.set('AUTH.RECOVERY_EMAIL_EXPIRED');
      } else if (message === 'RECOVERY_TOKEN_INVALID' || message === 'USERNAME_NOT_FOUND') {
        this.errorMessage.set('AUTH.RECOVERY_EMAIL_INVALID_LINK');
      } else if (message === 'RECOVERY_TOKEN_REQUIRED') {
        this.errorMessage.set('AUTH.RECOVERY_EMAIL_INVALID_LINK');
      } else {
        this.errorMessage.set('AUTH.RECOVERY_EMAIL_FAILED');
      }
      this.recoveryService.resetRecoveryState();
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Load available security questions
   */
  private async loadSecurityQuestions() {
    try {
      this.availableQuestions.set(
        await this.recoveryService.getSecurityQuestions()
      );
    } catch (error) {
      console.error('Failed to load security questions:', error);
    }
  }

  /**
   * Go back to previous step
   */
  goBack() {
    const steps: ('username' | 'method' | 'verify' | 'password' | 'success')[] = 
      ['username', 'method', 'verify', 'password'];
    const currentIndex = steps.indexOf(this.currentStep());
    
    if (currentIndex > 0) {
      this.currentStep.set(steps[currentIndex - 1]);
      this.errorMessage.set('');
    }
  }

  /**
   * Return to login
   */
  returnToLogin() {
    this.recoveryService.resetRecoveryState();
    this.router.navigate(['/auth/login']);
  }

  /**
   * Check if field has errors
   */
  hasError(form: FormGroup, fieldName: string, errorType: string): boolean {
    const field = form.get(fieldName);
    return field ? field.hasError(errorType) && (field.dirty || field.touched) : false;
  }
}
