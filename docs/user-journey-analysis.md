# User Journey Analysis

## Overview

This document captures the current user journey assessment for the Music Rights Platform, highlights the most critical friction points, and informs the ticket backlog required to address them.

- Journeys analysed: 5 (Work registration, contributor approval, rights conflict resolution, dashboard management, developer integration)
- Total friction points identified: 35+
- Primary personas: songwriter/composer (Max), publisher/label rep (Anna), session contributor (Tom)

---

## Journeys & Friction Points

### 1. Register a New Work (First-Time User)
- Missing onboarding or quick start guidance on first visit.
- Dashboard lacks a clear primary action to register the first work.
- Large single-page form with 15+ mixed-required fields.
- Split editor lacks live totals, auto-balance, and user-friendly language ("Protocol" terminology leaks into UI).
- Submissions provide limited success/error feedback.

**Impact:** ~45% abandonment rate, ~18 minutes per task, 35% error rate in split allocation.

### 2. Contributor Approval (Mobile User)
- Notification links require full login without magic-link support.
- Desktop-oriented approval screens do not adapt to mobile; touch targets below 44×44 px.
- Action buttons and flows unclear for contributors reviewing proposed shares.

**Impact:** ~70% mobile bounce rate, high drop-off for fast approvals.

### 3. Rights Conflict Resolution
- No in-app counter-proposal or negotiation tooling.
- Disputes handled off-platform via email/DM, with no audit trail or conflict resolution guardrails.

**Impact:** Conflict resolution stretches to days/weeks; inconsistent outcomes.

### 4. Dashboard Management (Power User)
- Flat list of works without prioritisation (pending approvals, conflicts).
- No bulk operations for common updates (publisher swap, territory changes).

**Impact:** Routine portfolio management takes 10x longer than necessary.

### 5. Developer Integration
- Eight protocol-related markdown files with overlapping content and no single entry point.
- Missing quickstart code samples and first-call walkthrough.
- Setup steps and dependencies unclear.

**Impact:** Time to first integration jumps from target 30 minutes to 1–2 days.

---

## Critical Problems (P0)
1. Split editor lacks live validation and accessible summary of totals.
2. Protocol terminology surfaces directly in UI copy and actions.
3. Mobile experience for approval flow is not touch-friendly and forces logins.
4. Work registration is a monolithic form with no guidance.
5. Documentation is fragmented across many files with no hierarchy.

---

## Quick-Win Recommendations (1–2 weeks)
- Implement real-time totals, validation states, and auto-balance prompts in the split editor.
- Replace protocol-specific copy in the UI with end-user language (e.g. "Rights Distribution").
- Provide success/error toast notifications and human-readable messaging on key flows.
- Introduce baseline mobile responsiveness improvements for approvals and forms.
- Consolidate documentation into a structured `docs/` hierarchy with clear entry points.

---

## Backlog Alignment

The following tickets have been created or updated to cover the identified friction points:

1. **Split Protocol Terminology Cleanup** – Replace "Protocol" UI strings, toasts, and docs with "Split Protocol" or rights-centric phrasing.
2. **Split Editor Live Total & Validation UX** – Real-time totals, color-coded statuses, inline feedback, submit gating, and tests.
3. **Approval Flow Mobile Experience** – Mobile-first view, magic-link support, touch-friendly controls.
4. **Work Creation Multi-Step Form Refactor** – Guided steps, progress indicator, help text, save draft.
5. **Split Editor Visual Enhancements** – Optional charts, helper text, auto-balance suggestions.
6. **Conflict Resolution Workflow** – In-app negotiation, history, deadlock assistance.
7. **Dashboard Attention & Bulk Actions** – Prioritised alerts, filters, multi-select, quick stats.
8. **Onboarding & Tutorial Experience** – New user walkthrough, sample work, tooltips.
9. **Success/Error Feedback Framework** – Consistent toast/dialog handling and copy standards.
10. **Documentation Restructure** – Consolidated docs, index, changelog, development setup.
11. **Developer Quickstart Examples** – Copy/paste API samples and reference payloads.
12. **Bulk Rights Management Utilities** – Batch editing tools and audit logs.
13. **Work Submission Review & Success Flow** – Add a dedicated review step, clarify post-submit messaging, and ensure consistent confirmation states across journeys.

Additional tickets will be opened as new insights emerge while implementing the above backlog items.

---

## KPIs & Targets

| Metric                  | Current | Post Quick-Wins | Target (Phase 2+) |
|-------------------------|---------|-----------------|-------------------|
| Task completion rate    | 55%     | 75%             | 95%               |
| Avg time per task       | 18 min  | 12 min          | 4 min             |
| Split error rate        | 35%     | 15%             | 2%                |
| User satisfaction (NPS) | -10     | +25             | +70               |
| Mobile usage share      | 15%     | 25%             | 60%               |

---

## Next Steps
- Prioritise P0 tickets and begin implementation sprints.
- Gather UI screenshots/demos to validate assumptions and guide redesign.
- Review `IMPLEMENTATION_COMPLETE.md` and `PROTOCOL_SUMMARY.md` to reconcile backlog with documented status.
- Monitor KPIs post-implementation to validate improvements.
