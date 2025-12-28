import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { WorkspaceService } from './workspace.service';

export interface RightsHolder {
  id: string;
  workspace_id: string;
  type: 'person' | 'company';
  
  // Person fields
  first_name?: string;
  last_name?: string;
  
  // Company fields
  company_name?: string;
  
  // Common fields
  email?: string;
  phone?: string;
  cmo_pro?: string;
  ipi_number?: string;
  tax_id?: string;
  notes?: string;
  
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RightsHolderFormData {
  type: 'person' | 'company';
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  cmo_pro?: string;
  ipi_number?: string;
  tax_id?: string;
  notes?: string;
}

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
      const { data: rightsHolder, error } = await this.supabase.client
        .from('rights_holders')
        .insert({
          workspace_id: workspace.id,
          type: data.type,
          first_name: data.first_name,
          last_name: data.last_name,
          company_name: data.company_name,
          email: data.email,
          phone: data.phone,
          cmo_pro: data.cmo_pro,
          ipi_number: data.ipi_number,
          tax_id: data.tax_id,
          notes: data.notes,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const current = this.rightsHoldersSubject.value;
      this.rightsHoldersSubject.next([rightsHolder, ...current]);

      return rightsHolder;
    } catch (error) {
      console.error('Error creating rights holder:', error);
      throw error;
    }
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
    if (rh.type === 'person') {
      return `${rh.first_name || ''} ${rh.last_name || ''}`.trim();
    }
    return rh.company_name || 'Unknown';
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

      return name.includes(lowerQuery) ||
             email.includes(lowerQuery) ||
             ipi.includes(lowerQuery) ||
             cmo.includes(lowerQuery);
    });
  }
}