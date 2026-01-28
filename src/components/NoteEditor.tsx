import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import type { Note } from '../types/models';

interface NoteEditorProps {
  note: Note;
  onSave: (title: string, body: string) => Promise<void>;
  onCancel: () => void;
}

/**
 * NoteEditor - Full screen editor for notes
 * 
 * Features:
 * - Read full note content (unlimited scrolling)
 * - Edit title and body
 * - Save/Cancel buttons
 * - Keyboard-aware layout
 */
export default function NoteEditor({ note, onSave, onCancel }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.notes || '');
  const [saving, setSaving] = useState(false);
  
  const bodyInputRef = useRef<TextInput>(null);

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    
    if (!trimmedTitle) {
      Alert.alert('Empty Title', 'Please enter a title for the note.');
      return;
    }

    try {
      setSaving(true);
      await onSave(trimmedTitle, body.trim());
    } catch (error) {
      console.error('Failed to save note:', error);
      Alert.alert('Error', 'Unable to save note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          disabled={saving}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Edit Note</Text>
        
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Note title"
            returnKeyType="next"
            onSubmitEditing={() => bodyInputRef.current?.focus()}
          />

          <Text style={styles.label}>Content</Text>
          <TextInput
            ref={bodyInputRef}
            style={styles.bodyInput}
            value={body}
            onChangeText={setBody}
            placeholder="Note content (optional)"
            multiline
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6b7280',
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 24,
    minHeight: 48,
  },
  bodyInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 400,
  },
});
