import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-waitlist',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="waitlist-admin">
      <header class="waitlist-admin__header">
        <h1>Waitlist management (preview)</h1>
        <p>
          This component is a phase-two scaffold. Wire it into the admin routes when you are ready to surface
          invite approvals directly in the console.
        </p>
        <a routerLink="/admin">Return to admin overview</a>
      </header>
      <div class="waitlist-admin__body">
        <ol>
          <li>Use the Supabase function <code>waitlist_public_metrics</code> to keep the landing metrics in sync.</li>
          <li>Call <code>waitlist_mark_invited</code> after sending an invite email so the queue reflects your outreach.</li>
          <li>Call <code>waitlist_mark_converted</code> once an invitee completes onboarding.</li>
        </ol>
        <p>
          Future iteration: list waitlist entries filtered by status, provide bulk actions, and feed into your
          transactional email workflow.
        </p>
      </div>
    </section>
  `,
  styles: [
    `
      .waitlist-admin {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        padding: 2rem;
      }

      .waitlist-admin__header h1 {
        margin-bottom: 0.75rem;
      }

      .waitlist-admin__body ol {
        margin: 0 0 1.5rem;
        padding-left: 1.25rem;
      }

      a {
        color: #4f46e5;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminWaitlistComponent {}
