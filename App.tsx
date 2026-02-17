/**
 * App.tsx - Main Application Entry Point
 * 
 * TICKET 17F: Navigation & Transition Cohesion System
 * 
 * Manual tab navigation with smooth screen transitions.
 * Uses ScreenTransition wrapper for cohesive animations.
 */

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AccessibilityInfo } from 'react-native';
import OverviewScreen from './src/screens/OverviewScreen';
import TasksScreen from './src/screens/TasksScreen';
import CollectionsScreen from './src/screens/CollectionsScreen';
import ExpensesScreen from './src/screens/ExpensesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import type { TaskFilter } from './src/types/filters';

type Tab = 'overview' | 'tasks' | 'collections' | 'expenses' | 'settings';

// Global initialization state
let dbInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize database and ensure Unsorted list exists
 * This runs once per app lifecycle
 */
async function initializeApp(): Promise<void> {
  // Return existing promise if initialization already started
  if (initPromise) {
    return initPromise;
  }
  
  // Return immediately if already initialized
  if (dbInitialized) {
    return Promise.resolve();
  }
  
  console.log('🚀 Starting app initialization...');
  
  initPromise = (async () => {
    try {
      // Step 1: Initialize database schema
      console.log('📊 Step 1: Initialize database schema');
      const { initDatabase, getDatabase } = await import('./src/db/database');
      await initDatabase();
      
      // Step 2: Get database instance (use singleton, don't open new connection)
      console.log('📊 Step 2: Get database instance');
      const db = await getDatabase();
      
      // Step 3: Check/create Unsorted list
      console.log('📊 Step 3: Check/create Unsorted list');
      const { getOrCreateUnsortedCollection } = await import('./src/db/operations');
      const unsorted = await getOrCreateUnsortedCollection();
      
      // If Unsorted list was soft-deleted, restore it
      if (unsorted.is_archived === 1) {
        const now = Date.now();
        await db.runAsync(
          'UPDATE lists SET deleted_at = NULL, updated_at = ? WHERE id = ?',
          [now, unsorted.id]
        );
        console.log('✅ Unsorted list restored (archived)');
      } else {
        const status = unsorted.is_archived === 1 ? 'archived (hidden)' : 'active (visible)';
        console.log(`✅ Unsorted list already exists (${status})`);
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
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | undefined>(undefined);
  const [appReady, setAppReady] = useState(false);
  const insets = useSafeAreaInsets();
  
  // TICKET 17F: Reduced motion support
  const [reduceMotion, setReduceMotion] = useState(false);
  
  // TICKET 17F: Task filter state - using simple state, not object
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [taskFromOverview, setTaskFromOverview] = useState(false);

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
  
  // TICKET 17F: Check reduced motion preference + listen for changes
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      setReduceMotion(enabled);
    });
    
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );
    
    return () => subscription?.remove();
  }, []);

  // TICKET 17F: Navigation handlers with useCallback for stable references
  const handleViewTasks = useCallback((filter?: TaskFilter, fromOverview?: boolean) => {
    setTaskFilter(filter || 'all');
    setTaskFromOverview(fromOverview !== undefined ? fromOverview : filter !== 'all');
    setTab('tasks');
  }, []);

  const handleFilterChange = useCallback((newFilter: TaskFilter) => {
    setTaskFilter(newFilter);
    setTaskFromOverview(false);
  }, []);
  
  const handleGoToCollections = useCallback((listId?: string) => {
    setSelectedCollectionId(listId);
    setTab('collections');
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
    
    // TICKET 17F.1: Render ALL screens always to preserve scroll state
    // Show/hide with display style, no transition wrapper needed
    return (
      <>
        <View style={tab === 'overview' ? styles.activeScreen : styles.hiddenScreen}>
          <OverviewScreen 
            onViewTasks={handleViewTasks}
            goToCollections={handleGoToCollections}
            isActive={tab === 'overview'}
          />
        </View>
        
        <View style={tab === 'tasks' ? styles.activeScreen : styles.hiddenScreen}>
          <TasksScreen
            goToCollections={() => setTab('collections')}
            initialFilter={taskFilter}
            onFilterChange={handleFilterChange}
            fromOverview={taskFromOverview}
            isActive={tab === 'tasks'}
          />
        </View>
        
        <View style={tab === 'collections' ? styles.activeScreen : styles.hiddenScreen}>
          <CollectionsScreen 
            initialCollectionId={selectedCollectionId}
            onListIdChange={setSelectedCollectionId}
            isActive={tab === 'collections'}
          />
        </View>
        
        <View style={tab === 'expenses' ? styles.activeScreen : styles.hiddenScreen}>
          <ExpensesScreen />
        </View>
        
        <View style={tab === 'settings' ? styles.activeScreen : styles.hiddenScreen}>
          <SettingsScreen />
        </View>
      </>
    );
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
          {(['overview', 'tasks', 'collections', 'expenses', 'settings'] as Tab[]).map(
            t => (
              <TouchableOpacity
                key={t}
                style={styles.tab}
                onPress={() => setTab(t)}
                accessibilityRole="button"
                accessibilityLabel={`${t} tab`}
                accessibilityState={{ selected: tab === t }}
              >
                <Text style={tab === t ? styles.tabActive : styles.tabInactive}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
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
  // TICKET 17F.1: Keep all screens mounted for scroll preservation
  activeScreen: {
    flex: 1,
  },
  hiddenScreen: {
    display: 'none',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    backgroundColor: '#fff',
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    minHeight: 44, // WCAG AA touch target
  },
  tabActive: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F4FA3',
  },
  tabInactive: {
    fontSize: 12,
    color: '#666',
  },
});
