import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Note } from '../types/models';

interface NoteCardProps {
  note: Note;
  onPress: () => void;
  onLongPress: () => void;
}

/**
 * NoteCard Component
 * 
 * Displays a note entry with:
 * - No checkbox (notes are not completable)
 * - No priority indicator (notes don't have urgency)
 * - No due date (notes are not schedulable)
 * - Text-focused design
 * - Visual distinction from tasks (icon)
 */
export default function NoteCard({ note, onPress, onLongPress }: NoteCardProps) {
  return (
    <TouchableOpacity
      style={styles.noteRow}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      delayLongPress={500}
    >
      {/* Note icon - visual distinction from tasks */}
      <View style={styles.noteIcon}>
        <Text style={styles.noteIconText}>📝</Text>
      </View>

      {/* Note content */}
      <View style={styles.noteContent}>
        <Text style={styles.noteTitle}>{note.title}</Text>
        {note.notes && (
          <Text style={styles.noteBody} numberOfLines={2}>
            {note.notes}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  noteRow: {
    backgroundColor: '#fffbeb', // Subtle yellow tint to distinguish from tasks
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 64,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  noteIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  noteIconText: {
    fontSize: 18,
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 4,
    fontWeight: '500',
  },
  noteBody: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});