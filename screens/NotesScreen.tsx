import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLifeOS } from '../store/LifeOSContext';
import { Card, Field, GhostButton, colors, Header, PrimaryButton, Screen, Segment, Sheet, shadow } from '../components/ui';
import type { Note } from '../types';

export function NotesScreen() {
  const { state, addNote, updateNote, deleteNote, showToast } = useLifeOS();
  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: '', markdown: '', folder: '' });
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const allTags = Array.from(new Set(state.notes.flatMap((note) => note.tags)));
  const filtered = state.notes.filter((note) => {
    const matchesQuery = !query || `${note.title} ${note.tags.join(' ')} ${note.markdown}`.toLowerCase().includes(query.toLowerCase());
    const matchesTag = !tagFilter || note.tags.includes(tagFilter);
    return matchesQuery && matchesTag;
  });
  const pinned = filtered.filter((note) => note.pinned);
  const others = filtered.filter((note) => !note.pinned);
  const folders = Array.from(new Set(state.notes.map((note) => note.folder)));

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
    setDraft({ title: '', markdown: '', folder: '' });
  };

  const openNew = () => {
    setEditingId(null);
    setDraft({ title: '', markdown: '', folder: '收集箱' });
    setEditorOpen(true);
  };

  const openEdit = (note: Note) => {
    setEditingId(note.id);
    setDraft({ title: note.title, markdown: note.markdown, folder: note.folder });
    setEditorOpen(true);
  };

  const save = () => {
    if (!draft.title.trim() && !draft.markdown.trim()) {
      showToast('标题和内容不能都为空');
      return;
    }
    if (editingId) {
      updateNote(editingId, { title: draft.title.trim() || '未命名笔记', markdown: draft.markdown, folder: draft.folder.trim() || '收集箱' });
      showToast('笔记已保存');
    } else {
      addNote(draft.title.trim() || '未命名笔记', draft.markdown, draft.folder.trim() || '收集箱');
      showToast('笔记已创建');
    }
    closeEditor();
  };

  const editing = state.notes.find((note) => note.id === editingId);
  const relatedCount = state.notes.filter((note) => note.linkedNoteIds.includes(editingId ?? '')).length;

  return (
    <>
      <Screen
        fab={
          <Pressable onPress={openNew} style={({ pressed }) => [styles.fab, pressed && styles.pressed]} accessibilityLabel="新建笔记">
            <Ionicons name="add" size={25} color="#fff" />
          </Pressable>
        }
      >
        <Header title="笔记" subtitle={`共 ${state.notes.length} 篇 · 本地保存`} icon="add-outline" onAction={openNew} />

        <View style={styles.search}>
          <Ionicons name="search-outline" size={17} color={colors.muted} />
          <TextInput value={query} onChangeText={setQuery} placeholder="搜索笔记、标签或内容" placeholderTextColor="#A2A9B7" style={styles.searchText} />
          {query ? <Pressable onPress={() => setQuery('')} accessibilityLabel="清空搜索"><Ionicons name="close-circle" size={16} color="#C3C9D6" /></Pressable> : null}
        </View>

        <Segment values={['全部', '文件夹', '标签']} active={tab} onChange={(index) => { setTab(index); setTagFilter(null); }} />

        {tab === 1 ? (
          <>
            <Text style={styles.label}>文件夹</Text>
            <Card>
              {folders.map((folder) => {
                const count = state.notes.filter((note) => note.folder === folder).length;
                return (
                  <Pressable key={folder} onPress={() => { setQuery(folder); setTab(0); showToast(`已筛选「${folder}」文件夹`); }} style={({ pressed }) => [styles.row, pressed && styles.pressed]} accessibilityLabel={`文件夹 ${folder}`}>
                    <View style={styles.thumb}><Ionicons name="folder-outline" size={19} color={colors.purple} /></View>
                    <View style={{ flex: 1 }}><Text style={styles.title}>{folder}</Text><Text style={styles.hint}>{count} 篇笔记</Text></View>
                    <Ionicons name="chevron-forward" size={17} color="#AAB0BC" />
                  </Pressable>
                );
              })}
            </Card>
          </>
        ) : tab === 2 ? (
          <>
            <Text style={styles.label}>标签</Text>
            <Card>
              {allTags.length ? allTags.map((tag) => {
                const count = state.notes.filter((note) => note.tags.includes(tag)).length;
                return (
                  <Pressable key={tag} onPress={() => { setTagFilter(tag); setTab(0); showToast(`已按 #${tag} 筛选`); }} style={({ pressed }) => [styles.row, pressed && styles.pressed]} accessibilityLabel={`标签 ${tag}`}>
                    <View style={styles.thumb}><Ionicons name="pricetag-outline" size={19} color={colors.purple} /></View>
                    <View style={{ flex: 1 }}><Text style={styles.title}>#{tag}</Text><Text style={styles.hint}>{count} 篇笔记</Text></View>
                    <Ionicons name="chevron-forward" size={17} color="#AAB0BC" />
                  </Pressable>
                );
              }) : <Text style={styles.emptyInline}>还没有标签，编辑笔记时可以添加。</Text>}
            </Card>
          </>
        ) : (
          <>
            {tagFilter ? (
              <Pressable onPress={() => setTagFilter(null)} style={({ pressed }) => [styles.filterBar, pressed && styles.pressed]} accessibilityLabel="清除标签筛选">
                <Ionicons name="pricetag" size={13} color={colors.purple} />
                <Text style={styles.filterText}>正在筛选 #{tagFilter}，点击清除</Text>
                <Ionicons name="close" size={14} color={colors.purple} />
              </Pressable>
            ) : null}

            <Text style={styles.label}>置顶笔记</Text>
            <Card>
              {pinned.length ? pinned.map((note) => <NoteRow key={note.id} note={note} onPress={() => openEdit(note)} />) : <Text style={styles.emptyInline}>暂无置顶笔记</Text>}
            </Card>

            <Text style={[styles.label, { marginTop: 21 }]}>最近编辑</Text>
            <Card>
              {others.length || pinned.length ? [...others, ...pinned].slice(0, 6).map((note) => <NoteRow key={`${note.id}-recent`} note={note} onPress={() => openEdit(note)} />) : <Text style={styles.emptyInline}>没有匹配的笔记</Text>}
            </Card>
          </>
        )}
      </Screen>

      <Sheet
        visible={editorOpen}
        title={editingId ? '编辑笔记' : '新建笔记'}
        onClose={closeEditor}
        footer={
          <>
            {editingId ? (
              <GhostButton label="删除" tone="danger" icon="trash-outline" onPress={() => {
                if (editingId) { deleteNote(editingId); showToast('笔记已删除'); }
                closeEditor();
              }} />
            ) : null}
            <PrimaryButton label={editingId ? '保存修改' : '创建笔记'} icon="checkmark" onPress={save} />
          </>
        }
      >
        <Field label="标题" value={draft.title} onChangeText={(title) => setDraft((prev) => ({ ...prev, title }))} placeholder="笔记标题" />
        <Field label="正文（支持 Markdown）" value={draft.markdown} onChangeText={(markdown) => setDraft((prev) => ({ ...prev, markdown }))} placeholder={'# 标题\n\n正文内容…'} multiline />
        <Field label="文件夹" value={draft.folder} onChangeText={(folder) => setDraft((prev) => ({ ...prev, folder }))} placeholder="收集箱 / 研究 / 生活" />
        {editing ? <Text style={styles.sheetHint}>最后更新：{editing.updatedAt} · 反向链接 {relatedCount} 条</Text> : <Text style={styles.sheetHint}>保存后会立即写入本机数据库。</Text>}
      </Sheet>
    </>
  );
}

function NoteRow({ note, onPress }: { note: Note; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]} accessibilityLabel={`打开笔记 ${note.title}`}>
      <View style={styles.thumb}><Ionicons name="document-text" size={19} color={colors.purple} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>{note.title}</Text>
        <Text style={styles.hint} numberOfLines={1}>{note.updatedAt} · {note.tags.map((tag) => `#${tag}`).join(' ')}</Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color="#AAB0BC" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  search: { height: 45, marginBottom: 14, paddingHorizontal: 13, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchText: { flex: 1, fontSize: 12, color: colors.ink },
  label: { marginBottom: 10, color: '#2A3447', fontSize: 14, fontWeight: '700' },
  row: { minHeight: 67, borderBottomWidth: 1, borderBottomColor: '#F0F2F6', flexDirection: 'row', alignItems: 'center', gap: 11 },
  thumb: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#2E394D', fontSize: 13, fontWeight: '600' },
  hint: { marginTop: 5, color: colors.muted, fontSize: 10 },
  emptyInline: { paddingVertical: 18, color: colors.muted, fontSize: 12, textAlign: 'center' },
  filterBar: { marginBottom: 12, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 11, backgroundColor: colors.purpleSoft, flexDirection: 'row', alignItems: 'center', gap: 7 },
  filterText: { flex: 1, color: colors.purple, fontSize: 11, fontWeight: '600' },
  sheetHint: { marginTop: 4, color: colors.muted, fontSize: 11, lineHeight: 17 },
  fab: { width: 49, height: 49, borderRadius: 25, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center', ...shadow },
  pressed: { opacity: 0.7 },
});
