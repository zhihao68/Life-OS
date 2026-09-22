import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomNav, colors, Toast } from './components/ui';
import { LifeOSProvider, NavigationProvider, useLifeOS } from './store/LifeOSContext';
import type { Tab } from './types';
import { TodayScreen } from './screens/TodayScreen';
import { TimelineScreen } from './screens/TimelineScreen';
import { NotesScreen } from './screens/NotesScreen';
import { FitnessScreen } from './screens/FitnessScreen';
import { ReviewScreen } from './screens/ReviewScreen';

function RootShell() {
  const [tab, setTab] = useState<Tab>('today');
  const { hydrated, toast } = useLifeOS();
  if (!hydrated) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.purple} /></View>;
  }
  return (
    <NavigationProvider tab={tab} go={setTab}>
      <View style={styles.app}>
        <StatusBar style="dark" />
        <View style={styles.shell}>
          {tab === 'today' && <TodayScreen />}
          {tab === 'timeline' && <TimelineScreen />}
          {tab === 'notes' && <NotesScreen />}
          {tab === 'fitness' && <FitnessScreen />}
          {tab === 'review' && <ReviewScreen />}
          <BottomNav active={tab} onChange={setTab} />
          <Toast message={toast} />
        </View>
      </View>
    </NavigationProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <LifeOSProvider>
        <RootShell />
      </LifeOSProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, alignItems: 'center', backgroundColor: '#EEF1F7' },
  shell: { position: 'relative', flex: 1, width: '100%', maxWidth: 430, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});
