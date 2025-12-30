# Protocol System - Quick Reference

## What Was Built

A complete musical work protocol/registration system matching the Google Apps Script example, built in Angular with a Supabase backend.

## Files Created

### Models & Types
- `src/app/models/protocol.model.ts` - All data types and role constants

### Services
- `src/app/services/protocol.service.ts` - Database operations (CRUD)

### Components
- `src/app/protocol/protocol-form/protocol-form.ts` - Component logic with signals
- `src/app/protocol/protocol-form/protocol-form.html` - Form template
- `src/app/protocol/protocol-form/protocol-form.scss` - Styling

### Documentation
- `PROTOCOL_IMPLEMENTATION.md` - Complete implementation guide
- This file - Quick reference

## Key Features

✅ **Work Metadata Tracking**
- Title, alternative title, release title
- ISRC, ISWC, EAN codes
- Languages, cover version info

✅ **Three Types of Rights Holders**
1. **Lyric Authors** - Text creators with % participation
2. **Music Authors** - Composers with contributions (melody/harmony/arrangement)
3. **Neighbouring Rights Holders** - Performers with multiple roles

✅ **Progress Tracking**
- Real-time percentage totals
- Color-coded progress bars (amber/green/red)
- Visual feedback on completion

✅ **Role Management**
- 9 predefined roles (lyricist, composer, producer, engineer, etc.)
- Multiple roles per rightsholder
- Easy add/remove interface

✅ **Form Validation**
- Required field checking
- Professional data structure
- Error messages
- Success notifications

✅ **Multi-Language Support**
- English, German, Spanish, Ukrainian
- All labels translated
- Easy to add more languages

## Database Schema (Quick View)

```
protocols
├── protocol_lyric_authors (1:M)
├── protocol_music_authors (1:M)
└── protocol_neighbouring_rightsholders (1:M)
```

All with cascading deletes and proper indexing.

## How to Use

### 1. Create Supabase Tables

Copy SQL from `PROTOCOL_IMPLEMENTATION.md` → Supabase SQL editor → Run

### 2. Add Routes

```typescript
{
  path: 'works/:workId/protocol',
  component: ProtocolFormComponent
}
```

### 3. Link from Works Component

```html
<button (click)="router.navigate(['/works', workId, 'protocol'])">
  Create Protocol
</button>
```

### 4. That's It!

The component handles everything:
- Form state management
- Validation
- Database operations
- Error handling
- Success feedback

## Component Structure

### Signals (State)
```typescript
work_title = signal('');
lyric_authors = signal<AuthorRow[]>([]);
isSubmitting = signal(false);
submitError = signal<string | null>(null);
```

### Computed Properties
```typescript
lyric_total = computed(() => this.calculateTotal(this.lyric_authors()));
```

### Key Methods
- `addLyricAuthor()` - Add new author row
- `removeLyricAuthor(index)` - Remove author by index
- `submitProtocol()` - Main submission handler
- `validateForm()` - Validation logic

## Form Validation Rules

| Field | Required | Rules |
|-------|----------|-------|
| Work Title | ✓ | Non-empty string |
| Authors - Name | ✓ | If author row has data, name required |
| Authors - Surname | ✓ | If author row has data, surname required |
| Neighbouring - Roles | ✓ | At least one role must be selected |
| Percentages | ✗ | Any value (user ensures 100% total) |

## Translation Keys

All keys are in `PROTOCOL` namespace:

```
PROTOCOL.PROTOCOL_FORM
PROTOCOL.WORK_TITLE
PROTOCOL.LYRIC_AUTHORS
PROTOCOL.MUSIC_AUTHORS
PROTOCOL.MELODY
PROTOCOL.HARMONY
PROTOCOL.ARRANGEMENT
PROTOCOL.NEIGHBOURING_RIGHTSHOLDERS
PROTOCOL.ROLES
... and more
```

See `public/assets/i18n/*.json` for complete list.

## Styling Features

- **Card-based Layout** - Clean, modern design
- **Gradient Headers** - Purple gradient matching app theme
- **Responsive Grid** - Adapts to screen size
- **Progress Bars** - Visual percentage feedback
- **Color Coding** - Amber (incomplete), Green (perfect), Red (exceeded)
- **Dark Mode Support** - Automatic based on preferences
- **Mobile Friendly** - Touch-optimized form inputs

## API Responses

### Submit Success
```typescript
{
  id: 'uuid',
  workspace_id: 'uuid',
  work_id: 'uuid',
  work_title: string,
  status: 'draft',
  created_at: timestamp
}
```

### Error Handling
- Network errors caught and displayed
- Validation errors shown above form
- Success message with auto-redirect after 2 seconds

## Integration with Existing System

### Works Service
- Reads from `worksService.works` array
- Auto-populates work metadata into form

### Router
- Navigates to dashboard on success
- Takes workId from route param

### Supabase
- Uses existing connection from SupabaseService
- Respects current workspace context
- Authenticated user automatically added

### i18n
- Uses ngx-translate for all labels
- Supports 4 languages out of the box

## Common Customizations

### Add New Role
```typescript
// In protocol.model.ts
export const PROTOCOL_ROLES: ProtocolRole[] = [
  // ... existing
  { value: 'videographer', label: 'Videographer' }
];
```

### Change Progress Bar Colors
```scss
// In protocol-form.scss
.progress-bar {
  &.incomplete { background-color: #your-color; }
  &.complete { background-color: #your-color; }
  &.exceeded { background-color: #your-color; }
}
```

### Add New Author Field
1. Add to AuthorRow interface in component
2. Add input in template
3. Update service insert logic
4. Add translation key

## Performance Considerations

- Signals for efficient change detection
- Computed properties for derived values
- Parallel Promise.all() for author creation
- Indexed database queries
- Lazy-loaded component (with routing)

## Security Notes

- User must be authenticated (guard checks auth)
- Workspace context validated before insert
- RLS policies recommended (see implementation guide)
- User ID automatically added to created_by field

## Testing Recommendations

1. **Form Validation**
   - Submit with empty work title → error
   - Submit author without surname → error
   - Add neighbouring without role → error

2. **Progress Bars**
   - Add 50% + 50% lyricists → green bar
   - Add 150% total → red bar

3. **Data Integrity**
   - Submit protocol → verify in Supabase
   - Query with included authors → verify relationships

4. **Multi-language**
   - Switch language → all labels update
   - Check special characters render correctly

## Troubleshooting Quick Fixes

| Issue | Solution |
|-------|----------|
| Component not found | Check route is registered |
| Database errors | Verify tables exist in Supabase |
| Translations missing | Add keys to all 4 language files |
| Progress bar not updating | Ensure author.participation_percentage is string |
| Submit button disabled | Check validation logic |
| Dark mode looks wrong | Check SCSS dark mode variable names |

## Next Steps

1. **Create Supabase Tables** - Use SQL schema from implementation guide
2. **Add Component to Routes** - Register in your routing module
3. **Link from Works** - Add button to navigate to protocol form
4. **Test Form** - Fill out and verify data saves correctly
5. **Customize** - Adjust colors, roles, fields as needed

---

**Build Status**: ✅ Successful (0 errors)  
**Type Safety**: ✅ TypeScript strict mode compliant  
**Responsive**: ✅ Mobile, tablet, desktop optimized  
**Accessible**: ✅ Semantic HTML, proper labels, color contrast
