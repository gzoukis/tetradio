# TICKET 9D: MOVE ITEMS BETWEEN LISTS - IMPLEMENTATION SUMMARY

**Status:** ✅ COMPLETE  
**Date:** 2026-02-02  
**Priority:** HIGH  
**Scope:** Universal "Move to List" capability for all entry types across all lists

---

## EXECUTIVE SUMMARY

Ticket 9D implements a complete "Move to List" feature that allows users to reassign Tasks, Notes, and Checklists between lists. The implementation reuses the list picker UX from Quick Create (Ticket 9B) and integrates seamlessly with Unsorted auto-archive logic (Ticket 9C).

**Key Capabilities Delivered:**
- ✅ Move any entry (Task/Note/Checklist) from any list to any other list
- ✅ Create new list inline during move operation
- ✅ Automatic Unsorted cleanup when last item moved out
- ✅ Consistent UX across all entry types
- ✅ Platform-specific long-press menus (iOS ActionSheet / Android Alert)

---

## FILES IMPLEMENTED

### 1. operations.ts (ALREADY COMPLETE)

**New Function Added:**
```typescript
export async function moveEntryToList(input: {
  entryId: string;
  newListId: string;
  sourceListId?: string;
}): Promise<void>
```

**Implementation Details:**
- Updates `entries.list_id` via SQL UPDATE
- Preserves all other entry data (no duplication/recreation)
- Updates `updated_at` timestamp
- Automatically triggers Unsorted cleanup if source was Unsorted system list
- Error handling with console logging

**SQL Logic:**
```sql
UPDATE entries 
SET list_id = ?, updated_at = ? 
WHERE id = ? AND deleted_at IS NULL
```

**Unsorted Cleanup:**
- Checks if `sourceListId` is provided
- Queries if source list has `is_system = 1`
- Calls existing `cleanupUnsortedListIfEmpty()` function
- No duplication of cleanup logic

---

### 2. ListsScreen.tsx (COMPLETE IMPLEMENTATION)

#### State Management (Lines 60-66)

**New State Variables:**
```typescript
const [moveModalVisible, setMoveModalVisible] = useState(false);
const [moveModalMode, setMoveModalMode] = useState<MoveModalMode>('select-list');
const [entryToMove, setEntryToMove] = useState<ListEntry | null>(null);
const [moveTargetList, setMoveTargetList] = useState<List | null>(null);
const [moveNewListName, setMoveNewListName] = useState('');
const [availableListsForMove, setAvailableListsForMove] = useState<List[]>([]);
```

**Type Added:**
```typescript
type MoveModalMode = 'select-list' | 'new-list';
```

#### Core Functions

**1. handleOpenMoveModal(entry: ListEntry)** (Lines 574-594)
- Sets entry to move
- Resets modal state to 'select-list' mode
- Loads available lists with filtering:
  - Excludes archived lists (`!list.is_archived`)
  - Excludes Unsorted (`!list.is_system`)
  - Excludes current list (`list.id !== selectedList?.id`)
- Opens modal

**2. handleConfirmMove()** (Lines 645-683)
- Validates entryToMove and moveTargetList exist
- Calls `moveEntryToList()` with entry ID, target list ID, source list ID
- Handles Unsorted special case:
  - Checks if source is Unsorted and will be emptied
  - Navigates back to lists if Unsorted will be archived
- Refreshes lists (in case Unsorted archived)
- Reloads current list entries
- Shows success Alert with entry type and target list name
- Closes modal

**3. handleCreateNewListForMove()** (Lines 612-643)
- Validates list name not empty
- Creates new list via `createList()`
- Adds new list to `availableListsForMove` array
- Auto-selects new list as move target
- Switches back to 'select-list' mode
- Refreshes main lists array

**4. handleSwitchToNewListMode()** (Line 604-606)
- Sets modal mode to 'new-list'

**5. handleBackToSelectList()** (Lines 608-610)
- Returns to 'select-list' mode from 'new-list'

**6. handleCloseMoveModal()** (Lines 596-602)
- Closes modal
- Resets all move-related state

#### Long-Press Handlers

**Tasks (Lines 308-369):**
- **iOS:** ActionSheet with options: Cancel, Move to List, Change Priority, Delete Task
- **Android:** Alert with same options
- "Move to List" calls `handleOpenMoveModal(task)`

**Notes (Lines 387-422):**
- **iOS:** ActionSheet with options: Cancel, Move to List, Delete Note
- **Android:** Alert with same options
- "Move to List" calls `handleOpenMoveModal(note)`

**Checklists (Lines 424-459):**
- **iOS:** ActionSheet with options: Cancel, Move to List, Delete Checklist
- **Android:** Alert with same options
- "Move to List" calls `handleOpenMoveModal(checklist)`

#### Modal UI (Lines 1116-1232)

**Structure:**
```
Modal (visible={moveModalVisible})
  ├─ TouchableOpacity (overlay - closes on tap)
  │   └─ TouchableOpacity (content - stops propagation)
  │       └─ View (styles.listPickerContent)
  │           ├─ SELECT-LIST MODE (moveModalMode === 'select-list')
  │           │   ├─ Title: "Move to List"
  │           │   ├─ "➕ New List" button
  │           │   ├─ ScrollView (available lists)
  │           │   │   └─ List items (icon + name + checkmark if selected)
  │           │   └─ Buttons: Cancel | Move (disabled if no selection)
  │           │
  │           └─ NEW-LIST MODE (moveModalMode === 'new-list')
  │               ├─ Back button ("← Back")
  │               ├─ Title: "New List"
  │               ├─ TextInput (list name)
  │               └─ Buttons: Cancel | Create (disabled if empty)
```

**Visual States:**
- Selected list highlighted with light blue background (`#eff6ff`)
- Selected list shows blue checkmark (✓)
- "➕ New List" in blue with bold font
- Disabled buttons have 40% opacity
- Buttons use same styling as Quick Create modal

#### Styles Added (Lines 1604-1651)

**New Styles:**
```typescript
listPickerContent: {
  backgroundColor: '#fff',
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  padding: 20,
  maxHeight: '70%',
}
listPickerTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 }
listPickerScroll: { maxHeight: 300 }
listPickerItem: {
  paddingVertical: 16,
  paddingHorizontal: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#f3f4f6',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
}
listPickerItemSelected: { backgroundColor: '#eff6ff' }
listPickerItemText: { fontSize: 16, color: '#1a1a1a' }
newListOption: { color: '#3b82f6', fontWeight: '600' }
selectedCheck: { fontSize: 18, color: '#3b82f6', fontWeight: 'bold' }
listPickerCancelButton: {
  flex: 1,
  paddingVertical: 14,
  backgroundColor: '#f3f4f6',
  borderRadius: 8,
  alignItems: 'center',
  marginRight: 8,
}
listPickerCancelText: { color: '#6b7280', fontSize: 16, fontWeight: '600' }
moveModalButtons: { flexDirection: 'row', marginTop: 16 }
moveConfirmButton: {
  flex: 1,
  paddingVertical: 14,
  backgroundColor: '#3b82f6',
  borderRadius: 8,
  alignItems: 'center',
  marginLeft: 8,
}
moveConfirmText: { color: '#fff', fontSize: 16, fontWeight: '600' }
```

---

## USER WORKFLOWS

### Workflow 1: Move Task from Unsorted to Existing List

1. User opens Lists → Taps Unsorted
2. User long-presses a task
3. **iOS:** ActionSheet appears → Tap "Move to List"  
   **Android:** Alert appears → Tap "Move to List"
4. Modal opens: "Move to List"
5. User sees "➕ New List" at top, then existing lists below
6. User taps "Work" list → Checkmark appears
7. User taps "Move" button
8. **System Actions:**
   - Task's `list_id` updated to Work list ID
   - Unsorted list checked for remaining entries
   - If empty: Unsorted archived, user navigated back to Lists
   - If not empty: User stays in Unsorted detail view
   - Lists refreshed (Unsorted may disappear)
   - Success alert: "Task moved to Work"

### Workflow 2: Move Note to New List (Created Inline)

1. User opens Lists → Taps "Personal" list
2. User long-presses a note
3. Menu appears → Tap "Move to List"
4. Modal opens: "Move to List"
5. User taps "➕ New List"
6. Modal switches to "New List" view
7. User enters "Journal"
8. User taps "Create"
9. **System Actions:**
   - New list "Journal" created
   - Modal returns to "Move to List" view
   - "Journal" now appears in list and is auto-selected (with checkmark)
   - Main lists array refreshed
10. User taps "Move" button
11. **System Actions:**
    - Note's `list_id` updated to Journal list ID
    - Personal list entries reloaded
    - Success alert: "Note moved to Journal"

### Workflow 3: Move Last Checklist Out of Unsorted

1. User in Unsorted list with 1 remaining checklist
2. User long-presses checklist
3. Menu → "Move to List"
4. Modal opens
5. User selects "Shopping" list
6. User taps "Move"
7. **System Actions:**
   - Checklist moved to Shopping
   - Unsorted now has 0 active entries
   - `cleanupUnsortedListIfEmpty()` called
   - Unsorted list archived (`is_archived = 1`)
   - User navigated back to Lists screen
   - Lists refreshed → Unsorted disappears
   - Success alert: "Checklist moved to Shopping"

### Workflow 4: Move Between Two User Lists

1. User in "Work" list
2. User long-presses task "Quarterly Report"
3. Menu → "Move to List"
4. Modal shows all lists except "Work" (current) and Unsorted
5. User selects "Projects"
6. User taps "Move"
7. **System Actions:**
   - Task moved to Projects
   - Work list reloaded (task disappears)
   - Success alert: "Task moved to Projects"
   - Work list remains visible (not Unsorted, so no auto-archive)

---

## EDGE CASES HANDLED

### 1. Moving Last Item Out of Unsorted
**Scenario:** Unsorted has 1 task, user moves it  
**Handling:**
- `moveEntryToList()` updates task
- Detects source was Unsorted (`is_system = 1`)
- Calls `cleanupUnsortedListIfEmpty()`
- Unsorted archived
- `handleConfirmMove()` detects empty Unsorted
- Navigates back to Lists screen
- Lists refreshed, Unsorted disappears

**Result:** ✅ Seamless transition, no orphaned Unsorted list

### 2. Moving Item Rapidly Multiple Times
**Scenario:** User moves task, immediately opens move modal again  
**Handling:**
- Each move operation is async with await
- Modal closes before next operation
- Fresh list load on each modal open
- No race conditions (all operations sequential)

**Result:** ✅ No data corruption, operations queue properly

### 3. Moving Checklist with Items
**Scenario:** Checklist has 5 items, user moves it  
**Handling:**
- Only `entries.list_id` updated
- `checklist_items` table has FK to `entries.id` (NOT `list_id`)
- Items remain attached to checklist regardless of list

**Result:** ✅ Checklist items preserved, relationship intact

### 4. Moving Completed Task
**Scenario:** User moves completed task  
**Handling:**
- No restrictions on completion status
- `completed` and `completed_at` fields preserved
- Task moves with all metadata intact

**Result:** ✅ Completed tasks can be reorganized

### 5. Archived Lists
**Scenario:** User has archived "Old Projects" list  
**Handling:**
- `availableListsForMove` filters `!list.is_archived`
- Archived lists never appear in move picker

**Result:** ✅ Cannot accidentally move to archived list

### 6. Empty List After Move
**Scenario:** User moves only item from "Ideas" list  
**Handling:**
- List remains visible in Lists screen
- No auto-archive (only Unsorted has this behavior)
- User can add more items or delete list manually

**Result:** ✅ User lists stable, only Unsorted auto-archives

### 7. Current List Exclusion
**Scenario:** User in "Work" list, opens move modal  
**Handling:**
- Filter: `list.id !== selectedList?.id`
- "Work" not shown in available lists

**Result:** ✅ Cannot move to same list (prevents no-op)

### 8. Unsorted Exclusion
**Scenario:** User opens move modal from any list  
**Handling:**
- Filter: `!list.is_system`
- Unsorted never appears as target

**Result:** ✅ Unsorted remains system-managed only

---

## TECHNICAL IMPLEMENTATION DETAILS

### Database Operation

**Function Signature:**
```typescript
export async function moveEntryToList(input: {
  entryId: string;        // UUID of entry to move
  newListId: string;      // UUID of target list
  sourceListId?: string;  // UUID of source list (for Unsorted detection)
}): Promise<void>
```

**SQL Execution:**
```sql
UPDATE entries 
SET list_id = ?, updated_at = ? 
WHERE id = ? AND deleted_at IS NULL
```

**Parameters:**
1. `newListId` - Target list UUID
2. `Date.now()` - Current timestamp
3. `entryId` - Entry UUID

**Cleanup Logic:**
```typescript
if (input.sourceListId) {
  const sourceList = await db.getFirstAsync<{ is_system: number }>(
    'SELECT is_system FROM lists WHERE id = ? AND deleted_at IS NULL',
    [input.sourceListId]
  );
  
  if (sourceList && sourceList.is_system === 1) {
    console.log('🔍 Source was Unsorted, checking cleanup...');
    await cleanupUnsortedListIfEmpty();
  }
}
```

**Key Design Decisions:**
- ❌ No entry duplication
- ❌ No entry recreation
- ✅ Single UPDATE operation
- ✅ Preserves all entry metadata
- ✅ Reuses existing cleanup logic
- ✅ No new database tables/columns

### List Filtering Logic

**Filter Chain:**
```typescript
const available = allLists.filter(list => 
  !list.is_archived &&      // No archived lists
  !list.is_system &&        // No Unsorted
  list.id !== selectedList?.id  // No current list
);
```

**Order:**
- Currently: `sort_order` (database default)
- Future: Could add "last used" ordering (deferred to later ticket)

### Modal State Machine

**States:**
- `'select-list'` - List picker mode
- `'new-list'` - New list creation mode

**Transitions:**
```
select-list ─[Tap "New List"]──> new-list
new-list ───[Tap "Back"]──────> select-list
new-list ───[Tap "Create"]────> select-list (with new list selected)
```

**State Persistence:**
- Entry context preserved across mode switches
- Target list selection preserved
- Available lists array remains constant

---

## TESTING VERIFICATION

### Core Functionality Tests

✅ **Move task from Unsorted to existing list**
- Task disappears from Unsorted
- Task appears in target list
- Unsorted remains if other items exist

✅ **Move note to new list (inline creation)**
- New list created successfully
- Note appears in new list
- New list visible in Lists screen

✅ **Move checklist between user lists**
- Checklist items remain intact
- Progress counts preserved
- Checklist functional in new list

✅ **Move last item out of Unsorted**
- Unsorted archives
- Unsorted disappears from Lists screen
- User navigated back automatically

✅ **Create new list during move**
- Modal switches to new list mode
- List created successfully
- Modal returns to select mode with new list selected
- Move completes to new list

✅ **Entry timestamps correct**
- `updated_at` timestamp updated
- `created_at` timestamp preserved
- No unintended timestamp modifications

### Regression Tests

✅ **Quick Create (Ticket 9B) unaffected**
- Quick Create modal still works
- List picker in Quick Create functional
- Unsorted auto-creation working

✅ **Completion logic (Ticket 9C) unaffected**
- Completing last Unsorted task still archives
- Un-completing task still un-archives
- Delete still triggers cleanup

✅ **Long-press menus functioning**
- iOS ActionSheet appears correctly
- Android Alert appears correctly
- All menu options work (Move, Delete, Priority)

✅ **All entry types work**
- Tasks: Move + Priority menu
- Notes: Move + Delete menu
- Checklists: Move + Delete menu

### Platform-Specific Tests

✅ **iOS ActionSheet**
- Options in correct order
- Destructive option red
- Cancel option dismisses sheet
- Move option opens modal

✅ **Android Alert**
- Options readable
- Destructive option marked
- Cancel option dismisses
- Move option opens modal

---

## CONSTRAINTS RESPECTED

✅ **No Unsorted in UI beyond exclusion**
- Unsorted never appears in move picker
- No special UI badges for Unsorted
- System list behavior transparent to user

✅ **Reused existing patterns**
- Modal UX identical to Quick Create list picker
- Long-press menus match existing patterns
- Button styling consistent with app

✅ **No schema changes**
- Uses existing `list_id` column
- No new flags or metadata
- Database structure unchanged

✅ **Foundational capability**
- Generic operation works for all entry types
- No type-specific move logic
- Extensible for future features

✅ **No out-of-scope features**
- ❌ No bulk move
- ❌ No drag & drop
- ❌ No TasksScreen integration (read-only view)
- ❌ No keyboard shortcuts

---

## ARCHITECTURE NOTES

### Why Separate from Quick Create?

**Different Use Cases:**
- **Quick Create:** User has no context, needs to assign OR skip
- **Move:** User has existing item, needs to reassign

**Different Requirements:**
- **Quick Create:** Allow "no list" (Unsorted fallback)
- **Move:** Require explicit target (no "skip" option)

**Shared Patterns:**
- Same modal styling
- Same list filtering logic
- Same inline list creation flow

**Result:** Code reuse for UX consistency without coupling functionality

### Integration with Unsorted Logic

**Ticket 9C Foundation:**
- `cleanupUnsortedListIfEmpty()` already exists
- `archiveList()` / `unarchiveList()` functions available
- Completion logic working

**Ticket 9D Extension:**
- Reuses cleanup function
- No duplication of archive logic
- Source list ID passed for detection

**Outcome:** Move integrates seamlessly with existing Unsorted behavior

### Future Extensibility

**What This Enables:**
- ✅ Pinned lists (Ticket 10) - Move respects pinned status
- ✅ Favourites (Ticket 10B) - Move works with favourites
- ✅ Drag & drop (Ticket 11) - Can trigger moveEntryToList()
- ✅ Bulk operations - Can loop moveEntryToList()

**What This Prevents:**
- ❌ UX conflicts (move UI established before pinning)
- ❌ Data inconsistencies (single source of truth for reassignment)
- ❌ Duplicate logic (one operation for all scenarios)

---

## KNOWN LIMITATIONS

### Acceptable for MVP

**No bulk move:**
- Users must move items one at a time
- Future: Select multiple → Move all

**No undo:**
- Move is immediate and permanent
- Future: Toast with "Undo" button

**No move from TasksScreen:**
- TasksScreen is read-only summary view
- Move only available in ListsScreen detail view
- Intentional: Keeps TasksScreen focused

**No drag & drop:**
- Long-press menu required
- Future: Drag item to list in Lists screen

**No keyboard shortcuts:**
- Mobile-first design
- Future: Desktop/tablet shortcuts

**List ordering in picker:**
- Uses `sort_order` from database
- Not "last used" or "most relevant"
- Future: Smart ordering based on usage patterns

### Non-Issues (By Design)

**"Move" appears for Unsorted items:**
- Correct behavior - Unsorted is inbox for organizing
- Encourages moving items to proper lists

**Cannot move to Unsorted:**
- Correct behavior - Unsorted is system-managed
- Users should organize, not move back to inbox

**Current list excluded:**
- Correct behavior - prevents no-op moves
- Clear UX (cannot move to same place)

---

## DEPENDENCIES

### Required (Already Installed)

- React Native core components
- expo-sqlite
- react-native-safe-area-context

### Used Components

- Modal
- TouchableOpacity
- ScrollView
- TextInput
- Alert (Android)
- ActionSheetIOS (iOS)

**No new dependencies required.**

---

## ROLLBACK PLAN

### Quick Rollback

**1. Remove from ListsScreen.tsx:**
```typescript
// Remove state (lines 60-66)
const [moveModalVisible, setMoveModalVisible] = useState(false);
// ... other move state

// Remove functions (lines 574-683)
handleOpenMoveModal()
handleConfirmMove()
handleCreateNewListForMove()
// ... other move functions

// Remove from long-press handlers (lines 308-459)
// Remove "Move to List" options from menus

// Remove modal UI (lines 1116-1232)
{/* TICKET 9D: Move to List Modal */}

// Remove styles (lines 1604-1651)
```

**2. Remove from operations.ts:**
```typescript
// Remove or comment out moveEntryToList() (lines 971-1006)
```

**3. Update imports:**
```typescript
// Remove moveEntryToList from imports in ListsScreen.tsx
```

**Time:** 10-15 minutes

### Complete Reset

```sql
-- No database changes to revert
-- Move only updates existing list_id values
```

**Impact:** No data loss, entries retain last list assignment

---

## NEXT TICKETS (RECOMMENDED ORDER)

**✅ Ticket 9D** - Move Items Between Lists (COMPLETE)

**⏭️ Ticket 10A** - Pinned Lists (ListsScreen)
- Add `is_pinned` UI toggle
- Sort pinned lists to top
- Visual pin indicator

**⏭️ Ticket 10B** - Pinned Lists in Overview
- Filter Quick Create list picker to pinned
- Show pinned lists prominently

**⏭️ Ticket 11** - Drag & Drop Ordering
- Reorder lists via drag & drop
- Reorder entries within lists
- Trigger `moveEntryToList()` for cross-list drags

**⏭️ Ticket 12** - UI Polish / Icon Consistency
- Standardize icons across app
- Polish animations
- Accessibility improvements

---

## SUCCESS CRITERIA VERIFICATION

✅ **Universal capability** - Works for Tasks, Notes, Checklists  
✅ **Consistent UX** - Long-press menu across all entry types  
✅ **List exclusions correct** - Current list, Unsorted, archived filtered  
✅ **Inline list creation** - "➕ New List" creates and selects  
✅ **Unsorted cleanup automatic** - Archives when last item moved  
✅ **No data loss** - Entries preserve all metadata  
✅ **No regressions** - Quick Create, completion logic unaffected  
✅ **Platform-native** - iOS ActionSheet, Android Alert  
✅ **Foundational** - Ready for pinned lists, drag & drop, bulk operations

---

## RESUMPTION INSTRUCTIONS

If resuming work after chat history loss:

**Key Files:**
1. `operations.ts` - Contains `moveEntryToList()` function
2. `ListsScreen.tsx` - Contains complete move UI and logic

**Key Functions:**
- `moveEntryToList(entryId, newListId, sourceListId)` - Database operation
- `handleOpenMoveModal(entry)` - Opens move modal with filtered lists
- `handleConfirmMove()` - Executes move and handles cleanup
- `handleCreateNewListForMove()` - Inline list creation

**Testing Quick Check:**
1. Long-press task in Unsorted → "Move to List" appears
2. Select target list → Tap "Move"
3. Task disappears from Unsorted
4. If last item: Unsorted archives and disappears
5. Target list reloads with moved item

**Common Issues:**
- If modal doesn't open: Check `handleOpenMoveModal()` calls `setMoveModalVisible(true)`
- If lists empty in picker: Verify filtering logic excludes correctly
- If Unsorted doesn't archive: Check `sourceListId` passed to `moveEntryToList()`
- If navigation doesn't work: Check `handleConfirmMove()` calls `handleBackToLists()`

---

**END OF TICKET 9D IMPLEMENTATION SUMMARY**

All requirements met. Feature fully functional. Ready for Ticket 10A (Pinned Lists).
