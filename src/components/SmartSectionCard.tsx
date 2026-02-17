/**
 * SmartSectionCard Component
 * 
 * TICKET 17B: Tetradio Notebook-Style Overview Cards
 * TICKET 17C: Design System Hardening + Accessibility
 * TICKET 17D: Interaction & Motion Polish
 * 
 * A reusable card component that displays a section of tasks with:
 * - Header with title and count badge
 * - Preview of 0-3 tasks
 * - Empty states
 * - "View More" link for 4+ tasks
 * - Notebook-inspired visual design
 * - WCAG AA accessible
 * - Subtle press animations (17D)
 * 
 * Design inspired by classic blue A4 tetradio notebooks with
 * clean lines, subtle shadows, and calm color palette.
 */

import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import type { TaskFilter } from '../types/filters';
import { colors, spacing, typography, elevation, borderRadius, sizes, opacity } from '../theme/tokens';
import { durations, scale as scaleValues, patterns } from '../animations/motion';

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

/**
 * TICKET 17C: Generate descriptive accessibility label for card
 * 
 * Provides context for screen readers:
 * - "View 3 overdue tasks"
 * - "Overdue tasks section, no tasks"
 * 
 * Decision: Option A (descriptive) chosen for better UX
 */
function getAccessibilityLabel(title: string, count: number, filter: TaskFilter): string {
  // Remove emoji from title for cleaner voice output
  const cleanTitle = title.replace(/[^\w\s]/g, '').trim();
  
  if (count === 0) {
    return `${cleanTitle} section, no tasks`;
  }
  
  const taskWord = count === 1 ? 'task' : 'tasks';
  return `View ${count} ${cleanTitle.toLowerCase()} ${taskWord}`;
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
  
  // TICKET 17D: Press animation (scale + shadow)
  const scaleAnim = useRef(new Animated.Value(scaleValues.rest)).current;
  const viewMoreOpacity = useRef(new Animated.Value(patterns.viewMoreFade.opacityStart)).current;
  const badgeScale = useRef(new Animated.Value(scaleValues.rest)).current;
  const [reduceMotion, setReduceMotion] = React.useState(false);
  const [prevCount, setPrevCount] = React.useState(count);
  
  // TICKET 17D: Check for reduced motion preference + LISTEN for changes
  useEffect(() => {
    // Initial check
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      setReduceMotion(enabled);
      
      // TICKET 17D: Subtle View More fade-in using motion constants
      if (!enabled && hasMore) {
        Animated.timing(viewMoreOpacity, {
          toValue: patterns.viewMoreFade.opacityEnd,
          duration: patterns.viewMoreFade.duration,
          delay: patterns.viewMoreFade.delay,
          useNativeDriver: true,
        }).start();
      }
    });
    
    // PRODUCTION FIX: Listen for runtime changes
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );
    
    return () => subscription?.remove();
  }, [hasMore]);
  
  // TICKET 17D: Badge count animation - pulse when value changes
  // Using motion constants for consistency
  useEffect(() => {
    if (count !== prevCount && !reduceMotion && prevCount !== count) {
      setPrevCount(count);
      
      // Quick scale pulse using motion constants
      Animated.sequence([
        Animated.timing(badgeScale, {
          toValue: patterns.badgePulse.scale,
          duration: patterns.badgePulse.duration,
          useNativeDriver: true,
        }),
        Animated.timing(badgeScale, {
          toValue: scaleValues.rest,
          duration: patterns.badgePulse.duration,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [count, prevCount, reduceMotion]);
  
  // TICKET 17D: Press handlers using motion constants
  const handlePressIn = () => {
    if (reduceMotion) return;
    
    Animated.timing(scaleAnim, {
      toValue: scaleValues.press,
      duration: patterns.cardPress.durationIn,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    if (reduceMotion) return;
    
    Animated.timing(scaleAnim, {
      toValue: scaleValues.rest,
      duration: patterns.cardPress.durationOut,
      useNativeDriver: true,
    }).start();
  };
  
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.card,
          isUrgent && styles.cardUrgent,
        ]}
        onPress={() => onPress(filter)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={opacity.touchActive}
        accessibilityRole="button"
        accessibilityLabel={getAccessibilityLabel(title, count, filter)}
      >
      {/* Header Row */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {/* TICKET 17D: Badge with pulse animation on count change */}
        <Animated.View style={{ transform: [{ scale: reduceMotion ? 1 : badgeScale }] }}>
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
        </Animated.View>
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
            
            {/* View More Link - TICKET 17D: Subtle fade animation */}
            {hasMore && (
              <Animated.View style={{ opacity: reduceMotion ? 1 : viewMoreOpacity }}>
                <TouchableOpacity 
                  style={styles.viewMoreButton}
                  onPress={() => onPress(filter)}
                  activeOpacity={opacity.touchActive}
                  accessibilityRole="button"
                  accessibilityLabel={`View all ${count} ${title.replace(/[^\w\s]/g, '').trim().toLowerCase()}`}
                >
                  <Text style={styles.viewMoreText}>View more →</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
    </Animated.View>
  );
}

// TICKET 17B: Tetradio Notebook Styles
// TICKET 17C: ALL values from design tokens (no hardcoded colors/spacing)
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.card,
    padding: spacing.cardPadding,
    marginBottom: spacing.cardGap,
    marginHorizontal: spacing.sectionMarginHorizontal,
    ...elevation.card,
  },
  cardUrgent: {
    borderLeftWidth: 4,
    borderLeftColor: colors.accentUrgent,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    ...typography.cardTitle,
    color: colors.textPrimary,
    flex: 1,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.badge,
    marginLeft: spacing.metadataMarginLeft,
  },
  countBadgeNormal: {
    backgroundColor: colors.badgeNormalBackground,
  },
  countBadgeUrgent: {
    backgroundColor: colors.badgeUrgentBackground,
  },
  countText: {
    ...typography.badge,
    color: colors.accentPrimary,
    marginRight: 4,
  },
  countTextUrgent: {
    color: colors.accentUrgent,
  },
  
  // Subtitle
  subtitle: {
    ...typography.cardSubtitle,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 8,
  },
  
  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.dividerVertical,
  },
  
  // Preview Area
  previewArea: {
    minHeight: 40,
  },
  
  // Empty State
  emptyState: {
    ...typography.empty,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 16,
  },
  
  // Task Preview
  taskPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.taskPreviewPadding,
  },
  taskPreviewWithMargin: {
    marginBottom: spacing.taskPreviewGap,
  },
  
  // TICKET 17C: Priority Circle Indicators (from tokens)
  priorityCircle: {
    ...sizes.priorityCircle,
    borderRadius: borderRadius.circle,
    marginRight: spacing.priorityCircleMargin,
  },
  priorityCircleFocus: {
    backgroundColor: colors.priorityFocus,
  },
  priorityCircleNormal: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.priorityNormalBorder,
  },
  priorityCircleLow: {
    backgroundColor: colors.priorityLow,
  },
  priorityCircleCompleted: {
    backgroundColor: colors.priorityCompleted,
  },
  
  taskTitle: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  
  // TICKET 17C: Task metadata container
  taskMetaContainer: {
    marginLeft: spacing.metadataMarginLeft,
    alignItems: 'flex-end',
  },
  taskDue: {
    ...typography.meta,
    color: colors.textSecondary,
  },
  taskDueWithCollection: {
    marginTop: 2,
  },
  taskNoDate: {
    ...typography.meta,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  taskNoCollection: {
    // TICKET 17C.1: Subtle metadata, not alert
    // This is structural information, not urgent warning
    ...typography.meta,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  
  // TICKET 17C: View More Link with 44px touch target
  viewMoreButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    minHeight: spacing.minTouchTarget,
    paddingVertical: spacing.touchTargetPadding,
    justifyContent: 'center',
  },
  viewMoreText: {
    ...typography.link,
    color: colors.accentPrimary,
  },
});
