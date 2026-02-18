import DatePickerButton from '../components/DatePickerButton';
import NoteEditor from '../components/NoteEditor';
import ChecklistScreen from './ChecklistScreen';
import ActionMenu, { ActionMenuItem } from '../components/ActionMenu';
import SelectionMenu, { SelectionOption } from '../components/SelectionMenu';
import InputModal from '../components/InputModal';
import MoveToCollectionModal from '../components/MoveToCollectionModal';
import CreateEntryModal, { CreateEntryPayload } from '../components/CreateEntryModal';
import NotebookLayer from '../components/NotebookLayer';
import { useNotebookModeContext } from '../context/NotebookModeContext';
import { colors } from '../theme/tokens';
import { EntryType } from '../components/TypeSelector';
import { Priority } from '../components/PrioritySelector';
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
  Animated,
  AccessibilityInfo,
} from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { getAllCollections, createCollection, deleteCollection, getActiveEntriesCountByCollectionId, archiveCollection, moveEntryToCollection, toggleCollectionPin, updateCollectionSortOrders, renameCollection, updateEntrySortOrders } from '../db/operations';
import { getTasksByCollectionId, createTask, deleteTask, updateTask } from '../db/operations';
import { getNotesByCollectionId, createNote, deleteNote, updateNote } from '../db/operations';
import { getChecklistsByCollectionId, createChecklist, createChecklistWithItems, deleteChecklist } from '../db/operations';
import type { Collection, Task, Note, ChecklistWithStats } from '../types/models';
import { getPriorityLabel, getPriorityStyle } from '../utils/formatting';
import { getUserFriendlyError, VALIDATION, normalizeNameCanonical } from '../utils/validation';
import { patterns } from '../animations/motion';

type CollectionEntry = Task | Note | ChecklistWithStats;
type MoveModalMode = 'select-collection' | 'new-collection';

// TICKET 11A: Flattened data model for drag & drop
type FlatCollectionItem = 
  | { type: 'header'; title: string; id: string }
  | { type: 'collection'; data: Collection; id: string };

export default function CollectionsScreen({
  initialCollectionId,
  onCollectionIdChange,
  onBack,
  isActive = true,
}: {
  initialCollectionId?: string;
  onCollectionIdChange?: (collectionId: string | undefined) => void;
  onBack?: () => void;
  isActive?: boolean;
}) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [flatData, setFlatData] = useState<FlatCollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true); // TICKET 17F.1
  const [modalVisible, setModalVisible] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  
  // TICKET 18A: Notebook mode
  const { mode: notebookMode } = useNotebookModeContext();

  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [entries, setEntries] = useState<CollectionEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  
  const [entryModalVisible, setEntryModalVisible] = useState(false);

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingEntryTitle, setEditingEntryTitle] = useState('');
  const entryEditInputRef = useRef<TextInput>(null);
  
  // TICKET 12 FINAL: Input ref for UX affordances (focus on error)
  const collectionNameInputRef = useRef<TextInput>(null);

  const [editingNote, setEditingNote] = useState<Note | null>(null);
  
  // Checklist navigation state
  const [selectedChecklist, setSelectedChecklist] = useState<ChecklistWithStats | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  // TICKET 9D: Move to Collection state
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [moveModalMode, setMoveModalMode] = useState<MoveModalMode>('select-collection');
  const [entryToMove, setEntryToMove] = useState<CollectionEntry | null>(null);
  const [moveTargetCollection, setMoveTargetCollection] = useState<Collection | null>(null);
  const [moveNewCollectionName, setMoveNewCollectionName] = useState('');
  const [availableCollectionsForMove, setAvailableCollectionsForMove] = useState<Collection[]>([]);

  // TICKET 13: Rename Collection state
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renamingCollection, setRenamingCollection] = useState<Collection | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<TextInput>(null);

  // TICKET 13 FIX: Custom action menu state
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [actionMenuCollection, setActionMenuCollection] = useState<Collection | null>(null);
  const [priorityMenuVisible, setPriorityMenuVisible] = useState(false);
  const [selectedTaskForPriority, setSelectedTaskForPriority] = useState<Task | null>(null);

  // TICKET 17F.1: Mount animation and scroll preservation
  const [reduceMotion, setReduceMotion] = useState(false);
  const hasMountedRef = useRef(false);
  const listFadeAnim = useRef(new Animated.Value(0)).current;
  const listSlideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    // Check reduced motion
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      setReduceMotion(enabled);
    });
    
    loadCollections();
  }, []);
  
  // TICKET 17F.1: Reload when screen becomes active
  const prevActive = useRef(isActive);
  useEffect(() => {
    if (isActive && !prevActive.current) {
      console.log('📱 Collections became active, reloading data');
      loadCollections();
    }
    prevActive.current = isActive;
  }, [isActive]);
  
  // TICKET 17F.1: Trigger mount animation on FIRST ACTIVE state
  useEffect(() => {
    if (!loading && collections.length > 0 && !hasMountedRef.current && !reduceMotion && isActive) {
      console.log('🎬 Triggering Collections list mount animation');
      hasMountedRef.current = true;
      
      Animated.parallel([
        Animated.timing(listFadeAnim, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(listSlideAnim, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();
    } else if ((hasMountedRef.current || reduceMotion) && collections.length > 0) {
      // Only set to 1 if already animated or reduced motion
      listFadeAnim.setValue(1);
      listSlideAnim.setValue(0);
    }
  }, [loading, collections.length, reduceMotion, isActive]);
  
  useEffect(() => {
    if (selectedCollection) {
      loadEntries(selectedCollection.id);
    }
  }, [selectedCollection]);

  // Handle navigation from Overview with initialCollectionId
  useEffect(() => {
    if (initialCollectionId && collections.length > 0) {
      const collection = collections.find(l => l.id === initialCollectionId);
      if (collection) {
        setSelectedCollection(collection);
      }
    }
  }, [initialCollectionId, collections]);

  const loadCollections = async () => {
    try {
      setLoading(true);
      const allCollections = await getAllCollections();
      console.log(`📋 CollectionsScreen: Got ${allCollections.length} collections from getAllCollections()`);
      
      const activeCollections = allCollections.filter(collection => !collection.is_archived);
      console.log(`✅ CollectionsScreen: Filtered to ${activeCollections.length} active collections`);
      activeCollections.forEach(collection => {
        console.log(`  - ${collection.icon || '?'} ${collection.name} ${collection.is_system ? '[SYSTEM]' : '[USER]'}`);
      });
      
      setCollections(activeCollections);
      
      // TICKET 11A: Build flattened data structure
      buildFlatData(activeCollections);
    } catch (error) {
      console.error('❌ CollectionsScreen: Failed to load collections:', error);
      Alert.alert('Error', 'Unable to load collections. Please try again.');
    } finally {
      setLoading(false);
      setInitialLoad(false); // TICKET 17F.1
    }
  };

  // TICKET 11A: Build flattened data with synthetic headers
  const buildFlatData = (allCollections: Collection[]) => {
    const pinned = allCollections
      .filter(l => l.is_pinned && !l.is_system)
      .sort((a, b) => a.sort_order - b.sort_order);
    
    const unpinned = allCollections
      .filter(l => !l.is_pinned && !l.is_system)
      .sort((a, b) => a.sort_order - b.sort_order);
    
    const systemCollections = allCollections
      .filter(l => l.is_system)
      .sort((a, b) => a.sort_order - b.sort_order);
    
    const flat: FlatCollectionItem[] = [];
    
    if (pinned.length > 0) {
      flat.push({ type: 'header', title: 'PINNED', id: 'header-pinned' });
      pinned.forEach(collection => {
        flat.push({ type: 'collection', data: collection, id: collection.id });
      });
    }
    
    if (unpinned.length > 0 || systemCollections.length > 0) {
      flat.push({ type: 'header', title: 'COLLECTIONS', id: 'header-collections' });
      unpinned.forEach(collection => {
        flat.push({ type: 'collection', data: collection, id: collection.id });
      });
      systemCollections.forEach(collection => {
        flat.push({ type: 'collection', data: collection, id: collection.id });
      });
    }
    
    setFlatData(flat);
  };

  const handleCreateCollection = async () => {
    const trimmedName = newCollectionName.trim();

    if (!trimmedName) {
      Alert.alert('Empty Name', 'Please enter a name for your collection.', [
        {
          text: 'OK',
          onPress: () => {
            // TICKET 12 FINAL: Focus input after user dismisses alert
            setTimeout(() => collectionNameInputRef.current?.focus(), 100);
          },
        },
      ]);
      return;
    }

    try {
      await createCollection({
        name: trimmedName,
        sort_order: collections.length,
        is_pinned: false,
        is_archived: false,
      });

      setNewCollectionName('');
      setModalVisible(false);
      await loadCollections();
    } catch (error) {
      console.error('Failed to create collection:', error);
      
      // TICKET 12 FINAL: User-friendly error with focus affordance
      const message = error instanceof Error ? error.message : getUserFriendlyError(error);
      Alert.alert('Cannot Create Collection', message, [
        {
          text: 'OK',
          onPress: () => {
            // Focus and select text for easy correction
            setTimeout(() => {
              collectionNameInputRef.current?.focus();
              // Select all text so user can easily type new name
              if (Platform.OS === 'ios') {
                collectionNameInputRef.current?.setNativeProps({
                  selection: { start: 0, end: newCollectionName.length },
                });
              }
            }, 100);
          },
        },
      ]);
    }
  };

  const handleDeleteCollection = (collection: Collection) => {
    Alert.alert(
      'Delete Collection',
      `Delete "${collection.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCollection(collection.id);
              if (selectedCollection?.id === collection.id) {
                setSelectedCollection(null);
              }
              await loadCollections();
            } catch (error) {
              console.error('Failed to delete collection:', error);
              Alert.alert('Error', 'Unable to delete collection. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleTogglePin = async (collection: Collection) => {
    try {
      await toggleCollectionPin(collection.id, !collection.is_pinned);
      await loadCollections();
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      Alert.alert('Error', 'Unable to update pin status. Please try again.');
    }
  };

  // TICKET 13: Rename Collection handlers
  const handleOpenRenameModal = (collection: Collection) => {
    setRenamingCollection(collection);
    setRenameValue(collection.name);
    setRenameModalVisible(true);
  };

  const handleCloseRenameModal = () => {
    setRenameModalVisible(false);
    setRenamingCollection(null);
    setRenameValue('');
  };

  const handleRenameCollection = async () => {
    if (!renamingCollection) return;

    const trimmedName = renameValue.trim();

    // Empty name check
    if (!trimmedName) {
      Alert.alert('Empty Name', 'Please enter a name for your collection.', [
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
    if (normalizeNameCanonical(trimmedName) === normalizeNameCanonical(renamingCollection.name)) {
      handleCloseRenameModal();
      return;
    }

    try {
      await renameCollection(renamingCollection.id, trimmedName);
      handleCloseRenameModal();
      await loadCollections();

      // If we renamed the currently selected collection, update the reference
      if (selectedCollection?.id === renamingCollection.id) {
        const updatedCollections = await getAllCollections();
        const updated = updatedCollections.find(l => l.id === renamingCollection.id);
        if (updated) {
          setSelectedCollection(updated);
        }
      }
    } catch (error) {
      console.error('Failed to rename collection:', error);

      // TICKET 12 UX: User-friendly error with focus affordance
      const message = error instanceof Error ? error.message : getUserFriendlyError(error);
      Alert.alert('Cannot Rename Collection', message, [
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
  const handleShowActionMenu = (collection: Collection) => {
    if (Platform.OS === 'ios') {
      // iOS: Use native ActionSheet
      const options = ['Cancel'];
      const actions: (() => void)[] = [];
      
      // TICKET 13: Rename option (not available for system collections)
      if (!collection.is_system) {
        options.push('Rename');
        actions.push(() => handleOpenRenameModal(collection));
      }
      
      // Pin/Unpin option (not available for system collections)
      if (!collection.is_system) {
        options.push(collection.is_pinned ? 'Unpin' : 'Pin to Top');
        actions.push(() => handleTogglePin(collection));
      }
      
      // Delete option
      options.push('Delete Collection');
      actions.push(() => handleDeleteCollection(collection));
      
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
      setActionMenuCollection(collection);
      setActionMenuVisible(true);
    }
  };

  const handleSelectCollection = (collection: Collection) => {
    setEditingEntryId(null);
    setEditingEntryTitle('');
    setSelectedCollection(collection);
  };

  const handleBackToCollections = async () => {
    setSelectedCollection(null);
    setEntries([]);
    setEditingEntryId(null);
    setEditingEntryTitle('');
    // Notify parent that we've returned to collections view
    if (onCollectionIdChange) {
      onCollectionIdChange(undefined);
    }
    // Call onBack to clear parent's selectedCollectionId
    if (onBack) {
      onBack();
    }
    // Refresh collections to reflect any archive changes
    await loadCollections();
  };

  const loadEntries = async (collectionId: string) => {
    try {
      setLoadingEntries(true);
      
      const [tasks, notes, checklists] = await Promise.all([
        getTasksByCollectionId(collectionId),
        getNotesByCollectionId(collectionId),
        getChecklistsByCollectionId(collectionId),
      ]);

      // CRITICAL: Merge all entry types and sort by sort_order
      // Without this, tasks always appear first, then notes, then checklists
      const mixed: CollectionEntry[] = [...tasks, ...notes, ...checklists].sort(
        (a, b) => a.sort_order - b.sort_order
      );

      setEntries(mixed);
    } catch (error) {
      console.error('Failed to load entries:', error);
      Alert.alert('Error', 'Unable to load items. Please try again.');
    } finally {
      setLoadingEntries(false);
    }
  };

  // TICKET 16: Drag & drop handler for entries
  const handleEntriesDragEnd = async ({ data, from, to }: { 
    data: CollectionEntry[]; 
    from: number; 
    to: number 
  }) => {
    // No change if dropped in same position
    if (from === to) {
      return;
    }
    
    // Optimistically update UI
    setEntries(data);
    
    try {
      // Prepare batch update: assign new sort_order based on position
      const updates = data.map((entry, index) => ({
        id: entry.id,
        sort_order: index,
      }));
      
      // Persist to database
      await updateEntrySortOrders(updates);
      
    } catch (error) {
      console.error('❌ Failed to persist entry drag order:', error);
      Alert.alert('Error', 'Unable to save new order. Changes reverted.');
      
      // Revert to original order
      if (selectedCollection) {
        await loadEntries(selectedCollection.id);
      }
    }
  };

  const handleRefreshEntries = async () => {
    if (!selectedCollection) return;
    
    setRefreshing(true);
    await loadEntries(selectedCollection.id);
    setRefreshing(false);
  };

  // TICKET 11A: Drag & drop handler
  const handleDragEnd = async (params: { data: FlatCollectionItem[]; from: number; to: number }) => {
    const { data, from, to } = params;
    
    // If dropped in same position, no update needed
    if (from === to) {
      return;
    }
    
    // Optimistically update UI
    setFlatData(data);
    
    try {
      // Extract collections and determine their new positions
      const updates: { id: string; sort_order: number; is_pinned: boolean }[] = [];
      
      let currentSection: 'pinned' | 'unpinned' | null = null;
      let positionInSection = 0;
      
      for (const item of data) {
        if (item.type === 'header') {
          currentSection = item.title === 'PINNED' ? 'pinned' : 'unpinned';
          positionInSection = 0;
        } else if (item.type === 'collection' && !item.data.is_system) {
          // System collections are never updated
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
      await updateCollectionSortOrders(updates);
      
      // Reload to sync state
      await loadCollections();
      
    } catch (error) {
      console.error('❌ Failed to persist drag order:', error);
      Alert.alert('Error', 'Unable to save new order. Changes reverted.');
      
      // Revert to original order
      await loadCollections();
    }
  };

  const handleCreateEntry = async (payload: CreateEntryPayload) => {
    if (!selectedCollection) {
      Alert.alert('Error', 'No collection selected.');
      return;
    }

    try {
      if (payload.type === EntryType.TASK) {
        await createTask({
          title: payload.title,
          collection_id: selectedCollection.id,
          due_date: payload.dueDate ?? undefined,
          calm_priority: payload.priority ?? Priority.NORMAL,
        });
      } else if (payload.type === EntryType.NOTE) {
        await createNote({
          title: payload.title,
          notes: payload.noteBody || undefined,
          collection_id: selectedCollection.id,
        });
      } else if (payload.type === EntryType.CHECKLIST) {
        await createChecklistWithItems({
          title: payload.title,
          collection_id: selectedCollection.id,
          items: payload.checklistItems || [],
        });
      }

      await loadEntries(selectedCollection.id);
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
      const isUnsorted = selectedCollection?.is_system === true;
      
      await updateTask({
        id: task.id,
        completed: !task.completed,
        completed_at: !task.completed ? Date.now() : undefined,
      });
      
      // Special handling for Unsorted tasks
      if (isUnsorted && !wasCompleted && selectedCollection) {
        // Just completed an Unsorted task
        console.log('🔍 Checking if Unsorted should be archived...');
        
        // Reload entries to get fresh data
        await loadEntries(selectedCollection.id);
        
        // Check if any active (not completed, not deleted) items remain
        const activeCount = await getActiveEntriesCountByCollectionId(selectedCollection.id);
        console.log(`📊 Active entries in Unsorted: ${activeCount}`);
        
        if (activeCount === 0) {
          // No active items left - archive Unsorted and navigate back
          console.log('📦 Last Unsorted item completed, archiving collection and navigating back');
          await archiveCollection(selectedCollection.id);
          handleBackToCollections();
          return;
        } else {
          console.log(`✅ Unsorted collection still has ${activeCount} active items, keeping visible`);
        }
      }
      
      if (selectedCollection) {
        await loadEntries(selectedCollection.id);
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
          options: ['Cancel', 'Move to Collection', 'Change Priority', 'Delete Task'],
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
            text: 'Move to Collection', 
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
      if (selectedCollection) {
        await loadEntries(selectedCollection.id);
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
          options: ['Cancel', 'Move to Collection', 'Delete Note'],
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
            text: 'Move to Collection',
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
          options: ['Cancel', 'Move to Collection', 'Delete Checklist'],
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
            text: 'Move to Collection',
            onPress: () => handleOpenMoveModal(checklist),
          },
        ],
        { cancelable: true }
      );
    }
  };

  const handleSaveNote = async (title: string, body: string) => {
    if (!editingNote || !selectedCollection) return;

    try {
      await updateNote({
        id: editingNote.id,
        title,
        notes: body || undefined,
      });

      setEditingNote(null);
      await loadEntries(selectedCollection.id);
    } catch (error) {
      console.error('Failed to update note:', error);
      throw error; // Re-throw to let NoteEditor handle the error
    }
  };

  const handleCancelNoteEdit = () => {
    setEditingNote(null);
  };

  const handleDeleteEntry = (entry: CollectionEntry) => {
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
              
              if (selectedCollection) {
                await loadEntries(selectedCollection.id);
                // Refresh collections to update Unsorted visibility (it may have been archived if empty)
                await loadCollections();
                
                // If Unsorted is now empty and archived, navigate back to collections
                if (selectedCollection.is_system && entries.length === 1) {
                  // This was the last item, Unsorted will be archived
                  // Navigate back to collections screen
                  handleBackToCollections();
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

  const handleStartEditEntry = (entry: CollectionEntry) => {
    setEditingEntryId(entry.id);
    setEditingEntryTitle(entry.title);
  };

  const handleSaveEditEntry = async (entry: CollectionEntry) => {
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

      if (selectedCollection) {
        await loadEntries(selectedCollection.id);
      }
    } catch (error) {
      console.error('Failed to update entry:', error);
      Alert.alert('Error', 'Unable to save changes. Please try again.');
    }
  };

  // TICKET 9D: Move to Collection handlers
  const handleOpenMoveModal = async (entry: CollectionEntry) => {
    setEntryToMove(entry);
    setMoveModalMode('select-collection');
    setMoveTargetCollection(null);
    setNewCollectionName('');

    // Load available collections (exclude current collection and Unsorted)
    try {
      const allCollections = await getAllCollections();
      const available = allCollections.filter(collection => 
        !collection.is_archived && 
        !collection.is_system && 
        collection.id !== selectedCollection?.id
      );
      setAvailableCollectionsForMove(available);
      setMoveModalVisible(true);
    } catch (error) {
      console.error('Failed to load collections for move:', error);
      Alert.alert('Error', 'Unable to load collections. Please try again.');
    }
  };

  const handleCloseMoveModal = () => {
    setMoveModalVisible(false);
    setEntryToMove(null);
    setMoveTargetCollection(null);
    setNewCollectionName('');
    setMoveModalMode('select-collection');
  };

  const handleSwitchToNewCollectionMode = () => {
    setMoveModalMode('new-collection');
  };

  const handleBackToSelectCollection = () => {
    setMoveModalMode('select-collection');
  };

  const handleCreateNewCollectionForMove = async () => {
    const trimmedName = moveNewCollectionName.trim();
    if (!trimmedName) {
      Alert.alert('Empty Name', 'Please enter a collection name.');
      return;
    }

    try {
      const newCollection = await createCollection({
        name: trimmedName,
        sort_order: collections.length,
        is_pinned: false,
        is_archived: false,
      });

      // Add to available collections
      setAvailableCollectionsForMove([...availableCollectionsForMove, newCollection]);
      
      // Select the new collection
      setMoveTargetCollection(newCollection);
      
      // Switch back to select mode
      setNewCollectionName('');
      setMoveModalMode('select-collection');
      
      // Refresh main collections
      await loadCollections();
    } catch (error) {
      console.error('Failed to create collection:', error);
      Alert.alert('Error', 'Unable to create collection. Please try again.');
    }
  };

  const handleConfirmMove = async () => {
    if (!entryToMove || !moveTargetCollection) return;

    try {
      await moveEntryToCollection({
        entryId: entryToMove.id,
        newCollectionId: moveTargetCollection.id,
        sourceCollectionId: selectedCollection?.id,
      });

      console.log(`✅ Moved ${entryToMove.type} to ${moveTargetCollection.name}`);

      // Close modal
      handleCloseMoveModal();

      // Reload current collection
      if (selectedCollection) {
        await loadEntries(selectedCollection.id);
        
        // If collection is now empty and is Unsorted, it will be archived
        // Check if we should navigate back
        const remainingEntries = entries.filter(e => e.id !== entryToMove.id);
        if (selectedCollection.is_system && remainingEntries.length === 0) {
          // Unsorted will be archived, navigate back
          await handleBackToCollections();
        }
      }

      // Refresh collections (in case Unsorted was archived)
      await loadCollections();

      // Show success message
      const entryTypeLabel = entryToMove.type === 'task' ? 'Task' : entryToMove.type === 'note' ? 'Note' : 'Checklist';
      Alert.alert('Moved', `${entryTypeLabel} moved to ${moveTargetCollection.name}`);
    } catch (error) {
      console.error('Failed to move entry:', error);
      Alert.alert('Error', 'Unable to move item. Please try again.');
    }
  };

  // TICKET 11A: Render collection row with drag support
  const renderListRow = ({ item, drag, isActive }: RenderItemParams<FlatCollectionItem>) => {
    if (item.type === 'header') {
      // Section headers - non-draggable, non-interactive
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>{item.title}</Text>
        </View>
      );
    }
    
    const collection = item.data;
    const isDraggable = !collection.is_system;
    
    return (
      <ScaleDecorator>
        <TouchableOpacity
          style={[
            styles.collectionRow,
            isActive && styles.collectionRowDragging,
          ]}
          onPress={() => handleSelectCollection(collection)}
          onLongPress={isDraggable ? drag : undefined}
          delayLongPress={isDraggable ? VALIDATION.DELAYS.LONG_PRESS_DRAG : undefined}
          activeOpacity={0.7}
          disabled={isActive}
        >
          <View style={styles.collectionIcon}>
            <Text style={styles.collectionIconText}>{collection.icon || '📋'}</Text>
            {collection.is_pinned && !collection.is_system && (
              <View style={styles.pinBadge}>
                <Text style={styles.pinBadgeText}>📌</Text>
              </View>
            )}
          </View>
          <View style={styles.collectionContent}>
            <Text style={styles.collectionName}>{collection.name}</Text>
            <Text style={styles.collectionSubtext}>
              {isDraggable ? 'Long-press to reorder • ' : ''}Tap to open
            </Text>
          </View>
          
          {/* TICKET 11A: Action menu button (⋯) - only for user collections */}
          {!collection.is_system && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                handleShowActionMenu(collection);
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

  const renderEntry = ({ 
    item, 
    drag, 
    isActive 
  }: { 
    item: CollectionEntry; 
    drag?: () => void; 
    isActive?: boolean;
  }) => {
    if (item.type === 'note') {
      const note = item;
      return (
        <View style={styles.entryWithMenu}>
          <TouchableOpacity
            onPress={() => !isActive && setEditingNote(note)}
            onLongPress={drag}
            disabled={isActive}
            delayLongPress={200}
            activeOpacity={0.7}
            style={[styles.noteCard, { flex: 1 }]}
          >
            <View style={styles.noteHeader}>
              <View style={styles.noteBadge}>
                <Text style={styles.noteBadgeText}>NOTE</Text>
              </View>
              <Text style={styles.noteTitle}>{note.title}</Text>
            </View>
            {note.notes && (
              <Text style={styles.noteBody} numberOfLines={3}>
                {note.notes}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.entryMenuButton}
            onPress={() => handleNoteLongPress(note)}
            activeOpacity={0.7}
          >
            <Text style={styles.entryMenuIcon}>•••</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (item.type === 'checklist') {
      const checklist = item;
      return (
        <View style={styles.entryWithMenu}>
          <TouchableOpacity
            style={[
              styles.checkcollectionRow, 
              { flex: 1 },
              isActive && styles.entryDragging  // ← Apply shading when active
            ]}
            onPress={() => setSelectedChecklist(checklist)}
            onLongPress={drag}
            disabled={isActive}
            delayLongPress={200}
            activeOpacity={0.7}
          >
            <View style={styles.checkcollectionIcon}>
              <Text style={styles.checkcollectionIconText}>☑️</Text>
            </View>
            <View style={styles.checkcollectionContent}>
              <Text style={styles.checkcollectionTitle}>{checklist.title}</Text>
              <Text style={styles.checklistStats}>
                {checklist.checked_count} / {checklist.total_count} completed
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.entryMenuButton}
            onPress={() => handleChecklistLongPress(checklist)}
            activeOpacity={0.7}
          >
            <Text style={styles.entryMenuIcon}>•••</Text>
          </TouchableOpacity>
        </View>
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

        if (selectedCollection) {
          await loadEntries(selectedCollection.id);
        }
      } catch (error) {
        console.error('Failed to update due date:', error);
        Alert.alert('Error', 'Unable to update date. Please try again.');
      }
    };

    return (
      <View style={styles.entryWithMenu}>
        <View style={[
          styles.taskRow, 
          priorityStyle, 
          { flex: 1 },
          isActive && styles.entryDragging  // ← Apply shading to taskRow
        ]}>
          {/* Checkbox */}
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

          {/* Task content - constrained to left ~50% */}
          <View style={[styles.taskContent, { maxWidth: '50%' }]}>
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
                activeOpacity={0.7}
                style={{ alignSelf: 'flex-start' }}
              >
                <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>
                  {task.title}
                </Text>
                {task.notes && <Text style={styles.taskNotes}>{task.notes}</Text>}
              </TouchableOpacity>
            )}

            {!task.completed && (
              <View style={{ alignSelf: 'flex-start' }}>
                <DatePickerButton
                  value={task.due_date}
                  onChange={handleDateChange}
                  disabled={isEditing}
                />
              </View>
            )}
          </View>
          
          {/* Drag zone - right ~40% empty space for long-press */}
          <TouchableOpacity
            style={styles.taskDragZone}
            onLongPress={drag}
            disabled={isActive}
            delayLongPress={200}
            activeOpacity={1}
          >
            {/* Empty space for dragging */}
          </TouchableOpacity>
        </View>
        
        {/* Menu button */}
        <TouchableOpacity
          style={styles.entryMenuButton}
          onPress={() => handleTaskLongPress(task)}
          activeOpacity={0.7}
        >
          <Text style={styles.entryMenuIcon}>•••</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyCollections = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No collections yet</Text>
      <Text style={styles.emptySubtext}>
        Collections help you organize related items.{'\n'}
        Create a collection like "Groceries" or "Work" to get started.
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

  const renderCollectionDetail = () => (
    <View style={styles.container}>
      <View style={styles.detailHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToCollections}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.detailHeaderContent}>
          <Text style={styles.detailHeaderIcon}>{selectedCollection?.icon || '📋'}</Text>
          <Text style={styles.detailHeaderTitle}>{selectedCollection?.name}</Text>
        </View>
      </View>

      {loadingEntries ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : entries.length === 0 ? (
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
          {renderEmptyEntries()}
        </ScrollView>
      ) : (
        <DraggableFlatList
          data={entries}
          renderItem={({ item, drag, isActive }) => (
            <ScaleDecorator>
              <View style={[isActive && styles.entryDragging]}>
                {renderEntry({ item, drag, isActive })}
              </View>
            </ScaleDecorator>
          )}
          keyExtractor={(item) => item.id}
          onDragEnd={handleEntriesDragEnd}
          containerStyle={styles.entriesList}
          contentContainerStyle={{ paddingBottom: 150 }}
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

      {/* Hide FAB in Unsorted - users should organize items, not add directly */}
      {selectedCollection && !selectedCollection.is_system && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setEntryModalVisible(true)}
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
          if (selectedCollection) {
            loadEntries(selectedCollection.id);
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

  if (selectedCollection) {
    return (
      <>
        {renderCollectionDetail()}

        {/* Entry Creation Modal */}
        <CreateEntryModal
          visible={entryModalVisible}
          onClose={() => setEntryModalVisible(false)}
          onSubmit={handleCreateEntry}
          fixedCollectionId={selectedCollection?.id}
        />

        {/* Move to Collection Modal */}
        <MoveToCollectionModal
          visible={moveModalVisible}
          onClose={handleCloseMoveModal}
          mode={moveModalMode}
          availableCollections={availableCollectionsForMove}
          selectedCollection={moveTargetCollection}
          onSelectCollection={setMoveTargetCollection}
          onSwitchToNewMode={handleSwitchToNewCollectionMode}
          onBackToSelect={handleBackToSelectCollection}
          newCollectionName={moveNewCollectionName}
          onChangeNewCollectionName={setMoveNewCollectionName}
          onConfirmMove={handleConfirmMove}
          onCreateNewCollection={handleCreateNewCollectionForMove}
        />
      </>
    );
  }

  return (
    <View style={styles.container}>
      {/* TICKET 18A: Notebook identity layer — must be first child */}
      <NotebookLayer mode={notebookMode} />

      {loading && initialLoad ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : (
        <>
          {collections.length === 0 ? (
            renderEmptyCollections()
            ) : (
            <Animated.View style={{
              flex: 1,
              opacity: reduceMotion ? 1 : listFadeAnim,
              transform: reduceMotion ? [] : [{
                translateY: listSlideAnim,
              }],
            }}>
              <DraggableFlatList
                data={flatData}
                renderItem={renderListRow}
                keyExtractor={(item) => item.id}
                onDragEnd={handleDragEnd}
                activationDistance={10}
                contentContainerStyle={styles.collectionContainer}
              />
            </Animated.View>
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

      {/* Create Collection Modal */}
      <InputModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setNewCollectionName('');
        }}
        title="Create Collection"
        placeholder="Collection name"
        value={newCollectionName}
        onChangeText={setNewCollectionName}
        onSubmit={handleCreateCollection}
        submitLabel="Create"
        inputRef={collectionNameInputRef}
      />

      {/* Rename Collection Modal */}
      <InputModal
        visible={renameModalVisible}
        onClose={handleCloseRenameModal}
        title="Rename Collection"
        placeholder="Collection name"
        value={renameValue}
        onChangeText={setRenameValue}
        onSubmit={handleRenameCollection}
        submitLabel="Save"
        inputRef={renameInputRef}
        selectTextOnFocus
      />

      {/* TICKET 13 FIX: Custom Action Menu (Android) */}
      {actionMenuCollection && (
        <ActionMenu
          visible={actionMenuVisible}
          onClose={() => {
            setActionMenuVisible(false);
            setActionMenuCollection(null);
          }}
          title={actionMenuCollection?.name || ''}
          items={(() => {
            if (!actionMenuCollection) return [];
            
            const items: ActionMenuItem[] = [];
            
            // Rename (user collections only)
            if (!actionMenuCollection.is_system) {
              items.push({
                label: 'Rename',
                onPress: () => handleOpenRenameModal(actionMenuCollection),
              });
            }
            
            // Pin/Unpin (user collections only)
            if (!actionMenuCollection.is_system) {
              items.push({
                label: actionMenuCollection.is_pinned ? 'Unpin' : 'Pin to Top',
                onPress: () => handleTogglePin(actionMenuCollection),
              });
            }
            
            // Delete (always available)
            items.push({
              label: 'Delete Collection',
              onPress: () => handleDeleteCollection(actionMenuCollection),
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
  container: { flex: 1, backgroundColor: colors.paperBackground },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#666' },
  collectionContainer: { padding: 16, paddingBottom: 100 },
  collectionRow: {
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
  collectionRowDragging: {
    opacity: 0.9,
    transform: [{ scale: 1.03 }],
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  collectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  collectionIconText: { fontSize: 24 },
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
  collectionContent: { flex: 1 },
  collectionName: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  collectionSubtext: { fontSize: 14, color: '#9ca3af' },
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
  entriesList: { padding: 16 },
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
  checkcollectionRow: {
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
  checkcollectionIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkcollectionIconText: {
    fontSize: 18,
  },
  checkcollectionContent: {
    flex: 1,
  },
  
  // TICKET 16: Entry menu button styles (for drag & drop UX)
  entryWithMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  entryMenuButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    padding: 8,
    zIndex: 10,
  },
  entryMenuIcon: {
    fontSize: 20,
    color: '#9ca3af',
    fontWeight: 'bold',
  },
  
  // Dedicated drag zone for tasks (right side empty space)
  taskDragZone: {
    flex: 1,
    minHeight: 60,
    minWidth: 80,
  },
  
  // Inline note card styles (replacing NoteCard component for drag compatibility)
  noteCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteBadge: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 12,
  },
  noteBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78350f',
    letterSpacing: 0.5,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    flex: 1,
  },
  noteBody: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  
  checkcollectionTitle: {
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
    borderRadius: 16,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 28,  // Extra bottom padding for buttons
    minWidth: 300,
    maxWidth: 400,
    width: '90%',
    maxHeight: '80%',
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
  // Move to Collection Modal styles
  collectionPickerContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    minWidth: 300,
    maxWidth: 400,
    width: '90%',
    maxHeight: '70%',  // Back to 70%
    overflow: 'hidden',
  },
  collectionPickerTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  collectionPickerScroll: {
    maxHeight: 250,  // Explicit height, allows scrolling
  },
  collectionPickerItem: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collectionPickerItemSelected: {
    backgroundColor: '#eff6ff',
  },
  collectionPickerItemText: { fontSize: 16, color: '#1a1a1a' },
  newCollectionOption: { color: '#3b82f6', fontWeight: '600' },
  selectedCheck: { fontSize: 18, color: '#3b82f6', fontWeight: 'bold' },
  collectionPickerCancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  collectionPickerCancelText: { color: '#6b7280', fontSize: 16, fontWeight: '600' },
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
  
  // TICKET 16: Drag & drop styling (industry standard: subtle lift + no transparency)
  entryDragging: {
    transform: [{ scale: 1.03 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
    borderRadius: 12,
  },
});
