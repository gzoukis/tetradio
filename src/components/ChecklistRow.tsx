import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ChecklistWithStats } from '../types/models';

interface ChecklistRowProps {
  checklist: ChecklistWithStats;
  onPress: () => void;
  onLongPress: () => void;
}

/**
 * ChecklistRow Component
 * 
 * Displays a checklist CONTAINER in ListsScreen
 * 
 * Shows:
 * - Icon (🧾 or ☑︎)
 * - Title
 * - Progress indicator ("2 / 5")
 * 
 * Interaction:
 * - Tap → open ChecklistScreen
 * - Long press → delete checklist
 * 
 * NOT SHOWN:
 * - ❌ No checkbox (checklists aren't inline-completable)
 * - ❌ No individual items (shown in ChecklistScreen)
 * - ❌ No inline editing (open screen to edit)
 */
export default function ChecklistRow({ checklist, onPress, onLongPress }: ChecklistRowProps) {
  const { checked_count, total_count } = checklist;
  const hasItems = total_count > 0;
  const isComplete = hasItems && checked_count === total_count;

  return (
    <TouchableOpacity
      style={styles.checklistRow}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      delayLongPress={500}
    >
      {/* Checklist icon */}
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{isComplete ? '☑︎' : '🧾'}</Text>
      </View>

      {/* Checklist content */}
      <View style={styles.checklistContent}>
        <Text style={styles.checklistTitle}>{checklist.title}</Text>
        
        {hasItems && (
          <Text style={styles.progress}>
            {checked_count} / {total_count}
          </Text>
        )}
      </View>

      {/* Chevron indicator */}
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  checklistRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 32,
    height: 32,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 24,
  },
  checklistContent: {
    flex: 1,
  },
  checklistTitle: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
    marginBottom: 2,
  },
  progress: {
    fontSize: 14,
    color: '#6b7280',
  },
  chevron: {
    fontSize: 24,
    color: '#9ca3af',
    marginLeft: 8,
  },
});
