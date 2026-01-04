import { CommonModule } from '@angular/common';
import { Component, inject, signal, computed, effect, DestroyRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthRecoveryService, type SecurityQuestion } from '../../services/auth-recovery.service';
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
  readonly ArrowLeft = ArrowLeft;

  // Form Groups
  usernameForm: FormGroup;
  recoveryMethodForm: FormGroup;
  questionsForm: FormGroup;
  codeForm: FormGroup;
  passwordForm: FormGroup;

  // State Management
  currentStep = signal<'username' | 'method' | 'verify' | 'password' | 'success'>('username');
  recoveryMethod = signal<'questions' | 'code' | null>(null);
  username = signal('');
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  // Security Questions
  availableQuestions = signal<SecurityQuestion[]>([]);
  selectedQuestion1 = signal('');
  selectedQuestion2 = signal('');

  // Questions for display
  selectedQuestion1Key = computed(() => this.resolveQuestionKey(this.selectedQuestion1()));
  selectedQuestion2Key = computed(() => this.resolveQuestionKey(this.selectedQuestion2()));

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
      recoveryCode: ['', [Validators.required, Validators.minLength(7), Validators.pattern(/^[A-Z0-9-]{7,}$/)]]
    });
    this.codeForm.get('recoveryCode')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        if (typeof value !== 'string') {
          return;
        }

        const sanitized = value.toUpperCase().replace(/\s+/g, '');
        if (sanitized !== value) {
          this.codeForm.get('recoveryCode')?.setValue(sanitized, { emitEvent: false });
        }
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

    this.loadSecurityQuestions();
  }

  /**
   * Step 1: Verify Username
   */
  async submitUsername() {
    if (this.usernameForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.selectedQuestion1.set('');
    this.selectedQuestion2.set('');
    this.recoveryMethod.set(null);

    try {
      const usernameValue = (this.usernameForm.get('username')?.value || '').toString().trim();
      const normalizedUsername = usernameValue.toLowerCase();

      const recoveryDetails = await this.recoveryService.startRecovery(normalizedUsername);
      this.username.set(normalizedUsername);
      this.usernameForm.get('username')?.setValue(normalizedUsername, { emitEvent: false });
      this.recoveryMethodForm.get('method')?.setValue('questions', { emitEvent: false });
      this.selectedQuestion1.set(recoveryDetails.securityQuestion1Id ?? '');
      this.selectedQuestion2.set(recoveryDetails.securityQuestion2Id ?? '');

      this.currentStep.set('method');
    } catch (error: any) {
      if (error?.message === 'USERNAME_NOT_FOUND') {
        this.errorMessage.set('AUTH.USERNAME_NOT_FOUND');
      } else if (error?.message === 'RECOVERY_NOT_SETUP') {
        this.errorMessage.set('AUTH.RECOVERY_NOT_SETUP');
      } else {
        this.errorMessage.set('AUTH.RECOVERY_ERROR');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Step 2: Select Recovery Method
   */
  async submitRecoveryMethod() {
    if (this.recoveryMethodForm.invalid) return;

    const method = this.recoveryMethodForm.get('method')?.value as 'questions' | 'code';
    this.errorMessage.set('');

    this.recoveryMethod.set(method);
    this.currentStep.set('verify');
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
      const control = this.codeForm.get('recoveryCode');
      const rawCode = (control?.value ?? '').toString();
      const normalizedCode = rawCode.trim().toUpperCase();
      control?.setValue(normalizedCode, { emitEvent: false });

      await this.recoveryService.verifyWithRecoveryCode(
        this.username(),
        normalizedCode
      );
      this.currentStep.set('password');
    } catch (error: any) {
      const message = error?.message;
      if (message === 'INVALID_RECOVERY_CODE') {
        this.errorMessage.set('AUTH.INVALID_RECOVERY_CODE');
      } else if (message === 'RECOVERY_CODE_ALREADY_USED') {
        this.errorMessage.set('AUTH.RECOVERY_CODE_ALREADY_USED');
      } else if (message === 'USER_NOT_FOUND' || message === 'USERNAME_NOT_FOUND') {
        this.errorMessage.set('AUTH.USERNAME_NOT_FOUND');
      } else if (message === 'RECOVERY_NOT_SETUP') {
        this.errorMessage.set('AUTH.RECOVERY_NOT_SETUP');
      } else {
        this.errorMessage.set('AUTH.RECOVERY_VERIFICATION_FAILED');
      }
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
      await this.recoveryService.completeVerifiedRecovery(password);

      this.currentStep.set('success');
      this.successMessage.set('AUTH.PASSWORD_RESET_SUCCESS');
    } catch (error: any) {
      const message = error?.message;
      if (message === 'PASSWORD_TOO_SHORT') {
        this.errorMessage.set('AUTH.PASSWORD_MIN_LENGTH');
      } else if (message === 'PASSWORD_UPDATE_FAILED') {
        this.errorMessage.set('AUTH.PASSWORD_RESET_FAILED');
      } else if (message === 'RECOVERY_CODE_ALREADY_USED') {
        this.errorMessage.set('AUTH.RECOVERY_CODE_ALREADY_USED');
      } else if (message === 'INVALID_RECOVERY_CODE') {
        this.errorMessage.set('AUTH.INVALID_RECOVERY_CODE');
      } else if (message === 'INCORRECT_ANSWERS') {
        this.errorMessage.set('AUTH.INCORRECT_ANSWERS');
      } else {
        this.errorMessage.set('AUTH.PASSWORD_RESET_FAILED');
      }
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

  private resolveQuestionKey(questionId: string): string {
    const parsed = Number(questionId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return '';
    }

    const match = this.availableQuestions().find(question => question.id === parsed);
    return match?.question_key || '';
  }
}
