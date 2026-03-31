import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Animated, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { usePanel, Variety } from '../../context/PanelContext';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { fetchVarieties } from '../../lib/api';
import { useColors, fonts } from '../../theme';
import { SPACING } from '../../theme';
import { STRAWBERRIES } from '../../data/seed';
import { RootStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SHORTCUTS = ['Order again', 'Ready now', 'Gift'];

export default function HomePanel() {
  const navigation = useNavigation<Nav>();
  const { showPanel, varieties, setVarieties, setOrder, activeLocation } = usePanel();
  const c = useColors();
  const [loading, setLoading] = useState(true);
  const cursorAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchVarieties()
      .then((data: any[]) => {
        const merged = data.map(v => {
          const seed = STRAWBERRIES.find(s => s.name === v.name);
          return { ...seed, ...v };
        });
        setVarieties(merged);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    Animated.loop(
      Animated.sequence([
        Animated.timing(cursorAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(cursorAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleVarietyPress = (v: Variety) => {
    setOrder({ variety_id: v.id, variety_name: v.name, price_cents: v.price_cents });
    showPanel('variety');
    TrueSheet.present('main-sheet', 2);
  };

  return (
    <View style={styles.container}>
      {/* Top row */}
      <View style={styles.topRow}>
        <Text style={[styles.wordmark, { color: c.text }]}>maison fraise</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.7}
          style={[styles.profileBtn, { borderColor: c.border }]}
        >
          <Text style={[styles.profileIcon, { color: c.muted }]}>⊙</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <TouchableOpacity
        style={[styles.searchBar, { backgroundColor: c.searchBg, borderColor: c.searchBorder }]}
        onPress={() => {
          showPanel('ask');
          TrueSheet.present('main-sheet', 2);
        }}
        activeOpacity={0.9}
      >
        <Animated.View style={[styles.cursor, { opacity: cursorAnim, backgroundColor: c.text }]} />
        <Text style={[styles.searchPlaceholder, { color: c.muted }]}>Ask about today's strawberries…</Text>
      </TouchableOpacity>

      {/* Shortcut pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
        {SHORTCUTS.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.pill, { backgroundColor: c.pillBg, borderColor: c.pillBorder }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, { color: c.text }]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Location header */}
      {activeLocation && (
        <View style={styles.locationHeader}>
          <Text style={[styles.locationTypeLabel, { color: c.muted }]}>COLLECTION POINT</Text>
          <Text style={[styles.locationName, { color: c.text }]}>{activeLocation.name}</Text>
          <Text style={[styles.locationAddress, { color: c.muted }]}>{activeLocation.address}</Text>
        </View>
      )}

      {/* Variety list */}
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={c.accent} style={{ marginTop: 24 }} />
        ) : varieties.length === 0 ? (
          <Text style={[styles.emptyText, { color: c.muted }]}>Nothing ready today.</Text>
        ) : (
          varieties.map(v => (
            <TouchableOpacity
              key={v.id}
              style={[styles.varietyRow, { borderBottomColor: c.border }]}
              onPress={() => handleVarietyPress(v)}
              activeOpacity={0.8}
            >
              <View style={[styles.varietyDot, { backgroundColor: c.accent }]} />
              <View style={styles.varietyInfo}>
                <Text style={[styles.varietyName, { color: c.text }]}>{v.name}</Text>
                {(v as any).farm && <Text style={[styles.varietyFarm, { color: c.muted }]}>{(v as any).farm}</Text>}
              </View>
              <View style={styles.varietyRight}>
                <Text style={[styles.varietyPrice, { color: c.text }]}>CA${(v.price_cents / 100).toFixed(2)}</Text>
                <Text style={[styles.varietyStock, { color: c.muted }]}>{v.stock_remaining} left</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: 12,
    paddingBottom: 8,
  },
  wordmark: { fontSize: 16, fontFamily: fonts.playfairItalic, letterSpacing: 0.5 },
  profileBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIcon: { fontSize: 18 },
  searchBar: {
    marginHorizontal: SPACING.md,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  cursor: { width: 2, height: 16, borderRadius: 1 },
  pillRow: { paddingHorizontal: SPACING.md, paddingBottom: 8, gap: 8 },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillText: { fontSize: 12, fontFamily: fonts.dmSans },
  locationHeader: { paddingHorizontal: SPACING.md, paddingBottom: 8, gap: 2 },
  locationTypeLabel: { fontSize: 10, fontFamily: fonts.dmMono, letterSpacing: 1.5 },
  locationName: { fontSize: 18, fontFamily: fonts.playfair },
  locationAddress: { fontSize: 12, fontFamily: fonts.dmSans },
  searchPlaceholder: { fontSize: 14, fontFamily: fonts.dmSans, marginLeft: 8 },
  list: { flex: 1 },
  emptyText: { fontSize: 14, fontFamily: fonts.dmSans, textAlign: 'center', marginTop: 24, fontStyle: 'italic' },
  varietyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  varietyDot: { width: 6, height: 6, borderRadius: 3 },
  varietyInfo: { flex: 1, gap: 2 },
  varietyName: { fontSize: 15, fontFamily: fonts.playfair },
  varietyFarm: { fontSize: 11, fontFamily: fonts.dmSans },
  varietyRight: { alignItems: 'flex-end', gap: 2 },
  varietyPrice: { fontSize: 12, fontFamily: fonts.dmMono },
  varietyStock: { fontSize: 10, fontFamily: fonts.dmSans },
});
