import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import type { Collection } from '../types/models';

interface CollectionSelectorProps {
  selectedCollection: Collection | null;
  onPress: () => void;
  allowNoCollection?: boolean;
}

export default function CollectionSelector({
  selectedCollection,
  onPress,
  allowNoCollection = false,
}: CollectionSelectorProps) {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.buttonText}>
        {selectedCollection
          ? `📁 ${selectedCollection.name}`
          : allowNoCollection
          ? '+ Add to Collection (optional)'
          : '+ Select Collection'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },

  buttonText: {
    fontSize: 14, // Reduced from 16 to 14
    color: '#6b7280',
    fontWeight: '500',
  },
});
