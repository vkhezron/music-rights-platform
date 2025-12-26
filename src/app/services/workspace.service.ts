import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface Workspace {
  id: string;
  name: string;
  type: 'band' | 'label' | 'publisher' | 'studio' | 'management' | 'other';
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

export interface CreateWorkspaceData {
  name: string;
  type: Workspace['type'];
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {
  private supabase = inject(SupabaseService);
  
  private currentWorkspace$ = new BehaviorSubject<Workspace | null>(null);
  private workspaces$ = new BehaviorSubject<Workspace[]>([]);

  constructor() {
    // Load workspaces when user logs in
    this.supabase.user$.subscribe(async (user) => {
      if (user) {
        await this.loadUserWorkspaces();
      } else {
        this.currentWorkspace$.next(null);
        this.workspaces$.next([]);
      }
    });
  }

  get currentWorkspace(): Workspace | null {
    return this.currentWorkspace$.value;
  }

  get workspaces(): Observable<Workspace[]> {
    return this.workspaces$.asObservable();
  }

  /**
   * Load all workspaces user is member of
   */
  async loadUserWorkspaces(): Promise<void> {
    const userId = this.supabase.currentUser?.id;
    if (!userId) return;

    try {
      // Get workspaces where user is a member
      const { data: members, error: membersError } = await this.supabase.client
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', userId);

      if (membersError) throw membersError;

      if (!members || members.length === 0) {
        this.workspaces$.next([]);
        return;
      }

      const workspaceIds = members.map(m => m.workspace_id);

      // Get workspace details
      const { data: workspaces, error: workspacesError } = await this.supabase.client
        .from('workspaces')
        .select('*')
        .in('id', workspaceIds)
        .order('created_at', { ascending: false });

      if (workspacesError) throw workspacesError;

      this.workspaces$.next(workspaces || []);

      // Set first workspace as current if none selected
      if (!this.currentWorkspace && workspaces && workspaces.length > 0) {
        this.setCurrentWorkspace(workspaces[0]);
      }
    } catch (error: any) {
      console.error('Error loading workspaces:', error);
      this.workspaces$.next([]);
    }
  }

  /**
   * Create new workspace
   */
  async createWorkspace(data: CreateWorkspaceData): Promise<Workspace> {
    const userId = this.supabase.currentUser?.id;
    if (!userId) throw new Error('Not authenticated');

    try {
      // Create workspace
      const { data: workspace, error: workspaceError } = await this.supabase.client
        .from('workspaces')
        .insert({
          name: data.name,
          type: data.type,
          description: data.description,
          created_by: userId
        })
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      // Add creator as owner
      const { error: memberError } = await this.supabase.client
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: userId,
          role: 'owner'
        });

      if (memberError) throw memberError;

      // Reload workspaces
      await this.loadUserWorkspaces();

      return workspace;
    } catch (error: any) {
      console.error('Error creating workspace:', error);
      throw new Error(error.message || 'Failed to create workspace');
    }
  }

  /**
   * Set current active workspace
   */
  setCurrentWorkspace(workspace: Workspace): void {
    this.currentWorkspace$.next(workspace);
    // Store in localStorage for persistence
    localStorage.setItem('currentWorkspaceId', workspace.id);
  }

  /**
   * Get workspace members
   */
  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error loading workspace members:', error);
      return [];
    }
  }

  /**
   * Update workspace
   */
  async updateWorkspace(workspaceId: string, updates: Partial<CreateWorkspaceData>): Promise<Workspace> {
    try {
      const { data, error } = await this.supabase.client
        .from('workspaces')
        .update(updates)
        .eq('id', workspaceId)
        .select()
        .single();

      if (error) throw error;

      // Reload workspaces
      await this.loadUserWorkspaces();

      return data;
    } catch (error: any) {
      console.error('Error updating workspace:', error);
      throw new Error(error.message || 'Failed to update workspace');
    }
  }

  /**
   * Delete workspace (owner only)
   */
  async deleteWorkspace(workspaceId: string): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('workspaces')
        .delete()
        .eq('id', workspaceId);

      if (error) throw error;

      // Reload workspaces
      await this.loadUserWorkspaces();
    } catch (error: any) {
      console.error('Error deleting workspace:', error);
      throw new Error(error.message || 'Failed to delete workspace');
    }
  }
}