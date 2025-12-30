import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { RightsHoldersService, RightsHolder } from '../../services/rights-holder';

// Lucide Icons
import { LucideAngularModule, ArrowLeft, Save, User, Building2, Mail, Phone, Award, Hash, FileText, CheckCircle, AlertCircle } from 'lucide-angular';

@Component({
  selector: 'app-rights-holder-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    LucideAngularModule
  ],
  templateUrl: './rights-holder-form.html',
  styleUrl: './rights-holder-form.scss'
})
export class RightsHolderFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private rightsHoldersService = inject(RightsHoldersService);

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
  readonly CheckCircle = CheckCircle;
  readonly AlertCircle = AlertCircle;

  // Form
  rhForm: FormGroup;
  
  // State
  isEditMode = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  currentRightsHolder = signal<RightsHolder | null>(null);

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
      
      // Common fields
      email: ['', [Validators.email]],
      phone: [''],
      cmo_pro: [''],
      ipi_number: ['', [Validators.pattern(/^\d{9,11}$/)]],
      tax_id: [''],
      notes: ['']
    });

    // Watch type changes to update validators
    this.rhForm.get('type')?.valueChanges.subscribe(type => {
      this.updateValidators(type);
    });
  }

  async ngOnInit() {
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
      // Person: first_name and last_name required
      firstNameControl?.setValidators([Validators.required, Validators.minLength(2)]);
      lastNameControl?.setValidators([Validators.required, Validators.minLength(2)]);
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

  async loadRightsHolder(id: string) {
    this.isLoading.set(true);
    try {
      const rh = await this.rightsHoldersService.getRightsHolder(id);
      if (!rh) {
        this.errorMessage.set('Rights holder not found');
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
        email: rh.email || '',
        phone: rh.phone || '',
        cmo_pro: rh.cmo_pro || '',
        ipi_number: rh.ipi_number || '',
        tax_id: rh.tax_id || '',
        notes: rh.notes || ''
      });

      // Update validators based on type
      this.updateValidators(rh.type);
    } catch (error) {
      console.error('Error loading rights holder:', error);
      this.errorMessage.set('Failed to load rights holder');
    } finally {
      this.isLoading.set(false);
    }
  }

  hasError(fieldName: string, errorType: string): boolean {
    const field = this.rhForm.get(fieldName);
    return field ? field.hasError(errorType) && (field.dirty || field.touched) : false;
  }

  getDisplayName(): string {
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
      this.errorMessage.set('Please fill in all required fields');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const formData = this.rhForm.value;

      if (this.isEditMode()) {
        // Update existing rights holder
        await this.rightsHoldersService.updateRightsHolder(
          this.currentRightsHolder()!.id,
          formData
        );
        this.successMessage.set('Rights holder updated successfully!');
      } else {
        // Create new rights holder
        await this.rightsHoldersService.createRightsHolder(formData);
        this.successMessage.set('Rights holder created successfully!');
      }

      // Navigate back after short delay
      setTimeout(() => {
        this.router.navigate(['/rights-holders']);
      }, 1500);

    } catch (error: any) {
      console.error('Error saving rights holder:', error);
      this.errorMessage.set(error.message || 'Failed to save rights holder');
    } finally {
      this.isLoading.set(false);
    }
  }

  cancel() {
    this.router.navigate(['/rights-holders']);
  }
}