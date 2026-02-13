import React, { RefObject } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import ModalShell from './ModalShell';

interface InputModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  submitLabel?: string;
  inputRef?: RefObject<TextInput>;
  autoFocus?: boolean;
  selectTextOnFocus?: boolean;
}

export default function InputModal({
  visible,
  onClose,
  title,
  placeholder = '',
  value,
  onChangeText,
  onSubmit,
  submitLabel = 'Save',
  inputRef,
  autoFocus = true,
  selectTextOnFocus = false,
}: InputModalProps) {
  const isDisabled = !value.trim();

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      header={<Text style={styles.title}>{title}</Text>}
      footer={
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.buttonCancel]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonCancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.buttonSubmit,
              isDisabled && styles.buttonDisabled,
            ]}
            onPress={onSubmit}
            activeOpacity={0.7}
            disabled={isDisabled}
          >
            <Text style={styles.buttonSubmitText}>{submitLabel}</Text>
          </TouchableOpacity>
        </View>
      }
    >
      {/* Input field - no wrapper needed */}
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          autoFocus={autoFocus}
          selectTextOnFocus={selectTextOnFocus}
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />
      </View>
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  // Header
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1a1a1a',
  },

  // Body - input container
  inputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 48,
    backgroundColor: '#fff',
  },

  // Footer - button row
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },

  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },

  buttonCancel: {
    backgroundColor: '#f3f4f6',
  },

  buttonCancelText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },

  buttonSubmit: {
    backgroundColor: '#3b82f6',
  },

  buttonSubmitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  buttonDisabled: {
    opacity: 0.4,
  },
});
