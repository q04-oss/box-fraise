import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { usePanel } from '../../context/PanelContext';
import { useColors, fonts, SPACING } from '../../theme';
import { fetchStickers } from '../../lib/api';

interface StickerBusiness {
  id: number;
  name: string;
  type: string;
  neighbourhood: string | null;
  sticker_concept: string | null;
  sticker_emoji: string | null;
  sticker_image_url: string | null;
}

export default function MerchPanel() {
  const { goBack, showPanel } = usePanel();
  const c = useColors();
  const [stickers, setStickers] = useState<StickerBusiness[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStickers().then(s => setStickers(s)).finally(() => setLoading(false));
  }, []);

  const handleSend = (biz: StickerBusiness) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showPanel('gift', { businessId: biz.id, businessName: biz.name, isOutreach: true });
  };

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={goBack} activeOpacity={0.7} style={styles.backBtn}>
          <Text style={[styles.backText, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.text }]}>strawberry shop</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={[styles.infoBlock, { borderBottomColor: c.border }]}>
          <Text style={[styles.description, { color: c.muted }]}>
            Send a sticker to a business you love. Digital or physical — they'll get a claim code by email.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
        ) : stickers.length === 0 ? (
          <View style={styles.infoBlock}>
            <Text style={[styles.description, { color: c.muted }]}>no stickers available yet.</Text>
          </View>
        ) : (
          <>
            <View style={[styles.sectionHeader, { borderBottomColor: c.border }]}>
              <Text style={[styles.sectionLabel, { color: c.muted }]}>BUSINESSES</Text>
            </View>
            {stickers.map((biz, i) => (
              <TouchableOpacity
                key={biz.id}
                style={[styles.row, { borderBottomColor: c.border }]}
                onPress={() => handleSend(biz)}
                activeOpacity={0.75}
              >
                <Text style={[styles.bizName, { color: c.text }]}>{biz.name}</Text>
                {!!(biz.neighbourhood || biz.sticker_concept) && (
                  <Text style={[styles.meta, { color: c.muted }]} numberOfLines={2}>
                    {[biz.neighbourhood, biz.sticker_concept].filter(Boolean).join('  ·  ')}
                  </Text>
                )}
                <Text style={[styles.action, { color: c.muted }]}>send sticker</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={{ height: 48 }} />
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
  title: { fontSize: 32, fontFamily: fonts.playfair },

  infoBlock: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 16,
  },
  description: { fontSize: 14, fontFamily: fonts.dmSans, lineHeight: 22, fontStyle: 'italic' },

  sectionHeader: {
    paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionLabel: { fontSize: 9, fontFamily: fonts.dmMono, letterSpacing: 1.5 },

  row: {
    paddingHorizontal: SPACING.md, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 4,
  },
  bizName: { fontSize: 24, fontFamily: fonts.playfair },
  meta: { fontSize: 11, fontFamily: fonts.dmMono, letterSpacing: 0.3 },
  action: { fontSize: 10, fontFamily: fonts.dmMono, letterSpacing: 0.5, textDecorationLine: 'underline', marginTop: 4 },
});
