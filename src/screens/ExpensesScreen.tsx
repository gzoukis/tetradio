import { View, Text, StyleSheet } from 'react-native';

export default function ExpensesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Records</Text>
      <Text style={styles.emptyText}>Nothing tracked yet</Text>
      <Text style={styles.emptySubtext}>
        Log expenses, measurements,{'\n'}or other records here
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    padding: 24,
  },
  title: { 
    fontSize: 32, 
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#1a1a1a',
  },
  emptyText: { 
    fontSize: 18, 
    fontWeight: '600',
    marginBottom: 12,
    color: '#9ca3af',
  },
  emptySubtext: { 
    fontSize: 14, 
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
});