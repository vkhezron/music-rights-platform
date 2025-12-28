import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { RightsHoldersService, RightsHolder } from '../../services/rights-holder';
import { WorkspaceService } from '../../services/workspace.service';

// Lucide Icons
import { LucideAngularModule, User, Building2, Plus, Edit, Trash2, Search, ArrowLeft, Mail, Phone, Award, Hash } from 'lucide-angular';

@Component({
  selector: 'app-rights-holder-list',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    LucideAngularModule
  ],
  templateUrl: './rights-holder-list.html',
  styleUrl: './rights-holder-list.scss',
})
export class RightsHolderListComponent implements OnInit {
  private router = inject(Router);
  private rightsHoldersService = inject(RightsHoldersService);
  private workspaceService = inject(WorkspaceService);

  // Lucide Icons
  readonly User = User;
  readonly Building2 = Building2;
  readonly Plus = Plus;
  readonly Edit = Edit;
  readonly Trash2 = Trash2;
  readonly Search = Search;
  readonly ArrowLeft = ArrowLeft;
  readonly Mail = Mail;
  readonly Phone = Phone;
  readonly Award = Award;
  readonly Hash = Hash;

  // State
  rightsHolders = signal<RightsHolder[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  typeFilter = signal<'all' | 'person' | 'company'>('all');
  currentWorkspace$ = this.workspaceService.currentWorkspace$;

  // Computed filtered list
  filteredRightsHolders = computed(() => {
    let list = this.rightsHolders();
    
    // Filter by type
    const type = this.typeFilter();
    if (type !== 'all') {
      list = list.filter(rh => rh.type === type);
    }

    // Filter by search query
    const query = this.searchQuery().trim().toLowerCase();
    if (query) {
      list = list.filter(rh => {
        const name = this.getDisplayName(rh).toLowerCase();
        const email = (rh.email || '').toLowerCase();
        const ipi = (rh.ipi_number || '').toLowerCase();
        const cmo = (rh.cmo_pro || '').toLowerCase();

        return name.includes(query) ||
               email.includes(query) ||
               ipi.includes(query) ||
               cmo.includes(query);
      });
    }

    return list;
  });

  async ngOnInit() {
    await this.loadRightsHolders();
  }

  async loadRightsHolders() {
    this.isLoading.set(true);
    try {
      const workspace = this.workspaceService.currentWorkspace;
      if (!workspace) {
        this.router.navigate(['/dashboard']);
        return;
      }

      await this.rightsHoldersService.loadRightsHolders(workspace.id);
      
      // Subscribe to updates
      this.rightsHoldersService.rightsHolders$.subscribe(rhs => {
        this.rightsHolders.set(rhs);
        this.isLoading.set(false);
      });
    } catch (error) {
      console.error('Error loading rights holders:', error);
      this.isLoading.set(false);
    }
  }

  onSearchChange(query: string) {
    this.searchQuery.set(query);
  }

  clearSearch() {
    this.searchQuery.set('');
  }

  setTypeFilter(type: 'all' | 'person' | 'company') {
    this.typeFilter.set(type);
  }

  getDisplayName(rh: RightsHolder): string {
    return this.rightsHoldersService.getDisplayName(rh);
  }

  getIcon(rh: RightsHolder): any {
    return rh.type === 'person' ? this.User : this.Building2;
  }

  createRightsHolder() {
    this.router.navigate(['/rights-holders/create']);
  }

  editRightsHolder(rh: RightsHolder) {
    this.router.navigate(['/rights-holders/edit', rh.id]);
  }

  async deleteRightsHolder(rh: RightsHolder, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    const name = this.getDisplayName(rh);
    const confirmed = confirm(`Delete "${name}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await this.rightsHoldersService.deleteRightsHolder(rh.id);
    } catch (error) {
      console.error('Error deleting rights holder:', error);
      alert('Failed to delete rights holder');
    }
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}