import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SupabaseService } from '../services/supabase.service';

interface LandingStats {
  users: number;
  rightsHolders: number;
  works: number;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './landing.html',
  styleUrls: ['./landing.scss']
})
export class LandingComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);

  protected readonly stats = signal<LandingStats | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly hasStats = computed(() => Boolean(this.stats()));

  async ngOnInit(): Promise<void> {
    await this.loadStats();
  }

  protected formatCount(count: number | null | undefined): string {
    if (typeof count !== 'number' || Number.isNaN(count)) {
      return '0';
    }
    return Intl.NumberFormat().format(count);
  }

  private async loadStats(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const [users, rightsHolders, works] = await Promise.all([
        this.fetchCount('profiles'),
        this.fetchCount('rights_holders'),
        this.fetchCount('works')
      ]);

      this.stats.set({ users, rightsHolders, works });
    } catch (error) {
      console.error('Failed to load landing stats', error);
      this.errorMessage.set('LANDING.STATS.ERROR');
    } finally {
      this.loading.set(false);
    }
  }

  private async fetchCount(table: string): Promise<number> {
    const { error, count } = await this.supabase.client
      .from(table)
      .select('*', { head: true, count: 'exact' });

    if (error) {
      throw error;
    }

    return count ?? 0;
  }
}
