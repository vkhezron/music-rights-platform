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

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  async onSubmit() {
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading.set(true);
    try {
      const { email, password } = this.loginForm.value;

      await this.supabase.signIn(email, password);

      // Successful login
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.errorMessage.set(error.message || 'An error occurred during login.');
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
}