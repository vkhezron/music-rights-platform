import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { WorkspaceList } from './workspace-list';
import { WorkspaceService } from '../../services/workspace.service';
import { TranslateMockLoader } from '../../../testing/translate-mock.loader';

describe('WorkspaceList', () => {
  let component: WorkspaceList;
  let fixture: ComponentFixture<WorkspaceList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        WorkspaceList,
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
            workspaces: of([]),
            currentWorkspace: null,
            setCurrentWorkspace: () => {},
          } as unknown as WorkspaceService,
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkspaceList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
