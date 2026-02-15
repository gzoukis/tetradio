/**
 * SmartSectionCard Component
 * 
 * TICKET 17B: Tetradio Notebook-Style Overview Cards
 * 
 * A reusable card component that displays a section of tasks with:
 * - Header with title and count badge
 * - Preview of 0-3 tasks
 * - Empty states
 * - "View More" link for 4+ tasks
 * - Notebook-inspired visual design
 * 
 * Design inspired by classic blue A4 tetradio notebooks with
 * clean lines, subtle shadows, and calm color palette.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import type { TaskFilter } from '../types/filters';

// TICKET 17B: Task interface for preview
// Using minimal subset needed for preview display
interface TaskPreview {
  id: string;
  title: string;
  completed: boolean;
  due_date?: number;
}

interface SmartSectionCardProps {
  title: string;
  count: number;
  tasks: TaskPreview[];
  filter: TaskFilter;
  onPress: (filter: TaskFilter) => void;
  accent?: 'normal' | 'urgent';
  emptyMessage?: string;
  subtitle?: string; // For Organize section: "32 completed tasks"
}

/**
 * Format due date/time for task preview
 * Shows time if present, otherwise relative date
 */
function formatDueDate(timestamp: number | undefined): string | null {
  if (!timestamp) return null;
  
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const diffDays = Math.floor((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  // Check if task has time component
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  
  if (hasTime) {
    // Show time (e.g., "10:00 AM")
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  }
  
  // Show relative date
  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  
  // Show formatted date (e.g., "Mar 12")
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function SmartSectionCard({
  title,
  count,
  tasks,
  filter,
  onPress,
  accent = 'normal',
  emptyMessage,
  subtitle,
}: SmartSectionCardProps) {
  
  // TICKET 17B: Memoize preview tasks (first 3 only)
  const previewTasks = useMemo(() => {
    return tasks.slice(0, 3);
  }, [tasks]);
  
  const hasMore = tasks.length > 3;
  const isEmpty = tasks.length === 0;
  const isUrgent = accent === 'urgent';
  
  return (
    <TouchableOpacity
      style={[
        styles.card,
        isUrgent && styles.cardUrgent,
      ]}
      onPress={() => onPress(filter)}
      activeOpacity={0.7}
    >
      {/* Header Row */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={[
          styles.countBadge,
          isUrgent ? styles.countBadgeUrgent : styles.countBadgeNormal,
        ]}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      </View>
      
      {/* Subtitle (for Organize section) */}
      {subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}
      
      {/* Divider */}
      <View style={styles.divider} />
      
      {/* Preview Area */}
      <View style={styles.previewArea}>
        {isEmpty ? (
          // Empty State
          <Text style={styles.emptyState}>
            {emptyMessage || 'Nothing here.'}
          </Text>
        ) : (
          <>
            {/* Task Previews */}
            {previewTasks.map((task, index) => (
              <View key={task.id} style={[
                styles.taskPreview,
                index < previewTasks.length - 1 && styles.taskPreviewWithMargin,
              ]}>
                {/* Checkbox Icon */}
                <View style={styles.checkbox}>
                  {task.completed && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                
                {/* Task Title */}
                <Text 
                  style={[
                    styles.taskTitle,
                    task.completed && styles.taskTitleCompleted,
                  ]}
                  numberOfLines={1}
                >
                  {task.title}
                </Text>
                
                {/* Due Date/Time */}
                {task.due_date && (
                  <Text style={styles.taskDue}>
                    {formatDueDate(task.due_date)}
                  </Text>
                )}
              </View>
            ))}
            
            {/* View More Link */}
            {hasMore && (
              <TouchableOpacity 
                style={styles.viewMoreButton}
                onPress={() => onPress(filter)}
                activeOpacity={0.7}
              >
                <Text style={styles.viewMoreText}>View more →</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

// TICKET 17B: Tetradio Notebook Styles
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardUrgent: {
    borderLeftWidth: 4,
    borderLeftColor: '#D64545',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E3A59',
    flex: 1,
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  countBadgeNormal: {
    backgroundColor: '#1F4FA3',
  },
  countBadgeUrgent: {
    backgroundColor: '#D64545',
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Subtitle
  subtitle: {
    fontSize: 13,
    color: '#6B7A99',
    marginTop: 4,
  },
  
  // Divider
  divider: {
    height: 1,
    backgroundColor: 'rgba(31, 79, 163, 0.08)',
    marginVertical: 12,
  },
  
  // Preview Area
  previewArea: {
    minHeight: 40,
  },
  
  // Empty State
  emptyState: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#6B7A99',
    textAlign: 'center',
    paddingVertical: 12,
  },
  
  // Task Preview
  taskPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskPreviewWithMargin: {
    marginBottom: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 12,
    color: '#1F4FA3',
  },
  taskTitle: {
    fontSize: 15,
    color: '#2E3A59',
    flex: 1,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#6B7A99',
  },
  taskDue: {
    fontSize: 13,
    color: '#6B7A99',
    marginLeft: 8,
  },
  
  // View More Link
  viewMoreButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  viewMoreText: {
    fontSize: 14,
    color: '#1F4FA3',
    fontWeight: '500',
  },
});
