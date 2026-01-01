import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { WorkFormComponent } from './work-form';
import { WorksService } from '../../services/works';
import { WorkspaceService } from '../../services/workspace.service';
import { FeedbackService } from '../../services/feedback.service';
import { TranslateMockLoader } from '../../../testing/translate-mock.loader';

describe('WorkForm', () => {
  let component: WorkFormComponent;
  let fixture: ComponentFixture<WorkFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        WorkFormComponent,
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
          } as Partial<ActivatedRoute>,
        },
        {
          provide: WorksService,
          useValue: {
            getWork: () => Promise.resolve(null),
            createWork: () =>
              Promise.resolve({
                id: 'work-1',
                workspace_id: 'workspace-1',
                work_title: 'Test Work',
                is_cover_version: false,
                status: 'draft',
                created_by: 'user-1',
                created_at: '',
                updated_at: '',
              }),
            updateWork: () =>
              Promise.resolve({
                id: 'work-1',
                workspace_id: 'workspace-1',
                work_title: 'Test Work',
                is_cover_version: false,
                status: 'draft',
                created_by: 'user-1',
                created_at: '',
                updated_at: '',
              }),
          } as unknown as WorksService,
        },
        {
          provide: WorkspaceService,
          useValue: {
            currentWorkspace: { id: 'workspace-1' },
            currentWorkspace$: of({ id: 'workspace-1' }),
          } as unknown as WorkspaceService,
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
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
