import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideAngularModule, Archive, ArrowLeft, RefreshCcw, RotateCcw, Music, Home, Users, FileText, FolderOpen, Recycle } from 'lucide-angular';
import { WorksService } from '../../services/works';
import { WorkspaceService } from '../../services/workspace.service';
import { Work } from '../../../models/work.model';

@Component({
  selector: 'app-archived-works',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    TranslateModule,
    LucideAngularModule
  ],
  templateUrl: './archived-works.html',
  styleUrl: './archived-works.scss'
})
export class ArchivedWorksComponent {
  private readonly router = inject(Router);
  private readonly workspaceService = inject(WorkspaceService);
  private readonly worksService = inject(WorksService);
  private readonly translateService = inject(TranslateService);

  readonly Archive = Archive;
  readonly ArrowLeft = ArrowLeft;
  readonly RefreshCcw = RefreshCcw;
  readonly RotateCcw = RotateCcw;
  readonly Music = Music;
  readonly Home = Home;
  readonly Users = Users;
  readonly FileText = FileText;
  readonly FolderOpen = FolderOpen;
  readonly ArchiveIcon = Recycle;

  allArchivedWorks = signal<Work[]>([]);
  filteredArchivedWorks = signal<Work[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  searchQuery = signal('');
  currentWorkspace = signal<any>(null);
  private lastWorkspaceId: string | null = null;

  constructor() {
    this.worksService.works$
      .pipe(takeUntilDestroyed())
      .subscribe(works => {
        this.allArchivedWorks.set(works.filter(work => work.status === 'archived'));
        this.applySearch();
        this.isLoading.set(false);
      });

    this.workspaceService.currentWorkspace$
      .pipe(takeUntilDestroyed())
      .subscribe(workspace => {
        this.currentWorkspace.set(workspace);
        const workspaceId = workspace?.id ?? null;
        if (!workspaceId) {
          this.lastWorkspaceId = null;
          this.allArchivedWorks.set([]);
          this.filteredArchivedWorks.set([]);
          this.errorMessage.set('ARCHIVED_WORKS.NO_WORKSPACE');
          this.isLoading.set(false);
          return;
        }

        if (workspaceId !== this.lastWorkspaceId) {
          this.lastWorkspaceId = workspaceId;
          this.errorMessage.set('');
          this.loadWorks();
        }
      });
  }

  async loadWorks(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      const workspace = this.workspaceService.currentWorkspace;
      if (!workspace) {
        this.errorMessage.set('ARCHIVED_WORKS.NO_WORKSPACE');
        this.allArchivedWorks.set([]);
        this.filteredArchivedWorks.set([]);
        return;
      }
      await this.worksService.loadWorks(workspace.id);
    } catch (error) {
      console.error('Failed to load works for archive view', error);
      this.errorMessage.set('ARCHIVED_WORKS.ERROR_LOADING');
    } finally {
      this.isLoading.set(false);
    }
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.applySearch();
  }

  private applySearch(): void {
    const query = this.searchQuery().trim().toLowerCase();
    const items = this.allArchivedWorks();
    if (!query) {
      this.filteredArchivedWorks.set(items);
      return;
    }

    const filtered = items.filter(work => {
      const title = work.work_title?.toLowerCase() ?? '';
      const alternativeMatches = work.alternative_titles?.some(alt => alt?.toLowerCase().includes(query)) ?? false;
      const isrc = work.isrc?.toLowerCase() ?? '';
      const iswc = work.iswc?.toLowerCase() ?? '';
      return title.includes(query) || alternativeMatches || isrc.includes(query) || iswc.includes(query);
    });

    this.filteredArchivedWorks.set(filtered);
  }

  openWork(work: Work): void {
    this.router.navigate(['/works/edit', work.id]);
  }

  async restoreWork(work: Work, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
    }

    try {
      await this.worksService.updateWork(work.id, { status: 'draft' });
    } catch (error) {
      console.error('Failed to restore work', error);
      alert(this.translateService.instant('WORKS.RESTORE_ERROR'));
    }
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.applySearch();
  }

  navigateTo(route: string) {
    if (route === 'dashboard') {
      this.router.navigate(['/dashboard']);
    } else if (route === 'works') {
      this.router.navigate(['/works']);
    } else if (route === 'rights-holders') {
      this.router.navigate(['/rights-holders']);
    } else if (route === 'protocols') {
      this.router.navigate(['/protocols']);
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
