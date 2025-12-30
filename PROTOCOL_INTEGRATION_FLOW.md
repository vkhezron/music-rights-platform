# Protocol Integration Flow

## 🎵 When Protocol Appears in the Application

The **Protocol Form** is now fully integrated into your music rights workflow. Here's exactly when and where users will see it:

---

## 📍 STEP 1: Create or Edit a Work

```
Users navigate to: Dashboard → Works → Create Work
                or Works → Edit Existing Work
                
Fills in:
├── Work Title
├── ISRC/ISWC codes
├── Genre, Language
├── Recording date
└── Other metadata

Clicks: SAVE
```

---

## 📍 STEP 2: Go to Split Editor

```
After work is saved, user sees the work in the list

User clicks: Edit or Opens the work
Navigates to: /works/:id/splits

Split Editor loads showing:
├── IP Rights tab (lyric, music, publishing splits)
└── Neighbouring Rights tab (performance, master, neighbouring splits)
```

---

## 📍 STEP 3: [NEW] Protocol Form Button

```
In the Split Editor header, user now sees THREE buttons:

┌─────────────────────────────────────────────────────────────┐
│ ← Back  |  Protocol Form  |  Download PDF  |  💾 Save     │
└─────────────────────────────────────────────────────────────┘

The "Protocol Form" button is NEW and appears here!
```

---

## 📍 STEP 4: Navigate to Protocol

```
User clicks: "Protocol Form" button

Navigator: /works/:id/splits  →  /works/:id/protocol

Protocol Form appears with:
├── Work metadata (pre-filled from work)
├── Lyric Authors section
├── Music Authors section
├── Neighbouring Rights Holders section
└── Submit button
```

---

## 📊 Complete User Journey

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  DASHBOARD                                                         │
│       ↓                                                            │
│  Works List                                                        │
│       ↓                                                            │
│  ┌─────────────────────────────────────┐                          │
│  │  CREATE WORK                        │                          │
│  ├─────────────────────────────────────┤                          │
│  │ • Title, ISRC, Genre, etc.          │                          │
│  │ • Save                              │                          │
│  └─────────────────────────────────────┘                          │
│       ↓                                                            │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  SPLIT EDITOR  (IP & Neighbouring Rights)                   │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │ ← Back  | [PROTOCOL FORM] | Download PDF | 💾 Save        │  │
│  │                                                             │  │
│  │ • Assign rights holders                                    │  │
│  │ • Set percentages                                          │  │
│  │ • Save splits                                              │  │
│  └─────────────────────────────────────────────────────────────┘  │
│       ↓ (Click Protocol Form button)                             │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  PROTOCOL FORM (NEW!)                                       │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │                                                             │  │
│  │  Work Information (auto-filled)                            │  │
│  │  • Title, ISRC, etc.                                       │  │
│  │                                                             │  │
│  │  Lyric Authors                                             │  │
│  │  + Name, Percentage, CMO/PRO                              │  │
│  │  + Add/Remove rows                                         │  │
│  │                                                             │  │
│  │  Music Authors                                             │  │
│  │  + Name, Melody/Harmony/Arrangement checkboxes             │  │
│  │  + Percentage, CMO/PRO                                     │  │
│  │  + Add/Remove rows                                         │  │
│  │                                                             │  │
│  │  Neighbouring Rights Holders                               │  │
│  │  + Name, Multiple Roles (dropdown)                         │  │
│  │  + Percentage, CMO/PRO                                     │  │
│  │  + Add/Remove rows                                         │  │
│  │                                                             │  │
│  │  [Submit Protocol]  ← Submit to database                   │  │
│  │                                                             │  │
│  └─────────────────────────────────────────────────────────────┘  │
│       ↓ (After submission)                                        │
│  Protocol saved to database                                      │
│  (protocols table + author tables)                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow When Submitting Protocol

```
1. User fills Protocol Form
   ↓
2. User clicks "Submit Protocol"
   ↓
3. Component validates all fields
   ├─ Work title required
   ├─ Author names required (if row has author)
   ├─ Neighbouring rightsholders must have role
   └─ Shows errors if invalid
   ↓
4. ProtocolService.createProtocol() called
   ↓
5. Creates main protocol record in Supabase
   protocols table:
   ├── id (UUID)
   ├── work_id (from URL)
   ├── workspace_id (from context)
   ├── All work metadata (title, ISRC, etc.)
   └── created_at, submitted_at
   ↓
6. Creates author records (parallel inserts)
   ├── protocol_lyric_authors table
   ├── protocol_music_authors table
   └── protocol_neighbouring_rightsholders table
   ↓
7. All data saved to Supabase ✅
   ↓
8. Success message shown
   ↓
9. Auto-redirect back to works list
```

---

## 📱 URLs & Navigation

### Protocol Routes

```
Route: /works/:id/protocol

Examples:
  /works/abc123def456/protocol
  /works/xyz789uvw012/protocol
```

### From Split Editor to Protocol

```typescript
// In split-editor.ts
goToProtocol() {
  const workId = this.work()?.id;  // e.g., 'abc123def456'
  if (workId) {
    this.router.navigate(['/works', workId, 'protocol']);
  }
}
```

### Back Button (from Protocol)

```typescript
// In protocol-form.ts
goBack() {
  const workId = this.route.snapshot.paramMap.get('id');
  if (workId) {
    this.router.navigate(['/works', workId, 'splits']);
  }
}
```

---

## 🗂️ File Structure (Integrated)

```
src/app/
├── app.routes.ts                    [UPDATED]
│   └── Added: /works/:id/protocol route
│
├── split-editor/
│   ├── split-editor.ts              [UPDATED]
│   │   └── Added: goToProtocol() method
│   └── split-editor.html            [UPDATED]
│       └── Added: Protocol Form button
│
└── protocol/                         [EXISTING]
    └── protocol-form/
        ├── protocol-form.ts         (Component logic)
        ├── protocol-form.html       (Template with form)
        └── protocol-form.scss       (Styling)

src/app/models/
└── protocol.model.ts                (Data types)

src/app/services/
└── protocol.service.ts              (Database operations)
```

---

## 💾 Database Tables Created

When you run `PROTOCOL_SETUP.sql`, these 4 tables are created:

```sql
protocols                              (Main protocol records)
│
├── protocol_lyric_authors              (Lyric author records)
├── protocol_music_authors              (Music author records)
└── protocol_neighbouring_rightsholders  (Neighbouring rights records)

All linked via foreign keys with CASCADE DELETE
```

---

## 🎯 Key Integration Points

| Component | Change | Status |
|-----------|--------|--------|
| `app.routes.ts` | Added protocol route | ✅ Complete |
| `split-editor.ts` | Added goToProtocol() method | ✅ Complete |
| `split-editor.html` | Added Protocol Form button | ✅ Complete |
| `protocol.model.ts` | (No change needed) | ✅ Existing |
| `protocol.service.ts` | (No change needed) | ✅ Existing |
| `protocol-form.ts` | (No change needed) | ✅ Existing |
| `protocol-form.html` | (No change needed) | ✅ Existing |
| `protocol-form.scss` | (No change needed) | ✅ Existing |

---

## ✅ Build Status

```
✅ Application bundle generation complete
✅ All imports resolved
✅ All routes working
✅ Protocol integration verified
✅ Ready for use!
```

---

## 🚀 How to Test Integration

### 1. Start the Application
```bash
npm start
```

### 2. Navigate to Works
- Go to Dashboard
- Click "Works"
- Create a new work or edit existing one

### 3. Go to Split Editor
- Click on a work
- You'll be taken to `/works/:id/splits`

### 4. See Protocol Button
- In the header, you'll see: "← Back | **Protocol Form** | Download PDF | 💾 Save"
- The Protocol Form button is NEW!

### 5. Click Protocol Form
- You'll navigate to `/works/:id/protocol`
- The protocol form will load with work metadata pre-filled

### 6. Fill and Submit
- Add lyric authors
- Add music authors  
- Add neighbouring rights holders
- Click "Submit Protocol"
- Data goes to Supabase database

---

## 🔗 Related Documentation

- **PROTOCOL_QUICK_REFERENCE.md** - Quick feature overview
- **PROTOCOL_IMPLEMENTATION.md** - Detailed technical guide
- **PROTOCOL_SETUP.sql** - Database creation script
- **PROTOCOL_ARCHITECTURE_DIAGRAMS.md** - System architecture
- **README_PROTOCOL.md** - Full documentation index

---

## ❓ FAQ

**Q: When does the protocol form appear?**  
A: After you create/edit a work and go to the split editor. Click the "Protocol Form" button to access it.

**Q: Do I have to use it?**  
A: No, it's optional. You can save splits without submitting a protocol. But if you want complete rights management, the protocol tracks all authors.

**Q: What if I fill the protocol wrong?**  
A: Use the form validation - it shows error messages for missing required fields. Just fix them and resubmit.

**Q: Where does the data go?**  
A: To Supabase database in 4 tables: protocols, protocol_lyric_authors, protocol_music_authors, protocol_neighbouring_rightsholders.

**Q: Can I edit a protocol after submitting?**  
A: Currently no - it's submit only. Future enhancement can add edit capability.

**Q: What's the relationship between splits and protocol?**  
A: Splits define the financial/ownership distribution. Protocol documents who created/contributed to the work and their roles.

---

**Integration Complete** ✅  
Protocol system is now part of your standard workflow!
