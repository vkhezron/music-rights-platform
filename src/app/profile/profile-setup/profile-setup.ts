import { Component, DestroyRef, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProfileService } from '../../services/profile.service';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  PRIMARY_ROLE_GROUPS,
  PRIMARY_ROLE_OTHER,
  SECONDARY_ROLE_GROUPS,
  LANGUAGES,
  SOCIAL_PLATFORMS,
  ProfileFormData,
  RoleGroupDefinition,
  normalizeRoleKey,
  normalizeRoleList
} from '../../../models/profile.model';

// Import Lucide Icons
import { LucideAngularModule, AlertCircle, Check, X, ChevronDown, ChevronRight, 
         Camera, Twitter, Facebook, Music, Video, Globe, Headphones, Copy } from 'lucide-angular';

@Component({
  selector: 'app-profile-setup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    LucideAngularModule
  ],
  templateUrl: './profile-setup.html',
  styleUrl: './profile-setup.scss',
})
export class ProfileSetup implements OnInit {
  private fb = inject(FormBuilder);
  private profileService = inject(ProfileService);
  private router = inject(Router);
  private translateService = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  // Lucide Icons
  readonly AlertCircle = AlertCircle;
  readonly Check = Check;
  readonly X = X;
  readonly ChevronDown = ChevronDown;
  readonly ChevronRight = ChevronRight;
  readonly Camera = Camera;
  readonly Twitter = Twitter;
  readonly Facebook = Facebook;
  readonly Music = Music;
  readonly Video = Video;
  readonly Globe = Globe;
  readonly Headphones = Headphones;
  readonly Copy = Copy;

  // Form
  profileForm: FormGroup;

  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  nicknameCheckLoading = signal(false);
  nicknameAvailable = signal<boolean | null>(null);

  // Constants for template
  readonly primaryRoleGroups = PRIMARY_ROLE_GROUPS;
  readonly secondaryRoleGroups = SECONDARY_ROLE_GROUPS;
  readonly languages = LANGUAGES;
  readonly socialPlatforms = SOCIAL_PLATFORMS;

  primaryRoleSearch = signal('');
  secondaryRoleSearch = signal('');
  private primaryRoleSelection = signal('');
  private secondaryRoleSelection = signal<string[]>([]);
  private languageVersion = signal(0);

  filteredPrimaryRoleGroups = computed<RoleGroupDefinition[]>(() => {
    this.languageVersion();
    const query = this.primaryRoleSearch().trim().toLowerCase();
    const selected = normalizeRoleKey(this.primaryRoleSelection()) ?? '';
    return this.filterRoleGroups(this.primaryRoleGroups, query, selected ? [selected] : []);
  });

  filteredSecondaryRoleGroups = computed<RoleGroupDefinition[]>(() => {
    this.languageVersion();
    const query = this.secondaryRoleSearch().trim().toLowerCase();
    const selected = this.secondaryRoleSelection();
    return this.filterRoleGroups(this.secondaryRoleGroups, query, selected);
  });

  // UI state
  showOptionalFields = signal(false);

  // Map platform names to form control names
  getControlName(platformName: string): string {
    const nameMap: { [key: string]: string } = {
      'Instagram': 'instagram',
      'Twitter/X': 'twitter',
      'Facebook': 'facebook',
      'TikTok': 'tiktok',
      'YouTube': 'youtube',
      'Website': 'website',
      'Spotify': 'spotify'
    };
    return nameMap[platformName] || platformName.toLowerCase();
  }

  // Map social platform names to icons
  getSocialIcon(platformName: string): any {
    const iconMap: { [key: string]: any } = {
      'Instagram': this.Camera,
      'Twitter/X': this.Twitter,
      'Facebook': this.Facebook,
      'TikTok': this.Music,
      'YouTube': this.Video,
      'Website': this.Globe,
      'Spotify': this.Headphones
    };
    return iconMap[platformName] || this.Globe;
  }

  async copySocialLink(platformName: string, value: string) {
    if (!value) return;
    
    try {
      await navigator.clipboard.writeText(value);
      const originalSuccess = this.successMessage();
      this.successMessage.set(`${platformName} link copied!`);
      
      setTimeout(() => {
        if (this.successMessage() === `${platformName} link copied!`) {
          this.successMessage.set(originalSuccess);
        }
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      this.errorMessage.set('Failed to copy to clipboard');
    }
  }

  constructor() {
    this.profileForm = this.fb.group({
      // Required fields
      nickname: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
      primary_role: ['', Validators.required],
      custom_role_text: [''],
      
      // Optional fields
      secondary_roles: [[]],
      bio: ['', Validators.maxLength(500)],
      primary_language: ['en'],
      
      // Social links
      instagram: [''],
      twitter: [''],
      facebook: [''],
      tiktok: [''],
      youtube: [''],
      website: [''],
      spotify: [''],
      spotify_artist_url: ['']
    });

    this.translateService.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.languageVersion.update((count) => count + 1));

    // Watch nickname changes for availability check
    this.profileForm
      .get('nickname')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(async (nickname) => {
      if (nickname && nickname.length >= 3) {
        await this.checkNicknameAvailability(nickname);
      } else {
        this.nicknameAvailable.set(null);
      }
      });

    const primaryRoleControl = this.profileForm.get('primary_role');
    this.primaryRoleSelection.set(normalizeRoleKey(primaryRoleControl?.value) ?? '');
    primaryRoleControl
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((role) => {
        const normalized = normalizeRoleKey(role) ?? '';
        this.primaryRoleSelection.set(normalized);

        const customRoleControl = this.profileForm.get('custom_role_text');
        if (normalized === 'other') {
          customRoleControl?.setValidators([Validators.required]);
        } else {
          customRoleControl?.clearValidators();
          customRoleControl?.setValue('');
        }
        customRoleControl?.updateValueAndValidity();
      });

    const secondaryRolesControl = this.profileForm.get('secondary_roles');
    this.secondaryRoleSelection.set(normalizeRoleList(secondaryRolesControl?.value || []));
    secondaryRolesControl
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((roles) => this.secondaryRoleSelection.set(Array.isArray(roles) ? normalizeRoleList(roles) : []));
  }

  ngOnInit() {
    const displayName = sessionStorage.getItem('displayName');
    const nickname = sessionStorage.getItem('nickname');
    const patch: any = {};
    if (nickname) patch.nickname = nickname;
    if (displayName) patch.display_name = displayName;
    if (Object.keys(patch).length) {
      this.profileForm.patchValue(patch);
      sessionStorage.removeItem('displayName');
      sessionStorage.removeItem('nickname');
    }
    this.checkExistingProfile();
  }

  async checkExistingProfile() {
    const profile = await this.profileService.loadProfile(
      this.profileService['supabase'].currentUser?.id || ''
    );
    
    if (profile) {
      this.router.navigate(['/profile-hub']);
    }
  }

  async checkNicknameAvailability(nickname: string) {
    this.nicknameCheckLoading.set(true);
    try {
      const available = await this.profileService.isNicknameAvailable(nickname);
      this.nicknameAvailable.set(available);
    } catch (error) {
      console.error('Error checking nickname:', error);
      this.nicknameAvailable.set(null);
    } finally {
      this.nicknameCheckLoading.set(false);
    }
  }

  toggleSecondaryRole(roleValue: string) {
    const control = this.profileForm.get('secondary_roles');
    const currentRoles = normalizeRoleList(control?.value || []);
    const index = currentRoles.indexOf(roleValue);
    
    if (index > -1) {
      currentRoles.splice(index, 1);
    } else {
      currentRoles.push(roleValue);
    }
    
    control?.setValue(currentRoles);
  }

  isSecondaryRoleSelected(roleValue: string): boolean {
    const roles = normalizeRoleList(this.profileForm.get('secondary_roles')?.value || []);
    return roles.includes(roleValue);
  }

  toggleOptionalFields() {
    this.showOptionalFields.set(!this.showOptionalFields());
  }

  onPrimaryRoleSearch(value: string) {
    this.primaryRoleSearch.set((value ?? '').trimStart());
  }

  onSecondaryRoleSearch(value: string) {
    this.secondaryRoleSearch.set((value ?? '').trimStart());
  }

  async onSubmit() {
    if (this.profileForm.get('nickname')?.invalid || 
        this.profileForm.get('primary_role')?.invalid ||
        (this.profileForm.get('primary_role')?.value === 'other' && 
         this.profileForm.get('custom_role_text')?.invalid)) {
      this.profileForm.markAllAsTouched();
      this.errorMessage.set('PROFILE.REQUIRED_FIELDS_ERROR');
      return;
    }

    if (this.nicknameAvailable() !== true) {
      this.errorMessage.set('PROFILE.NICKNAME_NOT_AVAILABLE');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const formValue = this.profileForm.value;

      const normalizedPrimaryRole = normalizeRoleKey(formValue.primary_role) ?? PRIMARY_ROLE_OTHER;
      const normalizedSecondaryRoles = normalizeRoleList(formValue.secondary_roles ?? []);
      
      const profileData: ProfileFormData = {
        nickname: formValue.nickname,
        display_name: formValue.display_name,
        primary_role: normalizedPrimaryRole,
        custom_role_text: formValue.custom_role_text || undefined,
        secondary_roles: normalizedSecondaryRoles,
        bio: formValue.bio || undefined,
        primary_language: formValue.primary_language || 'en',
        social_links: {
          instagram: formValue.instagram && formValue.instagram.trim() ? formValue.instagram : undefined,
          twitter: formValue.twitter && formValue.twitter.trim() ? formValue.twitter : undefined,
          facebook: formValue.facebook && formValue.facebook.trim() ? formValue.facebook : undefined,
          tiktok: formValue.tiktok && formValue.tiktok.trim() ? formValue.tiktok : undefined,
          youtube: formValue.youtube && formValue.youtube.trim() ? formValue.youtube : undefined,
          website: formValue.website && formValue.website.trim() ? formValue.website : undefined,
          spotify: formValue.spotify && formValue.spotify.trim() ? formValue.spotify : undefined
        },
        spotify_artist_url: formValue.spotify ? formValue.spotify : undefined
      };

      await this.profileService.createProfile(profileData);

      this.router.navigate(['/profile-hub']);

    } catch (error: any) {
      console.error('Profile creation error:', error);
      this.errorMessage.set(error.message || 'PROFILE.CREATION_ERROR');
    } finally {
      this.isLoading.set(false);
    }
  }

  skipOptionalFields() {
    this.onSubmit();
  }

  hasError(fieldName: string, errorType: string): boolean {
    const field = this.profileForm.get(fieldName);
    return field ? field.hasError(errorType) && (field.dirty || field.touched) : false;
  }

  private filterRoleGroups(
    groups: readonly RoleGroupDefinition[],
    query: string,
    alwaysInclude: readonly string[]
  ): RoleGroupDefinition[] {
    const includeSet = new Set(alwaysInclude.filter(Boolean));

    if (!query) {
      return groups.map((group) => ({
        id: group.id,
        labelKey: group.labelKey,
        roles: [...group.roles]
      }));
    }

    const normalizedQuery = query.toLowerCase();
    const filtered: RoleGroupDefinition[] = [];

    for (const group of groups) {
      const roles = group.roles.filter(
        (role) => includeSet.has(role) || this.roleMatchesQuery(role, normalizedQuery)
      );

      if (roles.length > 0) {
        filtered.push({
          id: group.id,
          labelKey: group.labelKey,
          roles
        });
      }
    }

    return filtered;
  }

  private roleMatchesQuery(roleKey: string, query: string): boolean {
    if (!query) {
      return true;
    }

    const translated = (this.translateService.instant(`role.${roleKey}`) || '').toString().toLowerCase();
    if (translated.includes(query)) {
      return true;
    }

    const fallback = roleKey.replace(/_/g, ' ');
    return fallback.includes(query);
  }
}