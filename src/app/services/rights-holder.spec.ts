import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { RightsHoldersService } from './rights-holder';
import { SupabaseService } from './supabase.service';
import { WorkspaceService } from './workspace.service';

describe('RightsHoldersService', () => {
  let service: RightsHoldersService;

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
    } as Partial<WorkspaceService>;

    TestBed.configureTestingModule({
      providers: [
        RightsHoldersService,
        { provide: SupabaseService, useValue: supabaseStub },
        { provide: WorkspaceService, useValue: workspaceStub },
      ],
    });
    service = TestBed.inject(RightsHoldersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
