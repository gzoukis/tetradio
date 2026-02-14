import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import ModalShell from './ModalShell';
import TypeSelector, { EntryType } from './TypeSelector';
import PrioritySelector, { Priority } from './PrioritySelector';
import ChecklistItemsEditor from './ChecklistItemsEditor';
import CollectionSelector from './CollectionSelector';
import DatePickerButton from './DatePickerButton';
import type { Collection } from '../types/models';

// ✅ Extensible Entry Type Configuration
interface EntryTypeConfig {
  titlePlaceholder: string;
  hasDatePicker: boolean;
  hasPriority: boolean;
  hasBody: boolean;
  hasChecklist: boolean;
}

const ENTRY_TYPE_CONFIG: Record<EntryType, EntryTypeConfig> = {
  [EntryType.TASK]: {
    titlePlaceholder: 'Task title',
    hasDatePicker: true,
    hasPriority: true,
    hasBody: false,
    hasChecklist: false,
  },
  [EntryType.NOTE]: {
    titlePlaceholder: 'Note title',
    hasDatePicker: false,
    hasPriority: false,
    hasBody: true,
    hasChecklist: false,
  },
  [EntryType.CHECKLIST]: {
    titlePlaceholder: 'Checklist title',
    hasDatePicker: false,
    hasPriority: false,
    hasBody: false,
    hasChecklist: true,
  },
};

// ✅ Unified Payload Contract
export interface CreateEntryPayload {
  type: EntryType;
  title: string;
  collectionId?: string | null;
  dueDate?: number | null;
  priority?: Priority;
  checklistItems?: string[];
  noteBody?: string;
}

interface CreateEntryModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateEntryPayload) => void;
  
  // Configuration props
  fixedCollectionId?: string; // CollectionsScreen: collection is fixed
  allowCollectionSelection?: boolean; // OverviewScreen: user can select collection
  allowNoCollection?: boolean; // OverviewScreen: can leave unassigned
  
  // Collection picker (for Quick Create)
  selectedCollection?: Collection | null;
  onCollectionPickerOpen?: () => void;
}

export default function CreateEntryModal({
  visible,
  onClose,
  onSubmit,
  fixedCollectionId,
  allowCollectionSelection = false,
  allowNoCollection = false,
  selectedCollection,
  onCollectionPickerOpen,
}: CreateEntryModalProps) {
  // Entry type state
  const [entryType, setEntryType] = useState<EntryType>(EntryType.TASK);
  
  // Common fields
  const [title, setTitle] = useState('');
  
  // Task-specific fields
  const [dueDate, setDueDate] = useState<number | undefined>(undefined);
  const [priority, setPriority] = useState<Priority>(Priority.NORMAL);
  
  // Note-specific fields
  const [noteBody, setNoteBody] = useState('');
  
  // Checklist-specific fields
  const [checklistItems, setChecklistItems] = useState<string[]>(['', '', '']);

  // Get current type config
  const config = ENTRY_TYPE_CONFIG[entryType];

  // ✅ Mode Switching: Safe field reset
  useEffect(() => {
    // Preserve title when switching types
    // Reset incompatible fields
    if (!config.hasDatePicker) {
      setDueDate(undefined);
    }
    if (!config.hasPriority) {
      setPriority(Priority.NORMAL);
    }
    if (!config.hasBody) {
      setNoteBody('');
    }
    if (!config.hasChecklist) {
      setChecklistItems(['', '', '']);
    }
  }, [entryType]);

  // Reset form on close
  const handleClose = () => {
    setEntryType(EntryType.TASK);
    setTitle('');
    setDueDate(undefined);
    setPriority(Priority.NORMAL);
    setNoteBody('');
    setChecklistItems(['', '', '']);
    onClose();
  };

  // ✅ Centralized validation
  const canSubmit = (): boolean => {
    if (!title.trim()) return false;
    
    if (entryType === EntryType.CHECKLIST) {
      // At least one non-empty item required
      const hasValidItem = checklistItems.some(item => item.trim() !== '');
      if (!hasValidItem) return false;
    }
    
    return true;
  };

  // ✅ Submit handler - builds payload, no DB writes
  const handleSubmit = () => {
    if (!canSubmit()) return;

    const payload: CreateEntryPayload = {
      type: entryType,
      title: title.trim(),
    };

    // Add collection ID
    if (fixedCollectionId) {
      payload.collectionId = fixedCollectionId;
    } else if (allowCollectionSelection) {
      payload.collectionId = selectedCollection?.id || null;
    }

    // Add type-specific fields
    if (config.hasDatePicker && dueDate) {
      payload.dueDate = dueDate;
    }
    
    if (config.hasPriority) {
      payload.priority = priority;
    }
    
    if (config.hasBody && noteBody.trim()) {
      payload.noteBody = noteBody.trim();
    }
    
    if (config.hasChecklist) {
      const validItems = checklistItems.filter(item => item.trim() !== '');
      payload.checklistItems = validItems;
    }

    onSubmit(payload);
    handleClose();
  };

  const isDisabled = !canSubmit();

  return (
    <ModalShell
      visible={visible}
      onClose={handleClose}
      header={
        <View>
          <TypeSelector selectedType={entryType} onTypeChange={setEntryType} />
          <Text style={styles.title}>
            {fixedCollectionId ? 'Add Entry' : 'Quick Create'}
          </Text>
        </View>
      }
      footer={
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.buttonCancel]}
            onPress={handleClose}
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
            onPress={handleSubmit}
            activeOpacity={0.7}
            disabled={isDisabled}
          >
            <Text style={styles.buttonSubmitText}>
              {fixedCollectionId ? 'Add' : 'Create'}
            </Text>
          </TouchableOpacity>
        </View>
      }
    >
      {/* Body content - ModalShell handles scroll */}
      <View style={styles.body}>
        {/* Title input */}
        <TextInput
          style={styles.input}
          placeholder={config.titlePlaceholder}
          value={title}
          onChangeText={setTitle}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />

        {/* Collection selector (Quick Create only) */}
        {allowCollectionSelection && onCollectionPickerOpen && (
          <CollectionSelector
            selectedCollection={selectedCollection || null}
            onPress={onCollectionPickerOpen}
            allowNoCollection={allowNoCollection}
          />
        )}

        {/* Type-specific fields */}
        {config.hasDatePicker && (
          <DatePickerButton
            value={dueDate}
            onChange={(timestamp) => setDueDate(timestamp ?? undefined)}
          />
        )}

        {config.hasPriority && (
          <PrioritySelector
            selectedPriority={priority}
            onPriorityChange={setPriority}
          />
        )}

        {config.hasBody && (
          <TextInput
            style={[styles.input, styles.bodyInput]}
            placeholder="Note body (optional)"
            value={noteBody}
            onChangeText={setNoteBody}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        )}

        {config.hasChecklist && (
          <ChecklistItemsEditor
            items={checklistItems}
            onItemsChange={setChecklistItems}
          />
        )}
      </View>
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1a1a1a',
    marginTop: 8,
  },

  body: {
    paddingHorizontal: 20,
    paddingVertical: 12, // Reduced from 16 to 12
  },

  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },

  bodyInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },

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
