import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import OverviewScreen from './src/screens/OverviewScreen';
import TasksScreen from './src/screens/TasksScreen';
import ListsScreen from './src/screens/ListsScreen';
import ExpensesScreen from './src/screens/ExpensesScreen';
import SettingsScreen from './src/screens/SettingsScreen';

type Tab = 'overview' | 'tasks' | 'lists' | 'expenses' | 'settings';

export default function App() {
  const [tab, setTab] = useState<Tab>('overview');

  const renderScreen = () => {
    switch (tab) {
      case 'tasks':
        return <TasksScreen />;
      case 'lists':
        return <ListsScreen />;
      case 'expenses':
        return <ExpensesScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <OverviewScreen />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>{renderScreen()}</View>

      <View style={styles.tabBar}>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 8,
  },
  tab: { flex: 1, alignItems: 'center' },
  active: { fontWeight: 'bold' },
  inactive: { color: '#888' },
});
