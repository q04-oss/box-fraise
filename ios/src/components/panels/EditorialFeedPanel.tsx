import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePanel } from '../../context/PanelContext';
import { fetchEditorialFeed } from '../../lib/api';
import { useColors, fonts, SPACING } from '../../theme';

export default function EditorialFeedPanel() {
  const { goBack, showPanel, setPanelData } = usePanel();
  const c = useColors();
  const insets = useSafeAreaInsets();

  const [pieces, setPieces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchEditorialFeed();
      setPieces(data);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleTap = (piece: any) => {
    setPanelData({ pieceId: piece.id });
    showPanel('editorial-piece');
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backBtnText, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.text }]}>Editorial</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={pieces}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={pieces.length === 0 ? styles.emptyContainer : styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
          ListEmptyComponent={
            <View style={styles.emptyInner}>
              <Text style={styles.emptyKanji}>文</Text>
              <Text style={[styles.emptyText, { color: c.muted, fontFamily: fonts.dmSans }]}>
                No pieces published yet.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <>
              <TouchableOpacity
                style={styles.row}
                onPress={() => handleTap(item)}
                activeOpacity={0.75}
              >
                <Text style={[styles.rowTitle, { color: c.text, fontFamily: fonts.playfair }]}>
                  {item.title}
                </Text>
                <View style={styles.rowMeta}>
                  <Text style={[styles.rowAuthor, { color: c.muted, fontFamily: fonts.dmMono }]}>
                    {item.author_display_name ?? 'Anonymous'}
                  </Text>
                  {item.published_at && (
                    <Text style={[styles.rowDate, { color: c.muted, fontFamily: fonts.dmMono }]}>
                      {formatDate(item.published_at)}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
              {index < pieces.length - 1 && (
                <View style={[styles.divider, { backgroundColor: c.border }]} />
              )}
            </>
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: SPACING.sm },
  backBtnText: { fontSize: 22 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontFamily: 'PlayfairDisplay_700Bold' },
  headerSpacer: { width: 44 },
  listContent: { paddingBottom: 40 },
  emptyContainer: { flex: 1 },
  emptyInner: { alignItems: 'center', paddingTop: 80 },
  emptyKanji: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { fontSize: 16 },
  row: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.md },
  rowTitle: { fontSize: 18, marginBottom: SPACING.xs },
  rowMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowAuthor: { fontSize: 13 },
  rowDate: { fontSize: 12 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: SPACING.md },
});
