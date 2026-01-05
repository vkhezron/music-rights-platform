import { Injectable } from '@angular/core';
import { PostgrestError } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

export interface WaitlistSubmission {
  contactMethod: 'instagram' | 'telegram';
  contactHandle: string;
  country: string;
  city?: string;
  role: string;
  roleDescription: string;
}

export interface WaitlistStats {
  waitlistCount: number;
  userCount: number;
  rightsHolderCount: number;
  workCount: number;
}

interface WaitlistMetricsResponse {
  waitlist_total: number | null;
  user_total: number | null;
  rights_holder_total: number | null;
  work_total: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class WaitlistService {
  constructor(private readonly supabase: SupabaseService) {}

  async joinWaitlist(payload: WaitlistSubmission): Promise<void> {
    const contactMethod = payload.contactMethod;
    const normalizedHandle = this.normalizeHandle(payload.contactHandle);
    const contactHandle = this.presentableHandle(payload.contactHandle);
    const country = payload.country.trim();
    const city = (payload.city ?? '').trim();
    const role = payload.role;
    const roleDescription = payload.roleDescription.trim();

    const { error } = await this.supabase.client.from('waitlist_requests').insert({
      contact_method: contactMethod,
      contact_handle: contactHandle,
      contact_handle_normalized: normalizedHandle,
      country,
      city: city || null,
      role,
      role_description: roleDescription
    });

    if (error) {
      throw error;
    }
  }

  async fetchLandingStats(): Promise<WaitlistStats> {
    const { data, error } = await this.supabase.client.rpc('waitlist_public_metrics');

    if (error) {
      throw error;
    }

    const metricsData = Array.isArray(data) ? data[0] : data;

    const metrics = (metricsData as WaitlistMetricsResponse | null) || {
      waitlist_total: 0,
      user_total: 0,
      rights_holder_total: 0,
      work_total: 0
    };

    return {
      waitlistCount: this.coerceCount(metrics.waitlist_total),
      userCount: this.coerceCount(metrics.user_total),
      rightsHolderCount: this.coerceCount(metrics.rights_holder_total),
      workCount: this.coerceCount(metrics.work_total)
    };
  }

  isDuplicateError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const supabaseError = error as Partial<PostgrestError & { code: string }>;
    const message = (supabaseError.message ?? '').toLowerCase();

    return (
      supabaseError.code === '23505' ||
      message.includes('duplicate key') ||
      message.includes('already requested') ||
      message.includes('contact_handle_normalized')
    );
  }

  private coerceCount(value: number | null | undefined): number {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return Math.trunc(value);
    }

    return 0;
  }

  private normalizeHandle(rawHandle: string): string {
    return rawHandle
      .trim()
      .replace(/\s+/g, '')
      .replace(/^@+/, '')
      .toLowerCase();
  }

  private presentableHandle(rawHandle: string): string {
    const trimmed = rawHandle.trim();
    if (!trimmed.startsWith('@')) {
      return `@${trimmed.replace(/\s+/g, '').replace(/^@+/, '')}`;
    }
    return trimmed.replace(/\s+/g, '');
  }
}
