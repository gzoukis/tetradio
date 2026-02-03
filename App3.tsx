import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import OverviewScreen from './src/screens/OverviewScreen';
import TasksScreen from './src/screens/TasksScreen';
import ListsScreen from './src/screens/ListsScreen';
import ExpensesScreen from './src/screens/ExpensesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { getDatabase } from './src/db/database';

type Tab = 'overview' | 'tasks' | 'lists' | 'expenses' | 'settings';

// Global flag to prevent multiple runs
let fixAlreadyRan = false;

/**
 * Safe one-time database fix
 * Only creates Unsorted if it doesn't exist
 */
async function safeDatabaseFix() {
  if (fixAlreadyRan) {
    console.log('â­ï¸  Database fix already ran, skipping...');
    return;
  }
  
  console.log('🔧 Safe database fix starting...');
  fixAlreadyRan = true;
  
  try {
    const db = await getDatabase();
    const now = Date.now();
    
    // Check if Unsorted exists (including soft-deleted)
    const unsorted = await db.getFirstAsync<{ id: string; deleted_at: number | null }>(
      'SELECT id, deleted_at FROM lists WHERE is_system = 1 LIMIT 1'
    );
    
    if (!unsorted) {
      console.log('Creating new Unsorted list...');
      await db.runAsync(
        `INSERT INTO lists (
          id, name, icon, color_hint, sort_order,
          is_pinned, is_archived, is_system,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['unsorted-system-list', 'Unsorted', 'ðŸ“¥', '#9ca3af', 9999, 0, 0, 1, now, now]
      );
      console.log('✅ Unsorted list created');
    } else if (unsorted.deleted_at) {
      console.log('Restoring soft-deleted Unsorted list...');
      await db.runAsync(
        'UPDATE lists SET deleted_at = NULL, updated_at = ? WHERE id = ?',
        [now, unsorted.id]
      );
      console.log('✅ Unsorted list restored');
    } else {
      console.log('✅ Unsorted list already exists');
    }
    
    console.log('✅ Safe database fix complete');
    
  } catch (error) {
    console.error('âŒ Database fix failed:', error);
    // Don't show alert - just log error
  }
}

function AppContent() {
  const [tab, setTab] = useState<Tab>('overview');
  const insets = useSafeAreaInsets();

  // Run fix once on mount
  useEffect(() => {
    safeDatabaseFix();
  }, []);

  const renderScreen = () => {
    switch (tab) {
      case 'tasks':
        return <TasksScreen goToLists={() => setTab('lists')} />;
      case 'lists':
        return <ListsScreen />;
      case 'expenses':
        return <ExpensesScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <OverviewScreen onViewTasks={() => setTab('tasks')} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        {/* Main content */}
        <View style={styles.content}>{renderScreen()}</View>

        {/* Bottom tab bar */}
        <View
          style={[
            styles.tabBar,
            { paddingBottom: Math.max(insets.bottom, 8) },
          ]}
        >
          {(['overview', 'tasks', 'lists', 'expenses', 'settings'] as Tab[]).map(
            t => (
              <TouchableOpacity
                key={t}
                style={styles.tab}
                onPress={() => setTab(t)}
              >
                <Text style={tab === t ? styles.active : styles.inactive}>
                  {t}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
  },
  active: {
    fontWeight: 'bold',
  },
  inactive: {
    color: '#888',
  },
});
