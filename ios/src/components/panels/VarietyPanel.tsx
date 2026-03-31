import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { usePanel } from '../../context/PanelContext';
import { useColors, colors, fonts } from '../../theme';
import { SPACING } from '../../theme';
import SwipeBar from '../SwipeBar';

export default function VarietyPanel() {
  const { goBack, showPanel, order, varieties } = usePanel();
  const c = useColors();
  const variety = varieties.find(v => v.id === order.variety_id);

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{variety?.name ?? '—'}</Text>
        {(variety as any)?.farm && <Text style={styles.source}>{(variety as any).farm}</Text>}
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {(variety as any)?.description && (
          <Text style={[styles.description, { color: c.text }]}>{(variety as any).description}</Text>
        )}

        {(variety as any)?.freshnessLevel !== undefined && (
          <View style={[styles.freshnessTrack, { backgroundColor: c.border }]}>
            <View style={[styles.freshnessBar, {
              width: `${((variety as any).freshnessLevel ?? 0.8) * 100}%` as any,
              backgroundColor: (variety as any).freshnessColor ?? c.green,
            }]} />
          </View>
        )}

        <View style={styles.metaRow}>
          {(variety as any)?.harvestDate && <Text style={[styles.metaText, { color: c.muted }]}>{(variety as any).harvestDate}</Text>}
          <Text style={[styles.metaText, { color: c.muted }]}>{variety?.stock_remaining ?? 0} remaining</Text>
        </View>

        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: c.text }]}>CA${((variety?.price_cents ?? 0) / 100).toFixed(2)}</Text>
          <Text style={[styles.perItem, { color: c.muted }]}>per strawberry</Text>
        </View>
      </ScrollView>

      <SwipeBar
        label="Order This Strawberry"
        onNext={() => showPanel('chocolate')}
        onBack={goBack}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    backgroundColor: colors.green,
    paddingHorizontal: SPACING.md,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 4,
  },
  title: { fontSize: 24, color: colors.cream, fontFamily: fonts.playfair },
  source: { fontSize: 12, color: 'rgba(255,255,255,0.55)', fontFamily: fonts.dmSans, fontStyle: 'italic' },
  body: { padding: SPACING.md, gap: SPACING.md },
  description: { fontSize: 13, fontFamily: fonts.dmSans, fontStyle: 'italic', lineHeight: 22 },
  freshnessTrack: { height: 2, borderRadius: 1, overflow: 'hidden' },
  freshnessBar: { height: 2, borderRadius: 1 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaText: { fontSize: 12, fontFamily: fonts.dmSans },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  price: { fontSize: 24, fontFamily: fonts.playfair },
  perItem: { fontSize: 12, fontFamily: fonts.dmSans },
});
