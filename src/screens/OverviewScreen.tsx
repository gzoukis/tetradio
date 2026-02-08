import DatePickerButton from '../components/DatePickerButton';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { getAllActiveTasks, getAllLists, createTask, createNote, getOrCreateUnsortedList, createList } from '../db/operations';
import { createChecklistWithItems } from '../db/operations';
import type { TaskWithListName } from '../db/operations';
import type { List } from '../types/models';
import { groupTasksByTime } from '../utils/timeClassification';
import { getPriorityLabel } from '../utils/formatting';

type EntryType = 'task' | 'note' | 'checklist';
type QuickCreateMode = 'entry' | 'new-list';

export default function OverviewScreen({
  onViewTasks,
  goToLists,
}: {
  onViewTasks: () => void;
  goToLists: (listId?: string) => void;
}) {
  const [tasks, setTasks] = useState<TaskWithListName[]>([]);
  const [pinnedLists, setPinnedLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Quick Create Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [quickCreateMode, setQuickCreateMode] = useState<QuickCreateMode>('entry');
  const [entryType, setEntryType] = useState<EntryType>('task');
  const [entryTitle, setEntryTitle] = useState('');
  const [entryBody, setEntryBody] = useState(''); // For notes
  const [selectedList, setSelectedList] = useState<List | null>(null);
  const [taskDueDate, setTaskDueDate] = useState<number | undefined>(undefined);
  const [taskPriority, setTaskPriority] = useState<number>(2);
  const [checklistItems, setChecklistItems] = useState<string[]>(['', '', '']);
  
  // Lists for picker
  const [allLists, setAllLists] = useState<List[]>([]);
  const [listPickerVisible, setListPickerVisible] = useState(false);
  
  // New List form (inline)
  const [newListName, setNewListName] = useState('');

  useEffect(() => {
    loadTasks();
    loadLists();
    loadPinnedLists();
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
  
  const loadLists = async () => {
    try {
      const lists = await getAllLists();
      console.log(`�‹ Loaded ${lists.length} total lists from database`);
      
      // Show ONLY user lists in the picker (not system lists like Unsorted)
      // Unsorted should only appear in Lists screen, not in the picker
      const userLists = lists.filter(l => !l.is_archived && !l.is_system);
      
      console.log(`✅ User lists for picker: ${userLists.length}`);
      userLists.forEach(list => {
        console.log(`  - ${list.icon} ${list.name}`);
      });
      
      setAllLists(userLists);
    } catch (error) {
      console.error('âŒ Failed to load lists:', error);
    }
  };

  const loadPinnedLists = async () => {
    try {
      const lists = await getAllLists();
      const pinned = lists.filter(l => l.is_pinned && !l.is_system && !l.is_archived)
        .sort((a, b) => a.sort_order - b.sort_order);
      setPinnedLists(pinned);
    } catch (error) {
      console.error('Failed to load pinned lists:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    await loadLists();
    await loadPinnedLists();
    setRefreshing(false);
  };
  
  const handleOpenQuickCreate = () => {
    // Reset state
    setQuickCreateMode('entry');
    setEntryType('task');
    setEntryTitle('');
    setEntryBody('');
    setSelectedList(null);
    setTaskDueDate(undefined);
    setTaskPriority(2);
    setChecklistItems(['', '', '']);
    setNewListName('');
    setModalVisible(true);
  };
  
  const handleCloseModal = () => {
    setModalVisible(false);
    setQuickCreateMode('entry');
  };
  
  const handleSwitchToNewList = () => {
    setQuickCreateMode('new-list');
  };
  
  const handleBackToEntry = () => {
    setQuickCreateMode('entry');
  };
  
  const handleCreateNewList = async () => {
    const trimmedName = newListName.trim();
    if (!trimmedName) {
      Alert.alert('Empty Name', 'Please enter a list name.');
      return;
    }
    
    try {
      const newList = await createList({
        name: trimmedName,
        sort_order: allLists.length,
        is_pinned: false,
        is_archived: false,
      });
      
      // Add to local state
      setAllLists([...allLists, newList]);
      
      // Select the new list
      setSelectedList(newList);
      
      // Switch back to entry mode
      setNewListName('');
      setQuickCreateMode('entry');
    } catch (error) {
      console.error('Failed to create list:', error);
      Alert.alert('Error', 'Unable to create list. Please try again.');
    }
  };
  
  const handleCreateEntry = async () => {
    const trimmedTitle = entryTitle.trim();
    if (!trimmedTitle) {
      Alert.alert('Empty Title', 'Please enter a title.');
      return;
    }
    
    try {
      let listId: string | undefined = selectedList?.id;
      
      // If no list selected, get or create Unsorted
      if (!listId) {
        console.log('� No list selected, calling getOrCreateUnsortedList...');
        const unsortedList = await getOrCreateUnsortedList();
        listId = unsortedList.id;
        console.log('✅ Unsorted list obtained:', {
          id: unsortedList.id,
          name: unsortedList.name,
          icon: unsortedList.icon,
          is_system: unsortedList.is_system,
          deleted_at: unsortedList.deleted_at,
        });
      } else {
        console.log('� Using selected list:', selectedList?.name);
      }
      
      if (entryType === 'task') {
        await createTask({
          title: trimmedTitle,
          list_id: listId,
          due_date: taskDueDate,
          calm_priority: taskPriority,
          completed: false,
        });
      } else if (entryType === 'note') {
        await createNote({
          title: trimmedTitle,
          notes: entryBody.trim() || undefined,
          list_id: listId,
        });
      } else if (entryType === 'checklist') {
        const validItems = checklistItems.filter(item => item.trim() !== '');
        if (validItems.length === 0) {
          Alert.alert('No Items', 'Please add at least one checklist item.');
          return;
        }
        
        await createChecklistWithItems({
          title: trimmedTitle,
          list_id: listId,
          items: validItems,
        });
      }
      
      console.log(`� Creating ${entryType} with list_id: ${listId}`);
      
      handleCloseModal();
      await loadTasks();
      await loadLists();
      
      console.log('✅ Entry created, screens refreshed');
    } catch (error) {
      console.error('âŒ Failed to create entry:', error);
      Alert.alert('Error', 'Unable to create entry. Please try again.');
    }
  };
  
  const handleAddChecklistItem = () => {
    setChecklistItems([...checklistItems, '']);
  };
  
  const handleRemoveChecklistItem = (index: number) => {
    if (checklistItems.length > 1) {
      setChecklistItems(checklistItems.filter((_, i) => i !== index));
    }
  };
  
  const handleUpdateChecklistItem = (index: number, value: string) => {
    const updated = [...checklistItems];
    updated[index] = value;
    setChecklistItems(updated);
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
    <>
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
                  View all {grouped.overdue.length} overdue â†’
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
                  View all {grouped.today.length} tasks â†’
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
                <Text style={styles.viewAllText}>View all upcoming â†’</Text>
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


        {/* Pinned Lists */}
        {pinnedLists.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              📌 Pinned Lists ({pinnedLists.length})
            </Text>
            {pinnedLists.map(list => (
              <TouchableOpacity
                key={list.id}
                style={styles.pinnedListRow}
                onPress={() => goToLists(list.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.pinnedListIcon}>{list.icon || '📋'}</Text>
                <Text style={styles.pinnedListName}>{list.name}</Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📌 Pinned Lists</Text>
            <Text style={styles.emptyMessage}>
              No pinned lists yet. Long-press a list in the Lists tab to pin it.
            </Text>
          </View>
        )}


        {tasks.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tasks yet</Text>
            <Text style={styles.emptySubtext}>
              Tap + to create your first task
            </Text>
          </View>
        )}
      </ScrollView>
      
      {/* Quick Create FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleOpenQuickCreate}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      
      {/* Quick Create Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={handleCloseModal}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={e => e.stopPropagation()}
            >
              <ScrollView
                style={styles.modalContent}
                contentContainerStyle={styles.modalContentInner}
                keyboardShouldPersistTaps="handled"
                bounces={false}
              >
                {quickCreateMode === 'entry' ? (
                  <>
                    {/* Entry Creation Mode */}
                    <View style={styles.typeSelectorContainer}>
                      {(['task', 'note', 'checklist'] as EntryType[]).map(type => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.typeButton,
                            entryType === type && styles.typeButtonActive,
                          ]}
                          onPress={() => setEntryType(type)}
                        >
                          <Text
                            style={[
                              styles.typeButtonText,
                              entryType === type && styles.typeButtonTextActive,
                            ]}
                          >
                            {type === 'task' ? 'Task' : type === 'note' ? 'Note' : 'Checklist'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.modalTitle}>Quick Create</Text>

                    <TextInput
                      style={styles.input}
                      placeholder={`${entryType === 'task' ? 'Task' : entryType === 'note' ? 'Note' : 'Checklist'} title`}
                      value={entryTitle}
                      onChangeText={setEntryTitle}
                      autoFocus
                      returnKeyType="done"
                    />
                    
                    {/* Optional List Assignment */}
                    <TouchableOpacity
                      style={styles.listPickerButton}
                      onPress={() => setListPickerVisible(true)}
                    >
                      <Text style={styles.listPickerButtonText}>
                        {selectedList ? `📁 ${selectedList.name}` : '+ Add to List (optional)'}
                      </Text>
                    </TouchableOpacity>

                    {/* Type-specific fields */}
                    {entryType === 'task' && (
                      <>
                        <DatePickerButton
                          value={taskDueDate}
                          onChange={(timestamp) => setTaskDueDate(timestamp ?? undefined)}
                        />

                        <View style={styles.priorityContainer}>
                          <Text style={styles.priorityLabel}>Priority</Text>
                          <View style={styles.priorityButtons}>
                            {[1, 2, 3].map(priority => (
                              <TouchableOpacity
                                key={priority}
                                style={[
                                  styles.priorityButton,
                                  taskPriority === priority && styles.priorityButtonActive,
                                ]}
                                onPress={() => setTaskPriority(priority)}
                              >
                                <Text
                                  style={[
                                    styles.priorityButtonText,
                                    taskPriority === priority && styles.priorityButtonTextActive,
                                  ]}
                                >
                                  {getPriorityLabel(priority)}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      </>
                    )}

                    {entryType === 'note' && (
                      <TextInput
                        style={[styles.input, styles.bodyInput]}
                        placeholder="Note body (optional)"
                        value={entryBody}
                        onChangeText={setEntryBody}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                    )}

                    {entryType === 'checklist' && (
                      <View style={styles.checklistItemsContainer}>
                        <Text style={styles.checklistItemsLabel}>Items</Text>
                        {checklistItems.map((item, index) => (
                          <View key={index} style={styles.checklistItemRow}>
                            <TextInput
                              style={styles.checklistItemInput}
                              placeholder={`Item ${index + 1}`}
                              value={item}
                              onChangeText={(value) => handleUpdateChecklistItem(index, value)}
                            />
                            {checklistItems.length > 1 && (
                              <TouchableOpacity
                                onPress={() => handleRemoveChecklistItem(index)}
                                style={styles.removeItemButton}
                              >
                                <Text style={styles.removeItemText}>✕</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        ))}
                        <TouchableOpacity
                          style={styles.addItemButton}
                          onPress={handleAddChecklistItem}
                        >
                          <Text style={styles.addItemText}>+ Add Item</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    <View style={styles.modalButtons}>
                      <TouchableOpacity
                        style={[styles.button, styles.buttonCancel]}
                        onPress={handleCloseModal}
                      >
                        <Text style={styles.buttonCancelText}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.button,
                          styles.buttonCreate,
                          !entryTitle.trim() && styles.buttonDisabled,
                        ]}
                        onPress={handleCreateEntry}
                        disabled={!entryTitle.trim()}
                      >
                        <Text style={styles.buttonCreateText}>Create</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    {/* New List Creation Mode */}
                    <TouchableOpacity
                      style={styles.backButton}
                      onPress={handleBackToEntry}
                    >
                      <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>

                    <Text style={styles.modalTitle}>New List</Text>

                    <TextInput
                      style={styles.input}
                      placeholder="List name"
                      value={newListName}
                      onChangeText={setNewListName}
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={handleCreateNewList}
                    />

                    <View style={styles.modalButtons}>
                      <TouchableOpacity
                        style={[styles.button, styles.buttonCancel]}
                        onPress={handleBackToEntry}
                      >
                        <Text style={styles.buttonCancelText}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.button,
                          styles.buttonCreate,
                          !newListName.trim() && styles.buttonDisabled,
                        ]}
                        onPress={handleCreateNewList}
                        disabled={!newListName.trim()}
                      >
                        <Text style={styles.buttonCreateText}>Create</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* List Picker Modal */}
      <Modal
        visible={listPickerVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setListPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setListPickerVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.listPickerContent}>
              <Text style={styles.listPickerTitle}>Select List</Text>
              
              {/* New List option */}
              <TouchableOpacity
                style={styles.listPickerItem}
                onPress={() => {
                  setListPickerVisible(false);
                  handleSwitchToNewList();
                }}
              >
                <Text style={styles.listPickerItemText}>➕ New List</Text>
              </TouchableOpacity>
              
              {/* Existing lists */}
              <ScrollView style={styles.listPickerScroll}>
                {allLists.map(list => (
                  <TouchableOpacity
                    key={list.id}
                    style={styles.listPickerItem}
                    onPress={() => {
                      setSelectedList(list);
                      setListPickerVisible(false);
                    }}
                  >
                    <Text style={styles.listPickerItemText}>
                      {list.icon || '📋'} {list.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <TouchableOpacity
                style={styles.listPickerCancelButton}
                onPress={() => setListPickerVisible(false)}
              >
                <Text style={styles.listPickerCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 100 },
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
  pinnedListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pinnedListIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  pinnedListName: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  chevron: {
    fontSize: 20,
    color: '#9ca3af',
  },
  taskPreview: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  taskPreviewTitle: { fontSize: 15 },
  taskPreviewList: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
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
  
  // FAB
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
  fabText: { fontSize: 32, color: '#fff', fontWeight: '300' },
  
  // Modal
  modalContainer: { flex: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalContentInner: {
    padding: 20,
    paddingBottom: 60,
  },
  
  // Type selector
  typeSelectorContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  typeButtonActive: { backgroundColor: '#3b82f6' },
  typeButtonText: { fontSize: 16, color: '#6b7280', fontWeight: '600' },
  typeButtonTextActive: { color: '#fff' },
  
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 16 },
  
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
  bodyInput: { minHeight: 100 },
  
  // List picker button
  listPickerButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    minHeight: 48,
    justifyContent: 'center',
  },
  listPickerButtonText: { fontSize: 16, color: '#6b7280' },
  
  // Priority
  priorityContainer: { marginBottom: 16 },
  priorityLabel: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  priorityButtons: { flexDirection: 'row', gap: 8 },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  priorityButtonActive: { backgroundColor: '#3b82f6' },
  priorityButtonText: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  priorityButtonTextActive: { color: '#fff' },
  
  // Checklist items
  checklistItemsContainer: { marginBottom: 16 },
  checklistItemsLabel: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  checklistItemRow: { flexDirection: 'row', marginBottom: 8, gap: 8 },
  checklistItemInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 48,
  },
  removeItemButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeItemText: { fontSize: 18, color: '#ef4444' },
  addItemButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  addItemText: { color: '#3b82f6', fontWeight: '600' },
  
  // Modal buttons
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonCancel: { backgroundColor: '#f3f4f6' },
  buttonCancelText: { color: '#6b7280', fontSize: 16, fontWeight: '600' },
  buttonCreate: { backgroundColor: '#3b82f6' },
  buttonCreateText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.4 },
  
  // Back button (for new list mode)
  backButton: { paddingVertical: 8, marginBottom: 8 },
  backButtonText: { fontSize: 16, color: '#3b82f6', fontWeight: '600' },
  
  // List Picker Modal
  listPickerContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    minHeight: 320,
    maxHeight: 600,
    minWidth: 300,
    maxWidth: 400,
    width: '90%',
    overflow: 'hidden',
  },
  listPickerTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  listPickerScroll: {
    flex: 1,
    minHeight: 200,
  },
  listPickerItem: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  listPickerItemText: { fontSize: 16, color: '#1a1a1a' },
  listPickerCancelButton: {
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
  },
  listPickerCancelText: { color: '#6b7280', fontSize: 16, fontWeight: '600' },
});
