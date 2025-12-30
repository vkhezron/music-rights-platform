# Protocol System - Architecture & Data Flow Diagrams

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER / ANGULAR APP                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │         ProtocolFormComponent (protocol-form.ts)            │  │
│  │  • Signals for reactive state                               │  │
│  │  • Computed properties for totals                           │  │
│  │  • Form validation logic                                    │  │
│  │  • Dynamic row management                                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              ↓                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              ProtocolService (protocol.service.ts)          │  │
│  │  • createProtocol()                                          │  │
│  │  • getProtocolWithAuthors()                                  │  │
│  │  • submitProtocol()                                          │  │
│  │  • deleteProtocol()                                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              ↓                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              SupabaseService (existing)                      │  │
│  │  • client.from('protocols').insert()                         │  │
│  │  • client.from('protocol_*_authors').insert()               │  │
│  │  • Handles authentication & connection                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              ↓                                      │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      SUPABASE / PostgreSQL                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐  ┌────────────────────────┐                      │
│  │  protocols   │  │ protocol_*_authors     │                      │
│  │  (main)      │  │ • lyric_authors        │                      │
│  │              │  │ • music_authors        │                      │
│  │ 1 : M        │→ │ • neighbouring_*       │                      │
│  └──────────────┘  └────────────────────────┘                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 2. Data Flow Diagram

```
USER INTERACTION
       ↓
┌─────────────────────────────┐
│ Fill Protocol Form          │
│ • Work metadata             │
│ • Add authors (dynamic)     │
│ • Set percentages           │
│ • Select roles              │
└─────────────────────────────┘
       ↓
┌─────────────────────────────┐
│ Click Submit Button         │
└─────────────────────────────┘
       ↓
┌─────────────────────────────────────────┐
│ validateForm()                          │
│ • Check work title required             │
│ • Check author names filled             │
│ • Check roles selected                  │
└─────────────────────────────────────────┘
       ↓
   ┌───┴────┐
   │ Valid? │
   └───┬────┘
       ├─ NO → Show error message → Stop
       │
       └─ YES → Continue
              ↓
    ┌──────────────────────────┐
    │ submitProtocol()         │
    │ • Build form data        │
    │ • Filter empty rows      │
    │ • Set isSubmitting=true  │
    └──────────────────────────┘
              ↓
    ┌──────────────────────────────────┐
    │ protocolService.createProtocol() │
    │ • Insert main protocol record    │
    │ • Insert lyric authors           │
    │ • Insert music authors           │
    │ • Insert neighbouring holders    │
    └──────────────────────────────────┘
              ↓
    ┌──────────────────────────────────┐
    │ Database Operations (parallel)   │
    │ • Promise.all([...])             │
    │ • All 4 operations at once       │
    └──────────────────────────────────┘
              ↓
           ┌─┴─┐
           │OK?│
           └─┬─┘
             ├─ ERROR → Show error, retry
             │
             └─ SUCCESS → submitSuccess=true
                        → Show message
                        → Redirect dashboard
```

## 3. Component State Management

```
SIGNALS (Reactive State)
───────────────────────

Work Metadata Signals:
  work_title: Signal<string>
  alternative_title: Signal<string>
  release_title: Signal<string>
  isrc: Signal<string>
  iswc: Signal<string>
  ean: Signal<string>
  primary_language: Signal<string>
  secondary_language: Signal<string>
  is_cover_version: Signal<boolean>
  original_work_title: Signal<string>
  show_advanced: Signal<boolean>

Author Arrays:
  lyric_authors: Signal<AuthorRow[]>
  music_authors: Signal<AuthorRow[]>
  neighbouring_rightsholders: Signal<AuthorRow[]>

UI State:
  isSubmitting: Signal<boolean>
  submitError: Signal<string | null>
  submitSuccess: Signal<boolean>

COMPUTED PROPERTIES (Derived Values)
───────────────────────────────────

  lyric_total: Computed<number>
    = sum of all lyric_authors participation_percentage
    
  music_total: Computed<number>
    = sum of all music_authors participation_percentage
    
  neighbouring_total: Computed<number>
    = sum of all neighbouring participation_percentage

All automatically update when dependencies change (0(1) complexity)
```

## 4. Database Schema Relationships

```
┌────────────────────────────────────────┐
│         protocols                      │
├────────────────────────────────────────┤
│ id (PK)                                │
│ workspace_id (FK) →                    │
│ work_id (FK) →                         │
│ work_title                             │
│ alternative_title                      │
│ release_title                          │
│ isrc, iswc, ean                        │
│ primary_language                       │
│ secondary_language                     │
│ is_cover_version (bool)                │
│ original_work_title                    │
│ status (enum)                          │
│ created_by (FK)                        │
│ created_at, updated_at                 │
│ submitted_at                           │
└────────────────────────────────────────┘
        │      │      │
        │      │      └──────────────┐
        │      │                     │
        ↓      ↓                     ↓
    1:M relationship        1:M relationship
        ↓      ↓                     ↓
┌──────────┐   ┌──────────────────┐ ┌──────────────────────────┐
│ protocol_│   │ protocol_music_  │ │ protocol_neighbouring_   │
│ lyric_   │   │ authors          │ │ rightsholders            │
│ authors  │   │                  │ │                          │
├──────────┤   ├──────────────────┤ ├──────────────────────────┤
│ id (PK)  │   │ id (PK)          │ │ id (PK)                  │
│ protocol_│   │ protocol_id (FK) │ │ protocol_id (FK)         │
│ id (FK)  │   │ name             │ │ name                     │
│ name     │   │ surname          │ │ surname                  │
│ surname  │   │ participation %  │ │ participation %          │
│ aka      │   │ melody (bool)    │ │ roles (array of text)    │
│ cmo_name │   │ harmony (bool)   │ │ cmo_name                 │
│ pro_name │   │ arrangement      │ │ pro_name                 │
│ %        │   │ cmo_name         │ │ created_at               │
│ created_ │   │ pro_name         │ │                          │
│ at       │   │ created_at       │ │                          │
└──────────┘   └──────────────────┘ └──────────────────────────┘

Key Constraints:
• ALL Foreign Keys cascade on DELETE
• Check: participation_percentage >= 0
• Check: surname != ''
• Check: roles array not empty (for neighbouring)
• UNIQUE: (workspace_id, work_id) on protocols

Indexes:
• idx_protocols_workspace_id
• idx_protocols_work_id
• idx_protocols_status
• idx_*_protocol_id (for fast lookups)
```

## 5. Form Row Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    AuthorRow Interface                      │
├─────────────────────────────────────────────────────────────┤
│ index: number                    // Row number for display  │
│                                                             │
│ Name Information:                                          │
│   name: string                   // First name            │
│   middle_name: string            // Optional middle name   │
│   surname: string                // Last name             │
│   aka: string                    // Stage name/alias      │
│                                                             │
│ Organization References:                                   │
│   cmo_name: string               // CMO affiliation       │
│   pro_name: string               // PRO affiliation       │
│                                                             │
│ Rights Allocation:                                          │
│   participation_percentage: string // % of rights         │
│                                                             │
│ Optional (Music Authors):                                  │
│   melody?: boolean               // Composed melody?      │
│   harmony?: boolean              // Composed harmony?     │
│   arrangement?: boolean          // Arranged?             │
│                                                             │
│ Optional (Neighbouring):                                   │
│   roles?: ProtocolRoleKind[]     // Multiple roles       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Example Instance (Lyric Author):
{
  index: 1,
  name: "John",
  middle_name: "Michael",
  surname: "Smith",
  aka: "J. Smith",
  cmo_name: "ASCAP",
  pro_name: "BMI",
  participation_percentage: "50"
}

Example Instance (Music Author):
{
  index: 1,
  name: "Jane",
  surname: "Doe",
  aka: "",
  cmo_name: "SESAC",
  pro_name: "",
  participation_percentage: "50",
  melody: true,
  harmony: false,
  arrangement: true
}

Example Instance (Neighbouring):
{
  index: 1,
  name: "Bob",
  surname: "Johnson",
  aka: "",
  cmo_name: "SoundExchange",
  pro_name: "",
  participation_percentage: "100",
  roles: ["performer", "producer"]
}
```

## 6. Service Method Call Sequence

```
submitProtocol()
│
├─ 1. validateForm() → bool
│
├─ 2. Build formData: ProtocolFormData
│     ├─ work_title
│     ├─ Filter empty authors
│     ├─ Convert percentages to numbers
│     └─ Compile all collections
│
├─ 3. protocolService.createProtocol(workId, formData)
│     │
│     ├─ Insert main protocol record
│     │  └─ await client.from('protocols').insert(...)
│     │
│     └─ Promise.all([
│          addLyricAuthors(protocol.id, authors),
│          addMusicAuthors(protocol.id, authors),
│          addNeighbouringRightsholders(protocol.id, holders)
│        ])
│
└─ 4. Handle response
     ├─ Success → submitSuccess=true → redirect
     └─ Error → submitError=message
```

## 7. Template Rendering Flow

```
<form (ngSubmit)="submitProtocol()">

  Work Metadata Section
  ├─ Basic fields (always visible)
  ├─ Advanced toggle button
  └─ Advanced fields *ngIf="show_advanced()"

  Lyric Authors Section
  └─ *ngFor="let author of lyric_authors()"
     ├─ Author header with remove button
     ├─ Name fields (name, middle_name, surname, aka)
     ├─ Organization fields (cmo_name, pro_name)
     ├─ Percentage input
     └─ Progress bar (reactive display)
     
  Music Authors Section
  └─ *ngFor="let author of music_authors()"
     ├─ Author header with remove button
     ├─ Name fields
     ├─ Organization fields
     ├─ Percentage input
     ├─ Checkboxes (melody, harmony, arrangement)
     └─ Progress bar (reactive display)
     
  Neighbouring Section
  └─ *ngFor="let rh of neighbouring_rightsholders()"
     ├─ Rightsholder header with remove button
     ├─ Name fields
     ├─ Organization fields
     ├─ Percentage input
     ├─ Roles section
     │  └─ *ngFor="let role of rh.roles"
     │     ├─ Role dropdown
     │     └─ Remove button
     │  └─ Add Role button
     └─ Progress bar (reactive display)

  Action Buttons
  ├─ Submit (disabled during submission)
  └─ Error/Success messages
```

## 8. Translation Key Structure

```
PROTOCOL
├─ PROTOCOL_FORM: "Music Work Protocol Form"
├─ MUSIC_WORK_REGISTRATION: "Register your musical work..."
├─ WORK_INFORMATION: "Work Information"
├─ WORK_TITLE: "Work Title"
├─ ALTERNATIVE_TITLE: "Alternative Title"
├─ RELEASE_TITLE: "Release Title"
├─ PRIMARY_LANGUAGE: "Primary Language"
├─ SECONDARY_LANGUAGE: "Secondary Language"
├─ IS_COVER_VERSION: "This is a cover version"
├─ ORIGINAL_WORK_TITLE: "Original Work Title"
├─ ADVANCED_OPTIONS: "Advanced Options"
├─ LYRIC_AUTHORS: "Lyric Authors"
├─ LYRIC_AUTHOR: "Lyric Author"
├─ ADD_LYRIC_AUTHOR: "Add Lyric Author"
├─ MUSIC_AUTHORS: "Music Authors"
├─ MUSIC_AUTHOR: "Music Author"
├─ ADD_MUSIC_AUTHOR: "Add Music Author"
├─ MELODY: "Melody"
├─ HARMONY: "Harmony"
├─ ARRANGEMENT: "Arrangement"
├─ NEIGHBOURING_RIGHTSHOLDERS: "Neighbouring Rightsholders"
├─ NEIGHBOURING_RIGHTSHOLDER: "Neighbouring Rightsholder"
├─ ADD_NEIGHBOURING_RIGHTSHOLDER: "Add Neighbouring Rightsholder"
├─ NAME: "Name"
├─ MIDDLE_NAME: "Middle Name"
├─ SURNAME: "Surname"
├─ AKA: "AKA (Also Known As)"
├─ ROLES: "Roles"
├─ SELECT_ROLE: "Select a role"
├─ ADD_ROLE: "Add Role"
├─ TOTAL: "Total"
├─ SUBMIT: "Submit Protocol"
└─ SUBMISSION_SUCCESS: "Protocol submitted successfully!..."

Plus global keys:
CLEAR: "Clear"
DELETE: "Delete"
ERROR: "Error"
SUBMITTING: "Submitting"
CANCEL: "Cancel"
```

## 9. Error Handling Flow

```
User Action
    ↓
Try Block
    ├─ Validate form
    ├─ Call service
    └─ Handle response
    ↓
[Exception Occurs]
    ↓
Catch Block
    ├─ Log to console
    ├─ Extract error message
    ├─ Set submitError signal
    └─ Display to user
    ↓
User Sees Error
    ├─ Read error message
    ├─ Correct issue
    └─ Try again
    ↓
Success or Another Error
```

## 10. Performance Optimization Strategy

```
SIGNALS (O(1) updates)
    ├─ Direct value updates
    └─ No re-renders of entire tree

COMPUTED PROPERTIES (O(n) calculation, O(1) lookup)
    ├─ Total calculation only when dependencies change
    └─ Cached until dependencies update

DATABASE OPERATIONS
    ├─ Indexed foreign keys for fast lookups
    ├─ Parallel Promise.all() for inserts
    └─ Cascading deletes for cleanup

TEMPLATE RENDERING
    ├─ *ngFor only re-renders changed rows
    ├─ *ngIf for conditional advanced options
    └─ Bound inputs update reactively

USER EXPERIENCE
    ├─ isSubmitting flag prevents double-submit
    ├─ Error messages stay until dismissed
    ├─ Success redirects after 2 seconds
    └─ All operations feel responsive (< 2s)
```

---

These diagrams provide a complete visual understanding of the protocol system architecture, data flow, and component interactions. Refer to them when understanding how different parts work together.
