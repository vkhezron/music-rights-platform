# Security Questions Migration Update

## Changes Made

### 1. **Database Migration Updated** ✅
File: `supabase/migrations/20260103_create_security_questions_table.sql`

**Schema Changes:**
- Added `question_key` column (UNIQUE TEXT) - for identifying questions in code
- Added `display_order` column (INTEGER) - for ordering questions in UI
- Changed default category from `'music'` to `'personal'`

**Questions Updated:**
Replaced music-themed questions with 20 universal security questions across 3 categories:

**Personal Category (5 questions):**
1. What was the name of your childhood best friend?
2. What was the name of your first pet?
3. In what city were you born?
4. What is your mother's maiden name?
5. What was the name of your favorite teacher?

**Knowledge Category (5 questions):**
6. What was your dream job as a child?
7. What is your favorite book of all time?
8. What was the make and model of your first car?
9. What was your favorite food as a child?
10. What was your paternal grandfather's occupation?

**Experience Category (7 questions):**
11. What was the name of your elementary school?
12. What was your first job?
13. Where did you go on your first vacation?
14. What street did you grow up on?
15. What year was most memorable to you and why?
16. In what city did you meet your spouse/partner?
17. What was the first concert you attended?

**Additional Personal (2 questions):**
18. What is the middle name of your oldest sibling?
19. What was your childhood nickname?
20. Who was your childhood hero?

### 2. **Service Code** ✅
`src/app/services/auth-recovery.service.ts` - Already compatible
- Interface already includes `question_key` field
- `getSecurityQuestions()` queries by `display_order` for proper sorting

### 3. **Components** ✅
`src/app/auth/register/register-new.ts` - Already compatible
- Displays `question_text` directly from database
- No translation key changes needed (questions are stored in DB, not i18n)

## How to Apply

### Step 1: Update Database Schema
Since the table structure changed, you'll need to:

1. **Go to Supabase Dashboard** → SQL Editor
2. **Run this command first** to drop the old table:
```sql
DROP TABLE IF EXISTS public.security_questions CASCADE;
```

3. **Then run the full migration:**
Copy and execute the entire contents of:
`supabase/migrations/20260103_create_security_questions_table.sql`

### Step 2: Verify
After running the migration, verify it worked:
```sql
SELECT * FROM public.security_questions ORDER BY display_order;
```

You should see 20 questions with proper `question_key` values like `SECURITY.Q_CHILDHOOD_FRIEND`, etc.

## Key Benefits

✅ **Universal questions** - Not music-specific, suitable for all users  
✅ **Categorized** - Questions organized by type for better UX  
✅ **Ordered** - `display_order` ensures consistent UI ordering  
✅ **Translatable** - `question_key` format allows future i18n if needed  
✅ **Identifiable** - Unique `question_key` makes questions easier to track  

## Testing

After migration, test the registration flow:
1. Start signup process
2. Navigate to "Recovery" step
3. Verify you see the universal security questions in the dropdowns
4. Ensure the questions display in proper order

## Rollback (if needed)

If you need to revert:
```sql
DROP TABLE IF EXISTS public.security_questions CASCADE;
```

Then re-run the original migration without the new columns.
