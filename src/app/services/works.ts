import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { WorkspaceService } from './workspace.service';
import { Work, WorkFormData, WorkSplit, SplitType } from '../../models/work.model';
@Injectable({
  providedIn: 'root'
})
export class WorksService {
  private supabase = inject(SupabaseService);
  private workspaceService = inject(WorkspaceService);

  private worksSubject = new BehaviorSubject<Work[]>([]);
  public works$ = this.worksSubject.asObservable();

  private currentWorkSubject = new BehaviorSubject<Work | null>(null);
  public currentWork$ = this.currentWorkSubject.asObservable();

  constructor() {
    // Load works when workspace changes
    this.workspaceService.currentWorkspace$.subscribe(workspace => {
      if (workspace) {
        this.loadWorks(workspace.id);
      }
    });
  }

  private resolveRightsLayer(splitType: SplitType): 'ip' | 'neighboring' {
    switch (splitType) {
      case 'lyrics':
      case 'music':
      case 'publishing':
        return 'ip';
      default:
        return 'neighboring';
    }
  }

  get works(): Work[] {
    return this.worksSubject.value;
  }

  get currentWork(): Work | null {
    return this.currentWorkSubject.value;
  }

  async loadWorks(workspaceId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase.client
        .from('works')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.worksSubject.next(data || []);
    } catch (error) {
      console.error('Error loading works:', error);
      throw error;
    }
  }

  async createWork(formData: WorkFormData): Promise<Work> {
    const currentWorkspace = this.workspaceService.currentWorkspace;
    if (!currentWorkspace) {
      throw new Error('No workspace selected');
    }

    const currentUser = this.supabase.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const { ai_disclosures, ...insertPayload } = formData;

      const { data, error } = await this.supabase.client
        .from('works')
        .insert({
          ...insertPayload,
          workspace_id: currentWorkspace.id,
          created_by: currentUser.id,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const currentWorks = this.worksSubject.value;
      this.worksSubject.next([data, ...currentWorks]);

      return data;
    } catch (error) {
      console.error('Error creating work:', error);
      throw error;
    }
  }

  async updateWork(id: string, formData: Partial<WorkFormData>): Promise<Work> {
    try {
      const { ai_disclosures, ...updatePayload } = formData;

      const { data, error } = await this.supabase.client
        .from('works')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const currentWorks = this.worksSubject.value;
      const updatedWorks = currentWorks.map(w => w.id === id ? data : w);
      this.worksSubject.next(updatedWorks);

      // Update current work if it's the one being edited
      if (this.currentWork?.id === id) {
        this.currentWorkSubject.next(data);
      }

      return data;
    } catch (error) {
      console.error('Error updating work:', error);
      throw error;
    }
  }

  async deleteWork(id: string): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('works')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local state
      const currentWorks = this.worksSubject.value;
      this.worksSubject.next(currentWorks.filter(w => w.id !== id));

      // Clear current work if it was deleted
      if (this.currentWork?.id === id) {
        this.currentWorkSubject.next(null);
      }
    } catch (error) {
      console.error('Error deleting work:', error);
      throw error;
    }
  }

  async getWork(id: string): Promise<Work | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('works')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      this.currentWorkSubject.next(data);
      return data;
    } catch (error) {
      console.error('Error getting work:', error);
      return null;
    }
  }

  // =====================================================
  // WORK SPLITS METHODS
  // =====================================================

  async getWorkSplits(workId: string): Promise<WorkSplit[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('work_splits')
        .select('*')
        .eq('work_id', workId)
        .eq('is_active', true)
        .order('split_type');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting work splits:', error);
      return [];
    }
  }

  async createSplit(
    workId: string,
    rightsHolderId: string,
    splitType: SplitType,
    percentage: number,
    contributionTypes?: WorkSplit['contribution_types'],
    roles?: WorkSplit['roles']
  ): Promise<WorkSplit> {
    const currentUser = this.supabase.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const rightsLayer = this.resolveRightsLayer(splitType);
      const { data, error } = await this.supabase.client
        .from('work_splits')
        .insert({
          work_id: workId,
          rights_holder_id: rightsHolderId,
          split_type: splitType,
          ownership_percentage: percentage,
          contribution_types: contributionTypes ?? null,
          roles: roles ?? null,
          created_by: currentUser.id,
          is_active: true,
          rights_layer: rightsLayer
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating split:', error);
      throw error;
    }
  }

  async updateSplit(
    splitId: string,
    update: {
      ownership_percentage?: number;
      contribution_types?: WorkSplit['contribution_types'];
      roles?: WorkSplit['roles'];
    }
  ): Promise<WorkSplit> {
    try {
      const { data, error } = await this.supabase.client
        .from('work_splits')
        .update({
          ...(update.ownership_percentage !== undefined ? { ownership_percentage: update.ownership_percentage } : {}),
          ...(update.contribution_types !== undefined ? { contribution_types: update.contribution_types ?? null } : {}),
          ...(update.roles !== undefined ? { roles: update.roles ?? null } : {})
        })
        .eq('id', splitId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating split:', error);
      throw error;
    }
  }

  async deleteSplit(splitId: string): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('work_splits')
        .delete()
        .eq('id', splitId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting split:', error);
      throw error;
    }
  }

  // =====================================================
  // BATCH SAVE SPLITS (IP + NEIGHBORING)
  // =====================================================
  
  /**
   * Save all splits for a work (both IP and Neighboring Rights)
   * Deletes existing splits and creates new ones atomically
   */
  async saveWorkSplits(
    workId: string,
    ipSplits: any[],
    neighboringSplits: any[]
  ): Promise<void> {
    const currentUser = this.supabase.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      // Step 1: Delete all existing splits for this work
      const { error: deleteError } = await this.supabase.client
        .from('work_splits')
        .delete()
        .eq('work_id', workId);

      if (deleteError) throw deleteError;

      // Step 2: Combine all splits into one array
      const allSplits = [
        ...ipSplits.map(s => ({
          work_id: workId,
          rights_holder_id: s.rights_holder_id,
          split_type: s.split_type,
          ownership_percentage: Number(s.ownership_percentage ?? s.percentage) || 0,
          notes: s.notes || null,
          created_by: currentUser.id,
          is_active: true,
          rights_layer: s.rights_layer ?? this.resolveRightsLayer(s.split_type),
          contribution_types: s.contribution_types ?? null,
          roles: s.roles ?? null
        })),
        ...neighboringSplits.map(s => ({
          work_id: workId,
          rights_holder_id: s.rights_holder_id,
          split_type: s.split_type,
          ownership_percentage: Number(s.ownership_percentage ?? s.percentage) || 0,
          notes: s.notes || null,
          created_by: currentUser.id,
          is_active: true,
          rights_layer: s.rights_layer ?? this.resolveRightsLayer(s.split_type),
          contribution_types: s.contribution_types ?? null,
          roles: s.roles ?? null
        }))
      ];

      // Step 3: Bulk insert all splits
      if (allSplits.length > 0) {
        const { error: insertError } = await this.supabase.client
          .from('work_splits')
          .insert(allSplits);

        if (insertError) throw insertError;
      }

      // Success - splits saved
      console.log(`Successfully saved ${allSplits.length} splits for work ${workId}`);
    } catch (error) {
      console.error('Error saving work splits:', error);
      throw error;
    }
  }

  // Validate splits total 100%
  async validateSplits(workId: string, splitType: SplitType): Promise<{ valid: boolean; total: number }> {
    const splits = await this.getWorkSplits(workId);
    const typeSplits = splits.filter(s => s.split_type === splitType);
    const total = typeSplits.reduce((sum, split) => sum + split.ownership_percentage, 0);
    
    return {
      valid: Math.abs(total - 100) < 0.01, // Allow tiny floating point differences
      total
    };
  }

  // Search works
  searchWorks(query: string): Work[] {
    const lowerQuery = query.toLowerCase();
    return this.works.filter(work => {
      return work.work_title.toLowerCase().includes(lowerQuery) ||
             work.isrc?.toLowerCase().includes(lowerQuery) ||
             work.iswc?.toLowerCase().includes(lowerQuery);
    });
  }

  // Filter by status
  filterByStatus(status: string): Work[] {
    return this.works.filter(w => w.status === status);
  }

  // Get work duration as formatted string
  formatDuration(seconds?: number): string {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}