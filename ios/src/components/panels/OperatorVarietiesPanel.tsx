import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { usePanel } from '../../context/PanelContext';
import { useColors, fonts } from '../../theme';
import { SPACING } from '../../theme';
import { updateVarietySortOrder } from '../../lib/api';

export default function OperatorVarietiesPanel() {
  const { goBack, varieties, setVarieties, panelData } = usePanel();
  const c = useColors();
  const adminPin: string = (panelData?.adminPin as string) ?? '';
  const [saving, setSaving] = useState<number | null>(null);

  const sorted = [...varieties].sort((a, b) => {
    const aOrder = a.sort_order ?? 0;
    const bOrder = b.sort_order ?? 0;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.id - b.id;
  });

  const handleMove = useCallback(async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const itemA = sorted[index];
    const itemB = sorted[targetIndex];

    const newOrderA = itemB.sort_order ?? targetIndex;
    const newOrderB = itemA.sort_order ?? index;

    setSaving(itemA.id);
    try {
      await updateVarietySortOrder(itemA.id, newOrderA, adminPin);
      await updateVarietySortOrder(itemB.id, newOrderB, adminPin);

      setVarieties(
        varieties.map(v => {
          if (v.id === itemA.id) return { ...v, sort_order: newOrderA };
          if (v.id === itemB.id) return { ...v, sort_order: newOrderB };
          return v;
        })
      );
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not update sort order.');
    } finally {
      setSaving(null);
    }
  }, [sorted, varieties, adminPin, setVarieties]);

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backBtnText, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerLabel, { color: c.muted }]}>OPERATOR</Text>
          <Text style={[styles.title, { color: c.text }]}>Variety Order</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionLabel, { color: c.muted }]}>DRAG TO REORDER — USE ARROWS</Text>

        {sorted.length === 0 ? (
          <Text style={[styles.emptyText, { color: c.muted }]}>No varieties loaded.</Text>
        ) : (
          sorted.map((v, index) => {
            const isSaving = saving === v.id;
            const isFirst = index === 0;
            const isLast = index === sorted.length - 1;

            return (
              <View
                key={v.id}
                style={[styles.row, { borderBottomColor: c.border }]}
              >
                <View style={styles.orderBadge}>
                  <Text style={[styles.orderNum, { color: c.muted }]}>
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                </View>

                <View style={styles.info}>
                  <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>{v.name}</Text>
                  <Text style={[styles.meta, { color: c.muted }]}>
                    {v.stock_remaining <= 0 ? 'SOLD OUT' : `${v.stock_remaining} left`}
                    {v.tag ? `  ·  ${v.tag}` : ''}
                  </Text>
                </View>

                <View style={styles.arrows}>
                  {isSaving ? (
                    <ActivityIndicator size="small" color={c.accent} style={styles.spinner} />
                  ) : (
                    <>
                      <TouchableOpacity
                        onPress={() => handleMove(index, 'up')}
                        disabled={isFirst || saving !== null}
                        activeOpacity={0.6}
                        style={[styles.arrowBtn, isFirst && styles.arrowDisabled]}
                      >
                        <Text style={[styles.arrowText, { color: isFirst ? c.border : c.accent }]}>▲</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleMove(index, 'down')}
                        disabled={isLast || saving !== null}
                        activeOpacity={0.6}
                        style={[styles.arrowBtn, isLast && styles.arrowDisabled]}
                      >
                        <Text style={[styles.arrowText, { color: isLast ? c.border : c.accent }]}>▼</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
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
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  headerLabel: { fontSize: 9, fontFamily: fonts.dmMono, letterSpacing: 1.5 },
  title: { fontSize: 18, fontFamily: fonts.dmMono },
  headerSpacer: { width: 40 },
  sectionLabel: {
    fontSize: 10,
    fontFamily: fonts.dmMono,
    letterSpacing: 1.5,
    paddingHorizontal: SPACING.md,
    paddingTop: 16,
    paddingBottom: 10,
  },
  list: { flex: 1 },
  emptyText: { fontSize: 14, fontFamily: fonts.dmMono, textAlign: 'center', marginTop: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  orderBadge: { width: 28, alignItems: 'center' },
  orderNum: { fontSize: 11, fontFamily: fonts.dmMono, letterSpacing: 0.5 },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 16, fontFamily: fonts.dmMono },
  meta: { fontSize: 10, fontFamily: fonts.dmMono, letterSpacing: 0.5 },
  arrows: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  arrowBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  arrowDisabled: { opacity: 0.3 },
  arrowText: { fontSize: 14, fontFamily: fonts.dmMono },
  spinner: { width: 72, height: 34 },
});
