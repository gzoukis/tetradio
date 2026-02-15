import DatePickerButton from '../components/DatePickerButton';
import CreateEntryModal, { CreateEntryPayload } from '../components/CreateEntryModal';
import InputModal from '../components/InputModal';
import SelectionMenu, { SelectionOption } from '../components/SelectionMenu';
import SmartSectionCard from '../components/SmartSectionCard';
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getAllActiveTasks, getAllCollections, createTask, createNote, getOrCreateUnsortedCollection, createCollection } from '../db/operations';
import { createChecklistWithItems } from '../db/operations';
import type { TaskWithCollectionName } from '../db/operations';
import type { Collection } from '../types/models';
import { groupTasksByTime } from '../utils/timeClassification';
import { getPriorityLabel } from '../utils/formatting';
import type { TaskFilter } from '../types/filters';
import { colors, spacing, typography, elevation, borderRadius, sizes, opacity } from '../theme/tokens';

type QuickCreateMode = 'entry' | 'new-collection';

export default function OverviewScreen({
  onViewTasks,
  goToCollections,
}: {
  onViewTasks: (filter?: TaskFilter) => void;
  goToCollections: (collectionId?: string) => void;
}) {
  const [tasks, setTasks] = useState<TaskWithCollectionName[]>([]);
  const [pinnedCollections, setPinnedCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Quick Create Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [quickCreateMode, setQuickCreateMode] = useState<QuickCreateMode>('entry');
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  
  // Collections for picker
  const [allCollections, setAllCollections] = useState<Collection[]>([]);
  const [collectionPickerVisible, setCollectionPickerVisible] = useState(false);
  
  // New collection creation
  const [newCollectionName, setNewCollectionName] = useState('');

  useEffect(() => {
    loadTasks();
    loadCollections();
    loadPinnedCollections();
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
  
  const loadCollections = async () => {
    try {
      const collections = await getAllCollections();
      console.log(`�‹ Loaded ${collections.length} total collections from database`);
      
      // Show ONLY user collections in the picker (not system collections like Unsorted)
      // Unsorted should only appear in Collections screen, not in the picker
      const userCollections = collections.filter(l => !l.is_archived && !l.is_system);
      
      console.log(`✅ User collections for picker: ${userCollections.length}`);
      userCollections.forEach(collection => {
        console.log(`  - ${collection.icon} ${collection.name}`);
      });
      
      setAllCollections(userCollections);
    } catch (error) {
      console.error('âŒ Failed to load collections:', error);
    }
  };

  const loadPinnedCollections = async () => {
    try {
      const collections = await getAllCollections();
      const pinned = collections.filter(l => l.is_pinned && !l.is_system && !l.is_archived)
        .sort((a, b) => a.sort_order - b.sort_order);
      setPinnedCollections(pinned);
    } catch (error) {
      console.error('Failed to load pinned collections:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    await loadCollections();
    await loadPinnedCollections();
    setRefreshing(false);
  };
  

  const handleOpenQuickCreate = () => {
    setQuickCreateMode('entry');
    setSelectedCollection(null);
    setNewCollectionName('');
    setModalVisible(true);
  };
  
  const handleCloseModal = () => {
    setModalVisible(false);
    setQuickCreateMode('entry');
  };
  
  const handleSwitchToNewCollection = () => {
    setQuickCreateMode('new-collection');
  };
  
  const handleBackToEntry = () => {
    setQuickCreateMode('entry');
  };
  
  const handleCreateNewCollection = async () => {
    const trimmedName = newCollectionName.trim();
    if (!trimmedName) {
      Alert.alert('Empty Name', 'Please enter a collection name.');
      return;
    }
    
    try {
      const newCollection = await createCollection({
        name: trimmedName,
        sort_order: allCollections.length,
        is_pinned: false,
        is_archived: false,
      });
      
      setAllCollections([...allCollections, newCollection]);
      setSelectedCollection(newCollection);
      setNewCollectionName('');
      setQuickCreateMode('entry');
    } catch (error) {
      console.error('Failed to create collection:', error);
      Alert.alert('Error', 'Unable to create collection. Please try again.');
    }
  };
  
  const handleCreateEntry = async (payload: CreateEntryPayload) => {
    try {
      let collectionId: string | null = payload.collectionId ?? null;
      
      if (!collectionId) {
        const unsortedCollection = await getOrCreateUnsortedCollection();
        collectionId = unsortedCollection.id;
      }
      
      if (payload.type === 'task') {
        await createTask({
          title: payload.title,
          collection_id: collectionId,
          due_date: payload.dueDate ?? undefined,
          calm_priority: payload.priority ?? 2,
          completed: false,
        });
      } else if (payload.type === 'note') {
        await createNote({
          title: payload.title,
          notes: payload.noteBody || undefined,
          collection_id: collectionId,
        });
      } else if (payload.type === 'checklist') {
        await createChecklistWithItems({
          title: payload.title,
          collection_id: collectionId,
          items: payload.checklistItems || [],
        });
      }
      
      handleCloseModal();
      await loadTasks();
      await loadCollections();
    } catch (error) {
      console.error('Failed to create entry:', error);
      Alert.alert('Error', 'Unable to create entry. Please try again.');
    }
  };

  const grouped = groupTasksByTime(tasks);

  // TICKET 17C.1: Organize section logic - NO DUPLICATION
  // Clean mental model:
  // - Time sections (Today/Upcoming/Overdue) = Execution (what to do when)
  // - Organize section = Structure (what needs planning)
  // 
  // Organize shows ONLY:
  // 1. Tasks with NO due date (any collection)
  // 
  // Organize does NOT show:
  // - Tasks with due dates (even if Unsorted)
  // - Those appear in time-based sections with "No collection" metadata
  const organizeTasks = useMemo(() => {
    // Simply use grouped.no_date - no duplication
    return grouped.no_date;
  }, [grouped.no_date]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading overview...</Text>
      </View>
    );
  }

  return (
    <>
      {/* TICKET 17C: Metallic notebook cover gradient */}
      <LinearGradient
        colors={colors.overviewGradient}
        style={styles.gradientContainer}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.textOnDark}
              colors={[colors.accentPrimary]}
            />
          }
        >
        {/* TICKET 17B: Tetradio Notebook-Style Smart Section Cards */}
        
        {/* Needs Attention (Overdue) - FIX 2: Only show if overdue tasks exist */}
        {grouped.overdue.length > 0 && (
          <SmartSectionCard
            title="🔴 Needs Attention"
            count={grouped.overdue.length}
            tasks={grouped.overdue}
            filter="overdue"
            onPress={onViewTasks}
            accent="urgent"
            emptyMessage="All clear. Nothing overdue."
          />
        )}

        {/* Focus Today */}
        <SmartSectionCard
          title="⭐ Focus Today"
          count={grouped.today.length}
          tasks={grouped.today}
          filter="today"
          onPress={onViewTasks}
          emptyMessage="Nothing scheduled for today."
        />

        {/* Coming Up (Upcoming) */}
        <SmartSectionCard
          title="⏳ Coming Up"
          count={grouped.upcoming.length}
          tasks={grouped.upcoming}
          filter="upcoming"
          onPress={onViewTasks}
          emptyMessage="No upcoming tasks yet."
        />

        {/* Organize (No Date + Completed Count) */}
        <SmartSectionCard
          title="📁 Organize"
          count={organizeTasks.length}
          tasks={organizeTasks}
          filter="no-date"
          onPress={onViewTasks}
          emptyMessage="Everything is organized."
          subtitle={grouped.completed.length > 0 
            ? `${grouped.completed.length} completed task${grouped.completed.length === 1 ? '' : 's'}`
            : undefined
          }
        />

        {/* Pinned Collections */}
        {pinnedCollections.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              📌 Pinned Collections ({pinnedCollections.length})
            </Text>
            {pinnedCollections.map(collection => (
              <TouchableOpacity
                key={collection.id}
                style={styles.pinnedListRow}
                onPress={() => goToCollections(collection.id)}
                activeOpacity={opacity.touchActive}
                accessibilityRole="button"
                accessibilityLabel={`Open ${collection.name} collection`}
              >
                <Text style={styles.pinnedListIcon}>{collection.icon || '📋'}</Text>
                <Text style={styles.pinnedListName}>{collection.name}</Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📌 Pinned Collections</Text>
            <Text style={styles.emptyMessage}>
              No pinned collections yet. Long-press a collection in the Collections tab to pin it.
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
        activeOpacity={opacity.touchActive}
        accessibilityRole="button"
        accessibilityLabel="Create new task or note"
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      </LinearGradient>

      {/* Quick Create Modal - Entry Mode */}
      {quickCreateMode === 'entry' && (
        <CreateEntryModal
          visible={modalVisible}
          onClose={handleCloseModal}
          onSubmit={handleCreateEntry}
          allowCollectionSelection={true}
          allowNoCollection={true}
          selectedCollection={selectedCollection}
          onCollectionPickerOpen={() => setCollectionPickerVisible(true)}
        />
      )}

      {/* Quick Create Modal - New Collection Mode */}
      {quickCreateMode === 'new-collection' && (
        <InputModal
          visible={modalVisible}
          onClose={handleBackToEntry}
          title="New Collection"
          placeholder="Collection name"
          value={newCollectionName}
          onChangeText={setNewCollectionName}
          onSubmit={handleCreateNewCollection}
          submitLabel="Create"
        />
      )}

      {/* Collection Picker Modal */}
      <SelectionMenu
        visible={collectionPickerVisible}
        onClose={() => setCollectionPickerVisible(false)}
        title="Select Collection"
        options={[
          { label: '➕ New Collection', value: 'new', primary: true },
          ...allCollections.map(c => ({
            label: `${c.icon || '📋'} ${c.name}`,
            value: c.id,
          })),
        ]}
        onSelect={(value) => {
          if (value === 'new') {
            setCollectionPickerVisible(false);
            handleSwitchToNewCollection();
          } else {
            const collection = allCollections.find(c => c.id === value);
            setSelectedCollection(collection || null);
            setCollectionPickerVisible(false);
          }
        }}
        selectedValue={selectedCollection?.id}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // TICKET 17C: Metallic notebook cover - gradient container
  gradientContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.screenPadding,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  pageTitle: {
    ...typography.pageTitle,
    color: colors.textOnDark,
    marginBottom: 4,
  },
  pageSubtitle: {
    ...typography.pageSubtitle,
    color: colors.textLight,
    marginBottom: 24,
  },
  section: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.card,
    padding: spacing.cardPadding,
    marginBottom: spacing.cardGap,
    marginHorizontal: spacing.sectionMarginHorizontal,
  },
  sectionOverdue: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: colors.accentUrgent,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    marginBottom: 12,
  },
  pinnedListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    minHeight: spacing.minTouchTarget,  // TICKET 17C: Accessibility
  },
  pinnedListIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  pinnedListName: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 20,
    color: colors.textMuted,
  },
  taskPreview: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  taskPreviewTitle: {
    fontSize: 15,
  },
  taskPreviewList: {
    ...typography.meta,
    color: colors.textMuted,
    marginTop: 2,
  },
  viewAllButton: {
    marginTop: 12,
  },
  viewAllText: {
    color: colors.accentPrimary,
    fontWeight: '600',
  },
  emptyMessage: {
    fontStyle: 'italic',
    color: colors.textMuted,
  },
  hintSection: {
    backgroundColor: '#f3f4f6',
    borderRadius: borderRadius.button,
    padding: 12,
    marginBottom: 12,
  },
  hintText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  
  // TICKET 17C: FAB with tokens and elevation
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    ...sizes.fab,
    borderRadius: borderRadius.fab,
    backgroundColor: colors.fabBackground,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.fab,
  },
  fabText: {
    ...typography.fabIcon,
    color: colors.fabIcon,
  },
  
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
    borderRadius: 16,
    minWidth: 300,
    maxWidth: 400,
    width: '90%',
    maxHeight: '80%',  // More conservative for button visibility
  },
  modalContentInner: {
    padding: 24,  // Equal padding all around
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
    minWidth: 300,
    maxWidth: 400,
    width: '90%',
    maxHeight: '70%',  // Back to 70%, works with explicit scroll height
    overflow: 'hidden',
  },
  listPickerTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  listPickerScroll: {
    maxHeight: 250,  // Explicit height, allows scrolling
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
