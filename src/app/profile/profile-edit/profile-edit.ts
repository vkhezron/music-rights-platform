import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ProfileService } from '../../services/profile.service';
import { GdprService } from '../../services/gdpr.service';
import { FeedbackService } from '../../services/feedback.service';
import { ProfileFormData, PRIMARY_ROLES, SECONDARY_ROLES, LANGUAGES, SOCIAL_PLATFORMS } from '../../../models/profile.model';

// Import Lucide Icons
import { LucideAngularModule, ChevronDown, ChevronRight,
         Camera, Twitter, Facebook, Music, Video, Globe, Headphones, Copy, Download } from 'lucide-angular';

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

  profileForm!: FormGroup;
  isLoading = signal(false);
  showOptional = signal(false);

  // Constants
  primaryRoles = PRIMARY_ROLES;
  secondaryRoles = SECONDARY_ROLES;
  languages = LANGUAGES;
  socialPlatforms = SOCIAL_PLATFORMS;

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

  ngOnInit() {
    this.initializeForm();
    this.loadCurrentProfile();
  }

  initializeForm() {
    this.profileForm = this.fb.group({
      nickname: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
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

  async loadCurrentProfile() {
    this.isLoading.set(true);
    try {
      const profile = await this.profileService.currentProfile;
      
      if (profile) {
        this.profileForm.patchValue({
          nickname: profile.nickname,
          primary_role: profile.primary_role,
          custom_role_text: profile.custom_role_text || '',
          secondary_roles: profile.secondary_roles || [],
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

        if (profile.bio || profile.secondary_roles?.length || Object.keys(profile.social_links || {}).length) {
          this.showOptional.set(true);
        }
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      this.feedback.handleError(error, 'We could not load your profile. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  toggleOptional() {
    this.showOptional.set(!this.showOptional());
  }

  hasError(fieldName: string, errorType: string): boolean {
    const field = this.profileForm.get(fieldName);
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

      const profileData: Partial<ProfileFormData> = {
        nickname: formValue.nickname,
        primary_role: formValue.primary_role,
        custom_role_text: formValue.custom_role_text || undefined,
        secondary_roles: formValue.secondary_roles || [],
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
}