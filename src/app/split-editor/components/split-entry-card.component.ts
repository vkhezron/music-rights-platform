import { CommonModule } from '@angular/common';
import { Component, OnChanges, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { SplitEntry } from '../models/split-entry.model';
import { RoleSelectorComponent } from './role-selector.component';

@Component({
  selector: 'app-split-entry-card',
  standalone: true,
  imports: [CommonModule, FormsModule, RoleSelectorComponent],
  templateUrl: './split-entry-card.component.html',
  styleUrls: ['./split-entry-card.component.scss'],
})
export class SplitEntryCardComponent implements OnChanges {
  entry = input.required<SplitEntry>();
  showContributionFlags = input<boolean>(false);
  showRoleSelector = input<boolean>(false);

  entryUpdated = output<SplitEntry>();
  entryRemoved = output<SplitEntry>();

  protected localEntry!: SplitEntry;

  ngOnChanges(): void {
    this.localEntry = { ...this.entry() };
    if (this.localEntry.contributionTypes) {
      this.localEntry = {
        ...this.localEntry,
        contributionTypes: { ...this.localEntry.contributionTypes },
      };
    }
    if (this.localEntry.roles) {
      this.localEntry = {
        ...this.localEntry,
        roles: [...this.localEntry.roles],
      };
    }
    if (this.localEntry.aiDisclosure) {
      this.localEntry = {
        ...this.localEntry,
        aiDisclosure: { ...this.localEntry.aiDisclosure },
      };
    } else {
      this.localEntry = {
        ...this.localEntry,
        aiDisclosure: { creationType: 'human' },
      };
    }
  }

  onFlagChange(key: 'melody' | 'harmony' | 'arrangement', value: boolean): void {
    const current = this.localEntry.contributionTypes ?? {};
    this.localEntry = {
      ...this.localEntry,
      contributionTypes: {
        ...current,
        [key]: value,
      },
    };
    this.emitUpdate();
  }

  onRoleChange(roles: string[]): void {
    this.localEntry = {
      ...this.localEntry,
      roles: [...roles],
    };
    this.emitUpdate();
  }

  emitUpdate(): void {
    this.entryUpdated.emit({ ...this.localEntry });
  }

  remove(): void {
    this.entryRemoved.emit(this.entry());
  }

  get methodLabel(): string {
    switch (this.entry().entryMethod) {
      case 'add_me':
        return 'Added from profile';
      case 'scan_qr':
        return 'Added via QR scan';
      default:
        return 'Added manually';
    }
  }
}
