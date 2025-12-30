import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ProtocolService } from '../../services/protocol.service';
import { WorksService } from '../../services/works';
import {
  PROTOCOL_ROLES,
  LyricAuthor,
  MusicAuthor,
  NeighbouringRightsholder,
  ProtocolRoleKind,
  ProtocolFormData
} from '../../models/protocol.model';

interface AuthorRow {
  index: number;
  name: string;
  middle_name: string;
  surname: string;
  aka: string;
  cmo_name: string;
  pro_name: string;
  participation_percentage: string;
  // Music author specific
  melody?: boolean;
  harmony?: boolean;
  arrangement?: boolean;
  // Neighbouring specific
  roles?: ProtocolRoleKind[];
}

@Component({
  selector: 'app-protocol-form',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './protocol-form.html',
  styleUrls: ['./protocol-form.scss']
})
export class ProtocolFormComponent implements OnInit {
  private protocolService = inject(ProtocolService);
  private worksService = inject(WorksService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // ============ SIGNALS ============
  workId = signal<string | null>(null);

  // Work metadata
  work_title = signal('');
  alternative_title = signal('');
  release_title = signal('');
  isrc = signal('');
  iswc = signal('');
  ean = signal('');
  primary_language = signal('');
  secondary_language = signal('');
  is_cover_version = signal(false);
  original_work_title = signal('');
  show_advanced = signal(false);

  // Author collections
  lyric_authors = signal<AuthorRow[]>([]);
  music_authors = signal<AuthorRow[]>([]);
  neighbouring_rightsholders = signal<AuthorRow[]>([]);

  // UI state
  isSubmitting = signal(false);
  submitError = signal<string | null>(null);
  submitSuccess = signal(false);

  // Computed totals for progress bars
  lyric_total = computed(() => this.calculateTotal(this.lyric_authors()));
  music_total = computed(() => this.calculateTotal(this.music_authors()));
  neighbouring_total = computed(() => this.calculateTotal(this.neighbouring_rightsholders()));

  // Progress bar colors
  get lyricProgressColor(): string {
    return this.getProgressColor(this.lyric_total());
  }
  get musicProgressColor(): string {
    return this.getProgressColor(this.music_total());
  }
  get neighbouringProgressColor(): string {
    return this.getProgressColor(this.neighbouring_total());
  }

  // Available roles
  protocolRoles = PROTOCOL_ROLES;

  ngOnInit(): void {
    // Get work ID from route
    this.route.params.subscribe(params => {
      if (params['workId']) {
        this.workId.set(params['workId']);
        this.loadWorkData(params['workId']);
      }
    });
  }

  /**
   * Load work data into form
   */
  private loadWorkData(workId: string): void {
    const work = this.worksService.works.find((w: { id: string }) => w.id === workId);
    if (work) {
      this.work_title.set(work.work_title);
      this.alternative_title.set((work.alternative_titles?.[0]) || '');
      this.isrc.set(work.isrc || '');
      this.iswc.set(work.iswc || '');
      this.is_cover_version.set(work.is_cover_version);
      this.original_work_title.set(work.original_work_title || '');
    }
  }

  /**
   * Calculate total participation percentage
   */
  private calculateTotal(authors: AuthorRow[]): number {
    return authors.reduce((sum, author) => {
      const percentage = parseFloat(author.participation_percentage) || 0;
      return sum + percentage;
    }, 0);
  }

  /**
   * Determine progress bar color based on total
   */
  private getProgressColor(total: number): string {
    if (total < 100) return '#fbbf24'; // amber
    if (total === 100) return '#10b981'; // green
    return '#ef4444'; // red
  }

  /**
   * Toggle advanced work options
   */
  toggleAdvanced(): void {
    this.show_advanced.set(!this.show_advanced());
  }

  /**
   * Add a new lyric author row
   */
  addLyricAuthor(): void {
    const authors = this.lyric_authors();
    const newAuthor: AuthorRow = {
      index: authors.length + 1,
      name: '',
      middle_name: '',
      surname: '',
      aka: '',
      cmo_name: '',
      pro_name: '',
      participation_percentage: ''
    };
    this.lyric_authors.set([...authors, newAuthor]);
  }

  /**
   * Remove lyric author row
   */
  removeLyricAuthor(index: number): void {
    this.lyric_authors.set(this.lyric_authors().filter((_, i) => i !== index));
  }

  /**
   * Clear all lyric authors
   */
  clearLyricAuthors(): void {
    this.lyric_authors.set([]);
    this.addLyricAuthor(); // Add one empty row
  }

  /**
   * Add a new music author row
   */
  addMusicAuthor(): void {
    const authors = this.music_authors();
    const newAuthor: AuthorRow = {
      index: authors.length + 1,
      name: '',
      middle_name: '',
      surname: '',
      aka: '',
      cmo_name: '',
      pro_name: '',
      participation_percentage: '',
      melody: false,
      harmony: false,
      arrangement: false
    };
    this.music_authors.set([...authors, newAuthor]);
  }

  /**
   * Remove music author row
   */
  removeMusicAuthor(index: number): void {
    this.music_authors.set(this.music_authors().filter((_, i) => i !== index));
  }

  /**
   * Clear all music authors
   */
  clearMusicAuthors(): void {
    this.music_authors.set([]);
    this.addMusicAuthor(); // Add one empty row
  }

  /**
   * Add a new neighbouring rightsholder row
   */
  addNeighbouringRightsholder(): void {
    const rightsholders = this.neighbouring_rightsholders();
    const newRightsholder: AuthorRow = {
      index: rightsholders.length + 1,
      name: '',
      middle_name: '',
      surname: '',
      aka: '',
      cmo_name: '',
      pro_name: '',
      participation_percentage: '',
      roles: []
    };
    this.neighbouring_rightsholders.set([...rightsholders, newRightsholder]);
  }

  /**
   * Remove neighbouring rightsholder row
   */
  removeNeighbouringRightsholder(index: number): void {
    this.neighbouring_rightsholders.set(
      this.neighbouring_rightsholders().filter((_, i) => i !== index)
    );
  }

  /**
   * Clear all neighbouring rightsholders
   */
  clearNeighbouringRightsholders(): void {
    this.neighbouring_rightsholders.set([]);
    this.addNeighbouringRightsholder(); // Add one empty row
  }

  /**
   * Add role to neighbouring rightsholder
   */
  addRole(rowIndex: number): void {
    const rightsholders = this.neighbouring_rightsholders();
    const updatedRightsholders = [...rightsholders];
    if (!updatedRightsholders[rowIndex].roles) {
      updatedRightsholders[rowIndex].roles = [];
    }
    updatedRightsholders[rowIndex].roles!.push('other');
    this.neighbouring_rightsholders.set(updatedRightsholders);
  }

  /**
   * Remove role from neighbouring rightsholder
   */
  removeRole(rowIndex: number, roleIndex: number): void {
    const rightsholders = this.neighbouring_rightsholders();
    const updatedRightsholders = [...rightsholders];
    updatedRightsholders[rowIndex].roles?.splice(roleIndex, 1);
    this.neighbouring_rightsholders.set(updatedRightsholders);
  }

  /**
   * Update role for neighbouring rightsholder
   */
  updateRole(rowIndex: number, roleIndex: number, newRole: ProtocolRoleKind): void {
    const rightsholders = this.neighbouring_rightsholders();
    const updatedRightsholders = [...rightsholders];
    if (updatedRightsholders[rowIndex].roles) {
      updatedRightsholders[rowIndex].roles![roleIndex] = newRole;
    }
    this.neighbouring_rightsholders.set(updatedRightsholders);
  }

  /**
   * Validate form data
   */
  private validateForm(): boolean {
    if (!this.work_title().trim()) {
      this.submitError.set('Work title is required');
      return false;
    }

    // Validate lyric authors if present
    const lyricAuthors = this.lyric_authors().filter(a => a.name.trim() || a.surname.trim());
    if (lyricAuthors.length > 0) {
      for (const author of lyricAuthors) {
        if (!author.name.trim() || !author.surname.trim()) {
          this.submitError.set('All lyric authors must have name and surname');
          return false;
        }
      }
    }

    // Similar validation for music authors
    const musicAuthors = this.music_authors().filter(a => a.name.trim() || a.surname.trim());
    if (musicAuthors.length > 0) {
      for (const author of musicAuthors) {
        if (!author.name.trim() || !author.surname.trim()) {
          this.submitError.set('All music authors must have name and surname');
          return false;
        }
      }
    }

    // Similar validation for neighbouring rightsholders
    const neighbouring = this.neighbouring_rightsholders().filter(
      a => a.name.trim() || a.surname.trim()
    );
    if (neighbouring.length > 0) {
      for (const rh of neighbouring) {
        if (!rh.name.trim() || !rh.surname.trim()) {
          this.submitError.set('All neighbouring rightsholders must have name and surname');
          return false;
        }
        if (!rh.roles || rh.roles.length === 0) {
          this.submitError.set('All neighbouring rightsholders must have at least one role');
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Submit protocol form
   */
  async submitProtocol(): Promise<void> {
    this.submitError.set(null);
    this.submitSuccess.set(false);

    if (!this.validateForm()) {
      return;
    }

    if (!this.workId()) {
      this.submitError.set('No work selected');
      return;
    }

    this.isSubmitting.set(true);

    try {
      // Filter out empty authors
      const lyricAuthors: LyricAuthor[] = this.lyric_authors()
        .filter(a => a.name.trim() || a.surname.trim())
        .map(a => ({
          name: a.name,
          middle_name: a.middle_name || undefined,
          surname: a.surname,
          aka: a.aka || undefined,
          cmo_name: a.cmo_name || undefined,
          pro_name: a.pro_name || undefined,
          participation_percentage: parseFloat(a.participation_percentage) || 0
        }));

      const musicAuthors: MusicAuthor[] = this.music_authors()
        .filter(a => a.name.trim() || a.surname.trim())
        .map(a => ({
          name: a.name,
          middle_name: a.middle_name || undefined,
          surname: a.surname,
          aka: a.aka || undefined,
          cmo_name: a.cmo_name || undefined,
          pro_name: a.pro_name || undefined,
          participation_percentage: parseFloat(a.participation_percentage) || 0,
          melody: a.melody ? 1 : 0,
          harmony: a.harmony ? 1 : 0,
          arrangement: a.arrangement ? 1 : 0
        }));

      const neighbouring: NeighbouringRightsholder[] = this.neighbouring_rightsholders()
        .filter(a => a.name.trim() || a.surname.trim())
        .map(a => ({
          name: a.name,
          middle_name: a.middle_name || undefined,
          surname: a.surname,
          aka: a.aka || undefined,
          cmo_name: a.cmo_name || undefined,
          pro_name: a.pro_name || undefined,
          participation_percentage: parseFloat(a.participation_percentage) || 0,
          roles: a.roles || []
        }));

      const formData: ProtocolFormData = {
        work_title: this.work_title(),
        alternative_title: this.alternative_title() || undefined,
        release_title: this.release_title() || undefined,
        isrc: this.isrc() || undefined,
        iswc: this.iswc() || undefined,
        ean: this.ean() || undefined,
        primary_language: this.primary_language() || undefined,
        secondary_language: this.secondary_language() || undefined,
        is_cover_version: this.is_cover_version(),
        original_work_title: this.original_work_title() || undefined,
        lyric_authors: lyricAuthors,
        music_authors: musicAuthors,
        neighbouring_rightsholders: neighbouring
      };

      await this.protocolService.createProtocol(this.workId()!, formData);

      this.submitSuccess.set(true);
      // Redirect after delay
      setTimeout(() => {
        this.router.navigate(['/dashboard']);
      }, 2000);
    } catch (error) {
      console.error('Error submitting protocol:', error);
      this.submitError.set(
        error instanceof Error ? error.message : 'Error submitting protocol'
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /**
   * Get role label
   */
  getRoleLabel(role: ProtocolRoleKind): string {
    return this.protocolRoles.find(r => r.value === role)?.label || role;
  }
}
