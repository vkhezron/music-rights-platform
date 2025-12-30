import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, X } from 'lucide-angular';
import { GdprService } from '../../services/gdpr.service';

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, LucideAngularModule, FormsModule],
  template: `
    @if (showBanner()) {
      <div class="cookie-banner" role="banner">
        <div class="cookie-content">
          <div class="cookie-text">
            <h3>{{ 'GDPR.COOKIES_TITLE' | translate }}</h3>
            <p>{{ 'GDPR.COOKIES_DESCRIPTION' | translate }}</p>
            <p class="cookie-details">
              {{ 'GDPR.COOKIES_DETAILS' | translate }}
            </p>
            <a routerLink="/privacy-policy" class="privacy-link">
              {{ 'FOOTER.PRIVACY' | translate }}
            </a>
          </div>

          <div class="cookie-actions">
            <button 
              class="btn btn-secondary"
              (click)="showDetails.set(!showDetails())">
              {{ 'GDPR.CUSTOMIZE' | translate }}
            </button>

            <button 
              class="btn btn-primary"
              (click)="acceptAll()">
              {{ 'GDPR.ACCEPT_ALL' | translate }}
            </button>

            <button 
              class="btn btn-icon"
              (click)="dismiss()">
              <lucide-icon [img]="X"></lucide-icon>
            </button>
          </div>
        </div>

        @if (showDetails()) {
          <div class="cookie-details-section">
            <h4>{{ 'GDPR.COOKIE_PREFERENCES' | translate }}</h4>
            
            <div class="preference-group">
              <label>
                <input type="checkbox" name="essential" checked disabled />
                <span>{{ 'GDPR.ESSENTIAL' | translate }}</span>
                <span class="required">(required)</span>
              </label>
              <p class="preference-desc">{{ 'GDPR.ESSENTIAL_DESC' | translate }}</p>
            </div>

            <div class="preference-group">
              <label>
                <input 
                  type="checkbox" 
                  name="analytics"
                  [(ngModel)]="preferences.analytics" />
                <span>{{ 'GDPR.ANALYTICS' | translate }}</span>
              </label>
              <p class="preference-desc">{{ 'GDPR.ANALYTICS_DESC' | translate }}</p>
            </div>

            <div class="preference-group">
              <label>
                <input 
                  type="checkbox" 
                  name="marketing"
                  [(ngModel)]="preferences.marketing" />
                <span>{{ 'GDPR.MARKETING' | translate }}</span>
              </label>
              <p class="preference-desc">{{ 'GDPR.MARKETING_DESC' | translate }}</p>
            </div>

            <div class="preference-group">
              <label>
                <input 
                  type="checkbox" 
                  name="third_party"
                  [(ngModel)]="preferences.third_party" />
                <span>{{ 'GDPR.THIRD_PARTY' | translate }}</span>
              </label>
              <p class="preference-desc">{{ 'GDPR.THIRD_PARTY_DESC' | translate }}</p>
            </div>

            <div class="preference-actions">
              <button 
                class="btn btn-secondary"
                (click)="rejectAll()">
                {{ 'GDPR.REJECT_ALL' | translate }}
              </button>

              <button 
                class="btn btn-primary"
                (click)="acceptSelected()">
                {{ 'GDPR.ACCEPT_SELECTED' | translate }}
              </button>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .cookie-banner {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: white;
      border-top: 1px solid #e0e0e0;
      box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        transform: translateY(100%);
      }
      to {
        transform: translateY(0);
      }
    }

    .cookie-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      display: flex;
      gap: 20px;
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .cookie-text {
      flex: 1;
      min-width: 300px;
    }

    .cookie-text h3 {
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0 0 10px 0;
      color: #1a202c;
    }

    .cookie-text p {
      font-size: 0.95rem;
      margin: 10px 0;
      color: #4a5568;
      line-height: 1.5;
    }

    .cookie-details {
      font-size: 0.85rem;
      color: #718096;
    }

    .privacy-link {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
      font-size: 0.9rem;
      display: inline-block;
      margin-top: 5px;
    }

    .privacy-link:hover {
      text-decoration: underline;
    }

    .cookie-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      white-space: nowrap;
    }

    .btn-primary {
      background-color: #667eea;
      color: white;
    }

    .btn-primary:hover {
      background-color: #764ba2;
    }

    .btn-secondary {
      background-color: #e2e8f0;
      color: #1a202c;
    }

    .btn-secondary:hover {
      background-color: #cbd5e0;
    }

    .btn-icon {
      padding: 8px;
      background-color: #e2e8f0;
      color: #4a5568;
    }

    .btn-icon:hover {
      background-color: #cbd5e0;
    }

    .cookie-details-section {
      width: 100%;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      animation: slideDown 0.3s ease-out;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        max-height: 0;
      }
      to {
        opacity: 1;
        max-height: 500px;
      }
    }

    .cookie-details-section h4 {
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 15px 0;
      color: #1a202c;
    }

    .preference-group {
      margin-bottom: 15px;
      padding: 10px;
      background-color: #f7fafc;
      border-radius: 6px;
    }

    .preference-group label {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      font-weight: 500;
      color: #1a202c;
    }

    .preference-group input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .preference-group input[type="checkbox"]:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .required {
      font-size: 0.75rem;
      color: #a0aec0;
      font-weight: 400;
    }

    .preference-desc {
      font-size: 0.85rem;
      color: #718096;
      margin: 5px 0 0 28px;
      line-height: 1.4;
    }

    .preference-actions {
      display: flex;
      gap: 10px;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #e0e0e0;
    }

    @media (max-width: 768px) {
      .cookie-content {
        flex-direction: column;
        gap: 15px;
      }

      .cookie-actions {
        width: 100%;
        justify-content: flex-end;
      }

      .btn {
        flex: 1;
        min-width: 120px;
      }

      .preference-actions {
        flex-direction: column;
      }

      .preference-actions .btn {
        width: 100%;
      }
    }
  `]
})
export class CookieConsentComponent implements OnInit {
  private gdprService = inject(GdprService);
  private router = inject(Router);

  readonly X = X;

  showBanner = signal(false);
  showDetails = signal(false);

  preferences = {
    essential: true,
    analytics: false,
    marketing: false,
    third_party: false
  };

  ngOnInit() {
    // Check if user has already made a choice
    if (!this.gdprService.hasAcceptedCookies()) {
      // Show banner only on pages other than privacy/terms
      if (!this.router.url.includes('/privacy') && !this.router.url.includes('/terms')) {
        setTimeout(() => this.showBanner.set(true), 1000);
      }
    }
  }

  acceptAll() {
    this.preferences = {
      essential: true,
      analytics: true,
      marketing: true,
      third_party: true
    };
    this.save();
  }

  rejectAll() {
    this.preferences = {
      essential: true,
      analytics: false,
      marketing: false,
      third_party: false
    };
    this.save();
  }

  acceptSelected() {
    this.save();
  }

  dismiss() {
    // Don't save, just hide banner
    this.showBanner.set(false);
  }

  private save() {
    this.gdprService.setCookieConsent(true);
    this.gdprService.saveConsentPreferences(this.preferences).catch(err => {
      console.warn('Could not save preferences:', err);
    });
    this.showBanner.set(false);
  }
}
