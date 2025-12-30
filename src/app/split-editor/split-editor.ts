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
  runInInjectionContext,
  Injector,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { WorksService } from '../services/works';
import { RightsHoldersService } from '../services/rights-holder';
import { QRScannerService } from '../services/qr-scanner.service';
import { WorkspaceService } from '../services/workspace.service';
import { PdfGeneratorService } from '../services/pdf-generator.service';
import { SupabaseService } from '../services/supabase.service';
import { ProtocolService } from '../services/protocol.service';
import { ProfileService } from '../services/profile.service';
import { Work } from '../models/work.model';
import { RightsHolder, RightsHolderKind, RightsHolderType, RIGHTS_HOLDER_KINDS } from '../../models/rights-holder.model';
import { LyricAuthor, MusicAuthor, NeighbouringRightsholder, PROTOCOL_ROLES, ProtocolRoleKind } from '../models/protocol.model';

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
  Edit,
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
  | 'lyrics'
  | 'music'
  | 'publishing'
  | 'performance'
  | 'master_recording'
  | 'neighboring_rights';

export type RightsLayer = 'ip' | 'neighboring';

/**
 * Row shape aligned to your DB table (uses ownership_percentage per schema).
 */
export interface WorkSplitRow {
  id?: string;
  work_id: string;
  rights_holder_id: string;
  split_type: DbSplitType;
  ownership_percentage: number;
  percentage?: number; // Alias for UI compatibility
  notes?: string | null;

  version?: number | null;
  is_active?: boolean | null;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  rights_layer?: RightsLayer;

  rights_holder?: RightsHolder;
}

/**
 * Payload we send to the service. Service should handle created_by/version/is_active.
 */
export interface WorkSplitUpsert {
  rights_holder_id: string;
  split_type: DbSplitType;
  ownership_percentage: number;
  rights_layer: RightsLayer;
  notes?: string;
}

/**
 * Two-sheet UI tabs.
 */
export type SplitTab = 'ip' | 'neighboring';

// Which DB split types belong to which UI sheet
const IP_SPLIT_TYPES: DbSplitType[] = ['lyrics', 'music', 'publishing'];
const NEIGHBORING_SPLIT_TYPES: DbSplitType[] = ['performance', 'master_recording', 'neighboring_rights'];
const SPLIT_TYPE_LABELS: Record<DbSplitType, string> = {
  lyrics: 'Lyrics',
  music: 'Music',
  publishing: 'Publishing',
  performance: 'Performance',
  master_recording: 'Master Recording',
  neighboring_rights: 'Neighboring Rights',
};

const DEFAULT_IP_TYPE: DbSplitType = 'music';
const DEFAULT_NEIGHBORING_TYPE: DbSplitType = 'master_recording';

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
  private supabase = inject(SupabaseService);
  private protocolService = inject(ProtocolService);
  private profileService = inject(ProfileService);
  private injector = inject(Injector);

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
  readonly Edit = Edit;
  
  // Expose Math for template
  readonly Math = Math;

  // State
  work = signal<Work | null>(null);

  ipSplits = signal<WorkSplitRow[]>([]);
  neighboringSplits = signal<WorkSplitRow[]>([]);

  rightsHolders = signal<RightsHolder[]>([]);
  isLoading = signal(false);
  isSaving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  // Protocol Authors (integrated into tabs)
  lyric_authors = signal<LyricAuthor[]>([]);
  music_authors = signal<MusicAuthor[]>([]);
  neighbouring_rightsholders = signal<NeighbouringRightsholder[]>([]);

  // Tabs
  activeTab = signal<SplitTab>('ip');

  // QR Scanner
  isScanning = signal(false);
  hasCameraSupport = signal(false);
  scanError = signal('');
  scanningFor = signal<SplitTab>('ip');

  // ==========================================
  // NEW: 3-Button Toggle Workflow State
  // ==========================================
  addRightsHolderMode = signal<'buttons' | 'add-me' | 'scan-qr' | 'add-manually' | null>(null);
  
  // Add Me: Store current user profile data
  currentUserData = signal<Partial<RightsHolder> | null>(null);
  
  // Split type selection (checkboxes)
  selectedSplitTypes = signal<Set<string>>(new Set()); // lyrics, music, melody, harmony, arrangement, etc.
  showMusicSubOptions = signal(false); // Show melody/harmony/arrangement when music is checked
  
  // Split type percentages - track percentage for each selected split type
  splitTypePercentages = signal<Map<string, number>>(new Map()); // { 'lyrics': 50, 'music': 50 }
  
  // Scan QR: Store scanned user data
  scannedUserData = signal<Partial<RightsHolder> | null>(null);
  
  // Add Manually: Form for creating new inline
  manualHolderForm = signal({
    type: 'person' as RightsHolderType,
    kind: 'other' as RightsHolderKind,
    nickname: '',
    first_name: '',
    last_name: '',
    company_name: '',
    email: '',
    phone: '',
  });
  
  // AI Disclosure for current holder being added
  currentAiDisclosure = signal({
    creation_type: 'human' as 'human' | 'ai_assisted' | 'ai_generated',
    ai_tool: '',
    notes: '',
  });

  // Add rights holder (legacy - keep for compatibility)
  selectedRightsHolderId = '';
  addingManually = signal(false);
  creatingNewHolder = signal(false);
  editingFormMode = signal(false); // For editing in the main form
  editingFormHolderId = signal<string | null>(null); // Which holder is being edited
  editingHolder = signal(false); // For the modal edit
  editingHolderId = signal<string | null>(null); // Modal: which holder is being edited

  // New rights holder form data
  newHolderForm = signal({
    type: 'person' as RightsHolderType,
    kind: 'other' as RightsHolderKind,
    first_name: '',
    last_name: '',
    company_name: '',
    email: '',
    phone: '',
  });

  // Rights holder kind options
  readonly rightsHolderKinds = RIGHTS_HOLDER_KINDS;

  // Protocol roles (for neighbouring rightsholders)
  readonly protocolRoles = PROTOCOL_ROLES;

  // Collapsible card state (track which splits are expanded)
  expandedSplits = signal<Set<number>>(new Set([0])); // First card expanded by default

  // Options for DB split types within each tab
  ipTypeOptions = IP_SPLIT_TYPES.map((v) => ({
    value: v,
    label:
      v === 'lyrics'
        ? 'Lyrics'
        : v === 'music'
        ? 'Music'
        : 'Publishing',
  }));

  neighboringTypeOptions = NEIGHBORING_SPLIT_TYPES.map((v) => ({
    value: v,
    label:
      v === 'performance'
        ? 'Performance'
        : v === 'master_recording'
        ? 'Master'
        : 'Neighboring',
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
    
    // Set up subscription to rights holders with proper injection context
    runInInjectionContext(this.injector, () => {
      this.rightsHoldersService.rightsHolders$
        .pipe(takeUntilDestroyed())
        .subscribe((rhs) => this.rightsHolders.set(rhs));
    });
    
    await this.loadData(workId);
  }

  ngOnDestroy() {
    this.stopScanning();
  }

  // =========================
  // Helpers
  // =========================
  private validateTab(splits: WorkSplitRow[], label: string) {
    if (splits.length === 0) {
      return { isValid: false, class: 'invalid', message: `At least one ${label} rights holder is required` };
    }

    const totalsByType = new Map<DbSplitType, number>();
    for (const split of splits) {
      const value = Number(split.percentage ?? split.ownership_percentage ?? 0);
      if (!Number.isFinite(value)) continue;
      const current = totalsByType.get(split.split_type) ?? 0;
      totalsByType.set(split.split_type, current + value);
    }

    if (totalsByType.size === 0) {
      return { isValid: false, class: 'invalid', message: `Select at least one split type for ${label}` };
    }

    const tolerance = 0.01;
    for (const [type, total] of totalsByType.entries()) {
      if (total > 100 + tolerance) {
        return {
          isValid: false,
          class: 'over',
          message: `${this.getSplitTypeLabel(type)} exceeds 100% by ${this.formatPercentage(total - 100)}%`,
        };
      }
      if (total < 100 - tolerance) {
        return {
          isValid: false,
          class: 'under',
          message: `${this.getSplitTypeLabel(type)} is short of 100% by ${this.formatPercentage(100 - total)}%`,
        };
      }
    }

    const summary = Array.from(totalsByType.entries())
      .map(([type, total]) => `${this.getSplitTypeLabel(type)} ${this.formatPercentage(total)}%`)
      .join(' · ');

    return {
      isValid: true,
      class: 'valid',
      message: totalsByType.size > 1 ? `All split types balanced (${summary})` : summary,
    };
  }

  private getSplitTypeLabel(type: DbSplitType): string {
    return SPLIT_TYPE_LABELS[type] ?? type;
  }

  private formatPercentage(value: number): string {
    const rounded = Math.round(value * 100) / 100;
    if (!Number.isFinite(rounded)) {
      return '0';
    }
    return Number.isInteger(rounded) ? `${Math.trunc(rounded)}` : rounded.toFixed(2);
  }

  private isIpType(t: DbSplitType) {
    return IP_SPLIT_TYPES.includes(t);
  }

  private getRightsLayerForSplitType(t: DbSplitType): RightsLayer {
    return this.isIpType(t) ? 'ip' : 'neighboring';
  }

  /**
   * Normalizes values coming from older TS enums or old client data.
   * Fixes: 'lyrics' -> 'lyric'
   */
  private normalizeDbSplitType(t: any): DbSplitType {
    switch (t) {
      case 'lyric':
        return 'lyrics';
      case 'master':
        return 'master_recording';
      case 'neighboring':
        return 'neighboring_rights';
      default:
        return t as DbSplitType;
    }
  }

  getRightsHolderName(rh: RightsHolder): string {
    return this.rightsHoldersService.getDisplayName(rh);
  }

  getRightsHolderIcon(rh: RightsHolder | undefined): any {
    if (!rh) return this.User;
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

      // Load existing splits (type in your service may still be WorkSplit[])
      const allSplits: any[] = (await this.worksService.getWorkSplits(workId)) as any[];

      // Attach rights_holder object if not already joined in query
      const rhsById = new Map(this.rightsHolders().map((r) => [r.id, r]));

      const enriched: WorkSplitRow[] = (allSplits || []).map((s: any) => ({
        ...s,
        split_type: this.normalizeDbSplitType(s.split_type),
        // Handle both old 'percentage' and new 'ownership_percentage' columns
        ownership_percentage: Number(s.ownership_percentage ?? s.percentage ?? 0),
        percentage: Number(s.ownership_percentage ?? s.percentage ?? 0), // Alias for compatibility
        rights_holder: s.rights_holder ?? rhsById.get(s.rights_holder_id),
        rights_layer:
          (s.rights_layer as RightsLayer | undefined) ??
          this.getRightsLayerForSplitType(this.normalizeDbSplitType(s.split_type)),
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
      ownership_percentage: 0,
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

  /**
   * Add current user as rights holder to the current split tab
   */
  async addCurrentUserAsRightsHolder() {
    const currentUser = this.supabase.currentUser;
    const workspace = this.workspaceService.currentWorkspace;

    if (!currentUser || !workspace) {
      this.errorMessage.set('User or workspace not found');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    try {
      // Check if current user already exists as a rights holder in this workspace
      let currentUserRightsHolder = this.rightsHolders().find(
        (rh) => rh.created_by === currentUser.id
      );

      // If not found, create one based on user's profile
      if (!currentUserRightsHolder) {
        const userEmail = currentUser.email || '';
        const displayName = currentUser.user_metadata?.['display_name'] || 
                           userEmail.split('@')[0] || 
                           'User';

        const newRightsHolder = await this.rightsHoldersService.createRightsHolder({
          type: 'person',
          kind: 'artist',
          first_name: displayName,
          email: userEmail,
        });

        currentUserRightsHolder = newRightsHolder;
        
        // Add to the local list
        this.rightsHolders.update((arr) => [...arr, newRightsHolder]);
      }

      // Check if already in current tab
      const alreadyExists = this.currentSplits().some(
        (s) => s.rights_holder_id === currentUserRightsHolder!.id
      );

      if (alreadyExists) {
        this.errorMessage.set('You are already added to this split sheet');
        return;
      }

      // Add as split
      this.addSplit(currentUserRightsHolder!.id);

      this.successMessage.set('You have been added to this split sheet!');
      setTimeout(() => this.successMessage.set(''), 3000);
    } catch (error: any) {
      console.error('Error adding current user as rights holder:', error);
      this.errorMessage.set(error?.message || 'Failed to add you as rights holder');
    } finally {
      this.isSaving.set(false);
    }
  }

  /**
   * Create a new rights holder and add them to the split
   */
  async createAndAddRightsHolder() {
    const form = this.newHolderForm();

    // Validate form
    if (form.type === 'person' && !form.first_name) {
      this.errorMessage.set('First name is required');
      return;
    }

    if (form.type === 'company' && !form.company_name) {
      this.errorMessage.set('Company name is required');
      return;
    }

    if (!form.email) {
      this.errorMessage.set('Email is required');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    try {
      const newRightsHolder = await this.rightsHoldersService.createRightsHolder({
        type: form.type,
        kind: form.kind,
        first_name: form.type === 'person' ? form.first_name : undefined,
        last_name: form.type === 'person' ? form.last_name : undefined,
        company_name: form.type === 'company' ? form.company_name : undefined,
        email: form.email,
        phone: form.phone || undefined,
      });

      // Add to local list
      this.rightsHolders.update((arr) => [...arr, newRightsHolder]);

      // Add to split
      this.addSplit(newRightsHolder.id);

      this.successMessage.set(
        `${form.type === 'person' ? form.first_name : form.company_name} added successfully!`
      );
      setTimeout(() => this.successMessage.set(''), 3000);

      // Reset form
      this.newHolderForm.set({
        type: 'person',
        kind: 'other',
        first_name: '',
        last_name: '',
        company_name: '',
        email: '',
        phone: '',
      });
      this.creatingNewHolder.set(false);
    } catch (error: any) {
      console.error('Error creating rights holder:', error);
      this.errorMessage.set(error?.message || 'Failed to create rights holder');
    } finally {
      this.isSaving.set(false);
    }
  }

  /**
   * Update new holder form field
   */
  updateNewHolderField(field: string, value: any) {
    this.newHolderForm.update((form) => ({
      ...form,
      [field]: value,
    }));
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
  // Card Collapsible State
  // =========================
  /**
   * Toggle the expanded state of a split card
   */
  toggleSplitExpanded(index: number) {
    this.expandedSplits.update((set) => {
      const newSet = new Set(set);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }

  /**
   * Check if a split card is expanded
   */
  isSplitExpanded(index: number): boolean {
    return this.expandedSplits().has(index);
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
        ownership_percentage: Number(s.percentage) || 0,
        rights_layer: s.rights_layer ?? this.getRightsLayerForSplitType(s.split_type),
        notes: s.notes ?? '',
      }));

      const neighboringPayload: WorkSplitUpsert[] = this.neighboringSplits().map((s) => ({
        rights_holder_id: s.rights_holder_id,
        split_type: s.split_type,
        ownership_percentage: Number(s.percentage) || 0,
        rights_layer: s.rights_layer ?? this.getRightsLayerForSplitType(s.split_type),
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

  /**
   * ============ PROTOCOL AUTHORS - IP RIGHTS TAB ============
   */

  addLyricAuthor() {
    const current = this.lyric_authors();
    this.lyric_authors.set([
      ...current,
      {
        name: '',
        surname: '',
        middle_name: '',
        aka: '',
        cmo_name: '',
        pro_name: '',
        participation_percentage: 0,
      }
    ]);
  }

  removeLyricAuthor(index: number) {
    const current = this.lyric_authors();
    this.lyric_authors.set(current.filter((_, i) => i !== index));
  }

  addMusicAuthor() {
    const current = this.music_authors();
    this.music_authors.set([
      ...current,
      {
        name: '',
        surname: '',
        middle_name: '',
        aka: '',
        cmo_name: '',
        pro_name: '',
        participation_percentage: 0,
        melody: 0,
        harmony: 0,
        arrangement: 0,
      }
    ]);
  }

  removeMusicAuthor(index: number) {
    const current = this.music_authors();
    this.music_authors.set(current.filter((_, i) => i !== index));
  }

  /**
   * ============ PROTOCOL AUTHORS - NEIGHBOURING RIGHTS TAB ============
   */

  addNeighbouringRightsholder() {
    const current = this.neighbouring_rightsholders();
    this.neighbouring_rightsholders.set([
      ...current,
      {
        name: '',
        surname: '',
        middle_name: '',
        aka: '',
        cmo_name: '',
        pro_name: '',
        participation_percentage: 0,
        roles: [],
      }
    ]);
  }

  removeNeighbouringRightsholder(index: number) {
    const current = this.neighbouring_rightsholders();
    this.neighbouring_rightsholders.set(current.filter((_, i) => i !== index));
  }

  addRoleToRightsholder(holderIndex: number) {
    const current = this.neighbouring_rightsholders();
    const updated = [...current];
    if (!updated[holderIndex].roles) {
      updated[holderIndex].roles = [];
    }
    updated[holderIndex].roles!.push('other');
    this.neighbouring_rightsholders.set(updated);
  }

  removeRoleFromRightsholder(holderIndex: number, roleIndex: number) {
    const current = this.neighbouring_rightsholders();
    const updated = [...current];
    updated[holderIndex].roles!.splice(roleIndex, 1);
    this.neighbouring_rightsholders.set(updated);
  }

  updateRightsholderRole(holderIndex: number, roleIndex: number, role: ProtocolRoleKind) {
    const current = this.neighbouring_rightsholders();
    const updated = [...current];
    updated[holderIndex].roles![roleIndex] = role;
    this.neighbouring_rightsholders.set(updated);
  }

  /**
   * ============ EDIT RIGHTS HOLDER ============
   */

  openEditHolder(holderId: string) {
    const holder = this.rightsHolders().find(h => h.id === holderId);
    if (holder) {
      this.editingHolderId.set(holderId);
      this.newHolderForm.set({
        type: holder.type === 'company' ? 'company' : 'person',
        kind: (holder.kind as RightsHolderKind) || 'other',
        first_name: holder.first_name || '',
        last_name: holder.last_name || '',
        company_name: holder.company_name || '',
        email: holder.email || '',
        phone: holder.phone || '',
      });
      this.editingHolder.set(true);
    }
  }

  closeEditHolder() {
    this.editingHolder.set(false);
    this.editingHolderId.set(null);
    this.newHolderForm.set({
      type: 'person',
      kind: 'other',
      first_name: '',
      last_name: '',
      company_name: '',
      email: '',
      phone: '',
    });
  }

  async saveEditedHolder() {
    const holderId = this.editingHolderId();
    if (!holderId) return;

    const formData = this.newHolderForm();
    const holderIndex = this.rightsHolders().findIndex(h => h.id === holderId);
    if (holderIndex === -1) return;

    try {
      this.isSaving.set(true);
      
      // Update in database
      const { error } = await this.supabase.client
        .from('rights_holders')
        .update({
          type: formData.type,
          kind: formData.kind,
          first_name: formData.type === 'person' ? formData.first_name : undefined,
          last_name: formData.type === 'person' ? formData.last_name : undefined,
          company_name: formData.type === 'company' ? formData.company_name : undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
        })
        .eq('id', holderId);

      if (error) throw error;

      // Update local state
      const updated = [...this.rightsHolders()];
      updated[holderIndex] = {
        ...updated[holderIndex],
        type: formData.type,
        kind: formData.kind,
        first_name: formData.type === 'person' ? formData.first_name : undefined,
        last_name: formData.type === 'person' ? formData.last_name : undefined,
        company_name: formData.type === 'company' ? formData.company_name : undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
      };
      this.rightsHolders.set(updated);

      this.successMessage.set('Rights holder updated successfully!');
      this.closeEditHolder();
      setTimeout(() => this.successMessage.set(''), 3000);
    } catch (error: any) {
      console.error('Error updating rights holder:', error);
      this.errorMessage.set(`Failed to update rights holder: ${error.message}`);
    } finally {
      this.isSaving.set(false);
    }
  }

  // =====================================================
  // EDIT RIGHTS HOLDER IN MAIN FORM
  // =====================================================

  openEditFormMode(holderId: string) {
    const holder = this.rightsHolders().find(h => h.id === holderId);
    if (holder) {
      this.editingFormHolderId.set(holderId);
      this.newHolderForm.set({
        type: holder.type as RightsHolderType,
        kind: holder.kind,
        first_name: holder.first_name || '',
        last_name: holder.last_name || '',
        company_name: holder.company_name || '',
        email: holder.email || '',
        phone: holder.phone || '',
      });
      this.editingFormMode.set(true);
      this.creatingNewHolder.set(true); // Show the form
    }
  }

  closeEditFormMode() {
    this.editingFormMode.set(false);
    this.editingFormHolderId.set(null);
    this.creatingNewHolder.set(false);
    this.newHolderForm.set({
      type: 'person',
      kind: 'other',
      first_name: '',
      last_name: '',
      company_name: '',
      email: '',
      phone: '',
    });
  }

  async saveEditFormMode() {
    const holderId = this.editingFormHolderId();
    if (!holderId) return;

    const formData = this.newHolderForm();
    const holderIndex = this.rightsHolders().findIndex(h => h.id === holderId);
    if (holderIndex === -1) return;

    try {
      this.isSaving.set(true);

      // Update in database
      const { error } = await this.supabase.client
        .from('rights_holders')
        .update({
          type: formData.type,
          kind: formData.kind,
          first_name: formData.type === 'person' ? formData.first_name : undefined,
          last_name: formData.type === 'person' ? formData.last_name : undefined,
          company_name: formData.type === 'company' ? formData.company_name : undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
        })
        .eq('id', holderId);

      if (error) throw error;

      // Update local state
      const updated = [...this.rightsHolders()];
      updated[holderIndex] = {
        ...updated[holderIndex],
        type: formData.type,
        kind: formData.kind,
        first_name: formData.type === 'person' ? formData.first_name : undefined,
        last_name: formData.type === 'person' ? formData.last_name : undefined,
        company_name: formData.type === 'company' ? formData.company_name : undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
      };
      this.rightsHolders.set(updated);

      this.successMessage.set('Rights holder updated successfully!');
      this.closeEditFormMode();
      setTimeout(() => this.successMessage.set(''), 3000);
    } catch (error: any) {
      console.error('Error updating rights holder:', error);
      this.errorMessage.set(`Failed to update rights holder: ${error.message}`);
    } finally {
      this.isSaving.set(false);
    }
  }

  // =====================================================
  // NEW: 3-BUTTON WORKFLOW (Add Me / Scan QR / Add Manually)
  // =====================================================

  openAddRightsHolderModal() {
    this.addRightsHolderMode.set('buttons');
    this.selectedSplitTypes.set(new Set());
    this.showMusicSubOptions.set(false);
    this.currentUserData.set(null);
    this.scannedUserData.set(null);
    this.manualHolderForm.set({
      type: 'person',
      kind: 'other',
      nickname: '',
      first_name: '',
      last_name: '',
      company_name: '',
      email: '',
      phone: '',
    });
  }

  closeAddRightsHolderModal() {
    this.addRightsHolderMode.set(null);
    this.selectedSplitTypes.set(new Set());
    this.showMusicSubOptions.set(false);
    this.currentUserData.set(null);
    this.scannedUserData.set(null);
    this.currentAiDisclosure.set({
      creation_type: 'human',
      ai_tool: '',
      notes: '',
    });
    this.manualHolderForm.set({
      type: 'person',
      kind: 'other',
      nickname: '',
      first_name: '',
      last_name: '',
      company_name: '',
      email: '',
      phone: '',
    });
  }

  // ADD ME: Load current user profile
  async selectAddMe() {
    try {
      const profile = await this.profileService.loadProfile(this.supabase.currentUser?.id || '');
      if (profile) {
        this.currentUserData.set({
          nickname: profile.nickname,
          email: this.supabase.currentUser?.email,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          profile_id: profile.id,
          linked_user_id: this.supabase.currentUser?.id,
        });
        this.addRightsHolderMode.set('add-me');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      this.errorMessage.set('Failed to load your profile');
    }
  }

  // SCAN QR: Toggle scanning mode
  selectScanQR() {
    this.addRightsHolderMode.set('scan-qr');
    this.startScanning();
  }

  // ADD MANUALLY: Show form
  selectAddManually() {
    this.addRightsHolderMode.set('add-manually');
    this.manualHolderForm.set({
      type: 'person',
      kind: 'other',
      nickname: '',
      first_name: '',
      last_name: '',
      company_name: '',
      email: '',
      phone: '',
    });
  }

  // SPLIT TYPE SELECTION: Lyrics/Music checkboxes
  toggleSplitType(splitType: string) {
    const selected = new Set(this.selectedSplitTypes());
    if (selected.has(splitType)) {
      selected.delete(splitType);
    } else {
      selected.add(splitType);
    }
    
    // Show music sub-options if music is selected
    if (splitType === 'music' && selected.has('music')) {
      this.showMusicSubOptions.set(true);
    } else if (splitType === 'music' && !selected.has('music')) {
      this.showMusicSubOptions.set(false);
      // Remove melody/harmony/arrangement if music is deselected
      selected.delete('melody');
      selected.delete('harmony');
      selected.delete('arrangement');
    }
    
    this.selectedSplitTypes.set(selected);
  }

  isSplitTypeSelected(splitType: string): boolean {
    return this.selectedSplitTypes().has(splitType);
  }

  // UPDATE SPLIT TYPE PERCENTAGE
  updateSplitTypePercentage(splitType: string, percentage: number) {
    const percentages = new Map(this.splitTypePercentages());
    percentages.set(splitType, Math.max(0, percentage)); // Ensure non-negative
    this.splitTypePercentages.set(percentages);
  }

  // GET SPLIT TYPE PERCENTAGE
  getSplitTypePercentage(splitType: string): number {
    return this.splitTypePercentages().get(splitType) || 0;
  }

  // CONFIRM & ADD: Process the selected data
  async confirmAndAddRightsHolder() {
    const selectedTypes = Array.from(this.selectedSplitTypes());
    if (selectedTypes.length === 0) {
      this.errorMessage.set('Please select at least one split type');
      return;
    }

    try {
      this.isSaving.set(true);

      // Determine which user data to use (Add Me / Scan QR / Add Manually)
      let holderData: Partial<RightsHolder> | null = null;

      if (this.addRightsHolderMode() === 'add-me') {
        holderData = this.currentUserData();
      } else if (this.addRightsHolderMode() === 'scan-qr') {
        holderData = this.scannedUserData();
      } else if (this.addRightsHolderMode() === 'add-manually') {
        const form = this.manualHolderForm();
        const nickname = (form.nickname || '').trim();
        if (!nickname) {
          this.errorMessage.set('Please provide a nickname for this rights holder');
          return;
        }
        holderData = {
          type: form.type as RightsHolderType,
          kind: form.kind,
          nickname,
          first_name: form.type === 'person' ? form.first_name : undefined,
          last_name: form.type === 'person' ? form.last_name : undefined,
          company_name: form.type === 'company' ? form.company_name : undefined,
          email: form.email,
          phone: form.phone,
        };
      }

      if (!holderData) {
        this.errorMessage.set('No holder data provided');
        return;
      }

      // Create/fetch the rights holder
      let holderId: string;
      if (holderData.linked_user_id) {
        // Check if this user already exists as a rights holder
        const existing = this.rightsHolders().find(
          rh => rh.linked_user_id === holderData?.linked_user_id
        );
        if (existing) {
          holderId = existing.id;
        } else {
          // Create new rights holder linked to user
          holderId = await this.createRightsHolder(holderData);
        }
      } else {
        // Create new unlinked rights holder
        holderId = await this.createRightsHolder(holderData);
      }

      // Add splits for each selected type
      await this.addSplitsForTypes(holderId, selectedTypes);

      this.successMessage.set('Rights holder added successfully!');
      this.closeAddRightsHolderModal();
      setTimeout(() => this.successMessage.set(''), 3000);
    } catch (error: any) {
      console.error('Error adding rights holder:', error);
      this.errorMessage.set(`Failed to add rights holder: ${error.message}`);
    } finally {
      this.isSaving.set(false);
    }
  }

  private async createRightsHolder(holderData: Partial<RightsHolder>): Promise<string> {
    const workspace = this.workspaceService.currentWorkspace;
    if (!workspace) throw new Error('No workspace selected');

    // Build insert object with only non-undefined, non-empty values (matching the service pattern)
    const insertData: any = {
      workspace_id: workspace.id,
      type: holderData.type || 'person',
      kind: holderData.kind || 'other',
      created_by: this.supabase.currentUser?.id || '',
    };

    // Only include fields that have values
    if (holderData.first_name) insertData.first_name = holderData.first_name;
    if (holderData.last_name) insertData.last_name = holderData.last_name;
    if (holderData.company_name) insertData.company_name = holderData.company_name;
    if (holderData.email) insertData.email = holderData.email;
    if (holderData.phone) insertData.phone = holderData.phone;
    if (holderData.linked_user_id) insertData.linked_user_id = holderData.linked_user_id;
    if (holderData.profile_id) insertData.profile_id = holderData.profile_id;

    const resolvedNickname = this.resolveNickname(holderData);
    if (resolvedNickname) {
      insertData.nickname = resolvedNickname;
    }

    if (!insertData.nickname && !insertData.profile_id) {
      insertData.nickname = this.generateFallbackNickname();
    }

    // Add AI disclosure
    const aiDisclosure = this.currentAiDisclosure();
    if (aiDisclosure) insertData.ai_disclosure = aiDisclosure;

    const { data, error } = await this.supabase.client
      .from('rights_holders')
      .insert(insertData)
      .select('id')
      .single();

    if (error) throw error;
    if (!data?.id) throw new Error('Failed to create rights holder');

    return data.id;
  }

  private async addSplitsForTypes(holderId: string, selectedTypes: string[]) {
    const work = this.work();
    if (!work) throw new Error('No work selected');

    // Determine if this is IP or Neighboring rights based on active tab
    const isIpRights = this.activeTab() === 'ip';
    const allowedDbTypes = isIpRights ? IP_SPLIT_TYPES : NEIGHBORING_SPLIT_TYPES;

    const existingSplits = [...this.ipSplits(), ...this.neighboringSplits()];
    const splitTypePercentages = this.splitTypePercentages();

    const candidates = selectedTypes
      .map((uiType) => ({
        uiType,
        dbType: this.mapUiTypeToDbType(uiType),
      }))
      .filter((entry): entry is { uiType: string; dbType: DbSplitType } => !!entry.dbType);

    const uniqueByDbType = new Map<DbSplitType, { uiType: string; dbType: DbSplitType }>();
    for (const entry of candidates) {
      if (!uniqueByDbType.has(entry.dbType)) {
        uniqueByDbType.set(entry.dbType, entry);
      }
    }

    const rowsToInsert = Array.from(uniqueByDbType.values())
      .filter((entry) => allowedDbTypes.includes(entry.dbType))
      .filter((entry) =>
        !existingSplits.some(
          (split) =>
            split.work_id === work.id &&
            split.rights_holder_id === holderId &&
            split.split_type === entry.dbType
        )
      )
      .map((entry) => ({
        work_id: work.id,
        rights_holder_id: holderId,
        split_type: entry.dbType,
        ownership_percentage: Number(splitTypePercentages.get(entry.uiType) ?? 0),
        is_active: true,
        created_by: this.supabase.currentUser?.id || '',
        rights_layer: this.getRightsLayerForSplitType(entry.dbType),
      }));

    if (rowsToInsert.length > 0) {
      const { error } = await this.supabase.client.from('work_splits').insert(rowsToInsert);
      if (error) throw error;
    }

    await this.syncProtocolAuthors(holderId, selectedTypes, splitTypePercentages);

    // Reload splits
    await this.loadData(work.id);
  }

  private mapUiTypeToDbType(uiType: string): DbSplitType | null {
    const mapping: { [key: string]: DbSplitType } = {
      'lyrics': 'lyrics',
      'music': 'music',
      'publishing': 'publishing',
      'performance': 'performance',
      'master': 'master_recording',
      'neighboring': 'neighboring_rights',
      'melody': 'music',
      'harmony': 'music',
      'arrangement': 'music',
    };
    return mapping[uiType] || null;
  }

  // QR SCAN: Handle scanned data
  handleQRScanned(scannedData: QRCodeData) {
    // Load the scanned user's profile
    if (scannedData.user_id) {
      this.supabase.client
        .from('profiles')
        .select('*')
        .eq('id', scannedData.user_id)
        .single()
        .then(({ data, error }) => {
          if (error) {
            this.scanError.set('Could not load user profile');
            return;
          }
          this.scannedUserData.set({
            nickname: data?.nickname,
            email: data?.email,
            avatar_url: data?.avatar_url,
            bio: data?.bio,
            profile_id: data?.id,
            linked_user_id: data?.id,
          });
          this.stopScanning();
          this.addRightsHolderMode.set('add-me'); // Show split type selection
        });
    }
  }

  // HELPER: Update AI disclosure creation type
  updateAiDisclosureType(type: 'human' | 'ai_assisted' | 'ai_generated') {
    const current = this.currentAiDisclosure();
    this.currentAiDisclosure.set({
      ...current,
      creation_type: type,
    });
  }

  // HELPER: Update AI disclosure tool
  updateAiDisclosureTool(tool: string) {
    const current = this.currentAiDisclosure();
    this.currentAiDisclosure.set({
      ...current,
      ai_tool: tool,
    });
  }

  // HELPER: Update AI disclosure notes
  updateAiDisclosureNotes(notes: string) {
    const current = this.currentAiDisclosure();
    this.currentAiDisclosure.set({
      ...current,
      notes: notes,
    });
  }

  // HELPER: Update manual holder form field
  updateManualHolderField(field: string, value: any) {
    const current = this.manualHolderForm();
    this.manualHolderForm.set({
      ...current,
      [field]: value,
    });
  }

  private resolveNickname(data: Partial<RightsHolder>): string | null {
    const candidates = [
      data.nickname,
      `${data.first_name || ''} ${data.last_name || ''}`,
      data.company_name,
      data.email ? data.email.split('@')[0] : undefined,
    ];

    for (const candidate of candidates) {
      const normalized = this.normalizeNickname(candidate);
      if (normalized) return normalized;
    }

    return null;
  }

  private normalizeNickname(value?: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    const sanitized = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return sanitized || null;
  }

  private generateFallbackNickname(): string {
    const globalCrypto = globalThis?.crypto as Crypto | undefined;
    if (globalCrypto?.randomUUID) {
      return `holder-${globalCrypto.randomUUID().split('-')[0]}`;
    }
    return `holder-${Math.random().toString(36).slice(2, 8)}`;
  }

  private async syncProtocolAuthors(
    holderId: string,
    selectedTypes: string[],
    percentageMap: Map<string, number>
  ) {
    const work = this.work();
    if (!work) return;

    const wantsLyrics = selectedTypes.includes('lyrics');
    const wantsMusic = selectedTypes.includes('music');
    if (!wantsLyrics && !wantsMusic) return;

    try {
      const protocol = await this.protocolService.getProtocolByWorkId(work.id);
      if (!protocol) return;

      const { data: rightsHolder, error } = await this.supabase.client
        .from('rights_holders')
        .select('*')
        .eq('id', holderId)
        .single();

      if (error || !rightsHolder) {
        console.warn('Unable to load rights holder for protocol sync', error);
        return;
      }

      const rightsHolderRecord = rightsHolder as RightsHolder;
      const identity = this.deriveAuthorIdentity(rightsHolderRecord);
      const cmoName = rightsHolderRecord.cmo_pro?.trim() || undefined;
      const proName = undefined; // PRO not captured in current rights holder schema

      if (wantsLyrics) {
        const lyricPercentage = this.sanitizePercentage(percentageMap.get('lyrics'));
        await this.protocolService.upsertLyricAuthor(protocol.id, {
          name: identity.name,
          surname: identity.surname,
          aka: identity.aka ?? undefined,
          cmo_name: cmoName,
          pro_name: proName,
          participation_percentage: lyricPercentage,
        });
      }

      if (wantsMusic) {
        const musicPercentage = this.sanitizePercentage(percentageMap.get('music'));
        const flags = this.buildMusicContributionFlags(selectedTypes);
        await this.protocolService.upsertMusicAuthor(protocol.id, {
          name: identity.name,
          surname: identity.surname,
          aka: identity.aka ?? undefined,
          cmo_name: cmoName,
          pro_name: proName,
          participation_percentage: musicPercentage,
          melody: flags.melody,
          harmony: flags.harmony,
          arrangement: flags.arrangement,
        });
      }
    } catch (error) {
      console.error('Failed to sync protocol authors:', error);
    }
  }

  private deriveAuthorIdentity(holder: RightsHolder): { name: string; surname: string; aka: string | null } {
    const isRegistered = Boolean(holder.profile_id || holder.linked_user_id);
    const rawNickname = holder.nickname?.trim() || '';
    const nickname = isRegistered ? rawNickname : '';
    const company = holder.company_name?.trim() || holder.organization_name?.trim() || '';

    let name = holder.first_name?.trim() || '';
    let surname = holder.last_name?.trim() || '';

    if (!name && nickname) {
      const parts = nickname.split(/\s+/).filter(Boolean);
      if (parts.length > 0) {
        name = parts[0];
        if (!surname && parts.length > 1) {
          surname = parts.slice(1).join(' ');
        }
      }
    }

    if (!surname && nickname) {
      const parts = nickname.split(/\s+/).filter(Boolean);
      if (parts.length > 1) {
        surname = parts.slice(1).join(' ');
      }
    }

    if (!name && company) {
      name = company;
    }

    if (!surname) {
      if (holder.last_name?.trim()) {
        surname = holder.last_name.trim();
      } else if (company) {
        surname = company;
      } else if (nickname) {
        surname = nickname;
      }
    }

    if (!name) name = 'Unknown';
    if (!surname) surname = name !== 'Unknown' ? name : 'Unknown';

    const aka = isRegistered && rawNickname ? rawNickname : null;

    return { name, surname, aka };
  }

  private buildMusicContributionFlags(selectedTypes: string[]): { melody: number; harmony: number; arrangement: number } {
    const selected = new Set(selectedTypes);
    return {
      melody: selected.has('melody') ? 1 : 0,
      harmony: selected.has('harmony') ? 1 : 0,
      arrangement: selected.has('arrangement') ? 1 : 0,
    };
  }

  private sanitizePercentage(value: number | undefined): number {
    const numeric = Number(value ?? 0);
    if (!Number.isFinite(numeric) || numeric < 0) return 0;
    return Math.round(numeric * 100) / 100;
  }
}

