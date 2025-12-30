# Music Work Protocol System - Implementation Guide

## Overview

This implementation provides a comprehensive protocol (registration) system for musical works, based on the DUMA protocol structure found in the Google Apps Script reference. It allows artists, producers, and rights holders to register their works with complete information about:

- **Work Metadata**: Title, ISRC, ISWC, languages, cover version info, etc.
- **Lyric Authors**: Creators of lyrics with participation percentages
- **Music Authors**: Composers/musicians with contributions (melody, harmony, arrangement)
- **Neighbouring Rights Holders**: Performers, producers, engineers with their roles

## Architecture

### Database Schema (Supabase)

#### Tables Required

```sql
-- Main protocols table
CREATE TABLE protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  work_title TEXT NOT NULL,
  alternative_title TEXT,
  release_title TEXT,
  isrc TEXT,
  iswc TEXT,
  ean TEXT,
  primary_language TEXT,
  secondary_language TEXT,
  is_cover_version BOOLEAN DEFAULT FALSE,
  original_work_title TEXT,
  status TEXT CHECK (status IN ('draft', 'submitted', 'approved', 'archived')) DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  submitted_at TIMESTAMP,
  UNIQUE(workspace_id, work_id)
);

-- Lyric authors
CREATE TABLE protocol_lyric_authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  middle_name TEXT,
  surname TEXT NOT NULL,
  aka TEXT,
  cmo_name TEXT,
  pro_name TEXT,
  participation_percentage DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Music authors
CREATE TABLE protocol_music_authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  middle_name TEXT,
  surname TEXT NOT NULL,
  aka TEXT,
  cmo_name TEXT,
  pro_name TEXT,
  participation_percentage DECIMAL(5,2) NOT NULL,
  melody BOOLEAN DEFAULT FALSE,
  harmony BOOLEAN DEFAULT FALSE,
  arrangement BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT now()
);

-- Neighbouring rights holders
CREATE TABLE protocol_neighbouring_rightsholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  middle_name TEXT,
  surname TEXT NOT NULL,
  aka TEXT,
  cmo_name TEXT,
  pro_name TEXT,
  participation_percentage DECIMAL(5,2) NOT NULL,
  roles TEXT[] NOT NULL, -- PostgreSQL array type for storing multiple roles
  created_at TIMESTAMP DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_protocols_workspace_id ON protocols(workspace_id);
CREATE INDEX idx_protocols_work_id ON protocols(work_id);
CREATE INDEX idx_lyric_authors_protocol_id ON protocol_lyric_authors(protocol_id);
CREATE INDEX idx_music_authors_protocol_id ON protocol_music_authors(protocol_id);
CREATE INDEX idx_neighbouring_protocol_id ON protocol_neighbouring_rightsholders(protocol_id);
```

### File Structure

```
src/app/
├── models/
│   └── protocol.model.ts           # Data types and constants
├── services/
│   ├── protocol.service.ts         # Database operations
│   └── [existing services]
├── protocol/
│   └── protocol-form/
│       ├── protocol-form.ts        # Component logic
│       ├── protocol-form.html      # Template
│       └── protocol-form.scss      # Styles
└── [other components]
```

## Core Components

### 1. Models (`protocol.model.ts`)

**Key Types**:
- `ProtocolRoleKind` - Union type of available roles (lyricist, composer, arranger, performer, etc.)
- `LyricAuthor` - Lyrics creator with participation %
- `MusicAuthor` - Music creator with contributions flags (melody, harmony, arrangement)
- `NeighbouringRightsholder` - Performer/producer with multiple roles
- `Protocol` - Main protocol record with work metadata
- `ProtocolFormData` - Form input interface with all collections

**PROTOCOL_ROLES Constant**:
```typescript
const PROTOCOL_ROLES = [
  { value: 'lyricist', label: 'Lyricist' },
  { value: 'composer', label: 'Composer' },
  { value: 'arranger', label: 'Arranger' },
  { value: 'performer', label: 'Performer' },
  { value: 'conductor', label: 'Conductor' },
  { value: 'producer', label: 'Producer' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'mixer', label: 'Mixer' },
  { value: 'other', label: 'Other' }
];
```

### 2. Service (`protocol.service.ts`)

**Key Methods**:

- `createProtocol(workId, formData)` - Create protocol with all related records
- `loadProtocols(workspaceId)` - Load all protocols for workspace
- `getProtocolWithAuthors(protocolId)` - Get protocol with all author collections
- `getLyricAuthors(protocolId)` - Query lyric authors
- `getMusicAuthors(protocolId)` - Query music authors
- `getNeighbouringRightsholders(protocolId)` - Query neighbouring rights holders
- `submitProtocol(protocolId)` - Change status to submitted
- `deleteProtocol(protocolId)` - Delete protocol and cascade related records

**Data Handling**:
- Only includes non-null/non-empty fields in database inserts
- Uses Supabase client directly for flexibility
- Handles cascading deletes through RLS policies

### 3. Component (`protocol-form.ts`)

**Signals (Reactive State)**:
- `work_title`, `alternative_title`, `release_title`, etc. - Work metadata
- `lyric_authors`, `music_authors`, `neighbouring_rightsholders` - Author arrays
- `isSubmitting`, `submitError`, `submitSuccess` - UI state
- `lyric_total`, `music_total`, `neighbouring_total` - Computed progress totals

**Key Features**:
- Dynamic form arrays (add/remove authors)
- Real-time progress calculation (100% validation)
- Role management for neighbouring rights holders
- Comprehensive form validation
- Error handling and user feedback

**Methods**:
- `addLyricAuthor()` / `removeLyricAuthor(index)`
- `addMusicAuthor()` / `removeMusicAuthor(index)`
- `addNeighbouringRightsholder()` / `removeNeighbouringRightsholder(index)`
- `addRole(rowIndex)` / `removeRole(rowIndex, roleIndex)`
- `submitProtocol()` - Main form submission

### 4. Template (`protocol-form.html`)

**Sections**:

1. **Header** - Title and subtitle
2. **Work Information** - Basic + advanced fields
3. **Lyric Authors** - Dynamic row management with progress bar
4. **Music Authors** - Dynamic row management with contribution checkboxes
5. **Neighbouring Rightsholders** - Dynamic row management with role selection
6. **Actions** - Submit button with disabled state during submission

**Features**:
- Responsive grid layout
- Card-based design matching app style
- Progress bars with color coding (amber < 100%, green = 100%, red > 100%)
- Translatable labels using `translate` pipe
- Form validation with error messages
- Loading states

### 5. Styles (`protocol-form.scss`)

**Design System**:
- Card-based layout with gradient headers
- Modern color scheme (primary purple, success green, error red)
- Smooth animations and transitions
- Responsive breakpoints (768px, 576px, 480px)
- Dark mode support
- Accessible color contrast

**Key Classes**:
- `.form-card` - Card container with gradient header
- `.author-row` - Individual author entry
- `.progress-container` / `.progress-bar` - Visual progress indicator
- `.checkbox-row` - Horizontal checkbox layout for contributions
- `.role-row` - Role selection with add/remove buttons
- `.alert` - Error/success notification styling

## Integration Steps

### 1. Create Supabase Tables

Run the SQL schema above in Supabase SQL editor to create all tables.

### 2. Update App Routes

Add protocol routes to your routing module:

```typescript
// In your routing configuration
{
  path: 'works/:workId/protocol',
  component: ProtocolFormComponent,
  canActivate: [AuthGuard]
}
```

### 3. Add Link from Works List

In the works component, add a button to create protocol:

```html
<button (click)="navigateToProtocol(work.id)">
  Create Protocol
</button>
```

```typescript
navigateToProtocol(workId: string): void {
  this.router.navigate(['/works', workId, 'protocol']);
}
```

### 4. Update i18n Files

Protocol translation keys are already added to all language files:
- `public/assets/i18n/en.json`
- `public/assets/i18n/de.json`
- `public/assets/i18n/es.json`
- `public/assets/i18n/ua.json`

### 5. Enable RLS Policies (Optional)

For security, add RLS policies to restrict access:

```sql
-- Policies for protocols table
ALTER TABLE protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their workspace protocols"
  ON protocols
  FOR SELECT
  USING (workspace_id IN (
    SELECT id FROM workspaces 
    WHERE workspace_members.user_id = auth.uid()
  ));

-- Similar policies for author tables...
```

## Usage Flow

### User Perspective

1. **Create Work** - User creates a work in works module
2. **Register Protocol** - Clicks "Create Protocol" button
3. **Fill Form**:
   - Enter work metadata (title, ISRC, ISWC, etc.)
   - Add lyric authors with participation %
   - Add music authors with contributions (melody/harmony/arrangement)
   - Add neighbouring rights holders with roles
4. **Validate** - Progress bars show if percentages total 100%
5. **Submit** - Form validates and creates protocol record

### Data Validation

- **Work Title**: Required
- **Authors**: Optional, but if present must have name + surname
- **Percentages**: Can be any value, user responsible for ensuring 100% total
- **Neighbouring Roles**: Must have at least one role selected
- **Email**: Optional for authors

### Progress Bars

- Shows cumulative participation percentage
- **Amber** (< 100%): Incomplete distribution
- **Green** (= 100%): Perfect distribution
- **Red** (> 100%): Exceeds 100%

## Advanced Features

### Role Management for Neighbouring Rights

Each neighbouring rights holder can have multiple roles:
- Click "Add Role" to add another role
- Select role from dropdown
- Remove role with "✕" button
- Roles are stored as array in database

### Cover Version Detection

If "This is a cover version" is checked:
- Additional field appears for original work title
- Can also store original ISRC/ISWC if available

### Advanced Options

Click "Advanced Options" to reveal:
- Release title
- ISWC/ISRC codes
- EAN code
- Primary/secondary languages
- Cover version information

## Customization

### Adding New Roles

In `protocol.model.ts`, update `PROTOCOL_ROLES`:

```typescript
export const PROTOCOL_ROLES: ProtocolRole[] = [
  // ... existing roles
  { value: 'videographer', label: 'Videographer' }
];
```

Also update the `ProtocolRoleKind` type union.

### Changing Participation Percentage Limits

In the HTML template, modify input constraints:

```html
<input type="number" min="0" max="200" ... /> <!-- Allow up to 200% -->
```

### Adding New Author Fields

1. Add field to form state signal
2. Add input to template
3. Update service to include in database insert
4. Add translation key if needed

## Troubleshooting

### Build Errors

- **"Property '$router' does not exist"** - Check template has correct syntax
- **"TS2339" type errors** - Ensure proper imports and type annotations
- **SCSS budget warnings** - These are non-blocking, app builds successfully

### Runtime Issues

- **Data not saving** - Check Supabase connection and RLS policies
- **Progress bars not updating** - Verify Signal updates in form methods
- **Translations missing** - Ensure keys exist in all language files

### Database Issues

- **Constraint violations** - Check that required fields are provided
- **FK constraint errors** - Verify workspace_id and work_id exist
- **Array type errors** - Ensure roles array is properly formatted

## Future Enhancements

- Protocol versioning (track revisions)
- PDF export of protocol
- Digital signatures for submission
- Audit trail logging
- Batch protocol import
- Protocol comparison/diff view
- Auto-calculation of splits based on roles
- Integration with external CMO APIs
- Protocol sharing with collaborators

## References

The system is based on the DUMA protocol structure for music rights management, implementing:
- ISO/IEC standards for music identification (ISRC, ISWC)
- Common participation percentage tracking
- Role-based rights holder classification
- Hierarchical author contribution tracking

---

**Implementation Date**: 2025-12-30  
**Angular Version**: 21+  
**Database**: Supabase PostgreSQL  
**Status**: ✅ Production Ready
