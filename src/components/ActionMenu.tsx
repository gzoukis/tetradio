import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import ModalShell from './ModalShell';

export interface ActionMenuItem {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  icon?: string;
}

interface ActionMenuProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  items: ActionMenuItem[];
}

export default function ActionMenu({
  visible,
  onClose,
  title,
  items,
}: ActionMenuProps) {
  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      header={
        title ? (
          <Text style={styles.title}>{title}</Text>
        ) : undefined
      }
      footer={
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      }
    >
      {/* Items - no wrapper View needed, ModalShell handles scroll */}
      {items.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.item,
            index === items.length - 1 && styles.itemLast,
          ]}
          onPress={() => {
            onClose();
            setTimeout(item.onPress, 150);
          }}
          activeOpacity={0.7}
        >
          {item.icon && <Text style={styles.icon}>{item.icon}</Text>}
          <Text
            style={[
              styles.label,
              item.destructive && styles.labelDestructive,
            ]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  // Header content
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1a1a1a',
  },

  // Item styles - 56px minimum height as specified
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    minHeight: 56,
  },

  itemLast: {
    borderBottomWidth: 0,
  },

  icon: {
    fontSize: 20,
    marginRight: 14,
  },

  label: {
    fontSize: 17,
    fontWeight: '500',
    color: '#1a1a1a',
  },

  labelDestructive: {
    color: '#ef4444',
  },

  // Footer content
  cancelButton: {
    alignItems: 'center',
  },

  cancelText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#6b7280',
  },
});
