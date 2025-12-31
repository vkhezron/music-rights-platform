import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AccountDeletionComponent } from './account-deletion';
import { GdprService } from '../../services/gdpr.service';
import { signal } from '@angular/core';

describe('AccountDeletionComponent', () => {
  let component: AccountDeletionComponent;
  let fixture: ComponentFixture<AccountDeletionComponent>;
  let mockGdprService: any;
  let mockRouter: any;

  beforeEach(async () => {
    // Create mock objects with spy functions
    mockGdprService = {
      deleteAccount: vi.fn()
    };
    mockRouter = {
      navigate: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [AccountDeletionComponent, TranslateModule.forRoot()],
      providers: [
        { provide: GdprService, useValue: mockGdprService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AccountDeletionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with dialog closed', () => {
    expect(component.showConfirmDialog()).toBe(false);
  });

  it('should open confirmation dialog', () => {
    component.openConfirmDialog();
    expect(component.showConfirmDialog()).toBe(true);
    expect(component.password()).toBe('');
    expect(component.confirmText()).toBe('');
    expect(component.errorMessage()).toBe('');
  });

  it('should close dialog', () => {
    component.openConfirmDialog();
    component.closeDialog();
    expect(component.showConfirmDialog()).toBe(false);
  });

  it('should not close dialog while deleting', () => {
    component.openConfirmDialog();
    component.isDeleting.set(true);
    component.closeDialog();
    expect(component.showConfirmDialog()).toBe(true);
  });

  describe('canDelete', () => {
    it('should return false if password is too short', () => {
      component.password.set('12345');
      component.confirmText.set('delete');
      expect(component.canDelete()).toBe(false);
    });

    it('should return false if confirmText is not "delete"', () => {
      component.password.set('password123');
      component.confirmText.set('wrong');
      expect(component.canDelete()).toBe(false);
    });

    it('should return false if isDeleting is true', () => {
      component.password.set('password123');
      component.confirmText.set('delete');
      component.isDeleting.set(true);
      expect(component.canDelete()).toBe(false);
    });

    it('should return true when all conditions are met', () => {
      component.password.set('password123');
      component.confirmText.set('delete');
      component.isDeleting.set(false);
      expect(component.canDelete()).toBe(true);
    });
  });

  describe('deleteAccount', () => {
    beforeEach(() => {
      component.password.set('password123');
      component.confirmText.set('delete');
    });

    it('should not proceed if canDelete is false', async () => {
      component.password.set('');
      await component.deleteAccount();
      expect(mockGdprService.deleteAccount).not.toHaveBeenCalled();
    });

    it('should call deleteAccount service and navigate on success', async () => {
      mockGdprService.deleteAccount.mockResolvedValue(undefined);
      
      await component.deleteAccount();
      
      expect(mockGdprService.deleteAccount).toHaveBeenCalledWith('password123');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login'], {
        queryParams: { message: 'account_deleted' }
      });
    });

    it('should handle incorrect password error', async () => {
      mockGdprService.deleteAccount.mockRejectedValue({ message: 'Incorrect password' });
      
      await component.deleteAccount();
      
      expect(component.errorMessage()).toBe('GDPR.DELETE_ACCOUNT_ERROR_PASSWORD');
      expect(component.isDeleting()).toBe(false);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should handle generic errors', async () => {
      mockGdprService.deleteAccount.mockRejectedValue({ message: 'Network error' });
      
      await component.deleteAccount();
      
      expect(component.errorMessage()).toBe('GDPR.DELETE_ACCOUNT_ERROR_GENERIC');
      expect(component.isDeleting()).toBe(false);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  it('should navigate back to profile edit', () => {
    component.goBack();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/profile/edit']);
  });
});
