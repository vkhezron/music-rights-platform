import { Component, DestroyRef, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProfileService } from '../../services/profile.service';
import { GdprService } from '../../services/gdpr.service';
import { FeedbackService } from '../../services/feedback.service';
import { SupabaseService } from '../../services/supabase.service';
import { AuthRecoveryService } from '../../services/auth-recovery.service';
import {
  ProfileFormData,
  PRIMARY_ROLE_GROUPS,
  PRIMARY_ROLE_OTHER,
  SECONDARY_ROLE_GROUPS,
  LANGUAGES,
  SOCIAL_PLATFORMS,
  UserProfile,
  RoleGroupDefinition,
  normalizeRoleKey,
  normalizeRoleList
} from '../../../models/profile.model';

// Import Lucide Icons
import { LucideAngularModule, ChevronDown, ChevronRight,
         Camera, Twitter, Facebook, Music, Video, Globe, Headphones, Copy, Download, Lock, RefreshCcw } from 'lucide-angular';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    LucideAngularModule,
    RouterModule
  ],
  templateUrl: './profile-edit.html',
  styleUrl: './profile-edit.scss'
})
export class ProfileEdit implements OnInit {
  private fb = inject(FormBuilder);
  private profileService = inject(ProfileService);
  private gdprService = inject(GdprService);
  private feedback = inject(FeedbackService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private supabase = inject(SupabaseService);
  private recoveryService = inject(AuthRecoveryService);
  private translate = inject(TranslateService);

  // Lucide Icons
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
  readonly Download = Download;
  readonly Lock = Lock;
  readonly Refresh = RefreshCcw;

  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  isLoading = signal(false);
  passwordLoading = signal(false);
  isRegeneratingCodes = signal(false);
  showOptional = signal(false);
  recoveryUsage = signal<{ total: number; used: number; remaining: number } | null>(null);
  generatedCodes = signal<string[] | null>(null);
  private hasInitialProfileApplied = false;

  // Constants
  primaryRoleGroups = PRIMARY_ROLE_GROUPS;
  secondaryRoleGroups = SECONDARY_ROLE_GROUPS;
  languages = LANGUAGES;
  socialPlatforms = SOCIAL_PLATFORMS;

  // Role search & filtering
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
      this.feedback.success(`${platformName} link copied to clipboard.`);
    } catch (err) {
      console.error('Failed to copy:', err);
      this.feedback.error('We could not copy that link. Please try again.');
    }
  }

  constructor() {
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.languageVersion.update((count) => count + 1));
  }

  ngOnInit() {
    this.initializeForm();
    this.initializePasswordForm();
    this.listenForProfileUpdates();
    this.loadCurrentProfile();
    this.refreshRecoveryUsage();
  }

  initializeForm() {
    this.profileForm = this.fb.group({
      nickname: [{ value: '', disabled: true }],
      display_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      primary_role: ['', Validators.required],
      custom_role_text: [''],
      secondary_roles: [[]],
      bio: ['', Validators.maxLength(500)],
      primary_language: ['en'],
      instagram: [''],
      twitter: [''],
      facebook: [''],
      tiktok: [''],
      youtube: [''],
      website: [''],
      spotify: ['']
    });

    this.primaryRoleSelection.set('');
    this.secondaryRoleSelection.set([]);

    this.profileForm
      .get('primary_role')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.primaryRoleSelection.set(normalizeRoleKey(value) ?? ''));

    this.profileForm
      .get('secondary_roles')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.secondaryRoleSelection.set(Array.isArray(value) ? normalizeRoleList(value) : []));

    // Watch primary_role changes
    this.profileForm.get('primary_role')?.valueChanges.subscribe(value => {
      const customRoleControl = this.profileForm.get('custom_role_text');
      if (value === 'other') {
        customRoleControl?.setValidators([Validators.required]);
      } else {
        customRoleControl?.clearValidators();
        customRoleControl?.setValue('');
      }
      customRoleControl?.updateValueAndValidity();
    });
  }

  private initializePasswordForm() {
    this.passwordForm = this.fb.group({
      current_password: ['', [Validators.required, Validators.minLength(6)]],
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', [Validators.required]]
    });
  }

  async loadCurrentProfile() {
    this.isLoading.set(true);
    try {
      const profile = await this.profileService.getCurrentProfile({ refresh: true });
      
      if (profile) {
        this.populateForm(profile);
        this.hasInitialProfileApplied = true;
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      this.feedback.handleError(error, 'We could not load your profile. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private listenForProfileUpdates() {
    this.profileService.profile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(profile => {
        if (!profile) {
          return;
        }

        if (this.hasInitialProfileApplied && this.profileForm?.dirty) {
          return;
        }

        this.populateForm(profile);
        this.hasInitialProfileApplied = true;
      });
  }

  private populateForm(profile: UserProfile) {
    if (!this.profileForm) {
      return;
    }

    const normalizedPrimary = normalizeRoleKey(profile.primary_role) ?? '';
    const normalizedSecondary = normalizeRoleList(profile.secondary_roles ?? []);

    this.profileForm.patchValue({
      nickname: profile.nickname,
      display_name: profile.display_name || '',
      primary_role: normalizedPrimary,
      custom_role_text: profile.custom_role_text || '',
      secondary_roles: normalizedSecondary,
      bio: profile.bio || '',
      primary_language: profile.primary_language || 'en',
      instagram: profile.social_links?.instagram || '',
      twitter: profile.social_links?.twitter || '',
      facebook: profile.social_links?.facebook || '',
      tiktok: profile.social_links?.tiktok || '',
      youtube: profile.social_links?.youtube || '',
      website: profile.social_links?.website || '',
      spotify: profile.social_links?.spotify || ''
    });

    this.primaryRoleSelection.set(normalizedPrimary);
    this.secondaryRoleSelection.set(normalizedSecondary);

    if (profile.bio || profile.secondary_roles?.length || Object.keys(profile.social_links || {}).length) {
      this.showOptional.set(true);
    }

    this.profileForm.markAsPristine();
    this.profileForm.markAsUntouched();
  }

  toggleOptional() {
    this.showOptional.set(!this.showOptional());
  }

  onPrimaryRoleSearch(value: string) {
    this.primaryRoleSearch.set((value ?? '').trimStart());
  }

  onSecondaryRoleSearch(value: string) {
    this.secondaryRoleSearch.set((value ?? '').trimStart());
  }

  hasError(fieldName: string, errorType: string): boolean {
    const field = this.profileForm.get(fieldName);
    return field ? field.hasError(errorType) && (field.dirty || field.touched) : false;
  }

  hasPasswordError(fieldName: string, errorType: string): boolean {
    const field = this.passwordForm.get(fieldName);
    return field ? field.hasError(errorType) && (field.dirty || field.touched) : false;
  }

  isSecondaryRoleSelected(role: string): boolean {
    const selectedRoles = this.profileForm.get('secondary_roles')?.value || [];
    return selectedRoles.includes(role);
  }

  toggleSecondaryRole(role: string) {
    const control = this.profileForm.get('secondary_roles');
    const currentRoles = control?.value || [];
    
    if (currentRoles.includes(role)) {
      control?.setValue(currentRoles.filter((r: string) => r !== role));
    } else {
      control?.setValue([...currentRoles, role]);
    }
  }

  async onSubmit() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.feedback.error('Please fix the highlighted fields before saving.');
      return;
    }

    this.isLoading.set(true);

    try {
      const formValue = this.profileForm.value;

      const normalizedPrimaryRole = normalizeRoleKey(formValue.primary_role) ?? PRIMARY_ROLE_OTHER;
      const normalizedSecondaryRoles = normalizeRoleList(formValue.secondary_roles ?? []);

      const profileData: Partial<ProfileFormData> = {
        // nickname is not editable
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
        spotify_artist_url: formValue.spotify && formValue.spotify.trim() ? formValue.spotify : undefined
      };

      await this.profileService.updateProfile(profileData);

      this.feedback.success('Profile updated successfully.');

      setTimeout(() => {
        this.router.navigate(['/profile-hub']);
      }, 1500);

    } catch (error: any) {
      console.error('Profile update error:', error);
      this.feedback.handleError(error, 'We could not save your profile. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async onChangePassword() {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { current_password, new_password, confirm_password } = this.passwordForm.value;
    const currentPassword = (current_password ?? '').toString();
    const newPassword = (new_password ?? '').toString();
    const confirmPassword = (confirm_password ?? '').toString();

    const confirmControl = this.passwordForm.get('confirm_password');

    if (!newPassword || newPassword !== confirmPassword) {
      confirmControl?.setErrors({ ...(confirmControl?.errors ?? {}), mismatch: true });
      confirmControl?.markAsTouched();
      this.feedback.error('Your new passwords do not match.');
      return;
    }

    if (confirmControl?.hasError('mismatch')) {
      const { mismatch, ...others } = confirmControl.errors ?? {};
      confirmControl.setErrors(Object.keys(others).length ? others : null);
    }

    this.passwordLoading.set(true);

    try {
      await this.supabase.changePassword(currentPassword, newPassword);
      this.feedback.success('Password updated successfully.');
      this.resetPasswordForm();
    } catch (error: any) {
      if (error?.message === 'AUTH.INVALID_CURRENT_PASSWORD') {
        this.feedback.error('The current password you entered is incorrect.');
      } else {
        this.feedback.handleError(error, 'We could not update your password. Please try again.');
      }
    } finally {
      this.passwordLoading.set(false);
    }
  }

  resetPasswordForm(clearCodes = false) {
    if (!this.passwordForm) {
      return;
    }

    this.passwordForm.reset();
    this.passwordForm.markAsPristine();
    this.passwordForm.markAsUntouched();
    if (clearCodes) {
      this.generatedCodes.set(null);
    }
  }

  canRegenerateCodes(): boolean {
    const usage = this.recoveryUsage();
    if (!usage) {
      return false;
    }

    if (this.isRegeneratingCodes()) {
      return false;
    }

    if (usage.total <= 0) {
      return false;
    }

    const threshold = Math.min(usage.total, 4);
    return usage.used >= threshold;
  }

  async regenerateRecoveryCodes() {
    if (!this.canRegenerateCodes()) {
      return;
    }

    this.isRegeneratingCodes.set(true);

    try {
      const codes = await this.recoveryService.regenerateRecoveryCodes();
      this.generatedCodes.set(codes);
      this.feedback.success('New recovery codes generated. Save them somewhere safe.');
      await this.refreshRecoveryUsage();
    } catch (error: any) {
      this.feedback.handleError(error, 'We could not regenerate recovery codes. Please try again.');
    } finally {
      this.isRegeneratingCodes.set(false);
    }
  }

  private async refreshRecoveryUsage() {
    try {
      const usage = await this.recoveryService.getRecoveryUsage();
      this.recoveryUsage.set(usage);
    } catch (error) {
      console.error('Failed to load recovery usage', error);
    }
  }

  cancel() {
    this.router.navigate(['/profile-hub']);
  }

  /**
   * Export personal data
   */
  async exportData() {
    try {
      this.isLoading.set(true);
      await this.gdprService.downloadPersonalData();
      this.feedback.success('Your personal data export has started. Check your downloads.');
    } catch (error) {
      console.error('Export error:', error);
      this.feedback.handleError(error, 'Failed to export your personal data. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
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

    const translated = (this.translate.instant(`role.${roleKey}`) || '').toString().toLowerCase();
    if (translated.includes(query)) {
      return true;
    }

    const fallback = roleKey.replace(/_/g, ' ');
    return fallback.includes(query);
  }
}