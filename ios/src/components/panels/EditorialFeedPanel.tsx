import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePanel } from '../../context/PanelContext';
import { useColors, fonts, SPACING } from '../../theme';
import { fetchEditorialFeedFiltered } from '../../lib/api';

const TAGS = ['All', 'Harvest', 'Portrait', 'Criticism', 'Dispatch', 'Essay'];

function formatDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function EditorialFeedPanel() {
  const { goBack, showPanel, setPanelData } = usePanel();
  const c = useColors();
  const insets = useSafeAreaInsets();

  const [pieces, setPieces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback((q: string, tag: string, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    const tagParam = tag === 'All' ? undefined : tag;
    fetchEditorialFeedFiltered(q || undefined, tagParam)
      .then(setPieces)
      .catch(() => setPieces([]))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    load(query, selectedTag);
  }, []);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load(text, selectedTag);
    }, 300);
  };

  const handleTagPress = (tag: string) => {
    setSelectedTag(tag);
    load(query, tag);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    load(query, selectedTag, true);
  };

  const handlePiecePress = (item: any) => {
    setPanelData({ pieceId: item.id });
    showPanel('editorial-piece');
  };

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={goBack} activeOpacity={0.7}>
          <Text style={[styles.back, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.text, fontFamily: fonts.dmMono }]}>EDITORIAL</Text>
        <TouchableOpacity onPress={() => showPanel('write-piece')} activeOpacity={0.7}>
          <Text style={[styles.writeLink, { color: c.accent, fontFamily: fonts.dmMono }]}>write →</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchWrap, { borderBottomColor: c.border }]}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: c.searchBg, color: c.text, fontFamily: fonts.dmSans }]}
          placeholder="Search pieces…"
          placeholderTextColor={c.muted}
          value={query}
          onChangeText={handleQueryChange}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tagRow}
        style={[styles.tagScroll, { borderBottomColor: c.border }]}
      >
        {TAGS.map(tag => {
          const active = tag === selectedTag;
          return (
            <TouchableOpacity
              key={tag}
              onPress={() => handleTagPress(tag)}
              activeOpacity={0.7}
              style={[
                styles.tagPill,
                {
                  backgroundColor: active ? c.accent : 'transparent',
                  borderColor: c.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  {
                    fontFamily: fonts.dmMono,
                    color: active ? '#FFFFFF' : c.muted,
                  },
                ]}
              >
                {tag}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} />
        </View>
      ) : (
        <FlatList
          data={pieces}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={[styles.list, pieces.length === 0 && styles.emptyList]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={c.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.empty, { color: c.muted, fontFamily: fonts.dmSans }]}>
                No pieces yet.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.row, { borderBottomColor: c.border }]}
              onPress={() => handlePiecePress(item)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pieceTitle, { color: c.text, fontFamily: fonts.playfair }]} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={[styles.pieceMeta, { color: c.muted, fontFamily: fonts.dmMono }]}>
                {[item.author_display_name, formatDate(item.published_at ?? item.created_at)].filter(Boolean).join(' · ')}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { fontSize: 28 },
  title: { fontSize: 14, letterSpacing: 2 },
  writeLink: { fontSize: 13, letterSpacing: 0.5 },
  searchWrap: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    height: 38,
    borderRadius: 10,
    paddingHorizontal: SPACING.sm,
    fontSize: 14,
  },
  tagScroll: { borderBottomWidth: StyleSheet.hairlineWidth },
  tagRow: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagPill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagText: { fontSize: 12, letterSpacing: 0.5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyList: { flex: 1 },
  empty: { fontSize: 14 },
  list: { paddingBottom: SPACING.xl },
  row: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  pieceTitle: { fontSize: 17, lineHeight: 24 },
  pieceMeta: { fontSize: 12, letterSpacing: 0.3 },
});
