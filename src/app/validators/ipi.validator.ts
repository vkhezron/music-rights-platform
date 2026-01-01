import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const DIGIT_ONLY = /^\d+$/;
const ALLOWED_CHARS = /^[0-9\s-]+$/;

export function ipiFormatValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const rawValue = control.value as string | null | undefined;
    if (!rawValue) {
      return null;
    }

    const trimmed = rawValue.trim();
    if (!trimmed) {
      return null;
    }

    if (!ALLOWED_CHARS.test(trimmed)) {
      return { ipiFormat: true };
    }

    const normalized = trimmed.replace(/[^0-9]/g, '');

    if (!DIGIT_ONLY.test(normalized)) {
      return { ipiFormat: true };
    }

    if (normalized.length < 9 || normalized.length > 11) {
      return { ipiFormat: true };
    }

    return null;
  };
}

export function normalizeIpi(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  return value.replace(/[^0-9]/g, '');
}
