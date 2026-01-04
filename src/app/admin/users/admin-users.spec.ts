import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AdminUsersComponent } from './admin-users';
import { AdminManagementService, AdminProfileRow } from '../services/admin-management.service';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateMockLoader } from '../../../testing/translate-mock.loader';

interface ManagementMock {
  listProfiles: ReturnType<typeof vi.fn>;
  updateProfileFlags: ReturnType<typeof vi.fn>;
}

describe('AdminUsersComponent', () => {
  let component: AdminUsersComponent;
  let management: ManagementMock;

  beforeEach(async () => {
    management = {
      listProfiles: vi.fn().mockResolvedValue({ items: [], count: 0 }),
      updateProfileFlags: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TranslateMockLoader }
        }),
        AdminUsersComponent
      ],
      providers: [{ provide: AdminManagementService, useValue: management }]
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setDefaultLang('en');
    translate.use('en');

    const fixture = TestBed.createComponent(AdminUsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    management.listProfiles.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('grants admin access when toggled from a standard user', async () => {
    const user: AdminProfileRow = {
      id: 'user-1',
      user_number: 101,
      display_name: 'Alex Artist',
      nickname: 'alex',
      primary_role: 'producer',
      is_admin: false,
      is_deactivated: false,
      deactivated_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const updatedUser = { ...user, is_admin: true };
    management.updateProfileFlags.mockResolvedValue(updatedUser);

    (component as any).users.set([user]);

    await (component as any).toggleAdmin(user);

    expect(management.updateProfileFlags).toHaveBeenCalledWith('user-1', { is_admin: true });
    expect((component as any).users()[0].is_admin).toBe(true);
  });

  it('deactivates an active user and persists the returned profile', async () => {
    vi.useFakeTimers();
    const now = new Date('2026-01-04T12:00:00.000Z');
    vi.setSystemTime(now);

    const user: AdminProfileRow = {
      id: 'user-2',
      user_number: 202,
      display_name: 'Bobby Band',
      nickname: 'bobby',
      primary_role: 'songwriter',
      is_admin: false,
      is_deactivated: false,
      deactivated_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };

    const updatedUser = { ...user, is_deactivated: true, deactivated_at: now.toISOString() };
    management.updateProfileFlags.mockResolvedValue(updatedUser);

    (component as any).users.set([user]);
    (component as any).statusFilter.set('all');

    await (component as any).toggleDeactivated(user);

    expect(management.updateProfileFlags).toHaveBeenCalledWith('user-2', {
      is_deactivated: true,
      deactivated_at: now.toISOString()
    });
    expect((component as any).users()[0].is_deactivated).toBe(true);
  });

  it('reactivates a deactivated user and reloads when filtered list is active', async () => {
    const deactivatedUser: AdminProfileRow = {
      id: 'user-3',
      user_number: 303,
      display_name: 'Casey Collaborator',
      nickname: 'casey',
      primary_role: 'manager',
      is_admin: true,
      is_deactivated: true,
      deactivated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const reactivated = { ...deactivatedUser, is_deactivated: false, deactivated_at: null };
    management.updateProfileFlags.mockResolvedValue(reactivated);

    (component as any).users.set([deactivatedUser]);
    (component as any).statusFilter.set('deactivated');

    const initialCalls = management.listProfiles.mock.calls.length;

    await (component as any).toggleDeactivated(deactivatedUser);

    expect(management.updateProfileFlags).toHaveBeenCalledWith('user-3', {
      is_deactivated: false,
      deactivated_at: null
    });
    expect(management.listProfiles).toHaveBeenCalledTimes(initialCalls + 1);
  });
});
