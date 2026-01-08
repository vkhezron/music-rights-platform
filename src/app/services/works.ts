import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { WorkspaceService } from './workspace.service';
import { Work, WorkFormData, WorkSplit, SplitType, WorkChangeRecord, WorkType, WorkOriginalReference, WorkLanguageSelection } from '../../models/work.model';
import {
  WorkCreationDeclaration,
  WorkCreationDeclarationDraft,
} from '../models/work-creation-declaration.model';

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

  private readonly allowedStatuses: Work['status'][] = ['draft', 'registered', 'published', 'archived'];
  private readonly allowedWorkTypes: WorkType[] = ['standard', 'instrumental', 'remix'];

  constructor() {
    // Load works when workspace changes
    this.workspaceService.currentWorkspace$.subscribe(workspace => {
      if (workspace) {
        this.loadWorks(workspace.id);
      }
    });
  }

  private normalizeStatus(status?: string | null): Work['status'] {
    const candidate = (status ?? 'draft').toLowerCase();
    return this.allowedStatuses.includes(candidate as Work['status'])
      ? (candidate as Work['status'])
      : 'draft';
  }

  private mapSupabaseRecordToWork(record: Record<string, unknown> & {
    work_creation_declarations?: WorkCreationDeclaration[];
  }): Work {
    const { work_creation_declarations, ...rest } = record;
    const base = rest as Record<string, unknown>;

    const rawType = (base as { work_type?: string }).work_type ?? 'standard';
    const normalizedType = this.normalizeWorkType(rawType);

    const rawOriginals = (base as { original_works?: unknown }).original_works;
    const originalWorks = Array.isArray(rawOriginals)
      ? (rawOriginals as WorkOriginalReference[])
      : null;

    const primaryLanguagesRaw = (base as { primary_languages?: unknown }).primary_languages;
    const secondaryLanguagesRaw = (base as { secondary_languages?: unknown }).secondary_languages;
    const primaryLanguages = this.normalizeLanguageSelections(primaryLanguagesRaw);
    const secondaryLanguages = this.normalizeLanguageSelections(secondaryLanguagesRaw);

    const fallbackLanguages = Array.isArray((base as { languages?: unknown }).languages)
      ? ((base as { languages?: unknown }).languages as string[])
      : [];
    const combinedLanguages = this.buildLanguageNameList(primaryLanguages, secondaryLanguages, fallbackLanguages);

    const normalized = {
      ...(base as unknown as Work),
      status: this.normalizeStatus((base as { status?: string }).status),
      is_cover_version: Boolean((base as { is_cover_version?: boolean }).is_cover_version),
      work_type: normalizedType,
      is_100_percent_human: Boolean((base as { is_100_percent_human?: boolean }).is_100_percent_human),
      uses_sample_libraries: Boolean((base as { uses_sample_libraries?: boolean }).uses_sample_libraries),
      has_commercial_license: Boolean((base as { has_commercial_license?: boolean }).has_commercial_license),
      sample_library_names: (base as { sample_library_names?: string | null }).sample_library_names ?? null,
      original_works: originalWorks,
      ai_disclosures: work_creation_declarations ?? [],
      primary_languages: primaryLanguages.length ? primaryLanguages : null,
      secondary_languages: secondaryLanguages.length ? secondaryLanguages : null,
      languages: combinedLanguages,
    } as Work;

    return normalized;
  }

  private normalizeWorkType(value?: string | null): WorkType {
    const candidate = (value ?? 'standard').toLowerCase();
    return this.allowedWorkTypes.includes(candidate as WorkType) ? (candidate as WorkType) : 'standard';
  }

  private normalizeLanguageSelections(raw: unknown): WorkLanguageSelection[] {
    if (!Array.isArray(raw)) {
      return [];
    }

    const selections: WorkLanguageSelection[] = [];
    for (const entry of raw as unknown[]) {
      const normalized = this.normalizeLanguageSelection(entry);
      if (normalized) {
        selections.push(normalized);
      }
    }
    return selections;
  }

  private normalizeLanguageSelection(entry: unknown): WorkLanguageSelection | null {
    if (!entry || typeof entry !== 'object') {
      return null;
    }

    const candidate = entry as Record<string, unknown>;
    const languageValue = candidate['language'];
    const language = typeof languageValue === 'string' ? languageValue.trim() : '';
    if (!language) {
      return null;
    }

    const iso1Value = candidate['iso_639_1'];
    const iso1 = typeof iso1Value === 'string' && iso1Value.trim().length
      ? iso1Value.trim()
      : null;
    const iso3Value = candidate['iso_639_3'];
    const iso3 = typeof iso3Value === 'string' && iso3Value.trim().length
      ? iso3Value.trim()
      : null;

    const isCustom = candidate['is_custom'] === true || (!iso1 && !iso3);

    return {
      language,
      iso_639_1: iso1,
      iso_639_3: iso3,
      is_custom: isCustom,
    };
  }

  private buildLanguageNameList(
    primary: WorkLanguageSelection[],
    secondary: WorkLanguageSelection[],
    fallback?: unknown
  ): string[] {
    const names: string[] = [];

    const addName = (value?: string | null) => {
      if (!value) {
        return;
      }
      const trimmed = value.trim();
      if (!trimmed) {
        return;
      }
      const key = trimmed.toLowerCase();
      if (!names.some(existing => existing.toLowerCase() === key)) {
        names.push(trimmed);
      }
    };

    primary.forEach(selection => addName(selection.language));
    secondary.forEach(selection => addName(selection.language));

    if (Array.isArray(fallback)) {
      (fallback as unknown[]).forEach(item => {
        if (typeof item === 'string') {
          addName(item);
        }
      });
    }

    return names;
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
        .select('*, work_creation_declarations(section, creation_type, ai_tool, notes, updated_at)')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const works = (data ?? []).map(record =>
        this.mapSupabaseRecordToWork(
          record as Record<string, unknown> & {
            work_creation_declarations?: WorkCreationDeclaration[];
          }
        )
      );

      this.worksSubject.next(works);
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

      const payload = {
        ...insertPayload,
        primary_languages: insertPayload.primary_languages ?? [],
        secondary_languages: insertPayload.secondary_languages ?? [],
        languages: insertPayload.languages ?? [],
      };

      const { data, error } = await this.supabase.client
        .from('works')
        .insert({
          ...payload,
          workspace_id: currentWorkspace.id,
          created_by: currentUser.id,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      const aiDrafts = ai_disclosures ?? [];
      await this.replaceWorkAIDeclarations(data.id, aiDrafts);
      const aiDeclarations = await this.getWorkAIDeclarations(data.id);
      const workWithAi = this.mapSupabaseRecordToWork({
        ...(data as Record<string, unknown>),
        work_creation_declarations: aiDeclarations,
      });

      // Update local state
      const currentWorks = this.worksSubject.value;
      const nextWorks: Work[] = [workWithAi, ...currentWorks];
      this.worksSubject.next(nextWorks);

      return workWithAi;
    } catch (error) {
      console.error('Error creating work:', error);
      throw error;
    }
  }

  async updateWork(id: string, formData: Partial<WorkFormData>): Promise<Work> {
    try {
      const { ai_disclosures, ...updatePayload } = formData;

      const payload: Partial<WorkFormData> & Record<string, unknown> = {
        ...updatePayload,
      };

      if (payload.primary_languages === undefined) {
        delete payload.primary_languages;
      } else if (payload.primary_languages === null) {
        payload.primary_languages = [];
      }

      if (payload.secondary_languages === undefined) {
        delete payload.secondary_languages;
      } else if (payload.secondary_languages === null) {
        payload.secondary_languages = [];
      }

      if (payload.languages === undefined) {
        delete payload.languages;
      } else if (payload.languages === null) {
        payload.languages = [];
      }

      const { data, error } = await this.supabase.client
        .from('works')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (ai_disclosures) {
        await this.replaceWorkAIDeclarations(id, ai_disclosures);
      }

      const aiDeclarations = await this.getWorkAIDeclarations(id);
      const workWithAi = this.mapSupabaseRecordToWork({
        ...(data as Record<string, unknown>),
        work_creation_declarations: aiDeclarations,
      });

      // Update local state
      const currentWorks = this.worksSubject.value;
      const updatedWorks = currentWorks.map(w => (w.id === id ? workWithAi : w)) as Work[];
      this.worksSubject.next(updatedWorks);

      // Update current work if it's the one being edited
      if (this.currentWork?.id === id) {
        this.currentWorkSubject.next(workWithAi);
      }

      return workWithAi;
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

  async archiveWork(id: string): Promise<void> {
    try {
      const { data, error } = await this.supabase.client
        .from('works')
        .update({ status: 'archived' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const currentWorks = this.worksSubject.value;
      const updatedWorks = currentWorks.map(work =>
        work.id === id ? { ...work, status: 'archived' } : work
      ) as Work[];
      this.worksSubject.next(updatedWorks);

      if (this.currentWork?.id === id && this.currentWork) {
        this.currentWorkSubject.next({ ...this.currentWork, status: 'archived' });
      }
    } catch (error) {
      console.error('Error archiving work:', error);
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

      const aiDeclarations = await this.getWorkAIDeclarations(id);
      const workWithAi = this.mapSupabaseRecordToWork({
        ...(data as Record<string, unknown>),
        work_creation_declarations: aiDeclarations,
      });

      this.currentWorkSubject.next(workWithAi);
      return workWithAi;
    } catch (error) {
      console.error('Error getting work:', error);
      return null;
    }
  }

  async getWorkChangeHistory(workId: string): Promise<WorkChangeRecord[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('work_change_data')
        .select('id, work_id, split_id, entity_type, change_type, field_changed, old_value, new_value, notes, change_summary, changed_by, changed_at')
        .eq('work_id', workId)
        .order('changed_at', { ascending: false });

      if (error) throw error;

      return (data ?? []) as WorkChangeRecord[];
    } catch (error) {
      console.error('Error loading work change history:', error);
      throw error;
    }
  }

  async getWorkAIDeclarations(workId: string): Promise<WorkCreationDeclaration[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('work_creation_declarations')
        .select('*')
        .eq('work_id', workId)
        .order('section', { ascending: true });

      if (error) throw error;
      return (data ?? []) as WorkCreationDeclaration[];
    } catch (error) {
      console.error('Error loading AI disclosures:', error);
      throw error;
    }
  }

  private async replaceWorkAIDeclarations(
    workId: string,
    declarations: WorkCreationDeclarationDraft[]
  ): Promise<void> {
    try {
      const { error: deleteError } = await this.supabase.client
        .from('work_creation_declarations')
        .delete()
        .eq('work_id', workId);

      if (deleteError) throw deleteError;

      if (!declarations.length) {
        return;
      }

      const payload = declarations.map(declaration => ({
        work_id: workId,
        section: declaration.section,
        creation_type: declaration.creation_type,
        ai_tool: declaration.ai_tool ?? null,
        notes: declaration.notes ?? null,
      }));

      const { error: insertError } = await this.supabase.client
        .from('work_creation_declarations')
        .insert(payload);

      if (insertError) throw insertError;
    } catch (error) {
      console.error('Error saving AI disclosures:', error);
      throw error;
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