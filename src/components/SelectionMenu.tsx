import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import ModalShell from './ModalShell';

export interface SelectionOption {
  label: string;
  value: any;
  icon?: string;
  color?: string;
  description?: string;
}

interface SelectionMenuProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  options: SelectionOption[];
  onSelect: (value: any) => void;
  selectedValue?: any;
}

export default function SelectionMenu({
  visible,
  onClose,
  title,
  subtitle,
  options,
  onSelect,
  selectedValue,
}: SelectionMenuProps) {
  const handleSelect = (value: any) => {
    onClose();
    setTimeout(() => onSelect(value), 150);
  };

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      animationType="slide"
      header={
        title || subtitle ? (
          <View>
            {title && <Text style={styles.title}>{title}</Text>}
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
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
      {/* Options - no wrapper View needed, ModalShell handles scroll */}
      {options.map((option, index) => {
        const selected = option.value === selectedValue;

        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.option,
              selected && styles.optionSelected,
              index === options.length - 1 && styles.optionLast,
            ]}
            onPress={() => handleSelect(option.value)}
            activeOpacity={0.7}
          >
            {option.color ? (
              <View
                style={[
                  styles.colorIndicator,
                  { backgroundColor: option.color },
                  selected && styles.colorIndicatorSelected,
                ]}
              />
            ) : option.icon ? (
              <Text style={styles.optionIcon}>{option.icon}</Text>
            ) : null}

            <View style={styles.optionContent}>
              <Text
                style={[
                  styles.optionLabel,
                  selected && styles.optionLabelSelected,
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

            {selected && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
        );
      })}
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

  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 2,
  },

  // Option styles - 56px minimum height as specified
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    minHeight: 56,
  },

  optionLast: {
    borderBottomWidth: 0,
  },

  optionSelected: {
    backgroundColor: '#f0f9ff',
  },

  colorIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 16,
  },

  colorIndicatorSelected: {
    borderWidth: 3,
    borderColor: '#3b82f6',
  },

  optionIcon: {
    fontSize: 24,
    marginRight: 12,
  },

  optionContent: {
    flex: 1,
  },

  optionLabel: {
    fontSize: 17,
    fontWeight: '500',
    color: '#1a1a1a',
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

  checkmark: {
    fontSize: 20,
    color: '#3b82f6',
    fontWeight: 'bold',
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
