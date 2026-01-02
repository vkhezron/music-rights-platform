import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable, of, switchMap, tap } from 'rxjs';

export interface AppLanguage {
  code: string;
  label: string;
  flag: string;
}

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private http = inject(HttpClient);
  private translate = inject(TranslateService);

  readonly languages: AppLanguage[] = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'es', label: 'Castellano', flag: '🇪🇸' },
    { code: 'ua', label: 'Українська', flag: '🇺🇦' },
  ];

  private readonly loadedLanguages = new Set<string>();
  private readonly currentLangSubject = new BehaviorSubject<string>('en');
  readonly currentLang$ = this.currentLangSubject.asObservable();

  constructor() {
    // Ensure default language is ready
    this.translate.setDefaultLang('en');
    this.setLanguage('en').subscribe();
  }

  get currentLang(): string {
    return this.currentLangSubject.value;
  }

  setLanguage(code: string): Observable<string> {
    const target = code || this.currentLangSubject.value;

    return this.loadLanguage(target).pipe(
      tap(() => {
        this.translate.use(target);
        this.currentLangSubject.next(target);
      }),
      switchMap(() => of(target))
    );
  }

  private loadLanguage(code: string): Observable<any> {
    if (this.loadedLanguages.has(code)) {
      return of(true);
    }

    return this.http.get<Record<string, any>>(`/assets/i18n/${code}.json`).pipe(
      tap(translations => {
        this.translate.setTranslation(code, translations, true);
        this.loadedLanguages.add(code);
      })
    );
  }
}
