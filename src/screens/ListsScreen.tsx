import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { getAllLists, createList, deleteList } from '../db/operations';
import type { List } from '../types/models';

export default function ListsScreen() {
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newListName, setNewListName] = useState('');

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    try {
      setLoading(true);
      const allLists = await getAllLists();
      // Filter out archived lists
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

  const renderList = ({ item }: { item: List }) => (
    <TouchableOpacity
      style={styles.listRow}
      onLongPress={() => handleDeleteList(item)}
      activeOpacity={0.7}
    >
      <View style={styles.listIcon}>
        <Text style={styles.listIconText}>{item.icon || '📋'}</Text>
      </View>
      <View style={styles.listContent}>
        <Text style={styles.listName}>{item.name}</Text>
        <Text style={styles.listSubtext}>Long-press to delete</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No lists yet</Text>
      <Text style={styles.emptySubtext}>Tap + to create your first list</Text>
    </View>
  );

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
            ListEmptyComponent={renderEmpty}
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
                    style={[styles.button, styles.buttonCreate]}
                    onPress={handleCreateList}
                    activeOpacity={0.7}
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
  listContainer: {
    padding: 16,
    paddingBottom: 100, // Space for FAB
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
});