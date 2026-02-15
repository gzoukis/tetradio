# Organize Section Architecture

**TICKET 17C**: Architecture Documentation  
**TICKET 17C.1**: Logic Refinement - No Duplication

This document explains how the **Organize** section works in the Overview screen and why it's implemented this way.

---

## Purpose

The Organize section surfaces tasks that need **date assignment**.

It serves as a **structural cleanup point** for:
- Tasks created without dates
- Tasks that need time context

---

## Mental Model (17C.1)

### Clean Separation

| Section | Shows | Purpose |
|---------|-------|---------|
| **Time-based** (Today/Upcoming/Overdue) | All tasks **with dates** | **Execution** - What to do when |
| **Organize** | All tasks **without dates** | **Structure** - What needs planning |

**No overlap. No duplication.**

---

## What Appears in Organize

The Organize section shows **ONLY**:

### Tasks with NO Due Date
All tasks that have not been assigned a due date, regardless of collection.

**Logic:**
```typescript
const organizeTasks = useMemo(() => {
  return grouped.no_date;  // Simply: tasks without due_date
}, [grouped.no_date]);
```

**Why:** These tasks need time context. They exist but lack scheduling.

---

## What Does NOT Appear in Organize

### ❌ Tasks with Due Dates

Even if a task is in the "Unsorted" collection, **if it has a date, it does NOT appear in Organize**.

**Example:**
```
Task: "Call dentist"
Collection: Unsorted
Due: Today 2:00 PM

Appears in:
→ Focus Today card (because it has a date)
→ Shows "No collection" metadata (subtle indicator)

Does NOT appear in:
❌ Organize card
```

**Why:**
- Task has execution time (Today 2pm)
- User knows WHEN to do it
- Collection assignment is secondary to timing
- "No collection" shown as metadata, not urgency

---

## Reasoning Behind 17C.1 Change

### Problem in 17C:
Tasks with dates appeared **twice**:
1. Time-based card (Today/Upcoming)
2. Organize card

This created confusion:
- Duplication felt like a bug
- Mental model unclear
- "Organize" meant both time AND structure

### Solution in 17C.1:
**Clear separation of concerns:**

**Time sections** answer: *"WHEN do I do this?"*
- Shows: All tasks with dates
- Purpose: Execution planning

**Organize section** answers: *"WHAT needs time assignment?"*
- Shows: All tasks without dates
- Purpose: Structural cleanup

**Result:**
- No duplication anywhere
- Clear mental model
- Each section has one job

---

## Visual Indicators

### Tasks with Date + No Collection
```
In Time Card (Today):
☐ Call dentist                 No collection
                               Today · 2:00 PM
```

**Styling (17C.1):**
- "No collection" uses `typography.meta`
- Color: `colors.textSecondary` (muted, not urgent)
- Style: Italic (metadata, not warning)
- **This is information, not an alert**

### Tasks with No Date (in Organize)
```
In Organize Card:
☐ Buy groceries                No date
                               No collection  (if unsorted)
```

**Styling:**
- "No date" uses `typography.meta`
- Color: `colors.textMuted`
- Style: Italic

---

## Implementation Details

### Data Source (17C.1 - Simplified)

```typescript
// TICKET 17C.1: Clean logic - no duplication
const organizeTasks = useMemo(() => {
  // Simply return no-date tasks
  // No filtering, no combining, no deduplication needed
  return grouped.no_date;
}, [grouped.no_date]);
```

### Why This is Better

**Before (17C):**
```typescript
const organizeTasks = useMemo(() => {
  const noDateTasks = grouped.no_date;
  const unsortedWithDate = tasks.filter(t => 
    !t.completed && 
    t.list_name === 'Unsorted' && 
    t.due_date
  );
  const combined = [...noDateTasks, ...unsortedWithDate];
  const unique = Array.from(new Map(combined.map(t => [t.id, t])).values());
  return unique;
}, [tasks, grouped.no_date]);
```
❌ Complex  
❌ Duplicates tasks  
❌ Unclear purpose

**After (17C.1):**
```typescript
const organizeTasks = useMemo(() => {
  return grouped.no_date;
}, [grouped.no_date]);
```
✅ Simple  
✅ No duplication  
✅ Clear purpose

---

## Filtering Architecture Preservation

**CRITICAL**: Organize section is **presentation-layer only**.

### What It Does NOT Change

❌ Does NOT modify `TaskFilter` type  
❌ Does NOT modify `applyTaskFilter()` function  
❌ Does NOT create new filter categories  
❌ Does NOT change grouping logic  
❌ Does NOT affect navigation contracts  

### What It DOES Do

✅ Displays `grouped.no_date` tasks  
✅ Shows tasks that need time assignment  
✅ Provides "No date" indicator  
✅ Enables navigation to `no-date` filter  

### Relationship to TICKET 17A

```
17A Filter Architecture (UNTOUCHED):
└─ applyTaskFilter() 
   └─ 'no-date' filter → returns tasks without due_date
   
17C.1 Presentation Layer (SIMPLIFIED):
└─ organizeTasks = grouped.no_date
   └─ Shows in SmartSectionCard
   └─ Navigates to 'no-date' filter
```

**The filtering system remains pure.**  
**The presentation layer is now simpler.**

---

## Navigation Behavior

### Clicking Organize Card

**Action:** Navigates to TasksScreen with `filter='no-date'`

**What User Sees:**
- All tasks without due dates
- Filtered view
- "View All Tasks" option to clear filter

**User Flow:**
1. User sees Organize card: "5 tasks"
2. User taps card
3. TasksScreen shows no-date filter
4. User assigns dates to tasks
5. Tasks move to time-based cards
6. Organize count decreases

---

## Edge Cases

### 1. Create Task With Date, No Collection
```
Task: "Call dentist"
Date: Tomorrow 2pm
Collection: (none) → Goes to Unsorted

Result:
→ Appears in Coming Up card
→ Shows "No collection" (subtle metadata)
→ Does NOT appear in Organize
```

### 2. Create Task Without Date, No Collection
```
Task: "Buy milk"
Date: (none)
Collection: (none) → Goes to Unsorted

Result:
→ Appears in Organize card
→ Shows "No date" + "No collection"
→ Does NOT appear in time cards
```

### 3. Task Gets Date
```
Before: In Organize (no date)
User adds: Due date
After: Moves to time card
       Removed from Organize
```

### 4. Task Loses Date
```
Before: In time card (has date)
User removes: Due date
After: Moves to Organize
       Removed from time cards
```

---

## Future Considerations

### Collection-Based Filtering (Future Ticket)
- May add "View Unsorted" feature
- Would be separate from Organize
- Organize remains time-based (no-date)

### Dark Mode
- "No collection" indicator remains subtle
- Color adjustment: `textSecondary` adapts to dark theme
- Core logic unchanged

### Localization
- "No date" → translatable string
- "No collection" → translatable string
- Consider symbols (○, 📦) for language-independence

---

## Comparison: 17C vs 17C.1

| Aspect | 17C | 17C.1 |
|--------|-----|-------|
| **Duplication** | Yes (unsorted+date twice) | No |
| **Mental Model** | Unclear | Clear |
| **Logic Complexity** | High (filtering, combining, dedup) | Low (just grouped.no_date) |
| **Purpose** | Time + Structure | Structure only |
| **Indicator Styling** | Alert (orange) | Metadata (muted) |
| **User Confusion** | "Why is this twice?" | Clear separation |

---

## Conclusion

The Organize section (17C.1) is a **presentation-layer** feature that:

✅ Shows ONLY no-date tasks  
✅ Provides structural cleanup point  
✅ No duplication anywhere  
✅ Clear mental model  
✅ Simple implementation  
✅ Preserves 17A filtering architecture  

**Time sections** = Execution (when)  
**Organize section** = Structure (planning)

**Clean. Simple. Clear.**

---

**Document Owner**: Architecture  
**Dependencies**: TICKET 17A (filtering), TICKET 17B (UI), TICKET 17C (tokens)  
**Last Updated**: TICKET 17C.1  
**Related Docs**: `brand-guidelines.md`, `TICKET_17A_FINAL_COMPLETE_SUMMARY.md`
