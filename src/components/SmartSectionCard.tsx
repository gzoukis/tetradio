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
  calm_priority?: number;  // FIX 3: Priority for colored circle indicators
  list_name?: string;  // FIX 2: Collection name for Unsorted detection
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
 * FIX 3/4: Shows both date and time when available, with indicators
 * - Date only: "Feb 28 ○" (circle indicates no time set)
 * - Date + Time: "Feb 28 · 8:00 PM"
 * - No date: Returns null (handled separately for Organize section)
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
  
  // Format date part
  let dateStr: string;
  if (diffDays === -1) {
    dateStr = 'Yesterday';
  } else if (diffDays === 0) {
    dateStr = 'Today';
  } else if (diffDays === 1) {
    dateStr = 'Tomorrow';
  } else {
    dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  
  if (hasTime) {
    // FIX 3: Show both date AND time when time is set
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    const timeStr = `${displayHours}:${displayMinutes} ${ampm}`;
    
    return `${dateStr} · ${timeStr}`;
  } else {
    // FIX 3: Show date with circle indicator (no time set)
    return `${dateStr} ○`;
  }
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
          <Text style={[
            styles.countText,
            isUrgent && styles.countTextUrgent,
          ]}>
            {count}
          </Text>
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
            {previewTasks.map((task, index) => {
              // FIX 3: Determine priority circle color
              const getPriorityStyle = () => {
                if (task.completed) {
                  return styles.priorityCircleCompleted;
                }
                switch (task.calm_priority) {
                  case 1:  // Focus - Blue filled
                    return styles.priorityCircleFocus;
                  case 3:  // Low - Gray filled
                    return styles.priorityCircleLow;
                  case 2:  // Normal - Blue outline (default)
                  default:
                    return styles.priorityCircleNormal;
                }
              };
              
              return (
                <View key={task.id} style={[
                  styles.taskPreview,
                  index < previewTasks.length - 1 && styles.taskPreviewWithMargin,
                ]}>
                  {/* FIX 3: Priority Circle Indicator */}
                  <View style={[styles.priorityCircle, getPriorityStyle()]} />
                
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
                
                {/* Due Date/Time & Collection Status */}
                <View style={styles.taskMetaContainer}>
                  {/* FIX 2: Show "No Collection" for Unsorted tasks */}
                  {task.list_name === 'Unsorted' && (
                    <Text style={styles.taskNoCollection}>No Collection</Text>
                  )}
                  
                  {/* Due Date/Time */}
                  {task.due_date ? (
                    <Text style={[
                      styles.taskDue,
                      task.list_name === 'Unsorted' && styles.taskDueWithCollection,
                    ]}>
                      {formatDueDate(task.due_date)}
                    </Text>
                  ) : (
                    <Text style={styles.taskNoDate}>No date</Text>
                  )}
                </View>
              </View>
            );
            })}
            
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

// TICKET 17B: Tetradio Notebook Styles (Updated to match visual reference)
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: '5%',  // FIX 1: Cards 10% narrower (5% margin on each side)
    shadowColor: '#1F4FA3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  cardUrgent: {
    borderLeftWidth: 4,
    borderLeftColor: '#D64545',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E3A59',
    flex: 1,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  countBadgeNormal: {
    backgroundColor: 'rgba(31, 79, 163, 0.1)',
  },
  countBadgeUrgent: {
    backgroundColor: 'rgba(214, 69, 69, 0.1)',
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F4FA3',
    marginRight: 4,
  },
  countTextUrgent: {
    color: '#D64545',
  },
  
  // Subtitle
  subtitle: {
    fontSize: 12,
    color: '#6B7A99',
    marginTop: 2,
    marginBottom: 8,
  },
  
  // Divider
  divider: {
    height: 1,
    backgroundColor: 'rgba(31, 79, 163, 0.08)',
    marginVertical: 14,
  },
  
  // Preview Area
  previewArea: {
    minHeight: 40,
  },
  
  // Empty State
  emptyState: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 16,
  },
  
  // Task Preview
  taskPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  taskPreviewWithMargin: {
    marginBottom: 6,
  },
  
  // FIX 3: Priority Circle Indicators (based on calm_priority)
  priorityCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
  },
  priorityCircleFocus: {
    // Priority 1 (Focus) - Blue filled circle
    backgroundColor: '#3B82F6',
  },
  priorityCircleNormal: {
    // Priority 2 (Normal) - Blue outline circle
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  priorityCircleLow: {
    // Priority 3 (Low) - Gray filled circle
    backgroundColor: '#6B7280',
  },
  priorityCircleCompleted: {
    // Completed tasks - Muted gray
    backgroundColor: '#D1D5DB',
  },
  
  taskTitle: {
    fontSize: 14,
    color: '#2E3A59',
    flex: 1,
    lineHeight: 18,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  
  // FIX 2: Task metadata container (holds date + collection status)
  taskMetaContainer: {
    marginLeft: 8,
    alignItems: 'flex-end',
  },
  taskDue: {
    fontSize: 12,
    color: '#6B7A99',
  },
  taskDueWithCollection: {
    // When showing with "No Collection", stack vertically
    marginTop: 2,
  },
  taskNoDate: {
    fontSize: 12,
    color: '#9CA3AF',  // More muted than taskDue
    fontStyle: 'italic',
  },
  taskNoCollection: {
    fontSize: 10,
    color: '#D97706',  // Orange/amber to stand out
    fontWeight: '600',
    fontStyle: 'italic',
  },
  
  // View More Link
  viewMoreButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  viewMoreText: {
    fontSize: 13,
    color: '#1F4FA3',
    fontWeight: '500',
  },
});
