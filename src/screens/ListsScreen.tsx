import DatePickerButton from '../components/DatePickerButton';
import NoteCard from '../components/NoteCard';
import NoteEditor from '../components/NoteEditor';
import ChecklistScreen from './ChecklistScreen';
import ActionMenu, { ActionMenuItem } from '../components/ActionMenu';
import SelectionMenu, { SelectionOption } from '../components/SelectionMenu';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { getAllLists, createList, deleteList, getActiveEntriesCountByListId, archiveList, moveEntryToList, toggleListPin, updateListSortOrders, renameList } from '../db/operations';
import { getTasksByListId, createTask, deleteTask, updateTask } from '../db/operations';
import { getNotesByListId, createNote, deleteNote, updateNote } from '../db/operations';
import { getChecklistsByListId, createChecklist, createChecklistWithItems, deleteChecklist } from '../db/operations';
import type { List, Task, Note, ChecklistWithStats } from '../types/models';
import { getPriorityLabel, getPriorityStyle } from '../utils/formatting';
import { getUserFriendlyError, VALIDATION, normalizeNameCanonical } from '../utils/validation';

type ListEntry = Task | Note | ChecklistWithStats;
type MoveModalMode = 'select-list' | 'new-list';

// TICKET 11A: Flattened data model for drag & drop
type FlatListItem = 
  | { type: 'header'; title: string; id: string }
  | { type: 'list'; data: List; id: string };

export default function ListsScreen({
  initialListId,
  onListIdChange,
}: {
  initialListId?: string;
  onListIdChange?: (listId: string | undefined) => void;
}) {
  const [lists, setLists] = useState<List[]>([]);
  const [flatData, setFlatData] = useState<FlatListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newListName, setNewListName] = useState('');

  const [selectedList, setSelectedList] = useState<List | null>(null);
  const [entries, setEntries] = useState<ListEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  
  const [entryModalVisible, setEntryModalVisible] = useState(false);
  const [entryType, setEntryType] = useState<'task' | 'note' | 'checklist'>('task');
  const [newEntryTitle, setNewEntryTitle] = useState('');
  const [newEntryBody, setNewEntryBody] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState<number | undefined>(undefined);
  const [newTaskPriority, setNewTaskPriority] = useState<number>(2);
  const [newChecklistItems, setNewChecklistItems] = useState<string[]>(['', '', '']);

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingEntryTitle, setEditingEntryTitle] = useState('');
  const entryEditInputRef = useRef<TextInput>(null);
  
  // TICKET 12 FINAL: Input ref for UX affordances (focus on error)
  const listNameInputRef = useRef<TextInput>(null);

  const [editingNote, setEditingNote] = useState<Note | null>(null);
  
  // Checklist navigation state
  const [selectedChecklist, setSelectedChecklist] = useState<ChecklistWithStats | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  // TICKET 9D: Move to List state
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [moveModalMode, setMoveModalMode] = useState<MoveModalMode>('select-list');
  const [entryToMove, setEntryToMove] = useState<ListEntry | null>(null);
  const [moveTargetList, setMoveTargetList] = useState<List | null>(null);
  const [moveNewListName, setMoveNewListName] = useState('');
  const [availableListsForMove, setAvailableListsForMove] = useState<List[]>([]);

  // TICKET 13: Rename List state
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renamingList, setRenamingList] = useState<List | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<TextInput>(null);

  // TICKET 13 FIX: Custom action menu state
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [actionMenuList, setActionMenuList] = useState<List | null>(null);
  const [priorityMenuVisible, setPriorityMenuVisible] = useState(false);
  const [selectedTaskForPriority, setSelectedTaskForPriority] = useState<Task | null>(null);

  useEffect(() => {
    loadLists();
  }, []);

  useEffect(() => {
    if (selectedList) {
      loadEntries(selectedList.id);
    }
  }, [selectedList]);

  // Handle navigation from Overview with initialListId
  useEffect(() => {
    if (initialListId && lists.length > 0) {
      const list = lists.find(l => l.id === initialListId);
      if (list) {
        setSelectedList(list);
      }
    }
  }, [initialListId, lists]);

  const loadLists = async () => {
    try {
      setLoading(true);
      const allLists = await getAllLists();
      console.log(`📋 ListsScreen: Got ${allLists.length} lists from getAllLists()`);
      
      const activeLists = allLists.filter(list => !list.is_archived);
      console.log(`✅ ListsScreen: Filtered to ${activeLists.length} active lists`);
      activeLists.forEach(list => {
        console.log(`  - ${list.icon || '?'} ${list.name} ${list.is_system ? '[SYSTEM]' : '[USER]'}`);
      });
      
      setLists(activeLists);
      
      // TICKET 11A: Build flattened data structure
      buildFlatData(activeLists);
    } catch (error) {
      console.error('❌ ListsScreen: Failed to load lists:', error);
      Alert.alert('Error', 'Unable to load lists. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // TICKET 11A: Build flattened data with synthetic headers
  const buildFlatData = (allLists: List[]) => {
    const pinned = allLists
      .filter(l => l.is_pinned && !l.is_system)
      .sort((a, b) => a.sort_order - b.sort_order);
    
    const unpinned = allLists
      .filter(l => !l.is_pinned && !l.is_system)
      .sort((a, b) => a.sort_order - b.sort_order);
    
    const systemLists = allLists
      .filter(l => l.is_system)
      .sort((a, b) => a.sort_order - b.sort_order);
    
    const flat: FlatListItem[] = [];
    
    if (pinned.length > 0) {
      flat.push({ type: 'header', title: 'PINNED', id: 'header-pinned' });
      pinned.forEach(list => {
        flat.push({ type: 'list', data: list, id: list.id });
      });
    }
    
    if (unpinned.length > 0 || systemLists.length > 0) {
      flat.push({ type: 'header', title: 'LISTS', id: 'header-lists' });
      unpinned.forEach(list => {
        flat.push({ type: 'list', data: list, id: list.id });
      });
      systemLists.forEach(list => {
        flat.push({ type: 'list', data: list, id: list.id });
      });
    }
    
    setFlatData(flat);
  };

  const handleCreateList = async () => {
    const trimmedName = newListName.trim();

    if (!trimmedName) {
      Alert.alert('Empty Name', 'Please enter a name for your list.', [
        {
          text: 'OK',
          onPress: () => {
            // TICKET 12 FINAL: Focus input after user dismisses alert
            setTimeout(() => listNameInputRef.current?.focus(), 100);
          },
        },
      ]);
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
      
      // TICKET 12 FINAL: User-friendly error with focus affordance
      const message = error instanceof Error ? error.message : getUserFriendlyError(error);
      Alert.alert('Cannot Create List', message, [
        {
          text: 'OK',
          onPress: () => {
            // Focus and select text for easy correction
            setTimeout(() => {
              listNameInputRef.current?.focus();
              // Select all text so user can easily type new name
              if (Platform.OS === 'ios') {
                listNameInputRef.current?.setNativeProps({
                  selection: { start: 0, end: newListName.length },
                });
              }
            }, 100);
          },
        },
      ]);
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

  const handleTogglePin = async (list: List) => {
    try {
      await toggleListPin(list.id, !list.is_pinned);
      await loadLists();
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      Alert.alert('Error', 'Unable to update pin status. Please try again.');
    }
  };

  // TICKET 13: Rename List handlers
  const handleOpenRenameModal = (list: List) => {
    setRenamingList(list);
    setRenameValue(list.name);
    setRenameModalVisible(true);
  };

  const handleCloseRenameModal = () => {
    setRenameModalVisible(false);
    setRenamingList(null);
    setRenameValue('');
  };

  const handleRenameList = async () => {
    if (!renamingList) return;

    const trimmedName = renameValue.trim();

    // Empty name check
    if (!trimmedName) {
      Alert.alert('Empty Name', 'Please enter a name for your list.', [
        {
          text: 'OK',
          onPress: () => {
            // TICKET 12 UX: Focus input after user dismisses alert
            setTimeout(() => renameInputRef.current?.focus(), 100);
          },
        },
      ]);
      return;
    }

    // No-op: Rename to same name (case may differ, but canonical is same)
    if (normalizeNameCanonical(trimmedName) === normalizeNameCanonical(renamingList.name)) {
      handleCloseRenameModal();
      return;
    }

    try {
      await renameList(renamingList.id, trimmedName);
      handleCloseRenameModal();
      await loadLists();

      // If we renamed the currently selected list, update the reference
      if (selectedList?.id === renamingList.id) {
        const updatedLists = await getAllLists();
        const updated = updatedLists.find(l => l.id === renamingList.id);
        if (updated) {
          setSelectedList(updated);
        }
      }
    } catch (error) {
      console.error('Failed to rename list:', error);

      // TICKET 12 UX: User-friendly error with focus affordance
      const message = error instanceof Error ? error.message : getUserFriendlyError(error);
      Alert.alert('Cannot Rename List', message, [
        {
          text: 'OK',
          onPress: () => {
            // Focus and select text for easy correction
            setTimeout(() => {
              renameInputRef.current?.focus();
              // Select all text so user can easily type new name
              if (Platform.OS === 'ios') {
                renameInputRef.current?.setNativeProps({
                  selection: { start: 0, end: renameValue.length },
                });
              }
            }, 100);
          },
        },
      ]);
    }
  };

  // TICKET 11A + TICKET 13 FIX: Show action menu via ⋯ button
  const handleShowActionMenu = (list: List) => {
    if (Platform.OS === 'ios') {
      // iOS: Use native ActionSheet
      const options = ['Cancel'];
      const actions: (() => void)[] = [];
      
      // TICKET 13: Rename option (not available for system lists)
      if (!list.is_system) {
        options.push('Rename');
        actions.push(() => handleOpenRenameModal(list));
      }
      
      // Pin/Unpin option (not available for system lists)
      if (!list.is_system) {
        options.push(list.is_pinned ? 'Unpin' : 'Pin to Top');
        actions.push(() => handleTogglePin(list));
      }
      
      // Delete option
      options.push('Delete List');
      actions.push(() => handleDeleteList(list));
      
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex: options.length - 1,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex > 0 && buttonIndex <= actions.length) {
            actions[buttonIndex - 1]();
          }
        }
      );
    } else {
      // Android: Use custom ActionMenu (no button limit)
      setActionMenuList(list);
      setActionMenuVisible(true);
    }
  };

  const handleSelectList = (list: List) => {
    setEditingEntryId(null);
    setEditingEntryTitle('');
    setSelectedList(list);
  };

  const handleBackToLists = async () => {
    setSelectedList(null);
    setEntries([]);
    setEditingEntryId(null);
    setEditingEntryTitle('');
    // Notify parent that we've returned to list view
    if (onListIdChange) {
      onListIdChange(undefined);
    }
    // Refresh lists to reflect any archive changes
    await loadLists();
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

  // TICKET 11A: Drag & drop handler
  const handleDragEnd = async (params: { data: FlatListItem[]; from: number; to: number }) => {
    const { data, from, to } = params;
    
    // If dropped in same position, no update needed
    if (from === to) {
      return;
    }
    
    // Optimistically update UI
    setFlatData(data);
    
    try {
      // Extract lists and determine their new positions
      const updates: { id: string; sort_order: number; is_pinned: boolean }[] = [];
      
      let currentSection: 'pinned' | 'unpinned' | null = null;
      let positionInSection = 0;
      
      for (const item of data) {
        if (item.type === 'header') {
          currentSection = item.title === 'PINNED' ? 'pinned' : 'unpinned';
          positionInSection = 0;
        } else if (item.type === 'list' && !item.data.is_system) {
          // System lists are never updated
          const isPinned = currentSection === 'pinned';
          
          updates.push({
            id: item.data.id,
            sort_order: positionInSection,
            is_pinned: isPinned,
          });
          
          positionInSection++;
        }
      }
      
      // Persist to database
      await updateListSortOrders(updates);
      
      // Reload to sync state
      await loadLists();
      
    } catch (error) {
      console.error('❌ Failed to persist drag order:', error);
      Alert.alert('Error', 'Unable to save new order. Changes reverted.');
      
      // Revert to original order
      await loadLists();
    }
  };

  const handleAddChecklistItem = () => {
    setNewChecklistItems([...newChecklistItems, '']);
  };

  const handleRemoveChecklistItem = (index: number) => {
    if (newChecklistItems.length > 1) {
      setNewChecklistItems(newChecklistItems.filter((_, i) => i !== index));
    }
  };

  const handleUpdateChecklistItem = (index: number, value: string) => {
    const updated = [...newChecklistItems];
    updated[index] = value;
    setNewChecklistItems(updated);
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
        });
      } else if (entryType === 'note') {
        await createNote({
          title: trimmedTitle,
          notes: newEntryBody.trim() || undefined,
          list_id: selectedList.id,
        });
      } else if (entryType === 'checklist') {
        const validItems = newChecklistItems.filter(item => item.trim() !== '');
        await createChecklistWithItems({
          title: trimmedTitle,
          list_id: selectedList.id,
          items: validItems,
        });
      }

      setNewEntryTitle('');
      setNewEntryBody('');
      setNewTaskDueDate(undefined);
      setNewTaskPriority(2);
      setNewChecklistItems(['', '', '']);
      setEntryModalVisible(false);
      await loadEntries(selectedList.id);
    } catch (error) {
      console.error('Failed to create entry:', error);
      Alert.alert('Error', 'Unable to add item. Please try again.');
    }
  };

  const handleToggleTask = async (task: Task) => {
    if (editingEntryId === task.id) {
      return;
    }

    try {
      const wasCompleted = task.completed;
      const isUnsorted = selectedList?.is_system === true;
      
      await updateTask({
        id: task.id,
        completed: !task.completed,
        completed_at: !task.completed ? Date.now() : undefined,
      });
      
      // Special handling for Unsorted tasks
      if (isUnsorted && !wasCompleted && selectedList) {
        // Just completed an Unsorted task
        console.log('🔍 Checking if Unsorted should be archived...');
        
        // Reload entries to get fresh data
        await loadEntries(selectedList.id);
        
        // Check if any active (not completed, not deleted) items remain
        const activeCount = await getActiveEntriesCountByListId(selectedList.id);
        console.log(`📊 Active entries in Unsorted: ${activeCount}`);
        
        if (activeCount === 0) {
          // No active items left - archive Unsorted and navigate back
          console.log('📦 Last Unsorted item completed, archiving list and navigating back');
          await archiveList(selectedList.id);
          handleBackToLists();
          return;
        } else {
          console.log(`✅ Unsorted list still has ${activeCount} active items, keeping visible`);
        }
      }
      
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
          options: ['Cancel', 'Move to List', 'Change Priority', 'Delete Task'],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleOpenMoveModal(task);
          } else if (buttonIndex === 2) {
              setSelectedTaskForPriority(task);
              setPriorityMenuVisible(true);
          } else if (buttonIndex === 3) {
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
            text: 'Move to List', 
            onPress: () => handleOpenMoveModal(task)
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
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Move to List', 'Delete Note'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleOpenMoveModal(note);
          } else if (buttonIndex === 2) {
            handleDeleteEntry(note);
          }
        }
      );
    } else {
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
          {
            text: 'Move to List',
            onPress: () => handleOpenMoveModal(note),
          },
        ],
        { cancelable: true }
      );
    }
  };

  const handleChecklistLongPress = (checklist: ChecklistWithStats) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Move to List', 'Delete Checklist'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleOpenMoveModal(checklist);
          } else if (buttonIndex === 2) {
            handleDeleteEntry(checklist);
          }
        }
      );
    } else {
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
          {
            text: 'Move to List',
            onPress: () => handleOpenMoveModal(checklist),
          },
        ],
        { cancelable: true }
      );
    }
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
      throw error; // Re-throw to let NoteEditor handle the error
    }
  };

  const handleCancelNoteEdit = () => {
    setEditingNote(null);
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
                // Refresh lists to update Unsorted visibility (it may have been archived if empty)
                await loadLists();
                
                // If Unsorted is now empty and archived, navigate back to lists
                if (selectedList.is_system && entries.length === 1) {
                  // This was the last item, Unsorted will be archived
                  // Navigate back to lists screen
                  handleBackToLists();
                }
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
      } else {
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

  // TICKET 9D: Move to List handlers
  const handleOpenMoveModal = async (entry: ListEntry) => {
    setEntryToMove(entry);
    setMoveModalMode('select-list');
    setMoveTargetList(null);
    setMoveNewListName('');

    // Load available lists (exclude current list and Unsorted)
    try {
      const allLists = await getAllLists();
      const available = allLists.filter(list => 
        !list.is_archived && 
        !list.is_system && 
        list.id !== selectedList?.id
      );
      setAvailableListsForMove(available);
      setMoveModalVisible(true);
    } catch (error) {
      console.error('Failed to load lists for move:', error);
      Alert.alert('Error', 'Unable to load lists. Please try again.');
    }
  };

  const handleCloseMoveModal = () => {
    setMoveModalVisible(false);
    setEntryToMove(null);
    setMoveTargetList(null);
    setMoveNewListName('');
    setMoveModalMode('select-list');
  };

  const handleSwitchToNewListMode = () => {
    setMoveModalMode('new-list');
  };

  const handleBackToSelectList = () => {
    setMoveModalMode('select-list');
  };

  const handleCreateNewListForMove = async () => {
    const trimmedName = moveNewListName.trim();
    if (!trimmedName) {
      Alert.alert('Empty Name', 'Please enter a list name.');
      return;
    }

    try {
      const newList = await createList({
        name: trimmedName,
        sort_order: lists.length,
        is_pinned: false,
        is_archived: false,
      });

      // Add to available lists
      setAvailableListsForMove([...availableListsForMove, newList]);
      
      // Select the new list
      setMoveTargetList(newList);
      
      // Switch back to select mode
      setMoveNewListName('');
      setMoveModalMode('select-list');
      
      // Refresh main lists
      await loadLists();
    } catch (error) {
      console.error('Failed to create list:', error);
      Alert.alert('Error', 'Unable to create list. Please try again.');
    }
  };

  const handleConfirmMove = async () => {
    if (!entryToMove || !moveTargetList) return;

    try {
      await moveEntryToList({
        entryId: entryToMove.id,
        newListId: moveTargetList.id,
        sourceListId: selectedList?.id,
      });

      console.log(`✅ Moved ${entryToMove.type} to ${moveTargetList.name}`);

      // Close modal
      handleCloseMoveModal();

      // Reload current list
      if (selectedList) {
        await loadEntries(selectedList.id);
        
        // If list is now empty and is Unsorted, it will be archived
        // Check if we should navigate back
        const remainingEntries = entries.filter(e => e.id !== entryToMove.id);
        if (selectedList.is_system && remainingEntries.length === 0) {
          // Unsorted will be archived, navigate back
          await handleBackToLists();
        }
      }

      // Refresh lists (in case Unsorted was archived)
      await loadLists();

      // Show success message
      const entryTypeLabel = entryToMove.type === 'task' ? 'Task' : entryToMove.type === 'note' ? 'Note' : 'Checklist';
      Alert.alert('Moved', `${entryTypeLabel} moved to ${moveTargetList.name}`);
    } catch (error) {
      console.error('Failed to move entry:', error);
      Alert.alert('Error', 'Unable to move item. Please try again.');
    }
  };

  // TICKET 11A: Render list row with drag support
  const renderListRow = ({ item, drag, isActive }: RenderItemParams<FlatListItem>) => {
    if (item.type === 'header') {
      // Section headers - non-draggable, non-interactive
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>{item.title}</Text>
        </View>
      );
    }
    
    const list = item.data;
    const isDraggable = !list.is_system;
    
    return (
      <ScaleDecorator>
        <TouchableOpacity
          style={[
            styles.listRow,
            isActive && styles.listRowDragging,
          ]}
          onPress={() => handleSelectList(list)}
          onLongPress={isDraggable ? drag : undefined}
          delayLongPress={isDraggable ? VALIDATION.DELAYS.LONG_PRESS_DRAG : undefined}
          activeOpacity={0.7}
          disabled={isActive}
        >
          <View style={styles.listIcon}>
            <Text style={styles.listIconText}>{list.icon || '📋'}</Text>
            {list.is_pinned && !list.is_system && (
              <View style={styles.pinBadge}>
                <Text style={styles.pinBadgeText}>📌</Text>
              </View>
            )}
          </View>
          <View style={styles.listContent}>
            <Text style={styles.listName}>{list.name}</Text>
            <Text style={styles.listSubtext}>
              {isDraggable ? 'Long-press to reorder • ' : ''}Tap to open
            </Text>
          </View>
          
          {/* TICKET 11A: Action menu button (⋯) - only for user lists */}
          {!list.is_system && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                handleShowActionMenu(list);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.actionButtonText}>⋯</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

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
      const checklist = item;
      return (
        <TouchableOpacity
          style={styles.checklistRow}
          onPress={() => setSelectedChecklist(checklist)}
          onLongPress={() => handleChecklistLongPress(checklist)}
          activeOpacity={0.7}
          delayLongPress={VALIDATION.DELAYS.LONG_PRESS_MENU}
        >
          <View style={styles.checklistIcon}>
            <Text style={styles.checklistIconText}>☑️</Text>
          </View>
          <View style={styles.checklistContent}>
            <Text style={styles.checklistTitle}>{checklist.title}</Text>
            <Text style={styles.checklistStats}>
              {checklist.checked_count} / {checklist.total_count} completed
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
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
              delayLongPress={VALIDATION.DELAYS.LONG_PRESS_MENU}
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

  const renderEmptyLists = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No lists yet</Text>
      <Text style={styles.emptySubtext}>
        Lists help you organize related items.{'\n'}
        Create a list like "Groceries" or "Work" to get started.
      </Text>
    </View>
  );

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
          <Text style={styles.backButtonText}>‹ Back</Text>
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
        <ScrollView
          contentContainerStyle={styles.entriesList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefreshEntries}
              tintColor="#3b82f6"
              colors={['#3b82f6']}
            />
          }
        >
          {entries.length === 0 ? (
            renderEmptyEntries()
          ) : (
            entries.map(entry => (
              <View key={entry.id}>
                {renderEntry({ item: entry })}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Hide FAB in Unsorted - users should organize items, not add directly */}
      {selectedList && !selectedList.is_system && (
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
      )}
    </View>
  );

  // Checklist detail screen (full screen)
  if (selectedChecklist) {
    return (
      <ChecklistScreen
        checklistId={selectedChecklist.id}
        onBack={() => {
          setSelectedChecklist(null);
          if (selectedList) {
            loadEntries(selectedList.id);
          }
        }}
      />
    );
  }

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

  if (selectedList) {
    return (
      <>
        {renderListDetail()}

        {/* Entry Creation Modal */}
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
              }}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={e => e.stopPropagation()}
              >
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
                    {entryType === 'task' ? 'Add Task' : entryType === 'note' ? 'Add Note' : 'Add Checklist'}
                  </Text>

                  <TextInput
                    style={styles.input}
                    placeholder={entryType === 'task' ? 'Task title' : entryType === 'note' ? 'Note title' : 'Checklist title'}
                    value={newEntryTitle}
                    onChangeText={setNewEntryTitle}
                    autoFocus
                    returnKeyType={entryType === 'note' ? 'next' : 'done'}
                    onSubmitEditing={entryType === 'task' || entryType === 'checklist' ? handleCreateEntry : undefined}
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
                      <Text style={styles.checklistItemsLabel}>Items</Text>
                      {newChecklistItems.map((item, index) => (
                        <View key={index} style={styles.checklistItemRow}>
                          <TextInput
                            style={styles.checklistItemInput}
                            placeholder={`Item ${index + 1}`}
                            value={item}
                            onChangeText={(value) => handleUpdateChecklistItem(index, value)}
                          />
                          {newChecklistItems.length > 1 && (
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
                      <Text style={styles.buttonCreateText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>

        {/* TICKET 9D: Move to List Modal */}
        <Modal
          visible={moveModalVisible}
          animationType="fade"
          transparent
          onRequestClose={handleCloseMoveModal}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={handleCloseMoveModal}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={e => e.stopPropagation()}
            >
              <View style={styles.listPickerContent}>
                {moveModalMode === 'select-list' ? (
                  <>
                    <Text style={styles.listPickerTitle}>Move to List</Text>
                    
                    {/* New List option */}
                    <TouchableOpacity
                      style={styles.listPickerItem}
                      onPress={handleSwitchToNewListMode}
                    >
                      <Text style={[styles.listPickerItemText, styles.newListOption]}>➕ New List</Text>
                    </TouchableOpacity>
                    
                    {/* Existing lists */}
                    <ScrollView style={styles.listPickerScroll}>
                      {availableListsForMove.map(list => (
                        <TouchableOpacity
                          key={list.id}
                          style={[
                            styles.listPickerItem,
                            moveTargetList?.id === list.id && styles.listPickerItemSelected,
                          ]}
                          onPress={() => setMoveTargetList(list)}
                        >
                          <Text style={styles.listPickerItemText}>
                            {list.icon || '📋'} {list.name}
                          </Text>
                          {moveTargetList?.id === list.id && (
                            <Text style={styles.selectedCheck}>✓</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    
                    <View style={styles.moveModalButtons}>
                      <TouchableOpacity
                        style={styles.listPickerCancelButton}
                        onPress={handleCloseMoveModal}
                      >
                        <Text style={styles.listPickerCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[
                          styles.moveConfirmButton,
                          !moveTargetList && styles.buttonDisabled,
                        ]}
                        onPress={handleConfirmMove}
                        disabled={!moveTargetList}
                      >
                        <Text style={styles.moveConfirmText}>Move</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    {/* New List Creation Mode */}
                    <TouchableOpacity
                      style={styles.backButton}
                      onPress={handleBackToSelectList}
                    >
                      <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>

                    <Text style={styles.listPickerTitle}>New List</Text>

                    <TextInput
                      style={styles.input}
                      placeholder="List name"
                      value={moveNewListName}
                      onChangeText={setMoveNewListName}
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={handleCreateNewListForMove}
                    />

                    <View style={styles.moveModalButtons}>
                      <TouchableOpacity
                        style={styles.listPickerCancelButton}
                        onPress={handleBackToSelectList}
                      >
                        <Text style={styles.listPickerCancelText}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.moveConfirmButton,
                          !moveNewListName.trim() && styles.buttonDisabled,
                        ]}
                        onPress={handleCreateNewListForMove}
                        disabled={!moveNewListName.trim()}
                      >
                        <Text style={styles.moveConfirmText}>Create</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
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
          {lists.length === 0 ? (
            renderEmptyLists()
          ) : (
            <DraggableFlatList
              data={flatData}
              renderItem={renderListRow}
              keyExtractor={(item) => item.id}
              onDragEnd={handleDragEnd}
              activationDistance={10}
              contentContainerStyle={styles.listContainer}
            />
          )}

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
                  ref={listNameInputRef}
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

      {/* TICKET 13: Rename List Modal */}
      <Modal
        visible={renameModalVisible}
        animationType="slide"
        transparent
        onRequestClose={handleCloseRenameModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={handleCloseRenameModal}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={e => e.stopPropagation()}
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Rename List</Text>

                <TextInput
                  ref={renameInputRef}
                  style={styles.input}
                  placeholder="List name"
                  value={renameValue}
                  onChangeText={setRenameValue}
                  autoFocus
                  selectTextOnFocus
                  returnKeyType="done"
                  onSubmitEditing={handleRenameList}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.button, styles.buttonCancel]}
                    onPress={handleCloseRenameModal}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.buttonCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.buttonCreate,
                      !renameValue.trim() && styles.buttonDisabled,
                    ]}
                    onPress={handleRenameList}
                    activeOpacity={0.7}
                    disabled={!renameValue.trim()}
                  >
                    <Text style={styles.buttonCreateText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* TICKET 13 FIX: Custom Action Menu (Android) */}
      {actionMenuList && (
        <ActionMenu
          visible={actionMenuVisible}
          onClose={() => {
            setActionMenuVisible(false);
            setActionMenuList(null);
          }}
          title={actionMenuList.name}
          items={(() => {
            const items: ActionMenuItem[] = [];
            
            // Rename (user lists only)
            if (!actionMenuList.is_system) {
              items.push({
                label: 'Rename',
                onPress: () => handleOpenRenameModal(actionMenuList),
              });
            }
            
            // Pin/Unpin (user lists only)
            if (!actionMenuList.is_system) {
              items.push({
                label: actionMenuList.is_pinned ? 'Unpin' : 'Pin to Top',
                onPress: () => handleTogglePin(actionMenuList),
              });
            }
            
            // Delete (always available)
            items.push({
              label: 'Delete List',
              onPress: () => handleDeleteList(actionMenuList),
              destructive: true,
            });
            
            return items;
          })()}
        />
      )}

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
  // TICKET 11A: Drag feedback
  listRowDragging: {
    opacity: 0.9,
    transform: [{ scale: 1.03 }],
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
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
  pinBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  pinBadgeText: { fontSize: 12 },
  sectionHeader: {
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 0.5,
  },
  listContent: { flex: 1 },
  listName: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  listSubtext: { fontSize: 14, color: '#9ca3af' },
  // TICKET 11A: Action button (⋯)
  actionButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 24,
    color: '#9ca3af',
    fontWeight: '600',
  },
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
  checklistRow: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  checklistIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checklistIconText: {
    fontSize: 18,
  },
  checklistContent: {
    flex: 1,
  },
  checklistTitle: {
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 4,
    fontWeight: '500',
  },
  checklistStats: {
    fontSize: 14,
    color: '#92400e',
  },
  chevron: {
    fontSize: 24,
    color: '#9ca3af',
    marginLeft: 8,
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
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
  checklistItemsContainer: { marginBottom: 16 },
  checklistItemsLabel: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  checklistItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checklistItemInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  removeItemButton: {
    marginLeft: 8,
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeItemText: {
    fontSize: 18,
    color: '#dc2626',
  },
  addItemButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addItemText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  // Move to List Modal styles
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listPickerItemSelected: {
    backgroundColor: '#eff6ff',
  },
  listPickerItemText: { fontSize: 16, color: '#1a1a1a' },
  newListOption: { color: '#3b82f6', fontWeight: '600' },
  selectedCheck: { fontSize: 18, color: '#3b82f6', fontWeight: 'bold' },
  listPickerCancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  listPickerCancelText: { color: '#6b7280', fontSize: 16, fontWeight: '600' },
  moveModalButtons: {
    flexDirection: 'row',
    marginTop: 16,
  },
  moveConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  moveConfirmText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
