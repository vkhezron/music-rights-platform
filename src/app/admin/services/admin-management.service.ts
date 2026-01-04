import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';

export interface AdminProfileListParams {
  search?: string;
  status?: 'all' | 'active' | 'deactivated';
  page?: number;
  pageSize?: number;
}

export interface AdminProfileRow {
  id: string;
  user_number: number;
  display_name: string | null;
  nickname: string | null;
  primary_role: string | null;
  is_admin: boolean;
  is_deactivated: boolean;
  deactivated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResult<T> {
  items: T[];
  count: number;
}

export interface AdminInviteRow {
  id: string;
  code: string;
  created_by: string;
  claimed_by: string | null;
  expires_at: string | null;
  claimed_at: string | null;
  revoked_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class AdminManagementService {
  private readonly supabase = inject(SupabaseService);

  async listProfiles(params: AdminProfileListParams = {}): Promise<PaginatedResult<AdminProfileRow>> {
    const {
      search = '',
      status = 'all',
      page = 1,
      pageSize = 25
    } = params;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.supabase.client
      .from('profiles')
      .select(
        'id, user_number, display_name, nickname, primary_role, is_admin, is_deactivated, deactivated_at, created_at, updated_at',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    const trimmedSearch = search.trim();
    if (trimmedSearch) {
      if (/^\d+$/.test(trimmedSearch)) {
        query = query.eq('user_number', Number(trimmedSearch));
      } else {
        const term = `%${trimmedSearch}%`;
        query = query.or(`display_name.ilike.${term},nickname.ilike.${term}`);
      }
    }

    if (status === 'active') {
      query = query.eq('is_deactivated', false);
    } else if (status === 'deactivated') {
      query = query.eq('is_deactivated', true);
    }

    const { data, count, error } = await query;

    if (error) {
      throw error;
    }

    return {
      items: (data ?? []) as AdminProfileRow[],
      count: count ?? 0
    };
  }

  async updateProfileFlags(id: string, flags: Partial<Pick<AdminProfileRow, 'is_admin' | 'is_deactivated' | 'deactivated_at'>>): Promise<AdminProfileRow> {
    const payload: Record<string, unknown> = { ...flags };

    if (flags.is_deactivated === false) {
      payload['deactivated_at'] = null;
    } else if (flags.is_deactivated === true && !flags.deactivated_at) {
      payload['deactivated_at'] = new Date().toISOString();
    }

    const { data, error } = await this.supabase.client
      .from('profiles')
      .update(payload)
      .eq('id', id)
      .select(
        'id, user_number, display_name, nickname, primary_role, is_admin, is_deactivated, deactivated_at, created_at, updated_at'
      )
      .single();

    if (error) {
      throw error;
    }

    return data as AdminProfileRow;
  }

  async listAdminInvites(): Promise<AdminInviteRow[]> {
    const { data, error } = await this.supabase.client
      .from('admin_invites')
      .select('id, code, created_by, claimed_by, expires_at, claimed_at, revoked_at, metadata, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []) as AdminInviteRow[];
  }

  async createAdminInvite(params: { expiresAt?: string | null; metadata?: Record<string, unknown> }): Promise<AdminInviteRow> {
    const createdBy = this.supabase.currentUser?.id;
    if (!createdBy) {
      throw new Error('ADMIN.ERRORS.NOT_AUTHENTICATED');
    }

    const code = this.generateInviteCode();

    const insertPayload = {
      code,
      created_by: createdBy,
      expires_at: params.expiresAt ?? null,
      metadata: params.metadata ?? {}
    };

    const { data, error } = await this.supabase.client
      .from('admin_invites')
      .insert(insertPayload)
      .select('id, code, created_by, claimed_by, expires_at, claimed_at, revoked_at, metadata, created_at, updated_at')
      .single();

    if (error) {
      throw error;
    }

    return data as AdminInviteRow;
  }

  async revokeAdminInvite(id: string): Promise<AdminInviteRow> {
    const { data, error } = await this.supabase.client
      .from('admin_invites')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, code, created_by, claimed_by, expires_at, claimed_at, revoked_at, metadata, created_at, updated_at')
      .single();

    if (error) {
      throw error;
    }

    return data as AdminInviteRow;
  }

  private generateInviteCode(): string {
    const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const segments: string[] = [];

    for (let i = 0; i < 3; i++) {
      const segmentLength = i === 0 ? 4 : 3;
      let segment = '';

      for (let j = 0; j < segmentLength; j++) {
        const random = this.randomInt(alphabet.length);
        segment += alphabet[random];
      }

      segments.push(segment);
    }

    return segments.join('-');
  }

  private randomInt(maxExclusive: number): number {
    if (typeof globalThis.crypto?.getRandomValues === 'function') {
      const randomBuffer = new Uint32Array(1);
      globalThis.crypto.getRandomValues(randomBuffer);
      return randomBuffer[0] % maxExclusive;
    }

    return Math.floor(Math.random() * maxExclusive);
  }
}
