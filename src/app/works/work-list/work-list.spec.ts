import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, of } from 'rxjs';

import { WorksListComponent } from './work-list';
import { WorkspaceService } from '../../services/workspace.service';
import { WorksService } from '../../services/works';
import { TranslateMockLoader } from '../../../testing/translate-mock.loader';

describe('WorkList', () => {
  let component: WorksListComponent;
  let fixture: ComponentFixture<WorksListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        WorksListComponent,
        RouterTestingModule,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TranslateMockLoader },
        }),
      ],
      providers: [
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } as Partial<Router> },
        {
          provide: WorkspaceService,
          useValue: {
            currentWorkspace: { id: 'workspace-1' },
            currentWorkspace$: of({ id: 'workspace-1' }),
          } as unknown as WorkspaceService,
        },
        {
          provide: WorksService,
          useValue: {
            works$: new BehaviorSubject([]),
            loadWorks: () => Promise.resolve(),
            deleteWork: () => Promise.resolve(),
          } as unknown as WorksService,
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorksListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
