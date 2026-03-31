import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { usePanel } from '../../context/PanelContext';
import { useColors, colors, fonts } from '../../theme';
import { SPACING } from '../../theme';
import { QUANTITIES } from '../../data/seed';
import SwipeBar from '../SwipeBar';

export default function QuantityPanel() {
  const { goBack, showPanel, order, setOrder } = usePanel();
  const c = useColors();
  const [selected, setSelected] = useState<number>(order.quantity ?? 4);
  const [isGift, setIsGift] = useState(order.is_gift);

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg }]}>
      <View style={styles.header}>
        <View style={styles.progress}>
          {Array.from({ length: 7 }).map((_, i) => (
            <View key={i} style={[styles.seg, i < 4 && styles.segActive]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>STEP 4 OF 7</Text>
        <Text style={styles.stepTitle}>Quantity</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.grid}>
          {QUANTITIES.map(q => {
            const isSelected = selected === q;
            return (
              <TouchableOpacity
                key={q}
                style={[
                  styles.qCard,
                  { backgroundColor: c.optionCard, borderColor: c.optionCardBorder },
                  isSelected && styles.qCardSelected,
                ]}
                onPress={() => setSelected(q)}
                activeOpacity={0.85}
              >
                <Text style={[styles.qNum, { color: c.text }, isSelected && styles.qNumSelected]}>{q}</Text>
                <Text style={[styles.qLabel, { color: c.muted }, isSelected && styles.qLabelSelected]}>
                  {q === 1 ? 'strawberry' : 'strawberries'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.giftRow, { backgroundColor: c.optionCard }]}>
          <Text style={[styles.giftLabel, { color: c.text }]}>This is a gift</Text>
          <Switch
            value={isGift}
            onValueChange={setIsGift}
            trackColor={{ true: c.green }}
            thumbColor={c.cream}
          />
        </View>
      </View>

      <SwipeBar
        label="Continue"
        onNext={() => {
          setOrder({ quantity: selected, is_gift: isGift });
          showPanel('when');
        }}
        onBack={goBack}
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
  body: { flex: 1, padding: SPACING.md, gap: SPACING.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  qCard: {
    width: '47%',
    borderRadius: 14,
    padding: SPACING.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  qCardSelected: { backgroundColor: colors.green, borderColor: 'transparent' },
  qNum: { fontSize: 32, fontFamily: fonts.playfair },
  qNumSelected: { color: colors.cream },
  qLabel: { fontSize: 12, fontFamily: fonts.dmSans },
  qLabelSelected: { color: 'rgba(232,224,208,0.65)' },
  giftRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
  },
  giftLabel: { fontSize: 15, fontFamily: fonts.playfair },
});
