import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CalendarScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.emoji}>📅</Text>
        <Text style={styles.title}>Calendar coming soon</Text>
        <Text style={styles.subtitle}>
          Read-only mirror of your device calendar
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  subtitle: { color: '#6b7280', textAlign: 'center' },
});
