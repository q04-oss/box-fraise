import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image,
  StyleSheet, ActivityIndicator, Linking, Platform,
} from 'react-native';
import { usePanel } from '../../context/PanelContext';
import { fetchBusinessPortraits, fetchBusinessVisitCount } from '../../lib/api';
import { useColors, fonts } from '../../theme';
import { SPACING } from '../../theme';

export default function PartnerDetailPanel() {
  const { goBack, activeLocation } = usePanel();
  const c = useColors();
  const [portraits, setPortraits] = useState<{ id: number; url: string; season: string; subject_name?: string }[]>([]);
  const [visitCount, setVisitCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const biz = activeLocation;

  useEffect(() => {
    if (!biz) { setLoading(false); return; }
    Promise.all([
      fetchBusinessPortraits(biz.id).catch(() => []),
      fetchBusinessVisitCount(biz.id).catch(() => null),
    ]).then(([p, v]) => {
      setPortraits(p as any[]);
      setVisitCount(v ? (v as any).visit_count : null);
    }).finally(() => setLoading(false));
  }, [biz?.id]);

  const handleInstagram = (handle: string) => {
    Linking.openURL(`https://instagram.com/${handle.replace('@', '')}`);
  };

  const handleOpenMaps = () => {
    if (!biz?.address) return;
    const encoded = encodeURIComponent(biz.address);
    const url = Platform.OS === 'ios'
      ? `maps://?q=${encoded}`
      : `geo:0,0?q=${encoded}`;
    Linking.openURL(url);
  };

  if (!biz) return null;

  const campaigns = portraits.reduce<Record<string, typeof portraits>>((acc, p) => {
    const key = p.season ?? 'Archive';
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});
  const campaignKeys = Object.keys(campaigns);

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backBtnText, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>{biz.name}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

        {/* Currently placed user */}
        {biz.placed_user_name && (
          <View style={[styles.placedBanner, { backgroundColor: '#FDF6E3', borderColor: '#C9973A22' }]}>
            <View style={styles.placedDot} />
            <Text style={[styles.placedText, { color: '#7A5C1E' }]}>
              {biz.placed_user_name} is here right now
            </Text>
          </View>
        )}

        {/* Business info */}
        <View style={[styles.infoBlock, { borderBottomColor: c.border }]}>
          {!!biz.description && (
            <Text style={[styles.description, { color: c.text }]}>{biz.description}</Text>
          )}

          <View style={styles.metaRow}>
            {!!biz.neighbourhood && (
              <Text style={[styles.metaChip, { color: c.muted, borderColor: c.border }]}>{biz.neighbourhood}</Text>
            )}
            {visitCount !== null && visitCount > 0 && (
              <Text style={[styles.metaChip, { color: c.muted, borderColor: c.border }]}>
                {visitCount} member {visitCount === 1 ? 'visit' : 'visits'}
              </Text>
            )}
          </View>

          {!!biz.hours && (
            <View style={styles.hoursRow}>
              <Text style={[styles.hoursLabel, { color: c.muted }]}>HOURS</Text>
              <Text style={[styles.hoursText, { color: c.text }]}>{biz.hours}</Text>
            </View>
          )}

          <View style={styles.addressRow}>
            <Text style={[styles.addressText, { color: c.muted }]}>{biz.address}</Text>
            <TouchableOpacity onPress={handleOpenMaps} activeOpacity={0.7}>
              <Text style={[styles.mapsLink, { color: c.accent }]}>Open in Maps →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.linksRow}>
            {!!biz.instagram_handle && (
              <TouchableOpacity
                style={[styles.linkBtn, { borderColor: c.border }]}
                onPress={() => handleInstagram(biz.instagram_handle!)}
                activeOpacity={0.7}
              >
                <Text style={[styles.linkBtnText, { color: c.text }]}>
                  @{biz.instagram_handle.replace('@', '')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Campaign portrait rails */}
        {loading ? (
          <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
        ) : campaignKeys.length === 0 ? null : (
          <View style={styles.portraitsSection}>
            <Text style={[styles.portraitsLabel, { color: c.muted }]}>CAMPAIGNS</Text>
            {campaignKeys.map(season => (
              <View key={season} style={styles.campaign}>
                <Text style={[styles.campaignSeason, { color: c.muted }]}>{season}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.portraitRail}
                >
                  {campaigns[season].map(p => (
                    <View key={p.id} style={styles.portraitItem}>
                      <Image
                        source={{ uri: p.url }}
                        style={[styles.portraitImage, { backgroundColor: c.card }]}
                        resizeMode="cover"
                      />
                      {!!p.subject_name && (
                        <Text style={[styles.portraitName, { color: c.muted }]}>{p.subject_name}</Text>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 48 }} />
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
  title: { flex: 1, textAlign: 'center', fontSize: 20, fontFamily: fonts.playfair },
  headerSpacer: { width: 40 },
  body: { flex: 1 },

  placedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  placedDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#C9973A',
  },
  placedText: { fontSize: 13, fontFamily: fonts.dmSans },

  infoBlock: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  description: { fontSize: 14, fontFamily: fonts.dmSans, lineHeight: 22 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip: {
    fontSize: 11, fontFamily: fonts.dmMono,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },

  hoursRow: { gap: 3 },
  hoursLabel: { fontSize: 9, fontFamily: fonts.dmMono, letterSpacing: 1.5 },
  hoursText: { fontSize: 13, fontFamily: fonts.dmSans },

  addressRow: { gap: 3 },
  addressText: { fontSize: 12, fontFamily: fonts.dmSans },
  mapsLink: { fontSize: 12, fontFamily: fonts.dmMono },

  linksRow: { flexDirection: 'row', gap: 10 },
  linkBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  linkBtnText: { fontSize: 12, fontFamily: fonts.dmMono },

  portraitsSection: { paddingTop: SPACING.md, gap: 20 },
  portraitsLabel: {
    fontSize: 10, fontFamily: fonts.dmMono, letterSpacing: 1.5,
    paddingHorizontal: SPACING.md,
  },
  campaign: { gap: 10 },
  campaignSeason: { fontSize: 12, fontFamily: fonts.dmMono, paddingHorizontal: SPACING.md },
  portraitRail: { paddingHorizontal: SPACING.md, gap: 10 },
  portraitItem: { gap: 5 },
  portraitImage: { width: 160, height: 200, borderRadius: 4 },
  portraitName: { fontSize: 11, fontFamily: fonts.dmMono, textAlign: 'center', width: 160 },
});
