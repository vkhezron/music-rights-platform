import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { WorkspaceService } from './workspace.service';
import { RightsHolder, RightsHolderFormData } from '../../models/rights-holder.model';

// Re-export for backward compatibility
export type { RightsHolder, RightsHolderFormData };

@Injectable({
  providedIn: 'root'
})
export class RightsHoldersService {
  private supabase = inject(SupabaseService);
  private workspaceService = inject(WorkspaceService);

  private rightsHoldersSubject = new BehaviorSubject<RightsHolder[]>([]);
  public rightsHolders$ = this.rightsHoldersSubject.asObservable();

  get rightsHolders(): RightsHolder[] {
    return this.rightsHoldersSubject.value;
  }

  async loadRightsHolders(workspaceId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase.client
        .from('rights_holders')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.rightsHoldersSubject.next(data || []);
    } catch (error) {
      console.error('Error loading rights holders:', error);
      throw error;
    }
  }

  async createRightsHolder(data: RightsHolderFormData): Promise<RightsHolder> {
    const workspace = this.workspaceService.currentWorkspace;
    const user = this.supabase.currentUser;

    if (!workspace || !user) {
      throw new Error('No workspace or user found');
    }

    try {
      // Build insert object with only non-undefined values
      const insertData: any = {
        workspace_id: workspace.id,
        type: data.type,
        kind: data.kind,
        created_by: user.id
      };

      // Only include fields that have values
      if (data.first_name !== undefined && data.first_name !== '') insertData.first_name = data.first_name;
      if (data.last_name !== undefined && data.last_name !== '') insertData.last_name = data.last_name;
      if (data.company_name !== undefined && data.company_name !== '') insertData.company_name = data.company_name;
      if (data.display_name !== undefined && data.display_name.trim() !== '') insertData.display_name = data.display_name.trim();
      if (data.email !== undefined && data.email !== '') insertData.email = data.email;
      if (data.phone !== undefined && data.phone !== '') insertData.phone = data.phone;
      if (data.cmo_pro !== undefined && data.cmo_pro !== '') insertData.cmo_pro = data.cmo_pro;
      if (data.ipi_number !== undefined && data.ipi_number !== '') insertData.ipi_number = data.ipi_number;
      if (data.tax_id !== undefined && data.tax_id !== '') insertData.tax_id = data.tax_id;
      if (data.notes !== undefined && data.notes !== '') insertData.notes = data.notes;
      if ((data as any).profile_id) insertData.profile_id = (data as any).profile_id;

      const resolvedNickname = this.resolveNickname(data);
      if (resolvedNickname) {
        insertData.nickname = resolvedNickname;
      } else {
        insertData.nickname = this.generateFallbackNickname();
      }

      const { data: rightsHolder, error } = await this.supabase.client
        .from('rights_holders')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        if (this.isConflictError(error)) {
          const existing = await this.findExistingRightsHolder(
            insertData.workspace_id,
            insertData.profile_id,
            insertData.nickname,
            insertData.email
          );

          if (existing) {
            this.mergeIntoSubject(existing);
            return existing;
          }
        }

        throw error;
      }

      // Update local state
      this.mergeIntoSubject(rightsHolder);

      return rightsHolder;
    } catch (error) {
      console.error('Error creating rights holder:', error);
      throw error;
    }
  }

  private mergeIntoSubject(rightsHolder: RightsHolder): void {
    const current = this.rightsHoldersSubject.value;
    const existingIndex = current.findIndex(rh => rh.id === rightsHolder.id);

    if (existingIndex >= 0) {
      const updated = [...current];
      updated[existingIndex] = rightsHolder;
      this.rightsHoldersSubject.next(updated);
    } else {
      this.rightsHoldersSubject.next([rightsHolder, ...current]);
    }
  }

  private isConflictError(error: { code?: string; status?: number }): boolean {
    if (!error) {
      return false;
    }

    return error.status === 409 || error.code === '23505' || error.code === '409';
  }

  private async findExistingRightsHolder(
    workspaceId: string,
    profileId?: string,
    nickname?: string,
    email?: string
  ): Promise<RightsHolder | null> {
    if (profileId) {
      const { data, error } = await this.supabase.client
        .from('rights_holders')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('profile_id', profileId)
        .maybeSingle();
      if (!error && data) {
        return data;
      }
    }

    if (nickname) {
      const { data, error } = await this.supabase.client
        .from('rights_holders')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('nickname', nickname)
        .maybeSingle();
      if (!error && data) {
        return data;
      }
    }

    if (email) {
      const { data, error } = await this.supabase.client
        .from('rights_holders')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('email', email)
        .maybeSingle();
      if (!error && data) {
        return data;
      }
    }

    return null;
  }

  async updateRightsHolder(id: string, data: Partial<RightsHolderFormData>): Promise<RightsHolder> {
    try {
      const { data: rightsHolder, error } = await this.supabase.client
        .from('rights_holders')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const current = this.rightsHoldersSubject.value;
      const updated = current.map(rh => rh.id === id ? rightsHolder : rh);
      this.rightsHoldersSubject.next(updated);

      return rightsHolder;
    } catch (error) {
      console.error('Error updating rights holder:', error);
      throw error;
    }
  }

  async deleteRightsHolder(id: string): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('rights_holders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local state
      const current = this.rightsHoldersSubject.value;
      this.rightsHoldersSubject.next(current.filter(rh => rh.id !== id));
    } catch (error) {
      console.error('Error deleting rights holder:', error);
      throw error;
    }
  }

  async getRightsHolder(id: string): Promise<RightsHolder | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('rights_holders')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting rights holder:', error);
      return null;
    }
  }

  // Helper method to get display name
  getDisplayName(rh: RightsHolder): string {
    if (rh.nickname) {
      return this.ensureNicknamePrefix(rh.nickname);
    }

    if (rh.display_name) {
      return rh.display_name;
    }

    if (rh.type === 'person') {
      const legacy = `${rh.first_name || ''} ${rh.last_name || ''}`.trim();
      if (legacy) return legacy;
    }

    if (rh.organization_name) {
      return rh.organization_name;
    }

    if (rh.company_name) {
      return rh.company_name;
    }

    return 'Unknown rights holder';
  }

  // Search functionality
  searchRightsHolders(query: string): RightsHolder[] {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return this.rightsHolders;

    return this.rightsHolders.filter(rh => {
      const name = this.getDisplayName(rh).toLowerCase();
      const email = (rh.email || '').toLowerCase();
      const ipi = (rh.ipi_number || '').toLowerCase();
      const cmo = (rh.cmo_pro || '').toLowerCase();

      const displayName = (rh.display_name || '').toLowerCase();

      return name.includes(lowerQuery) ||
             displayName.includes(lowerQuery) ||
             email.includes(lowerQuery) ||
             ipi.includes(lowerQuery) ||
             cmo.includes(lowerQuery);
    });
  }

  private resolveNickname(data: RightsHolderFormData): string | null {
    const candidates = [
      (data.nickname || ''),
      data.display_name?.trim(),
      `${data.first_name || ''} ${data.last_name || ''}`,
      data.company_name,
      data.email ? data.email.split('@')[0] : undefined,
    ];

    for (const candidate of candidates) {
      const normalized = this.normalizeNickname(candidate);
      if (normalized) return normalized;
    }

    return null;
  }

  private normalizeNickname(value?: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    const sanitized = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return sanitized || null;
  }

  private generateFallbackNickname(): string {
    const globalCrypto = globalThis?.crypto as Crypto | undefined;
    if (globalCrypto?.randomUUID) {
      return `holder-${globalCrypto.randomUUID().split('-')[0]}`;
    }
    return `holder-${Math.random().toString(36).slice(2, 8)}`;
  }

  private ensureNicknamePrefix(nickname: string): string {
    if (!nickname) return nickname;
    return nickname.startsWith('@') ? nickname : `@${nickname}`;
  }
}