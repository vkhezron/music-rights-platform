import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { ProfileService } from '../services/profile.service';
import { Observable } from 'rxjs';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
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
  currentWorkspace: Workspace | null = null;

  // Fixed: profileDetailsVisible (plural) to match template
  profileDetailsVisible = signal(false);

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
    this.workspaces$ = this.workspaceService.workspaces;
    this.currentWorkspace = this.workspaceService.currentWorkspace;
  }

  // Fixed: toggleProfileDetails (2 g's, not 3)
  toggleProfileDetails() {
    this.profileDetailsVisible.set(!this.profileDetailsVisible());
  }

  goToWorkspaces() {
    this.router.navigate(['/workspaces']);
  }

  editProfile() {
    this.router.navigate(['/profile/edit']);
  }

  // Added: missing viewQRCode method
  viewQRCode() {
    this.router.navigate(['/profile/qr-code']);
  }

  async copyToClipboard(text: string, platform: string) {
    try {
      await navigator.clipboard.writeText(text);
      // Fixed: alert syntax
      alert(`${platform} link copied to clipboard!`);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  getSocialLink(profile: any, key: string): string | null {
    const value = profile[key];
    return value || null;
  }

  async logout() {
    await this.supabase.signOut();
    this.router.navigate(['/auth/login']);
  }
}