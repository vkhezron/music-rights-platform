import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ProfileService } from '../../services/profile.service';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-qr-code-display',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './qr-code-display.html',
  styleUrl: './qr-code-display.scss'
})
export class QrCodeDisplayComponent implements OnInit {
  private router = inject(Router);
  private profileService = inject(ProfileService);

  // Signals for state
  qrCodeDataUrl = signal<string>('');
  isLoading = signal(true);
  errorMessage = signal<string>('');

  // Profile data
  profile = this.profileService.currentProfile;

  async ngOnInit() {
    if (!this.profile) {
      this.errorMessage.set('Profile not found');
      this.isLoading.set(false);
      return;
    }

    try {
      await this.generateQRCode();
    } catch (error) {
      console.error('Error generating QR code:', error);
      this.errorMessage.set('Failed to generate QR code');
    } finally {
      this.isLoading.set(false);
    }
  }

  async generateQRCode() {
    if (!this.profile) return;

    // Create QR code data with user profile info
    const qrData = {
      platform: 'music-rights-platform',
      user_number: this.profile.user_number,
      nickname: this.profile.nickname,
      type: 'profile'
    };

    try {
      // Generate QR code as data URL
      const dataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      this.qrCodeDataUrl.set(dataUrl);
    } catch (error) {
      console.error('QR Code generation error:', error);
      throw error;
    }
  }

  downloadQRCode() {
    if (!this.qrCodeDataUrl() || !this.profile) return;

    // Create download link
    const link = document.createElement('a');
    link.href = this.qrCodeDataUrl();
    link.download = `${this.profile.nickname}-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}