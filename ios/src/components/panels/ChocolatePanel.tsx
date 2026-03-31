import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { usePanel } from '../../context/PanelContext';
import { colors, fonts } from '../../theme';
import { SPACING } from '../../theme';
import { CHOCOLATES } from '../../data/seed';

export default function ChocolatePanel() {
  const { goBack, showPanel, order, setOrder } = usePanel();
  const [selected, setSelected] = useState<string | null>(order.chocolate);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.back}>
          <Text style={styles.backText}>← Variety</Text>
        </TouchableOpacity>
        <View style={styles.progress}>
          {Array.from({ length: 7 }).map((_, i) => (
            <View key={i} style={[styles.seg, i < 2 && styles.segActive]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>STEP 2 OF 7</Text>
        <Text style={styles.stepTitle}>Chocolate</Text>
      </View>

      {/* Summary strip */}
      <View style={styles.strip}>
        <Text style={styles.stripText}>{order.variety_name ?? '—'}</Text>
        <Text style={styles.stripPrice}>{order.price_cents ? `CA$${(order.price_cents / 100).toFixed(2)}` : ''}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.options} showsVerticalScrollIndicator={false}>
        {CHOCOLATES.map(c => {
          const isSelected = selected === c.id;
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.optionCard, isSelected && styles.optionCardSelected]}
              onPress={() => setSelected(c.id)}
              activeOpacity={0.85}
            >
              <Text style={[styles.optionName, isSelected && styles.optionNameSelected]}>{c.name}</Text>
              <Text style={[styles.optionDesc, isSelected && styles.optionDescSelected]}>{c.description}</Text>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueBtn, !selected && styles.continueBtnDisabled]}
          onPress={() => {
            if (!selected) return;
            const c = CHOCOLATES.find(x => x.id === selected);
            setOrder({ chocolate: selected, chocolate_name: c?.name ?? selected });
            showPanel('finish');
          }}
          disabled={!selected}
          activeOpacity={0.85}
        >
          <Text style={styles.continueBtnText}>Continue →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: colors.green, paddingHorizontal: SPACING.md, paddingTop: 16, paddingBottom: 20 },
  back: { paddingVertical: 4, marginBottom: 8 },
  backText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontFamily: fonts.dmSans },
  progress: { flexDirection: 'row', gap: 3, marginBottom: 8 },
  seg: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 1 },
  segActive: { backgroundColor: colors.cream },
  stepLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 10, fontFamily: fonts.dmMono, letterSpacing: 1.5, marginBottom: 2 },
  stepTitle: { color: colors.cream, fontSize: 28, fontFamily: fonts.playfair },
  strip: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: 10, backgroundColor: colors.cardDark },
  stripText: { fontSize: 13, color: colors.text, fontFamily: fonts.dmSans },
  stripPrice: { fontSize: 13, color: colors.text, fontFamily: fonts.dmMono },
  options: { padding: SPACING.md, gap: SPACING.sm },
  optionCard: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 14,
    padding: SPACING.md,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  optionCardSelected: { backgroundColor: colors.green, borderColor: 'transparent' },
  optionName: { fontSize: 16, color: colors.text, fontFamily: fonts.playfair },
  optionNameSelected: { color: colors.cream },
  optionDesc: { fontSize: 13, color: colors.muted, fontFamily: fonts.dmSans, fontStyle: 'italic' },
  optionDescSelected: { color: 'rgba(232,224,208,0.65)' },
  footer: { padding: SPACING.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.06)' },
  continueBtn: { backgroundColor: colors.green, borderRadius: 30, paddingVertical: 16, alignItems: 'center' },
  continueBtnDisabled: { opacity: 0.4 },
  continueBtnText: { color: colors.cream, fontSize: 14, fontFamily: fonts.dmSans, fontWeight: '700', letterSpacing: 1 },
});
