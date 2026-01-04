import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AdminManagementService, AdminInviteRow } from '../services/admin-management.service';

@Component({
  selector: 'app-admin-invites',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, DatePipe],
  templateUrl: './admin-invites.html',
  styleUrls: ['./admin-invites.scss']
})
export class AdminInvitesComponent {
  private readonly management = inject(AdminManagementService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly invites = signal<AdminInviteRow[]>([]);
  protected readonly creating = signal(false);

  protected readonly expiryMode = new FormControl<'days' | 'never'>('days', { nonNullable: true });
  protected readonly expiryDays = new FormControl(30, { nonNullable: true });

  constructor() {
    void this.loadInvites();
  }

  protected async loadInvites(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const data = await this.management.listAdminInvites();
      this.invites.set(data);
    } catch (error) {
      console.error('Failed to load admin invites', error);
      this.error.set('ADMIN.ERRORS.LOAD_INVITES');
    } finally {
      this.loading.set(false);
    }
  }

  protected async createInvite(): Promise<void> {
    if (this.creating()) {
      return;
    }

    this.creating.set(true);
    this.error.set(null);

    try {
      const mode = this.expiryMode.value;
      const days = this.expiryDays.value;
      let expiresAt: string | null = null;

      if (mode === 'days' && typeof days === 'number' && days > 0) {
        const target = new Date();
        target.setUTCDate(target.getUTCDate() + days);
        expiresAt = target.toISOString();
      }

      const invite = await this.management.createAdminInvite({ expiresAt });
      this.invites.update((list) => [invite, ...list]);
    } catch (error) {
      console.error('Failed to create admin invite', error);
      this.error.set('ADMIN.ERRORS.CREATE_INVITE');
    } finally {
      this.creating.set(false);
    }
  }

  protected async revokeInvite(invite: AdminInviteRow): Promise<void> {
    if (invite.revoked_at || invite.claimed_at) {
      return;
    }

    try {
      const updated = await this.management.revokeAdminInvite(invite.id);
      this.invites.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      console.error('Failed to revoke admin invite', error);
      this.error.set('ADMIN.ERRORS.REVOKE_INVITE');
    }
  }

  protected async copyCode(invite: AdminInviteRow): Promise<void> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(invite.code);
      }
    } catch (error) {
      console.warn('Clipboard copy failed', error);
    }
  }

  protected inviteStatus(invite: AdminInviteRow): 'active' | 'claimed' | 'revoked' | 'expired' {
    const now = Date.now();

    if (invite.revoked_at) {
      return 'revoked';
    }

    if (invite.claimed_at || invite.claimed_by) {
      return 'claimed';
    }

    if (invite.expires_at && new Date(invite.expires_at).getTime() < now) {
      return 'expired';
    }

    return 'active';
  }

  protected trackById(_index: number, invite: AdminInviteRow): string {
    return invite.id;
  }
}
