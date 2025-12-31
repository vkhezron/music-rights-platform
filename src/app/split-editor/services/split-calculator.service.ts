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
    return (lyricsTotal * 0.5) + (musicTotal * 0.5);
  }

  getIPRightsSummary(entries: SplitEntry[]): IPRightsSummary {
    const lyricsEntries = entries.filter(entry => entry.splitType === 'lyrics');
    const musicEntries = entries.filter(entry => entry.splitType === 'music');

    const lyricsTotal = this.calculateLyricsTotal(entries);
    const musicTotal = this.calculateMusicTotal(entries);

    return {
      lyrics: {
        entries: lyricsEntries,
        total: lyricsTotal,
        weight: 0.5,
      },
      music: {
        entries: musicEntries,
        total: musicTotal,
        weight: 0.5,
      },
      total: this.calculateIPRightsTotal(lyricsTotal, musicTotal),
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

    if (entry.entryMethod === 'add_manually') {
      if (!entry.firstName?.trim()) {
        errors.push('First name is required');
      }
      if (!entry.lastName?.trim()) {
        errors.push('Last name is required');
      }
    }

    if (entry.splitType === 'music') {
      const flags = entry.contributionTypes;
      if (!flags || (!flags.melody && !flags.harmony && !flags.arrangement)) {
        errors.push('At least one contribution type must be selected');
      }
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
}
