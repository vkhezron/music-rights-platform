import { CommonModule } from '@angular/common';
import { Component, signal, inject, computed } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AdminManagementService, AdminProfileRow } from '../services/admin-management.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './admin-users.html',
  styleUrls: ['./admin-users.scss']
})
export class AdminUsersComponent {
  private readonly management = inject(AdminManagementService);

  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);
  protected readonly users = signal<AdminProfileRow[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = 25;
  protected readonly statusFilter = signal<'all' | 'active' | 'deactivated'>('all');
  protected readonly searchTerm = signal('');

  protected readonly pageCount = computed(() => {
    const size = this.pageSize;
    const count = this.total();
    return size > 0 ? Math.max(1, Math.ceil(count / size)) : 1;
  });

  protected readonly searchControl = new FormControl('', { nonNullable: true });

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => {
        const trimmed = value.trim();
        if (trimmed === this.searchTerm()) {
          return;
        }

        this.searchTerm.set(trimmed);
        this.page.set(1);
        void this.loadUsers();
      });

    void this.loadUsers();
  }

  protected async loadUsers(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const result = await this.management.listProfiles({
        search: this.searchTerm(),
        status: this.statusFilter(),
        page: this.page(),
        pageSize: this.pageSize
      });

      this.users.set(result.items);
      this.total.set(result.count);
    } catch (error) {
      console.error('Failed to load admin users', error);
      this.error.set('ADMIN.ERRORS.LOAD_USERS');
    } finally {
      this.loading.set(false);
    }
  }

  protected async toggleAdmin(user: AdminProfileRow): Promise<void> {
    try {
      const updated = await this.management.updateProfileFlags(user.id, { is_admin: !user.is_admin });
      this.mergeUser(updated);
    } catch (error) {
      console.error('Failed to toggle admin flag', error);
      this.error.set('ADMIN.ERRORS.UPDATE_USER');
    }
  }

  protected async toggleDeactivated(user: AdminProfileRow): Promise<void> {
    try {
      const nextState = !user.is_deactivated;
      const updated = await this.management.updateProfileFlags(user.id, {
        is_deactivated: nextState,
        deactivated_at: nextState ? new Date().toISOString() : null
      });
      if (this.statusFilter() === 'all') {
        this.mergeUser(updated);
      } else {
        await this.loadUsers();
      }
    } catch (error) {
      console.error('Failed to toggle deactivated flag', error);
      this.error.set('ADMIN.ERRORS.UPDATE_USER');
    }
  }

  protected async goToPage(page: number): Promise<void> {
    if (page < 1 || page > this.pageCount()) {
      return;
    }

    this.page.set(page);
    await this.loadUsers();
  }

  protected async setStatusFilter(filter: 'all' | 'active' | 'deactivated'): Promise<void> {
    if (this.statusFilter() === filter) {
      return;
    }

    this.statusFilter.set(filter);
    this.page.set(1);
    await this.loadUsers();
  }

  protected async refresh(): Promise<void> {
    await this.loadUsers();
  }

  private mergeUser(updated: AdminProfileRow): void {
    this.users.update((list) => list.map((entry) => (entry.id === updated.id ? updated : entry)));
  }
}
