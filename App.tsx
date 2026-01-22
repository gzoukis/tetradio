import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useEffect, useState } from 'react';

import {
  testDatabaseConnection,
  resetDatabase,
} from './src/db/database';

import {
  createTask,
  getAllTasks,
  createExpense,
  getAllExpenses,
  createList,
  getAllLists,
  createBudgetCategory,
  getAllBudgetCategories,
} from './src/db/operations';

import type {
  Task,
  Expense,
  List,
  BudgetCategory,
} from './src/types/models';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState(false);
  const [testing, setTesting] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);

  useEffect(() => {
    async function init() {
      const ok = await testDatabaseConnection();
      if (!ok) {
        setDbError(true);
        return;
      }
      setDbReady(true);
      await loadData();
    }

    init();
  }, []);

  async function loadData() {
    const [t, e, l, c] = await Promise.all([
      getAllTasks(),
      getAllExpenses(),
      getAllLists(),
      getAllBudgetCategories(),
    ]);

    setTasks(t);
    setExpenses(e);
    setLists(l);
    setCategories(c);
  }

  async function runTests() {
    setTesting(true);
    try {
      await createTask({
        title: 'Test Task',
        notes: 'This is a test',
        completed: false,
      });

      await createExpense({
        amount: 5.5,
        currency: 'EUR',
        note: 'Coffee',
      });

      await createList({
        name: 'Groceries',
        sort_order: 0,
        is_pinned: false,
        is_archived: false,
      });

      await createBudgetCategory({
        name: 'Food & Drink',
        sort_order: 0,
        is_archived: false,
        limit_currency: 'EUR',
      });

      await loadData();
    } catch (err) {
      console.error('Test failed', err);
    } finally {
      setTesting(false);
    }
  }

  async function clearAll() {
    setTesting(true);
    try {
      await resetDatabase();
      await loadData();
    } finally {
      setTesting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tetradio</Text>
      <Text style={styles.subtitle}>Data Model Test Harness</Text>

      <View style={styles.status}>
        {!dbReady && !dbError && (
          <>
            <ActivityIndicator />
            <Text style={styles.statusText}>Initializing database…</Text>
          </>
        )}
        {dbReady && <Text style={styles.ok}>✓ Database ready</Text>}
        {dbError && <Text style={styles.err}>✗ Database error</Text>}
      </View>

      {dbReady && (
        <ScrollView contentContainerStyle={styles.content}>
          <Section title={`Tasks (${tasks.length})`}>
            {tasks.map(t => (
              <Text key={t.id}>• {t.title}</Text>
            ))}
          </Section>

          <Section title={`Expenses (${expenses.length})`}>
            {expenses.map(e => (
              <Text key={e.id}>
                • {e.currency} {e.amount.toFixed(2)} — {e.note}
              </Text>
            ))}
          </Section>

          <Section title={`Lists (${lists.length})`}>
            {lists.map(l => (
              <Text key={l.id}>• {l.name}</Text>
            ))}
          </Section>

          <Section title={`Categories (${categories.length})`}>
            {categories.map(c => (
              <Text key={c.id}>• {c.name}</Text>
            ))}
          </Section>

          <View style={styles.buttons}>
            <Button
              label={testing ? 'Testing…' : 'Run Tests'}
              disabled={testing}
              onPress={runTests}
            />
            <Button
              label="Clear All"
              danger
              disabled={testing}
              onPress={clearAll}
            />
          </View>
        </ScrollView>
      )}

      <StatusBar style="auto" />
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Button({
  label,
  onPress,
  disabled,
  danger,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        danger && styles.buttonDanger,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { textAlign: 'center', color: '#666', marginBottom: 20 },
  status: { alignItems: 'center', marginBottom: 20 },
  statusText: { color: '#666' },
  ok: { color: '#22c55e', fontWeight: '600' },
  err: { color: '#ef4444', fontWeight: '600' },
  content: { padding: 20, gap: 20 },
  section: { backgroundColor: '#f9fafb', padding: 16, borderRadius: 8 },
  sectionTitle: { fontWeight: '600', marginBottom: 6 },
  buttons: { flexDirection: 'row', gap: 12 },
  button: {
    flex: 1,
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDanger: { backgroundColor: '#ef4444' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
