import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { WorkspaceService } from '../../services/workspace.service';

@Component({
  selector: 'app-workspace-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './workspace-create.html',
  styleUrl: './workspace-create.scss'
})
export class WorkspaceCreateComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private workspaceService = inject(WorkspaceService);

  workspaceForm: FormGroup;
  isLoading = signal(false);
  errorMessage = signal('');

  // Updated workspace types for music projects
  workspaceTypes = [
    { 
      value: 'single', 
      label: 'Single Work', 
      icon: '🎵',
      description: 'One song/composition with rights splits'
    },
    { 
      value: 'ep', 
      label: 'EP', 
      icon: '💿',
      description: 'Extended Play - typically 3-6 tracks'
    },
    { 
      value: 'album', 
      label: 'Album', 
      icon: '📀',
      description: 'Full album - 7 or more tracks'
    },
    { 
      value: 'collection', 
      label: 'Collection', 
      icon: '📚',
      description: 'Other grouping of works (compilation, soundtrack, etc.)'
    }
  ];

  constructor() {
    this.workspaceForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      type: ['', Validators.required],
      description: ['']
    });
  }

  hasError(fieldName: string, errorType: string): boolean {
    const field = this.workspaceForm.get(fieldName);
    return !!(field && field.hasError(errorType) && (field.dirty || field.touched));
  }

  getSelectedTypeInfo() {
    const selectedValue = this.workspaceForm.get('type')?.value;
    return this.workspaceTypes.find(type => type.value === selectedValue) || null;
  }

  async onSubmit() {
    if (this.workspaceForm.invalid) {
      Object.keys(this.workspaceForm.controls).forEach(key => {
        this.workspaceForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const workspace = await this.workspaceService.createWorkspace({
        name: this.workspaceForm.value.name,
        type: this.workspaceForm.value.type,
        description: this.workspaceForm.value.description
      });

      // After creating workspace, redirect to dashboard
      // Dashboard will show "Add First Work" button
      this.router.navigate(['/dashboard']);

    } catch (error: any) {
      console.error('Error creating workspace:', error);
      this.errorMessage.set(error.message || 'Failed to create project');
    } finally {
      this.isLoading.set(false);
    }
  }

  cancel() {
    this.router.navigate(['/dashboard']);
  }
}