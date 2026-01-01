import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { Dashboard } from './dashboard';
import { SupabaseService } from '../services/supabase.service';
import { ProfileService } from '../services/profile.service';
import { WorkspaceService } from '../services/workspace.service';
import { WorksService } from '../services/works';
import { TranslateMockLoader } from '../../testing/translate-mock.loader';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        Dashboard,
        RouterTestingModule,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TranslateMockLoader },
        }),
      ],
      providers: [
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } as Partial<Router> },
        { provide: SupabaseService, useValue: { currentUser: { id: 'user-1' } } as unknown as SupabaseService },
        { provide: ProfileService, useValue: { profile$: of(null), loadProfile: () => Promise.resolve(null) } as unknown as ProfileService },
        {
          provide: WorkspaceService,
          useValue: {
            workspaces$: of([]),
            currentWorkspace$: of(null),
            currentWorkspace: null,
            loadUserWorkspaces: () => Promise.resolve(),
            setCurrentWorkspace: () => {},
          } as unknown as WorkspaceService,
        },
        {
          provide: WorksService,
          useValue: {
            createWork: () =>
              Promise.resolve({
                id: 'work-1',
                workspace_id: 'workspace-1',
                work_title: 'Test',
                is_cover_version: false,
                status: 'draft',
                created_by: 'user-1',
                created_at: '',
                updated_at: '',
              }),
          } as unknown as WorksService,
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
