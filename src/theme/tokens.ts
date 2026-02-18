/**
 * Tetradio Design Token System
 * 
 * TICKET 17C: Design System Hardening
 * 
 * This file is the SINGLE SOURCE OF TRUTH for all visual design values
 * in the Tetradio application.
 * 
 * CRITICAL RULES:
 * - NO hardcoded colors, spacing, or typography in components
 * - NO inline styles for visual values in JSX
 * - ALL visual decisions must reference these tokens
 * - Changes to design system happen HERE ONLY
 * 
 * Brand Structure:
 * - Overview = Notebook Cover (metallic slate blue)
 * - Other screens = Notebook Pages (light, clean)
 */

/**
 * Color Tokens
 * 
 * Organized by function, not by hue.
 * Names describe usage, not appearance.
 */
export const colors = {
  // ═══════════════════════════════════════════════════════════
  // OVERVIEW SCREEN - METALLIC NOTEBOOK COVER
  // ═══════════════════════════════════════════════════════════
  // These colors are ONLY used in OverviewScreen.
  // They represent the external cover of a tetradio notebook.
  // Gradient creates subtle material depth.
  
  /**
   * Overview gradient (top to bottom)
   * Creates subtle metallic depth on cover
   * 
   * Usage: OverviewScreen background only
   * Constraint: Linear vertical gradient only, no radial
   */
  overviewGradient: ['#445F8E', '#2E4C7E'] as const,
  
  // ═══════════════════════════════════════════════════════════
  // CARDS & SURFACES
  // ═══════════════════════════════════════════════════════════
  
  /** White cards on Overview (paper on cover) */
  backgroundCard: '#FFFFFF',
  
  /** Page background for inner screens (future) */
  backgroundPage: '#FFFFFF',
  
  // ═══════════════════════════════════════════════════════════
  // TEXT HIERARCHY
  // ═══════════════════════════════════════════════════════════
  
  /** Primary body text (dark blue ink) */
  textPrimary: '#2E3A59',
  
  /** Text on dark backgrounds (Overview title/subtitle) */
  textOnDark: '#FFFFFF',
  
  /** Secondary text (metadata, subtitles) */
  textSecondary: '#6B7A99',
  
  /** Muted text (placeholders, disabled states) */
  textMuted: '#9CA3AF',
  
  /** Light text on colored backgrounds */
  textLight: '#CBD5E1',
  
  // ═══════════════════════════════════════════════════════════
  // BRAND ACCENTS
  // ═══════════════════════════════════════════════════════════
  
  /** Primary brand accent (notebook blue) */
  accentPrimary: '#1F4FA3',
  
  /** Urgent/warning accent (overdue, alerts) */
  accentUrgent: '#D64545',
  
  /** FAB background (light yellow, stands out on metallic) */
  fabBackground: '#FCD34D',
  
  /** FAB icon color (blue for contrast) */
  fabIcon: '#1F4FA3',
  
  /** Unsorted collection indicator (amber/orange) */
  unsortedIndicator: '#D97706',
  
  // ═══════════════════════════════════════════════════════════
  // PRIORITY SYSTEM (CALM PRIORITY)
  // ═══════════════════════════════════════════════════════════
  
  /** Priority 1 (Focus) - Blue filled circle */
  priorityFocus: '#3B82F6',
  
  /** Priority 2 (Normal) - Blue outline circle */
  priorityNormalBorder: '#3B82F6',
  
  /** Priority 3 (Low) - Gray filled circle */
  priorityLow: '#6B7280',
  
  /** Completed tasks - Muted gray circle */
  priorityCompleted: '#D1D5DB',
  
  // ═══════════════════════════════════════════════════════════
  // UI ELEMENTS
  // ═══════════════════════════════════════════════════════════
  
  /** Divider lines (subtle separation) */
  divider: 'rgba(31, 79, 163, 0.08)',
  
  /** Count badge backgrounds */
  badgeNormalBackground: 'rgba(31, 79, 163, 0.1)',
  badgeUrgentBackground: 'rgba(214, 69, 69, 0.1)',
  
  /** Filter banner (TasksScreen) */
  filterBannerBackground: '#3B82F6',
  filterBannerText: '#FFFFFF',
  filterBannerButton: '#FFFFFF',

  // ═══════════════════════════════════════════════════════════
  // TICKET 18A — NOTEBOOK IDENTITY SYSTEM
  // ═══════════════════════════════════════════════════════════
  // Inner pages of the Tetradio notebook.
  // Overview (metallic cover) is intentionally excluded.

  /** Warm paper tone — default page background for inner screens */
  paperBackground: '#F8F9F6',

  /** Extremely subtle ruled line (classic mode only) */
  notebookLine: 'rgba(0,0,0,0.05)',

  /** Subtle margin line (classic mode only) */
  notebookMargin: 'rgba(0,0,0,0.08)',

  /** Completed task text — muted, readable, calm */
  completedText: 'rgba(0,0,0,0.4)',
};

/**
 * Spacing Tokens
 * 
 * All spacing values in the app.
 * Maintains consistent rhythm and hierarchy.
 */
export const spacing = {
  // ═══════════════════════════════════════════════════════════
  // LAYOUT SPACING
  // ═══════════════════════════════════════════════════════════
  
  /** Screen padding (outer container) */
  screenPadding: 24,
  
  /** Card internal padding */
  cardPadding: 20,
  
  /** Gap between cards */
  cardGap: 16,
  
  /** Divider vertical margin */
  dividerVertical: 14,
  
  /** Section horizontal margin (Pinned Collections, cards) */
  sectionMarginHorizontal: '5%' as const,
  
  // ═══════════════════════════════════════════════════════════
  // COMPONENT SPACING
  // ═══════════════════════════════════════════════════════════
  
  /** Task preview vertical spacing */
  taskPreviewPadding: 6,
  
  /** Task preview gap between items */
  taskPreviewGap: 6,
  
  /** Priority circle margin */
  priorityCircleMargin: 10,
  
  /** Metadata margin (right-aligned date/time) */
  metadataMarginLeft: 8,
  
  // ═══════════════════════════════════════════════════════════
  // ACCESSIBILITY
  // ═══════════════════════════════════════════════════════════
  
  /** Minimum touch target (WCAG AA compliance) */
  minTouchTarget: 44,
  
  /** Touch target padding (when text is smaller) */
  touchTargetPadding: 12,
};

/**
 * Typography Tokens
 * 
 * Font sizes and weights for text hierarchy.
 * Use these objects directly in styles.
 */
export const typography = {
  // ═══════════════════════════════════════════════════════════
  // TEXT STYLES
  // ═══════════════════════════════════════════════════════════
  
  /** Page title (Overview, TasksScreen header) */
  pageTitle: {
    fontSize: 32,
    fontWeight: '700' as const,
  },
  
  /** Page subtitle */
  pageSubtitle: {
    fontSize: 16,
  },
  
  /** Section title (Pinned Collections) */
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  
  /** Card title (SmartSectionCard header) */
  cardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  
  /** Count badge text */
  badge: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  
  /** Card subtitle (Organize completed count) */
  cardSubtitle: {
    fontSize: 12,
  },
  
  /** Body text (task titles) */
  body: {
    fontSize: 14,
  },
  
  /** Metadata (dates, times, collection names) */
  meta: {
    fontSize: 12,
  },
  
  /** Small metadata (no-date, no-collection indicators) */
  metaSmall: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  
  /** Empty state text */
  empty: {
    fontSize: 13,
    fontStyle: 'italic' as const,
  },
  
  /** View more link */
  link: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  
  /** FAB icon */
  fabIcon: {
    fontSize: 28,
    fontWeight: '600' as const,
  },
};

/**
 * Elevation Tokens
 * 
 * Shadow and elevation styles for layering.
 * Maintains consistent depth hierarchy.
 */
export const elevation = {
  // ═══════════════════════════════════════════════════════════
  // CARD ELEVATION
  // ═══════════════════════════════════════════════════════════
  
  /** SmartSectionCard shadow (paper on metallic surface) */
  card: {
    shadowColor: '#1F4FA3',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  
  /** FAB elevation (floating above everything) */
  fab: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
};

/**
 * Border Radius Tokens
 * 
 * Consistent corner radius values.
 */
export const borderRadius = {
  /** Card corners */
  card: 12,
  
  /** Count badge corners */
  badge: 8,
  
  /** Priority circle (half of width/height for perfect circle) */
  circle: 8,
  
  /** FAB (half of width/height for perfect circle) */
  fab: 24,
  
  /** Button corners */
  button: 8,
  
  /** Small UI elements (checkboxes, small buttons) */
  small: 4,
};

/**
 * Size Tokens
 * 
 * Fixed size values for consistent elements.
 */
export const sizes = {
  // ═══════════════════════════════════════════════════════════
  // INTERACTIVE ELEMENTS
  // ═══════════════════════════════════════════════════════════
  
  /** Priority circle */
  priorityCircle: {
    width: 16,
    height: 16,
  },
  
  /** FAB (Floating Action Button) */
  fab: {
    width: 48,
    height: 48,
  },
};

/**
 * Opacity Tokens
 * 
 * Consistent transparency values.
 */
export const opacity = {
  /** Badge backgrounds */
  badgeBackground: 0.1,
  
  /** Divider lines */
  divider: 0.08,
  
  /** Disabled states */
  disabled: 0.4,
  
  /** Touch feedback */
  touchActive: 0.7,
};

/**
 * USAGE EXAMPLES:
 * 
 * ```typescript
 * import { colors, spacing, typography, elevation } from '@/theme/tokens';
 * 
 * const styles = StyleSheet.create({
 *   card: {
 *     backgroundColor: colors.backgroundCard,
 *     padding: spacing.cardPadding,
 *     marginBottom: spacing.cardGap,
 *     borderRadius: borderRadius.card,
 *     ...elevation.card,
 *   },
 *   title: {
 *     ...typography.cardTitle,
 *     color: colors.textPrimary,
 *   },
 * });
 * ```
 */
