import { View, Text, StyleSheet } from 'react-native';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Settings coming next</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { marginTop: 8, color: '#666' },
});

const handleCleanupOrphanedTasks = async () => {
  Alert.alert(
    'Clean Up Orphaned Tasks',
    'This will delete tasks from collections that no longer exist. Continue?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clean Up',
        style: 'destructive',
        onPress: async () => {
          try {
            const db = await getDatabase();
            await db.runAsync(
              `UPDATE tasks
               SET deleted_at = datetime('now'), updated_at = datetime('now')
               WHERE collection_id IN (
                 SELECT id FROM collections WHERE is_archived = 1
               )
               AND deleted_at IS NULL`
            );
            Alert.alert('Success', 'Orphaned tasks cleaned up');
          } catch (error) {
            console.error('Cleanup failed:', error);
            Alert.alert('Error', 'Failed to clean up tasks');
          }
        },
      },
    ]
  );
};