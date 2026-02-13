import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import ModalShell from './ModalShell';
import type { Collection } from '../types/models';

type MoveModalMode = 'select-collection' | 'new-collection';

interface MoveToCollectionModalProps {
  visible: boolean;
  onClose: () => void;
  mode: MoveModalMode;
  availableCollections: Collection[];
  selectedCollection: Collection | null;
  onSelectCollection: (collection: Collection) => void;
  onSwitchToNewMode: () => void;
  onBackToSelect: () => void;
  newCollectionName: string;
  onChangeNewCollectionName: (text: string) => void;
  onConfirmMove: () => void;
  onCreateNewCollection: () => void;
}

export default function MoveToCollectionModal({
  visible,
  onClose,
  mode,
  availableCollections,
  selectedCollection,
  onSelectCollection,
  onSwitchToNewMode,
  onBackToSelect,
  newCollectionName,
  onChangeNewCollectionName,
  onConfirmMove,
  onCreateNewCollection,
}: MoveToCollectionModalProps) {
  const isSelectMode = mode === 'select-collection';
  const isDisabled = isSelectMode ? !selectedCollection : !newCollectionName.trim();

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      header={
        <View>
          {!isSelectMode && (
            <TouchableOpacity style={styles.backButton} onPress={onBackToSelect}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.title}>
            {isSelectMode ? 'Move to Collection' : 'New Collection'}
          </Text>
        </View>
      }
      footer={
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.buttonCancel]}
            onPress={isSelectMode ? onClose : onBackToSelect}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonCancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.buttonSubmit,
              isDisabled && styles.buttonDisabled,
            ]}
            onPress={isSelectMode ? onConfirmMove : onCreateNewCollection}
            activeOpacity={0.7}
            disabled={isDisabled}
          >
            <Text style={styles.buttonSubmitText}>
              {isSelectMode ? 'Move' : 'Create'}
            </Text>
          </TouchableOpacity>
        </View>
      }
    >
      {isSelectMode ? (
        <>
          {/* New Collection option */}
          <TouchableOpacity
            style={styles.option}
            onPress={onSwitchToNewMode}
            activeOpacity={0.7}
          >
            <Text style={[styles.optionText, styles.newCollectionText]}>
              ➕ New Collection
            </Text>
          </TouchableOpacity>

          {/* Existing collections list - scrollable */}
          <ScrollView 
            style={styles.collectionsContainer}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {availableCollections.map((collection, index) => {
              const isSelected = selectedCollection?.id === collection.id;
              return (
                <TouchableOpacity
                  key={collection.id}
                  style={[
                    styles.option,
                    isSelected && styles.optionSelected,
                    index === availableCollections.length - 1 && styles.optionLast,
                  ]}
                  onPress={() => onSelectCollection(collection)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionText}>
                    {collection.icon || '📋'} {collection.name}
                  </Text>
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      ) : (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Collection name"
            value={newCollectionName}
            onChangeText={onChangeNewCollectionName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={onCreateNewCollection}
          />
        </View>
      )}
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  // Header
  backButton: {
    marginBottom: 8,
  },

  backButtonText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },

  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1a1a1a',
  },

  // Options
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    minHeight: 56,
  },

  optionLast: {
    borderBottomWidth: 0,
  },

  optionSelected: {
    backgroundColor: '#f0f9ff',
  },

  optionText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#1a1a1a',
  },

  newCollectionText: {
    color: '#3b82f6',
  },

  checkmark: {
    fontSize: 20,
    color: '#3b82f6',
    fontWeight: 'bold',
  },

  collectionsContainer: {
    // Show maximum 3 items before scrolling (3 × 56px = 168px)
    maxHeight: 168,
  },

  // Input mode
  inputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 48,
    backgroundColor: '#fff',
  },

  // Footer buttons
  buttonRow: {
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

  buttonSubmit: {
    backgroundColor: '#3b82f6',
  },

  buttonSubmitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  buttonDisabled: {
    opacity: 0.4,
  },
});
