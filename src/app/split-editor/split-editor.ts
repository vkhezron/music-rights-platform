import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideAngularModule, History } from 'lucide-angular';

import { SplitEntryCardComponent } from './components/split-entry-card.component';
import { SplitCalculatorService } from './services/split-calculator.service';
import { mapSplitToEntry, SplitEntry } from './models/split-entry.model';
import { WorksService } from '../services/works';
import { RightsHoldersService } from '../services/rights-holder';
import { ProfileService } from '../services/profile.service';
import { QRScannerService } from '../services/qr-scanner.service';
import { PdfGeneratorService } from '../services/pdf-generator.service';
import { SupabaseService } from '../services/supabase.service';

import type { Work, WorkChangeRecord } from '../models/work.model';
import type { RightsHolder, RightsHolderFormData, RightsHolderKind } from '../../models/rights-holder.model';

type SplitCategory = 'lyrics' | 'music' | 'neighbouring';
type EntryMethod = SplitEntry['entryMethod'];

@Component({
  selector: 'app-split-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, SplitEntryCardComponent, LucideAngularModule],
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
  private readonly translate = inject(TranslateService);

  @ViewChild('qrVideo') qrVideo?: ElementRef<HTMLVideoElement>;

  protected readonly Math = Math;
  protected readonly History = History;

  private workId = '';
  private readonly totalTolerance = 0.01;

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

  private qrDecodeHintTimer: ReturnType<typeof setTimeout> | null = null;

  protected showChangeHistory = signal(false);
  protected changeHistoryLoading = signal(false);
  protected changeHistory = signal<WorkChangeRecord[]>([]);
  protected changeHistoryError = signal<string | null>(null);

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

  protected readonly lyricsStatus = computed(() => this.computeTotalStatus('lyrics'));
  protected readonly musicStatus = computed(() => this.computeTotalStatus('music'));
  protected readonly neighbouringStatus = computed(() => this.computeTotalStatus('neighbouring'));
  protected readonly totalStatuses = computed(() => [this.lyricsStatus(), this.musicStatus(), this.neighbouringStatus()]);
  protected readonly hasAnyEntries = computed(() => this.entries().length > 0);
  protected readonly totalsBalanced = computed(() =>
    this.totalStatuses().every(status => !status.hasEntries || status.state === 'complete')
  );
  protected readonly canSubmit = computed(() => this.hasAnyEntries() && this.totalsBalanced());
  protected readonly saveDisabled = computed(() => this.isSaving() || this.isLoading() || !this.canSubmit());
  protected readonly saveBlockedReason = computed(() => this.resolveSaveBlockedReason());
  protected readonly totalsAlertMessage = computed(() => this.resolveTotalsAlertMessage());

  protected readonly trackEntry = (_index: number, entry: SplitEntry) =>
    entry.id ?? entry.tempId ?? `${_index}`;

  protected totalHint(status: SplitTotalStatus): string {
    if (!status.hasEntries) {
      return this.translate.instant('SPLITS.TOTAL_HINT_EMPTY');
    }

    if (status.state === 'complete') {
      return this.translate.instant('SPLITS.TOTAL_HINT_COMPLETE');
    }

    const diff = Math.abs(status.difference).toFixed(2);
    const key = status.state === 'under' ? 'SPLITS.TOTAL_HINT_MISSING' : 'SPLITS.TOTAL_HINT_OVER';
    return this.translate.instant(key, { value: diff });
  }

  constructor() {
    this.rightsHoldersService.rightsHolders$
      .pipe(takeUntilDestroyed())
      .subscribe(list => this.rightsHolders.set(list));
  }

  private computeTotalStatus(category: SplitCategory): SplitTotalStatus {
    return this.computeTotalStatusInternal(this.entries(), category);
  }

  private computeTotalStatusInternal(entries: SplitEntry[], category: SplitCategory): SplitTotalStatus {
    const categoryEntries = entries.filter(entry => entry.splitType === category);
    const total = categoryEntries.reduce((sum, entry) => sum + (entry.ownershipPercentage || 0), 0);
    const difference = total - 100;
    const hasEntries = categoryEntries.length > 0;

    if (!hasEntries) {
      return {
        category,
        total,
        difference,
        state: 'empty',
        hasEntries,
      };
    }

    if (Math.abs(difference) <= this.totalTolerance) {
      return {
        category,
        total,
        difference,
        state: 'complete',
        hasEntries,
      };
    }

    return {
      category,
      total,
      difference,
      state: difference > 0 ? 'over' : 'under',
      hasEntries,
    };
  }

  private resolveSaveBlockedReason(): string {
    if (this.isSaving() || this.isLoading()) {
      return '';
    }

    if (!this.hasAnyEntries()) {
      return this.translate.instant('SPLITS.SAVE_DISABLED_NO_ENTRIES');
    }

    const issue = this.totalStatuses().find(status => status.hasEntries && status.state !== 'complete');
    if (!issue) {
      return '';
    }

    if (issue.state !== 'over') {
      return '';
    }

    const diff = Math.abs(issue.difference).toFixed(2);
    const categoryLabel = this.translate.instant(this.categoryTranslationKey(issue.category));
    return this.translate.instant('SPLITS.SAVE_DISABLED_OVER', { value: diff, category: categoryLabel });
  }

  private resolveTotalsAlertMessage(): string {
    if (!this.hasAnyEntries()) {
      return this.translate.instant('SPLITS.TOTAL_ALERT_NO_ENTRIES');
    }

    const issue = this.totalStatuses().find(status => status.hasEntries && status.state !== 'complete');
    if (!issue) {
      return '';
    }

    const diff = Math.abs(issue.difference).toFixed(2);
    const categoryLabel = this.translate.instant(this.categoryTranslationKey(issue.category));
    const key = issue.state === 'under' ? 'SPLITS.TOTAL_ALERT_MISSING' : 'SPLITS.TOTAL_ALERT_OVER';
    return this.translate.instant(key, { value: diff, category: categoryLabel });
  }

  protected getChangeTypeTranslationKey(changeType: string): string {
    const mapping: Record<string, string> = {
      work_create: 'WORKS.CHANGE_HISTORY.TYPE.WORK_CREATE',
      work_update: 'WORKS.CHANGE_HISTORY.TYPE.WORK_UPDATE',
      work_delete: 'WORKS.CHANGE_HISTORY.TYPE.WORK_DELETE',
      split_create: 'WORKS.CHANGE_HISTORY.TYPE.SPLIT_CREATE',
      split_update: 'WORKS.CHANGE_HISTORY.TYPE.SPLIT_UPDATE',
      split_delete: 'WORKS.CHANGE_HISTORY.TYPE.SPLIT_DELETE',
    };

    return mapping[changeType] ?? 'WORKS.CHANGE_HISTORY.TYPE.UNKNOWN';
  }

  protected describeChangedField(entry: WorkChangeRecord): string | null {
    const field = entry.field_changed;
    if (!field) {
      return null;
    }

    const base = field.includes('.') ? field.split('.').pop() ?? field : field;
    const trimmed = base.trim();

    if (!trimmed) {
      return null;
    }

    if (/^(isrc|iswc)$/i.test(trimmed)) {
      return trimmed.toUpperCase();
    }

    if (trimmed === 'split_id' && entry.split_id) {
      return this.translate.instant('SPLITS.CHANGE_HISTORY.SPLIT_LABEL', { value: entry.split_id });
    }

    const spaced = trimmed.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
    return this.toTitleCase(spaced);
  }

  protected formatChangeValue(value?: string | null): string | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    const looksLikeJson =
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'));

    if (looksLikeJson) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map(item => this.describeValue(item)).join(', ');
        }

        if (parsed && typeof parsed === 'object') {
          return this.describeObject(parsed as Record<string, unknown>);
        }
      } catch {
        // Ignore parse failure and fall through to raw value.
      }
    }

    return this.describeValue(value);
  }

  protected async openChangeHistory(): Promise<void> {
    if (!this.workId) {
      return;
    }

    this.showChangeHistory.set(true);
    this.changeHistoryLoading.set(true);
    this.changeHistoryError.set(null);
    this.changeHistory.set([]);

    try {
      const entries = await this.worksService.getWorkChangeHistory(this.workId);
      const splitEntries = entries.filter(entry => entry.entity_type === 'split');
      const enrichedEntries = await this.attachChangeActorProfiles(splitEntries);
      this.changeHistory.set(enrichedEntries);
    } catch (error) {
      console.error('Failed to load split change history', error);
      const fallback = this.translate.instant('SPLITS.CHANGE_HISTORY.ERROR');
      this.changeHistoryError.set(fallback);
    } finally {
      this.changeHistoryLoading.set(false);
    }
  }

  protected closeChangeHistory(): void {
    this.showChangeHistory.set(false);
  }

  private async attachChangeActorProfiles(entries: WorkChangeRecord[]): Promise<WorkChangeRecord[]> {
    const actorIds = Array.from(
      new Set(entries.map(entry => entry.changed_by).filter((value): value is string => !!value))
    );

    if (!actorIds.length) {
      return entries;
    }

    try {
      const profiles = await this.profileService.getProfilesByIds(actorIds);
      if (!profiles.length) {
        return entries;
      }

      const profileMap = new Map(profiles.map(profile => [profile.id, profile]));
      return entries.map(entry => {
        const actorId = entry.changed_by;
        if (!actorId) {
          return entry;
        }

        const profile = profileMap.get(actorId);
        if (!profile) {
          return entry;
        }

        return {
          ...entry,
          changed_by_nickname: profile.nickname ?? null,
          changed_by_display_name: profile.display_name ?? null,
        } satisfies WorkChangeRecord;
      });
    } catch (error) {
      console.error('Failed to load change actor profiles', error);
      return entries;
    }
  }

  private async ensureCameraAccess(): Promise<boolean> {
    if (this.hasCameraSupport()) {
      return true;
    }

    const permissionGranted = await this.qrScannerService.requestCameraPermission();
    if (!permissionGranted) {
      this.errorMessage.set(this.translate.instant('SPLITS.QR_CAMERA_PERMISSION_DENIED'));
      return false;
    }

    const supported = await this.qrScannerService.hasCameraSupport();
    this.hasCameraSupport.set(supported);

    if (!supported) {
      this.errorMessage.set(this.translate.instant('SPLITS.QR_CAMERA_UNAVAILABLE'));
    }

    return supported;
  }

  private toTitleCase(input: string): string {
    return input
      .split(' ')
      .filter(Boolean)
      .map(segment => {
        if (segment.length <= 3) {
          return segment.toUpperCase();
        }
        return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
      })
      .join(' ');
  }

  private describeValue(value: unknown): string {
    if (value === null || value === undefined) {
      return this.translate.instant('SPLITS.CHANGE_HISTORY.EMPTY');
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();

      if (!trimmed.length) {
        return this.translate.instant('SPLITS.CHANGE_HISTORY.EMPTY');
      }

      const lowered = trimmed.toLowerCase();
      if (lowered === 'true' || lowered === 'false') {
        return this.translate.instant(lowered === 'true' ? 'COMMON.YES' : 'COMMON.NO');
      }

      if (!Number.isNaN(Number(trimmed))) {
        return Number(trimmed).toLocaleString();
      }

      return trimmed;
    }

    if (typeof value === 'number') {
      return value.toLocaleString();
    }

    if (typeof value === 'boolean') {
      return this.translate.instant(value ? 'COMMON.YES' : 'COMMON.NO');
    }

    if (Array.isArray(value)) {
      if (!value.length) {
        return this.translate.instant('SPLITS.CHANGE_HISTORY.EMPTY');
      }

      return value.map(item => this.describeValue(item)).join(', ');
    }

    if (value && typeof value === 'object') {
      return this.describeObject(value as Record<string, unknown>);
    }

    return String(value);
  }

  private describeObject(value: Record<string, unknown>): string {
    const readString = (key: string): string | null => {
      const raw = value[key];
      if (typeof raw === 'string') {
        const trimmed = raw.trim();
        return trimmed.length ? raw : trimmed;
      }
      return null;
    };

    const pickFirstString = (...keys: readonly string[]): string | null => {
      for (const key of keys) {
        const candidate = readString(key);
        if (candidate) {
          return candidate;
        }
      }
      return null;
    };
    const addSummary = (text?: string | null) => {
      if (!text) {
        return;
      }

      const trimmed = text.trim();
      if (!trimmed.length) {
        return;
      }

      if (!summaryParts.includes(trimmed)) {
        summaryParts.push(trimmed);
      }
    };

    const summaryParts: string[] = [];

    const rightsHolderId = value['rights_holder_id'] ?? value['rightsHolderId'];
    if (typeof rightsHolderId === 'string') {
      addSummary(this.resolveRightsHolderName(rightsHolderId));
    }

    const titleCandidate = pickFirstString('title', 'name', 'display_name');
    addSummary(titleCandidate);

    if (typeof value['nickname'] === 'string') {
      const normalized = value['nickname'].replace(/^@/, '').trim();
      addSummary(normalized ? `@${normalized}` : null);
    }

    const percentageRaw = value['ownership_percentage'] ?? value['percentage'];
    const percentage =
      typeof percentageRaw === 'number'
        ? percentageRaw
        : typeof percentageRaw === 'string' && percentageRaw.trim().length && !Number.isNaN(Number(percentageRaw))
        ? Number(percentageRaw)
        : null;
    if (typeof percentage === 'number') {
      addSummary(`${percentage.toFixed(2)}%`);
    }

    const splitTypeRaw = value['split_type'] ?? value['splitType'];
    if (typeof splitTypeRaw === 'string') {
      let normalized = splitTypeRaw.toLowerCase();
      if (normalized === 'neighboring') {
        normalized = 'neighbouring';
      }

      if (normalized === 'lyrics' || normalized === 'music' || normalized === 'neighbouring') {
        addSummary(this.translate.instant(this.categoryTranslationKey(normalized as SplitCategory)));
      }
    }

    const hiddenKeys = new Set([
      'id',
      'work_id',
      'rights_holder_id',
      'rightsHolderId',
      'rights_holder_profile_id',
      'created_at',
      'updated_at',
      'version',
      'split_id',
      'splitId',
    ]);

    const summaryKeys = new Set([
      'title',
      'name',
      'display_name',
      'nickname',
      'ownership_percentage',
      'percentage',
      'split_type',
      'splitType',
    ]);

    const detailLines: string[] = [];
    for (const [key, val] of Object.entries(value)) {
      if (hiddenKeys.has(key) || summaryKeys.has(key)) {
        continue;
      }

      if (val === undefined) {
        continue;
      }

      const label = this.toTitleCase(key.replace(/[_-]+/g, ' '));
      detailLines.push(`${label}: ${this.describeValue(val)}`);
    }

    const summary = summaryParts.join(' • ');

    if (summary && detailLines.length) {
      return `${summary}\n${detailLines.join('\n')}`;
    }

    if (summary) {
      return summary;
    }

    if (detailLines.length) {
      return detailLines.join('\n');
    }

    return this.translate.instant('SPLITS.CHANGE_HISTORY.EMPTY');
  }

  private resolveRightsHolderName(id: string): string | null {
    const holder = this.rightsHolders().find(item => item.id === id);
    if (!holder) {
      return null;
    }

    const displayName = holder.display_name?.trim() ?? `${holder.first_name ?? ''} ${holder.last_name ?? ''}`.trim();
    const nickname = holder.nickname ? holder.nickname.replace(/^@/, '').trim() : '';

    if (displayName && nickname) {
      return `${displayName} (@${nickname})`;
    }

    if (displayName) {
      return displayName;
    }

    if (nickname) {
      return `@${nickname}`;
    }

    return null;
  }

  private categoryTranslationKey(category: SplitCategory): string {
    switch (category) {
      case 'lyrics':
        return 'PROTOCOL.LYRICS';
      case 'music':
        return 'PROTOCOL.MUSIC';
      default:
        return 'SPLITS.NEIGHBORING_RIGHTS';
    }
  }

  async ngOnInit(): Promise<void> {
    const workId = this.route.snapshot.paramMap.get('id');
    if (!workId) {
      this.router.navigate(['/works']);
      return;
    }

    this.workId = workId;
    this.hasCameraSupport.set(await this.qrScannerService.hasCameraSupport());
    await this.ensureProfileLoaded();
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

    if (!(await this.ensureCameraAccess())) {
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
    if (this.qrDecodeHintTimer) {
      clearTimeout(this.qrDecodeHintTimer);
      this.qrDecodeHintTimer = null;
    }
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

    const preparedEntries = this.entries().map(entry => this.ensureEntryNickname(entry));
    this.entries.set(preparedEntries);

    if (!this.canSubmit()) {
      const reason = this.saveBlockedReason();
      if (reason) {
        this.errorMessage.set(reason);
      }
      return;
    }

    const validationError = this.validateEntries(preparedEntries);

    if (validationError) {
      this.errorMessage.set(validationError);
      return;
    }

    this.isSaving.set(true);

    try {
      const entriesWithHolders = await this.ensureRightsHolderIds(preparedEntries);

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

      await this.pdfGenerator.downloadProtocol(work, ipRows, neighbouringRows);
    } catch (error) {
      console.error('Failed to generate PDF', error);
      this.errorMessage.set('Unable to generate the protocol PDF right now.');
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

  private ensureEntryNickname(entry: SplitEntry): SplitEntry {
    const direct = this.normalizeNickname(entry.nickname);
    if (direct) {
      return { ...entry, nickname: direct };
    }

    const candidates = [
      entry.displayName,
      `${entry.firstName ?? ''} ${entry.lastName ?? ''}`.trim(),
      entry.email ? entry.email.split('@')[0] : undefined,
    ];

    for (const candidate of candidates) {
      const normalized = this.normalizeNickname(candidate);
      if (normalized) {
        return { ...entry, nickname: normalized };
      }
    }

    return { ...entry, nickname: this.generateFallbackNickname() };
  }

  private normalizeNickname(value?: string | null): string | undefined {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    const lower = trimmed.toLowerCase();
    const withoutPrefix = lower.startsWith('@') ? lower.slice(1) : lower;
    const sanitized = withoutPrefix
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return sanitized || undefined;
  }

  private generateFallbackNickname(): string {
    const cryptoRef = globalThis.crypto as Crypto | undefined;
    const fragment = cryptoRef?.randomUUID?.().split('-')[0] ?? Math.random().toString(36).slice(2, 8);
    return `holder-${fragment}`;
  }

  protected shouldShowAddMe(splitType: SplitCategory): boolean {
    if (!this.supabase.currentUser && !this.profileService.currentProfile) {
      return false;
    }

    return !this.entries()
      .filter(entry => entry.splitType === splitType)
      .some(entry => this.entryBelongsToCurrentUser(entry));
  }

  private entryBelongsToCurrentUser(entry: SplitEntry): boolean {
    const profile = this.profileService.currentProfile;
    const currentUser = this.supabase.currentUser;

    if (entry.entryMethod === 'add_me') {
      return true;
    }

    if (!entry.rightsHolderId) {
      return false;
    }

    const holder = this.findRightsHolderById(entry.rightsHolderId);
    if (!holder) {
      return false;
    }

    if (profile?.id && holder.profile_id === profile.id) {
      return true;
    }

    if (currentUser?.id && holder.linked_user_id === currentUser.id) {
      return true;
    }

    if (profile?.nickname && holder.nickname === profile.nickname) {
      return true;
    }

    if (currentUser?.email && holder.email === currentUser.email) {
      return true;
    }

    return false;
  }

  private async ensureProfileLoaded(): Promise<void> {
    const currentUser = this.supabase.currentUser;
    if (!currentUser?.id) {
      return;
    }

    if (this.profileService.currentProfile) {
      return;
    }

    try {
      await this.profileService.loadProfile(currentUser.id);
    } catch (error) {
      console.warn('Unable to preload profile for split editor', error);
    }
  }

  private async ensureRightsHolderIds(entries: SplitEntry[]): Promise<SplitEntry[]> {
    const resolved: SplitEntry[] = [];

    for (const entry of entries) {
      const normalized = this.ensureEntryNickname(entry);

      if (normalized.rightsHolderId) {
        resolved.push(normalized);
        continue;
      }

      const holder = await this.createRightsHolder(normalized);
      resolved.push({ ...normalized, rightsHolderId: holder.id });
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

    const groups: SplitCategory[] = ['lyrics', 'music', 'neighbouring'];

    for (const category of groups) {
      const status = this.computeTotalStatusInternal(entries, category);
      if (!status.hasEntries) continue;

      const label = this.translate.instant(this.categoryTranslationKey(category));

      if (status.state === 'over') {
        return `${label} splits exceed 100%. Currently ${status.total.toFixed(2)}%.`;
      }
    }

    return null;
  }

  private async handleQrPayload(raw: string): Promise<void> {
    try {
      const data = JSON.parse(raw) as { user_number?: number | string; type?: string; platform?: string };

      const userNumber =
        typeof data?.user_number === 'string'
          ? Number(data.user_number)
          : data?.user_number;

      if (!data || data.type !== 'connect' || typeof userNumber !== 'number' || Number.isNaN(userNumber)) {
        this.qrError.set('This QR code is not recognized. Scan a profile QR from the Music Rights Platform app.');
        return;
      }

      const profile = await this.profileService.getProfileByUserNumber(userNumber);
      if (!profile) {
        this.qrError.set('We could not find that profile. Ask your collaborator to refresh and share their QR code again.');
        return;
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
      this.qrError.set('We could not process this QR code. Please try again with a profile QR generated in Music Rights Platform.');
    }
  }

  private handleQrError(error: unknown): void {
    const classification = this.classifyQrError(error);

    if (classification === 'decode') {
      if (!this.qrDecodeHintTimer) {
        this.qrDecodeHintTimer = setTimeout(() => {
          if (this.isQrModalOpen()) {
            this.qrError.set('We could not detect a QR code yet. Try adjusting the camera or lighting.');
          }
          this.qrDecodeHintTimer = null;
        }, 1200);
      }
      return;
    }

    console.error('QR scanning error', error);
    const message = this.resolveCameraErrorMessage(error);
    this.qrError.set(message);
  }

  private classifyQrError(error: unknown): 'decode' | 'camera' {
    const err = error as { name?: string; message?: string } | undefined;
    const name = (err?.name ?? '').toLowerCase();
    const message = (err?.message ?? '').toLowerCase();

    if (name.includes('notfound') || message.includes('no multiformat readers')) {
      return 'decode';
    }

    if (message.includes('qr code not found') || message.includes('no code found')) {
      return 'decode';
    }

    return 'camera';
  }

  private resolveCameraErrorMessage(error: unknown): string {
    const err = error as { message?: string } | undefined;
    const message = (err?.message ?? '').toLowerCase();

    if (message.includes('not allowed') || message.includes('permission')) {
      return 'Camera access is blocked. Enable permissions and try again.';
    }

    if (message.includes('no camera') || message.includes('not found on this device')) {
      return 'No camera was detected on this device.';
    }

    return 'Unable to access the camera.';
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

export interface SplitTotalStatus {
  category: SplitCategory;
  total: number;
  difference: number;
  state: 'empty' | 'complete' | 'under' | 'over';
  hasEntries: boolean;
}

