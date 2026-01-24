import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { getAllActiveTasks } from '../db/operations';
import type { TaskWithListName } from '../db/operations';
import { groupTasksByTime } from '../utils/timeClassification';

export default function OverviewScreen({
  onViewTasks,
}: {
  onViewTasks: () => void;
}) {
  const [tasks, setTasks] = useState<TaskWithListName[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const allTasks = await getAllActiveTasks();
      setTasks(allTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const grouped = groupTasksByTime(tasks);

  const renderTaskPreview = (task: TaskWithListName) => (
    <View key={task.id} style={styles.taskPreview}>
      <Text style={styles.taskPreviewTitle} numberOfLines={1}>
        • {task.title}
      </Text>
      {task.list_name && (
        <Text style={styles.taskPreviewList}>{task.list_name}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading overview...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#3b82f6"
          colors={['#3b82f6']}
        />
      }
    >
      <Text style={styles.pageTitle}>Overview</Text>
      <Text style={styles.pageSubtitle}>Your tasks at a glance</Text>

      {/* Overdue */}
      {grouped.overdue.length > 0 && (
        <View style={[styles.section, styles.sectionOverdue]}>
          <Text style={styles.sectionTitle}>
            ⚠️ Overdue ({grouped.overdue.length})
          </Text>
          {grouped.overdue.slice(0, 3).map(renderTaskPreview)}
          {grouped.overdue.length > 3 && (
            <TouchableOpacity style={styles.viewAllButton} onPress={onViewTasks}>
              <Text style={styles.viewAllText}>
                View all {grouped.overdue.length} overdue →
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Today */}
      {grouped.today.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Today ({grouped.today.length})
          </Text>
          {grouped.today.slice(0, 5).map(renderTaskPreview)}
          {grouped.today.length > 5 && (
            <TouchableOpacity style={styles.viewAllButton} onPress={onViewTasks}>
              <Text style={styles.viewAllText}>
                View all {grouped.today.length} tasks →
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today</Text>
          <Text style={styles.emptyMessage}>Nothing due today</Text>
        </View>
      )}

      {/* Upcoming */}
      {grouped.upcoming.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Upcoming ({grouped.upcoming.length})
          </Text>
          {grouped.upcoming.slice(0, 3).map(renderTaskPreview)}
          {grouped.upcoming.length > 3 && (
            <TouchableOpacity style={styles.viewAllButton} onPress={onViewTasks}>
              <Text style={styles.viewAllText}>View all upcoming →</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Hints */}
      {grouped.no_date.length > 0 && (
        <View style={styles.hintSection}>
          <Text style={styles.hintText}>
            📋 {grouped.no_date.length} task
            {grouped.no_date.length === 1 ? '' : 's'} without a due date
          </Text>
        </View>
      )}

      {grouped.completed.length > 0 && (
        <View style={styles.hintSection}>
          <Text style={styles.hintText}>
            ✓ {grouped.completed.length} completed task
            {grouped.completed.length === 1 ? '' : 's'}
          </Text>
        </View>
      )}

      {tasks.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No tasks yet</Text>
          <Text style={styles.emptySubtext}>
            Create lists and add tasks to see your overview
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#666' },
  pageTitle: { fontSize: 32, fontWeight: 'bold', marginBottom: 4 },
  pageSubtitle: { fontSize: 16, color: '#6b7280', marginBottom: 24 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionOverdue: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  taskPreview: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  taskPreviewTitle: { fontSize: 15 },
  taskPreviewList: { fontSize: 12, color: '#9ca3af' },
  viewAllButton: { marginTop: 12 },
  viewAllText: { color: '#3b82f6', fontWeight: '600' },
  emptyMessage: { fontStyle: 'italic', color: '#9ca3af' },
  hintSection: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  hintText: { fontSize: 14, color: '#6b7280' },
  emptyContainer: { alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
});
