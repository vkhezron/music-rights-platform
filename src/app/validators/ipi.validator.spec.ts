import { FormControl } from '@angular/forms';
import { ipiFormatValidator, normalizeIpi } from './ipi.validator';

describe('ipiFormatValidator', () => {
  it('accepts empty values', () => {
    const validator = ipiFormatValidator();
    expect(validator(new FormControl(''))).toBeNull();
  });

  it('accepts digits between 9 and 11 characters', () => {
    const validator = ipiFormatValidator();
    expect(validator(new FormControl('123456789'))).toBeNull();
    expect(validator(new FormControl('123 456 789 01'))).toBeNull();
  });

  it('rejects values with letters or wrong length', () => {
    const validator = ipiFormatValidator();
    expect(validator(new FormControl('ABC123456'))).toEqual({ ipiFormat: true });
    expect(validator(new FormControl('1234'))).toEqual({ ipiFormat: true });
  });

  it('normalizes input to digits only', () => {
    expect(normalizeIpi('123-456-789-01')).toBe('12345678901');
  });
});
