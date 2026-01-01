import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, Validators, ReactiveFormsModule, ValidatorFn } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RightsHoldersService, RightsHolder } from '../../services/rights-holder';
import { FeedbackService } from '../../services/feedback.service';
import { HelpTooltipComponent } from '../../components/help-tooltip/help-tooltip.component';
import { ipiFormatValidator } from '../../validators/ipi.validator';
import { IpiLookupService } from '../../services/ipi-lookup.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

// Lucide Icons
import { LucideAngularModule, ArrowLeft, Save, User, Building2, Mail, Phone, Award, Hash, FileText } from 'lucide-angular';

@Component({
  selector: 'app-rights-holder-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    LucideAngularModule,
    HelpTooltipComponent
  ],
  templateUrl: './rights-holder-form.html',
  styleUrl: './rights-holder-form.scss'
})
export class RightsHolderFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private rightsHoldersService = inject(RightsHoldersService);
  private feedback = inject(FeedbackService);
  private translate = inject(TranslateService);
  private ipiLookup = inject(IpiLookupService);

  // Lucide Icons
  readonly ArrowLeft = ArrowLeft;
  readonly Save = Save;
  readonly User = User;
  readonly Building2 = Building2;
  readonly Mail = Mail;
  readonly Phone = Phone;
  readonly Award = Award;
  readonly Hash = Hash;
  readonly FileText = FileText;

  // Form
  rhForm: FormGroup;
  
  // State
  isEditMode = signal(false);
  isLoading = signal(false);
  currentRightsHolder = signal<RightsHolder | null>(null);
  workId = signal<string | null>(null);
  protected ipiLookupState = signal<IpiLookupUiState>({ status: 'idle', message: '' });
  private ipiRequestCursor = 0;

  // CMO/PRO options (major organizations)
  cmoOptions = [
    { value: '', label: 'Select CMO/PRO...' },
    { value: 'ASCAP', label: 'ASCAP (USA)' },
    { value: 'BMI', label: 'BMI (USA)' },
    { value: 'SESAC', label: 'SESAC (USA)' },
    { value: 'GMR', label: 'GMR (USA)' },
    { value: 'PRS', label: 'PRS for Music (UK)' },
    { value: 'MCPS', label: 'MCPS (UK)' },
    { value: 'GEMA', label: 'GEMA (Germany)' },
    { value: 'SACEM', label: 'SACEM (France)' },
    { value: 'SGAE', label: 'SGAE (Spain)' },
    { value: 'SIAE', label: 'SIAE (Italy)' },
    { value: 'SUISA', label: 'SUISA (Switzerland)' },
    { value: 'SOCAN', label: 'SOCAN (Canada)' },
    { value: 'APRA', label: 'APRA AMCOS (Australia)' },
    { value: 'JASRAC', label: 'JASRAC (Japan)' },
    { value: 'KOMCA', label: 'KOMCA (South Korea)' },
    { value: 'OTHER', label: 'Other' }
  ];

  constructor() {
    this.rhForm = this.fb.group({
      type: ['person', Validators.required],
      
      // Person fields
      first_name: [''],
      last_name: [''],
      
      // Company field
      company_name: [''],

      // Public identity
      nickname: ['', [Validators.required, Validators.pattern(/^@?[a-z0-9._-]{3,20}$/i)]],
      display_name: [''],
      
      // Common fields
      email: ['', [Validators.email]],
      phone: [''],
      cmo_pro: [''],
      ipi_number: ['', [ipiFormatValidator()]],
      tax_id: [''],
      notes: ['']
    });

    this.ipiLookupState.set({
      status: 'idle',
      message: this.translate.instant('RIGHTS_HOLDERS.IPI_HINT_DEFAULT'),
    });

    this.setupIpiWatcher();

    // Watch type changes to update validators
    this.rhForm.get('type')?.valueChanges.subscribe(type => {
      this.updateValidators(type);
    });
  }

  async ngOnInit() {
    // Check if workId is passed from work-form
    this.route.queryParams.subscribe(params => {
      if (params['workId']) {
        this.workId.set(params['workId']);
      }
    });

    // Check if edit mode
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      await this.loadRightsHolder(id);
    } else {
      // Set initial validators for person
      this.updateValidators('person');
    }
  }

  updateValidators(type: string) {
    const firstNameControl = this.rhForm.get('first_name');
    const lastNameControl = this.rhForm.get('last_name');
    const companyNameControl = this.rhForm.get('company_name');

    if (type === 'person') {
      // Person: legal names optional but enforce minimum length when provided
      firstNameControl?.setValidators([this.optionalMinLength(2)]);
      lastNameControl?.setValidators([this.optionalMinLength(2)]);
      companyNameControl?.clearValidators();
    } else {
      // Company: company_name required
      companyNameControl?.setValidators([Validators.required, Validators.minLength(2)]);
      firstNameControl?.clearValidators();
      lastNameControl?.clearValidators();
    }

    firstNameControl?.updateValueAndValidity();
    lastNameControl?.updateValueAndValidity();
    companyNameControl?.updateValueAndValidity();
  }

  private setupIpiWatcher(): void {
    const control = this.rhForm.get('ipi_number');
    if (!control) {
      return;
    }

    control.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(value => {
        void this.handleIpiValueChange(typeof value === 'string' ? value : '');
      });
  }

  private setIpiState(status: IpiLookupUiState['status'], messageKey: string, params?: Record<string, unknown>): void {
    this.ipiLookupState.set({
      status,
      message: this.translate.instant(messageKey, params),
    });
  }

  private async handleIpiValueChange(value: string): Promise<void> {
    const trimmed = value.trim();

    if (!trimmed) {
      this.setIpiState('idle', 'RIGHTS_HOLDERS.IPI_HINT_DEFAULT');
      return;
    }

    if (!this.ipiLookup.validateFormat(trimmed)) {
      this.setIpiState('invalid', 'RIGHTS_HOLDERS.IPI_HINT_FORMAT');
      return;
    }

    const cursor = ++this.ipiRequestCursor;
    this.setIpiState('loading', 'RIGHTS_HOLDERS.IPI_HINT_LOOKING');

    try {
      const result = await this.ipiLookup.lookup(trimmed);
      if (this.ipiRequestCursor !== cursor) {
        return;
      }

      if (result) {
        this.setIpiState('resolved', 'RIGHTS_HOLDERS.IPI_HINT_FOUND', {
          name: result.name ?? this.translate.instant('RIGHTS_HOLDERS.IPI_HINT_UNKNOWN_NAME'),
          society: result.society ?? 'PRO',
        });

        const displayNameControl = this.rhForm.get('display_name');
        if (result.name && displayNameControl && !displayNameControl.value) {
          displayNameControl.patchValue(result.name, { emitEvent: false });
        }
      } else {
        this.setIpiState('not_found', 'RIGHTS_HOLDERS.IPI_HINT_FALLBACK');
      }
    } catch (error) {
      console.error('IPI lookup failed', error);
      if (this.ipiRequestCursor === cursor) {
        this.setIpiState('not_found', 'RIGHTS_HOLDERS.IPI_HINT_FALLBACK');
      }
    }
  }

  async loadRightsHolder(id: string) {
    this.isLoading.set(true);
    try {
      const rh = await this.rightsHoldersService.getRightsHolder(id);
      if (!rh) {
        this.feedback.error('We could not find that rights holder.');
        this.router.navigate(['/rights-holders']);
        return;
      }

      this.currentRightsHolder.set(rh);
      
      // Populate form
      this.rhForm.patchValue({
        type: rh.type,
        first_name: rh.first_name || '',
        last_name: rh.last_name || '',
        company_name: rh.company_name || '',
        nickname: rh.nickname ? this.ensureNicknamePrefix(rh.nickname) : '',
        display_name: rh.display_name || '',
        email: rh.email || '',
        phone: rh.phone || '',
        cmo_pro: rh.cmo_pro || '',
        ipi_number: rh.ipi_number || '',
        tax_id: rh.tax_id || '',
        notes: rh.notes || ''
      });

      // Update validators based on type
      this.updateValidators(rh.type);

      void this.handleIpiValueChange(rh.ipi_number || '');
    } catch (error) {
      console.error('Error loading rights holder:', error);
      this.feedback.handleError(error, 'Failed to load rights holder.');
    } finally {
      this.isLoading.set(false);
    }
  }

  hasError(fieldName: string, errorType: string): boolean {
    const field = this.rhForm.get(fieldName);
    return field ? field.hasError(errorType) && (field.dirty || field.touched) : false;
  }

  getDisplayName(): string {
    const nickname = this.rhForm.get('nickname')?.value;
    if (nickname) {
      return this.ensureNicknamePrefix(nickname);
    }

    const displayName = this.rhForm.get('display_name')?.value;
    if (displayName) {
      return displayName;
    }

    if (this.rhForm.get('type')?.value === 'person') {
      const firstName = this.rhForm.get('first_name')?.value || '';
      const lastName = this.rhForm.get('last_name')?.value || '';
      return `${firstName} ${lastName}`.trim() || 'New Person';
    }

    return this.rhForm.get('company_name')?.value || 'New Company';
  }

  async onSubmit() {
    if (this.rhForm.invalid) {
      this.rhForm.markAllAsTouched();
      this.feedback.error('Please fix the highlighted fields before saving.');
      return;
    }

    this.isLoading.set(true);

    try {
      const formValue = this.rhForm.value;
      const normalizedIpi = this.ipiLookup.normalize(formValue.ipi_number);
      const formData = {
        ...formValue,
        nickname: this.normalizeNickname(formValue.nickname),
        display_name: formValue.display_name?.trim() || undefined,
        ipi_number: normalizedIpi || undefined,
      };

      if (this.isEditMode()) {
        // Update existing rights holder
        await this.rightsHoldersService.updateRightsHolder(
          this.currentRightsHolder()!.id,
          formData
        );
        this.feedback.success('Rights holder updated successfully.');
        // Navigate back after short delay
        setTimeout(() => {
          this.router.navigate(['/rights-holders']);
        }, 1500);
      } else {
        // Create new rights holder
        await this.rightsHoldersService.createRightsHolder(formData);
        this.feedback.success('Rights holder created successfully.');

        // If workId is provided, navigate to split editor; otherwise go to rights-holders list
        setTimeout(() => {
          if (this.workId()) {
            this.router.navigate([`/works/${this.workId()}/splits`]);
          } else {
            this.router.navigate(['/rights-holders']);
          }
        }, 1500);
      }

    } catch (error: any) {
      console.error('Error saving rights holder:', error);
      this.feedback.handleError(error, 'We could not save this rights holder. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  cancel() {
    this.router.navigate(['/rights-holders']);
  }

  private optionalMinLength(min: number): ValidatorFn {
    return (control: AbstractControl) => {
      const value = control.value;
      if (value === null || value === undefined) return null;
      const trimmed = `${value}`.trim();
      if (!trimmed) return null;
      return trimmed.length >= min
        ? null
        : { minlength: { requiredLength: min, actualLength: trimmed.length } };
    };
  }

  private ensureNicknamePrefix(value: string): string {
    if (!value) return value;
    return value.startsWith('@') ? value : `@${value}`;
  }

  private normalizeNickname(value?: string | null): string | undefined {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const withoutAt = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
    return withoutAt || undefined;
  }
}

interface IpiLookupUiState {
  status: 'idle' | 'invalid' | 'loading' | 'resolved' | 'not_found';
  message: string;
}