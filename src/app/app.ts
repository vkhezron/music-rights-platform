import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { CookieConsentComponent } from './legal/cookie-consent/cookie-consent';
import { FeedbackToastsComponent } from './components/feedback/feedback-toasts.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TranslateModule, CommonModule, CookieConsentComponent, FeedbackToastsComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private translate = inject(TranslateService);
  private http = inject(HttpClient);
  
  currentLang = 'en';
  
  constructor() {
    this.loadTranslations('en');
  }
  
  loadTranslations(lang: string) {
    this.http.get(`/assets/i18n/${lang}.json`).subscribe((translations: any) => {
      this.translate.setTranslation(lang, translations);
      this.translate.use(lang);
      this.currentLang = lang;
    });
  }
  
  switchLanguage(lang: string) {
    this.loadTranslations(lang);
  }

  protected readonly title = signal('My Music Rights App');
}
