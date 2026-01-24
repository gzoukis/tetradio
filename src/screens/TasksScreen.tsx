import DatePickerButton from '../components/DatePickerButton';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { getAllActiveTasks, updateTask, deleteTask } from '../db/operations';
import type { TaskWithListName } from '../db/operations';
import { groupTasksByTime } from '../utils/timeClassification';

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

  useEffect(() => {
    loadTasks();
  }, []);

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
      Alert.alert('Error', 'Failed to load tasks');
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
    await updateTask({ id: task.id, completed: !task.completed });
    await loadTasks();
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
    loadTasks();
  };

  const renderTask = ({ item }: { item: TaskWithListName }) => {
    const handleDateChange = async (timestamp: number | null) => {
      await updateTask({
        id: item.id,
        due_date: timestamp, // allow null
      });
      await loadTasks();
    };

    return (
      <View style={styles.taskRowContainer}>
        <TouchableOpacity
          style={styles.taskRow}
          onPress={() => handleToggleTask(item)}
          onLongPress={() => handleDeleteTask(item)}
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
          <View style={styles.datePickerContainer}>
            <DatePickerButton
              value={item.due_date ?? undefined}
              onChange={handleDateChange}
            />
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading tasks…</Text>
      </View>
    );
  }

  if (!sections.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No tasks yet</Text>
        <Text style={styles.emptyText}>
          Tasks are created inside lists.
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
          return (
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
          );
        }}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.taskList}
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  taskList: { padding: 16, paddingBottom: 100 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionHeaderText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  collapseIndicator: { fontSize: 10, color: '#6b7280' },
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
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#3b82f6' },
  checkmark: { color: '#fff' },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 16 },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  listLabel: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  taskNotes: { color: '#6b7280' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyText: { color: '#6b7280', marginBottom: 16, textAlign: 'center' },
  emptyButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyButtonText: { color: '#fff', fontWeight: '600' },
});
