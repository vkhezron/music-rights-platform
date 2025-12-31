import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  LucideAngularModule,
  PenSquare,
  ExternalLink,
  LayoutDashboard,
  UserCircle2,
  Gauge,
  AlertTriangle,
  Loader2,
} from 'lucide-angular';
import { ProfileService } from '../../services/profile.service';
import { SupabaseService } from '../../services/supabase.service';
import { WorkspaceService } from '../../services/workspace.service';
import { WorksService } from '../../services/works';
import { RightsHoldersService } from '../../services/rights-holder';
import { ProtocolService } from '../../services/protocol.service';
import type { UserProfile } from '../../../models/profile.model';

interface QuickStats {
  works: number;
  collaborators: number;
  protocols: number;
}

@Component({
  selector: 'app-profile-hub',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './profile-hub.component.html',
  styleUrls: ['./profile-hub.component.scss'],
})
export class ProfileHubComponent implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);
  private readonly workspaceService = inject(WorkspaceService);
  private readonly worksService = inject(WorksService);
  private readonly rightsHoldersService = inject(RightsHoldersService);
  private readonly protocolService = inject(ProtocolService);

  readonly EditIcon = PenSquare;
  readonly PublicIcon = ExternalLink;
  readonly DashboardIcon = LayoutDashboard;
  readonly AvatarIcon = UserCircle2;
  readonly GaugeIcon = Gauge;
  readonly WarningIcon = AlertTriangle;
  readonly LoaderIcon = Loader2;

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly profile = signal<UserProfile | null>(null);

  private readonly profileStream = toSignal(this.profileService.profile$, {
    initialValue: this.profileService.currentProfile,
  });

  private readonly workspaceStream = toSignal(this.workspaceService.currentWorkspace$, {
    initialValue: this.workspaceService.currentWorkspace,
  });

  private readonly worksStream = toSignal(this.worksService.works$, {
    initialValue: this.worksService.works,
  });

  private readonly rightsHoldersStream = toSignal(this.rightsHoldersService.rightsHolders$, {
    initialValue: this.rightsHoldersService.rightsHolders,
  });

  private readonly protocolsStream = toSignal(this.protocolService.protocols$, {
    initialValue: [],
  });

  private workspaceLoadedFor: string | null = null;

  protected readonly quickStats = computed<QuickStats>(() => ({
    works: this.worksStream()?.length ?? 0,
    collaborators: this.rightsHoldersStream()?.length ?? 0,
    protocols: this.protocolsStream()?.length ?? 0,
  }));

  protected readonly profileCompleteness = computed(() => this.getProfileCompleteness());

  constructor() {
    effect(() => {
      const latestProfile = this.profileStream();
      if (latestProfile) {
        this.profile.set(latestProfile);
        this.errorMessage.set(null);
        this.isLoading.set(false);
      }
    });

    effect(() => {
      const workspace = this.workspaceStream();
      if (!workspace) {
        this.workspaceLoadedFor = null;
        return;
      }

      if (this.workspaceLoadedFor === workspace.id) {
        return;
      }

      this.workspaceLoadedFor = workspace.id;

      Promise.all([
        this.rightsHoldersService.loadRightsHolders(workspace.id).catch(error => {
          console.error('Failed to load rights holders for profile hub', error);
        }),
        this.protocolService.loadProtocols(workspace.id).catch(error => {
          console.error('Failed to load protocols for profile hub', error);
        }),
      ]).catch(error => console.error('Failed to bootstrap profile hub workspace data', error));
    });
  }

  async ngOnInit(): Promise<void> {
    await this.fetchProfile();
  }

  protected hasIncompleteProfile(): boolean {
    return this.profileCompleteness() < 80;
  }

  protected goToEditProfile(): void {
    const existingProfile = this.profile();
    this.router.navigate([existingProfile ? '/profile/edit' : '/profile/setup']);
  }

  protected goToPublicProfile(): void {
    const nickname = this.profile()?.nickname;
    if (!nickname) {
      return;
    }
    this.router.navigate(['/u', nickname]);
  }

  protected goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  protected skipToDashboard(): void {
    this.goToDashboard();
  }

  protected displayName(): string {
    const current = this.profile();
    if (!current) {
      return '';
    }
    return current.custom_role_text?.trim() ? current.custom_role_text : current.nickname;
  }

  private async fetchProfile(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const profile = await this.profileService.getCurrentProfile({ refresh: true });

      if (!profile) {
        this.profile.set(null);
        this.errorMessage.set('Profile not found yet. Finish your profile to unlock collaboration.');
        return;
      }

      this.profile.set(profile);
    } catch (error: any) {
      console.error('Error loading profile hub data', error);
      this.errorMessage.set(error?.message || 'Unable to load your profile right now.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private getProfileCompleteness(): number {
    const current = this.profile();
    if (!current) {
      return 0;
    }

    const checks: Array<boolean> = [
      Boolean(current.nickname),
      Boolean(current.primary_role || current.custom_role_text),
      Boolean(current.bio && current.bio.trim().length > 0),
      Boolean(current.avatar_url),
      (current.secondary_roles?.length ?? 0) > 0,
      Object.values(current.social_links ?? {}).some(link => Boolean(link && link.trim().length > 0)),
      Boolean(current.spotify_artist_url),
    ];

    const total = checks.length;
    const completed = checks.filter(Boolean).length;

    return Math.round((completed / total) * 100);
  }
}
