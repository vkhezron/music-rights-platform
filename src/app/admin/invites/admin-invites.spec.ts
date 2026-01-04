import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AdminInvitesComponent } from './admin-invites';
import { AdminManagementService, AdminInviteRow } from '../services/admin-management.service';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateMockLoader } from '../../../testing/translate-mock.loader';

interface ManagementMock {
  listAdminInvites: ReturnType<typeof vi.fn>;
  createAdminInvite: ReturnType<typeof vi.fn>;
  revokeAdminInvite: ReturnType<typeof vi.fn>;
}

describe('AdminInvitesComponent', () => {
  let component: AdminInvitesComponent;
  let management: ManagementMock;
  let clipboardWrite: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    management = {
      listAdminInvites: vi.fn().mockResolvedValue([]),
      createAdminInvite: vi.fn(),
      revokeAdminInvite: vi.fn()
    };

    clipboardWrite = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator as any, { clipboard: { writeText: clipboardWrite } });

    await TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TranslateMockLoader }
        }),
        AdminInvitesComponent
      ],
      providers: [{ provide: AdminManagementService, useValue: management }]
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setDefaultLang('en');
    translate.use('en');

    const fixture = TestBed.createComponent(AdminInvitesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    management.listAdminInvites.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('creates a new invite with a 30-day expiry and prepends it to the list', async () => {
    vi.useFakeTimers();
    const now = new Date('2026-01-04T00:00:00.000Z');
    vi.setSystemTime(now);

    const expectedExpiry = new Date(now);
    expectedExpiry.setUTCDate(expectedExpiry.getUTCDate() + 30);

    const invite: AdminInviteRow = {
      id: 'invite-1',
      code: 'ABCD-123-XYZ',
      created_by: 'admin',
      claimed_by: null,
      expires_at: expectedExpiry.toISOString(),
      claimed_at: null,
      revoked_at: null,
      metadata: {},
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };

    management.createAdminInvite.mockResolvedValue(invite);

    await (component as any).createInvite();

    expect(management.createAdminInvite).toHaveBeenCalledWith({ expiresAt: expectedExpiry.toISOString() });
    expect((component as any).invites()[0]).toEqual(invite);
  });

  it('revokes an active invite and updates the list entry', async () => {
    const activeInvite: AdminInviteRow = {
      id: 'invite-2',
      code: 'WXYZ-999-AAA',
      created_by: 'admin',
      claimed_by: null,
      expires_at: null,
      claimed_at: null,
      revoked_at: null,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const revoked = { ...activeInvite, revoked_at: new Date().toISOString() };
    management.revokeAdminInvite.mockResolvedValue(revoked);

    (component as any).invites.set([activeInvite]);

    await (component as any).revokeInvite(activeInvite);

    expect(management.revokeAdminInvite).toHaveBeenCalledWith('invite-2');
    expect((component as any).invites()[0].revoked_at).toEqual(revoked.revoked_at);
  });

  it('copies an invite code using the clipboard API when available', async () => {
    const invite: AdminInviteRow = {
      id: 'invite-3',
      code: 'COPY-000-AAA',
      created_by: 'admin',
      claimed_by: null,
      expires_at: null,
      claimed_at: null,
      revoked_at: null,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await (component as any).copyCode(invite);

    expect(clipboardWrite).toHaveBeenCalledWith('COPY-000-AAA');
  });
});
