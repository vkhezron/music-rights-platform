import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { LucideAngularModule, ArrowLeft, FileText, Plus, RefreshCcw, CopyPlus } from 'lucide-angular';
import { ProtocolService } from '../../services/protocol.service';
import { Workspace, WorkspaceService } from '../../services/workspace.service';
import { Protocol } from '../../models/protocol.model';
import { WorksService } from '../../services/works';
import { Work } from '../../models/work.model';

@Component({
  selector: 'app-protocol-list',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    TranslateModule,
    LucideAngularModule
  ],
  templateUrl: './protocol-list.html',
  styleUrl: './protocol-list.scss'
})
export class ProtocolListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly workspaceService = inject(WorkspaceService);
  private readonly protocolService = inject(ProtocolService);
  private readonly worksService = inject(WorksService);

  readonly ArrowLeft = ArrowLeft;
  readonly FileText = FileText;
  readonly Plus = Plus;
  readonly RefreshCcw = RefreshCcw;
  readonly CopyPlus = CopyPlus;

  readonly protocols = toSignal(this.protocolService.protocols$, { initialValue: [] as Protocol[] });
  readonly works = toSignal(this.worksService.works$, { initialValue: [] as Work[] });
  readonly currentWorkspace = signal<Workspace | null>(null);

  isLoading = signal(true);
  errorMessage = signal('');
  selectedWorkId = signal('');
  duplicateSource = signal<Protocol | null>(null);
  duplicateTargetWorkId = signal('');
  duplicateError = signal('');
  duplicateInProgress = signal(false);

  readonly availableWorkOptions = computed(() =>
    this.works().filter(work => work.status !== 'archived')
  );

  readonly hasAvailableWorkOptions = computed(() => this.availableWorkOptions().length > 0);

  constructor() {
    this.workspaceService.currentWorkspace$
      .pipe(takeUntilDestroyed())
      .subscribe(workspace => {
        this.currentWorkspace.set(workspace);
        if (workspace) {
          this.loadProtocols(workspace.id);
        } else {
          this.isLoading.set(false);
        }
      });
  }

  ngOnInit(): void {
    const workspace = this.workspaceService.currentWorkspace;
    if (workspace) {
      this.loadProtocols(workspace.id);
    } else {
      this.isLoading.set(false);
    }
  }

  async loadProtocols(workspaceId: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      await this.protocolService.loadProtocols(workspaceId);
    } catch (error) {
      console.error('Failed to load protocols', error);
      this.errorMessage.set('PROTOCOL_LIST.ERROR_LOADING');
    } finally {
      this.isLoading.set(false);
    }
  }

  refreshProtocols(): void {
    const workspace = this.currentWorkspace();
    if (workspace) {
      this.loadProtocols(workspace.id);
    }
  }

  trackByProtocolId(_index: number, protocol: Protocol): string {
    return protocol.id;
  }

  openProtocol(protocol: Protocol): void {
    this.router.navigate(['/works/edit', protocol.work_id]);
  }

  goToWorks(): void {
    this.router.navigate(['/works']);
  }

  selectWorkForProtocol(workId: string): void {
    this.selectedWorkId.set(workId);
  }

  startNewProtocol(): void {
    const workId = this.selectedWorkId();
    if (!workId) {
      return;
    }

    this.router.navigate(['/works/edit', workId]);
    this.selectedWorkId.set('');
  }

  getStatusKey(protocol: Protocol): string {
    const status = (protocol.status ?? 'draft').toUpperCase();
    return `PROTOCOL.STATUS.${status}`;
  }

  duplicateProtocol(protocol: Protocol): void {
    this.duplicateSource.set(protocol);
    this.duplicateTargetWorkId.set('');
    this.duplicateError.set('');
  }

  cancelDuplicate(): void {
    if (this.duplicateInProgress()) {
      return;
    }
    this.duplicateSource.set(null);
    this.duplicateTargetWorkId.set('');
    this.duplicateError.set('');
  }

  selectDuplicateTarget(workId: string): void {
    this.duplicateTargetWorkId.set(workId);
  }

  duplicateTargets(): Work[] {
    const protocolIds = new Set(this.protocols().map(protocol => protocol.work_id));
    return this.availableWorkOptions().filter(work => !protocolIds.has(work.id));
  }

  workHasProtocol(workId: string): boolean {
    return this.protocols().some(protocol => protocol.work_id === workId);
  }

  async confirmDuplicate(): Promise<void> {
    const source = this.duplicateSource();
    const targetWorkId = this.duplicateTargetWorkId();

    if (!source || !targetWorkId) {
      return;
    }

    this.duplicateInProgress.set(true);
    this.duplicateError.set('');

    try {
      await this.protocolService.prepareDuplicate(source.id);
      this.router.navigate(['/works', targetWorkId, 'protocol'], {
        queryParams: { duplicateFrom: source.id }
      });
      this.cancelDuplicate();
    } catch (error) {
      console.error('Failed to prepare duplicate', error);
      this.duplicateError.set('PROTOCOL_LIST.DUPLICATE_ERROR');
    } finally {
      this.duplicateInProgress.set(false);
    }
  }

  createWorkToStart(): void {
    this.router.navigate(['/works/create']);
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
