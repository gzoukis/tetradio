import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ChecklistItem } from '../types/models';

interface ChecklistItemRowProps {
  item: ChecklistItem;
  onToggle: () => void;
  onTitlePress: () => void;
  onLongPress: () => void;
}

/**
 * ChecklistItemRow Component
 * 
 * Displays a single checklist item within ChecklistScreen
 * 
 * Shows:
 * - Checkbox (tap to toggle)
 * - Title (tap to edit inline)
 * 
 * Interaction:
 * - Tap checkbox → toggle checked state
 * - Tap title → inline edit
 * - Long press → delete item
 * 
 * Visual:
 * - Green checkbox (like redesigned checklist visual identity)
 * - Strikethrough when checked
 * - Lightweight styling
 */
export default function ChecklistItemRow({ 
  item, 
  onToggle, 
  onTitlePress, 
  onLongPress 
}: ChecklistItemRowProps) {
  return (
    <View style={styles.itemRow}>
      {/* Checkbox - tap to toggle */}
      <TouchableOpacity
        style={[styles.checkbox, item.checked && styles.checkboxChecked]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        {item.checked && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>

      {/* Title - tap to edit, long press to delete */}
      <TouchableOpacity
        style={styles.itemContent}
        onPress={onTitlePress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
        delayLongPress={500}
      >
        <Text 
          style={[
            styles.itemTitle, 
            item.checked && styles.itemTitleChecked
          ]}
        >
          {item.title}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  itemRow: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10b981', // Green
    borderColor: '#10b981',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  itemTitleChecked: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
});
