import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { Login } from './login';
import { SupabaseService } from '../../services/supabase.service';
import { TranslateMockLoader } from '../../../testing/translate-mock.loader';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        Login,
        RouterTestingModule,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TranslateMockLoader },
        }),
      ],
      providers: [
        {
          provide: SupabaseService,
          useValue: {
            signIn: () => Promise.resolve({ user: null, session: null } as any),
          } as unknown as SupabaseService,
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
