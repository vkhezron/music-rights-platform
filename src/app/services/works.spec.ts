import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { WorksService } from './works';
import { SupabaseService } from './supabase.service';
import { WorkspaceService } from './workspace.service';

describe('WorksService', () => {
  let service: WorksService;

  beforeEach(() => {
    const supabaseStub = {
      currentUser: null,
      client: {
        from: () => ({
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [], error: null })
            }),
          }),
        }),
      } as any,
    } as Partial<SupabaseService>;

    const workspaceStub = {
      currentWorkspace: null,
      currentWorkspace$: of(null),
      currentWorkspaceSubject: null,
    } as Partial<WorkspaceService>;

    TestBed.configureTestingModule({
      providers: [
        WorksService,
        { provide: SupabaseService, useValue: supabaseStub },
        { provide: WorkspaceService, useValue: workspaceStub },
      ],
    });
    service = TestBed.inject(WorksService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
