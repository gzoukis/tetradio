import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export enum EntryType {
  TASK = 'task',
  NOTE = 'note',
  CHECKLIST = 'checklist',
}

interface TypeSelectorProps {
  selectedType: EntryType;
  onTypeChange: (type: EntryType) => void;
}

const TYPE_LABELS: Record<EntryType, string> = {
  [EntryType.TASK]: 'Task',
  [EntryType.NOTE]: 'Note',
  [EntryType.CHECKLIST]: 'Checklist',
};

const TYPE_ORDER: EntryType[] = [
  EntryType.TASK,
  EntryType.NOTE,
  EntryType.CHECKLIST,
];

export default function TypeSelector({
  selectedType,
  onTypeChange,
}: TypeSelectorProps) {
  return (
    <View style={styles.container}>
      {TYPE_ORDER.map((type) => {
        const isSelected = selectedType === type;
        return (
          <TouchableOpacity
            key={type}
            style={[styles.button, isSelected && styles.buttonActive]}
            onPress={() => onTypeChange(type)}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.buttonText, isSelected && styles.buttonTextActive]}
            >
              {TYPE_LABELS[type]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },

  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },

  buttonActive: {
    backgroundColor: '#3b82f6',
  },

  buttonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },

  buttonTextActive: {
    color: '#fff',
  },
});
