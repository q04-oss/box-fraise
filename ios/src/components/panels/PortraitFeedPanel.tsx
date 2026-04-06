import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Dimensions, ActivityIndicator, Image,
} from 'react-native';
import { usePanel } from '../../context/PanelContext';
import { useColors, fonts, SPACING } from '../../theme';
import { fetchPortraitFeed, recordPortraitView } from '../../lib/api';

const { width: W, height: H } = Dimensions.get('window');
const CARD_HEIGHT = H * 0.75;

export default function PortraitFeedPanel() {
  const { goBack } = usePanel();
  const c = useColors();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const viewedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    fetchPortraitFeed().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    for (const vi of viewableItems) {
      if (vi.isViewable && !viewedRef.current.has(vi.item.id)) {
        viewedRef.current.add(vi.item.id);
        recordPortraitView(vi.item.id);
      }
    }
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 });

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={goBack} activeOpacity={0.7} style={styles.backBtn}>
          <Text style={[styles.backText, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.text }]}>PORTRAITS</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: c.text }]}>No portraits in circulation</Text>
          <Text style={[styles.emptyBody, { color: c.muted }]}>
            Licensed portrait tokens will appear here as advertisements.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          snapToInterval={CARD_HEIGHT + SPACING.md}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig.current}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.portrait} resizeMode="cover" />
              ) : (
                <View style={[styles.portrait, styles.portraitPlaceholder, { backgroundColor: c.border }]}>
                  <Text style={[styles.placeholderText, { color: c.muted }]}>B&W PORTRAIT</Text>
                </View>
              )}
              {/* Top-right AD label */}
              <View style={styles.adLabelContainer}>
                <Text style={styles.adLabel}>AD</Text>
              </View>
              {/* Bottom overlay with business names and handle */}
              <View style={styles.bottomOverlay}>
                <View style={styles.bizRow}>
                  {item.business_names?.map((name: string, i: number) => (
                    <Text key={i} style={styles.bizName}>{name}</Text>
                  ))}
                  {item.instagram_handle && (
                    <Text style={styles.handle}>@{item.instagram_handle}</Text>
                  )}
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40 },
  backText: { fontSize: 22 },
  title: { fontFamily: fonts.dmMono, fontSize: 11, letterSpacing: 1.5 },
  list: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 60 },
  empty: { marginTop: 60, alignItems: 'center', paddingHorizontal: SPACING.lg },
  emptyTitle: { fontFamily: fonts.playfair, fontSize: 20, marginBottom: SPACING.sm, textAlign: 'center' },
  emptyBody: { fontFamily: fonts.dmSans, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  card: {
    width: W - SPACING.md * 2,
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  portrait: { width: '100%', height: '100%' },
  portraitPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontFamily: fonts.dmMono, fontSize: 11, letterSpacing: 2 },
  adLabelContainer: {
    position: 'absolute', top: SPACING.sm, right: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  adLabel: { fontFamily: fonts.dmMono, fontSize: 8, color: 'rgba(255,255,255,0.7)', letterSpacing: 2 },
  bottomOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', padding: SPACING.md, gap: 4,
  },
  bizRow: { gap: 2 },
  bizName: { fontFamily: fonts.playfair, fontSize: 18, color: '#fff' },
  handle: { fontFamily: fonts.dmMono, fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5 },
});
