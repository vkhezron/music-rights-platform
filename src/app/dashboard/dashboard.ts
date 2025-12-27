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
  user = this.supabase.currentUser;
  workspaces$!: Observable<Workspace[]>;
  currentWorkspace$ = this.workspaceService.currentWorkspace$;

  profileDetailsVisible = signal(false);
  activeTab = signal<'dashboard' | 'rights-holders' | 'works'>('dashboard');

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

  ngOnInit() {
    if (!this.user) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.workspaces$ = this.workspaceService.workspaces$;
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
      alert(`${platform} link copied to clipboard!`);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  getSocialLink(profile: any, key: string): string | null {
    const value = profile[key];
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

  selectProject(workspace: Workspace) {
    this.workspaceService.setCurrentWorkspace(workspace);
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

  updateWorkData(workspace: Workspace) {
    this.workspaceService.setCurrentWorkspace(workspace);
    this.router.navigate(['/works/create']);
  }

  manageRightsHolders(workspace: Workspace) {
    this.workspaceService.setCurrentWorkspace(workspace);
    alert('Manage Rights Holders - Coming soon!');
  }

  editWorkspace(workspace: Workspace) {
    alert(`Edit ${workspace.name} - Coming soon!`);
  }

  archiveWorkspace(workspace: Workspace) {
    const confirm = window.confirm(`Archive "${workspace.name}"? You can restore it later.`);
    if (confirm) {
      alert('Archive feature - Coming soon!');
    }
  }

  getProjectCompletionPercentage(): number {
    let completion = 0;
    if (this.hasWorkData()) completion += 33;
    if (this.hasRightsHolders()) completion += 33;
    if (this.hasSplits()) completion += 34;
    return completion;
  }

  hasWorkData(): boolean {
    return false;
  }

  hasRightsHolders(): boolean {
    return false;
  }

  hasSplits(): boolean {
    return false;
  }

  async logout() {
    await this.supabase.signOut();
    this.router.navigate(['/auth/login']);
  }
}