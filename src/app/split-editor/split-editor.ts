// src/app/works/split-editor/split-editor.ts

import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { WorksService } from '../services/works';
import { RightsHoldersService, RightsHolder } from '../services/rights-holder';
import { QRScannerService } from '../services/qr-scanner.service';
import { WorkspaceService } from '../services/workspace.service';
import { PdfGeneratorService } from '../services/pdf-generator.service';
import { Work } from '../../models/work.model';

// Lucide Icons
import {
  LucideAngularModule,
  ArrowLeft,
  Save,
  User,
  Building2,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  QrCode,
  X,
  FileText,
  Music,
} from 'lucide-angular';

/**
 * Minimal QR payload type used by your QR scanning logic.
 * (Fixes: "Cannot find name 'QRCodeData'")
 */
type QRCodeData = {
  type: string;
  user_id?: string;
  nickname?: string;
  email?: string;
};

/**
 * DB split types based on your current Postgres check constraint.
 */
export type DbSplitType =
  | 'lyric'
  | 'music'
  | 'publishing'
  | 'performance'
  | 'master'
  | 'neighboring';

/**
 * Row shape aligned to your DB table (important: percentage, not ownership_percentage).
 */
export interface WorkSplitRow {
  id?: string;
  work_id: string;
  rights_holder_id: string;
  split_type: DbSplitType;
  percentage: number;
  notes?: string | null;

  version?: number | null;
  is_active?: boolean | null;
  created_by?: string;
  created_at?: string;
  updated_at?: string;

  rights_holder?: RightsHolder;
}

/**
 * Payload we send to the service. Service should handle created_by/version/is_active.
 */
export interface WorkSplitUpsert {
  rights_holder_id: string;
  split_type: DbSplitType;
  percentage: number;
  notes?: string;
}

/**
 * Two-sheet UI tabs.
 */
export type SplitTab = 'ip' | 'neighboring';

// Which DB split types belong to which UI sheet
const IP_SPLIT_TYPES: DbSplitType[] = ['lyric', 'music', 'publishing'];
const NEIGHBORING_SPLIT_TYPES: DbSplitType[] = ['performance', 'master', 'neighboring'];

const DEFAULT_IP_TYPE: DbSplitType = 'music';
const DEFAULT_NEIGHBORING_TYPE: DbSplitType = 'master';

@Component({
  selector: 'app-split-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LucideAngularModule],
  templateUrl: './split-editor.html',
  styleUrl: './split-editor.scss',
})
export class SplitEditorComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private worksService = inject(WorksService);
  private rightsHoldersService = inject(RightsHoldersService);
  private qrScannerService = inject(QRScannerService);
  private workspaceService = inject(WorkspaceService);
  private pdfGenerator = inject(PdfGeneratorService);

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  // Icons
  readonly ArrowLeft = ArrowLeft;
  readonly Save = Save;
  readonly User = User;
  readonly Building2 = Building2;
  readonly Plus = Plus;
  readonly Trash2 = Trash2;
  readonly CheckCircle = CheckCircle;
  readonly AlertCircle = AlertCircle;
  readonly QrCode = QrCode;
  readonly X = X;
  readonly FileText = FileText;
  readonly Music = Music;

  // State
  work = signal<Work | null>(null);

  ipSplits = signal<WorkSplitRow[]>([]);
  neighboringSplits = signal<WorkSplitRow[]>([]);

  rightsHolders = signal<RightsHolder[]>([]);
  isLoading = signal(false);
  isSaving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  // Tabs
  activeTab = signal<SplitTab>('ip');

  // QR Scanner
  isScanning = signal(false);
  hasCameraSupport = signal(false);
  scanError = signal('');
  scanningFor = signal<SplitTab>('ip');

  // Add rights holder
  selectedRightsHolderId = '';
  addingManually = signal(false);

  // Options for DB split types within each tab
  ipTypeOptions = IP_SPLIT_TYPES.map((v) => ({
    value: v,
    label: v === 'lyric' ? 'Lyrics' : v === 'music' ? 'Music' : 'Publishing',
  }));

  neighboringTypeOptions = NEIGHBORING_SPLIT_TYPES.map((v) => ({
    value: v,
    label: v === 'performance' ? 'Performance' : v === 'master' ? 'Master' : 'Neighboring',
  }));

  currentSplits = computed(() =>
    this.activeTab() === 'ip' ? this.ipSplits() : this.neighboringSplits()
  );

  currentTypeOptions = computed(() =>
    this.activeTab() === 'ip' ? this.ipTypeOptions : this.neighboringTypeOptions
  );

  // Totals
  ipTotal = computed(() => this.ipSplits().reduce((s, r) => s + (Number(r.percentage) || 0), 0));
  neighboringTotal = computed(() =>
    this.neighboringSplits().reduce((s, r) => s + (Number(r.percentage) || 0), 0)
  );
  currentTotal = computed(() => (this.activeTab() === 'ip' ? this.ipTotal() : this.neighboringTotal()));

  // Validation
  ipValidation = computed(() => this.validateTab(this.ipSplits(), 'IP'));
  neighboringValidation = computed(() => this.validateTab(this.neighboringSplits(), 'Neighboring'));
  currentValidation = computed(() => (this.activeTab() === 'ip' ? this.ipValidation() : this.neighboringValidation()));
  overallValid = computed(() => this.ipValidation().isValid && this.neighboringValidation().isValid);

  // Rights holders not already in CURRENT tab
  availableRightsHolders = computed(() => {
    const usedIds = new Set(this.currentSplits().map((s) => s.rights_holder_id));
    return this.rightsHolders().filter((rh) => !usedIds.has(rh.id));
  });

  async ngOnInit() {
    const workId = this.route.snapshot.paramMap.get('id');
    if (!workId) {
      this.router.navigate(['/works']);
      return;
    }

    this.hasCameraSupport.set(await this.qrScannerService.hasCameraSupport());
    await this.loadData(workId);
  }

  ngOnDestroy() {
    this.stopScanning();
  }

  // =========================
  // Helpers
  // =========================
  private validateTab(splits: WorkSplitRow[], label: string) {
    const total = splits.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0);

    if (splits.length === 0) {
      return { isValid: false, class: 'invalid', message: `At least one ${label} rights holder is required` };
    }
    if (total === 100) {
      return { isValid: true, class: 'valid', message: 'Perfect! Total is 100%' };
    }
    if (total < 100) {
      return { isValid: false, class: 'under', message: `${(100 - total).toFixed(2)}% short of 100%` };
    }
    return { isValid: false, class: 'over', message: `Exceeds 100% by ${(total - 100).toFixed(2)}%` };
  }

  private isIpType(t: DbSplitType) {
    return IP_SPLIT_TYPES.includes(t);
  }

  /**
   * Normalizes values coming from older TS enums or old client data.
   * Fixes: 'lyrics' -> 'lyric'
   */
  private normalizeDbSplitType(t: any): DbSplitType {
    if (t === 'lyrics') return 'lyric';
    return t as DbSplitType;
  }

  getRightsHolderName(rh: RightsHolder): string {
    return this.rightsHoldersService.getDisplayName(rh);
  }

  getRightsHolderIcon(rh: RightsHolder): any {
    return rh.type === 'person' ? this.User : this.Building2;
  }

  // =========================
  // Data load
  // =========================
  async loadData(workId: string) {
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const workspace = this.workspaceService.currentWorkspace;
      if (!workspace) {
        this.router.navigate(['/dashboard']);
        return;
      }

      const work = await this.worksService.getWork(workId);
      if (!work) {
        this.errorMessage.set('Work not found');
        this.router.navigate(['/works']);
        return;
      }
      this.work.set(work);

      await this.rightsHoldersService.loadRightsHolders(workspace.id);

      // keep in sync; auto-unsub on destroy
      this.rightsHoldersService.rightsHolders$
        .pipe(takeUntilDestroyed())
        .subscribe((rhs) => this.rightsHolders.set(rhs));

      // Load existing splits (type in your service may still be WorkSplit[])
      const allSplits: any[] = (await this.worksService.getWorkSplits(workId)) as any[];

      // Attach rights_holder object if not already joined in query
      const rhsById = new Map(this.rightsHolders().map((r) => [r.id, r]));

      const enriched: WorkSplitRow[] = (allSplits || []).map((s: any) => ({
        ...s,
        split_type: this.normalizeDbSplitType(s.split_type),
        percentage: Number(s.percentage) || 0,
        rights_holder: s.rights_holder ?? rhsById.get(s.rights_holder_id),
      }));

      this.ipSplits.set(enriched.filter((s) => this.isIpType(s.split_type)));
      this.neighboringSplits.set(enriched.filter((s) => !this.isIpType(s.split_type)));
    } catch (e) {
      console.error(e);
      this.errorMessage.set('Failed to load split data');
    } finally {
      this.isLoading.set(false);
    }
  }

  // =========================
  // Tabs
  // =========================
  setActiveTab(tab: SplitTab) {
    this.activeTab.set(tab);
    this.addingManually.set(false);
    this.selectedRightsHolderId = '';
    this.scanError.set('');
  }

  // =========================
  // QR Scanning
  // =========================
  async startScanning() {
    if (!this.hasCameraSupport()) {
      this.scanError.set('No camera found on this device');
      return;
    }

    const hasPermission = await this.qrScannerService.requestCameraPermission();
    if (!hasPermission) {
      this.scanError.set('Camera permission denied');
      return;
    }

    this.isScanning.set(true);
    this.scanningFor.set(this.activeTab());
    this.scanError.set('');

    setTimeout(() => {
      if (this.videoElement) {
        this.qrScannerService.startScanning(
          this.videoElement.nativeElement,
          (result: string) => this.handleQRScan(result),
          (error: any) => this.handleScanError(error)
        );
      }
    }, 100);
  }

  stopScanning() {
    this.qrScannerService.stopScanning();
    this.isScanning.set(false);
  }

  async handleQRScan(qrData: string) {
    try {
      const data: QRCodeData = JSON.parse(qrData);

      if (data.type !== 'rights_holder_link') {
        this.scanError.set('Invalid QR code. Please scan a profile QR code.');
        return;
      }

      // Try to match the QR payload to a rights holder.
      // Accept either an id or an email in user_id/email.
      const key = data.user_id || data.email || '';
      const rightsHolder =
        this.rightsHolders().find((rh) => rh.id === key) ??
        this.rightsHolders().find((rh) => rh.email === key);

      if (!rightsHolder) {
        this.scanError.set(
          `${data.nickname || 'This user'} is not added as a rights holder in this project. Please add them first.`
        );
        return;
      }

      // Check already in current sheet
      const exists = this.currentSplits().some((s) => s.rights_holder_id === rightsHolder.id);
      if (exists) {
        this.scanError.set(`${data.nickname || 'This user'} is already in this split sheet`);
        return;
      }

      this.addSplit(rightsHolder.id);

      this.successMessage.set(
        `Added ${data.nickname || 'rights holder'} to ${this.activeTab() === 'ip' ? 'IP' : 'Neighboring'} rights`
      );
      setTimeout(() => this.successMessage.set(''), 3000);
      this.stopScanning();
    } catch (error) {
      console.error('Error parsing QR code:', error);
      this.scanError.set('Invalid QR code format');
    }
  }

  handleScanError(error: any) {
    console.error('Scan error:', error);
    const err = error as { name?: string };
    if (err.name !== 'NotFoundException') {
      this.scanError.set('Error scanning QR code. Please try again.');
    }
  }

  // =========================
  // Split management
  // =========================
  addSplit(rightsHolderId?: string) {
    const rhId = rightsHolderId || this.selectedRightsHolderId;
    if (!rhId || !this.work()) return;

    const rightsHolder = this.rightsHolders().find((rh) => rh.id === rhId);
    if (!rightsHolder) return;

    const defaultType: DbSplitType =
      this.activeTab() === 'ip' ? DEFAULT_IP_TYPE : DEFAULT_NEIGHBORING_TYPE;

    const newRow: WorkSplitRow = {
      work_id: this.work()!.id,
      rights_holder_id: rhId,
      rights_holder: rightsHolder,
      split_type: defaultType,
      percentage: 0,
      notes: '',
      is_active: true,
    };

    if (this.activeTab() === 'ip') {
      this.ipSplits.update((arr) => [...arr, newRow]);
    } else {
      this.neighboringSplits.update((arr) => [...arr, newRow]);
    }

    this.selectedRightsHolderId = '';
    this.addingManually.set(false);
  }

  removeSplit(index: number) {
    if (this.activeTab() === 'ip') {
      this.ipSplits.update((arr) => arr.filter((_, i) => i !== index));
    } else {
      this.neighboringSplits.update((arr) => arr.filter((_, i) => i !== index));
    }
  }

  updateSplitPercentage(index: number, value: string) {
    const pct = Number.parseFloat(value);
    const percentage = Number.isFinite(pct) ? pct : 0;

    if (this.activeTab() === 'ip') {
      this.ipSplits.update((arr) => {
        const copy = [...arr];
        copy[index] = { ...copy[index], percentage };
        return copy;
      });
    } else {
      this.neighboringSplits.update((arr) => {
        const copy = [...arr];
        copy[index] = { ...copy[index], percentage };
        return copy;
      });
    }
  }

  updateSplitType(index: number, split_type: string) {
    const normalized = this.normalizeDbSplitType(split_type);

    if (this.activeTab() === 'ip') {
      this.ipSplits.update((arr) => {
        const copy = [...arr];
        copy[index] = { ...copy[index], split_type: normalized };
        return copy;
      });
    } else {
      this.neighboringSplits.update((arr) => {
        const copy = [...arr];
        copy[index] = { ...copy[index], split_type: normalized };
        return copy;
      });
    }
  }

  updateSplitNotes(index: number, notes: string) {
    if (this.activeTab() === 'ip') {
      this.ipSplits.update((arr) => {
        const copy = [...arr];
        copy[index] = { ...copy[index], notes };
        return copy;
      });
    } else {
      this.neighboringSplits.update((arr) => {
        const copy = [...arr];
        copy[index] = { ...copy[index], notes };
        return copy;
      });
    }
  }

  // =========================
  // Save
  // =========================
  async saveSplits() {
    if (!this.overallValid()) {
      this.errorMessage.set(
        !this.ipValidation().isValid ? this.ipValidation().message : this.neighboringValidation().message
      );
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const ipPayload: WorkSplitUpsert[] = this.ipSplits().map((s) => ({
        rights_holder_id: s.rights_holder_id,
        split_type: s.split_type,
        percentage: Number(s.percentage) || 0,
        notes: s.notes ?? '',
      }));

      const neighboringPayload: WorkSplitUpsert[] = this.neighboringSplits().map((s) => ({
        rights_holder_id: s.rights_holder_id,
        split_type: s.split_type,
        percentage: Number(s.percentage) || 0,
        notes: s.notes ?? '',
      }));

      /**
       * Your WorksService currently doesn't have saveWorkSplits (per your TS error).
       * To avoid compile errors while still making the component usable, we call
       * whichever method exists:
       *
       * - saveWorkSplits(workId, ipPayload, neighboringPayload)  (preferred)
       * - updateAllSplits(workId, ipPayload, neighboringPayload) (if you named it that way)
       * - updateWorkSplits(workId, combinedPayload)              (common alternative)
       *
       * You should standardize to one method in the service.
       */
      const ws: any = this.worksService;

      if (typeof ws.saveWorkSplits === 'function') {
        await ws.saveWorkSplits(this.work()!.id, ipPayload, neighboringPayload);
      } else if (typeof ws.updateAllSplits === 'function') {
        await ws.updateAllSplits(this.work()!.id, ipPayload, neighboringPayload);
      } else if (typeof ws.updateWorkSplits === 'function') {
        const combined = [...ipPayload, ...neighboringPayload].map((s) => ({
          ...s,
          work_id: this.work()!.id,
        }));
        await ws.updateWorkSplits(this.work()!.id, combined);
      } else {
        throw new Error(
          'WorksService is missing a save method. Add saveWorkSplits(workId, ip, neighboring) or updateAllSplits(...)'
        );
      }

      this.successMessage.set('Split sheets saved successfully!');
      setTimeout(() => this.router.navigate(['/works']), 1200);
    } catch (error: any) {
      console.error('Error saving splits:', error);
      this.errorMessage.set(error?.message || 'Failed to save split sheets');
    } finally {
      this.isSaving.set(false);
    }
  }

  cancel() {
    this.router.navigate(['/works']);
  }

  /**
   * Download split sheet as PDF
   */
  async downloadPDF() {
    if (!this.work()) {
      this.errorMessage.set('Work not found');
      return;
    }

    try {
      const work = this.work()!;
      const filename = `split-sheet-${work.work_title.replace(/\s+/g, '-')}.png`;
      
      await this.pdfGenerator.downloadSplitSheet(
        filename,
        work,
        this.ipSplits(),
        this.neighboringSplits()
      );
      this.successMessage.set('Split sheet downloaded successfully!');
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      this.errorMessage.set('Failed to download split sheet');
    }
  }
}
