import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { usePanel } from '../../context/PanelContext';
import { useColors, colors, fonts } from '../../theme';
import { SPACING } from '../../theme';
import { FINISHES } from '../../data/seed';
import SwipeBar from '../SwipeBar';

export default function FinishPanel() {
  const { goBack, showPanel, order, setOrder } = usePanel();
  const c = useColors();
  const [selected, setSelected] = useState<string | null>(order.finish);

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg }]}>
      <View style={styles.header}>
        <View style={styles.progress}>
          {Array.from({ length: 7 }).map((_, i) => (
            <View key={i} style={[styles.seg, i < 3 && styles.segActive]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>STEP 3 OF 7</Text>
        <Text style={styles.stepTitle}>Finish</Text>
      </View>

      <View style={[styles.strip, { backgroundColor: c.stripBg }]}>
        <Text style={[styles.stripText, { color: c.text }]}>{order.variety_name ?? '—'} · {order.chocolate_name ?? '—'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.options} showsVerticalScrollIndicator={false}>
        {FINISHES.map(fin => {
          const isSelected = selected === fin.id;
          return (
            <TouchableOpacity
              key={fin.id}
              style={[
                styles.optionCard,
                { backgroundColor: c.optionCard, borderColor: c.optionCardBorder },
                isSelected && styles.optionCardSelected,
              ]}
              onPress={() => setSelected(fin.id)}
              activeOpacity={0.85}
            >
              <Text style={[styles.optionName, { color: c.text }, isSelected && styles.optionNameSelected]}>{fin.name}</Text>
              <Text style={[styles.optionDesc, { color: c.muted }, isSelected && styles.optionDescSelected]}>{fin.description}</Text>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 20 }} />
      </ScrollView>

      <SwipeBar
        label="Continue"
        onNext={() => {
          if (!selected) return;
          const fin = FINISHES.find(x => x.id === selected);
          setOrder({ finish: selected, finish_name: fin?.name ?? selected });
          showPanel('quantity');
        }}
        onBack={goBack}
        disabled={!selected}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: colors.green, paddingHorizontal: SPACING.md, paddingTop: 16, paddingBottom: 20 },
  progress: { flexDirection: 'row', gap: 3, marginBottom: 8 },
  seg: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 1 },
  segActive: { backgroundColor: colors.cream },
  stepLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 10, fontFamily: fonts.dmMono, letterSpacing: 1.5, marginBottom: 2 },
  stepTitle: { color: colors.cream, fontSize: 28, fontFamily: fonts.playfair },
  strip: { paddingHorizontal: SPACING.md, paddingVertical: 10 },
  stripText: { fontSize: 13, fontFamily: fonts.dmSans },
  options: { padding: SPACING.md, gap: SPACING.sm },
  optionCard: {
    borderRadius: 14,
    padding: SPACING.md,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  optionCardSelected: { backgroundColor: colors.green, borderColor: 'transparent' },
  optionName: { fontSize: 16, fontFamily: fonts.playfair },
  optionNameSelected: { color: colors.cream },
  optionDesc: { fontSize: 13, fontFamily: fonts.dmSans, fontStyle: 'italic' },
  optionDescSelected: { color: 'rgba(232,224,208,0.65)' },
});
