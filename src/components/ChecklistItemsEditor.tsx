import React, { useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

interface ChecklistItemsEditorProps {
  items: string[];
  onItemsChange: (items: string[]) => void;
}

export default function ChecklistItemsEditor({
  items,
  onItemsChange,
}: ChecklistItemsEditorProps) {
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom when items are added
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [items.length]); // Only trigger when item count changes

  const handleUpdateItem = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    onItemsChange(newItems);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return; // Keep at least one item
    const newItems = items.filter((_, i) => i !== index);
    onItemsChange(newItems);
  };

  const handleAddItem = () => {
    onItemsChange([...items, '']);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Items</Text>
      
      {/* Items list in ScrollView - max 3 items visible */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.itemsScroll}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        {items.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <TextInput
              style={styles.itemInput}
              placeholder={`Item ${index + 1}`}
              value={item}
              onChangeText={(value) => handleUpdateItem(index, value)}
              returnKeyType="done"
            />
            {items.length > 1 && (
              <TouchableOpacity
                onPress={() => handleRemoveItem(index)}
                style={styles.removeButton}
                activeOpacity={0.7}
              >
                <Text style={styles.removeButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Add item button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleAddItem}
        activeOpacity={0.7}
      >
        <Text style={styles.addButtonText}>+ Add Item</Text>
      </TouchableOpacity>
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

  itemsScroll: {
    maxHeight: 168, // 3 items × 56px = 168px
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  itemInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },

  removeButton: {
    marginLeft: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  removeButtonText: {
    fontSize: 18,
    color: '#ef4444',
    fontWeight: 'bold',
  },

  addButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },

  addButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
});
