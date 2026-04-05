import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePanel } from '../../context/PanelContext';
import { fetchCollectifs } from '../../lib/api';
import { useColors, fonts, SPACING } from '../../theme';

function fmtCAD(cents: number) {
  return `CA$${(cents / 100).toLocaleString('en-CA', { minimumFractionDigits: 2 })}`;
}

function daysLeft(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  const d = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return d <= 0 ? 'expired' : d === 1 ? '1 day left' : `${d} days left`;
}

export default function CollectifListPanel() {
  const { goBack, showPanel } = usePanel();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('verified').then(v => setIsVerified(v === 'true'));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    fetchCollectifs()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const renderItem = ({ item }: { item: any }) => {
    const progress = item.target_quantity > 0
      ? Math.min(1, item.current_quantity / item.target_quantity)
      : 0;
    const isPopup = item.collectif_type === 'popup';
    return (
      <TouchableOpacity
        style={[styles.card, { borderColor: c.border, backgroundColor: c.card }]}
        onPress={() => showPanel('collectif-detail', { collectifId: item.id })}
        activeOpacity={0.75}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: c.text }]}>{item.title}</Text>
            <Text style={[styles.business, { color: c.accent }]}>{item.business_name}</Text>
            {isPopup && item.proposed_venue ? (
              <Text style={[styles.business, { color: c.muted, marginTop: 1 }]}>{item.proposed_venue}</Text>
            ) : null}
          </View>
          <View style={styles.discountBadge}>
            {isPopup
              ? <Text style={[styles.discountText, { color: c.accent }]}>POPUP</Text>
              : <Text style={[styles.discountText, { color: c.accent }]}>{item.proposed_discount_pct}% off</Text>
            }
          </View>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: c.accent }]} />
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.meta, { color: c.muted }]}>
            {isPopup
              ? `${item.current_quantity} / ${item.target_quantity} attending · ${fmtCAD(item.price_cents)} deposit`
              : `${item.current_quantity} / ${item.target_quantity} · ${fmtCAD(item.price_cents)}/unit`
            }
          </Text>
          <Text style={[styles.meta, { color: c.muted }]}>{daysLeft(item.deadline)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backArrow, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>Collectifs</Text>
        {isVerified ? (
          <TouchableOpacity
            onPress={() => showPanel('collectif-create')}
            style={styles.createBtn}
            activeOpacity={0.7}
          >
            <Text style={[styles.createBtnText, { color: c.accent }]}>+ propose</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 70 }} />
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: c.text }]}>No open collectifs.</Text>
          <Text style={[styles.emptyBody, { color: c.muted }]}>
            {isVerified
              ? 'Be the first to propose one.'
              : 'Become a verified member to propose a collectif.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => String(i.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: SPACING.md, gap: 10 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingTop: 18, paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, paddingVertical: 4 },
  backArrow: { fontSize: 28, lineHeight: 34 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontFamily: fonts.playfair },
  createBtn: { width: 70, alignItems: 'flex-end' },
  createBtnText: { fontFamily: fonts.dmMono, fontSize: 11, letterSpacing: 0.5 },
  card: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 14, gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { fontFamily: fonts.playfair, fontSize: 16, marginBottom: 2 },
  business: { fontFamily: fonts.dmMono, fontSize: 10, letterSpacing: 0.5 },
  discountBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  discountText: { fontFamily: fonts.dmMono, fontSize: 11, letterSpacing: 1 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { fontFamily: fonts.dmMono, fontSize: 10 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg, gap: 10 },
  emptyTitle: { fontFamily: fonts.playfair, fontSize: 18 },
  emptyBody: { fontFamily: fonts.dmSans, fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
