import DatePickerButton from '../components/DatePickerButton';
import SelectionMenu, { SelectionOption } from '../components/SelectionMenu';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { getAllActiveTasks, updateTask, deleteTask, getCollectionByName, getActiveEntriesCountByCollectionId, archiveCollection, unarchiveCollection } from '../db/operations';
import type { TaskWithCollectionName } from '../db/operations';
import { groupTasksByTime } from '../utils/timeClassification';
import { getPriorityStyle } from '../utils/formatting';
import type { TaskFilter } from '../types/filters';
import { applyTaskFilter, getFilterLabel } from '../utils/taskFilters';

interface TaskSection {
  title: string;
  data: TaskWithCollectionName[];
  collapsed?: boolean;
}

export default function TasksScreen({ 
  initialFilter = 'all',
  onFilterChange,
  goToCollections,
  fromOverview = false,
  isActive = true,
}: { 
  initialFilter?: TaskFilter;
  onFilterChange?: (filter: TaskFilter) => void;
  goToCollections: () => void;
  fromOverview?: boolean;
  isActive?: boolean;
}) {
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true); // TICKET 17F.1
  const [refreshing, setRefreshing] = useState(false);
  const [completedCollapsed, setCompletedCollapsed] = useState(true);
  const [showEmptyState, setShowEmptyState] = useState(fromOverview);  // FIX 1: Only show initially if from Overview
  const [priorityMenuVisible, setPriorityMenuVisible] = useState(false);
  const [selectedTaskForPriority, setSelectedTaskForPriority] = useState<TaskWithCollectionName | null>(null);
  
  // TICKET 17A: Centralized filter state
  // Controls which subset of tasks is visible (all, today, overdue, etc.)
  const [activeFilter, setActiveFilter] = useState<TaskFilter>(initialFilter);
  
  // TICKET 17F.1: Scroll preservation
  const scrollViewRef = useRef<SectionList>(null);
  const scrollY = useRef(0);
  
  // TICKET 17A HARDENING: Store all tasks for in-memory filtering
  // Load once from DB, filter locally via useMemo
  const [allTasks, setAllTasks] = useState<TaskWithCollectionName[]>([]);

  // TICKET 17A HARDENING: Memoized filtering
  // Filter happens in-memory, instant switching, no DB re-queries
  // CRITICAL: We filter active tasks only, completed tasks handled separately
  // EXCEPT when filter='completed', then we show only completed
  const visibleActiveTasks = useMemo(() => {
    if (activeFilter === 'completed') {
      // Special case: when filtering to completed, return empty
      // (completed tasks handled separately below)
      return [];
    }
    const activeTasks = allTasks.filter(t => !t.completed);
    return applyTaskFilter(activeTasks, activeFilter);
  }, [allTasks, activeFilter]);

  // TICKET 17A HARDENING: Get completed tasks separately
  // When filter='completed', show them; otherwise available for 'all' filter
  const completedTasks = useMemo(() => {
    return allTasks.filter(t => t.completed);
  }, [allTasks]);

  // TICKET 17A HARDENING: Memoized grouping
  // Only recompute sections when visible tasks change
  const groupedTasks = useMemo(() => {
    const grouped = groupTasksByTime(visibleActiveTasks);
    // Add completed tasks back (they're UI-controlled, not filter-controlled)
    grouped.completed = completedTasks;
    return grouped;
  }, [visibleActiveTasks, completedTasks]);

  // TICKET 17A: Sync activeFilter when initialFilter prop changes (deep linking)
  useEffect(() => {
    setActiveFilter(initialFilter);
  }, [initialFilter]);

  // TICKET 17A BUG FIX: Notify parent when filter changes
  // This ensures filter state persists across tab switches
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange(activeFilter);
    }
  }, [activeFilter, onFilterChange]);

  useEffect(() => {
    loadTasks();
  }, []);
  
  // TICKET 17F.1: Reload when screen becomes active
  const prevActive = useRef(isActive);
  useEffect(() => {
    if (isActive && !prevActive.current) {
      console.log('📱 Tasks became active, reloading data');
      loadTasks();
      
      // TICKET 17F.1: Restore scroll position when returning to screen
      // Use getScrollResponder() - the correct way to scroll a SectionList
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollY.current > 0 && scrollViewRef.current) {
            console.log('📜 Restoring Tasks scroll to:', scrollY.current);
            const responder = scrollViewRef.current.getScrollResponder();
            responder?.scrollTo({ y: scrollY.current, animated: false });
          }
        });
      });
    }
    prevActive.current = isActive;
  }, [isActive]);

  // TICKET 17A HARDENING: Update sections when grouped tasks or collapsed state changes
  useEffect(() => {
    if (groupedTasks) {
      const newSections: TaskSection[] = [];

      // TICKET 17A FINAL: Special handling for 'completed' filter
      // When filtering to completed, show ONLY completed section (hide others)
      if (activeFilter === 'completed') {
        if (groupedTasks.completed.length) {
          newSections.push({
            title: `COMPLETED (${groupedTasks.completed.length})`,
            data: groupedTasks.completed, // Always expanded when filtered
            collapsed: false,
          });
        }
      } else {
        // Normal filtering: show time-based sections
        if (groupedTasks.overdue.length) {
          newSections.push({ title: 'OVERDUE', data: groupedTasks.overdue });
        }
        if (groupedTasks.today.length) {
          newSections.push({ title: 'TODAY', data: groupedTasks.today });
        }
        if (groupedTasks.upcoming.length) {
          newSections.push({ title: 'UPCOMING', data: groupedTasks.upcoming });
        }
        if (groupedTasks.no_date.length) {
          newSections.push({ title: 'NO DATE', data: groupedTasks.no_date });
        }
        
        // TICKET 17A BUG FIX: Only show completed section when filter is 'all'
        // In filtered views (today, overdue, etc.), hide completed tasks
        if (activeFilter === 'all' && groupedTasks.completed.length) {
          newSections.push({
            title: `COMPLETED (${groupedTasks.completed.length})`,
            data: completedCollapsed ? [] : groupedTasks.completed,
            collapsed: completedCollapsed,
          });
        }
      }

      setSections(newSections);
    }
  }, [groupedTasks, completedCollapsed, activeFilter]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      
      // TICKET 17A HARDENING: Load all tasks once, store unfiltered
      // Filtering happens via useMemo, not here
      const tasks = await getAllActiveTasks();
      setAllTasks(tasks);
      
    } catch (error) {
      Alert.alert('Error', 'Unable to load items. Please try again.');
    } finally {
      setLoading(false);
      setInitialLoad(false); // TICKET 17F.1
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const handleToggleTask = async (task: TaskWithCollectionName) => {
    const wasCompleted = task.completed;
    const isUnsorted = task.list_name === 'Unsorted';
    
    // Toggle the task completion
    await updateTask({ 
      id: task.id, 
      completed: !task.completed,
      completed_at: !task.completed ? Date.now() : undefined,
    });
    
    // Special handling for Unsorted tasks
    if (isUnsorted) {
      if (!wasCompleted) {
        // Just completed an Unsorted task
        // Check if any active (not completed) items remain in Unsorted
        const unsorted = await getCollectionByName('Unsorted');
        if (unsorted) {
          const activeCount = await getActiveEntriesCountByCollectionId(unsorted.id);
          if (activeCount === 0) {
            // No active items left - archive Unsorted collection
            console.log('ðŸ“¦ Last Unsorted item completed, archiving list');
            await archiveCollection(unsorted.id);
          }
        }
      } else {
        // Just un-completed an Unsorted task
        // Ensure Unsorted collection is visible
        const unsorted = await getCollectionByName('Unsorted');
        if (unsorted && unsorted.is_archived) {
          console.log('ðŸ“¥ Un-completing Unsorted task, bringing back list');
          await unarchiveCollection(unsorted.id);
        }
      }
    }
    
    await loadTasks();
  };

  const handleTaskLongPress = (task: TaskWithCollectionName) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Change Priority', 'Delete Task'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            setSelectedTaskForPriority(task);
            setPriorityMenuVisible(true);
          } else if (buttonIndex === 2) {
            Alert.alert(
              'Delete Task',
              `Delete "${task.title}"?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    await deleteTask(task.id);
                    await loadTasks();
                  },
                },
              ]
            );
          }
        }
      );
    } else {
      // FIXED: Android - use SelectionMenu for priority, not Alert
      Alert.alert(
        task.title,
        'What would you like to do?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete Task', 
            onPress: () => {
              Alert.alert(
                'Delete Task',
                `Delete "${task.title}"?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      await deleteTask(task.id);
                      await loadTasks();
                    },
                  },
                ]
              );
            },
            style: 'destructive'
          },
          { 
            text: 'Change Priority', 
            onPress: () => {
              // FIXED: Use SelectionMenu instead of nested Alert
              setSelectedTaskForPriority(task);
              setPriorityMenuVisible(true);
            }
          },
        ],
        { cancelable: true }
      );
    }
  };

  const handleSetPriority = async (task: TaskWithCollectionName, priority: number) => {
    try {
      await updateTask({
        id: task.id,
        calm_priority: priority,
      });
      await loadTasks();
    } catch (error) {
      console.error('Failed to update priority:', error);
      Alert.alert('Error', 'Unable to update priority. Please try again.');
    }
  };

  const handleDeleteTask = (task: TaskWithCollectionName) => {
    Alert.alert('Delete Task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTask(task.id);
          await loadTasks();
        },
      },
    ]);
  };

  const toggleCompletedSection = () => {
    setCompletedCollapsed(prev => !prev);
  };

  const renderTask = ({ item }: { item: TaskWithCollectionName }) => {
    const priorityStyle = !item.completed ? getPriorityStyle(item.calm_priority) : {};

    const handleDateChange = async (timestamp: number | null) => {
      await updateTask({
        id: item.id,
        due_date: timestamp,
      });
      await loadTasks();
    };

    return (
      <View style={styles.taskRowContainer}>
        <TouchableOpacity
          style={[styles.taskRow, priorityStyle]}
          onPress={() => handleToggleTask(item)}
          onLongPress={() => handleTaskLongPress(item)}
          delayLongPress={500}
        >
          <View style={[styles.checkbox, item.completed && styles.checkboxChecked]}>
            {item.completed && <Text style={styles.checkmark}>✓</Text>}
          </View>

          <View style={styles.taskContent}>
            <Text
              style={[
                styles.taskTitle,
                item.completed && styles.taskTitleCompleted,
              ]}
            >
              {item.title}
            </Text>

            {item.list_name && (
              <Text style={styles.listLabel}>{item.list_name}</Text>
            )}

            {item.notes && (
              <Text style={styles.taskNotes}>{item.notes}</Text>
            )}
          </View>
        </TouchableOpacity>

        {!item.completed && (
          <View style={[styles.datePickerContainer, priorityStyle]}>
            <DatePickerButton
              value={item.due_date ?? undefined}
              onChange={handleDateChange}
            />
          </View>
        )}
      </View>
    );
  };

  const renderSectionEmpty = (sectionTitle: string) => {
    if (sectionTitle === 'OVERDUE') {
      return (
        <View style={styles.sectionEmptyContainer}>
          <Text style={styles.sectionEmptyText}>Nothing overdue ðŸ‘</Text>
        </View>
      );
    }
    if (sectionTitle === 'TODAY') {
      return (
        <View style={styles.sectionEmptyContainer}>
          <Text style={styles.sectionEmptyText}>Nothing scheduled for today</Text>
        </View>
      );
    }
    if (sectionTitle === 'UPCOMING') {
      return (
        <View style={styles.sectionEmptyContainer}>
          <Text style={styles.sectionEmptyText}>No upcoming items</Text>
        </View>
      );
    }
    if (sectionTitle.startsWith('COMPLETED')) {
      return (
        <View style={styles.sectionEmptyContainer}>
          <Text style={styles.sectionEmptyText}>Nothing completed yet</Text>
        </View>
      );
    }
    return null;
  };

  if (loading && initialLoad) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  // FIX 2: Check if truly empty (no tasks at all)
  if (!sections.length) {
    const hasAnyTasks = allTasks.length > 0;
    
    if (!hasAnyTasks) {
      // FIX 2: No tasks exist anywhere - ALWAYS show this message
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptyText}>
            Create a collection and add items to get started.
          </Text>

          <TouchableOpacity onPress={goToCollections} style={styles.goToListsButton}>
            <Text style={styles.goToListsText}>Go to Collections</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    // FIX 3: Filter has 0 items but tasks exist - auto-clear filter
    if (!showEmptyState) {
      // User navigated here not from Overview (e.g., tab switch)
      // Clear filter and show all tasks
      if (activeFilter !== 'all') {
        setActiveFilter('all');
        setShowEmptyState(false);
      }
      // Return null briefly while filter clears
      return null;
    }
    
    // FIX 1 & 7: Filtered empty state (only when from Overview)
    // Tasks exist but filter is empty - show category message
    const getEmptyMessage = () => {
      switch (activeFilter) {
        case 'today':
          return {
            title: 'Nothing scheduled for today',
            subtitle: 'You have tasks in other categories.'
          };
        case 'overdue':
          return {
            title: 'All clear!',
            subtitle: 'No overdue tasks. Great job staying on top of things!'
          };
        case 'upcoming':
          return {
            title: 'No upcoming tasks',
            subtitle: 'You have tasks in other categories.'
          };
        case 'no-date':
          return {
            title: 'All current tasks are organized',
            subtitle: 'Every task has a due date assigned.'
          };
        case 'completed':
          return {
            title: 'No completed tasks yet',
            subtitle: 'Complete some tasks to see them here.'
          };
        default:
          return {
            title: 'No tasks in this view',
            subtitle: 'Try a different filter or create new tasks.'
          };
      }
    };
    
    const message = getEmptyMessage();
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>{message.title}</Text>
        <Text style={styles.emptyText}>{message.subtitle}</Text>

        <TouchableOpacity 
          onPress={() => {
            setActiveFilter('all');
            setShowEmptyState(false);  // FIX 1: Don't show empty state again
          }}
          style={styles.goToListsButton}
        >
          <Text style={styles.goToListsText}>View All Tasks</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={goToCollections} 
          style={[styles.goToListsButton, styles.secondaryButton]}
        >
          <Text style={[styles.goToListsText, styles.secondaryButtonText]}>
            Go to Collections
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* TICKET 17A: Filter indicator - show when not on 'all' */}
      {activeFilter !== 'all' && (
        <View style={styles.filterBanner}>
          <View style={styles.filterBannerContent}>
            <Text style={styles.filterBannerText}>
              Filtered: {getFilterLabel(activeFilter)}
            </Text>
            <TouchableOpacity 
              style={styles.clearFilterButton}
              onPress={() => setActiveFilter('all')}
              activeOpacity={0.7}
            >
              <Text style={styles.clearFilterText}>Show All</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <SectionList
        ref={scrollViewRef}
        sections={sections}
        renderItem={renderTask}
        onScroll={(e) => {
          scrollY.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        renderSectionHeader={({ section }) => {
          const isCompleted = section.title.startsWith('COMPLETED');
          const isEmpty = section.data.length === 0 && !section.collapsed;
          
          return (
            <>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={isCompleted ? toggleCompletedSection : undefined}
              >
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
                {isCompleted && (
                  <Text style={styles.collapseIndicator}>
                    {completedCollapsed ? '▼' : '▲'}
                  </Text>
                )}
              </TouchableOpacity>
              {isEmpty && renderSectionEmpty(section.title)}
            </>
          );
        }}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.taskList}
        stickySectionHeadersEnabled={false}
        />
        <SelectionMenu
          visible={priorityMenuVisible}
          onClose={() => {
            setPriorityMenuVisible(false);
            setSelectedTaskForPriority(null);
          }}
          title="Set Priority"
          subtitle="Choose priority level"
          options={[
            {
              label: 'Focus',
              value: 1,
              color: '#3b82f6',
              description: 'High importance',
            },
            {
              label: 'Normal',
              value: 2,
              color: '#9ca3af',
              description: 'Standard priority',
            },
            {
              label: 'Low key',
              value: 3,
              color: '#6b7280',
              description: 'Low priority',
            },
          ]}
          selectedValue={selectedTaskForPriority?.calm_priority ?? 2}
          onSelect={(value) => {
            if (selectedTaskForPriority) {
              handleSetPriority(selectedTaskForPriority, value);
            }
          }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#666' },
  
  // TICKET 17A: Filter indicator banner
  filterBanner: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2563eb',
  },
  filterBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  clearFilterButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },
  
  taskList: { padding: 16, paddingBottom: 100 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionHeaderText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  collapseIndicator: { fontSize: 10, color: '#6b7280' },
  sectionEmptyContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionEmptyText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  taskRowContainer: { marginBottom: 12 },
  taskRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    marginTop: -8,
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
  checkboxChecked: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 16, color: '#1a1a1a' },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  listLabel: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  taskNotes: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8, color: '#1a1a1a' },
  emptyText: { color: '#6b7280', marginBottom: 16, textAlign: 'center' },
  goToListsButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,  // FIX 7: Spacing between buttons
  },
  goToListsText: { color: '#fff', fontWeight: '600' },
  
  // FIX 7: Secondary button styles
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  secondaryButtonText: {
    color: '#3b82f6',
  },
});