import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import OverviewScreen from './src/screens/OverviewScreen';
import TasksScreen from './src/screens/TasksScreen';
import ListsScreen from './src/screens/ListsScreen';
import ExpensesScreen from './src/screens/ExpensesScreen';
import SettingsScreen from './src/screens/SettingsScreen';

type Tab = 'overview' | 'tasks' | 'lists' | 'expenses' | 'settings';

function AppContent() {
  const [tab, setTab] = useState<Tab>('overview');
  const insets = useSafeAreaInsets();

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
