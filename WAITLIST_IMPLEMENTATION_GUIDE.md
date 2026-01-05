# Waitlist Implementation Guide

Follow these steps to deploy the new invite-only waitlist experience end-to-end. Estimated effort: 30–45 minutes including verification.

## 1. Database setup (Supabase)

1. Open the Supabase SQL Editor for your project.
2. Run `supabase/migrations/20260104_create_waitlist_system.sql` (or `\ir waitlist-migration.sql` if operating via psql) to create:
   - `waitlist_requests` table with duplicate-safe storage.
   - RLS policies granting anonymous inserts and service role management access.
   - Helper triggers for `updated_at` tracking.
   - RPC `waitlist_public_metrics()` plus admin helpers `waitlist_mark_invited` / `waitlist_mark_converted`.
3. Confirm the function appears under **Database > Functions** and test with `select * from waitlist_public_metrics();`.

## 2. Environment check

- No new environment variables are required.
- Ensure your Supabase anon key is available to the Angular app (already handled in `environment.ts`).

## 3. Frontend wiring

1. Replace the existing landing component files with the versions in `src/app/landing/`.
2. Add the new `WaitlistService` under `src/app/services/` if it is not already present.
3. Verify `waitlist.service.ts` is exported via Angular's dependency graph by running `npx ng build`.

## 4. Translations

- Merge the updated `LANDING` keys into each language file under `public/assets/i18n/`.
- At minimum, replicate the English strings for languages that do not yet have localized copy to avoid placeholder keys on production builds.

## 5. Testing checklist

| Area | What to verify |
| --- | --- |
| Form validation | Required errors fire when contact method, handle, role, or description are missing. Handles under three characters should trigger validation. |
| Duplicate handling | Re-submit the same contact method + handle to confirm the duplicate error message renders. |
| Success flow | Successful submission clears the form, shows success feedback, and increments the waitlist count after refresh. |
| Metrics RPC | Network tab should display a call to `waitlist_public_metrics`. Blocking it should render the fallback error state. |
| Responsive layout | Confirm hero, comparison table, and footer display correctly on mobile (≤640 px), tablet, and desktop. |

## 6. Optional admin follow-up

- Wire `src/app/admin/waitlist/admin-waitlist.component.ts` into the admin routes to manage invites once phase-two is prioritized.
- Leverage the helper functions to mark invites as sent or converted when integrating with Supabase Edge Functions.

## 7. Deployment tips

- Run `npx ng build` to ensure the Angular bundle compiles cleanly before pushing.
- Apply the migration via your CI/CD pipeline or Supabase migrations workflow so the RPC and RLS changes land with code.
- Update privacy and terms pages linked in the footer if they are not yet populated.

You are now ready to collect structured beta interest while keeping onboarding limited to invitees.
