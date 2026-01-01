import { Injectable } from '@angular/core';
import { normalizeIpi } from '../validators/ipi.validator';

export interface IpiLookupResult {
  ipi: string;
  name?: string;
  society?: string;
}

@Injectable({ providedIn: 'root' })
export class IpiLookupService {
  private readonly pendingLookups = new Map<string, Promise<IpiLookupResult | null>>();

  validateFormat(value: string | null | undefined): boolean {
    if (!value) {
      return false;
    }

    const normalized = normalizeIpi(value);
    return normalized.length >= 9 && normalized.length <= 11;
  }

  normalize(value: string | null | undefined): string {
    return normalizeIpi(value);
  }

  async lookup(ipi: string): Promise<IpiLookupResult | null> {
    const normalized = normalizeIpi(ipi);
    if (!normalized) {
      return null;
    }

    if (this.pendingLookups.has(normalized)) {
      return this.pendingLookups.get(normalized)!;
    }

    const promise = this.performLookup(normalized).finally(() => {
      this.pendingLookups.delete(normalized);
    });
    this.pendingLookups.set(normalized, promise);
    return promise;
  }

  private async performLookup(_normalizedIpi: string): Promise<IpiLookupResult | null> {
    // TODO: Integrate with a real IPI registry. This stub always falls back to manual entry.
    await new Promise(resolve => setTimeout(resolve, 150));
    return null;
  }
}
