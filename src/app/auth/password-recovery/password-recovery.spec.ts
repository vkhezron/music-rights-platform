import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { PasswordRecoveryComponent } from './password-recovery';
import { TranslateMockLoader } from '../../../testing/translate-mock.loader';

describe('PasswordRecoveryComponent', () => {
  let component: PasswordRecoveryComponent;
  let fixture: ComponentFixture<PasswordRecoveryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        PasswordRecoveryComponent,
        RouterTestingModule,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TranslateMockLoader }
        })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PasswordRecoveryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with username step', () => {
    expect(component.currentStep()).toBe('username');
  });

  it('should require username', () => {
    const usernameControl = component.usernameForm.get('username');
    expect(usernameControl?.hasError('required')).toBeTruthy();
  });

  it('should validate username length', () => {
    const usernameControl = component.usernameForm.get('username');
    usernameControl?.setValue('ab');
    expect(usernameControl?.hasError('minlength')).toBeTruthy();
  });
});
