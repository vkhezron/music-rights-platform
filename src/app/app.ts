import { Component, DestroyRef, ElementRef, HostListener, QueryList, ViewChildren, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { CookieConsentComponent } from './legal/cookie-consent/cookie-consent';
import { FeedbackToastsComponent } from './components/feedback/feedback-toasts.component';
import { SupabaseService } from './services/supabase.service';
import { filter } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { LanguageService } from './services/language.service';
import { ProfileService } from './services/profile.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, TranslateModule, CommonModule, CookieConsentComponent, FeedbackToastsComponent, LucideAngularModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private languageService = inject(LanguageService);
  private profileService = inject(ProfileService);
  @ViewChildren('languageSwitcherRef') private languageSwitcherRefs!: QueryList<ElementRef<HTMLElement>>;
  
  readonly languages = this.languageService.languages;
  private readonly currentLangSignal = toSignal(this.languageService.currentLang$, { initialValue: this.languageService.currentLang });
  
  get currentLang(): string {
    return this.currentLangSignal();
  }
  languageMenuOpen = false;
  private readonly userSignal = toSignal(this.supabase.user$, { initialValue: this.supabase.currentUser });
  private readonly currentRoute = signal(this.router.url ?? '');
  private readonly profileSignal = toSignal(this.profileService.profile$, { initialValue: this.profileService.currentProfile });
  protected readonly isAdmin = computed(() => Boolean(this.profileSignal()?.is_admin));
  
  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(event => {
        this.currentRoute.set(event.urlAfterRedirects);
        this.languageMenuOpen = false;
      });
  }
  
  switchLanguage(lang: string) {
    this.languageService.setLanguage(lang).subscribe({
      next: () => this.closeLanguageMenu(),
      error: error => console.error('Failed to switch language', error)
    });
  }

  get currentLanguage() {
    return this.languages.find(language => language.code === this.currentLang) ?? this.languages[0];
  }

  isLoginRoute(): boolean {
    return this.currentRoute().startsWith('/auth/login');
  }

  toggleLanguageMenu() {
    this.languageMenuOpen = !this.languageMenuOpen;
  }

  closeLanguageMenu() {
    this.languageMenuOpen = false;
  }

  shouldShowHeader(): boolean {
    const user = this.userSignal();
    const url = this.currentRoute();
    return Boolean(user) && !this.isAuthRoute(url);
  }

  isLandingRoute(): boolean {
    const url = this.currentRoute() ?? '';
    if (url === '' || url === '/') {
      return true;
    }

    if (url.startsWith('/?')) {
      return true;
    }

    return false;
  }

  private isAuthRoute(url: string): boolean {
    return url.startsWith('/auth');
  }

  goToProfileHub() {
    this.router.navigate(['/profile-hub']);
  }

  goToAdminDashboard() {
    this.router.navigate(['/admin']);
  }

  async logout() {
    try {
      await this.supabase.signOut();
    } catch (error) {
      console.error('Sign out failed', error);
    } finally {
      this.router.navigate(['/auth/login']);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.languageMenuOpen) {
      return;
    }

    const target = event.target as Node | null;
    if (!this.isWithinLanguageSwitcher(target)) {
      this.closeLanguageMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeLanguageMenu();
  }

  protected readonly title = signal('My Music Rights App');

  private isWithinLanguageSwitcher(target: Node | null): boolean {
    if (!target || !this.languageSwitcherRefs) {
      return false;
    }

    return this.languageSwitcherRefs
      .toArray()
      .some(ref => ref.nativeElement.contains(target));
  }
}
