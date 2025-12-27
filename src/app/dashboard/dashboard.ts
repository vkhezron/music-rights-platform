import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { ProfileService } from '../services/profile.service';
import { Observable } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { Workspace } from '../services/workspace.service';
import { WorkspaceService } from '../services/workspace.service';
import { WorksService } from '../services/works';
import { UserProfile } from '../../models/profile.model';

// Import Lucide Icons
import { LucideAngularModule, Music, Disc, Disc3, FolderOpen, Plus, LogOut, 
         Home, Users, Edit, Archive, Check, Circle, ChevronDown, 
         ChevronRight, Smartphone, Camera, Twitter, Facebook, Video, 
         Globe, Headphones, Copy, ExternalLink } from 'lucide-angular';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    AsyncPipe, 
    TranslateModule,
    LucideAngularModule
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private router = inject(Router);
  private profileService = inject(ProfileService);
  private supabase = inject(SupabaseService);
  private workspaceService = inject(WorkspaceService);
  private worksService = inject(WorksService);

  // Lucide Icons (make them available to template)
  readonly Music = Music;
  readonly Disc = Disc;
  readonly Disc3 = Disc3;
  readonly FolderOpen = FolderOpen;
  readonly Plus = Plus;
  readonly LogOut = LogOut;
  readonly Home = Home;
  readonly Users = Users;
  readonly Edit = Edit;
  readonly Archive = Archive;
  readonly Check = Check;
  readonly Circle = Circle;
  readonly ChevronDown = ChevronDown;
  readonly ChevronRight = ChevronRight;
  readonly Smartphone = Smartphone;
  readonly Camera = Camera;
  readonly Twitter = Twitter;
  readonly Facebook = Facebook;
  readonly Video = Video;
  readonly Globe = Globe;
  readonly Headphones = Headphones;
  readonly Copy = Copy;
  readonly ExternalLink = ExternalLink;

  // Public properties for template
  profile$ = this.profileService.profile$;
  profile = signal<UserProfile | null>(null);
  user = this.supabase.currentUser;
  workspaces$ = this.workspaceService.workspaces$;
  workspaces = signal<Workspace[]>([]);
  currentWorkspace$ = this.workspaceService.currentWorkspace$;
  currentWorkspace = signal<Workspace | null>(null);

  // UI State
  profileDetailsVisible = signal(false);
  activeTab = signal<'dashboard' | 'rights-holders' | 'works'>('dashboard');
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  // Social platforms with icons
  socialPlatforms = [
    { key: 'instagram', label: 'Instagram', icon: 'Camera', color: '#E4405F' },
    { key: 'twitter', label: 'Twitter/X', icon: 'Twitter', color: '#000000' },
    { key: 'facebook', label: 'Facebook', icon: 'Facebook', color: '#1877F2' },
    { key: 'tiktok', label: 'TikTok', icon: 'Music', color: '#000000' },
    { key: 'youtube', label: 'YouTube', icon: 'Video', color: '#FF0000' },
    { key: 'website', label: 'Website', icon: 'Globe', color: '#667eea' },
    { key: 'spotify', label: 'Spotify', icon: 'Headphones', color: '#1DB954' }
  ];

  async ngOnInit() {
    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }

    // Load profile
    if (this.user) {
      this.profile.set(await this.profileService.loadProfile(this.user.id));
    }

    // Load workspaces
    await this.loadWorkspaces();
  }

  async loadWorkspaces() {
    this.isLoading.set(true);
    try {
      await this.workspaceService.loadUserWorkspaces();
      
      this.workspaceService.workspaces$.subscribe(workspaces => {
        this.workspaces.set(workspaces);
        
        // Set current workspace
        const current = this.workspaceService.currentWorkspace;
        if (current) {
          this.currentWorkspace.set(current);
        } else if (workspaces.length > 0) {
          this.currentWorkspace.set(workspaces[0]);
          this.workspaceService.setCurrentWorkspace(workspaces[0]);
        }
      });
    } catch (error) {
      console.error('Error loading workspaces:', error);
      this.errorMessage.set('Failed to load projects');
    } finally {
      this.isLoading.set(false);
    }
  }

  async createProject() {
    const name = prompt('Enter project name:');
    if (!name || !name.trim()) return;

    const typeInput = prompt('Enter project type (single/ep/album/collection):');
    const type = (typeInput?.toLowerCase() || 'single') as 'single' | 'ep' | 'album' | 'collection';

    this.isLoading.set(true);
    try {
      // Create the workspace
      const workspace = await this.workspaceService.createWorkspace({
        name: name.trim(),
        type: type,
        description: ''
      });

      // If it's a Single type, create a default work and redirect to edit it
      if (type === 'single') {
        // Set as current workspace
        this.workspaceService.setCurrentWorkspace(workspace);
        
        // Create default work
        const work = await this.worksService.createWork({
          work_title: workspace.name,
          status: 'draft',
          is_cover_version: false
        });
        
        // Redirect to edit the work
        this.router.navigate(['/works/edit', work.id]);
      } else {
        // For other types (EP, Album, Collection), just refresh the dashboard
        await this.loadWorkspaces();
        this.successMessage.set('Project created successfully!');
        setTimeout(() => this.successMessage.set(''), 3000);
      }
    } catch (error: any) {
      console.error('Error creating project:', error);
      this.errorMessage.set(error.message || 'Failed to create project');
    } finally {
      this.isLoading.set(false);
    }
  }

  selectProject(workspace: Workspace) {
    this.currentWorkspace.set(workspace);
    this.workspaceService.setCurrentWorkspace(workspace);
  }

  async updateWorkData(workspace: Workspace, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    // Set as current workspace
    this.workspaceService.setCurrentWorkspace(workspace);
    
    try {
      this.isLoading.set(true);
      
      // Load works for this workspace
      await this.worksService.loadWorks(workspace.id);
      
      const works = this.worksService.works;
      
      if (works.length === 0) {
        // No work exists, create one
        const work = await this.worksService.createWork({
          work_title: workspace.name,
          status: 'draft',
          is_cover_version: false
        });
        this.router.navigate(['/works/edit', work.id]);
      } else {
        // Work exists, edit the first one (for singles there should only be one)
        this.router.navigate(['/works/edit', works[0].id]);
      }
    } catch (error) {
      console.error('Error loading work:', error);
      this.errorMessage.set('Failed to load work data');
    } finally {
      this.isLoading.set(false);
    }
  }

  manageRightsHolders(workspace: Workspace, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    
    this.workspaceService.setCurrentWorkspace(workspace);
    // TODO: Navigate to rights holders management
    console.log('Manage rights holders for:', workspace.name);
    alert('Rights Holders management - Coming soon!');
  }

  editWorkspace(workspace: Workspace, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    
    const newName = prompt('Enter new project name:', workspace.name);
    if (!newName || !newName.trim() || newName === workspace.name) return;

    this.isLoading.set(true);
    this.workspaceService.updateWorkspace(workspace.id, { name: newName.trim() })
      .then(() => {
        this.successMessage.set('Project updated successfully!');
        setTimeout(() => this.successMessage.set(''), 3000);
      })
      .catch(error => {
        console.error('Error updating workspace:', error);
        this.errorMessage.set('Failed to update project');
      })
      .finally(() => {
        this.isLoading.set(false);
      });
  }

  async archiveWorkspace(workspace: Workspace, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    const confirmed = confirm(`Archive "${workspace.name}"? This will hide it from your active projects.`);
    if (!confirmed) return;

    this.isLoading.set(true);
    try {
      // TODO: Implement archive status instead of delete
      // For now, we'll just delete it
      await this.workspaceService.deleteWorkspace(workspace.id);
      this.successMessage.set('Project archived successfully!');
      setTimeout(() => this.successMessage.set(''), 3000);
      await this.loadWorkspaces();
    } catch (error) {
      console.error('Error archiving workspace:', error);
      this.errorMessage.set('Failed to archive project');
    } finally {
      this.isLoading.set(false);
    }
  }

  // Get workspace icon based on type
  getWorkspaceIcon(type: string): any {
    const iconMap: { [key: string]: any } = {
      'single': this.Music,
      'ep': this.Disc,
      'album': this.Disc3,
      'collection': this.FolderOpen
    };
    return iconMap[type] || this.Music;
  }

  // Get completion percentage for Single type projects
  getCompletionPercentage(workspace: Workspace): number {
    if (workspace.type !== 'single') return 0;
    
    let completion = 0;
    // TODO: Implement actual checks
    if (this.hasWorkData()) completion += 33;
    if (this.hasRightsHolders()) completion += 33;
    if (this.hasSplits()) completion += 34;
    return completion;
  }

  hasWorkData(): boolean {
    // TODO: Implement actual check
    return false;
  }

  hasRightsHolders(): boolean {
    // TODO: Implement actual check
    return false;
  }

  hasSplits(): boolean {
    // TODO: Implement actual check
    return false;
  }

  toggleProfileDetails() {
    this.profileDetailsVisible.set(!this.profileDetailsVisible());
  }

  goToWorkspaces() {
    this.router.navigate(['/workspaces']);
  }

  createNewWorkspace() {
    this.router.navigate(['/workspaces/create']);
  }

  editProfile() {
    this.router.navigate(['/profile/edit']);
  }

  viewQRCode() {
    this.router.navigate(['/profile/qr-code']);
  }

  async copyToClipboard(text: string, platform: string) {
    try {
      await navigator.clipboard.writeText(text);
      this.successMessage.set(`${platform} link copied!`);
      setTimeout(() => this.successMessage.set(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  getSocialLink(profile: any, key: string): string | null {
    const value = profile.social_links?.[key];
    return value || null;
  }

  getIconComponent(iconName: string): any {
    const iconMap: { [key: string]: any } = {
      'Camera': this.Camera,
      'Twitter': this.Twitter,
      'Facebook': this.Facebook,
      'Music': this.Music,
      'Video': this.Video,
      'Globe': this.Globe,
      'Headphones': this.Headphones
    };
    return iconMap[iconName];
  }

  switchWorkspace(workspaceId: string) {
    this.workspaces$.subscribe(ws => {
      const workspace = ws.find(w => w.id === workspaceId);
      if (workspace) {
        this.workspaceService.setCurrentWorkspace(workspace);
      }
    });
  }

  setActiveTab(tab: 'dashboard' | 'rights-holders' | 'works') {
    this.activeTab.set(tab);
    
    switch(tab) {
      case 'rights-holders':
        this.router.navigate(['/rights-holders']);
        break;
      case 'works':
        this.router.navigate(['/works']);
        break;
      default:
        break;
    }
  }

  async logout() {
    this.router.navigate(['/login']);
  }
}