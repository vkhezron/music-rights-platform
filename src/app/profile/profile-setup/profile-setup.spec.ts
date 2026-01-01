import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ProfileSetup } from './profile-setup';
import { ProfileService } from '../../services/profile.service';
import { TranslateMockLoader } from '../../../testing/translate-mock.loader';

describe('ProfileSetup', () => {
  let component: ProfileSetup;
  let fixture: ComponentFixture<ProfileSetup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ProfileSetup,
        RouterTestingModule,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TranslateMockLoader },
        }),
      ],
      providers: [
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } as Partial<Router> },
        {
          provide: ProfileService,
          useValue: {
            loadProfile: () => Promise.resolve(null),
            isNicknameAvailable: () => Promise.resolve(true),
            createProfile: () => Promise.resolve({ id: 'profile-1' } as any),
            profile$: of(null),
            currentProfile: null,
            supabase: { currentUser: { id: 'user-1' } },
          } as unknown as ProfileService,
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfileSetup);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
