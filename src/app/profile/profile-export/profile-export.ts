import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { GdprService } from '../../services/gdpr.service';
import { LucideAngularModule, ArrowLeft, Download, AlertCircle, CheckCircle } from 'lucide-angular';

@Component({
  selector: 'app-profile-export',
  standalone: true,
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  templateUrl: './profile-export.html',
  styleUrl: './profile-export.scss'
})
export class ProfileExportComponent {
  private router = inject(Router);
  private gdprService = inject(GdprService);

  readonly ArrowLeft = ArrowLeft;
  readonly Download = Download;
  readonly AlertCircle = AlertCircle;
  readonly CheckCircle = CheckCircle;

  isExporting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  downloadDisabled = computed(() => this.isExporting());

  constructor() {
    effect(() => {
      if (this.successMessage()) {
        const timeout = setTimeout(() => this.successMessage.set(''), 4000);
        return () => clearTimeout(timeout);
      }
      return;
    });
  }

  async downloadData(): Promise<void> {
    if (this.isExporting()) {
      return;
    }

    this.isExporting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      await this.gdprService.downloadPersonalData();
      this.successMessage.set('GDPR.DATA_EXPORT_SUCCESS');
    } catch (error: any) {
      const message = typeof error?.message === 'string' ? error.message : 'GDPR.DATA_EXPORT_FAILED';
      this.errorMessage.set(message);
    } finally {
      this.isExporting.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(['/profile/delete-account']);
  }
}
