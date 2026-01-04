import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { WorksService } from '../../services/works';
import { FeedbackService } from '../../services/feedback.service';
import { WorkFormData } from '../../models/work.model';
import {
  WorkCreationDeclaration,
  WorkCreationDeclarationDraft,
  WorkCreationDeclarationMap,
  WorkCreationSection,
  createDefaultWorkCreationDeclarationMap,
} from '../../models/work-creation-declaration.model';
import { AIDisclosureFormComponent } from '../../components/ai-disclosure-form/ai-disclosure-form.component';

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
  CheckCircle
} from 'lucide-angular';

interface ReviewDisclosureMeta {
  key: WorkCreationSection;
  labelKey: string;
}

interface SummaryDescriptor {
  key: string;
  params?: Record<string, unknown>;
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

  protected readonly disclosureSections: ReviewDisclosureMeta[] = [
    { key: 'ip', labelKey: 'AI_DISCLOSURE_FORM.SECTIONS.IP' },
    { key: 'mixing', labelKey: 'AI_DISCLOSURE_FORM.SECTIONS.MIXING' },
    { key: 'mastering', labelKey: 'AI_DISCLOSURE_FORM.SECTIONS.MASTERING' },
    { key: 'session_musicians', labelKey: 'AI_DISCLOSURE_FORM.SECTIONS.SESSION_MUSICIANS' },
    { key: 'visuals', labelKey: 'AI_DISCLOSURE_FORM.SECTIONS.VISUALS' }
  ];

  // Options
  statusOptions = ['draft', 'registered', 'published', 'archived'];
  languageOptions = [
    'English', 'Spanish', 'French', 'German', 'Italian', 
    'Portuguese', 'Japanese', 'Korean', 'Chinese', 'Hebrew',
    'Arabic', 'Hindi', 'Ukrainian', 'Other'
  ];
  genreOptions = [
    'Pop', 'Rock', 'Hip Hop', 'R&B', 'Country', 'Jazz', 
    'Classical', 'Electronic', 'Folk', 'Blues', 'Reggae',
    'Metal', 'Punk', 'Soul', 'Funk', 'Latin', 'World', 'Other'
  ];

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
      work_title: ['', [Validators.required, Validators.minLength(1)]],
      release_title: [''],
      alternative_titles: this.fb.array([]),
      isrc: ['', [Validators.pattern(/^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$/)]],
      iswc: ['', [Validators.pattern(/^T-\d{3}\.\d{3}\.\d{3}-\d$/)]],
      duration_seconds: [null, [Validators.min(0)]],
      recording_date: [''],
      release_date: [''],
      languages: [[]],
      genre: [''],
      is_cover_version: [false],
      original_work_title: [''],
      original_work_isrc: [''],
      original_work_iswc: [''],
      original_work_info: [''],
      status: ['draft', Validators.required],
      notes: ['']
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
  }

  get alternativeTitles(): FormArray {
    return this.workForm.get('alternative_titles') as FormArray;
  }

  addAlternativeTitle() {
    this.alternativeTitles.push(this.fb.control('', Validators.required));
  }

  removeAlternativeTitle(index: number) {
    this.alternativeTitles.removeAt(index);
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
        work_title: work.work_title,
        release_title: work.release_title || '',
        isrc: work.isrc,
        iswc: work.iswc,
        duration_seconds: work.duration_seconds,
        recording_date: work.recording_date,
        release_date: work.release_date,
        languages: work.languages || [],
        genre: work.genre,
        is_cover_version: work.is_cover_version,
        original_work_title: work.original_work_title,
        original_work_isrc: work.original_work_isrc,
        original_work_iswc: work.original_work_iswc,
        original_work_info: work.original_work_info,
        status: work.status,
        notes: work.notes
      });

      this.aiDisclosures.set(this.toDisclosureMap(work.ai_disclosures));
      this.aiDisclosuresValid.set(this.isDisclosureMapValid(this.aiDisclosures()));

      // Add alternative titles
      if (work.alternative_titles) {
        work.alternative_titles.forEach(title => {
          this.alternativeTitles.push(this.fb.control(title, Validators.required));
        });
      }
    } catch (error) {
      console.error('Error loading work:', error);
      this.feedback.handleError(error, 'Failed to load this work.');
    } finally {
      this.isLoading.set(false);
    }
  }

  convertDurationToSeconds(minutes: number, seconds: number): number {
    return (minutes * 60) + seconds;
  }

  getDurationMinutes(): number {
    const totalSeconds = this.workForm.get('duration_seconds')?.value || 0;
    return Math.floor(totalSeconds / 60);
  }

  getDurationSeconds(): number {
    const totalSeconds = this.workForm.get('duration_seconds')?.value || 0;
    return totalSeconds % 60;
  }

  onDurationChange(minutes: number, seconds: number) {
    const totalSeconds = this.convertDurationToSeconds(minutes, seconds);
    this.workForm.patchValue({ duration_seconds: totalSeconds });
  }

  onLanguageToggle(language: string) {
    const currentLanguages = this.workForm.get('languages')?.value || [];
    const index = currentLanguages.indexOf(language);
    
    if (index > -1) {
      currentLanguages.splice(index, 1);
    } else {
      currentLanguages.push(language);
    }
    
    this.workForm.patchValue({ languages: currentLanguages });
  }

  isLanguageSelected(language: string): boolean {
    const languages = this.workForm.get('languages')?.value || [];
    return languages.includes(language);
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

  protected formatLanguages(languages?: string[]): string | null {
    return languages && languages.length ? languages.join(', ') : null;
  }

  protected formatDuration(seconds?: number): string | null {
    if (!seconds && seconds !== 0) {
      return null;
    }

    const mins = Math.floor((seconds ?? 0) / 60);
    const secs = Math.abs((seconds ?? 0) % 60);
    const paddedSecs = secs.toString().padStart(2, '0');
    return `${mins}:${paddedSecs}`;
  }

  protected formatDate(value?: string | null): string | null {
    if (!value) {
      return null;
    }
    return value;
  }

  private buildWorkFormData(): WorkFormData {
    const formValue = this.workForm.value;

    return {
      work_title: formValue.work_title,
      release_title: formValue.release_title || undefined,
      alternative_titles: this.alternativeTitles.value.filter((t: string) => t.trim()),
      isrc: formValue.isrc || undefined,
      iswc: formValue.iswc || undefined,
      duration_seconds: formValue.duration_seconds || undefined,
      recording_date: formValue.recording_date || undefined,
      release_date: formValue.release_date || undefined,
      languages: formValue.languages.length > 0 ? formValue.languages : undefined,
      genre: formValue.genre || undefined,
      is_cover_version: formValue.is_cover_version,
      original_work_title: formValue.original_work_title || undefined,
      original_work_isrc: formValue.original_work_isrc || undefined,
      original_work_iswc: formValue.original_work_iswc || undefined,
      original_work_info: formValue.original_work_info || undefined,
      status: formValue.status,
      notes: formValue.notes || undefined,
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

  private resetForNewWork(): void {
    this.closeSuccessOverlay();
    this.workForm.reset({
      work_title: '',
      isrc: '',
      iswc: '',
      duration_seconds: null,
      recording_date: '',
      release_date: '',
      languages: [],
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

    this.aiDisclosures.set(createDefaultWorkCreationDeclarationMap());
    this.aiDisclosuresValid.set(true);
    this.workId.set(null);
    this.isEditMode.set(false);
    this.submittedWorkId.set(null);
    this.submittedWorkTitle.set('');
    this.isCreateSubmission.set(true);
  }
}