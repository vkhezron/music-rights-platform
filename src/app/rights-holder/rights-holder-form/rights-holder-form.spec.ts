import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { RightsHolderFormComponent } from './rights-holder-form';
import { RightsHoldersService } from '../../services/rights-holder';
import { FeedbackService } from '../../services/feedback.service';
import { IpiLookupService } from '../../services/ipi-lookup.service';
import { TranslateMockLoader } from '../../../testing/translate-mock.loader';

describe('RightsHolderForm', () => {
  let component: RightsHolderFormComponent;
  let fixture: ComponentFixture<RightsHolderFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RightsHolderFormComponent,
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
            snapshot: { paramMap: convertToParamMap({}) },
            queryParams: of({}),
          } as Partial<ActivatedRoute>,
        },
        {
          provide: RightsHoldersService,
          useValue: {
            getRightsHolder: () => Promise.resolve(null),
            createRightsHolder: () =>
              Promise.resolve({
                id: 'rh-1',
                workspace_id: 'workspace-1',
                type: 'person',
                kind: 'creator',
                created_by: 'user-1',
                created_at: '',
                updated_at: '',
              } as any),
            updateRightsHolder: () =>
              Promise.resolve({
                id: 'rh-1',
                workspace_id: 'workspace-1',
                type: 'person',
                kind: 'creator',
                created_by: 'user-1',
                created_at: '',
                updated_at: '',
              } as any),
          } as unknown as RightsHoldersService,
        },
        {
          provide: FeedbackService,
          useValue: {
            success: () => 'success-id',
            error: () => 'error-id',
            warning: () => 'warning-id',
            info: () => 'info-id',
            handleError: () => 'error',
          } as unknown as FeedbackService,
        },
        {
          provide: IpiLookupService,
          useValue: {
            validateFormat: () => true,
            lookup: () => Promise.resolve(null),
          } as unknown as IpiLookupService,
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(RightsHolderFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
