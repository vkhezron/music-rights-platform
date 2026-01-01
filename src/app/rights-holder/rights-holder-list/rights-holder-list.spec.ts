import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { RightsHolderListComponent } from './rights-holder-list';
import { RightsHoldersService } from '../../services/rights-holder';
import { WorkspaceService } from '../../services/workspace.service';
import { TranslateMockLoader } from '../../../testing/translate-mock.loader';

describe('RightsHolderList', () => {
  let component: RightsHolderListComponent;
  let fixture: ComponentFixture<RightsHolderListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RightsHolderListComponent,
        RouterTestingModule,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TranslateMockLoader },
        }),
      ],
      providers: [
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } as Partial<Router> },
        {
          provide: RightsHoldersService,
          useValue: {
            loadRightsHolders: () => Promise.resolve(),
            rightsHolders$: of([]),
            getDisplayName: () => 'Test Holder',
            deleteRightsHolder: () => Promise.resolve(),
          } as unknown as RightsHoldersService,
        },
        {
          provide: WorkspaceService,
          useValue: {
            currentWorkspace: { id: 'workspace-1' },
            currentWorkspace$: of({ id: 'workspace-1' }),
          } as unknown as WorkspaceService,
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(RightsHolderListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
