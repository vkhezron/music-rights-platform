import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { WorkspaceService } from '../../services/workspace.service';
import { WorksService } from '../../services/works';
import { Work } from '../../../models/work.model';
import { WorkSplit } from '../../../models/work-split.model';

// Lucide Icons
import { LucideAngularModule, Music, FileText,
  Plus, Edit, Archive, Search, Calendar, Clock, Globe, ArrowLeft, Users, Home, FolderOpen, Recycle } from 'lucide-angular';

@Component({
  selector: 'app-works-list',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    LucideAngularModule
  ],
  templateUrl: './work-list.html',
  styleUrl: './work-list.scss'
})
export class WorksListComponent implements OnInit {
  private router = inject(Router);
  private workspaceService = inject(WorkspaceService);
  private worksService = inject(WorksService);
  private translateService = inject(TranslateService);

  // Lucide Icons
  readonly Music = Music;
  readonly Plus = Plus;
  readonly Edit = Edit;
  readonly Archive = Archive;
  readonly Search = Search;
  readonly Calendar = Calendar;
  readonly Clock = Clock;
  readonly Globe = Globe;
  readonly ArrowLeft = ArrowLeft;
  readonly Users = Users;
  readonly Home = Home;
  readonly FileText = FileText;
  readonly FolderOpen = FolderOpen;
  readonly ArchiveIcon = Recycle;

  works = signal<Work[]>([]);
  filteredWorks = signal<Work[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  currentWorkspace$ = this.workspaceService.currentWorkspace$;

  ngOnInit() {
    // Subscribe to works from service
    this.worksService.works$.subscribe(works => {
      const activeWorks = works.filter(work => work.status !== 'archived');
      this.works.set(activeWorks);
      this.filteredWorks.set(activeWorks);
      this.isLoading.set(false);
    });

    this.loadWorks();
  }

  async loadWorks() {
    this.isLoading.set(true);
    try {
      const workspace = this.workspaceService.currentWorkspace;
      if (!workspace) {
        this.router.navigate(['/dashboard']);
        return;
      }

      await this.worksService.loadWorks(workspace.id);
    } catch (error) {
      console.error('Error loading works:', error);
      this.isLoading.set(false);
    }
  }

  onSearchChange(query: string) {
    this.searchQuery.set(query);
    
    if (!query.trim()) {
      this.filteredWorks.set(this.works());
      return;
    }

    const filtered = this.works().filter(work =>
      work.work_title.toLowerCase().includes(query.toLowerCase()) ||
      work.alternative_titles?.some(alt => alt.toLowerCase().includes(query.toLowerCase())) ||
      work.isrc?.toLowerCase().includes(query.toLowerCase()) ||
      work.iswc?.toLowerCase().includes(query.toLowerCase())
    );
    
    this.filteredWorks.set(filtered);
  }

  createWork() {
    this.router.navigate(['/works/create']);
  }

  editWork(work: Work) {
    this.router.navigate(['/works/edit', work.id]);
  }

  async archiveWork(work: Work, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    const confirmed = confirm(
      this.t('WORKS.ARCHIVE_CONFIRM', { title: work.work_title })
    );

    if (!confirmed) return;

    try {
      await this.worksService.archiveWork(work.id);
      this.loadWorks();
    } catch (error) {
      console.error('Error archiving work:', error);
      alert(this.t('WORKS.ARCHIVE_ERROR'));
    }
  }

  formatDuration(seconds?: number): string {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  manageSplits(work: Work, event?: Event) {
    if (event) {
      event.stopPropagation();
      //event.preventDefault();
    }
    this.router.navigate(['/works', work.id, 'splits']);
  }

  navigateTo(route: string) {
    if (route === 'dashboard') {
      this.router.navigate(['/dashboard']);
    } else if (route === 'rights-holders') {
      this.router.navigate(['/rights-holders']);
    } else if (route === 'protocols') {
      this.router.navigate(['/protocols']);
    } else if (route === 'archive') {
      this.router.navigate(['/works/archived']);
    }
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  hasAIDisclosures(work: Work): boolean {
    return Array.isArray(work.ai_disclosures) && work.ai_disclosures.length > 0;
  }

  hasAIInvolvement(work: Work): boolean {
    return Boolean(work.ai_disclosures?.some(disclosure => disclosure.creation_type !== 'human'));
  }

  getAIDisclosureSummary(work: Work): string {
    const disclosures = work.ai_disclosures ?? [];
    if (!disclosures.length) {
      return 'No disclosure on file';
    }

    const aiSections = disclosures.filter(item => item.creation_type !== 'human');
    if (!aiSections.length) {
      return 'Declared 100% human made';
    }

    const tokens = aiSections.map(item => {
      const label = this.getDisclosureSectionLabel(item.section);
      const typeLabel = item.creation_type === 'ai_assisted' ? 'assisted' : 'generated';
      return `${label} (${typeLabel}${item.ai_tool ? ` · ${item.ai_tool}` : ''})`;
    });

    return tokens.join(' • ');
  }

  private getDisclosureSectionLabel(section: string | undefined): string {
    if (!section) return 'Unknown';
    const labels: Record<string, string> = {
      ip: 'Composition/Lyrics',
      mixing: 'Mixing',
      mastering: 'Mastering',
      session_musicians: 'Session Musicians',
      visuals: 'Artwork/Visuals',
    };
    return labels[section] ?? section;
  }

  private t(key: string, params?: Record<string, unknown>): string {
    return this.translateService.instant(key, params);
  }
}