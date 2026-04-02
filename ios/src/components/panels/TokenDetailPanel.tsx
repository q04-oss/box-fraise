import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  Alert, TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePanel } from '../../context/PanelContext';
import { fetchToken, offerTokenTrade } from '../../lib/api';
import { useColors, fonts, SPACING } from '../../theme';
import { TokenVisual } from '../TokenVisual';

export default function TokenDetailPanel() {
  const { goBack, panelData } = usePanel();
  const c = useColors();
  const tokenId: number = panelData?.tokenId ?? 0;

  const [token, setToken] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [offerStatus, setOfferStatus] = useState<string | null>(null);
  const [offering, setOffering] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('user_db_id').then(id => {
      if (id) setMyUserId(parseInt(id, 10));
    });
    if (!tokenId) { setLoading(false); return; }
    fetchToken(tokenId)
      .then(setToken)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tokenId]);

  const isOwner = token && myUserId !== null && token.current_owner_id === myUserId;

  const handleOfferTrade = () => {
    Alert.prompt(
      'Offer to trade',
      'Enter recipient user ID',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Next',
          onPress: (recipientIdStr?: string) => {
            const recipientId = parseInt(recipientIdStr ?? '', 10);
            if (!recipientId || isNaN(recipientId)) {
              Alert.alert('Invalid', 'Please enter a valid user ID.');
              return;
            }
            Alert.prompt(
              'Add a note (optional)',
              '',
              [
                { text: 'Skip', onPress: () => doOffer(recipientId, undefined) },
                { text: 'Send', onPress: (note?: string) => doOffer(recipientId, note ?? undefined) },
              ],
              'plain-text',
            );
          },
        },
      ],
      'plain-text',
    );
  };

  const doOffer = async (recipientId: number, note?: string) => {
    setOffering(true);
    try {
      await offerTokenTrade(tokenId, recipientId, note);
      setOfferStatus('OK: trade offer sent_');
    } catch (e: any) {
      Alert.alert('Could not send offer', e.message ?? 'Try again.');
    } finally {
      setOffering(false);
    }
  };

  const padNum = (id: number) => String(id).padStart(4, '0');

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backBtnText, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.accent, fontFamily: fonts.dmMono }]} numberOfLines={1}>
          {token
            ? `> token #${padNum(token.id)} · ${(token.variety_name ?? 'UNKNOWN').toUpperCase()}`
            : '> token_'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
      ) : !token ? (
        <View style={styles.body}>
          <Text style={[styles.mutedMono, { color: c.muted }]}>Token not found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={[styles.divider, { backgroundColor: c.border }]} />

          {/* Large visual */}
          <View style={styles.visualCenter}>
            <TokenVisual
              tokenId={token.id}
              size={token.visual_size ?? 50}
              color={token.visual_color ?? '#E57373'}
              seeds={token.visual_seeds ?? 20}
              irregularity={token.visual_irregularity ?? 30}
              width={200}
            />
          </View>

          {/* Token info */}
          <Text style={[styles.varietyName, { color: c.text }]}>
            {(token.variety_name ?? 'UNKNOWN').toUpperCase()}
          </Text>
          <Text style={[styles.amountLine, { color: c.text }]}>
            {`CA$${((token.excess_amount_cents ?? 0) / 100).toLocaleString('en-CA', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} excess`}
          </Text>
          {token.location_name && (
            <Text style={[styles.mutedMono, { color: c.muted }]}>
              {token.location_name}
              {token.minted_at ? ` · ${token.minted_at.slice(0, 10)}` : ''}
            </Text>
          )}

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          {/* Provenance */}
          <Text style={[styles.sectionLabel, { color: c.muted }]}>PROVENANCE</Text>
          <Text style={[styles.provenanceLine, { color: c.text }]}>
            {`minted by @${token.minted_by_username ?? token.minted_by_name ?? 'unknown'}`}
          </Text>

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          {/* Trade history */}
          <Text style={[styles.sectionLabel, { color: c.muted }]}>TRADE HISTORY</Text>
          {(token.trade_history ?? []).length === 0 ? (
            <Text style={[styles.mutedMono, { color: c.muted }]}>no trades yet.</Text>
          ) : (
            (token.trade_history as any[]).map((trade: any, i: number) => (
              <View key={i} style={styles.tradeRow}>
                <Text style={[styles.tradeMeta, { color: c.muted }]}>
                  [{trade.traded_at?.slice(0, 10) ?? '—'}]
                </Text>
                <View style={styles.tradeDetail}>
                  <Text style={[styles.tradeParties, { color: c.text }]}>
                    {`@${trade.from_username ?? 'unknown'} → @${trade.to_username ?? 'unknown'}`}
                  </Text>
                  {trade.note ? (
                    <Text style={[styles.tradeNote, { color: c.muted }]}>{`"${trade.note}"`}</Text>
                  ) : null}
                </View>
              </View>
            ))
          )}

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          {/* Offer to trade */}
          {isOwner && (
            offerStatus ? (
              <Text style={[styles.offerStatus, { color: c.accent, fontFamily: fonts.dmMono }]}>
                {offerStatus}
              </Text>
            ) : (
              <TouchableOpacity onPress={handleOfferTrade} disabled={offering} activeOpacity={0.75}>
                <Text style={[styles.offerBtn, { color: c.accent, fontFamily: fonts.dmMono }]}>
                  {offering ? 'sending…' : '> offer to trade_'}
                </Text>
              </TouchableOpacity>
            )
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
  title: { flex: 1, textAlign: 'center', fontSize: 13, letterSpacing: 0.4 },
  headerSpacer: { width: 40 },
  body: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: SPACING.xs,
  },
  visualCenter: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  varietyName: {
    fontSize: 24,
    fontFamily: fonts.dmMono,
    letterSpacing: 1,
    textAlign: 'center',
  },
  amountLine: {
    fontSize: 16,
    fontFamily: fonts.dmMono,
    textAlign: 'center',
  },
  mutedMono: {
    fontSize: 12,
    fontFamily: fonts.dmMono,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: fonts.dmMono,
    letterSpacing: 1.5,
    marginTop: SPACING.xs,
  },
  provenanceLine: {
    fontSize: 13,
    fontFamily: fonts.dmMono,
  },
  tradeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  tradeMeta: {
    fontSize: 11,
    fontFamily: fonts.dmMono,
    marginTop: 1,
  },
  tradeDetail: {
    flex: 1,
    gap: 2,
  },
  tradeParties: {
    fontSize: 13,
    fontFamily: fonts.dmMono,
  },
  tradeNote: {
    fontSize: 11,
    fontFamily: fonts.dmMono,
    marginLeft: 12,
  },
  offerBtn: {
    fontSize: 15,
    letterSpacing: 0.5,
    marginTop: SPACING.xs,
  },
  offerStatus: {
    fontSize: 13,
    letterSpacing: 0.3,
    marginTop: SPACING.xs,
  },
});
