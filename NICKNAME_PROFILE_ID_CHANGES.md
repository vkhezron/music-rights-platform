# Database Schema Enhancement: nickname and profile_id Columns

## Problem
When adding rights holders manually without providing name fields, the database constraint `name_required` would fail with the error:
```
Failed to add rights holder: new row for relation "rights_holders" violates check constraint "name_required"
```

## Solution
Added two new columns to the `rights_holders` table to provide alternative identification methods:

### 1. Migration Files Created
**File**: `supabase/migrations/add_nickname_and_profile_id.sql`

**Changes**:
- Added `nickname VARCHAR(255)` - Optional nickname for quick identification
- Added `profile_id UUID` - Links to `auth.users(id)` for system-registered users
- Created index on `profile_id` for faster lookups
- Created unique index on `(workspace_id, profile_id)` for workspace-scoped uniqueness
- Added descriptive comments for database documentation

**File**: `supabase/migrations/update_name_required_constraint.sql`

**Changes**:
- Backfills blank nicknames with best-available fallbacks before updating the constraint
- Replaces the legacy `name_required` rule with a stricter check that requires either a non-empty `nickname` or a linked `profile_id`
- Aligns the database rule-set with the privacy-first identity model where nicknames are the primary identifier

### 2. TypeScript Model Updated
**File**: `src/models/rights-holder.model.ts`

**Changes**:
```typescript
// Platform
linked_user_id?: string;
profile_id?: string;  // NEW: UUID linking to auth.users(id) for registered users
```

### 3. Code Logic Enhanced
**File**: `src/app/split-editor/split-editor.ts`

**Method**: `createRightsHolder()`

**Enhancement**: Normalizes/auto-generates nicknames before insert:
```typescript
const resolvedNickname = this.resolveNickname(holderData);
if (resolvedNickname) {
  insertData.nickname = resolvedNickname;
}

if (!insertData.nickname && !insertData.profile_id) {
  insertData.nickname = this.generateFallbackNickname();
}
```

**Profile ID Support**: Automatically forwards `profile_id` when a profile is linked.

## Workflow Impact

### Add Me Flow
- User's nickname from profile is used ✓
- Linked to `profile_id` automatically

### Scan QR Flow  
- Scanned user's nickname is used ✓
- Linked to `profile_id` automatically

### Add Manually Flow
- Dedicated nickname input (required) ✓
- Automatic normalization to lowercase slug format ✓
- Fallback generator ensures a nickname even if manual input is blank ✓

## Build Status
✅ **SUCCESS** - 0 errors, 1 unrelated warning
- All TypeScript changes compile correctly
- Bundle size maintained at 554.08 kB (split-editor chunk)

## Database Setup
To apply these changes in Supabase:

1. Navigate to Supabase console
2. Go to SQL Editor
3. Run `supabase/migrations/add_nickname_and_profile_id.sql` to add the new columns and indexes
4. Run `supabase/migrations/update_name_required_constraint.sql` to backfill nicknames and tighten the constraint
5. Verify `rights_holders` now enforces `nickname` or `profile_id`

## Testing Checklist
- [ ] Create rights holder via "Add Me" workflow
- [ ] Create rights holder via "Scan QR" workflow  
- [ ] Create rights holder via "Add Manually" with first/last name
- [ ] Create rights holder via "Add Manually" with only company name
- [ ] Create rights holder via "Add Manually" with only email
- [ ] Verify `name_required` constraint no longer causes errors
- [ ] Check that `nickname` is properly populated in database and normalized

## Backward Compatibility
- `linked_user_id` field maintained for existing code
- `profile_id` is optional, doesn't affect existing data
- `nickname` auto-generation is transparent to user workflows
