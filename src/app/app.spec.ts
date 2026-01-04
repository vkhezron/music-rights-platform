import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { App } from './app';
import { GdprService } from './services/gdpr.service';
import { SupabaseService } from './services/supabase.service';
import { ProfileService } from './services/profile.service';
import { TranslateMockLoader } from '../testing/translate-mock.loader';

describe('App', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        App,
        RouterTestingModule,
        HttpClientTestingModule,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TranslateMockLoader },
        }),
      ],
      providers: [
        {
          provide: SupabaseService,
          useValue: {
            currentUser: null,
            user$: of(null),
            signOut: () => Promise.resolve(),
            client: {
              auth: {
                getSession: () => Promise.resolve({ data: { session: null }, error: null }),
                onAuthStateChange: () => ({ data: null }),
                signOut: () => Promise.resolve({ error: null }),
              },
            } as any,
          } as unknown as SupabaseService,
        },
        {
          provide: ProfileService,
          useValue: {
            currentProfile: null,
            profile$: of(null),
            loadProfile: () => Promise.resolve(null),
          } as unknown as ProfileService,
        },
        {
          provide: GdprService,
          useValue: {
            hasAcceptedCookies: () => false,
            setCookieConsent: () => {},
            getConsentPreferences: () => Promise.resolve(null),
            saveConsentPreferences: () => Promise.resolve(),
          } as Partial<GdprService>,
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    httpMock.expectOne('/assets/i18n/en.json').flush({});
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
