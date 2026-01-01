import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, Share2, UserPlus, ArrowLeft, Globe } from 'lucide-angular';
import { ProfileService } from '../services/profile.service';
import { RightsHoldersService } from '../services/rights-holder';
import { WorkspaceService } from '../services/workspace.service';
import { SupabaseService } from '../services/supabase.service';
import type { UserProfile } from '../../models/profile.model';
import type { RightsHolder, RightsHolderFormData, RightsHolderKind } from '../../models/rights-holder.model';

interface SocialLink {
  key: string;
  label: string;
  url: string;
}

@Component({
  selector: 'app-public-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, TranslateModule],
  templateUrl: './public-profile.html',
  styleUrls: ['./public-profile.scss'],
})
export class PublicProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly profileService = inject(ProfileService);
  private readonly rightsHoldersService = inject(RightsHoldersService);
  private readonly workspaceService = inject(WorkspaceService);
  private readonly supabase = inject(SupabaseService);

  readonly ShareIcon = Share2;
  readonly UserPlusIcon = UserPlus;
  readonly BackIcon = ArrowLeft;
  readonly GlobeIcon = Globe;

  protected isLoading = signal(true);
  protected isAdding = signal(false);
  protected profile = signal<UserProfile | null>(null);
  protected errorMessage = signal<string | null>(null);
  protected successMessage = signal<string | null>(null);

  private readonly currentWorkspace = toSignal(this.workspaceService.currentWorkspace$, {
    initialValue: this.workspaceService.currentWorkspace,
  });

  private readonly rightsHoldersSignal = toSignal(this.rightsHoldersService.rightsHolders$, {
    initialValue: this.rightsHoldersService.rightsHolders,
  });

  protected readonly socialLinks = computed<SocialLink[]>(() => {
    const profile = this.profile();
    if (!profile?.social_links) return [];

    const entries: SocialLink[] = [];
    const source = profile.social_links;

    const pushIfValue = (key: keyof typeof source, label: string, formatter?: (value: string) => string) => {
      const value = source[key];
      if (!value) return;
      const url = formatter ? formatter(value) : value;
      if (!url) return;
      entries.push({ key, label, url });
    };

    pushIfValue('instagram', 'Instagram', value => this.formatHandleUrl('https://instagram.com/', value));
    pushIfValue('twitter', 'Twitter/X', value => this.formatHandleUrl('https://twitter.com/', value));
    pushIfValue('facebook', 'Facebook', value => this.ensureHttps(value));
    pushIfValue('tiktok', 'TikTok', value => this.formatHandleUrl('https://www.tiktok.com/@', value));
    pushIfValue('youtube', 'YouTube', value => this.ensureHttps(value));
    pushIfValue('website', 'Website', value => this.ensureHttps(value));
    pushIfValue('spotify', 'Spotify', value => this.ensureHttps(value));

    if (profile.spotify_artist_url) {
      entries.push({
        key: 'spotify_artist_url',
        label: 'Spotify Artist',
        url: this.ensureHttps(profile.spotify_artist_url),
      });
    }

    return entries;
  });

  protected readonly secondaryRoles = computed(() => this.profile()?.secondary_roles ?? []);

  protected readonly canAddToWorkspace = computed(() => {
    return Boolean(this.supabase.currentUser && this.currentWorkspace());
  });

  protected readonly existingRightsHolder = computed<RightsHolder | null>(() => {
    const profile = this.profile();
    if (!profile) return null;
    const holders = this.rightsHoldersSignal();
    if (!holders?.length) return null;
    return (
      holders.find(holder => holder.profile_id === profile.id) ??
      holders.find(holder => holder.nickname && holder.nickname === profile.nickname)
    ) ?? null;
  });

  protected readonly showAddButton = computed(() => this.canAddToWorkspace() && !this.existingRightsHolder());

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const nickname = params.get('nickname');
      if (!nickname) {
        this.errorMessage.set('Profile handle missing.');
        this.isLoading.set(false);
        return;
      }
      this.loadProfile(nickname);
    });

    effect(() => {
      const workspace = this.currentWorkspace();
      if (!workspace) return;
      if (!this.supabase.currentUser) return;
      this.rightsHoldersService
        .loadRightsHolders(workspace.id)
        .catch(error => console.error('Failed to load rights holders for workspace', error));
    });
  }

  ngOnInit(): void {}

  async shareProfile(): Promise<void> {
    const url = window.location.href;
    try {
      if ('share' in navigator && typeof navigator.share === 'function') {
        await navigator.share({ title: this.profile()?.nickname ?? 'Music Rights Profile', url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        this.successMessage.set('Profile link copied to clipboard.');
        setTimeout(() => this.successMessage.set(null), 2500);
      }
    } catch (error) {
      console.error('Unable to share profile', error);
      this.errorMessage.set('Unable to share profile link right now.');
    }
  }

  async addAsRightsHolder(): Promise<void> {
    if (!this.canAddToWorkspace()) {
      this.errorMessage.set('Sign in and select a workspace to add collaborators.');
      return;
    }

    const profile = this.profile();
    const workspace = this.currentWorkspace();
    if (!profile || !workspace) {
      this.errorMessage.set('Profile or workspace not available.');
      return;
    }

    if (this.existingRightsHolder()) {
      this.errorMessage.set('This collaborator is already in your workspace.');
      return;
    }

    this.isAdding.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const payload: RightsHolderFormData & { profile_id?: string } = {
        type: 'person',
        kind: this.mapPrimaryRole(profile.primary_role),
        nickname: profile.nickname,
        display_name: profile.nickname,
        bio: profile.bio,
        social_links: this.mapSocialLinks(profile),
        visibility_settings: {
          show_nickname: true,
          show_bio: Boolean(profile.bio),
          show_social: Boolean(this.socialLinks().length),
        },
        notes: `Imported from public profile @${profile.nickname}`,
        profile_id: profile.id,
      };

      await this.rightsHoldersService.createRightsHolder(payload);
      this.successMessage.set('Added to your workspace. You can edit details in Rights Holders.');
      setTimeout(() => this.successMessage.set(null), 4000);
    } catch (error: any) {
      console.error('Failed to create rights holder from profile', error);
      this.errorMessage.set(error?.message || 'Unable to add collaborator right now.');
    } finally {
      this.isAdding.set(false);
    }
  }

  private async loadProfile(nickname: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const normalized = nickname.replace(/^@/, '');
      const profile = await this.profileService.getProfileByNickname(normalized);
      if (!profile) {
        this.profile.set(null);
        this.errorMessage.set('No profile found for this handle.');
        return;
      }
      this.profile.set(profile);
    } catch (error) {
      console.error('Failed to load public profile', error);
      this.errorMessage.set('Unable to load this profile right now.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected formatLanguage(code: string | undefined): string {
    if (!code) return 'Unknown';
    const map: Record<string, string> = {
      en: 'English',
      de: 'Deutsch',
      es: 'Español',
      ua: 'Українська',
      fr: 'Français',
      it: 'Italiano',
      pt: 'Português',
    };
    return map[code] ?? code;
  }

  private formatHandleUrl(base: string, value: string): string {
    const cleaned = value.trim().replace(/^@/, '');
    return `${base}${cleaned}`;
  }

  private ensureHttps(value: string): string {
    if (!value) return value;
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }
    return `https://${value.replace(/^https?:\/\//, '')}`;
  }

  private mapPrimaryRole(role: string | null | undefined): RightsHolderKind {
    switch (role) {
      case 'artist':
        return 'artist';
      case 'recording':
        return 'engineer';
      case 'lyricist':
        return 'author';
      case 'composer':
        return 'composer';
      case 'label':
        return 'label';
      case 'publishing':
        return 'publisher';
      case 'visual_artist':
        return 'artist';
      default:
        return 'other';
    }
  }

  private mapSocialLinks(profile: UserProfile): RightsHolder['social_links'] {
    const social = profile.social_links ?? {};
    const result: RightsHolder['social_links'] = {};
    if (social.instagram) result.instagram = this.formatHandleUrl('https://instagram.com/', social.instagram);
    if (social.spotify) result.spotify = this.ensureHttps(social.spotify);
    if (social.youtube) result.youtube = this.ensureHttps(social.youtube);
    if (social.tiktok) result.tiktok = this.formatHandleUrl('https://www.tiktok.com/@', social.tiktok);
    if (social.website) result.website = this.ensureHttps(social.website);
    return result;
  }
}
