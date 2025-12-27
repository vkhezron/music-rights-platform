import { CommonModule } from '@angular/common';
import { Component, inject, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

// Import Lucide Icons
import { LucideAngularModule, Music, AlertCircle, Eye, EyeOff, Check, CheckCircle } from 'lucide-angular';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    RouterLink,
    LucideAngularModule
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private supabase = inject(SupabaseService);

  // Lucide Icons
  readonly Music = Music;
  readonly AlertCircle = AlertCircle;
  readonly Eye = Eye;
  readonly EyeOff = EyeOff;
  readonly Check = Check;
  readonly CheckCircle = CheckCircle;

  registerForm: FormGroup;
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  passwordValue = signal('');

  constructor() {
    this.registerForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    });

    // Password listener
    this.registerForm.get('password')?.valueChanges.subscribe(value => {
      this.passwordValue.set(value || '');
    });
  }

  passwordStrength = computed(() => {
    const password = this.passwordValue();

    if (password.length === 0) {
      return { label: '', strength: 0, color: '' };
    }

    let strength = 0;
    let label = '';
    let color = '';

    // Check length
    if (password.length >= 6) strength += 25;
    if (password.length >= 10) strength += 25;

    // Check for lowercase letters
    if (/[a-z]/.test(password)) strength += 15;

    // Check for uppercase letters
    if (/[A-Z]/.test(password)) strength += 15;

    // Check for numbers
    if (/\d/.test(password)) strength += 10;

    // Check for special characters
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 10;

    // Determine label and color based on strength
    if (strength < 40) {
      label = 'AUTH.WEAK';
      color = '#ef4444'; // Red
    } else if (strength < 75) {
      label = 'AUTH.MEDIUM';
      color = '#f59e0b'; // Orange
    } else {
      label = 'AUTH.STRONG';
      color = '#10b981'; // Green
    }

    return { label, strength, color };
  });

  passwordsMatch(): boolean {
    const password = this.registerForm.get('password')?.value;
    const confirmPassword = this.registerForm.get('confirmPassword')?.value;
    return password === confirmPassword;
  }

  async onSubmit() {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    if (!this.passwordsMatch()) {
      this.errorMessage.set('AUTH.PASSWORDS_MUST_MATCH');
      return;
    }

    this.isLoading.set(true);

    try {
      const { displayName, email, password } = this.registerForm.value;

      await this.supabase.signUp(email, password, displayName);

      // Success!
      this.successMessage.set('AUTH.REGISTRATION_SUCCESS');

      setTimeout(() => {
        sessionStorage.setItem('displayName', this.registerForm.value.displayName);
        this.router.navigate(['/profile/setup']);
      }, 2000);

    } catch (error: any) {
      console.error('Registration error:', error);

      if (error.message?.includes('already registered')) {
        this.errorMessage.set('AUTH.EMAIL_ALREADY_EXISTS');
      } else {
        this.errorMessage.set(error.message || 'AUTH.REGISTRATION_ERROR');
      }

    } finally {
      this.isLoading.set(false);
    }
  }

  togglePassword() {
    this.showPassword.set(!this.showPassword());
  }

  toggleConfirmPassword() {
    this.showConfirmPassword.set(!this.showConfirmPassword());
  }

  hasError(fieldName: string, errorType: string): boolean {
    const field = this.registerForm.get(fieldName);
    return field ? field.hasError(errorType) && (field.dirty || field.touched) : false;
  }
}