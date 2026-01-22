import { View, Text, StyleSheet } from 'react-native';

export default function ListsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lists</Text>
      <Text style={styles.subtitle}>Lists UI coming next</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { marginTop: 8, color: '#666' },
});
