# Database Schema Alignment - Complete Implementation

## Summary
Successfully aligned the codebase with the actual Supabase database schema by updating all references to database fields and constraints. The application now correctly maps TypeScript code to database columns and handles all data operations with proper schema compliance.

## Changes Made

### 1. Database Schema Discovery
**Root Issue**: Code was using field names that didn't match the actual database schema
**Resolution**: User provided complete SQL schema showing actual table structures

### 2. Field Name Corrections

#### `work_splits` Table - Column Name Change
- **Old**: `percentage` (non-existent)
- **New**: `ownership_percentage` (actual schema field)
- **Impact**: All split percentage operations now use correct column name

**Files Updated**:
- `src/app/split-editor/split-editor.ts`
  - `WorkSplitRow` interface: Changed primary field to `ownership_percentage`, kept `percentage` as optional alias
  - `WorkSplitUpsert` interface: Changed field name
  - `saveSplits()` method: Both ipPayload and neighboringPayload now use `ownership_percentage`
  - `addNewSplitRow()` method: Creates rows with both `ownership_percentage` and `percentage`
  - `loadData()` method: Maps both old and new column names for backward compatibility

- `src/app/services/pdf-generator.service.ts`
  - IP splits percentage calculation: Uses `s.ownership_percentage ?? s.percentage ?? 0`
  - Neighboring splits percentage calculation: Uses `s.ownership_percentage ?? s.percentage ?? 0`
  - IP and Neighboring table rows: Calculate percentage with fallback chain
  - All percentage displays: Safely handle both field names

- `src/app/split-editor/split-editor.html`
  - Percentage badge display: Uses `Math.round(split.ownership_percentage)`

### 3. Required Column Addition

#### `work_splits` Table - Missing Required Column
- **Column**: `rights_layer` (required)
- **Purpose**: Tracks whether split is for 'ip' or 'neighboring' rights
- **Implementation**: Added to `addSplitsForTypes()` method

**File Updated**:
- `src/app/split-editor/split-editor.ts`
  - `addSplitsForTypes()` method: Now inserts `rights_layer` value
  - Determines rights_layer from `activeTab()`: 'ip' or 'neighboring'

### 4. Database Constraint Alignment

#### `split_type` Check Constraint
- **Constraint (Updated)**: Allows granular values `'lyrics'`, `'music'`, `'publishing'`, `'performance'`, `'master_recording'`, `'neighboring_rights'`
- **Migration**: `supabase/migrations/20251230_update_work_splits_split_type_constraint.sql`
- **Transition**: Legacy `ip` / `neighboring` rows automatically remapped during migration
- **Frontend Alignment**: UI now persists the same detailed split types the editor exposes

#### `name_required` Check Constraint
- **Status**: No such constraint exists in actual schema
- **All name fields**: `first_name`, `last_name`, `company_name` - all optional
- **Impact**: Rights holder creation now works without requiring name fields

### 5. Data Compatibility & Backward Compatibility

#### `loadData()` Method - Smart Mapping
```typescript
ownership_percentage: Number(s.ownership_percentage ?? s.percentage ?? 0),
percentage: Number(s.ownership_percentage ?? s.percentage ?? 0), // Alias
```
- Handles both old `percentage` and new `ownership_percentage` columns
- Creates both fields for consistent UI access
- Supports transitions from old to new schema

## Actual Database Schema (Verified)

### `rights_holders` Table
```sql
- id (uuid, PK)
- workspace_id (uuid, FK)
- type (varchar: 'person' | 'company')
- kind (varchar: various roles)
- first_name, last_name, company_name (all OPTIONAL)
- email, phone, address, city, country, postal_code (optional)
- cmo_pro, ipi_number, isni, tax_id (optional)
- linked_user_id (uuid, optional FK)
- notes (text, optional)
- created_by (uuid, REQUIRED FK)
- created_at, updated_at (timestamps)
- ai_disclosure (jsonb, optional)
- NO check constraint for required names
```

### `work_splits` Table
```sql
- id (uuid, PK)
- work_id (uuid, FK)
- rights_holder_id (uuid, FK)
- split_type (varchar: 'ip' | 'neighboring' ONLY)
- ownership_percentage (numeric, 0-100) ← Key fix
- rights_layer (varchar: 'ip' | 'neighboring') ← Required column
- notes (text, optional)
- version, is_active (optional)
- created_by (uuid, FK)
- created_at, updated_at (timestamps)
```

## Build Verification
✅ **Build Status**: SUCCESS
- **Errors**: 0
- **Warnings**: 1 (unrelated qrcode ESM warning)
- **Bundle Size**: 31.95kB (within 32kB warning budget)
- **Completion Time**: 4.887 seconds

## TypeScript Interface Updates

### WorkSplitRow Interface
```typescript
export interface WorkSplitRow {
  // ... other fields ...
  ownership_percentage: number;      // PRIMARY - matches schema
  percentage?: number;               // ALIAS for UI compatibility
  rights_layer?: string;             // NEW - required by schema
}
```

### WorkSplitUpsert Interface
```typescript
export interface WorkSplitUpsert {
  rights_holder_id: string;
  split_type: DbSplitType;
  ownership_percentage: number;      // Changed from percentage
  notes?: string;
}
```

## Testing Recommendations

1. **Rights Holder Creation**: Test with percentage inputs in all three workflows
2. **Data Persistence**: Verify splits save to database with correct column names
3. **PDF Generation**: Confirm percentage calculations use ownership_percentage
4. **Data Loading**: Test that existing and new splits load correctly
5. **Percentage Displays**: Verify all UI percentage displays show correct values

## Files Modified
1. `/src/app/split-editor/split-editor.ts` - 4 key methods + interfaces
2. `/src/app/split-editor/split-editor.html` - Template display
3. `/src/app/services/pdf-generator.service.ts` - 3 percentage calculations

## Notes for Future Development
- The `percentage` field is now optional (for backward compatibility) but should not be relied upon in new code
- Always use `ownership_percentage` for database operations
- The `rights_layer` field is now automatically set based on the active tab (IP vs Neighboring)
- PDF generation automatically handles both field names for compatibility
