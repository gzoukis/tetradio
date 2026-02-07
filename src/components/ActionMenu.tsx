import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';

export interface ActionMenuItem {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  icon?: string;  // Emoji or icon
}

interface ActionMenuProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  items: ActionMenuItem[];
}

/**
 * ActionMenu - Custom bottom sheet menu
 * 
 * TICKET 13: Replacement for Alert.alert() to support unlimited options
 * 
 * Features:
 * - Unlimited menu items (scrollable)
 * - Destructive styling (red text)
 * - Optional icons
 * - Platform-consistent design
 * - Cancel button always at bottom
 * 
 * Usage:
 * ```tsx
 * <ActionMenu
 *   visible={menuVisible}
 *   onClose={() => setMenuVisible(false)}
 *   title="List Name"
 *   items={[
 *     { label: 'Rename', onPress: handleRename },
 *     { label: 'Pin to Top', onPress: handlePin },
 *     { label: 'Delete', onPress: handleDelete, destructive: true },
 *   ]}
 * />
 * ```
 */
export default function ActionMenu({ visible, onClose, title, items }: ActionMenuProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Overlay - tap to dismiss */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        {/* Menu content - prevent dismiss on tap */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={styles.menuContainer}
        >
          <View style={styles.menu}>
            {/* Title (optional) */}
            {title && (
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
              </View>
            )}

            {/* Menu items (scrollable) */}
            <ScrollView
              style={styles.itemsContainer}
              bounces={false}
              showsVerticalScrollIndicator={false}
            >
              {items.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.item,
                    index === 0 && !title && styles.itemFirst,
                    index === items.length - 1 && styles.itemLast,
                  ]}
                  onPress={() => {
                    onClose();
                    // Delay action slightly to let modal close smoothly
                    setTimeout(() => item.onPress(), 150);
                  }}
                  activeOpacity={0.7}
                >
                  {item.icon && (
                    <Text style={styles.icon}>{item.icon}</Text>
                  )}
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
            </ScrollView>

            {/* Cancel button (always at bottom) */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    justifyContent: 'flex-end',
  },
  menu: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16, // Safe area on iOS
    maxHeight: '70%', // Allow scrolling if many items
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  itemsContainer: {
    maxHeight: 400, // Scroll if more than ~7 items
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    minHeight: 56,
  },
  itemFirst: {
    // First item without title
    borderTopWidth: 0,
  },
  itemLast: {
    // Last item before cancel
    borderBottomWidth: 0,
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
  },
  label: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  labelDestructive: {
    color: '#ef4444', // Red for destructive actions
  },
  cancelButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
});
