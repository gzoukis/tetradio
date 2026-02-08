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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
 * ActionMenu - Adaptive action menu
 * 
 * TICKET 13 FIX: Adaptive positioning
 * - Android: Bottom sheet (Material Design)
 * - iOS: Centered modal (matches ActionSheet)
 * 
 * Features:
 * - Unlimited menu items (scrollable)
 * - Destructive styling (red text)
 * - Optional icons
 * - Platform-consistent design
 * - Safe area aware
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
  const insets = useSafeAreaInsets();
  
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
          style={[
            Platform.OS === 'ios' ? styles.menuContainerCentered : styles.menuContainerBottom,
            // Add bottom padding for safe area (Android navigation, iOS home indicator)
            Platform.OS === 'android' && { paddingBottom: Math.max(insets.bottom, 16) }
          ]}
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
    justifyContent: Platform.OS === 'ios' ? 'center' : 'flex-end',
  },
  // Android: Bottom sheet (Material Design)
  menuContainerBottom: {
    justifyContent: 'flex-end',
  },
  // iOS: Centered (like ActionSheet)
  menuContainerCentered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  menu: {
    backgroundColor: '#fff',
    borderRadius: 16,
    minHeight: 200, // Ensure minimum 3 options visible (3 × ~56px + header/cancel)
    maxHeight: '80%', // Prevent overflow on small screens
    minWidth: Platform.OS === 'ios' ? 300 : undefined,
    maxWidth: Platform.OS === 'ios' ? 400 : undefined,
    width: Platform.OS === 'ios' ? '90%' : '100%',
    // Remove borderTopLeftRadius/borderTopRightRadius - use consistent borderRadius
    overflow: 'hidden',
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
    // No maxHeight - let all items show if space available
    // Scrolling handled by menu maxHeight: '80%'
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
