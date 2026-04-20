import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking, Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { usePanel } from '../../context/PanelContext';
import { useColors, fonts, SPACING } from '../../theme';

// Update these when the store is live
const MERCH_STORE_URL = 'https://shop.fraise.box/cart/50900019970281:1';

interface MerchItem {
  id: string;
  name: string;
  description: string;
  price: string;
  sizes?: string[];
}

const ITEMS: MerchItem[] = [
  {
    id: 'sticker-pack',
    name: 'Sticker Pack',
    description: '5 die-cut vinyl strawberry stickers · weatherproof · kiss-cut',
    price: '$14',
  },
];

export default function MerchPanel() {
  const { goBack, showPanel } = usePanel();
  const c = useColors();
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});

  const handlePreOrder = async (item: MerchItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (item.sizes && !selectedSizes[item.id]) {
      Alert.alert('Select a size', 'Please select a size before pre-ordering.');
      return;
    }
    if (MERCH_STORE_URL) {
      try {
        await Linking.openURL(MERCH_STORE_URL);
      } catch {
        Alert.alert('Could not open store', 'Please try again.');
      }
    } else {
      Alert.alert(
        'Pre-orders opening soon',
        'We\'ll notify you when the shop is live.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={goBack} activeOpacity={0.7} style={styles.backBtn}>
          <Text style={[styles.backText, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.text }]}>SHOP</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.preOrderBadge, { color: c.accent }]}>PRE-ORDER</Text>
        <Text style={[styles.intro, { color: c.muted }]}>
          Ships to your door. Pick up at a partner location near you when they're live.
        </Text>

        {/* Gift row */}
        <TouchableOpacity
          style={[styles.giftRow, { borderColor: c.border }]}
          onPress={() => showPanel('gift')}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.giftLabel, { color: c.text }]}>Send a sticker as a gift</Text>
            <Text style={[styles.giftSub, { color: c.muted }]}>Digital from $3 · Physical from $14</Text>
          </View>
          <Text style={[styles.giftArrow, { color: c.accent }]}>→</Text>
        </TouchableOpacity>

        {ITEMS.map((item, i) => (
          <View
            key={item.id}
            style={[
              styles.card,
              { backgroundColor: c.card, borderColor: c.border },
              i === ITEMS.length - 1 && { marginBottom: 0 },
            ]}
          >
            <View style={styles.cardTop}>
              <View style={styles.cardInfo}>
                <Text style={[styles.itemName, { color: c.text }]}>{item.name}</Text>
                <Text style={[styles.itemDesc, { color: c.muted }]}>{item.description}</Text>
              </View>
              <Text style={[styles.itemPrice, { color: c.text }]}>{item.price}</Text>
            </View>

            {item.sizes && (
              <View style={styles.sizes}>
                {item.sizes.map(size => {
                  const selected = selectedSizes[item.id] === size;
                  return (
                    <TouchableOpacity
                      key={size}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedSizes(prev => ({ ...prev, [item.id]: size }));
                      }}
                      activeOpacity={0.7}
                      style={[
                        styles.sizeBtn,
                        { borderColor: selected ? c.accent : c.border },
                        selected && { backgroundColor: c.accent },
                      ]}
                    >
                      <Text style={[
                        styles.sizeBtnText,
                        { color: selected ? '#fff' : c.muted },
                      ]}>{size}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <TouchableOpacity
              style={[styles.preOrderBtn, { borderColor: c.accent }]}
              onPress={() => handlePreOrder(item)}
              activeOpacity={0.75}
            >
              <Text style={[styles.preOrderBtnText, { color: c.accent }]}>PRE-ORDER</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingTop: 18, paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40 },
  backText: { fontSize: 22 },
  title: { fontSize: 11, fontFamily: fonts.dmMono, letterSpacing: 1.5 },
  scroll: { padding: SPACING.md, paddingBottom: 60, gap: 12 },
  preOrderBadge: {
    fontFamily: fonts.dmMono, fontSize: 9, letterSpacing: 2,
    marginBottom: 6,
  },
  intro: {
    fontFamily: fonts.dmSans, fontSize: 13, lineHeight: 20,
    marginBottom: 20,
  },
  card: {
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.md, gap: 14,
  },
  cardTop: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
  },
  cardInfo: { flex: 1, gap: 4 },
  itemName: { fontFamily: fonts.playfair, fontSize: 20 },
  itemDesc: { fontFamily: fonts.dmSans, fontSize: 13, lineHeight: 18 },
  itemPrice: { fontFamily: fonts.dmMono, fontSize: 15, letterSpacing: 0.5 },
  sizes: { flexDirection: 'row', gap: 8 },
  sizeBtn: {
    width: 42, height: 32, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  sizeBtnText: { fontFamily: fonts.dmMono, fontSize: 11, letterSpacing: 0.5 },
  preOrderBtn: {
    borderWidth: 1, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  preOrderBtnText: { fontFamily: fonts.dmMono, fontSize: 11, letterSpacing: 2 },
  giftRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 14,
    padding: SPACING.md, gap: 12,
  },
  giftLabel: { fontFamily: fonts.playfair, fontSize: 17, marginBottom: 3 },
  giftSub: { fontFamily: fonts.dmMono, fontSize: 11, letterSpacing: 0.3 },
  giftArrow: { fontFamily: fonts.dmMono, fontSize: 18 },
});
