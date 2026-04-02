import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePanel } from '../../context/PanelContext';
import { useColors, fonts } from '../../theme';
import { SPACING } from '../../theme';
import { CHOCOLATES } from '../../data/seed';

export default function ChocolatePanel() {
  const { goBack, showPanel, order, setOrder } = usePanel();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<string | null>(order.chocolate);

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backBtnText, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.text }]}>Chocolate</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        <Text style={[styles.sectionLabel, { color: c.muted }]}>CHOCOLATE</Text>
        <View style={[styles.card, { backgroundColor: c.card }]}>
          {CHOCOLATES.map((choc, i) => {
            const isSelected = selected === choc.id;
            return (
              <React.Fragment key={choc.id}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: c.border }]} />}
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => setSelected(choc.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.swatch, { backgroundColor: choc.swatchColor }]} />
                  <View style={styles.rowText}>
                    <View style={styles.rowTop}>
                      <Text style={[styles.chocName, { color: c.text }]}>{choc.name}</Text>
                      {choc.tag && (
                        <View style={[styles.tag, { backgroundColor: c.cardDark }]}>
                          <Text style={[styles.tagText, { color: c.muted }]}>{choc.tag}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.chocSource, { color: c.muted }]}>{choc.source}</Text>
                    {isSelected && (
                      <Text style={[styles.chocDesc, { color: c.muted }]}>{choc.description} {choc.tagline}</Text>
                    )}
                  </View>
                  <View style={[styles.radio, { borderColor: isSelected ? c.accent : c.border }]}>
                    {isSelected && <View style={[styles.radioDot, { backgroundColor: c.accent }]} />}
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom || SPACING.md }]}>
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: c.accent }, !selected && styles.ctaDisabled]}
          onPress={() => {
            if (!selected) return;
            const choc = CHOCOLATES.find(x => x.id === selected);
            setOrder({ chocolate: selected, chocolate_name: choc?.name ?? selected });
            showPanel('finish');
          }}
          disabled={!selected}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: 18,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, paddingVertical: 4 },
  backBtnText: { fontSize: 28, lineHeight: 34 },
  title: { flex: 1, textAlign: 'center', fontSize: 20, fontFamily: fonts.playfair },
  headerSpacer: { width: 40 },
  body: { flex: 1, paddingHorizontal: SPACING.md, paddingTop: SPACING.md, gap: 8 },
  sectionLabel: { fontSize: 11, fontFamily: fonts.dmMono, letterSpacing: 1, marginLeft: 4 },
  card: { borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 14, gap: 12 },
  swatch: { width: 20, height: 20, borderRadius: 10, flexShrink: 0 },
  rowText: { flex: 1, gap: 2 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chocName: { fontSize: 15, fontFamily: fonts.playfair },
  chocSource: { fontSize: 12, fontFamily: fonts.dmSans },
  tag: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontSize: 9, fontFamily: fonts.dmMono, letterSpacing: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: SPACING.md },
  chocDesc: { fontSize: 12, fontFamily: fonts.dmSans, lineHeight: 18, marginTop: 2, fontStyle: 'italic' },
  footer: { padding: SPACING.md, paddingTop: 12 },
  cta: { borderRadius: 16, paddingVertical: 20, alignItems: 'center' },
  ctaDisabled: { opacity: 0.3 },
  ctaText: { fontSize: 16, fontFamily: fonts.dmSans, fontWeight: '700', color: '#FFFFFF' },
});
