import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export enum Priority {
  FOCUS = 1,
  NORMAL = 2,
  LOW = 3,
}

interface PrioritySelectorProps {
  selectedPriority: Priority;
  onPriorityChange: (priority: Priority) => void;
}

const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.FOCUS]: 'Focus',
  [Priority.NORMAL]: 'Normal',
  [Priority.LOW]: 'Low key',
};

const PRIORITY_ORDER: Priority[] = [
  Priority.FOCUS,
  Priority.NORMAL,
  Priority.LOW,
];

export default function PrioritySelector({
  selectedPriority,
  onPriorityChange,
}: PrioritySelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Priority</Text>
      <View style={styles.buttonGroup}>
        {PRIORITY_ORDER.map((priority) => {
          const isSelected = selectedPriority === priority;
          return (
            <TouchableOpacity
              key={priority}
              style={[styles.button, isSelected && styles.buttonActive]}
              onPress={() => onPriorityChange(priority)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.buttonText,
                  isSelected && styles.buttonTextActive,
                ]}
              >
                {PRIORITY_LABELS[priority]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },

  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },

  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },

  buttonActive: {
    backgroundColor: '#3b82f6',
  },

  buttonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },

  buttonTextActive: {
    color: '#fff',
  },
});
