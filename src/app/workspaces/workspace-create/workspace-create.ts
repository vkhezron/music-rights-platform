import { Component, inject, signal } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { WorkspaceService, CreateWorkspaceData } from '../../services/workspace.service';

@Component({
  selector: 'app-workspace-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule
    //, AsyncPipe
  ],
  templateUrl: './workspace-create.html',
  styleUrl: './workspace-create.scss'
})
export class WorkspaceCreateComponent {
  private fb = inject(FormBuilder);
  private workspaceService = inject(WorkspaceService);
  private router = inject(Router);

  workspaceForm: FormGroup;
  isLoading = signal(false);
  errorMessage = signal('');

  workspaceTypes = [
    { value: 'band', label: 'Band/Artist', icon: '🎸', description: 'For bands, solo artists, and musical groups' },
    { value: 'label', label: 'Record Label', icon: '🏢', description: 'For record labels and distributors' },
    { value: 'publisher', label: 'Publisher', icon: '📄', description: 'For music publishers and rights organizations' },
    { value: 'studio', label: 'Studio', icon: '🎙️', description: 'For recording studios and production companies' },
    { value: 'management', label: 'Management', icon: '👔', description: 'For artist management and agencies' },
    { value: 'other', label: 'Other', icon: '📁', description: 'For other types of music organizations' }
  ];

  constructor() {
    this.workspaceForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      type: ['band', Validators.required],
      description: ['', Validators.maxLength(500)]
    });
  }

  async onSubmit() {
    if (this.workspaceForm.invalid) {
      this.workspaceForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const formData: CreateWorkspaceData = this.workspaceForm.value;
      const workspace = await this.workspaceService.createWorkspace(formData);

      // Set as current workspace
      this.workspaceService.setCurrentWorkspace(workspace);

      // Redirect to dashboard
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      console.error('Workspace creation error:', error);
      this.errorMessage.set(error.message || 'WORKSPACE.CREATION_ERROR');
    } finally {
      this.isLoading.set(false);
    }
  }

  cancel() {
    this.router.navigate(['/workspaces']);
  }

  hasError(fieldName: string, errorType: string): boolean {
    const field = this.workspaceForm.get(fieldName);
    return field ? field.hasError(errorType) && (field.dirty || field.touched) : false;
  }

  getSelectedTypeInfo() {
    const selectedType = this.workspaceForm.get('type')?.value;
    return this.workspaceTypes.find(t => t.value === selectedType);
  }
}