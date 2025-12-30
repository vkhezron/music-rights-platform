import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';
// Remove this import: import { WorksService } from './works';

export interface Workspace {
  id: string;
  name: string;
  type: string;
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
  type: string;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {
  private supabase = inject(SupabaseService);
  // Remove this: private worksService = inject(WorksService);

  // Public observables
  private workspacesSubject = new BehaviorSubject<Workspace[]>([]);
  public workspaces$: Observable<Workspace[]> = this.workspacesSubject.asObservable();

  private currentWorkspaceSubject = new BehaviorSubject<Workspace | null>(null);
  public currentWorkspace$: Observable<Workspace | null> = this.currentWorkspaceSubject.asObservable();

  constructor() {
    // Auto-load workspaces when user is authenticated
    const user = this.supabase.currentUser;
    if (user) {
      this.loadUserWorkspaces();
    }
  }

  get workspaces(): Observable<Workspace[]> {
    return this.workspaces$;
  }

  get currentWorkspace(): Workspace | null {
    return this.currentWorkspaceSubject.value;
  }

  async loadUserWorkspaces(): Promise<void> {
    const user = this.supabase.currentUser;
    if (!user) {
      console.error('No user logged in');
      return;
    }

    try {
      // Get workspace IDs where user is a member
      const { data: memberData, error: memberError } = await this.supabase.client
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      if (!memberData || memberData.length === 0) {
        this.workspacesSubject.next([]);
        return;
      }

      const workspaceIds = memberData.map(m => m.workspace_id);

      // Get workspace details
      const { data: workspaceData, error: workspaceError } = await this.supabase.client
        .from('workspaces')
        .select('*')
        .in('id', workspaceIds)
        .order('created_at', { ascending: false });

      if (workspaceError) throw workspaceError;

      this.workspacesSubject.next(workspaceData || []);

      // Set first workspace as current if none selected
      if (!this.currentWorkspace && workspaceData && workspaceData.length > 0) {
        this.setCurrentWorkspace(workspaceData[0]);
      }

    } catch (error) {
      console.error('Error loading workspaces:', error);
      this.workspacesSubject.next([]);
    }
  }

  setCurrentWorkspace(workspace: Workspace | null): void {
    this.currentWorkspaceSubject.next(workspace);
    if (workspace) {
      localStorage.setItem('currentWorkspaceId', workspace.id);
    } else {
      localStorage.removeItem('currentWorkspaceId');
    }
  }

  async createWorkspace(data: CreateWorkspaceData): Promise<Workspace> {
    const user = this.supabase.currentUser;
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const { data: workspace, error: workspaceError } = await this.supabase.client
        .from('workspaces')
        .insert({
          name: data.name,
          type: data.type,
          description: data.description,
          created_by: user.id
        })
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      // Add creator as owner
      const { error: memberError } = await this.supabase.client
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          role: 'owner'
        });

      if (memberError) throw memberError;

      // Update local state
      const currentWorkspaces = this.workspacesSubject.value;
      this.workspacesSubject.next([workspace, ...currentWorkspaces]);
      this.setCurrentWorkspace(workspace);

      return workspace;

    } catch (error) {
      console.error('Error creating workspace:', error);
      throw error;
    }
  }

  async updateWorkspace(id: string, updates: Partial<Workspace>): Promise<Workspace> {
    try {
      const { data, error } = await this.supabase.client
        .from('workspaces')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const currentWorkspaces = this.workspacesSubject.value;
      const updatedWorkspaces = currentWorkspaces.map(w => w.id === id ? data : w);
      this.workspacesSubject.next(updatedWorkspaces);

      // Update current workspace if it's the one being edited
      if (this.currentWorkspace?.id === id) {
        this.setCurrentWorkspace(data);
      }

      return data;

    } catch (error) {
      console.error('Error updating workspace:', error);
      throw error;
    }
  }

  async deleteWorkspace(id: string): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('workspaces')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local state
      const currentWorkspaces = this.workspacesSubject.value;
      const filteredWorkspaces = currentWorkspaces.filter(w => w.id !== id);
      this.workspacesSubject.next(filteredWorkspaces);

      // Clear current workspace if it was deleted
      if (this.currentWorkspace?.id === id) {
        this.setCurrentWorkspace(filteredWorkspaces[0] || null);
      }

    } catch (error) {
      console.error('Error deleting workspace:', error);
      throw error;
    }
  }

  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('Error getting workspace members:', error);
      return [];
    }
  }

  /**
   * Get user's role in workspace
   */
  async getUserRoleInWorkspace(workspaceId: string, userId: string): Promise<'owner' | 'admin' | 'member' | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data?.role || null;

    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }

  /**
   * Add member to workspace by email
   */
  async inviteMember(workspaceId: string, email: string, role: 'admin' | 'member'): Promise<void> {
    try {
      // Find user by email
      const { data: users, error: searchError } = await this.supabase.client.auth.admin.listUsers();
      
      if (searchError) throw searchError;

      const user = users?.users?.find(u => u.email === email);
      if (!user) {
        throw new Error('User not found with that email');
      }

      // Add member
      const { error } = await this.supabase.client
        .from('workspace_members')
        .insert({
          workspace_id: workspaceId,
          user_id: user.id,
          role: role,
          joined_at: new Date().toISOString()
        });

      if (error) throw error;

    } catch (error) {
      console.error('Error inviting member:', error);
      throw error;
    }
  }

  /**
   * Remove member from workspace
   */
  async removeMember(workspaceId: string, userId: string): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);

      if (error) throw error;

    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(workspaceId: string, userId: string, role: 'admin' | 'member'): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('workspace_members')
        .update({ role })
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);

      if (error) throw error;

    } catch (error) {
      console.error('Error updating member role:', error);
      throw error;
    }
  }
}