import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { WorkspaceService } from './workspace.service';
import { RightsHolder, RightsHolderFormData } from '../../models/rights-holder.model';

@Injectable({
  providedIn: 'root'
})
export class RightsHolderService {
  private supabase = inject(SupabaseService);
  private workspaceService = inject(WorkspaceService);

  private rightsHoldersSubject = new BehaviorSubject<RightsHolder[]>([]);
  public rightsHolders$ = this.rightsHoldersSubject.asObservable();

  constructor() {
    // Load rights holders when workspace changes
    this.workspaceService.currentWorkspace$.subscribe(workspace => {
      if (workspace) {
        this.loadRightsHolders(workspace.id);
      }
    });
  }

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

  async createRightsHolder(formData: RightsHolderFormData): Promise<RightsHolder> {
    const currentWorkspace = this.workspaceService.currentWorkspace;
    if (!currentWorkspace) {
      throw new Error('No workspace selected');
    }

    const currentUser = this.supabase.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const { data, error } = await this.supabase.client
        .from('rights_holders')
        .insert({
          ...formData,
          workspace_id: currentWorkspace.id,
          created_by: currentUser.id
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const currentHolders = this.rightsHoldersSubject.value;
      this.rightsHoldersSubject.next([data, ...currentHolders]);

      return data;
    } catch (error) {
      console.error('Error creating rights holder:', error);
      throw error;
    }
  }

  async updateRightsHolder(id: string, formData: Partial<RightsHolderFormData>): Promise<RightsHolder> {
    try {
      const { data, error } = await this.supabase.client
        .from('rights_holders')
        .update(formData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const currentHolders = this.rightsHoldersSubject.value;
      const updatedHolders = currentHolders.map(h => h.id === id ? data : h);
      this.rightsHoldersSubject.next(updatedHolders);

      return data;
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
      const currentHolders = this.rightsHoldersSubject.value;
      this.rightsHoldersSubject.next(currentHolders.filter(h => h.id !== id));
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

  // Helper to get display name
  getDisplayName(holder: RightsHolder): string {
    if (holder.type === 'person') {
      return `${holder.first_name} ${holder.last_name}`;
    }
    return holder.company_name || 'Unknown';
  }

  // Search rights holders
  searchRightsHolders(query: string): RightsHolder[] {
    const lowerQuery = query.toLowerCase();
    return this.rightsHolders.filter(holder => {
      const name = this.getDisplayName(holder).toLowerCase();
      const email = holder.email?.toLowerCase() || '';
      return name.includes(lowerQuery) || email.includes(lowerQuery);
    });
  }

  // Filter by type
  filterByType(type: 'person' | 'company'): RightsHolder[] {
    return this.rightsHolders.filter(h => h.type === type);
  }

  // Filter by kind
  filterByKind(kind: string): RightsHolder[] {
    return this.rightsHolders.filter(h => h.kind === kind);
  }
}