import { TestBed } from '@angular/core/testing';
import { AuthRecoveryService } from './auth-recovery.service';

describe('AuthRecoveryService', () => {
  let service: AuthRecoveryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthRecoveryService]
    });
    service = TestBed.inject(AuthRecoveryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should generate 5 backup codes', () => {
    const codes = service.generateRecoveryCodes();
    expect(codes.length).toBe(5);
  });

  it('should generate codes in correct format', () => {
    const codes = service.generateRecoveryCodes();
    const codePattern = /^[A-Z0-9]{3}-[A-Z0-9]{3}$/;
    
    codes.forEach(code => {
      expect(code).toMatch(codePattern);
    });
  });

  it('should generate unique codes', () => {
    const codes = service.generateRecoveryCodes();
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  it('should have recovery state management', () => {
    service.getRecoveryState().subscribe(state => {
      expect(state.step).toBe('select-method');
      expect(state.method).toBeNull();
    });
  });

  it('should reset recovery state', () => {
    service.resetRecoveryState();
    service.getRecoveryState().subscribe(state => {
      expect(state.step).toBe('select-method');
    });
  });
});
