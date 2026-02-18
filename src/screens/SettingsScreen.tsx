/**
 * SettingsScreen
 *
 * TICKET 18A — Notebook Identity System
 *
 * Contains the notebook mode toggle (Abstract / Classic).
 * Changing the mode updates Context only — no remounting, no scroll reset.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import NotebookLayer from '../components/NotebookLayer';
import { useNotebookModeContext } from '../context/NotebookModeContext';
import { colors, spacing, typography, borderRadius } from '../theme/tokens';
import type { NotebookMode } from '../components/NotebookLayer';

export default function SettingsScreen() {
  const { mode, setMode } = useNotebookModeContext();

  return (
    <View style={styles.container}>
      {/* TICKET 18A: Notebook identity layer */}
      <NotebookLayer mode={mode} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Notebook Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NOTEBOOK APPEARANCE</Text>

          <View style={styles.card}>
            <Text style={styles.settingTitle}>Page Style</Text>
            <Text style={styles.settingDescription}>
              Choose how the inner pages of your notebook look.
            </Text>

            <View style={styles.modeRow}>
              <ModeOption
                label="Abstract"
                description="Warm paper tone. Clean and timeless."
                value="abstract"
                selected={mode === 'abstract'}
                onSelect={setMode}
              />
              <ModeOption
                label="Classic"
                description="Warm paper with subtle ruled lines."
                value="classic"
                selected={mode === 'classic'}
                onSelect={setMode}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Mode Option Component ──────────────────────────────────────────────────

interface ModeOptionProps {
  label: string;
  description: string;
  value: NotebookMode;
  selected: boolean;
  onSelect: (mode: NotebookMode) => void;
}

function ModeOption({ label, description, value, selected, onSelect }: ModeOptionProps) {
  return (
    <TouchableOpacity
      style={[styles.modeOption, selected && styles.modeOptionSelected]}
      onPress={() => onSelect(value)}
      activeOpacity={0.7}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${label}: ${description}`}
    >
      <View style={styles.modeOptionTop}>
        {/* Preview thumbnail */}
        <ModePreview mode={value} />

        {/* Selection indicator */}
        <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
          {selected && <View style={styles.radioInner} />}
        </View>
      </View>

      <Text style={[styles.modeLabel, selected && styles.modeLabelSelected]}>
        {label}
      </Text>
      <Text style={styles.modeDescription}>{description}</Text>
    </TouchableOpacity>
  );
}

// ─── Mode Preview Thumbnail ─────────────────────────────────────────────────

function ModePreview({ mode }: { mode: NotebookMode }) {
  return (
    <View style={styles.previewContainer}>
      {/* Paper background */}
      <View style={[styles.previewPaper, { backgroundColor: colors.paperBackground }]} />

      {mode === 'classic' && (
        <>
          {/* 4 ruled lines */}
          {[18, 30, 42, 54].map(top => (
            <View
              key={top}
              style={[styles.previewLine, { top }]}
            />
          ))}
          {/* Margin line */}
          <View style={styles.previewMargin} />
        </>
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paperBackground,
  },

  content: {
    paddingBottom: 40,
  },

  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 24,
    paddingBottom: 20,
  },

  title: {
    ...typography.pageTitle,
    color: colors.textPrimary,
  },

  section: {
    paddingHorizontal: spacing.screenPadding,
    marginBottom: 24,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.textSecondary,
    marginBottom: 10,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.card,
    padding: spacing.cardPadding,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  settingTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary,
    marginBottom: 4,
  },

  settingDescription: {
    ...typography.meta,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },

  modeRow: {
    flexDirection: 'row',
    gap: 12,
  },

  modeOption: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.divider,
    borderRadius: borderRadius.card,
    padding: 12,
    backgroundColor: '#FAFAFA',
  },

  modeOptionSelected: {
    borderColor: colors.accentPrimary,
    backgroundColor: '#F0F4FF',
  },

  modeOptionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  modeLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
  },

  modeLabelSelected: {
    color: colors.accentPrimary,
  },

  modeDescription: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
  },

  // Radio button
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioOuterSelected: {
    borderColor: colors.accentPrimary,
  },

  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentPrimary,
  },

  // Preview thumbnail
  previewContainer: {
    width: 56,
    height: 70,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.12)',
  },

  previewPaper: {
    ...StyleSheet.absoluteFillObject,
  },

  previewLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.notebookLine,
  },

  previewMargin: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 10,
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.notebookMargin,
  },
});
