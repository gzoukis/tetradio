import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import ChecklistItemRow from '../components/ChecklistItemRow';
import { 
  getChecklist, 
  getChecklistItems, 
  updateChecklist,
  createChecklistItem,
  toggleChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
} from '../db/operations';
import type { Checklist, ChecklistItem } from '../types/models';

interface ChecklistScreenProps {
  checklistId: string;
  onBack: () => void;
}

/**
 * ChecklistScreen
 * 
 * Full detail view for managing a checklist and its items
 * 
 * Features:
 * - Editable checklist title (tap to edit inline)
 * - List of all checklist items
 * - Toggle item completion
 * - Inline edit item title
 * - Delete items
 * - Add new items
 * - Pull-to-refresh
 * 
 * Navigation:
 * - Opened via navigation push from CollectionsScreen
 * - Back arrow returns to collection
 * 
 * Completion:
 * - All items checked = checklist complete (derived, not stored)
 * - Checked items remain visible (no hiding)
 */
export default function ChecklistScreen({ checklistId, onBack }: ChecklistScreenProps) {
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Checklist title editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState('');
  const titleInputRef = useRef<TextInput>(null);
  
  // Item editing
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState('');
  const itemInputRef = useRef<TextInput>(null);
  
  // New item input
  const [newItemText, setNewItemText] = useState('');

  useEffect(() => {
    loadChecklistData();
  }, [checklistId]);

  const loadChecklistData = async () => {
    try {
      setLoading(true);
      const [checklistData, itemsData] = await Promise.all([
        getChecklist(checklistId),
        getChecklistItems(checklistId),
      ]);
      
      if (!checklistData) {
        Alert.alert('Error', 'Checklist not found');
        onBack();
        return;
      }
      
      setChecklist(checklistData);
      setItems(itemsData);
      setTitleText(checklistData.title);
    } catch (error) {
      console.error('Failed to load checklist:', error);
      Alert.alert('Error', 'Unable to load checklist');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadChecklistData();
    setRefreshing(false);
  };

  // Checklist title editing
  const handleStartEditTitle = () => {
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 100);
  };

  const handleSaveTitle = async () => {
    const trimmed = titleText.trim();
    
    if (!trimmed) {
      Alert.alert('Empty Title', 'Please enter a title for the checklist.', [
        {
          text: 'OK',
          onPress: () => setTimeout(() => titleInputRef.current?.focus(), 100),
        },
      ]);
      return;
    }

    try {
      await updateChecklist({ id: checklistId, title: trimmed });
      setEditingTitle(false);
      await loadChecklistData();
    } catch (error) {
      console.error('Failed to update checklist title:', error);
      Alert.alert('Error', 'Unable to update title');
    }
  };

  // Item operations
  const handleToggleItem = async (item: ChecklistItem) => {
    try {
      await toggleChecklistItem(item.id, item.checked);
      await loadChecklistData();
    } catch (error) {
      console.error('Failed to toggle item:', error);
      Alert.alert('Error', 'Unable to update item');
    }
  };

  const handleStartEditItem = (item: ChecklistItem) => {
    setEditingItemId(item.id);
    setEditingItemText(item.title);
  };

  const handleSaveEditItem = async (itemId: string) => {
    const trimmed = editingItemText.trim();
    
    if (!trimmed) {
      Alert.alert('Empty Item', 'Please enter text for the item.', [
        {
          text: 'OK',
          onPress: () => setTimeout(() => itemInputRef.current?.focus(), 100),
        },
      ]);
      return;
    }

    try {
      await updateChecklistItem({ id: itemId, title: trimmed });
      setEditingItemId(null);
      setEditingItemText('');
      await loadChecklistData();
    } catch (error) {
      console.error('Failed to update item:', error);
      Alert.alert('Error', 'Unable to update item');
    }
  };

  const handleDeleteItem = (item: ChecklistItem) => {
    Alert.alert(
      'Delete Item',
      `Delete "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChecklistItem(item.id);
              await loadChecklistData();
            } catch (error) {
              console.error('Failed to delete item:', error);
              Alert.alert('Error', 'Unable to delete item');
            }
          },
        },
      ]
    );
  };

  const handleAddItem = async () => {
    const trimmed = newItemText.trim();
    
    if (!trimmed) {
      return; // Silently ignore empty input
    }

    try {
      await createChecklistItem({
        checklist_id: checklistId,
        title: trimmed,
        checked: false,
      });
      setNewItemText('');
      await loadChecklistData();
    } catch (error) {
      console.error('Failed to add item:', error);
      Alert.alert('Error', 'Unable to add item');
    }
  };

  const renderItem = ({ item }: { item: ChecklistItem }) => {
    const isEditing = editingItemId === item.id;

    if (isEditing) {
      return (
        <View style={styles.editItemContainer}>
          <View style={styles.checkboxPlaceholder} />
          <TextInput
            ref={itemInputRef}
            style={styles.editInput}
            value={editingItemText}
            onChangeText={setEditingItemText}
            onBlur={() => handleSaveEditItem(item.id)}
            onSubmitEditing={() => handleSaveEditItem(item.id)}
            autoFocus
            returnKeyType="done"
          />
        </View>
      );
    }

    return (
      <ChecklistItemRow
        item={item}
        onToggle={() => handleToggleItem(item)}
        onTitlePress={() => handleStartEditItem(item)}
        onLongPress={() => handleDeleteItem(item)}
      />
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No items yet</Text>
      <Text style={styles.emptySubtext}>Add items below to get started</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </View>
    );
  }

  if (!checklist) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header with back button and editable title */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        {editingTitle ? (
          <TextInput
            ref={titleInputRef}
            style={styles.titleInput}
            value={titleText}
            onChangeText={setTitleText}
            onBlur={handleSaveTitle}
            onSubmitEditing={handleSaveTitle}
            autoFocus
            returnKeyType="done"
          />
        ) : (
          <TouchableOpacity onPress={handleStartEditTitle} style={styles.titleContainer}>
            <Text style={styles.title}>{checklist.title}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Items list */}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#3b82f6"
            colors={['#3b82f6']}
          />
        }
      />

      {/* Add item input */}
      <View style={styles.addItemContainer}>
        <TextInput
          style={styles.addItemInput}
          placeholder="+ Add item"
          value={newItemText}
          onChangeText={setNewItemText}
          onSubmitEditing={handleAddItem}
          returnKeyType="done"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
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
  titleContainer: {
    paddingVertical: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 6,
    padding: 8,
    backgroundColor: '#fff',
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  editItemContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  checkboxPlaceholder: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  editInput: {
    flex: 1,
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
  },
  emptyText: {
    fontSize: 18,
    color: '#9ca3af',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  addItemContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 16,
  },
  addItemInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 48,
  },
});
