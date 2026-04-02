import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { usePanel } from '../../context/PanelContext';
import { fetchMyTokens } from '../../lib/api';
import { useColors, fonts, SPACING } from '../../theme';
import { TokenCard, TokenCardData } from '../TokenVisual';

function tokenToCardData(t: any): TokenCardData {
  return {
    tokenId: t.id,
    tokenNumber: String(t.id).padStart(4, '0'),
    varietyName: t.variety_name ?? 'UNKNOWN',
    amountCents: t.excess_amount_cents ?? 0,
    date: t.minted_at ? t.minted_at.slice(0, 10) : '',
    originalOwner: t.minted_by_username ?? t.minted_by_name ?? 'unknown',
    size: t.visual_size ?? 50,
    color: t.visual_color ?? '#E57373',
    seeds: t.visual_seeds ?? 20,
    irregularity: t.visual_irregularity ?? 30,
  };
}

export default function MyTokensPanel() {
  const { goBack, showPanel } = usePanel();
  const c = useColors();
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await fetchMyTokens();
      setTokens(data);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backBtnText, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.accent, fontFamily: fonts.dmMono }]}>
          {'> tokens'}
          {!loading && ` [${tokens.length}]`}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={c.accent}
            />
          }
        >
          <View style={[styles.divider, { backgroundColor: c.border }]} />

          {tokens.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyLine1, { color: c.accent, fontFamily: fonts.dmMono }]}>
                {'> no tokens yet.'}
              </Text>
              <Text style={[styles.emptyLine2, { color: c.muted, fontFamily: fonts.dmMono }]}>
                {'  overpay on an order to mint your first token_'}
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {tokens.map((token) => {
                const cardData = tokenToCardData(token);
                return (
                  <TokenCard
                    key={token.id}
                    data={cardData}
                    onPress={() => showPanel('token-detail', { tokenId: token.id })}
                  />
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, paddingVertical: 4 },
  backBtnText: { fontSize: 28, lineHeight: 34 },
  title: { flex: 1, textAlign: 'center', fontSize: 15, letterSpacing: 0.5 },
  headerSpacer: { width: 40 },
  body: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: SPACING.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'center',
    paddingTop: SPACING.sm,
  },
  emptyState: {
    marginTop: SPACING.xl,
    gap: 8,
  },
  emptyLine1: {
    fontSize: 14,
    letterSpacing: 0.3,
  },
  emptyLine2: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
