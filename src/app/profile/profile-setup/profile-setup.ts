import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProfileService } from '../../services/profile.service';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { PRIMARY_ROLES, SECONDARY_ROLES, LANGUAGES, SOCIAL_PLATFORMS, ProfileFormData } from '../../../models/profile.model';

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
  readonly primaryRoles = PRIMARY_ROLES;
  readonly secondaryRoles = SECONDARY_ROLES;
  readonly languages = LANGUAGES;
  readonly socialPlatforms = SOCIAL_PLATFORMS;

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

    // Watch nickname changes for availability check
    this.profileForm.get('nickname')?.valueChanges.subscribe(async (nickname) => {
      if (nickname && nickname.length >= 3) {
        await this.checkNicknameAvailability(nickname);
      } else {
        this.nicknameAvailable.set(null);
      }
    });

    // Show/hide custom role text based on primary role
    this.profileForm.get('primary_role')?.valueChanges.subscribe((role) => {
      const customRoleControl = this.profileForm.get('custom_role_text');
      if (role === 'other') {
        customRoleControl?.setValidators([Validators.required]);
      } else {
        customRoleControl?.clearValidators();
        customRoleControl?.setValue('');
      }
      customRoleControl?.updateValueAndValidity();
    });
  }

  ngOnInit() {
    const displayName = sessionStorage.getItem('displayName');
    if (displayName) {
      this.profileForm.patchValue({ nickname: displayName });
      sessionStorage.removeItem('displayName');
    }
    
    this.checkExistingProfile();
  }

  async checkExistingProfile() {
    const profile = await this.profileService.loadProfile(
      this.profileService['supabase'].currentUser?.id || ''
    );
    
    if (profile) {
      this.router.navigate(['/dashboard']);
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
    const currentRoles = this.profileForm.get('secondary_roles')?.value || [];
    const index = currentRoles.indexOf(roleValue);
    
    if (index > -1) {
      currentRoles.splice(index, 1);
    } else {
      currentRoles.push(roleValue);
    }
    
    this.profileForm.patchValue({ secondary_roles: currentRoles });
  }

  isSecondaryRoleSelected(roleValue: string): boolean {
    const roles = this.profileForm.get('secondary_roles')?.value || [];
    return roles.includes(roleValue);
  }

  toggleOptionalFields() {
    this.showOptionalFields.set(!this.showOptionalFields());
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
      
      const profileData: ProfileFormData = {
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
        spotify_artist_url: formValue.spotify ? formValue.spotify : undefined
      };

      await this.profileService.createProfile(profileData);

      this.router.navigate(['/dashboard']);

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
}