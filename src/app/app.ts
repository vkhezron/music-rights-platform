import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';  // ← ADD THIS LINE

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TranslateModule, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private translate = inject(TranslateService);
  private http = inject(HttpClient);  // ← ADD THIS LINE
  
  currentLang = 'en';  // ← ADD THIS LINE
  
  constructor() {
    this.loadTranslations('en');  // ← CHANGE THIS LINE
  }
  
  // ← ADD THIS ENTIRE METHOD
  loadTranslations(lang: string) {
    this.http.get(`/assets/i18n/${lang}.json`).subscribe((translations: any) => {
      this.translate.setTranslation(lang, translations);
      this.translate.use(lang);
      this.currentLang = lang;
    });
  }
  
  switchLanguage(lang: string) {
    this.loadTranslations(lang);  // ← CHANGE THIS LINE
  }


  protected readonly title = signal('My Music Rights App');
}
