import DatePickerButton from '../components/DatePickerButton';
import NoteCard from '../components/NoteCard';
import NoteEditor from '../components/NoteEditor';
import ChecklistRow from '../components/ChecklistRow';
import ChecklistScreen from './ChecklistScreen';
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
  ActionSheetIOS,
  ScrollView,
} from 'react-native';
import { getAllLists, createList, deleteList } from '../db/operations';
import { getTasksByListId, createTask, deleteTask, updateTask } from '../db/operations';
import { getNotesByListId, createNote, deleteNote, updateNote } from '../db/operations';
import { getChecklistsByListId, createChecklistWithItems, deleteChecklist } from '../db/operations';
import type { List, Task, Note, ChecklistWithStats } from '../types/models';
import { getPriorityLabel, getPriorityStyle } from '../utils/formatting';

type ListEntry = Task | Note | ChecklistWithStats;

export default function ListsScreen() {
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newListName, setNewListName] = useState('');

  const [selectedList, setSelectedList] = useState<List | null>(null);
  const [selectedChecklist, setSelectedChecklist] = useState<string | null>(null);
  const [entries, setEntries] = useState<ListEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  
  const [entryModalVisible, setEntryModalVisible] = useState(false);
  const [entryType, setEntryType] = useState<'task' | 'note' | 'checklist'>('task');
  const [newEntryTitle, setNewEntryTitle] = useState('');
  const [newEntryBody, setNewEntryBody] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState<number | undefined>(undefined);
  const [newTaskPriority, setNewTaskPriority] = useState<number>(2);
  
  // Checklist bulk creation
  const [checklistItems, setChecklistItems] = useState<string[]>(['']);

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingEntryTitle, setEditingEntryTitle] = useState('');
  const entryEditInputRef = useRef<TextInput>(null);

  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLists();
  }, []);

  useEffect(() => {
    if (selectedList) {
      loadEntries(selectedList.id);
    }
  }, [selectedList]);

  const loadLists = async () => {
    try {
      setLoading(true);
      const allLists = await getAllLists();
      const activeLists = allLists.filter(list => !list.is_archived);
      setLists(activeLists);
    } catch (error) {
      console.error('Failed to load lists:', error);
      Alert.alert('Error', 'Unable to load lists. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async () => {
    const trimmedName = newListName.trim();

    if (!trimmedName) {
      Alert.alert('Empty Name', 'Please enter a name for your list.');
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
      Alert.alert('Error', 'Unable to create list. Please try again.');
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
              Alert.alert('Error', 'Unable to delete list. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSelectList = (list: List) => {
    setEditingEntryId(null);
    setEditingEntryTitle('');
    setSelectedList(list);
    setSelectedChecklist(null);
  };

  const handleBackToLists = () => {
    setSelectedList(null);
    setEntries([]);
    setEditingEntryId(null);
    setEditingEntryTitle('');
    setSelectedChecklist(null);
  };

  const handleOpenChecklist = (checklistId: string) => {
    setSelectedChecklist(checklistId);
  };

  const handleBackToListDetail = () => {
    setSelectedChecklist(null);
    if (selectedList) {
      loadEntries(selectedList.id);
    }
  };

  const loadEntries = async (listId: string) => {
    try {
      setLoadingEntries(true);
      
      const [tasks, notes, checklists] = await Promise.all([
        getTasksByListId(listId),
        getNotesByListId(listId),
        getChecklistsByListId(listId),
      ]);

      const mixed: ListEntry[] = [...tasks, ...notes, ...checklists].sort(
        (a, b) => b.created_at - a.created_at
      );

      setEntries(mixed);
    } catch (error) {
      console.error('Failed to load entries:', error);
      Alert.alert('Error', 'Unable to load items. Please try again.');
    } finally {
      setLoadingEntries(false);
    }
  };

  const handleRefreshEntries = async () => {
    if (!selectedList) return;
    
    setRefreshing(true);
    await loadEntries(selectedList.id);
    setRefreshing(false);
  };

  const handleCreateEntry = async () => {
    const trimmedTitle = newEntryTitle.trim();

    if (!trimmedTitle) {
      Alert.alert('Empty Title', 'Please enter a title.');
      return;
    }

    if (!selectedList) {
      Alert.alert('Error', 'No list selected.');
      return;
    }

    try {
      if (entryType === 'task') {
        await createTask({
          title: trimmedTitle,
          list_id: selectedList.id,
          due_date: newTaskDueDate,
          calm_priority: newTaskPriority,
          completed: false,
        });
      } else if (entryType === 'note') {
        await createNote({
          title: trimmedTitle,
          notes: newEntryBody.trim() || undefined,
          list_id: selectedList.id,
        });
      } else if (entryType === 'checklist') {
        const items = checklistItems
          .map(item => item.trim())
          .filter(item => item.length > 0);
        
        await createChecklistWithItems({
          title: trimmedTitle,
          list_id: selectedList.id,
          items,
        });
      }

      setNewEntryTitle('');
      setNewEntryBody('');
      setNewTaskDueDate(undefined);
      setNewTaskPriority(2);
      setChecklistItems(['']);
      setEntryModalVisible(false);
      await loadEntries(selectedList.id);
    } catch (error) {
      console.error('Failed to create entry:', error);
      Alert.alert('Error', 'Unable to add item. Please try again.');
    }
  };

  const handleAddChecklistItem = () => {
    setChecklistItems([...checklistItems, '']);
  };

  const handleUpdateChecklistItem = (index: number, value: string) => {
    const updated = [...checklistItems];
    updated[index] = value;
    setChecklistItems(updated);
  };

  const handleRemoveChecklistItem = (index: number) => {
    if (checklistItems.length <= 1) {
      setChecklistItems(['']);
    } else {
      const updated = checklistItems.filter((_, i) => i !== index);
      setChecklistItems(updated);
    }
  };

  const handleToggleTask = async (task: Task) => {
    if (editingEntryId === task.id) {
      return;
    }

    try {
      await updateTask({
        id: task.id,
        completed: !task.completed,
        completed_at: !task.completed ? Date.now() : undefined,
      });
      if (selectedList) {
        await loadEntries(selectedList.id);
      }
    } catch (error) {
      console.error('Failed to toggle task:', error);
      Alert.alert('Error', 'Unable to update task. Please try again.');
    }
  };

  const handleTaskLongPress = (task: Task) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Change Priority', 'Delete Task'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            ActionSheetIOS.showActionSheetWithOptions(
              {
                options: ['Cancel', 'Focus', 'Normal', 'Low key'],
                cancelButtonIndex: 0,
              },
              (priorityIndex) => {
                if (priorityIndex === 1) handleSetPriority(task, 1);
                else if (priorityIndex === 2) handleSetPriority(task, 2);
                else if (priorityIndex === 3) handleSetPriority(task, 3);
              }
            );
          } else if (buttonIndex === 2) {
            handleDeleteEntry(task);
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
            onPress: () => handleDeleteEntry(task),
            style: 'destructive'
          },
          { 
            text: 'Change Priority', 
            onPress: () => {
              Alert.alert(
                'Set Priority',
                'Choose priority level',
                [
                  { text: 'Focus', onPress: () => handleSetPriority(task, 1) },
                  { text: 'Normal', onPress: () => handleSetPriority(task, 2) },
                  { text: 'Low key', onPress: () => handleSetPriority(task, 3) },
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

  const handleSetPriority = async (task: Task, priority: number) => {
    try {
      await updateTask({
        id: task.id,
        calm_priority: priority,
      });
      if (selectedList) {
        await loadEntries(selectedList.id);
      }
    } catch (error) {
      console.error('Failed to update priority:', error);
      Alert.alert('Error', 'Unable to update priority. Please try again.');
    }
  };

  const handleNoteLongPress = (note: Note) => {
    Alert.alert(
      note.title,
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Note',
          onPress: () => handleDeleteEntry(note),
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  const handleSaveNote = async (title: string, body: string) => {
    if (!editingNote || !selectedList) return;

    try {
      await updateNote({
        id: editingNote.id,
        title,
        notes: body || undefined,
      });

      setEditingNote(null);
      await loadEntries(selectedList.id);
    } catch (error) {
      console.error('Failed to update note:', error);
      throw error;
    }
  };

  const handleCancelNoteEdit = () => {
    setEditingNote(null);
  };

  const handleChecklistLongPress = (checklist: ChecklistWithStats) => {
    Alert.alert(
      checklist.title,
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Checklist',
          onPress: () => handleDeleteEntry(checklist),
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  const handleDeleteEntry = (entry: ListEntry) => {
    const entryLabel = entry.type === 'task' ? 'Task' : entry.type === 'note' ? 'Note' : 'Checklist';
    
    Alert.alert(
      `Delete ${entryLabel}`,
      `Delete "${entry.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (entry.type === 'task') {
                await deleteTask(entry.id);
              } else if (entry.type === 'note') {
                await deleteNote(entry.id);
              } else if (entry.type === 'checklist') {
                await deleteChecklist(entry.id);
              }
              
              if (selectedList) {
                await loadEntries(selectedList.id);
              }
            } catch (error) {
              console.error('Failed to delete entry:', error);
              Alert.alert('Error', `Unable to delete ${entryLabel.toLowerCase()}. Please try again.`);
            }
          },
        },
      ]
    );
  };

  const handleStartEditEntry = (entry: ListEntry) => {
    if (entry.type === 'checklist') {
      return;
    }
    
    setEditingEntryId(entry.id);
    setEditingEntryTitle(entry.title);
  };

  const handleSaveEditEntry = async (entry: ListEntry) => {
    const trimmedTitle = editingEntryTitle.trim();

    if (!trimmedTitle) {
      Alert.alert('Empty Title', 'Please enter a title.', [
        {
          text: 'OK',
          onPress: () => {
            setTimeout(() => {
              entryEditInputRef.current?.focus();
            }, 100);
          },
        },
      ]);
      return;
    }

    try {
      if (entry.type === 'task') {
        await updateTask({
          id: entry.id,
          title: trimmedTitle,
        });
      } else if (entry.type === 'note') {
        await updateNote({
          id: entry.id,
          title: trimmedTitle,
        });
      }

      setEditingEntryId(null);
      setEditingEntryTitle('');

      if (selectedList) {
        await loadEntries(selectedList.id);
      }
    } catch (error) {
      console.error('Failed to update entry:', error);
      Alert.alert('Error', 'Unable to save changes. Please try again.');
    }
  };

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
        <Text style={styles.listSubtext}>Tap to open • Long-press to delete</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyLists = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No lists yet</Text>
      <Text style={styles.emptySubtext}>
        Lists help you organize related items.{'\n'}
        Create a list like "Groceries" or "Work" to get started.
      </Text>
    </View>
  );

  const renderEntry = ({ item }: { item: ListEntry }) => {
    if (item.type === 'note') {
      return (
        <NoteCard
          note={item}
          onPress={() => setEditingNote(item)}
          onLongPress={() => handleNoteLongPress(item)}
        />
      );
    }

    if (item.type === 'checklist') {
      return (
        <ChecklistRow
          checklist={item}
          onPress={() => handleOpenChecklist(item.id)}
          onLongPress={() => handleChecklistLongPress(item)}
        />
      );
    }

    const task = item;
    const isEditing = editingEntryId === task.id;
    const priorityStyle = !task.completed ? getPriorityStyle(task.calm_priority) : {};

    const handleDateChange = async (timestamp: number | null) => {
      try {
        await updateTask({
          id: task.id,
          due_date: timestamp,
        });

        if (selectedList) {
          await loadEntries(selectedList.id);
        }
      } catch (error) {
        console.error('Failed to update due date:', error);
        Alert.alert('Error', 'Unable to update date. Please try again.');
      }
    };

    return (
      <View style={[styles.taskRow, priorityStyle]}>
        <TouchableOpacity
          style={[styles.checkbox, task.completed && styles.checkboxChecked]}
          onPress={() => {
            if (!isEditing) {
              handleToggleTask(task);
            }
          }}
          activeOpacity={0.7}
        >
          {task.completed && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>

        <View style={styles.taskContent}>
          {isEditing ? (
            <TextInput
              ref={entryEditInputRef}
              style={styles.taskEditInput}
              value={editingEntryTitle}
              onChangeText={setEditingEntryTitle}
              onBlur={() => handleSaveEditEntry(task)}
              onSubmitEditing={() => handleSaveEditEntry(task)}
              autoFocus
              returnKeyType="done"
            />
          ) : (
            <TouchableOpacity
              onPress={() => handleStartEditEntry(task)}
              onLongPress={() => handleTaskLongPress(task)}
              activeOpacity={0.7}
              delayLongPress={500}
            >
              <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>
                {task.title}
              </Text>
              {task.notes && <Text style={styles.taskNotes}>{task.notes}</Text>}
            </TouchableOpacity>
          )}

          {!task.completed && (
            <DatePickerButton
              value={task.due_date}
              onChange={handleDateChange}
              disabled={isEditing}
            />
          )}
        </View>
      </View>
    );
  };

  const renderEmptyEntries = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Nothing here yet</Text>
      <Text style={styles.emptySubtext}>
        Add items you need to do or remember.{'\n'}
        Like "Buy milk" or "Call dentist"
      </Text>
    </View>
  );

  const renderListDetail = () => (
    <View style={styles.container}>
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

      {loadingEntries ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          renderItem={renderEntry}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.entriesList}
          ListEmptyComponent={renderEmptyEntries}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefreshEntries}
              tintColor="#3b82f6"
              colors={['#3b82f6']}
            />
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setEntryType('task');
          setEntryModalVisible(true);
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );

  // Note editor (full screen)
  if (editingNote) {
    return (
      <NoteEditor
        note={editingNote}
        onSave={handleSaveNote}
        onCancel={handleCancelNoteEdit}
      />
    );
  }

  // Checklist detail screen
  if (selectedChecklist) {
    return (
      <ChecklistScreen
        checklistId={selectedChecklist}
        onBack={handleBackToListDetail}
      />
    );
  }

  if (selectedList) {
    return (
      <>
        {renderListDetail()}

        <Modal
          visible={entryModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setEntryModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => {
                setEntryModalVisible(false);
                setNewEntryTitle('');
                setNewEntryBody('');
                setNewTaskPriority(2);
                setChecklistItems(['']);
              }}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={e => e.stopPropagation()}
              >
                <ScrollView style={styles.modalScrollView}>
                  <View style={styles.modalContent}>
                    <View style={styles.typeSelectorContainer}>
                      <TouchableOpacity
                        style={[
                          styles.typeButton,
                          entryType === 'task' && styles.typeButtonActive,
                        ]}
                        onPress={() => setEntryType('task')}
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            entryType === 'task' && styles.typeButtonTextActive,
                          ]}
                        >
                          Task
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.typeButton,
                          entryType === 'note' && styles.typeButtonActive,
                        ]}
                        onPress={() => setEntryType('note')}
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            entryType === 'note' && styles.typeButtonTextActive,
                          ]}
                        >
                          Note
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.typeButton,
                          entryType === 'checklist' && styles.typeButtonActive,
                        ]}
                        onPress={() => setEntryType('checklist')}
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            entryType === 'checklist' && styles.typeButtonTextActive,
                          ]}
                        >
                          Checklist
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.modalTitle}>
                      {entryType === 'task' ? 'Add Task' : entryType === 'note' ? 'Add Note' : 'Create Checklist'}
                    </Text>

                    <TextInput
                      style={styles.input}
                      placeholder={
                        entryType === 'task' ? 'Task title' : 
                        entryType === 'note' ? 'Note title' : 
                        'Checklist title'
                      }
                      value={newEntryTitle}
                      onChangeText={setNewEntryTitle}
                      autoFocus
                      returnKeyType={entryType === 'note' ? 'next' : 'done'}
                      onSubmitEditing={entryType !== 'note' && entryType !== 'checklist' ? handleCreateEntry : undefined}
                    />

                    {entryType === 'note' && (
                      <TextInput
                        style={[styles.input, styles.bodyInput]}
                        placeholder="Note body (optional)"
                        value={newEntryBody}
                        onChangeText={setNewEntryBody}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                    )}

                    {entryType === 'checklist' && (
                      <View style={styles.checklistItemsContainer}>
                        <Text style={styles.checklistItemsLabel}>Items:</Text>
                        {checklistItems.map((item, index) => (
                          <View key={index} style={styles.checklistItemInputRow}>
                            <TextInput
                              style={[styles.input, styles.checklistItemInput]}
                              placeholder={`Item ${index + 1}`}
                              value={item}
                              onChangeText={value => handleUpdateChecklistItem(index, value)}
                              returnKeyType="done"
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
                          onPress={handleAddChecklistItem}
                          style={styles.addItemButton}
                        >
                          <Text style={styles.addItemText}>+ Add another item</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {entryType === 'task' && (
                      <>
                        <DatePickerButton
                          value={newTaskDueDate}
                          onChange={(timestamp) => setNewTaskDueDate(timestamp ?? undefined)}
                        />

                        <View style={styles.priorityContainer}>
                          <Text style={styles.priorityLabel}>Priority</Text>
                          <View style={styles.priorityButtons}>
                            {[1, 2, 3].map((priority) => (
                              <TouchableOpacity
                                key={priority}
                                style={[
                                  styles.priorityButton,
                                  newTaskPriority === priority && styles.priorityButtonActive,
                                ]}
                                onPress={() => setNewTaskPriority(priority)}
                              >
                                <Text
                                  style={[
                                    styles.priorityButtonText,
                                    newTaskPriority === priority && styles.priorityButtonTextActive,
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

                    <View style={styles.modalButtons}>
                      <TouchableOpacity
                        style={[styles.button, styles.buttonCancel]}
                        onPress={() => {
                          setEntryModalVisible(false);
                          setNewEntryTitle('');
                          setNewEntryBody('');
                          setNewTaskPriority(2);
                          setChecklistItems(['']);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.buttonCancelText}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.button,
                          styles.buttonCreate,
                          !newEntryTitle.trim() && styles.buttonDisabled,
                        ]}
                        onPress={handleCreateEntry}
                        activeOpacity={0.7}
                        disabled={!newEntryTitle.trim()}
                      >
                        <Text style={styles.buttonCreateText}>
                          {entryType === 'checklist' ? 'Save Checklist' : 'Add'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      </>
    );
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading…</Text>
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
                <Text style={styles.modalTitle}>Create List</Text>

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
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#666' },
  listContainer: { padding: 16, paddingBottom: 100 },
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
  listIconText: { fontSize: 24 },
  listContent: { flex: 1 },
  listName: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  listSubtext: { fontSize: 14, color: '#9ca3af' },
  detailHeader: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: { paddingVertical: 8, marginBottom: 8 },
  backButtonText: { fontSize: 16, color: '#3b82f6', fontWeight: '600' },
  detailHeaderContent: { flexDirection: 'row', alignItems: 'center' },
  detailHeaderIcon: { fontSize: 32, marginRight: 12 },
  detailHeaderTitle: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
  entriesList: { padding: 16, paddingBottom: 100 },
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
  checkboxChecked: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 16, color: '#1a1a1a', marginBottom: 4 },
  taskTitleCompleted: { textDecorationLine: 'line-through', color: '#9ca3af' },
  taskNotes: { fontSize: 14, color: '#6b7280' },
  taskEditInput: {
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 6,
    padding: 8,
    backgroundColor: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyText: { fontSize: 18, color: '#9ca3af', fontWeight: '600', marginBottom: 12 },
  emptySubtext: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },
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
  modalContainer: { flex: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalScrollView: {
    maxHeight: '90%',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
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
  typeButtonActive: {
    backgroundColor: '#3b82f6',
  },
  typeButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
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
  bodyInput: {
    minHeight: 100,
  },
  checklistItemsContainer: {
    marginBottom: 16,
  },
  checklistItemsLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '600',
  },
  checklistItemInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checklistItemInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 8,
  },
  removeItemButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeItemText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addItemButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addItemText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
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
});
