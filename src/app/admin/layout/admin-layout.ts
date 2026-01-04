import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { ProfileService } from '../../services/profile.service';

interface AdminNavItem {
  path: string;
  labelKey: string;
  descriptionKey: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './admin-layout.html',
  styleUrls: ['./admin-layout.scss']
})
export class AdminLayoutComponent {
  private readonly profileService = inject(ProfileService);
  private readonly profileSignal = toSignal(this.profileService.profile$, {
    initialValue: this.profileService.currentProfile
  });
  protected readonly navOpen = signal(false);

  protected readonly profileName = computed(() => this.profileSignal()?.display_name ?? this.profileSignal()?.nickname ?? '');

  protected readonly navItems: AdminNavItem[] = [
    { path: '/admin/overview', labelKey: 'ADMIN.NAV.OVERVIEW', descriptionKey: 'ADMIN.NAV.OVERVIEW_DESC' },
    { path: '/admin/users', labelKey: 'ADMIN.NAV.USERS', descriptionKey: 'ADMIN.NAV.USERS_DESC' },
    { path: '/admin/invites', labelKey: 'ADMIN.NAV.INVITES', descriptionKey: 'ADMIN.NAV.INVITES_DESC' }
  ];

  protected toggleNav(): void {
    if (!this.isMobileViewport()) {
      return;
    }
    this.navOpen.update((current) => !current);
  }

  protected closeNav(): void {
    this.navOpen.set(false);
  }

  protected handleNavClick(): void {
    if (this.isMobileViewport()) {
      this.closeNav();
    }
  }

  @HostListener('window:resize')
  protected onResize(): void {
    if (!this.isMobileViewport()) {
      this.closeNav();
    }
  }

  private isMobileViewport(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(max-width: 1024px)').matches;
  }
}
