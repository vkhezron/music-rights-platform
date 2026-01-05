import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { WaitlistService, WaitlistStats } from '../services/waitlist.service';
import { PRIMARY_ROLE_GROUPS, PRIMARY_ROLE_OTHER } from '../../models/profile.model';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './landing.html',
  styleUrls: ['./landing.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingComponent implements OnInit {
  @ViewChild('inviteCodeInput') private inviteCodeInput?: ElementRef<HTMLInputElement>;

  private readonly waitlistService = inject(WaitlistService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly waitlistForm = this.formBuilder.nonNullable.group({
    contactMethod: ['instagram' as 'instagram' | 'telegram', Validators.required],
    contactHandle: ['', [Validators.required, Validators.minLength(3)]],
    country: ['', Validators.required],
    city: [''],
    role: ['', Validators.required],
    roleDescription: ['', [Validators.required, Validators.minLength(10)]]
  });

  protected readonly contactOptions = [
    { value: 'instagram' as const, label: 'LANDING.FORM.CONTACT_OPTIONS.INSTAGRAM' },
    { value: 'telegram' as const, label: 'LANDING.FORM.CONTACT_OPTIONS.TELEGRAM' }
  ];

  protected readonly roleGroups = PRIMARY_ROLE_GROUPS;
  protected readonly roleOther = PRIMARY_ROLE_OTHER;

  protected readonly stats = signal<WaitlistStats | null>(null);
  protected readonly statsLoading = signal(true);
  protected readonly statsErrorKey = signal<string | null>(null);

  protected readonly submitting = signal(false);
  protected readonly submitSuccessKey = signal<string | null>(null);
  protected readonly submitErrorKey = signal<string | null>(null);
  protected readonly inviteCodeVisible = signal(false);
  protected readonly inviteCodeControl = this.formBuilder.control<string>('', Validators.required);

  protected readonly hasStats = computed(() => Boolean(this.stats()));

  async ngOnInit(): Promise<void> {
    await this.loadStats();
  }

  protected formatCount(count: number | null | undefined): string {
    if (typeof count !== 'number' || Number.isNaN(count)) {
      return '0';
    }
    return Intl.NumberFormat().format(count);
  }

  protected controlInvalid(
    controlName: 'contactMethod' | 'contactHandle' | 'country' | 'role' | 'roleDescription',
    error: string
  ): boolean {
    const control = this.waitlistForm.get(controlName);
    if (!control) {
      return false;
    }

    return control.touched && control.hasError(error);
  }

  protected async submitWaitlist(): Promise<void> {
    if (this.submitting()) {
      return;
    }

    if (this.waitlistForm.invalid) {
      this.waitlistForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.submitErrorKey.set(null);
    this.submitSuccessKey.set(null);

    const { contactMethod, contactHandle, country, city, role, roleDescription } = this.waitlistForm.getRawValue();

    try {
      await this.waitlistService.joinWaitlist({
        contactMethod,
        contactHandle,
        country,
        city,
        role,
        roleDescription
      });

      this.submitSuccessKey.set('LANDING.MESSAGES.SUCCESS');
      this.waitlistForm.reset({
        contactMethod: 'instagram',
        contactHandle: '',
        country: '',
        city: '',
        role: '',
        roleDescription: ''
      });

      await this.loadStats();
    } catch (error) {
      if (this.waitlistService.isDuplicateError(error)) {
        this.submitErrorKey.set('LANDING.MESSAGES.DUPLICATE');
      } else {
        console.error('Failed to join waitlist', error);
        this.submitErrorKey.set('LANDING.MESSAGES.ERROR');
      }
    } finally {
      this.submitting.set(false);
    }
  }

  private async loadStats(): Promise<void> {
    this.statsLoading.set(true);
    this.statsErrorKey.set(null);

    try {
      const metrics = await this.waitlistService.fetchLandingStats();
      this.stats.set(metrics);
    } catch (error) {
      console.error('Failed to load landing stats', error);
      this.statsErrorKey.set('LANDING.STATS.ERROR');
    } finally {
      this.statsLoading.set(false);
    }
  }

  protected toggleInviteCode(): void {
    const nextVisible = !this.inviteCodeVisible();
    this.inviteCodeVisible.set(nextVisible);

    if (!nextVisible) {
      this.inviteCodeControl.reset('');
      this.inviteCodeControl.markAsPristine();
      this.inviteCodeControl.markAsUntouched();
      return;
    }

    queueMicrotask(() => {
      this.inviteCodeInput?.nativeElement.focus();
    });
  }

  protected goToRegisterWithCode(): void {
    const inviteCode = this.inviteCodeControl.value?.trim();
    if (!inviteCode) {
      this.inviteCodeControl.markAsTouched();
      return;
    }

    this.router.navigate(['/auth/register'], { queryParams: { invite: inviteCode } });
  }
}
