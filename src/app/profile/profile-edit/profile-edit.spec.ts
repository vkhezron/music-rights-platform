import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ProfileEdit } from './profile-edit';
import { ProfileService } from '../../services/profile.service';
import { GdprService } from '../../services/gdpr.service';
import { FeedbackService } from '../../services/feedback.service';
import { TranslateMockLoader } from '../../../testing/translate-mock.loader';

describe('ProfileEdit', () => {
  let component: ProfileEdit;
  let fixture: ComponentFixture<ProfileEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ProfileEdit,
        RouterTestingModule,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TranslateMockLoader },
        }),
      ],
      providers: [
        {
          provide: ProfileService,
          useValue: {
            profile$: of(null),
            currentProfile: null,
            loadProfile: () => Promise.resolve(null),
            updateProfile: () => Promise.resolve({} as any),
            exportProfileQr: () => Promise.resolve('data'),
          } as unknown as ProfileService,
        },
        { provide: GdprService, useValue: { downloadPersonalData: () => Promise.resolve() } as unknown as GdprService },
        {
          provide: FeedbackService,
          useValue: {
            success: () => 'success-id',
            error: () => 'error-id',
            warning: () => 'warning-id',
            info: () => 'info-id',
            handleError: () => 'error',
          } as unknown as FeedbackService,
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfileEdit);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
