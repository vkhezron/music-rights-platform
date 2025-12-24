import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule
    , ReactiveFormsModule
    , TranslateModule
    , RouterLink
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private supabase = inject(SupabaseService);

  loginForm : FormGroup;
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
    const {email, password} = this.loginForm.value;

    await this.supabase.signIn(email, password);

    // Add these console logs
    console.log('✅ Login successful!');
    console.log('Current user:', this.supabase.currentUser);

    // Successful login
    this.router.navigate(['/dashboard']);
  }
  catch (error: any) {
    console.error('❌ Login failed:', error);
    this.errorMessage.set(error.message || 'An error occurred during login.');
  }
  finally {
    // Stop loading indicator
    this.isLoading.set(false);
  }
}

  //Toggle pwd visibility
  togglePassword() {
    this.showPassword.set(!this.showPassword());
  }

  //Check  if field has errors
  hasError(fieldName: string, errorType: string): boolean {

    const field = this.loginForm.get(fieldName);
    return field ? field.hasError(errorType) && (field.dirty || field.touched) : false;
  }

}
