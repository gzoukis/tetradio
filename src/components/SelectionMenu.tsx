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

export interface SelectionOption {
  label: string;
  value: any;
  icon?: string;       // Emoji or icon
  color?: string;      // Color for indicator circle
  description?: string; // Optional subtitle
}

interface SelectionMenuProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  options: SelectionOption[];
  onSelect: (value: any) => void;
  selectedValue?: any; // Show current selection
}

/**
 * SelectionMenu - Menu for selecting from options (not actions)
 * 
 * TICKET 13: Menu consolidation - Selection pattern
 * 
 * Differences from ActionMenu:
 * - For CHOOSING (priority, category, etc.) not ACTING (delete, rename)
 * - Supports colored indicators
 * - Auto-closes on selection
 * - Shows current selection
 * 
 * Features:
 * - ✅ Colored option indicators
 * - ✅ Minimum 3 options visible
 * - ✅ Scrollable if more options
 * - ✅ Platform-adaptive positioning
 * - ✅ Safe area aware
 * 
 * Usage:
 * ```tsx
 * <SelectionMenu
 *   visible={menuVisible}
 *   onClose={() => setMenuVisible(false)}
 *   title="Set Priority"
 *   subtitle="Choose priority level"
 *   options={[
 *     { label: 'Focus', value: 1, icon: '🔵', color: '#3b82f6' },
 *     { label: 'Normal', value: 2, icon: '⚪', color: '#9ca3af' },
 *     { label: 'Low Key', value: 3, icon: '⚫', color: '#6b7280' },
 *   ]}
 *   selectedValue={currentPriority}
 *   onSelect={(value) => handleSetPriority(value)}
 * />
 * ```
 */
export default function SelectionMenu({
  visible,
  onClose,
  title,
  subtitle,
  options,
  onSelect,
  selectedValue,
}: SelectionMenuProps) {
  const insets = useSafeAreaInsets();

  const handleSelect = (value: any) => {
    onClose();
    // Delay slightly to let modal close smoothly
    setTimeout(() => onSelect(value), 150);
  };

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
            // Add bottom padding for safe area
            Platform.OS === 'android' && { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <View style={styles.menu}>
            {/* Header */}
            {(title || subtitle) && (
              <View style={styles.header}>
                {title && <Text style={styles.title}>{title}</Text>}
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
              </View>
            )}

            {/* Options (scrollable) */}
            <ScrollView
              style={styles.optionsContainer}
              bounces={false}
              showsVerticalScrollIndicator={false}
            >
              {options.map((option, index) => {
                const isSelected = option.value === selectedValue;
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.option,
                      index === 0 && !title && !subtitle && styles.optionFirst,
                      index === options.length - 1 && styles.optionLast,
                      isSelected && styles.optionSelected,
                    ]}
                    onPress={() => handleSelect(option.value)}
                    activeOpacity={0.7}
                  >
                    {/* Color indicator or icon */}
                    {option.color ? (
                      <View
                        style={[
                          styles.colorIndicator,
                          { backgroundColor: option.color },
                          isSelected && styles.colorIndicatorSelected,
                        ]}
                      />
                    ) : option.icon ? (
                      <Text style={styles.optionIcon}>{option.icon}</Text>
                    ) : null}

                    {/* Label and description */}
                    <View style={styles.optionContent}>
                      <Text
                        style={[
                          styles.optionLabel,
                          isSelected && styles.optionLabelSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {option.description && (
                        <Text style={styles.optionDescription}>
                          {option.description}
                        </Text>
                      )}
                    </View>

                    {/* Selection checkmark */}
                    {isSelected && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Cancel button (always visible, pinned at bottom) */}
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
    justifyContent: Platform.OS === 'ios' ? 'center' : 'flex-end',
  },

  // === MENU CONTAINER ===
  menuContainerBottom: {
    justifyContent: 'flex-end',
  },
  menuContainerCentered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },

  // === MENU ===
  menu: {
    backgroundColor: '#fff',
    borderRadius: 16,
    minHeight: 200, // Ensure minimum 3 options visible
    maxHeight: '80%',
    minWidth: Platform.OS === 'ios' ? 300 : undefined,
    maxWidth: Platform.OS === 'ios' ? 400 : undefined,
    width: Platform.OS === 'ios' ? '90%' : '100%',
    overflow: 'hidden',
  },

  // === HEADER ===
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },

  // === OPTIONS CONTAINER ===
  optionsContainer: {
    // No maxHeight - let all items show if space available
  },

  // === OPTION ===
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    minHeight: 56,
    backgroundColor: '#fff',
  },
  optionFirst: {
    borderTopWidth: 0,
  },
  optionLast: {
    borderBottomWidth: 0,
  },
  optionSelected: {
    backgroundColor: '#f0f9ff', // Light blue tint
  },

  // === COLOR INDICATOR ===
  colorIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  colorIndicatorSelected: {
    borderWidth: 2,
    borderColor: '#3b82f6',
  },

  // === OPTION ICON ===
  optionIcon: {
    fontSize: 24,
    marginRight: 12,
  },

  // === OPTION CONTENT ===
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 17,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  optionLabelSelected: {
    fontWeight: '600',
    color: '#3b82f6',
  },
  optionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },

  // === CHECKMARK ===
  checkmark: {
    fontSize: 18,
    color: '#3b82f6',
    fontWeight: 'bold',
    marginLeft: 8,
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
    fontSize: 17,
    color: '#6b7280',
    fontWeight: '600',
  },
});
