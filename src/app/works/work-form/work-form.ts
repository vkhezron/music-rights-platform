import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { WorksService } from '../../services/works';
import { WorkspaceService } from '../../services/workspace.service';
import { WorkFormData } from '../../models/work.model';
import {
  WorkCreationDeclaration,
  WorkCreationDeclarationDraft,
  WorkCreationDeclarationMap,
  createDefaultWorkCreationDeclarationMap,
} from '../../models/work-creation-declaration.model';
import { AIDisclosureFormComponent } from '../../components/ai-disclosure-form/ai-disclosure-form.component';

// Lucide Icons
import { LucideAngularModule, ArrowLeft, Save, Plus, X, Music, Clock, Calendar, Globe, Tag, CheckCircle, AlertCircle, Edit } from 'lucide-angular';

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
  private workspaceService = inject(WorkspaceService);

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
  readonly CheckCircle = CheckCircle;
  readonly AlertCircle = AlertCircle;
  readonly Edit = Edit;

  workForm!: FormGroup;
  isLoading = signal(false);
  isEditMode = signal(false);
  workId = signal<string | null>(null);
  errorMessage = signal('');
  successMessage = signal('');
  aiDisclosures = signal<WorkCreationDeclarationMap>(createDefaultWorkCreationDeclarationMap());
  aiDisclosuresValid = signal(true);

  // Options
  statusOptions = ['draft', 'registered', 'published', 'archived'];
  languageOptions = [
    'English', 'Spanish', 'French', 'German', 'Italian', 
    'Portuguese', 'Japanese', 'Korean', 'Chinese', 'Russian',
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
        this.errorMessage.set('Work not found');
        this.router.navigate(['/works']);
        return;
      }

      // Populate form
      this.workForm.patchValue({
        work_title: work.work_title,
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
      this.errorMessage.set('Failed to load work');
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

  async onSubmit() {
    if (this.workForm.invalid) {
      this.workForm.markAllAsTouched();
      this.errorMessage.set('Please fill in all required fields');
      return;
    }

    if (!this.aiDisclosuresValid()) {
      this.errorMessage.set('Complete the AI disclosure section before saving.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const formValue = this.workForm.value;
      
      const workData: WorkFormData = {
        work_title: formValue.work_title,
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

      if (this.isEditMode() && this.workId()) {
        await this.worksService.updateWork(this.workId()!, workData);
        this.successMessage.set('Work updated successfully!');
        setTimeout(() => {
          this.router.navigate(['/works']);
        }, 1500);
      } else {
        const newWork = await this.worksService.createWork(workData);
        this.successMessage.set('Work created successfully!');
        
        // Ensure we have the work ID before navigating
        if (newWork && newWork.id) {
          console.log('Navigating to split editor for work:', newWork.id);
          setTimeout(() => {
            this.router.navigate(['/works', newWork.id, 'splits']);
          }, 1500);
        } else {
          console.error('Work created but no ID returned:', newWork);
          setTimeout(() => {
            this.router.navigate(['/works']);
          }, 1500);
        }
      }

    } catch (error: any) {
      console.error('Error saving work:', error);
      this.errorMessage.set(error.message || 'Failed to save work');
    } finally {
      this.isLoading.set(false);
    }
  }

  editRightsHolders() {
    if (this.workId()) {
      this.router.navigate([`/works/${this.workId()}/splits`]);
    }
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
}