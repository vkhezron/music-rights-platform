import { Injectable } from '@angular/core';
import type { SplitEntry, IPRightsSummary, NeighbouringRightsSummary } from '../models/split-entry.model';

@Injectable({ providedIn: 'root' })
export class SplitCalculatorService {
  calculateLyricsTotal(entries: SplitEntry[]): number {
    return entries
      .filter(entry => entry.splitType === 'lyrics')
      .reduce((total, entry) => total + (entry.ownershipPercentage || 0), 0);
  }

  calculateMusicTotal(entries: SplitEntry[]): number {
    return entries
      .filter(entry => entry.splitType === 'music')
      .reduce((total, entry) => total + (entry.ownershipPercentage || 0), 0);
  }

  calculateIPRightsTotal(lyricsTotal: number, musicTotal: number): number {
    const normalizedLyrics = this.normalizeShare(lyricsTotal);
    const normalizedMusic = this.normalizeShare(musicTotal);
    return Math.min(normalizedLyrics + normalizedMusic, 100);
  }

  getIPRightsSummary(entries: SplitEntry[]): IPRightsSummary {
    const lyricsEntries = entries.filter(entry => entry.splitType === 'lyrics');
    const musicEntries = entries.filter(entry => entry.splitType === 'music');

    const lyricsTotal = this.calculateLyricsTotal(entries);
    const musicTotal = this.calculateMusicTotal(entries);
    const normalizedLyrics = this.normalizeShare(lyricsTotal);
    const normalizedMusic = this.normalizeShare(musicTotal);
    const combined = normalizedLyrics + normalizedMusic;
    const weightDenominator = combined > 0 ? combined : 1;

    return {
      lyrics: {
        entries: lyricsEntries,
        total: lyricsTotal,
        weight: combined > 0 ? normalizedLyrics / weightDenominator : 0,
      },
      music: {
        entries: musicEntries,
        total: musicTotal,
        weight: combined > 0 ? normalizedMusic / weightDenominator : 0,
      },
      total: Math.min(combined, 100),
    };
  }

  calculateNeighbouringTotal(entries: SplitEntry[]): number {
    return entries
      .filter(entry => entry.splitType === 'neighbouring')
      .reduce((total, entry) => total + (entry.ownershipPercentage || 0), 0);
  }

  getNeighbouringRightsSummary(entries: SplitEntry[]): NeighbouringRightsSummary {
    const neighbouringEntries = entries.filter(entry => entry.splitType === 'neighbouring');

    return {
      entries: neighbouringEntries,
      total: this.calculateNeighbouringTotal(entries),
    };
  }

  getProgressClass(total: number): 'progress-idle' | 'progress-valid' | 'progress-warning' {
    if (total === 100) return 'progress-valid';
    if (total < 100) return 'progress-idle';
    return 'progress-warning';
  }

  validateEntry(entry: SplitEntry): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!entry.splitType) {
      errors.push('Split type is required');
    }

    if (entry.ownershipPercentage === undefined || entry.ownershipPercentage === null) {
      errors.push('Ownership percentage is required');
    } else if (entry.ownershipPercentage < 0 || entry.ownershipPercentage > 100) {
      errors.push('Ownership percentage must be between 0 and 100');
    }

    if (!entry.nickname?.trim()) {
      errors.push('Public handle is required');
    }

    if (entry.splitType === 'neighbouring' && (!entry.roles || entry.roles.length === 0)) {
      errors.push('At least one role must be selected');
    }

    if (entry.aiDisclosure.creationType !== 'human' && !entry.aiDisclosure.aiTool) {
      errors.push('AI tool is required when using AI');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private normalizeShare(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.max(0, Math.min(value, 100));
  }
}
