import React from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { IconName, Tab } from '../types';

export const colors = { bg: '#F6F7FB', ink: '#172033', muted: '#8D96A8', line: '#E9ECF3', purple: '#7764EE', purpleSoft: '#F0EEFF', white: '#FFFFFF', success: '#2EB875', warning: '#FFAA48', danger: '#E2574C' };
export const shadow = { shadowColor: '#78829B', shadowOpacity: 0.08, shadowRadius: 15, shadowOffset: { width: 0, height: 5 }, elevation: 2 };

/** 页面容器：处理顶部状态栏与底部安全区，避免内容被刘海/手势条遮挡 */
export function Screen({ children, fab }: { children: React.ReactNode; fab?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      {fab ? <View style={[styles.fabWrap, { bottom: 86 + insets.bottom }]} pointerEvents="box-none">{fab}</View> : null}
    </View>
  );
}

export function Header({ title, subtitle, icon = 'ellipsis-horizontal' as IconName, onAction }: { title: string; subtitle?: string; icon?: IconName; onAction?: () => void }) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Pressable onPress={onAction} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]} accessibilityLabel="页面操作">
        <Ionicons name={icon} size={20} color={colors.ink} />
      </Pressable>
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) { return <View style={[styles.card, style]}>{children}</View>; }

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Pressable onPress={onAction} accessibilityLabel={action} hitSlop={8}><Text style={styles.action}>{action} ›</Text></Pressable> : null}
    </View>
  );
}

export function Segment({ values, active, onChange }: { values: string[]; active: number; onChange?: (index: number) => void }) {
  return (
    <View style={styles.segment}>
      {values.map((value, index) => (
        <Pressable key={value} onPress={() => onChange?.(index)} style={[styles.segmentItem, active === index && styles.segmentItemActive]} accessibilityLabel={value}>
          <Text style={[styles.segmentText, active === index && styles.segmentTextActive]}>{value}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** 底部导航：底部内边距跟随安全区，避免被手势条压住 */
export function BottomNav({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const insets = useSafeAreaInsets();
  const items: { key: Tab; label: string; icon: IconName; activeIcon: IconName }[] = [
    { key: 'today', label: '今天', icon: 'home-outline', activeIcon: 'home' },
    { key: 'timeline', label: '时间轴', icon: 'calendar-outline', activeIcon: 'calendar' },
    { key: 'notes', label: '笔记', icon: 'document-text-outline', activeIcon: 'document-text' },
    { key: 'fitness', label: '健身', icon: 'fitness-outline', activeIcon: 'fitness' },
    { key: 'review', label: '总结', icon: 'shield-checkmark-outline', activeIcon: 'shield-checkmark' },
  ];
  return (
    <View style={[styles.nav, { height: 78 + insets.bottom, paddingBottom: 8 + insets.bottom }]}>
      {items.map((item) => (
        <Pressable key={item.key} onPress={() => onChange(item.key)} style={styles.navItem} accessibilityLabel={item.label}>
          <Ionicons name={active === item.key ? item.activeIcon : item.icon} size={21} color={active === item.key ? colors.purple : colors.muted} />
          <Text style={[styles.navText, active === item.key && styles.navTextActive]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function EmptyState({ icon, title, detail }: { icon: IconName; title: string; detail: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={30} color={colors.purple} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDetail}>{detail}</Text>
    </View>
  );
}

/** 通用底部弹层：用于编辑任务、笔记、体重、训练计划等 */
export function Sheet({ visible, title, onClose, children, footer }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouch} onPress={onClose} accessibilityLabel="关闭" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="关闭弹层"><Ionicons name="close" size={20} color={colors.muted} /></Pressable>
            </View>
            <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView>
            {footer ? <View style={styles.sheetFooter}>{footer}</View> : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export function Field({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false }: { label: string; value: string; onChangeText: (text: string) => void; placeholder?: string; keyboardType?: 'default' | 'numeric' | 'decimal-pad'; multiline?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#A2A9B7"
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.fieldInput, multiline && styles.fieldInputMultiline]}
      />
    </View>
  );
}

export function PrimaryButton({ label, onPress, icon }: { label: string; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.primary, pressed && styles.pressed]} accessibilityLabel={label}>
      {icon ? <Ionicons name={icon} size={15} color="#fff" /> : null}
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({ label, onPress, tone = 'default', icon }: { label: string; onPress: () => void; tone?: 'default' | 'danger'; icon?: IconName }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.ghost, pressed && styles.pressed]} accessibilityLabel={label}>
      {icon ? <Ionicons name={icon} size={15} color={tone === 'danger' ? colors.danger : colors.ink} /> : null}
      <Text style={[styles.ghostText, tone === 'danger' && { color: colors.danger }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]} accessibilityLabel={label}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function Toast({ message }: { message: string | null }) {
  const insets = useSafeAreaInsets();
  const animation = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(animation, { toValue: message ? 1 : 0, duration: 180, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [message, animation]);
  if (!message) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.toast, { bottom: 96 + insets.bottom, opacity: animation }]}>
      <Ionicons name="checkmark-circle" size={15} color="#fff" />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingBottom: 110 },
  header: { paddingTop: 13, marginBottom: 21, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { color: colors.ink, fontSize: 24, lineHeight: 30, fontWeight: '700' },
  subtitle: { marginTop: 6, color: colors.muted, fontSize: 12 },
  headerButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, ...shadow },
  sectionHeader: { marginTop: 24, marginBottom: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: '#242E41', fontSize: 15, fontWeight: '700' },
  action: { color: colors.muted, fontSize: 11 },
  segment: { height: 40, padding: 4, marginBottom: 22, borderRadius: 20, backgroundColor: '#EAECF3', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  segmentItem: { flex: 1, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  segmentItemActive: { backgroundColor: colors.white, ...shadow },
  segmentText: { color: colors.muted, fontSize: 12 },
  segmentTextActive: { color: colors.purple, fontWeight: '700' },
  nav: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 10, backgroundColor: 'rgba(255,255,255,0.98)', borderTopWidth: 1, borderTopColor: colors.line, flexDirection: 'row', justifyContent: 'space-around' },
  navItem: { width: 65, alignItems: 'center' },
  navText: { marginTop: 4, color: colors.muted, fontSize: 10 },
  navTextActive: { color: colors.purple, fontWeight: '700' },
  empty: { minHeight: 150, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { marginTop: 12, color: colors.ink, fontSize: 14, fontWeight: '700' },
  emptyDetail: { marginTop: 6, color: colors.muted, fontSize: 12 },
  fabWrap: { position: 'absolute', right: 22, alignItems: 'flex-end' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(18,24,38,0.35)' },
  backdropTouch: { flex: 1 },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 16, paddingHorizontal: 20 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.line, marginBottom: 14 },
  sheetTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  sheetFooter: { paddingTop: 12, marginTop: 6, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  field: { marginBottom: 13 },
  fieldLabel: { marginBottom: 6, color: colors.muted, fontSize: 11 },
  fieldInput: { minHeight: 44, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: '#FBFCFE', color: colors.ink, fontSize: 13 },
  fieldInputMultiline: { minHeight: 140, textAlignVertical: 'top', lineHeight: 20 },
  primary: { height: 42, paddingHorizontal: 18, borderRadius: 21, backgroundColor: colors.purple, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  ghost: { height: 42, paddingHorizontal: 16, borderRadius: 21, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  ghostText: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  chipActive: { backgroundColor: colors.purpleSoft, borderColor: '#D9D2FF' },
  chipText: { color: '#5C6579', fontSize: 12 },
  chipTextActive: { color: colors.purple, fontWeight: '700' },
  pressed: { opacity: 0.7 },
  toast: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, backgroundColor: 'rgba(23,32,51,0.92)' },
  toastText: { color: '#fff', fontSize: 12, flex: 1 },
});
