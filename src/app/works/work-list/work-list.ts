import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { WorkspaceService } from '../../services/workspace.service';
import { WorksService } from '../../services/works';
import { Work } from '../../../models/work.model';

// Lucide Icons
import { LucideAngularModule, Music, Plus, Edit, Trash2, Search, Calendar, Clock, Globe, ArrowLeft } from 'lucide-angular';

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

  // Lucide Icons
  readonly Music = Music;
  readonly Plus = Plus;
  readonly Edit = Edit;
  readonly Trash2 = Trash2;
  readonly Search = Search;
  readonly Calendar = Calendar;
  readonly Clock = Clock;
  readonly Globe = Globe;
  readonly ArrowLeft = ArrowLeft;

  works = signal<Work[]>([]);
  filteredWorks = signal<Work[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  currentWorkspace$ = this.workspaceService.currentWorkspace$;

  ngOnInit() {
    // Subscribe to works from service
    this.worksService.works$.subscribe(works => {
      this.works.set(works);
      this.filteredWorks.set(works);
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

  async deleteWork(work: Work) {
    const confirmed = confirm(`Delete "${work.work_title}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await this.worksService.deleteWork(work.id);
      // Works will be updated via observable
    } catch (error) {
      console.error('Error deleting work:', error);
      alert('Failed to delete work');
    }
  }

  formatDuration(seconds?: number): string {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}