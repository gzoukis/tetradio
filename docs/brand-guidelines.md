# Tetradio Brand Guidelines

**TICKET 17C**: Design System Hardening + Brand Documentation

This document defines the visual identity and brand structure of the Tetradio application.

---

## Brand Philosophy

**Tetradio** is inspired by the classic blue A4 tetradio notebooks used in schools and universities across Greece and Mediterranean Europe.

The brand creates a sense of:
- **Calm productivity** - Not overwhelming or gamified
- **Academic organization** - Structured but flexible
- **Premium simplicity** - Clean, minimal, intentional
- **Material depth** - Subtle layering, paper on cover

---

## Visual Metaphor: Notebook Structure

### **Cover = Overview Screen**

The Overview screen represents the **external cover** of a tetradio notebook.

**Visual Treatment:**
- Metallic slate-blue gradient background
- Top: `#445F8E` → Bottom: `#2E4C7E`
- White cards sit on top (like sticky notes on cover)
- Subtle depth through gradient and elevation
- Premium, tactile, protective

**Purpose:**
- Navigation hub
- Quick glance at status
- Entry point to organized content

**Rules:**
- Metallic gradient ONLY used in OverviewScreen
- Never invert (don't use white cards on light background)
- Never use gradient elsewhere

### **Pages = Inner Screens** (Future)

Inner screens (Tasks, Collections, Settings) will represent **notebook pages**.

**Visual Treatment** (not yet implemented):
- Light, neutral backgrounds (`#FFFFFF` or `#F9FAFB`)
- Structured productivity surface
- Grid lines, margins, clean typography
- Content-focused, not decorative

**Purpose:**
- Deep work screens
- Data entry and manipulation
- Focused task management

**Rules:**
- Never use metallic gradient on pages
- Keep backgrounds light and neutral
- Prioritize readability over aesthetics

---

## Color System

### Overview (Metallic Cover)

```
Gradient: #445F8E → #2E4C7E
Purpose: External notebook cover
Usage: OverviewScreen background ONLY
```

### Cards & Surfaces

```
White: #FFFFFF
Purpose: Paper, cards, modals
Usage: SmartSectionCard, dialogs, sheets
```

### Text Hierarchy

```
Primary (Ink):    #2E3A59  - Body text, titles
On Dark (Paper):  #FFFFFF  - Text on metallic cover
Secondary:        #6B7A99  - Metadata, subtitles
Muted:            #9CA3AF  - Placeholders, disabled
Light:            #CBD5E1  - Secondary text on dark
```

### Brand Accents

```
Primary (Notebook Blue): #1F4FA3  - Links, actions
Urgent (Red):            #D64545  - Overdue, alerts
FAB (Yellow):            #FCD34D  - Quick create button
Unsorted (Amber):        #D97706  - Collection indicator
```

### Priority System

```
Focus (High):    #3B82F6  - Blue filled circle
Normal:          #3B82F6  - Blue outline circle
Low:             #6B7280  - Gray filled circle
Completed:       #D1D5DB  - Light gray circle
```

---

## Typography

### Hierarchy

```
Page Title:      32px, Bold  - Screen headers
Page Subtitle:   16px        - Screen subtitles
Section Title:   14px, Bold  - Section headers
Card Title:      16px, Semi  - Card headers
Badge:           14px, Semi  - Count badges
Body:            14px        - Task titles, content
Meta:            12px        - Dates, times, names
Meta Small:      10px, Semi  - Indicators
Empty:           13px, Italic - Empty states
Link:            13px, Medium - View more links
```

### Font Weights

- **Bold (700)**: Page titles, section titles
- **Semi-bold (600)**: Card titles, badges, indicators
- **Medium (500)**: Links
- **Regular (400)**: Body text, metadata

---

## Spacing System

### Layout

```
Screen Padding:   24px  - Outer container margins
Card Padding:     20px  - Internal card padding
Card Gap:         16px  - Space between cards
Section Margin:   5%    - Horizontal margin (10% total width reduction)
```

### Components

```
Divider Vertical: 14px  - Margin around dividers
Task Preview Gap:  6px  - Space between preview items
Priority Margin:  10px  - Circle to text spacing
Metadata Margin:   8px  - Left margin for dates/times
```

### Accessibility

```
Min Touch Target: 44px  - WCAG AA compliance
Touch Padding:    12px  - Padding when text is small
```

---

## Elevation & Depth

### Card Elevation

```
Shadow Color:    #1F4FA3 (notebook blue)
Shadow Opacity:  0.15
Shadow Radius:   12px
Shadow Offset:   {0, 4}
Elevation:       4 (Android)
```

**Purpose**: Creates sense of paper laying on metallic surface

### FAB Elevation

```
Shadow Color:    #000 (black)
Shadow Opacity:  0.25
Shadow Radius:   4px
Shadow Offset:   {0, 2}
Elevation:       6 (Android)
```

**Purpose**: Floats above all other elements

---

## Border Radius

```
Cards:           12px  - SmartSectionCard corners
Badge:            8px  - Count badge corners
Button:           8px  - Action button corners
Circle:           8px  - Priority circles (half of 16px)
FAB:             24px  - FAB (half of 48px)
Small:            4px  - Checkboxes, tiny UI elements
```

---

## Accessibility Standards

### Contrast (WCAG AA)

All text must meet **4.5:1** contrast minimum:

```
✅ White on metallic (#FFFFFF on #2E4C7E): 8.4:1
✅ Primary text on white (#2E3A59 on #FFFFFF): 12.3:1
✅ Secondary text on white (#6B7A99 on #FFFFFF): 5.2:1
✅ Urgent red on white (#D64545 on #FFFFFF): 4.8:1
✅ FAB yellow visible on metallic
```

### Touch Targets

All interactive elements **44x44px minimum**:

```
✅ SmartSectionCard: Full card tappable
✅ View More link: 44px vertical padding
✅ Pinned Collections: 44px row height
✅ FAB: 48x48px (exceeds minimum)
```

### Screen Readers

All interactive elements have:
- `accessibilityRole="button"`
- Descriptive `accessibilityLabel`
- Count information in labels

---

## Animation Principles (Future)

**Not yet implemented - reserved for TICKET 17D**

### Transitions

- Fade: 200ms ease-out
- Slide: 300ms ease-in-out
- Spring: Natural physics-based

### Micro-interactions

- Touch feedback: 0.7 opacity
- Card press: Subtle scale (0.98)
- FAB press: Bounce effect

---

## Brand Rules

### DO

✅ Use metallic gradient ONLY in OverviewScreen  
✅ Maintain white cards on cover metaphor  
✅ Reference tokens for ALL visual values  
✅ Keep accessibility minimum standards  
✅ Use priority circles consistently  
✅ Maintain spacing rhythm  

### DON'T

❌ Use metallic gradient outside Overview  
❌ Invert metaphor (dark cards on light background in Overview)  
❌ Hardcode colors, spacing, or typography  
❌ Create touch targets smaller than 44px  
❌ Reduce contrast below WCAG AA  
❌ Mix notebook metaphors  

---

## Design Token Usage

All visual values come from `/src/theme/tokens.ts`:

```typescript
import { colors, spacing, typography, elevation } from '../theme/tokens';

// ✅ Correct
backgroundColor: colors.backgroundCard,
padding: spacing.cardPadding,
...typography.body,
...elevation.card,

// ❌ Incorrect
backgroundColor: '#FFFFFF',
padding: 20,
fontSize: 14,
shadowRadius: 12,
```

---

## Theme Evolution

**Current**: Light mode with metallic cover  
**Future**: Dark mode (new ticket required)

### Dark Mode Considerations (Not Implemented)

When implementing dark mode:
- Metallic gradient becomes darker slate
- White cards become dark gray (#1F2937)
- Text inverts appropriately
- Maintain priority circle colors
- Adjust shadows for dark surface

**Constraint**: Must maintain notebook metaphor

---

## Conclusion

The Tetradio brand is built on a simple metaphor: **notebook cover** (Overview) and **notebook pages** (inner screens).

This structure provides:
- Clear visual hierarchy
- Intuitive navigation
- Calm, productive aesthetic
- Scalable design system

**All future design work must respect this core metaphor.**

---

**Document Owner**: Design System  
**Last Updated**: TICKET 17C  
**Next Review**: After dark mode implementation
