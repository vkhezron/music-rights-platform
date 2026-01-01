import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { Register } from './register';
import { SupabaseService } from '../../services/supabase.service';
import { TranslateMockLoader } from '../../../testing/translate-mock.loader';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        Register,
        RouterTestingModule,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TranslateMockLoader },
        }),
      ],
      providers: [
        {
          provide: SupabaseService,
          useValue: {
            signUp: () => Promise.resolve({ user: null } as any),
          } as unknown as SupabaseService,
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
