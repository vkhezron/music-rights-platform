import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';

export interface AdminOverviewSnapshot {
  totalUsers: number;
  activeUsers: number;
  deactivatedUsers: number;
  worksWithCompleteSplits: number;
  worksHumanOnly: number;
  worksAiAssisted: number;
  worksAiGenerated: number;
  weeklySignups: Array<{ week: string; count: number }>;
}

@Injectable({ providedIn: 'root' })
export class AdminAnalyticsService {
  private readonly supabase = inject(SupabaseService);

  async loadOverviewSnapshot(): Promise<AdminOverviewSnapshot> {
    const { data, error } = await this.supabase.client.rpc('admin_overview_snapshot');

    if (error) {
      throw error;
    }

    const weeklyPayload = Array.isArray(data?.weeklySignups) ? data.weeklySignups : [];
    const weeklySignups = weeklyPayload
      .map((entry: any) => ({
        week: typeof entry?.week === 'string' ? entry.week : '',
        count: Number(entry?.count ?? 0)
      }))
      .filter((entry: AdminOverviewSnapshot['weeklySignups'][number]) => Boolean(entry.week));

    return {
      totalUsers: Number(data?.totalUsers ?? 0),
      activeUsers: Number(data?.activeUsers ?? 0),
      deactivatedUsers: Number(data?.deactivatedUsers ?? 0),
      worksWithCompleteSplits: Number(data?.worksWithCompleteSplits ?? 0),
      worksHumanOnly: Number(data?.worksHumanOnly ?? 0),
      worksAiAssisted: Number(data?.worksAiAssisted ?? 0),
      worksAiGenerated: Number(data?.worksAiGenerated ?? 0),
      weeklySignups
    };
  }
}
