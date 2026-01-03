# Auth User Journey Redesign - Privacy-First Approach

## Overview
Improved authentication system that:
- ✅ Does NOT collect email addresses during signup
- ✅ Uses username-based authentication
- ✅ Provides password recovery WITHOUT email
- ✅ Implements security questions for account recovery
- ✅ Maintains strong security standards
- ✅ Respects user privacy

## Architecture Changes

### 1. Database Schema Enhancements

#### New Table: `user_recovery_credentials`
Stores security questions and recovery codes without sensitive data:
```sql
CREATE TABLE public.user_recovery_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recovery_code TEXT NOT NULL UNIQUE, -- Hashed recovery code
  security_question_1 TEXT NOT NULL,  -- Encrypted question
  security_answer_1 TEXT NOT NULL,    -- Hashed answer
  security_question_2 TEXT NOT NULL,
  security_answer_2 TEXT NOT NULL,
  backup_codes TEXT[] NOT NULL,       -- Array of hashed codes
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### 2. Updated User Profile Table
Add username field:
```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE NOT NULL,
  ADD COLUMN IF NOT EXISTS recovery_email TEXT, -- Optional, user-provided
  ADD COLUMN IF NOT EXISTS has_completed_recovery_setup BOOLEAN DEFAULT false;
```

### 3. Authentication Flow

#### Sign-Up Process (New)
1. Enter **username** (3-20 chars, alphanumeric + underscore)
2. Enter **display name** (optional, for UI)
3. Create **password** (strong requirements)
4. Set **2 security questions** (from predefined list or custom)
5. Generate **5 backup recovery codes** (show once, user saves)
6. Optional: Add recovery email (user's choice)

#### Password Recovery (New)
**Option 1: Security Questions**
- Enter username
- Answer 2 security questions
- Set new password

**Option 2: Recovery Code**
- Enter username
- Enter one of the 5 backup codes
- Set new password

**Option 3: Recovery Email** (if provided during setup)
- Enter username
- Click recovery email link
- Set new password

## Component Changes

### Modified Components:
1. **Login Component** - Add "Forgot Password?" link
2. **Register Component** - New flow (username, security questions)
3. **Password Recovery Component** (NEW)
   - Recovery method selection
   - Security question verification
   - Recovery code verification
   - Email-based recovery (optional)

### New Services:
- `AuthRecoveryService` - Handle password recovery flows
- `SecurityQuestionsService` - Predefined security questions library
- `PasswordRecoveryValidator` - Validate recovery attempts

## Translation Keys

Add to i18n files:
```
AUTH.USERNAME
AUTH.USERNAME_REQUIRED
AUTH.USERNAME_INVALID
AUTH.USERNAME_TAKEN
AUTH.USERNAME_MIN_LENGTH
AUTH.USERNAME_MAX_LENGTH
AUTH.RECOVERY_CODE
AUTH.SECURITY_QUESTION_1
AUTH.SECURITY_QUESTION_2
AUTH.SECURITY_ANSWER
AUTH.BACKUP_CODES
AUTH.SAVE_CODES_SAFELY
AUTH.RECOVERY_OPTIONS
AUTH.RECOVERY_WITH_QUESTIONS
AUTH.RECOVERY_WITH_CODE
AUTH.RECOVERY_WITH_EMAIL
AUTH.FORGOT_PASSWORD
AUTH.ANSWER_QUESTIONS
AUTH.ACCOUNT_RECOVERED
```

## Security Considerations

### Password Hashing
- Use bcrypt for password hashing (Supabase handles this)
- All recovery codes hashed before storage
- All security answers hashed with salt

### Rate Limiting
- Max 5 login attempts (15 minute lockout)
- Max 3 recovery attempts (24 hour lockout)
- Max 1 password reset per 30 minutes

### Data Minimization
- No email collection required
- Optional recovery email (user's choice)
- No tracking or analytics on auth flow
- Recovery codes shown once, never stored in plaintext

## Implementation Phases

### Phase 1: Database Setup
- [ ] Create migration for new tables
- [ ] Update profiles table schema
- [ ] Add indexes for performance

### Phase 2: Backend Services
- [ ] Implement AuthRecoveryService
- [ ] Create recovery verification logic
- [ ] Add rate limiting
- [ ] Hash utilities for answers and codes

### Phase 3: Frontend Components
- [ ] Update register component flow
- [ ] Create password recovery component
- [ ] Update login component
- [ ] Add new translation keys

### Phase 4: Testing & Validation
- [ ] Test all recovery flows
- [ ] Verify security measures
- [ ] Load testing on auth endpoints
- [ ] Mobile responsiveness

## User Journey Diagram

```
┌─────────────────────────────────────────────────────────┐
│                  SIGNUP FLOW (New)                      │
├─────────────────────────────────────────────────────────┤
│ 1. Enter Username (unique)                              │
│ 2. Enter Display Name (optional)                        │
│ 3. Create Password (strong validation)                  │
│ 4. Set Security Questions (2 out of 5)                  │
│ 5. Answer Security Questions (confirmation)            │
│ 6. Generate & Save Backup Codes (5 codes)              │
│ 7. Optional: Add Recovery Email (user's choice)        │
│ 8. Account Created ✓                                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              LOGIN FLOW (Unchanged)                      │
├─────────────────────────────────────────────────────────┤
│ 1. Enter Username                                       │
│ 2. Enter Password                                       │
│ 3. Authentication Success ✓                            │
│    OR Failed → Show "Forgot Password?" link            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│          PASSWORD RECOVERY FLOW (New)                    │
├─────────────────────────────────────────────────────────┤
│ 1. Enter Username                                       │
│ 2. Choose Recovery Method:                              │
│    a) Security Questions (answer 2 questions)           │
│    b) Recovery Code (enter 1 of 5 codes)               │
│    c) Recovery Email (if setup, click link)            │
│ 3. Verify Identity ✓                                    │
│ 4. Set New Password                                     │
│ 5. Password Reset Complete ✓                           │
└─────────────────────────────────────────────────────────┘
```

## Benefits

### Privacy
- ✅ No mandatory email collection
- ✅ User controls what data is stored
- ✅ No third-party tracking
- ✅ Minimal data footprint

### Security
- ✅ Username-based (not email-based)
- ✅ Recovery codes as backup
- ✅ Security questions for verification
- ✅ Rate limiting on attempts
- ✅ Strong password requirements

### User Experience
- ✅ Simple signup flow
- ✅ Multiple recovery options
- ✅ No email dependency
- ✅ Clear security guidance
- ✅ Backup codes for safety

## Compliance

### GDPR
- Minimal data collection
- User can opt-in to recovery email
- Clear data usage explanation
- Easy account deletion

### Privacy by Design
- No unnecessary data collection
- No email tracking
- No marketing emails
- Optional recovery mechanisms
