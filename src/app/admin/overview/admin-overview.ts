import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AdminAnalyticsService, AdminOverviewSnapshot } from '../services/admin-analytics.service';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './admin-overview.html',
  styleUrls: ['./admin-overview.scss']
})
export class AdminOverviewComponent implements OnInit {
  private readonly analytics = inject(AdminAnalyticsService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly snapshot = signal<AdminOverviewSnapshot | null>(null);

  protected readonly signupChartPath = computed(() => {
    const data = this.snapshot()?.weeklySignups ?? [];
    if (data.length === 0) {
      return '';
    }

    const max = Math.max(...data.map((point) => point.count), 1);
    const width = 240;
    const height = 80;
    const step = width / Math.max(data.length - 1, 1);

    return data
      .map((point, index) => {
        const x = index * step;
        const normalized = point.count / max;
        const y = height - normalized * height;
        return `${x},${y}`;
      })
      .join(' ');
  });

  async ngOnInit(): Promise<void> {
    await this.loadSnapshot();
  }

  protected async refresh(): Promise<void> {
    await this.loadSnapshot();
  }

  private async loadSnapshot(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const data = await this.analytics.loadOverviewSnapshot();
      this.snapshot.set(data);
    } catch (error) {
      console.error('Failed to load admin overview snapshot', error);
      this.error.set('ADMIN.ERRORS.OVERVIEW_LOAD_FAILED');
    } finally {
      this.loading.set(false);
    }
  }
}
