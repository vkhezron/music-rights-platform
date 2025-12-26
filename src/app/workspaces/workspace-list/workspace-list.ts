import { Component, inject, OnInit, signal } from '@angular/core';
import { WorkspaceService, Workspace } from '../../services/workspace.service';  
import { AsyncPipe, CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-workspace-list',
  standalone: true,
  imports: [CommonModule, AsyncPipe],
  templateUrl: './workspace-list.html',
  styleUrl: './workspace-list.scss',
})
export class WorkspaceList {
private workspaceService = inject(WorkspaceService);
  private router = inject(Router);

  workspaces$ = this.workspaceService.workspaces;
  currentWorkspace = this.workspaceService.currentWorkspace;

  ngOnInit() {
    // Workspaces are auto-loaded by service
  }

  selectWorkspace(workspace: Workspace) {
    this.workspaceService.setCurrentWorkspace(workspace);
    this.router.navigate(['/dashboard']);
  }

  createWorkspace() {
    this.router.navigate(['/workspaces/create']);
  }

  getWorkspaceIcon(type: Workspace['type']): string {
    const icons: Record<Workspace['type'], string> = {
      band: '🎸',
      label: '🏢',
      publisher: '📄',
      studio: '🎙️',
      management: '👔',
      other: '📁'
    };
    return icons[type] || '📁';
  }
}
