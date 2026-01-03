import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { RegisterNewComponent } from './register-new';
import { TranslateMockLoader } from '../../../testing/translate-mock.loader';

describe('RegisterNewComponent', () => {
  let component: RegisterNewComponent;
  let fixture: ComponentFixture<RegisterNewComponent>;

  beforeEach(async () => {
    // Create minimal test setup
    await TestBed.configureTestingModule({
      imports: [
        RegisterNewComponent,
        RouterTestingModule,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TranslateMockLoader }
        })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterNewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with account step', () => {
    expect(component.currentStep()).toBe('account');
  });

  it('should have invalid account form initially', () => {
    expect(component.accountForm.valid).toBeFalsy();
  });

  it('should validate username length', () => {
    const usernameControl = component.accountForm.get('username');
    usernameControl?.setValue('ab');
    expect(usernameControl?.hasError('minlength')).toBeTruthy();
  });
});
