import DatePickerButton from '../components/DatePickerButton';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { getAllLists, createList, deleteList } from '../db/operations';
import { getTasksByListId, createTask, deleteTask, updateTask } from '../db/operations';
import type { List, Task } from '../types/models';

export default function ListsScreen() {
  // Lists state
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Selected list & tasks state
  const [selectedList, setSelectedList] = useState<List | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState<number | undefined>(undefined);

  // Inline editing state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  const editInputRef = useRef<TextInput>(null);

  // Refreshing state
const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLists();
  }, []);

  useEffect(() => {
    if (selectedList) {
      loadTasks(selectedList.id);
    }
  }, [selectedList]);

  // ========== LISTS OPERATIONS ==========

  const loadLists = async () => {
    try {
      setLoading(true);
      const allLists = await getAllLists();
      const activeLists = allLists.filter(list => !list.is_archived);
      setLists(activeLists);
    } catch (error) {
      console.error('Failed to load lists:', error);
      Alert.alert('Error', 'Failed to load lists');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async () => {
    const trimmedName = newListName.trim();

    if (!trimmedName) {
      Alert.alert('Error', 'List name cannot be empty');
      return;
    }

    try {
      await createList({
        name: trimmedName,
        sort_order: lists.length,
        is_pinned: false,
        is_archived: false,
      });

      setNewListName('');
      setModalVisible(false);
      await loadLists();
    } catch (error) {
      console.error('Failed to create list:', error);
      Alert.alert('Error', 'Failed to create list');
    }
  };

  const handleDeleteList = (list: List) => {
    Alert.alert(
      'Delete List',
      `Delete "${list.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteList(list.id);
              if (selectedList?.id === list.id) {
                setSelectedList(null);
              }
              await loadLists();
            } catch (error) {
              console.error('Failed to delete list:', error);
              Alert.alert('Error', 'Failed to delete list');
            }
          },
        },
      ]
    );
  };

  const handleSelectList = (list: List) => {
    setSelectedList(list);
  };

  const handleBackToLists = () => {
    setSelectedList(null);
    setTasks([]);
    setEditingTaskId(null);
  };

  // ========== TASKS OPERATIONS ==========

  const loadTasks = async (listId: string) => {
    try {
      setLoadingTasks(true);
      const listTasks = await getTasksByListId(listId);
      setTasks(listTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      Alert.alert('Error', 'Failed to load tasks');
    } finally {
      setLoadingTasks(false);
    }
  };

const handleRefreshTasks = async () => {
  if (!selectedList) return;
  
  setRefreshing(true);
  await loadTasks(selectedList.id);
  setRefreshing(false);
};

const handleCreateTask = async () => {
  const trimmedTitle = newTaskTitle.trim();

  if (!trimmedTitle) {
    Alert.alert('Error', 'Task title cannot be empty');
    return;
  }

  if (!selectedList) {
    Alert.alert('Error', 'No list selected');
    return;
  }

  try {
    await createTask({
      title: trimmedTitle,
      list_id: selectedList.id,
      due_date: newTaskDueDate,
    });

    setNewTaskTitle('');
    setNewTaskDueDate(undefined);
    setTaskModalVisible(false);
    await loadTasks(selectedList.id);
  } catch (error) {
    console.error('Failed to create task:', error);
    Alert.alert('Error', 'Failed to create task');
  }
};

  const handleToggleTask = async (task: Task) => {
    // Prevent toggle while editing
    if (editingTaskId === task.id) {
      return;
    }

    try {
      await updateTask({
        id: task.id,
        completed: !task.completed,
        completed_at: !task.completed ? Date.now() : undefined,
      });
      if (selectedList) {
        await loadTasks(selectedList.id);
      }
    } catch (error) {
      console.error('Failed to toggle task:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const handleDeleteTask = (task: Task) => {
    Alert.alert(
      'Delete Task',
      `Delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTask(task.id);
              if (selectedList) {
                await loadTasks(selectedList.id);
              }
            } catch (error) {
              console.error('Failed to delete task:', error);
              Alert.alert('Error', 'Failed to delete task');
            }
          },
        },
      ]
    );
  };

  // ========== INLINE EDITING ==========

  const handleStartEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskTitle(task.title);
    // Focus happens via autoFocus prop on TextInput
  };

const handleSaveEditTask = async (taskId: string) => {
  const trimmedTitle = editingTaskTitle.trim();

  if (!trimmedTitle) {
    Alert.alert('Error', 'Task title cannot be empty', [
      {
        text: 'OK',
        onPress: () => {
          // Re-focus the input after alert dismissal
          setTimeout(() => {
            editInputRef.current?.focus();
          }, 100);
        },
      },
    ]);
    return;
  }

  try {
    await updateTask({
      id: taskId,
      title: trimmedTitle,
    });

    setEditingTaskId(null);
    setEditingTaskTitle('');

    if (selectedList) {
      await loadTasks(selectedList.id);
    }
  } catch (error) {
    console.error('Failed to update task:', error);
    Alert.alert('Error', 'Failed to update task');
  }
};

  const handleCancelEditTask = () => {
    setEditingTaskId(null);
    setEditingTaskTitle('');
  };

  // ========== RENDER: LISTS OVERVIEW ==========

  const renderList = ({ item }: { item: List }) => (
    <TouchableOpacity
      style={styles.listRow}
      onPress={() => handleSelectList(item)}
      onLongPress={() => handleDeleteList(item)}
      activeOpacity={0.7}
    >
      <View style={styles.listIcon}>
        <Text style={styles.listIconText}>{item.icon || '📋'}</Text>
      </View>
      <View style={styles.listContent}>
        <Text style={styles.listName}>{item.name}</Text>
        <Text style={styles.listSubtext}>Tap to view • Long-press to delete</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyLists = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No lists yet</Text>
      <Text style={styles.emptySubtext}>
        Lists help you organize related tasks.{'\n'}
        Create a list like "Groceries" or "Work" to get started.
      </Text>
    </View>
  );

  // ========== RENDER: LIST DETAIL WITH TASKS ==========

const renderTask = ({ item }: { item: Task }) => {
  const isEditing = editingTaskId === item.id;

const handleDateChange = async (timestamp: number | null) => {
  try {
    await updateTask({
      id: item.id,
      // IMPORTANT: allow NULL to pass through so date can be removed
      due_date: timestamp,
    });

    if (selectedList) {
      await loadTasks(selectedList.id);
    }
  } catch (error) {
    console.error('Failed to update due date:', error);
    Alert.alert('Error', 'Failed to update due date');
  }
};


  return (
    <View style={styles.taskRow}>
      {/* Checkbox */}
      <TouchableOpacity
        style={[styles.checkbox, item.completed && styles.checkboxChecked]}
        onPress={() => {
          if (!isEditing) {
            handleToggleTask(item);
          }
        }}
        activeOpacity={0.7}
      >
        {item.completed && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>

      {/* Task content - editable or static */}
      <View style={styles.taskContent}>
        {isEditing ? (
          <TextInput
            ref={editInputRef}
            style={styles.taskEditInput}
            value={editingTaskTitle}
            onChangeText={setEditingTaskTitle}
            onBlur={() => handleSaveEditTask(item.id)}
            onSubmitEditing={() => handleSaveEditTask(item.id)}
            autoFocus
            returnKeyType="done"
          />
        ) : (
          <TouchableOpacity
            onPress={() => handleStartEditTask(item)}
            onLongPress={() => handleDeleteTask(item)}
            activeOpacity={0.7}
            delayLongPress={500}
          >
            <Text style={[styles.taskTitle, item.completed && styles.taskTitleCompleted]}>
              {item.title}
            </Text>
            {item.notes && <Text style={styles.taskNotes}>{item.notes}</Text>}
          </TouchableOpacity>
        )}

        {/* Date picker - disabled while editing title */}
        {!item.completed && (
          <DatePickerButton
            value={item.due_date}
            onChange={handleDateChange}
            disabled={isEditing}
          />
        )}
      </View>
    </View>
  );
};

  const renderEmptyTasks = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No tasks yet</Text>
      <Text style={styles.emptySubtext}>
        Tasks are things you need to do.{'\n'}
        Add items like "Buy milk" or "Call dentist" to this list.
      </Text>
    </View>
  );

  const renderListDetail = () => (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.detailHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToLists}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.detailHeaderContent}>
          <Text style={styles.detailHeaderIcon}>{selectedList?.icon || '📋'}</Text>
          <Text style={styles.detailHeaderTitle}>{selectedList?.name}</Text>
        </View>
      </View>

      {/* Tasks */}
      {loadingTasks ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          renderItem={renderTask}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.taskList}
          ListEmptyComponent={renderEmptyTasks}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefreshTasks}
              tintColor="#3b82f6"
              colors={['#3b82f6']}
            />
          }
        />
      )}

      {/* FAB for adding tasks */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setTaskModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );

  // ========== MAIN RENDER ==========

  if (selectedList) {
    return (
      <>
        {renderListDetail()}

        {/* Task Creation Modal */}
        <Modal
          visible={taskModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setTaskModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => {
                setTaskModalVisible(false);
                setNewTaskTitle('');
              }}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={e => e.stopPropagation()}
              >
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>New Task</Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Task title"
                    value={newTaskTitle}
                    onChangeText={setNewTaskTitle}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleCreateTask}
                  />

  <DatePickerButton
    value={newTaskDueDate}
    onChange={(timestamp) => setNewTaskDueDate(timestamp ?? undefined)}
  />

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.button, styles.buttonCancel]}
                      onPress={() => {
                        setTaskModalVisible(false);
                        setNewTaskTitle('');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.buttonCancelText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.button,
                        styles.buttonCreate,
                        !newTaskTitle.trim() && styles.buttonDisabled,
                      ]}
                      onPress={handleCreateTask}
                      activeOpacity={0.7}
                      disabled={!newTaskTitle.trim()}
                    >
                      <Text style={styles.buttonCreateText}>Create</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      </>
    );
  }

  // Lists overview (default view)
  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading lists...</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={lists}
            renderItem={renderList}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={renderEmptyLists}
          />

          <TouchableOpacity
            style={styles.fab}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        </>
      )}

      {/* List Creation Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              setModalVisible(false);
              setNewListName('');
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={e => e.stopPropagation()}
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>New List</Text>

                <TextInput
                  style={styles.input}
                  placeholder="List name"
                  value={newListName}
                  onChangeText={setNewListName}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleCreateList}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.button, styles.buttonCancel]}
                    onPress={() => {
                      setModalVisible(false);
                      setNewListName('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.buttonCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.buttonCreate,
                      !newListName.trim() && styles.buttonDisabled,
                    ]}
                    onPress={handleCreateList}
                    activeOpacity={0.7}
                    disabled={!newListName.trim()}
                  >
                    <Text style={styles.buttonCreateText}>Create</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },

  // ========== LISTS OVERVIEW ==========
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  listRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  listIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  listIconText: {
    fontSize: 24,
  },
  listContent: {
    flex: 1,
  },
  listName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  listSubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },

  // ========== LIST DETAIL HEADER ==========
  detailHeader: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  detailHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailHeaderIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  detailHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },

  // ========== TASKS ==========
  taskList: {
    padding: 16,
    paddingBottom: 100,
  },
  taskRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 64,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  taskNotes: {
    fontSize: 14,
    color: '#6b7280',
  },
  taskEditInput: {
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 6,
    padding: 8,
    backgroundColor: '#fff',
  },

  // ========== EMPTY STATES ==========
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    color: '#9ca3af',
    fontWeight: '600',
    marginBottom: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },

  // ========== FAB ==========
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
  },

  // ========== MODALS ==========
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    minHeight: 48,
    backgroundColor: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonCancel: {
    backgroundColor: '#f3f4f6',
  },
  buttonCancelText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonCreate: {
    backgroundColor: '#3b82f6',
  },
  buttonCreateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});