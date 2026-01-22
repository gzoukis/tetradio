import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { testDatabaseConnection } from './src/db/database';


export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState(false);

  useEffect(() => {
    async function checkDatabase() {
      const isConnected = await testDatabaseConnection();
      if (isConnected) {
        setDbReady(true);
      } else {
        setDbError(true);
      }
    }

    checkDatabase();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tetradio</Text>
      <Text style={styles.subtitle}>Calm life management</Text>

      <View style={styles.status}>
        {!dbReady && !dbError && (
          <>
            <ActivityIndicator size="small" />
            <Text style={styles.statusText}>Initializing database…</Text>
          </>
        )}

        {dbReady && (
          <Text style={styles.statusSuccess}>✓ Database ready</Text>
        )}

        {dbError && (
          <Text style={styles.statusError}>✗ Database connection failed</Text>
        )}
      </View>

      <Text style={styles.info}>v1 bootstrap • Expo Go</Text>

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  statusSuccess: {
    fontSize: 14,
    color: '#16a34a',
    fontWeight: '600',
  },
  statusError: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '600',
  },
  info: {
    marginTop: 24,
    fontSize: 12,
    color: '#999',
  },
});
