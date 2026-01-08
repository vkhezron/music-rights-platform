import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { SplitEditorComponent } from './split-editor';
import type { SplitEntry } from './models/split-entry.model';
import type { Work } from '../models/work.model';
import { WorksService } from '../services/works';
import { RightsHoldersService } from '../services/rights-holder';
import { ProfileService } from '../services/profile.service';
import { QRScannerService } from '../services/qr-scanner.service';
import { PdfGeneratorService } from '../services/pdf-generator.service';
import { SupabaseService } from '../services/supabase.service';
import { TranslateMockLoader } from '../../testing/translate-mock.loader';

describe('SplitEditorComponent', () => {
  let component: SplitEditorComponent;
  let fixture: ComponentFixture<SplitEditorComponent>;
  const createWork = (workType: Work['work_type']): Work => {
    const timestamp = new Date().toISOString();
    return {
      id: 'work-1',
      workspace_id: 'workspace-1',
      work_title: 'Test Work',
      is_cover_version: false,
      status: 'draft',
      created_by: 'user-1',
      created_at: timestamp,
      updated_at: timestamp,
      work_type: workType,
    } as Work;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SplitEditorComponent,
        RouterTestingModule,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TranslateMockLoader },
        }),
      ],
      providers: [
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } as Partial<Router> },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ id: 'work-1' }) },
          } as Partial<ActivatedRoute>,
        },
        {
          provide: WorksService,
          useValue: {
            getWork: () => Promise.resolve(null),
            saveWorkSplits: () => Promise.resolve(),
          } as unknown as WorksService,
        },
        {
          provide: RightsHoldersService,
          useValue: {
            rightsHolders$: of([]),
            refresh: () => Promise.resolve(),
            getRightsholderById: () => Promise.resolve(null),
          } as unknown as RightsHoldersService,
        },
        {
          provide: ProfileService,
          useValue: {
            currentProfile: null,
            loadProfile: () => Promise.resolve(null),
            getProfileByUserNumber: () => Promise.resolve(null),
          } as unknown as ProfileService,
        },
        { provide: QRScannerService, useValue: { hasCameraSupport: () => Promise.resolve(false), startScanning: () => Promise.resolve(), stopScanning: () => {} } as unknown as QRScannerService },
        {
          provide: PdfGeneratorService,
          useValue: {
            generateProtocolPDF: () => Promise.resolve(new Blob()),
            downloadProtocol: () => Promise.resolve(),
          } as unknown as PdfGeneratorService,
        },
        { provide: SupabaseService, useValue: { currentUser: { id: 'user-1', email: 'test@example.com' } } as unknown as SupabaseService },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(SplitEditorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should flag totals that do not reach 100%', () => {
    const baseEntry: SplitEntry = {
      entryMethod: 'add_manually',
      splitType: 'lyrics',
      ownershipPercentage: 60,
      nickname: 'writer1',
      aiDisclosure: { creationType: 'human' },
      isReadonly: false,
    };

    component['entries'].set([baseEntry, { ...baseEntry, ownershipPercentage: 20, tempId: 'tmp-2' }]);

    expect(component['lyricsStatus']().state).toBe('under');
    expect(component['canSubmit']()).toBeFalsy();
    const totalHint = (component as any).totalHint(component['lyricsStatus']());
    expect(totalHint).toContain('SPLITS.TOTAL_HINT_MISSING');
  });

  it('should allow saving only when all totals equal 100%', () => {
    const lyricEntry: SplitEntry = {
      entryMethod: 'add_manually',
      splitType: 'lyrics',
      ownershipPercentage: 100,
      nickname: 'writer1',
      aiDisclosure: { creationType: 'human' },
      isReadonly: false,
    };

    const musicEntry: SplitEntry = {
      entryMethod: 'add_manually',
      splitType: 'music',
      ownershipPercentage: 100,
      nickname: 'composer1',
      aiDisclosure: { creationType: 'human' },
      isReadonly: false,
    };

    component['entries'].set([lyricEntry, musicEntry]);

    expect(component['lyricsStatus']().state).toBe('complete');
    expect(component['musicStatus']().state).toBe('complete');
    expect(component['canSubmit']()).toBeTruthy();
  });

  it('should treat instrumental works as music-only splits', () => {
    component['work'].set(createWork('instrumental'));

    const musicEntry: SplitEntry = {
      entryMethod: 'add_manually',
      splitType: 'music',
      ownershipPercentage: 100,
      nickname: 'composer1',
      aiDisclosure: { creationType: 'human' },
      isReadonly: false,
    };

    component['entries'].set([musicEntry]);

    expect(component['lyricsStatus']().hasEntries).toBeFalsy();
    expect(component['musicStatus']().state).toBe('complete');
    expect(component['canSubmit']()).toBeTruthy();
  });

  it('should block lyric additions when work type is instrumental', async () => {
    component['work'].set(createWork('instrumental'));

    await (component as any).addManualEntry('lyrics');

    expect(component['entries']().length).toBe(0);
  });
});
