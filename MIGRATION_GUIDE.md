# Database Migration Guide

## Issue Fixed
The `security_questions` table was missing from your Supabase database, causing the password recovery feature to fail with error:
```
Could not find the table 'public.security_questions' in the schema cache
```

## Migration Created
A new migration file has been created: `supabase/migrations/20260103_create_security_questions_table.sql`

This migration:
- Creates the `security_questions` table with predefined music-themed questions
- Sets up Row Level Security (RLS) policies
- Inserts 10 default questions for account recovery
- Creates an index for faster lookups

## How to Apply the Migration

### Option 1: Using Supabase Studio (Recommended for now)
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor
4. Click "New Query"
5. Copy the entire contents of `supabase/migrations/20260103_create_security_questions_table.sql`
6. Paste it into the query editor
7. Click "Run"

### Option 2: Using Supabase CLI (When available)
```bash
supabase migration up
```

## Verification
After applying the migration, the error should be gone and users will be able to see security questions when signing up.

## Table Schema
```sql
security_questions
├── id (BIGSERIAL PRIMARY KEY)
├── question_text (TEXT NOT NULL)
├── category (TEXT DEFAULT 'music')
├── is_active (BOOLEAN DEFAULT true)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

## Default Questions Inserted
1. "What is the name of your first band or musical group?"
2. "What was your favorite instrument as a child?"
3. "What is the title of your first recorded song?"
4. "Who is your favorite music artist of all time?"
5. "What music festival would you most like to attend?"
6. "What is the name of your first concert you attended?"
7. "What music genre do you identify with the most?"
8. "What is the name of a song that has special meaning to you?"
9. "Which music production software did you first learn?"
10. "What is the name of your musical mentor or inspiration?"
