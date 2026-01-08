import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { WorksService } from '../../services/works';
import { FeedbackService } from '../../services/feedback.service';
import { WorkFormData, WorkChangeRecord, WorkType, WorkOriginalReference, WorkLanguageSelection } from '../../models/work.model';
import {
  WorkCreationDeclaration,
  WorkCreationDeclarationDraft,
  WorkCreationDeclarationMap,
  WorkCreationSection,
  createDefaultWorkCreationDeclarationMap,
} from '../../models/work-creation-declaration.model';
import { AIDisclosureFormComponent } from '../../components/ai-disclosure-form/ai-disclosure-form.component';
import { WORK_LANGUAGE_OPTIONS, WorkLanguageOption } from './work-languages';

// Lucide Icons
import {
  LucideAngularModule,
  ArrowLeft,
  Save,
  Plus,
  X,
  Music,
  Clock,
  Calendar,
  Globe,
  Tag,
  Edit,
  CheckCircle,
  History,
  AlertTriangle,
  Repeat
} from 'lucide-angular';

interface ReviewDisclosureMeta {
  key: WorkCreationSection;
  labelKey: string;
}

interface SummaryDescriptor {
  key: string;
  params?: Record<string, unknown>;
}

type LanguageKind = 'primary' | 'secondary';

interface LanguageFormValue {
  value: string;
  isCustom: boolean;
  customValue: string;
}

@Component({
  selector: 'app-work-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    LucideAngularModule,
    AIDisclosureFormComponent
  ],
  templateUrl: './work-form.html',
  styleUrl: './work-form.scss'
})
export class WorkFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private worksService = inject(WorksService);
  private feedback = inject(FeedbackService);
  private translate = inject(TranslateService);

  // Lucide Icons
  readonly ArrowLeft = ArrowLeft;
  readonly Save = Save;
  readonly Plus = Plus;
  readonly X = X;
  readonly Music = Music;
  readonly Clock = Clock;
  readonly Calendar = Calendar;
  readonly Globe = Globe;
  readonly Tag = Tag;
  readonly Edit = Edit;
  readonly CheckCircle = CheckCircle;
  readonly History = History;
  readonly AlertTriangle = AlertTriangle;
  readonly Repeat = Repeat;

  protected readonly workTypeOptions: { value: WorkType; labelKey: string; descriptionKey: string }[] = [
    { value: 'standard', labelKey: 'WORKS.WORK_TYPE_STANDARD', descriptionKey: 'WORKS.WORK_TYPE_STANDARD_DESC' },
    { value: 'instrumental', labelKey: 'WORKS.WORK_TYPE_INSTRUMENTAL', descriptionKey: 'WORKS.WORK_TYPE_INSTRUMENTAL_DESC' },
    { value: 'remix', labelKey: 'WORKS.WORK_TYPE_REMIX', descriptionKey: 'WORKS.WORK_TYPE_REMIX_DESC' }
  ];

  private readonly isrcPattern = /^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$/;
  private readonly iswcPattern = /^T-\d{3}\.\d{3}\.\d{3}-\d$/;

  workForm!: FormGroup;
  isLoading = signal(false);
  isEditMode = signal(false);
  workId = signal<string | null>(null);
  aiDisclosures = signal<WorkCreationDeclarationMap>(createDefaultWorkCreationDeclarationMap());
  aiDisclosuresValid = signal(true);
  protected pendingWorkData = signal<WorkFormData | null>(null);
  protected showReview = signal(false);
  protected isSubmitting = signal(false);
  protected submissionSuccess = signal(false);
  protected submittedWorkId = signal<string | null>(null);
  protected submittedWorkTitle = signal<string>('');
  protected isCreateSubmission = signal(true);
  protected durationMode = signal<'hms' | 'seconds'>('hms');
  protected showChangeHistory = signal(false);
  protected changeHistoryLoading = signal(false);
  protected changeHistory = signal<WorkChangeRecord[]>([]);
  protected changeHistoryError = signal<string | null>(null);

  protected readonly disclosureSections: ReviewDisclosureMeta[] = [
    { key: 'ip', labelKey: 'AI_DISCLOSURE_FORM.SECTIONS.IP' },
    { key: 'mixing', labelKey: 'AI_DISCLOSURE_FORM.SECTIONS.MIXING' },
    { key: 'mastering', labelKey: 'AI_DISCLOSURE_FORM.SECTIONS.MASTERING' },
    { key: 'session_musicians', labelKey: 'AI_DISCLOSURE_FORM.SECTIONS.SESSION_MUSICIANS' },
    { key: 'visuals', labelKey: 'AI_DISCLOSURE_FORM.SECTIONS.VISUALS' }
  ];

  // Options
  statusOptions = ['draft', 'registered', 'published', 'archived'];
  protected readonly languageOptions = WORK_LANGUAGE_OPTIONS;
  protected readonly maxPrimaryLanguages = 3;
  genreOptions = [
    'Pop', 'Rock', 'Hip Hop', 'R&B', 'Country', 'Jazz', 
    'Classical', 'Electronic', 'Folk', 'Blues', 'Reggae',
    'Metal', 'Punk', 'Soul', 'Funk', 'Latin', 'World', 'Other'
  ];

  readonly languageOptionLabel = (option: WorkLanguageOption): string => {
    if (option.iso6391 && option.iso6391.trim().length > 0) {
      return `${option.language} (${option.iso6391})`;
    }
    return `${option.language} (${option.iso6393})`;
  };

  ngOnInit() {
    this.initializeForm();
    
    // Check if edit mode
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.workId.set(id);
      this.loadWork(id);
    }
  }

  initializeForm() {
    this.workForm = this.fb.group({
      work_type: ['standard', [Validators.required]],
      is_100_percent_human: [false],
      uses_sample_libraries: [false],
      sample_library_names: [''],
      has_commercial_license: [false],
      original_works: this.fb.array([]),
      work_title: ['', [Validators.required, Validators.minLength(1)]],
      release_title: [''],
      alternative_titles: this.fb.array([]),
      isrc: ['', [Validators.pattern(/^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$/)]],
      iswc: ['', [Validators.pattern(/^T-\d{3}\.\d{3}\.\d{3}-\d$/)]],
      duration_seconds: [null, [Validators.min(0)]],
      recording_date: [''],
      release_date: [''],
      primary_languages: this.fb.array([]),
      secondary_languages: this.fb.array([]),
      genre: [''],
      is_cover_version: [false],
      original_work_title: [''],
      original_work_isrc: [''],
      original_work_iswc: [''],
      original_work_info: [''],
      status: ['draft', Validators.required],
      notes: ['']
    });

    this.workForm.get('work_type')?.valueChanges.subscribe(type => {
      this.configureForWorkType((type as WorkType) ?? 'standard');
    });

    this.workForm.get('uses_sample_libraries')?.valueChanges.subscribe(() => {
      this.updateSampleDisclosureValidators();
    });

    // Watch is_cover_version changes
    this.workForm.get('is_cover_version')?.valueChanges.subscribe(isCover => {
      const originalTitleControl = this.workForm.get('original_work_title');
      if (isCover) {
        originalTitleControl?.setValidators([Validators.required]);
      } else {
        originalTitleControl?.clearValidators();
        originalTitleControl?.setValue('');
        this.workForm.get('original_work_isrc')?.setValue('');
        this.workForm.get('original_work_iswc')?.setValue('');
        this.workForm.get('original_work_info')?.setValue('');
      }
      originalTitleControl?.updateValueAndValidity();
    });

    if (!this.primaryLanguages.length) {
      this.addPrimaryLanguage();
    }

    this.configureForWorkType(this.getWorkType());
    this.updateSampleDisclosureValidators();
  }

  get alternativeTitles(): FormArray {
    return this.workForm.get('alternative_titles') as FormArray;
  }

  get originalWorks(): FormArray {
    return this.workForm.get('original_works') as FormArray;
  }

  get primaryLanguages(): FormArray {
    return this.workForm.get('primary_languages') as FormArray;
  }

  get secondaryLanguages(): FormArray {
    return this.workForm.get('secondary_languages') as FormArray;
  }

  private createOriginalWorkGroup(initial?: Partial<WorkOriginalReference>) {
    return this.fb.group({
      title: [initial?.title ?? '', [Validators.required]],
      isrc: [initial?.isrc ?? '', [Validators.pattern(this.isrcPattern)]],
      iswc: [initial?.iswc ?? '', [Validators.pattern(this.iswcPattern)]],
      additional_info: [initial?.additional_info ?? '']
    });
  }

  addAlternativeTitle() {
    this.alternativeTitles.push(this.fb.control('', Validators.required));
  }

  removeAlternativeTitle(index: number) {
    this.alternativeTitles.removeAt(index);
  }

  addOriginalWork(initial?: Partial<WorkOriginalReference>) {
    this.originalWorks.push(this.createOriginalWorkGroup(initial));
  }

  removeOriginalWork(index: number) {
    if (this.originalWorks.length <= 1) {
      this.originalWorks.at(0).markAllAsTouched();
      return;
    }
    this.originalWorks.removeAt(index);
  }

  addPrimaryLanguage(selection?: WorkLanguageSelection | string): void {
    if (this.primaryLanguages.length >= this.maxPrimaryLanguages) {
      return;
    }
    this.primaryLanguages.push(this.createLanguageFormGroup(selection ?? null));
  }

  removePrimaryLanguage(index: number): void {
    if (index < 0 || index >= this.primaryLanguages.length) {
      return;
    }

    if (this.primaryLanguages.length === 1) {
      const group = this.primaryLanguages.at(0) as FormGroup;
      group.patchValue({ value: '', customValue: '', isCustom: false });
      return;
    }

    this.primaryLanguages.removeAt(index);
  }

  addSecondaryLanguage(selection?: WorkLanguageSelection | string): void {
    this.secondaryLanguages.push(this.createLanguageFormGroup(selection ?? null));
  }

  removeSecondaryLanguage(index: number): void {
    if (index < 0 || index >= this.secondaryLanguages.length) {
      return;
    }
    this.secondaryLanguages.removeAt(index);
  }

  onPrimaryLanguageSelected(index: number, value: string): void {
    this.applyLanguageSelection('primary', index, value);
  }

  onSecondaryLanguageSelected(index: number, value: string): void {
    this.applyLanguageSelection('secondary', index, value);
  }

  onLanguageCustomToggle(kind: LanguageKind, index: number): void {
    const group = this.getLanguageArray(kind).at(index) as FormGroup | null;
    if (!group) {
      return;
    }

    const isCustom = group.get('isCustom')?.value === true;
    if (isCustom) {
      const currentValue = this.normalizeLanguageInput(group.get('value')?.value);
      group.patchValue({ value: '', customValue: currentValue }, { emitEvent: false });
    } else {
      const customValue = this.normalizeLanguageInput(group.get('customValue')?.value);
      const option = this.findLanguageOption(customValue);
      group.patchValue({
        value: option ? option.language : '',
        customValue: option ? '' : customValue,
      }, { emitEvent: false });
    }
  }

  private applyLanguageSelection(kind: LanguageKind, index: number, value: string): void {
    const array = this.getLanguageArray(kind);
    const group = array.at(index) as FormGroup | null;
    if (!group) {
      return;
    }

    const normalizedInput = this.normalizeLanguageInput(value);
    const option = this.findLanguageOption(normalizedInput);
    const isCustom = group.get('isCustom')?.value === true;

    if (isCustom) {
      group.patchValue({ customValue: normalizedInput }, { emitEvent: false });
      return;
    }

    if (option) {
      group.patchValue({ value: option.language }, { emitEvent: false });
    } else {
      group.patchValue({ value: normalizedInput }, { emitEvent: false });
    }
  }

  private getLanguageArray(kind: LanguageKind): FormArray {
    return kind === 'primary' ? this.primaryLanguages : this.secondaryLanguages;
  }

  private createLanguageFormGroup(selection?: WorkLanguageSelection | string | null): FormGroup {
    const initial = this.toLanguageFormValue(selection);
    return this.fb.group({
      value: [initial.value],
      isCustom: [initial.isCustom],
      customValue: [initial.customValue],
    });
  }

  private toLanguageFormValue(source?: WorkLanguageSelection | string | null): LanguageFormValue {
    if (!source) {
      return { value: '', isCustom: false, customValue: '' };
    }

    if (typeof source === 'string') {
      const normalized = this.normalizeLanguageInput(source);
      const option = this.findLanguageOption(normalized);
      if (option) {
        return { value: option.language, isCustom: false, customValue: '' };
      }
      return { value: '', isCustom: true, customValue: normalized };
    }

    const normalizedLanguage = this.normalizeLanguageInput(source.language);
    const option = this.findLanguageOption(normalizedLanguage);

    if (source.is_custom || !option) {
      return { value: '', isCustom: true, customValue: normalizedLanguage };
    }

    return { value: option.language, isCustom: false, customValue: '' };
  }

  private findLanguageOption(input: string): WorkLanguageOption | undefined {
    const lookup = input.trim().toLowerCase();
    if (!lookup) {
      return undefined;
    }

    return this.languageOptions.find(option => {
      if (option.language.toLowerCase() === lookup) {
        return true;
      }
      if (option.iso6391 && option.iso6391.toLowerCase() === lookup) {
        return true;
      }
      return option.iso6393.toLowerCase() === lookup;
    });
  }

  private normalizeLanguageInput(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private collectLanguageSelections(kind: LanguageKind): WorkLanguageSelection[] {
    const selections: WorkLanguageSelection[] = [];
    const seen = new Set<string>();
    const array = this.getLanguageArray(kind);

    array.controls.forEach(control => {
      const group = control as FormGroup;
      const isCustom = group.get('isCustom')?.value === true;
      const rawValue = this.normalizeLanguageInput(
        isCustom ? group.get('customValue')?.value : group.get('value')?.value
      );

      if (!rawValue) {
        return;
      }

      const key = rawValue.toLowerCase();
      if (seen.has(key)) {
        return;
      }
      seen.add(key);

      if (isCustom) {
        selections.push({ language: rawValue, iso_639_1: null, iso_639_3: null, is_custom: true });
        return;
      }

      const option = this.findLanguageOption(rawValue);
      if (option) {
        selections.push({
          language: option.language,
          iso_639_1: option.iso6391 ?? null,
          iso_639_3: option.iso6393 ?? null,
          is_custom: false,
        });
      } else {
        selections.push({ language: rawValue, iso_639_1: null, iso_639_3: null, is_custom: true });
      }
    });

    if (kind === 'primary' && selections.length > this.maxPrimaryLanguages) {
      return selections.slice(0, this.maxPrimaryLanguages);
    }

    return selections;
  }

  private setLanguageSelections(
    primary?: WorkLanguageSelection[] | null,
    secondary?: WorkLanguageSelection[] | null,
    legacy?: string[] | null | undefined
  ): void {
    this.resetLanguageArray('primary');
    this.resetLanguageArray('secondary');

    const fallback = Array.isArray(legacy) ? legacy.filter(Boolean) : [];

    if (primary?.length) {
      primary.slice(0, this.maxPrimaryLanguages).forEach(selection => this.addPrimaryLanguage(selection));
    }

    if ((!primary || primary.length === 0) && fallback.length) {
      this.addPrimaryLanguage(fallback[0]);
    }

    if (!this.primaryLanguages.length) {
      this.addPrimaryLanguage();
    }

    if (secondary?.length) {
      secondary.forEach(selection => this.addSecondaryLanguage(selection));
    } else if (fallback.length > 1) {
      fallback.slice(1).forEach(language => this.addSecondaryLanguage(language));
    }
  }

  private resetLanguageArray(kind: LanguageKind): void {
    const array = this.getLanguageArray(kind);
    while (array.length > 0) {
      array.removeAt(0);
    }
  }

  protected shouldShowCoverVersionControls(): boolean {
    return this.getWorkType() === 'standard';
  }

  protected isRemix(): boolean {
    return this.getWorkType() === 'remix';
  }

  protected isInstrumental(): boolean {
    return this.getWorkType() === 'instrumental';
  }

  private getWorkType(): WorkType {
    return (this.workForm.get('work_type')?.value as WorkType) ?? 'standard';
  }

  private configureForWorkType(type: WorkType, seedOriginals?: WorkOriginalReference[] | null): void {
    this.setCoverVersionAvailability(type);

    if (type === 'remix') {
      if (seedOriginals?.length) {
        this.replaceOriginalWorks(seedOriginals);
      } else if (!this.originalWorks.length) {
        this.addOriginalWork();
      }
    } else {
      this.clearOriginalWorks();
    }

    if (type !== 'standard') {
      this.resetCoverFields();
    }

    this.updateSampleDisclosureValidators();
  }

  private replaceOriginalWorks(originals: WorkOriginalReference[]): void {
    this.clearOriginalWorks();
    originals.forEach(original => {
      this.addOriginalWork({
        title: original.title,
        isrc: original.isrc ?? undefined,
        iswc: original.iswc ?? undefined,
        additional_info: original.additional_info ?? undefined
      });
    });

    if (!this.originalWorks.length) {
      this.addOriginalWork();
    }
  }

  private clearOriginalWorks(): void {
    while (this.originalWorks.length) {
      this.originalWorks.removeAt(0);
    }
  }

  private setCoverVersionAvailability(type: WorkType): void {
    const coverControl = this.workForm.get('is_cover_version');
    if (!coverControl) {
      return;
    }

    if (type === 'standard') {
      coverControl.enable({ emitEvent: false });
    } else {
      coverControl.disable({ emitEvent: false });
      if (coverControl.value) {
        coverControl.setValue(false, { emitEvent: false });
      }
    }
  }

  private resetCoverFields(): void {
    const originalTitleControl = this.workForm.get('original_work_title');
    originalTitleControl?.setValue('', { emitEvent: false });
    originalTitleControl?.clearValidators();
    originalTitleControl?.updateValueAndValidity({ emitEvent: false });

    this.workForm.get('original_work_isrc')?.setValue('', { emitEvent: false });
    this.workForm.get('original_work_iswc')?.setValue('', { emitEvent: false });
    this.workForm.get('original_work_info')?.setValue('', { emitEvent: false });
  }

  private updateSampleDisclosureValidators(): void {
    const usesSamples = Boolean(this.workForm.get('uses_sample_libraries')?.value);
    const namesControl = this.workForm.get('sample_library_names');
    const licenseControl = this.workForm.get('has_commercial_license');

    if (usesSamples) {
      namesControl?.setValidators([Validators.required]);
      licenseControl?.setValidators([Validators.requiredTrue]);
    } else {
      namesControl?.clearValidators();
      licenseControl?.clearValidators();
      licenseControl?.setValue(false, { emitEvent: false });
    }

    namesControl?.updateValueAndValidity({ emitEvent: false });
    licenseControl?.updateValueAndValidity({ emitEvent: false });
  }

  onAIDisclosuresChanged(map: WorkCreationDeclarationMap): void {
    this.aiDisclosures.set(structuredClone(map));
    this.aiDisclosuresValid.set(this.isDisclosureMapValid(this.aiDisclosures()));
  }

  onAIDisclosuresValidityChange(valid: boolean): void {
    this.aiDisclosuresValid.set(valid);
  }

  async loadWork(id: string) {
    this.isLoading.set(true);
    try {
      const work = await this.worksService.getWork(id);
      if (!work) {
        this.feedback.error('We could not find that work.');
        this.router.navigate(['/works']);
        return;
      }

      // Populate form
      this.workForm.patchValue({
        work_type: work.work_type ?? 'standard',
        is_100_percent_human: work.is_100_percent_human ?? false,
        uses_sample_libraries: work.uses_sample_libraries ?? false,
        sample_library_names: work.sample_library_names ?? '',
        has_commercial_license: work.has_commercial_license ?? false,
        work_title: work.work_title,
        release_title: work.release_title || '',
        isrc: work.isrc,
        iswc: work.iswc,
        duration_seconds: work.duration_seconds,
        recording_date: work.recording_date,
        release_date: work.release_date,
        genre: work.genre,
        is_cover_version: work.is_cover_version,
        original_work_title: work.original_work_title,
        original_work_isrc: work.original_work_isrc,
        original_work_iswc: work.original_work_iswc,
        original_work_info: work.original_work_info,
        status: work.status,
        notes: work.notes
      }, { emitEvent: false });

      this.aiDisclosures.set(this.toDisclosureMap(work.ai_disclosures));
      this.aiDisclosuresValid.set(this.isDisclosureMapValid(this.aiDisclosures()));

      // Add alternative titles
      if (work.alternative_titles) {
        work.alternative_titles.forEach(title => {
          this.alternativeTitles.push(this.fb.control(title, Validators.required));
        });
      }

      this.configureForWorkType(work.work_type ?? 'standard', work.original_works ?? null);
      this.setLanguageSelections(
        work.primary_languages ?? null,
        work.secondary_languages ?? null,
        work.languages ?? []
      );
      this.updateSampleDisclosureValidators();
    } catch (error) {
      console.error('Error loading work:', error);
      this.feedback.handleError(error, 'Failed to load this work.');
    } finally {
      this.isLoading.set(false);
    }
  }

  convertDurationToSeconds(hours: number, minutes: number, seconds: number): number {
    return (hours * 3600) + (minutes * 60) + seconds;
  }

  getDurationHours(): number {
    const totalSeconds = this.getTotalDurationSeconds();
    return Math.floor(totalSeconds / 3600);
  }

  getDurationMinutes(): number {
    const totalSeconds = this.getTotalDurationSeconds();
    return Math.floor((totalSeconds % 3600) / 60);
  }

  getDurationSeconds(): number {
    const totalSeconds = this.getTotalDurationSeconds();
    return totalSeconds % 60;
  }

  getTotalDurationSeconds(): number {
    return this.workForm.get('duration_seconds')?.value || 0;
  }

  onDurationModeChange(mode: 'hms' | 'seconds') {
    this.durationMode.set(mode);
  }

  onDurationHMSChange(part: 'hours' | 'minutes' | 'seconds', value: string | number) {
    const hours = part === 'hours'
      ? this.sanitizeDurationPart(value)
      : this.getDurationHours();
    const minutes = part === 'minutes'
      ? this.sanitizeDurationPart(value, 59)
      : this.getDurationMinutes();
    const seconds = part === 'seconds'
      ? this.sanitizeDurationPart(value, 59)
      : this.getDurationSeconds();

    this.updateDurationFromParts(hours, minutes, seconds);
  }

  onDurationSecondsOnlyChange(value: string | number) {
    const sanitized = this.sanitizeDurationPart(value);
    this.workForm.patchValue({ duration_seconds: sanitized });
  }

  private updateDurationFromParts(hours: number, minutes: number, seconds: number) {
    const totalSeconds = this.convertDurationToSeconds(hours, minutes, seconds);
    this.workForm.patchValue({ duration_seconds: totalSeconds });
  }

  private sanitizeDurationPart(value: string | number, max?: number): number {
    let parsed = parseInt(String(value), 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      parsed = 0;
    }

    if (max !== undefined && parsed > max) {
      parsed = max;
    }

    return parsed;
  }

  onSubmit() {
    if (this.workForm.invalid) {
      this.workForm.markAllAsTouched();
      this.feedback.error('Please fix the highlighted fields before saving.');
      return;
    }

    if (!this.aiDisclosuresValid()) {
      this.feedback.warning('Complete the AI disclosure section before saving.');
      return;
    }

    const workData = this.buildWorkFormData();
    this.pendingWorkData.set(workData);
    this.showReview.set(true);
  }

  editRightsHolders() {
    if (this.workId()) {
      this.router.navigate([`/works/${this.workId()}/splits`]);
    }
  }

  closeReview(): void {
    if (this.isSubmitting()) {
      return;
    }
    this.showReview.set(false);
  }

  downloadPendingWorkData(): void {
    const workData = this.pendingWorkData();
    if (!workData) {
      return;
    }

    const payload = {
      exported_at: new Date().toISOString(),
      work: structuredClone(workData),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${this.slugify(workData.work_title || 'work')}-data.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async confirmSubmission(): Promise<void> {
    const workData = this.pendingWorkData();
    if (!workData) {
      return;
    }

    this.isSubmitting.set(true);

    try {
      if (this.isEditMode() && this.workId()) {
        await this.worksService.updateWork(this.workId()!, workData);
        this.feedback.success(this.translate.instant('WORKS.ALERTS.UPDATE_SUCCESS'));
        this.handleSubmissionSuccess(this.workId()!, workData.work_title, false);
      } else {
        const newWork = await this.worksService.createWork(workData);
        const createdId = newWork?.id;

        if (!createdId) {
          throw new Error('WORKS.ALERTS.MISSING_WORK_ID');
        }

        this.feedback.success(this.translate.instant('WORKS.ALERTS.CREATE_SUCCESS'));
        this.handleSubmissionSuccess(createdId, workData.work_title, true);
      }
    } catch (error) {
      console.error('Error saving work:', error);
      const message = this.translate.instant('WORKS.ALERTS.SUBMIT_FAILED');
      this.feedback.handleError(error, message);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  handlePrimarySuccessAction(): void {
    const workId = this.submittedWorkId();

    if (this.isCreateSubmission()) {
      if (workId) {
        this.closeSuccessOverlay();
        this.router.navigate([`/works/${workId}/splits`]);
      }
      return;
    }

    this.closeSuccessOverlay();
    this.router.navigate(['/works']);
  }

  handleSecondarySuccessAction(): void {
    const workId = this.submittedWorkId();

    if (this.isCreateSubmission()) {
      this.resetForNewWork();
      return;
    }

    if (workId) {
      this.closeSuccessOverlay();
      this.router.navigate([`/works/${workId}/splits`]);
    }
  }

  goToDashboard(): void {
    this.closeSuccessOverlay();
    this.router.navigate(['/dashboard']);
  }

  cancel() {
    this.router.navigate(['/works']);
  }

  hasError(fieldName: string, errorType: string): boolean {
    const field = this.workForm.get(fieldName);
    return field ? field.hasError(errorType) && (field.dirty || field.touched) : false;
  }

  private toDisclosureArray(): WorkCreationDeclarationDraft[] {
    const map = this.aiDisclosures();
    const entries = Object.values(map) as WorkCreationDeclarationDraft[];
    return entries.map(entry => ({
      section: entry.section,
      creation_type: entry.creation_type,
      ai_tool: entry.ai_tool ?? null,
      notes: entry.notes ?? null,
    }));
  }

  private toDisclosureMap(
    declarations?: WorkCreationDeclaration[] | null
  ): WorkCreationDeclarationMap {
    const map = createDefaultWorkCreationDeclarationMap();
    if (!declarations?.length) {
      return map;
    }

    for (const declaration of declarations) {
      map[declaration.section] = {
        section: declaration.section,
        creation_type: declaration.creation_type,
        ai_tool: declaration.ai_tool ?? null,
        notes: declaration.notes ?? null,
      };
    }

    return map;
  }

  private isDisclosureMapValid(map: WorkCreationDeclarationMap): boolean {
    const entries = Object.values(map) as WorkCreationDeclarationDraft[];
    return entries.every(entry => {
      if (entry.creation_type === 'human') {
        return true;
      }
      return Boolean(entry.ai_tool && entry.ai_tool.trim());
    });
  }

  protected describeDisclosure(disclosure: WorkCreationDeclarationDraft): SummaryDescriptor {
    const tool = disclosure.ai_tool?.trim();

    switch (disclosure.creation_type) {
      case 'human':
        return { key: 'AI_DISCLOSURE_FORM.SUMMARY.HUMAN' };
      case 'ai_assisted':
        return tool
          ? { key: 'AI_DISCLOSURE_FORM.SUMMARY.AI_ASSISTED_WITH_TOOL', params: { tool } }
          : { key: 'AI_DISCLOSURE_FORM.SUMMARY.AI_ASSISTED' };
      case 'ai_generated':
        return tool
          ? { key: 'AI_DISCLOSURE_FORM.SUMMARY.AI_GENERATED_WITH_TOOL', params: { tool } }
          : { key: 'AI_DISCLOSURE_FORM.SUMMARY.AI_GENERATED' };
      default:
        return { key: 'AI_DISCLOSURE_FORM.SUMMARY.UNKNOWN' };
    }
  }

  protected formatLanguages(
    primary?: WorkLanguageSelection[] | null,
    secondary?: WorkLanguageSelection[] | null,
    fallback?: string[] | null
  ): string | null {
    const primaryNames = this.toUniqueLanguageNames((primary ?? []).map(item => item.language));
    const secondaryNames = this.toUniqueLanguageNames((secondary ?? []).map(item => item.language));

    if (!primaryNames.length && !secondaryNames.length) {
      const fallbackNames = this.toUniqueLanguageNames(fallback ?? []);
      return fallbackNames.length ? fallbackNames.join(', ') : null;
    }

    if (!secondaryNames.length) {
      return primaryNames.join(', ');
    }

    if (!primaryNames.length) {
      return secondaryNames.join(', ');
    }

    const primaryLabel = this.translate.instant('WORKS.LANGUAGES_PRIMARY_PREFIX');
    const secondaryLabel = this.translate.instant('WORKS.LANGUAGES_SECONDARY_PREFIX');
    return `${primaryLabel} ${primaryNames.join(', ')}; ${secondaryLabel} ${secondaryNames.join(', ')}`;
  }

  private toUniqueLanguageNames(values: (string | null | undefined)[]): string[] {
    const unique: string[] = [];
    const seen = new Set<string>();

    values.forEach(value => {
      if (!value) {
        return;
      }
      const trimmed = value.trim();
      if (!trimmed) {
        return;
      }
      const key = trimmed.toLowerCase();
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      unique.push(trimmed);
    });

    return unique;
  }

  protected formatDuration(seconds?: number): string | null {
    if (!seconds && seconds !== 0) {
      return null;
    }

    const safeSeconds = Math.max(0, seconds ?? 0);
    const hrs = Math.floor(safeSeconds / 3600);
    const mins = Math.floor((safeSeconds % 3600) / 60);
    const secs = safeSeconds % 60;
    const paddedMins = hrs > 0 ? mins.toString().padStart(2, '0') : mins.toString();
    const paddedSecs = secs.toString().padStart(2, '0');
    return hrs > 0 ? `${hrs}:${paddedMins}:${paddedSecs}` : `${paddedMins}:${paddedSecs}`;
  }

  protected formatDate(value?: string | null): string | null {
    if (!value) {
      return null;
    }
    return value;
  }

  private buildWorkFormData(): WorkFormData {
    const formValue = this.workForm.value;
    const workType = this.getWorkType();
    const usesSamples = Boolean(formValue.uses_sample_libraries);
    const primarySelections = this.collectLanguageSelections('primary');
    const secondarySelections = this.collectLanguageSelections('secondary');
    const languageNames: string[] = [];
    const languageNameSet = new Set<string>();

    [...primarySelections, ...secondarySelections].forEach(selection => {
      const key = selection.language.toLowerCase();
      if (!languageNameSet.has(key)) {
        languageNameSet.add(key);
        languageNames.push(selection.language);
      }
    });
    const originalWorks = Array.isArray(formValue.original_works)
      ? (formValue.original_works as Partial<WorkOriginalReference>[])
          .map(item => ({
            title: item.title?.trim() ?? '',
            isrc: item.isrc?.trim() || undefined,
            iswc: item.iswc?.trim() || undefined,
            additional_info: item.additional_info?.trim() || undefined
          }))
          .filter(item => item.title.length > 0)
      : [];

    return {
      work_type: workType,
      work_title: formValue.work_title,
      release_title: formValue.release_title || undefined,
      alternative_titles: this.alternativeTitles.value.filter((t: string) => t.trim()),
      isrc: formValue.isrc || undefined,
      iswc: formValue.iswc || undefined,
      duration_seconds: formValue.duration_seconds ?? undefined,
      recording_date: formValue.recording_date || undefined,
      release_date: formValue.release_date || undefined,
      languages: languageNames,
      primary_languages: primarySelections,
      secondary_languages: secondarySelections,
      genre: formValue.genre || undefined,
      is_cover_version: formValue.is_cover_version,
      original_work_title: formValue.original_work_title || undefined,
      original_work_isrc: formValue.original_work_isrc || undefined,
      original_work_iswc: formValue.original_work_iswc || undefined,
      original_work_info: formValue.original_work_info || undefined,
      status: formValue.status,
      notes: formValue.notes || undefined,
      is_100_percent_human: Boolean(formValue.is_100_percent_human),
      uses_sample_libraries: usesSamples,
      sample_library_names: usesSamples
        ? (formValue.sample_library_names?.trim() || null)
        : null,
      has_commercial_license: usesSamples
        ? Boolean(formValue.has_commercial_license)
        : false,
      original_works: workType === 'remix' && originalWorks.length ? originalWorks : null,
      ai_disclosures: this.toDisclosureArray(),
    };
  }

  private handleSubmissionSuccess(workId: string, title: string, isNew: boolean): void {
    this.pendingWorkData.set(null);
    this.showReview.set(false);
    this.submissionSuccess.set(true);
    this.submittedWorkId.set(workId);
    this.submittedWorkTitle.set(title);
    this.isCreateSubmission.set(isNew);

    if (isNew) {
      this.workId.set(workId);
      this.isEditMode.set(true);
    }
  }

  private closeSuccessOverlay(): void {
    this.submissionSuccess.set(false);
  }

  private slugify(value: string): string {
    const fallback = 'work';
    if (!value) {
      return fallback;
    }

    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);

    return slug || fallback;
  }

  private resetForNewWork(): void {
    this.closeSuccessOverlay();
    this.workForm.reset({
      work_type: 'standard',
      is_100_percent_human: false,
      uses_sample_libraries: false,
      sample_library_names: '',
      has_commercial_license: false,
      work_title: '',
      isrc: '',
      iswc: '',
      duration_seconds: null,
      recording_date: '',
      release_date: '',
      genre: '',
      is_cover_version: false,
      original_work_title: '',
      original_work_isrc: '',
      original_work_iswc: '',
      original_work_info: '',
      status: 'draft',
      notes: ''
    });

    while (this.alternativeTitles.length) {
      this.alternativeTitles.removeAt(0);
    }

    this.clearOriginalWorks();
    this.configureForWorkType('standard');
    this.updateSampleDisclosureValidators();
    this.resetLanguageArray('primary');
    this.resetLanguageArray('secondary');
    this.addPrimaryLanguage();

    this.aiDisclosures.set(createDefaultWorkCreationDeclarationMap());
    this.aiDisclosuresValid.set(true);
    this.workId.set(null);
    this.isEditMode.set(false);
    this.submittedWorkId.set(null);
    this.submittedWorkTitle.set('');
    this.isCreateSubmission.set(true);
    this.durationMode.set('hms');
    this.changeHistory.set([]);
    this.showChangeHistory.set(false);
    this.changeHistoryError.set(null);
    this.changeHistoryLoading.set(false);
  }

  protected getChangeTypeTranslationKey(changeType: string): string {
    const mapping: Record<string, string> = {
      work_create: 'WORKS.CHANGE_HISTORY.TYPE.WORK_CREATE',
      work_update: 'WORKS.CHANGE_HISTORY.TYPE.WORK_UPDATE',
      work_delete: 'WORKS.CHANGE_HISTORY.TYPE.WORK_DELETE',
      split_create: 'WORKS.CHANGE_HISTORY.TYPE.SPLIT_CREATE',
      split_update: 'WORKS.CHANGE_HISTORY.TYPE.SPLIT_UPDATE',
      split_delete: 'WORKS.CHANGE_HISTORY.TYPE.SPLIT_DELETE'
    };

    return mapping[changeType] ?? 'WORKS.CHANGE_HISTORY.TYPE.UNKNOWN';
  }

  protected describeChangedField(field?: string | null): string | null {
    if (!field) {
      return null;
    }

    if (field.startsWith('split.')) {
      const parts = field.split('.');
      const key = parts[parts.length - 1];
      return key;
    }

    return field;
  }

  protected formatChangeValue(value?: string | null): string | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        return JSON.stringify(JSON.parse(trimmed), null, 2);
      } catch {
        // Fall back to raw value when parsing fails
      }
    }

    return value;
  }

  async openChangeHistory(): Promise<void> {
    const id = this.workId();
    if (!id) {
      return;
    }

    this.showChangeHistory.set(true);
    this.changeHistoryLoading.set(true);
    this.changeHistoryError.set(null);
    this.changeHistory.set([]);

    try {
      const entries = await this.worksService.getWorkChangeHistory(id);
      this.changeHistory.set(entries);
    } catch (error) {
      console.error('Error fetching change history:', error);
      const fallback = this.translate.instant('WORKS.CHANGE_HISTORY.ERROR');
      this.changeHistoryError.set(fallback);
    } finally {
      this.changeHistoryLoading.set(false);
    }
  }

  closeChangeHistory(): void {
    this.showChangeHistory.set(false);
  }
}