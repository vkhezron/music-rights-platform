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

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, AsyncPipe, TranslateModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private router = inject(Router);
  private profileService = inject(ProfileService);
  private supabase = inject(SupabaseService);
  private workspaceService = inject(WorkspaceService);

  // Public properties for template
  profile$ = this.profileService.profile$;
  user = this.supabase.currentUser;
  workspaces$!: Observable<Workspace[]>;
  currentWorkspace$ = this.workspaceService.currentWorkspace$;
  currentWorkspace: Workspace | null = null;

  profileDetailsVisible = signal(false);

  // Active tab
  activeTab = signal<'dashboard' | 'rights-holders' | 'works'>('dashboard');

  // Social platforms with icons
  socialPlatforms = [
    { key: 'instagram', label: 'Instagram', icon: '📷', color: '#E4405F' },
    { key: 'twitter', label: 'Twitter/X', icon: '𝕏', color: '#000000' },
    { key: 'facebook', label: 'Facebook', icon: '👤', color: '#1877F2' },
    { key: 'tiktok', label: 'TikTok', icon: '🎵', color: '#000000' },
    { key: 'youtube', label: 'YouTube', icon: '▶️', color: '#FF0000' },
    { key: 'website', label: 'Website', icon: '🌐', color: '#667eea' },
    { key: 'spotify', label: 'Spotify', icon: '🎧', color: '#1DB954' }
  ];

  ngOnInit() {
    // If no user, redirect to login
    if (!this.user) {
      this.router.navigate(['/auth/login']);
      return;
    }

    // Initialize observables
    this.workspaces$ = this.workspaceService.workspaces$;
    
    // Subscribe to current workspace
    this.currentWorkspace$.subscribe(workspace => {
      this.currentWorkspace = workspace;
    });
  }

  toggleProfileDetails() {
    this.profileDetailsVisible.set(!this.profileDetailsVisible());
  }

  goToWorkspaces() {
    this.router.navigate(['/workspaces']);
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
      alert(`${platform} link copied to clipboard!`);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  getSocialLink(profile: any, key: string): string | null {
    const value = profile[key];
    return value || null;
  }

  // Workspace management
  switchWorkspace(workspaceId: string) {
    const workspaces = this.workspaceService.workspaces$ as any;
    // Find workspace by ID
    this.workspaces$.subscribe(ws => {
      const workspace = ws.find(w => w.id === workspaceId);
      if (workspace) {
        this.workspaceService.setCurrentWorkspace(workspace);
      }
    });
  }

  // Navigation
  setActiveTab(tab: 'dashboard' | 'rights-holders' | 'works') {
    this.activeTab.set(tab);
    
    // Navigate to appropriate route
    switch(tab) {
      case 'rights-holders':
        this.router.navigate(['/rights-holders']);
        break;
      case 'works':
        this.router.navigate(['/works']);
        break;
      default:
        // Stay on dashboard
        break;
    }
  }

  // Quick actions
  addRightsHolder() {
    this.router.navigate(['/rights-holders/create']);
  }

  createWork() {
    this.router.navigate(['/works/create']);
  }

  // Add these methods after existing methods

editWorkspace(workspace: Workspace) {
  // TODO: Navigate to edit workspace or show modal
  console.log('Edit workspace:', workspace);
  alert('Edit workspace feature - coming soon!');
}

updateWorkData() {
  this.router.navigate(['/works/create']);
}

manageRightsHolders() {
  this.router.navigate(['/rights-holders']);
}

archiveWorkspace(workspace: Workspace) {
  const confirm = window.confirm(`Archive "${workspace.name}"? You can restore it later.`);
  if (confirm) {
    // TODO: Implement archive functionality
    console.log('Archive workspace:', workspace);
    alert('Archive feature - coming soon!');
  }
}

// Progress tracking methods (placeholder - will connect to actual data)
getProjectCompletionPercentage(): number {
  // TODO: Calculate based on actual data
  // For now, return dummy data
  let completion = 0;
  if (this.hasWorkData()) completion += 33;
  if (this.hasRightsHolders()) completion += 33;
  if (this.hasSplits()) completion += 34;
  return completion;
}

hasWorkData(): boolean {
  // TODO: Check if work has data (title, ISRC, etc.)
  return false;
}

hasRightsHolders(): boolean {
  // TODO: Check if rights holders are added
  return false;
}

hasSplits(): boolean {
  // TODO: Check if splits are defined and total 100%
  return false;
}

  async logout() {
    await this.supabase.signOut();
    this.router.navigate(['/auth/login']);
  }
}