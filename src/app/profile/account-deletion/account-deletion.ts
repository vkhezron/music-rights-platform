import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, AlertTriangle, X, Trash2 } from 'lucide-angular';
import { GdprService } from '../../services/gdpr.service';

@Component({
  selector: 'app-account-deletion',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LucideAngularModule],
  templateUrl: './account-deletion.html',
  styleUrls: ['./account-deletion.scss']
})
export class AccountDeletionComponent {
  private gdprService = inject(GdprService);
  private router = inject(Router);

  // Icons
  readonly AlertTriangle = AlertTriangle;
  readonly X = X;
  readonly Trash2 = Trash2;

  // Form state
  password = signal('');
  confirmText = signal('');
  isDeleting = signal(false);
  errorMessage = signal('');
  showConfirmDialog = signal(false);

  /**
   * Open confirmation dialog
   */
  openConfirmDialog() {
    this.password.set('');
    this.confirmText.set('');
    this.errorMessage.set('');
    this.showConfirmDialog.set(true);
  }

  /**
   * Close confirmation dialog
   */
  closeDialog() {
    if (!this.isDeleting()) {
      this.showConfirmDialog.set(false);
      this.password.set('');
      this.confirmText.set('');
      this.errorMessage.set('');
    }
  }

  /**
   * Check if delete button should be enabled
   */
  canDelete(): boolean {
    return (
      this.password().length >= 6 &&
      this.confirmText().toLowerCase() === 'delete' &&
      !this.isDeleting()
    );
  }

  /**
   * Delete account
   */
  async deleteAccount() {
    if (!this.canDelete()) return;

    this.isDeleting.set(true);
    this.errorMessage.set('');

    try {
      await this.gdprService.deleteAccount(this.password());
      
      // Success - user is now signed out and will be redirected by auth guard
      // Navigate to a goodbye page or home
      this.router.navigate(['/auth/login'], { 
        queryParams: { message: 'account_deleted' } 
      });
    } catch (error: any) {
      console.error('Account deletion error:', error);
      
      if (error.message === 'Incorrect password') {
        this.errorMessage.set('GDPR.DELETE_ACCOUNT_ERROR_PASSWORD');
      } else {
        this.errorMessage.set('GDPR.DELETE_ACCOUNT_ERROR_GENERIC');
      }
      
      this.isDeleting.set(false);
    }
  }

  /**
   * Navigate back to profile
   */
  goBack() {
    this.router.navigate(['/profile/edit']);
  }
}
