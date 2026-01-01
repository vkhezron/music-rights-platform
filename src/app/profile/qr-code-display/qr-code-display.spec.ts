import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { vi } from 'vitest';

import { QR_CODE, QrCodeDisplayComponent } from './qr-code-display';
import { ProfileService } from '../../services/profile.service';
import { TranslateMockLoader } from '../../../testing/translate-mock.loader';

const toDataUrlMock = vi.fn().mockResolvedValue('data:image/png;base64,stub');

describe('QrCodeDisplay', () => {
  let component: QrCodeDisplayComponent;
  let fixture: ComponentFixture<QrCodeDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        QrCodeDisplayComponent,
        RouterTestingModule,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TranslateMockLoader },
        }),
      ],
      providers: [
        {
          provide: ProfileService,
          useValue: {
            currentProfile: {
              user_number: '123',
              nickname: 'tester',
            },
          } as unknown as ProfileService,
        },
        {
          provide: QR_CODE,
          useValue: {
            toDataURL: toDataUrlMock,
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(QrCodeDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should generate a QR code data url for the active profile', async () => {
    toDataUrlMock.mockClear();
    component.qrCodeDataUrl.set('');

    await component.generateQRCode();

    expect(toDataUrlMock).toHaveBeenCalledTimes(1);
    expect(component.qrCodeDataUrl()).toBe('data:image/png;base64,stub');
  });

  it('should skip QR generation when profile is missing', async () => {
    toDataUrlMock.mockClear();
    (component as any).profile = null;

    await component.generateQRCode();

    expect(toDataUrlMock).not.toHaveBeenCalled();
    expect(component.qrCodeDataUrl()).toBe('data:image/png;base64,stub');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
});
