import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
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
 * ActionMenu - Centered action menu
 * 
 * TICKET 13 VISUAL FIX: Centered positioning (matches SelectionMenu)
 * - Consistent positioning across all platforms
 * - Centered modal with rounded corners
 * - Solid background (no transparency)
 * - Platform-agnostic design
 * 
 * Features:
 * - Unlimited menu items (scrollable)
 * - Destructive styling (red text)
 * - Optional icons
 * - Consistent with SelectionMenu style
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
      animationType="fade"
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
  // === OVERLAY ===
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center', // ALWAYS centered
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  // === MENU ===
  menu: {
    backgroundColor: '#fff',
    borderRadius: 16,
    minHeight: 280, // Minimum for header + 3 items + cancel
    maxHeight: 600, // Absolute max
    minWidth: 300,
    maxWidth: 400,
    width: '90%',
    overflow: 'hidden',
  },

  // === HEADER ===
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

  // === ITEMS CONTAINER ===
  itemsContainer: {
    flex: 1,
    minHeight: 168, // Minimum for 3 items
  },

  // === ITEM ===
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
    borderTopWidth: 0,
  },
  itemLast: {
    borderBottomWidth: 0,
  },

  // === ICON & LABEL ===
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

  // === CANCEL BUTTON ===
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
