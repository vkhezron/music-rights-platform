import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SplitEntryCardComponent } from './components/split-entry-card.component';
import { SplitCalculatorService } from './services/split-calculator.service';
import { mapSplitToEntry, SplitEntry } from './models/split-entry.model';
import { WorksService } from '../services/works';
import { RightsHoldersService } from '../services/rights-holder';
import { ProfileService } from '../services/profile.service';
import { QRScannerService } from '../services/qr-scanner.service';
import { PdfGeneratorService } from '../services/pdf-generator.service';
import { SupabaseService } from '../services/supabase.service';

import type { Work } from '../models/work.model';
import type { RightsHolder, RightsHolderFormData, RightsHolderKind } from '../../models/rights-holder.model';

type SplitCategory = 'lyrics' | 'music' | 'neighbouring';
type EntryMethod = SplitEntry['entryMethod'];

@Component({
  selector: 'app-split-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, SplitEntryCardComponent],
  templateUrl: './split-editor.html',
  styleUrls: ['./split-editor.scss'],
})
export class SplitEditorComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly worksService = inject(WorksService);
  private readonly rightsHoldersService = inject(RightsHoldersService);
  private readonly profileService = inject(ProfileService);
  private readonly splitCalculator = inject(SplitCalculatorService);
  private readonly qrScannerService = inject(QRScannerService);
  private readonly pdfGenerator = inject(PdfGeneratorService);
  private readonly supabase = inject(SupabaseService);

  @ViewChild('qrVideo') qrVideo?: ElementRef<HTMLVideoElement>;

  protected readonly Math = Math;

  private workId = '';

  protected work = signal<Work | null>(null);
  protected rightsHolders = signal<RightsHolder[]>([]);
  protected entries = signal<SplitEntry[]>([]);

  protected isLoading = signal(false);
  protected isSaving = signal(false);
  protected errorMessage = signal<string | null>(null);
  protected successMessage = signal<string | null>(null);

  protected hasCameraSupport = signal(false);
  protected isQrModalOpen = signal(false);
  protected qrTargetSplitType = signal<SplitCategory | null>(null);
  protected qrError = signal<string | null>(null);

  protected lyricsEntries = computed(() =>
    this.entries().filter(entry => entry.splitType === 'lyrics')
  );
  protected musicEntries = computed(() =>
    this.entries().filter(entry => entry.splitType === 'music')
  );
  protected neighbouringEntries = computed(() =>
    this.entries().filter(entry => entry.splitType === 'neighbouring')
  );

  protected lyricsTotal = computed(() => this.splitCalculator.calculateLyricsTotal(this.entries()));
  protected musicTotal = computed(() => this.splitCalculator.calculateMusicTotal(this.entries()));
  protected neighbouringTotal = computed(() => this.splitCalculator.calculateNeighbouringTotal(this.entries()));
  protected ipWeightedTotal = computed(() =>
    this.splitCalculator.calculateIPRightsTotal(this.lyricsTotal(), this.musicTotal())
  );

  protected lyricsProgressClass = computed(() => this.splitCalculator.getProgressClass(this.lyricsTotal()));
  protected musicProgressClass = computed(() => this.splitCalculator.getProgressClass(this.musicTotal()));
  protected neighbouringProgressClass = computed(() => this.splitCalculator.getProgressClass(this.neighbouringTotal()));

  protected readonly trackEntry = (_index: number, entry: SplitEntry) =>
    entry.id ?? entry.tempId ?? `${_index}`;

  constructor() {
    this.rightsHoldersService.rightsHolders$
      .pipe(takeUntilDestroyed())
      .subscribe(list => this.rightsHolders.set(list));
  }

  async ngOnInit(): Promise<void> {
    const workId = this.route.snapshot.paramMap.get('id');
    if (!workId) {
      this.router.navigate(['/works']);
      return;
    }

    this.workId = workId;
    this.hasCameraSupport.set(await this.qrScannerService.hasCameraSupport());
    await this.loadData(workId);
  }

  ngOnDestroy(): void {
    this.stopQrFlow();
  }

  protected async addManualEntry(splitType: SplitCategory): Promise<void> {
    this.clearMessages();
    const entry = this.applyCategoryDefaults({
      tempId: this.generateTempId(),
      entryMethod: 'add_manually',
      splitType,
      ownershipPercentage: 0,
      aiDisclosure: { creationType: 'human' },
      isReadonly: false,
    });

    this.entries.update(list => [...list, entry]);
  }

  protected async addSelfEntry(splitType: SplitCategory): Promise<void> {
    this.clearMessages();

    try {
      const currentUser = this.supabase.currentUser;
      let profile = this.profileService.currentProfile;

      if (!profile && currentUser?.id) {
        profile = await this.profileService.loadProfile(currentUser.id);
      }

      if (!profile) {
        this.errorMessage.set('Complete your profile before adding yourself.');
        return;
      }

      const existingHolder = this.findRightsHolderByProfileId(profile.id);
      if (existingHolder && this.isDuplicateEntry(existingHolder.id, splitType)) {
        this.errorMessage.set('This profile is already part of the selected split.');
        return;
      }

      const entry = existingHolder
        ? this.createEntryFromRightsHolder(existingHolder, splitType, 'add_me')
        : this.applyCategoryDefaults({
            tempId: this.generateTempId(),
            entryMethod: 'add_me',
            splitType,
            ownershipPercentage: 0,
            nickname: profile.nickname,
            displayName: profile.nickname,
            firstName: profile.nickname,
            lastName: '',
            email: currentUser?.email ?? undefined,
            aiDisclosure: { creationType: 'human' },
            isReadonly: false,
          });

      this.entries.update(list => [...list, entry]);
    } catch (error) {
      console.error('Failed to add current user to splits', error);
      this.errorMessage.set('Unable to add your profile right now.');
    }
  }

  protected async startQrFlow(splitType: SplitCategory): Promise<void> {
    this.clearMessages();

    if (!this.hasCameraSupport()) {
      this.errorMessage.set('Camera scanning is not available on this device.');
      return;
    }

    this.isQrModalOpen.set(true);
    this.qrTargetSplitType.set(splitType);

    setTimeout(async () => {
      const video = this.qrVideo?.nativeElement;
      if (!video) return;

      try {
        await this.qrScannerService.startScanning(
          video,
          payload => this.handleQrPayload(payload),
          error => this.handleQrError(error)
        );
      } catch (error) {
        this.handleQrError(error);
      }
    }, 0);
  }

  protected stopQrFlow(): void {
    this.qrScannerService.stopScanning();
    this.isQrModalOpen.set(false);
    this.qrTargetSplitType.set(null);
    this.qrError.set(null);
  }

  protected onEntryUpdated(updated: SplitEntry): void {
    this.entries.update(list =>
      list.map(entry =>
        this.isSameEntry(entry, updated)
          ? this.applyCategoryDefaults({ ...entry, ...updated })
          : entry
      )
    );
  }

  protected onEntryRemoved(entry: SplitEntry): void {
    this.entries.update(list => list.filter(item => !this.isSameEntry(item, entry)));
  }

  protected async saveSplits(): Promise<void> {
    if (this.isSaving()) return;

    this.clearMessages();

    const entries = this.entries();
    const validationError = this.validateEntries(entries);

    if (validationError) {
      this.errorMessage.set(validationError);
      return;
    }

    this.isSaving.set(true);

    try {
      const entriesWithHolders = await this.ensureRightsHolderIds(entries);

      const normalizeContributionTypes = (entry: SplitEntry) => ({
        melody: entry.contributionTypes?.melody ?? false,
        harmony: entry.contributionTypes?.harmony ?? false,
        arrangement: entry.contributionTypes?.arrangement ?? false,
      });
      const makeEmptyContributionTypes = () => ({ melody: false, harmony: false, arrangement: false });

      const ipPayload = entriesWithHolders
        .filter(entry => entry.splitType === 'lyrics' || entry.splitType === 'music')
        .map(entry => ({
          rights_holder_id: entry.rightsHolderId!,
          split_type: entry.splitType,
          ownership_percentage: Number(entry.ownershipPercentage || 0),
          rights_layer: 'ip' as RightsLayer,
          contribution_types:
            entry.splitType === 'music'
              ? normalizeContributionTypes(entry)
              : makeEmptyContributionTypes(),
          roles: [],
          notes: undefined,
        }));

      const neighbouringPayload = entriesWithHolders
        .filter(entry => entry.splitType === 'neighbouring')
        .map(entry => ({
          rights_holder_id: entry.rightsHolderId!,
          split_type: 'neighboring_rights' as DbSplitType,
          ownership_percentage: Number(entry.ownershipPercentage || 0),
          rights_layer: 'neighboring' as RightsLayer,
          contribution_types: makeEmptyContributionTypes(),
          roles: entry.roles && entry.roles.length ? entry.roles : [],
          notes: undefined,
        }));

      await this.worksService.saveWorkSplits(this.workId, ipPayload, neighbouringPayload);
      this.successMessage.set('Splits saved successfully.');
      await this.loadData(this.workId);
    } catch (error) {
      console.error('Failed to save splits', error);
      this.errorMessage.set('Unable to save splits. Please try again.');
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async downloadPdf(): Promise<void> {
    this.clearMessages();

    const work = this.work();
    if (!work) {
      this.errorMessage.set('Work details are missing.');
      return;
    }

    if (this.entries().some(entry => !entry.rightsHolderId)) {
      this.errorMessage.set('Save your splits before downloading the PDF.');
      return;
    }

    try {
      const ipRows: WorkSplitRow[] = this.entries()
        .filter(entry => entry.splitType === 'lyrics' || entry.splitType === 'music')
        .map(entry => {
          const dbSplitType: DbSplitType = entry.splitType === 'lyrics' ? 'lyrics' : 'music';
          return {
            work_id: work.id,
            rights_holder_id: entry.rightsHolderId!,
            split_type: dbSplitType,
            ownership_percentage: entry.ownershipPercentage || 0,
            rights_layer: 'ip' as RightsLayer,
            rights_holder: this.findRightsHolderById(entry.rightsHolderId),
            contribution_types: entry.contributionTypes ?? null,
          } satisfies WorkSplitRow;
        });

      const neighbouringRows: WorkSplitRow[] = this.entries()
        .filter(entry => entry.splitType === 'neighbouring')
        .map(entry => ({
          work_id: work.id,
          rights_holder_id: entry.rightsHolderId!,
          split_type: 'neighboring_rights' as DbSplitType,
          ownership_percentage: entry.ownershipPercentage || 0,
          rights_layer: 'neighboring' as RightsLayer,
          rights_holder: this.findRightsHolderById(entry.rightsHolderId),
          roles: entry.roles ?? null,
        }));

      const blob = await this.pdfGenerator.generateSplitSheetPDF(work, ipRows, neighbouringRows);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${work.work_title.replace(/\s+/g, '-').toLowerCase()}-splits.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate PDF', error);
      this.errorMessage.set('Unable to generate the split sheet PDF right now.');
    }
  }

  protected cancel(): void {
    this.router.navigate(['/works']);
  }

  private async loadData(workId: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const work = await this.worksService.getWork(workId);
      if (!work) {
        throw new Error('Work not found');
      }

      this.work.set(work);
      await this.rightsHoldersService.loadRightsHolders(work.workspace_id);

      const splits = await this.worksService.getWorkSplits(workId);
      const hydrated = splits.map(split => this.hydrateEntry(mapSplitToEntry(split)));
      this.entries.set(hydrated);
    } catch (error) {
      console.error('Failed to load split data', error);
      this.errorMessage.set('Unable to load split details. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private hydrateEntry(entry: SplitEntry): SplitEntry {
    const holder = this.findRightsHolderById(entry.rightsHolderId);

    if (!holder) {
      return this.applyCategoryDefaults({
        ...entry,
        tempId: entry.tempId ?? this.generateTempId(),
      });
    }

    return this.applyCategoryDefaults({
      ...entry,
      tempId: entry.tempId ?? this.generateTempId(),
      nickname: holder.nickname ?? entry.nickname,
      displayName: holder.display_name ?? entry.displayName ?? holder.nickname,
      firstName: holder.first_name ?? entry.firstName ?? holder.nickname ?? '',
      lastName: holder.last_name ?? entry.lastName,
      email: holder.email ?? entry.email,
      cmoPro: holder.cmo_pro ?? entry.cmoPro,
      ipiNumber: holder.ipi_number ?? entry.ipiNumber,
      aiDisclosure: holder.ai_disclosure
        ? {
            creationType: holder.ai_disclosure.creation_type,
            aiTool: holder.ai_disclosure.ai_tool ?? undefined,
            notes: holder.ai_disclosure.notes ?? undefined,
          }
        : entry.aiDisclosure ?? { creationType: 'human' },
      isReadonly: entry.entryMethod !== 'add_manually',
    });
  }

  private applyCategoryDefaults(entry: SplitEntry): SplitEntry {
    const base: SplitEntry = {
      ...entry,
      tempId: entry.tempId ?? this.generateTempId(),
    };

    if (entry.splitType === 'music') {
      base.contributionTypes = {
        melody: entry.contributionTypes?.melody ?? false,
        harmony: entry.contributionTypes?.harmony ?? false,
        arrangement: entry.contributionTypes?.arrangement ?? false,
      };
    }

    if (entry.splitType === 'neighbouring') {
      base.roles = entry.roles ? [...entry.roles] : [];
    }

    return base;
  }

  private async ensureRightsHolderIds(entries: SplitEntry[]): Promise<SplitEntry[]> {
    const resolved: SplitEntry[] = [];

    for (const entry of entries) {
      if (entry.rightsHolderId) {
        resolved.push(entry);
        continue;
      }

      const holder = await this.createRightsHolder(entry);
      resolved.push({ ...entry, rightsHolderId: holder.id });
    }

    return resolved;
  }

  private async createRightsHolder(entry: SplitEntry): Promise<RightsHolder> {
    const form: RightsHolderFormData & { profile_id?: string } = {
      type: 'person',
      kind: this.resolveRightsHolderKind(entry),
      first_name: entry.firstName,
      last_name: entry.lastName,
      email: entry.email,
      cmo_pro: entry.cmoPro,
      ipi_number: entry.ipiNumber,
      nickname: entry.nickname,
      display_name: entry.displayName,
      ai_disclosure: {
        creation_type: entry.aiDisclosure.creationType,
        ai_tool: entry.aiDisclosure.aiTool,
        notes: entry.aiDisclosure.notes,
      },
    };

    if (entry.entryMethod === 'add_me') {
      const profile = this.profileService.currentProfile;
      if (profile) {
        form.profile_id = profile.id;
      }
    }

    return await this.rightsHoldersService.createRightsHolder(form);
  }

  private resolveRightsHolderKind(entry: SplitEntry): RightsHolderKind {
    if (entry.splitType === 'lyrics') return 'author';
    if (entry.splitType === 'music') return 'composer';
    return 'artist';
  }

  private validateEntries(entries: SplitEntry[]): string | null {
    if (!entries.length) {
      return 'Add at least one rights holder before saving.';
    }

    for (const entry of entries) {
      const result = this.splitCalculator.validateEntry(entry);
      if (!result.valid) {
        return result.errors[0];
      }
    }

    const tolerance = 0.01;
    const groups: Array<{ key: SplitCategory; label: string }> = [
      { key: 'lyrics', label: 'Lyrics' },
      { key: 'music', label: 'Music' },
      { key: 'neighbouring', label: 'Neighbouring rights' },
    ];

    for (const group of groups) {
      const groupEntries = entries.filter(entry => entry.splitType === group.key);
      if (!groupEntries.length) continue;

      const total = groupEntries.reduce((sum, entry) => sum + (entry.ownershipPercentage || 0), 0);
      if (Math.abs(total - 100) > tolerance) {
        return `${group.label} splits must add up to 100%. Currently ${total.toFixed(2)}%.`;
      }
    }

    return null;
  }

  private async handleQrPayload(raw: string): Promise<void> {
    try {
      const data = JSON.parse(raw) as { user_number?: number; type?: string; platform?: string };
      if (!data || data.type !== 'connect' || typeof data.user_number !== 'number') {
        throw new Error('Invalid QR code');
      }

      const profile = await this.profileService.getProfileByUserNumber(data.user_number);
      if (!profile) {
        throw new Error('Profile not found');
      }

      const splitType = this.qrTargetSplitType();
      if (!splitType) return;

      const existingHolder = this.findRightsHolderByProfileId(profile.id);
      if (existingHolder && this.isDuplicateEntry(existingHolder.id, splitType)) {
        this.qrError.set('This profile is already part of the selected split.');
        return;
      }

      const entry = existingHolder
        ? this.createEntryFromRightsHolder(existingHolder, splitType, 'scan_qr')
        : this.applyCategoryDefaults({
            tempId: this.generateTempId(),
            entryMethod: 'scan_qr',
            splitType,
            ownershipPercentage: 0,
            nickname: profile.nickname,
              displayName: profile.nickname,
            firstName: profile.nickname,
            aiDisclosure: { creationType: 'human' },
            isReadonly: false,
          });

      this.entries.update(list => [...list, entry]);
      this.stopQrFlow();
    } catch (error) {
      console.error('QR payload error', error);
      this.qrError.set('Unable to read this QR code.');
    }
  }

  private handleQrError(error: unknown): void {
    console.error('QR scanning error', error);
    this.qrError.set('Unable to access the camera.');
  }

  private createEntryFromRightsHolder(holder: RightsHolder, splitType: SplitCategory, method: EntryMethod): SplitEntry {
    return this.applyCategoryDefaults({
      tempId: this.generateTempId(),
      rightsHolderId: holder.id,
      entryMethod: method,
      splitType,
      ownershipPercentage: 0,
      nickname: holder.nickname,
      displayName: holder.display_name ?? holder.nickname ?? `${holder.first_name ?? ''} ${holder.last_name ?? ''}`.trim(),
      firstName: holder.first_name ?? holder.nickname ?? '',
      lastName: holder.last_name ?? '',
      email: holder.email,
      cmoPro: holder.cmo_pro,
      ipiNumber: holder.ipi_number,
      aiDisclosure: holder.ai_disclosure
        ? {
            creationType: holder.ai_disclosure.creation_type,
            aiTool: holder.ai_disclosure.ai_tool ?? undefined,
            notes: holder.ai_disclosure.notes ?? undefined,
          }
        : { creationType: 'human' },
      isReadonly: method !== 'add_manually',
    });
  }

  private isSameEntry(a: SplitEntry, b: SplitEntry): boolean {
    if (a.id && b.id) return a.id === b.id;
    if (a.tempId && b.tempId) return a.tempId === b.tempId;
    return false;
  }

  private isDuplicateEntry(holderId: string | undefined, splitType: SplitCategory): boolean {
    if (!holderId) return false;
    return this.entries().some(entry => entry.rightsHolderId === holderId && entry.splitType === splitType);
  }

  private findRightsHolderById(id?: string): RightsHolder | null {
    if (!id) return null;
    return this.rightsHolders().find(rh => rh.id === id) ?? null;
  }

  private findRightsHolderByProfileId(profileId?: string): RightsHolder | undefined {
    if (!profileId) return undefined;
    return this.rightsHolders().find(rh => rh.profile_id === profileId);
  }

  private generateTempId(): string {
    const cryptoRef = globalThis.crypto as Crypto | undefined;
    if (cryptoRef?.randomUUID) {
      return cryptoRef.randomUUID();
    }
    return `tmp-${Math.random().toString(36).slice(2, 10)}`;
  }

  private clearMessages(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }
}

export type DbSplitType =
  | 'lyrics'
  | 'music'
  | 'publishing'
  | 'performance'
  | 'master_recording'
  | 'neighboring_rights';

export type RightsLayer = 'ip' | 'neighboring';

export interface WorkSplitRow {
  id?: string;
  work_id: string;
  rights_holder_id: string;
  split_type: DbSplitType;
  ownership_percentage: number;
  percentage?: number;
  notes?: string | null;
  rights_layer?: RightsLayer;
  rights_holder?: RightsHolder | null;
  contribution_types?: SplitEntry['contributionTypes'] | null;
  roles?: string[] | null;
}

export interface WorkSplitUpsert {
  rights_holder_id: string;
  split_type: DbSplitType;
  ownership_percentage: number;
  rights_layer: RightsLayer;
  notes?: string;
  contribution_types?: SplitEntry['contributionTypes'] | null;
  roles?: string[] | null;
}

