import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BottomNav, colors, Screen } from './components/ui';
import { LifeOSProvider } from './store/LifeOSContext';
import type { Tab } from './types';
import { TodayScreen } from './screens/TodayScreen';
import { TimelineScreen } from './screens/TimelineScreen';
import { NotesScreen } from './screens/NotesScreen';
import { FitnessScreen } from './screens/FitnessScreen';
import { ReviewScreen } from './screens/ReviewScreen';

function AppContent() { const [tab, setTab] = useState<Tab>('today'); return <View style={styles.app}><StatusBar style="dark" /><View style={styles.shell}><Screen>{tab === 'today' && <TodayScreen />}{tab === 'timeline' && <TimelineScreen />}{tab === 'notes' && <NotesScreen />}{tab === 'fitness' && <FitnessScreen />}{tab === 'review' && <ReviewScreen />}</Screen><BottomNav active={tab} onChange={setTab} /></View></View>; }
export default function App() { return <LifeOSProvider><AppContent /></LifeOSProvider>; }
const styles = StyleSheet.create({ app: { flex: 1, alignItems: 'center', backgroundColor: '#EEF1F7' }, shell: { position: 'relative', flex: 1, width: '100%', maxWidth: 430, backgroundColor: colors.bg } });
