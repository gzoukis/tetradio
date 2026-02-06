import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
import { initDatabase, getDatabase } from './src/db/database';

type Tab = 'overview' | 'tasks' | 'lists' | 'expenses' | 'settings';

// Global flag to prevent multiple initialization runs
let dbInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize database with proper sequencing
 * 
 * TICKET 11A FIX: Ensures initialization happens exactly once
 * and Unsorted creation happens AFTER schema is ready
 */
async function initializeApp() {
  // Return existing promise if already initializing
  if (initPromise) {
    console.log('🔄 Database initialization already in progress, waiting...');
    return initPromise;
  }
  
  // Return immediately if already initialized
  if (dbInitialized) {
    console.log('✅ Database already initialized');
    return Promise.resolve();
  }
  
  console.log('🚀 Starting app initialization...');
  
  // Create initialization promise
  initPromise = (async () => {
    try {
      // Step 1: Initialize schema (this handles migrations)
      console.log('📊 Step 1: Initialize database schema');
      await initDatabase();
      
      // Step 2: Get database instance
      console.log('📊 Step 2: Get database instance');
      const db = await getDatabase();
      
      // Step 3: Ensure Unsorted list exists
      console.log('📊 Step 3: Check/create Unsorted list');
      const now = Date.now();
      
      // Check if Unsorted exists (including soft-deleted)
      const unsorted = await db.getFirstAsync<{ id: string; deleted_at: number | null }>(
        'SELECT id, deleted_at FROM lists WHERE is_system = 1 LIMIT 1'
      );
      
      if (!unsorted) {
        console.log('📥 Creating new Unsorted list...');
        await db.runAsync(
          `INSERT INTO lists (
            id, name, icon, color_hint, sort_order,
            is_pinned, is_archived, is_system,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ['unsorted-system-list', 'Unsorted', '📥', '#9ca3af', 9999, 0, 0, 1, now, now]
        );
        console.log('✅ Unsorted list created');
      } else if (unsorted.deleted_at) {
        console.log('📥 Restoring soft-deleted Unsorted list...');
        await db.runAsync(
          'UPDATE lists SET deleted_at = NULL, updated_at = ? WHERE id = ?',
          [now, unsorted.id]
        );
        console.log('✅ Unsorted list restored');
      } else {
        console.log('✅ Unsorted list already exists');
      }
      
      dbInitialized = true;
      console.log('✅ App initialization complete');
      
    } catch (error) {
      console.error('❌ App initialization failed:', error);
      // Reset flags so we can retry
      dbInitialized = false;
      initPromise = null;
      throw error;
    }
  })();
  
  return initPromise;
}

function AppContent() {
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedListId, setSelectedListId] = useState<string | undefined>(undefined);
  const [appReady, setAppReady] = useState(false);
  const insets = useSafeAreaInsets();

  // Run initialization once on mount
  useEffect(() => {
    initializeApp()
      .then(() => {
        console.log('✅ App ready to render screens');
        setAppReady(true);
      })
      .catch((error) => {
        console.error('❌ Failed to initialize app:', error);
        // Still set ready to avoid infinite loading
        setAppReady(true);
      });
  }, []);

  const renderScreen = () => {
    // Show loading until database is ready
    if (!appReady) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }
    
    switch (tab) {
      case 'tasks':
        return <TasksScreen goToLists={() => setTab('lists')} />;
      case 'lists':
        return (
          <ListsScreen 
            initialListId={selectedListId}
            onListIdChange={setSelectedListId}
          />
        );
      case 'expenses':
        return <ExpensesScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <OverviewScreen 
          onViewTasks={() => setTab('tasks')}
          goToLists={(listId) => {
            setSelectedListId(listId);
            setTab('lists');
          }}
        />;
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
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
