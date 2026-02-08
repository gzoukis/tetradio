import DatePickerButton from '../components/DatePickerButton';
import SelectionMenu, { SelectionOption } from '../components/SelectionMenu';
import React, { useState, useEffect } from 'react';
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
import { getAllActiveTasks, updateTask, deleteTask, getListByName, getActiveEntriesCountByListId, archiveList, unarchiveList } from '../db/operations';
import type { TaskWithListName } from '../db/operations';
import { groupTasksByTime } from '../utils/timeClassification';
import { getPriorityStyle } from '../utils/formatting';

interface TaskSection {
  title: string;
  data: TaskWithListName[];
  collapsed?: boolean;
}

export default function TasksScreen({ goToLists }: { goToLists: () => void }) {
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completedCollapsed, setCompletedCollapsed] = useState(true);
  const [priorityMenuVisible, setPriorityMenuVisible] = useState(false);
  const [selectedTaskForPriority, setSelectedTaskForPriority] = useState<TaskWithListName | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    // Reload tasks when completedCollapsed changes to update section data
    if (!loading) {
      loadTasks();
    }
  }, [completedCollapsed]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const allTasks = await getAllActiveTasks();
      const grouped = groupTasksByTime(allTasks);

      const newSections: TaskSection[] = [];

      if (grouped.overdue.length) {
        newSections.push({ title: 'OVERDUE', data: grouped.overdue });
      }
      if (grouped.today.length) {
        newSections.push({ title: 'TODAY', data: grouped.today });
      }
      if (grouped.upcoming.length) {
        newSections.push({ title: 'UPCOMING', data: grouped.upcoming });
      }
      if (grouped.no_date.length) {
        newSections.push({ title: 'NO DATE', data: grouped.no_date });
      }
      if (grouped.completed.length) {
        newSections.push({
          title: `COMPLETED (${grouped.completed.length})`,
          data: completedCollapsed ? [] : grouped.completed,
          collapsed: completedCollapsed,
        });
      }

      setSections(newSections);
    } catch (error) {
      Alert.alert('Error', 'Unable to load items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const handleToggleTask = async (task: TaskWithListName) => {
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
        const unsorted = await getListByName('Unsorted');
        if (unsorted) {
          const activeCount = await getActiveEntriesCountByListId(unsorted.id);
          if (activeCount === 0) {
            // No active items left - archive Unsorted list
            console.log('ðŸ“¦ Last Unsorted item completed, archiving list');
            await archiveList(unsorted.id);
          }
        }
      } else {
        // Just un-completed an Unsorted task
        // Ensure Unsorted list is visible
        const unsorted = await getListByName('Unsorted');
        if (unsorted && unsorted.is_archived) {
          console.log('ðŸ“¥ Un-completing Unsorted task, bringing back list');
          await unarchiveList(unsorted.id);
        }
      }
    }
    
    await loadTasks();
  };

  const handleTaskLongPress = (task: TaskWithListName) => {
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
              Alert.alert(
                'Set Priority',
                'Choose priority level',
                [
                  { text: '🔵 Focus', onPress: () => handleSetPriority(task, 1) },
                  { text: '⚪ Normal', onPress: () => handleSetPriority(task, 2) },
                  { text: '⚫ Low key', onPress: () => handleSetPriority(task, 3) },
                ],
                { cancelable: true }
              );
            }
          },
        ],
        { cancelable: true }
      );
    }
  };

  const handleSetPriority = async (task: TaskWithListName, priority: number) => {
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

  const handleDeleteTask = (task: TaskWithListName) => {
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

  const renderTask = ({ item }: { item: TaskWithListName }) => {
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (!sections.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Nothing here yet</Text>
        <Text style={styles.emptyText}>
          Create a list and add items to get started.
        </Text>

        <TouchableOpacity onPress={goToLists} style={styles.goToListsButton}>
          <Text style={styles.goToListsText}>Go to Lists</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        renderItem={renderTask}
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

        {/* Priority Selection Menu */}
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
  },
  goToListsText: { color: '#fff', fontWeight: '600' },
});