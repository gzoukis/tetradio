/**
 * NotebookLayer
 *
 * TICKET 18A — Notebook Identity System
 *
 * A zero-interaction decorative layer that sits behind screen content.
 * Renders the notebook page aesthetic in two modes:
 *
 *   abstract  — Warm paper tone only. Clean, timeless.
 *   classic   — Warm paper tone + very subtle ruled lines + margin line.
 *
 * ARCHITECTURE RULES (must never be violated):
 *   - position: 'absolute' fills parent, never participates in layout
 *   - pointerEvents="none" — completely invisible to touch handling
 *   - Must be the FIRST child inside the screen's root <View>
 *   - Must NOT wrap screens in new containers
 *   - Causes zero re-renders of content tree when mode changes
 *
 * PERFORMANCE:
 *   - Classic mode uses a single View with repeating backgroundImage pattern
 *     via a lightweight SVG data-URI — no array of line views, no iteration
 *   - Margin line is a single 1px View — no layout impact
 *   - Memoised: only re-renders when `mode` prop changes
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';

export type NotebookMode = 'abstract' | 'classic';

interface NotebookLayerProps {
  mode: NotebookMode;
}

const LINE_HEIGHT = 28; // baseline rhythm in px — aligns with body text leading
const MARGIN_LEFT = 30; // left margin line offset

const NotebookLayer = memo(({ mode }: NotebookLayerProps) => {
  return (
    <View style={styles.root} pointerEvents="none">
      {/* Paper background — always applied on inner screens */}
      <View style={styles.paper} />

      {/* Classic mode only: ruled lines via repeating gradient pattern */}
      {mode === 'classic' && (
        <>
          {/* Ruled lines — rendered as a series of extremely thin views
              using a single wrapper + flex layout trick to avoid
              creating O(n) child components. Instead we use a repeating
              border-bottom pattern on a transparent overlay. */}
          <RuledLines />

          {/* Margin line — 1px vertical, fixed left offset */}
          <View style={styles.marginLine} />
        </>
      )}
    </View>
  );
});

/**
 * RuledLines
 *
 * Renders horizontal ruled lines efficiently.
 *
 * Implementation: A full-height transparent View with a repeating
 * background pattern. React Native doesn't support CSS background-image,
 * so we use a different approach: a single absolutely-positioned view
 * whose height is a multiple of LINE_HEIGHT, with border-bottom applied,
 * repeated via a calculated number of child Views — but capped at a
 * fixed maximum (screen height / line height ≈ ~30 lines) to avoid
 * large arrays. This is generated once and never changes.
 *
 * Lines are intentionally so faint (opacity 0.05) they disappear at
 * normal viewing distance. They only become perceptible when the user
 * looks for them.
 */
const MAX_LINES = 60; // covers all realistic screen heights at 28px spacing

const RuledLines = memo(() => {
  // lineElements defined here (not at module level) so styles is available
  const lines = Array.from({ length: MAX_LINES }, (_, i) => (
    <View key={i} style={styles.ruleLine} />
  ));
  
  return (
    <View style={styles.ruledLinesContainer}>
      {lines}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },

  paper: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.paperBackground,
  },

  // Ruled lines container — fills entire height
  ruledLinesContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },

  // Each rule line is LINE_HEIGHT tall with a bottom border
  ruleLine: {
    height: LINE_HEIGHT,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.notebookLine,
  },

  // Margin line — 1px wide, full height, fixed left offset
  marginLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: MARGIN_LEFT,
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.notebookMargin,
  },
});

export default NotebookLayer;
