import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  Alert, TouchableOpacity, RefreshControl,
} from 'react-native';
import { usePanel } from '../../context/PanelContext';
import { fetchMyTokenOffers, acceptTokenOffer, declineTokenOffer } from '../../lib/api';
import { useColors, fonts, SPACING } from '../../theme';
import { TokenCard, TokenCardData } from '../TokenVisual';

function offerToCardData(offer: any): TokenCardData {
  const token = offer.token ?? {};
  return {
    tokenId: token.id ?? 0,
    tokenNumber: String(token.id ?? 0).padStart(4, '0'),
    varietyName: token.variety_name ?? 'UNKNOWN',
    amountCents: token.excess_amount_cents ?? 0,
    date: token.minted_at ? token.minted_at.slice(0, 10) : '',
    originalOwner: token.minted_by_username ?? token.minted_by_name ?? 'unknown',
    size: token.visual_size ?? 50,
    color: token.visual_color ?? '#E57373',
    seeds: token.visual_seeds ?? 20,
    irregularity: token.visual_irregularity ?? 30,
  };
}

export default function TokenOffersPanel() {
  const { goBack } = usePanel();
  const c = useColors();
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [statusMap, setStatusMap] = useState<Record<number, string>>({});

  const load = async () => {
    try {
      const data = await fetchMyTokenOffers();
      setOffers(data);
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

  const handleAccept = async (offer: any) => {
    if (processingId !== null) return;
    setProcessingId(offer.id);
    try {
      await acceptTokenOffer(offer.id);
      setStatusMap(prev => ({ ...prev, [offer.id]: 'OK: token accepted_' }));
      // Remove from list after brief delay
      setTimeout(() => {
        setOffers(prev => prev.filter(o => o.id !== offer.id));
        setStatusMap(prev => { const n = { ...prev }; delete n[offer.id]; return n; });
      }, 2000);
    } catch (e: any) {
      Alert.alert('Could not accept', e.message ?? 'Try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (offer: any) => {
    if (processingId !== null) return;
    setProcessingId(offer.id);
    try {
      await declineTokenOffer(offer.id);
      setOffers(prev => prev.filter(o => o.id !== offer.id));
    } catch (e: any) {
      Alert.alert('Could not decline', e.message ?? 'Try again.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backBtnText, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.accent, fontFamily: fonts.dmMono }]}>
          {'> trade offers'}
          {!loading && ` [${offers.length}]`}
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />
          }
        >
          <View style={[styles.divider, { backgroundColor: c.border }]} />

          {offers.length === 0 ? (
            <Text style={[styles.empty, { color: c.muted, fontFamily: fonts.dmMono }]}>
              no pending offers.
            </Text>
          ) : (
            offers.map((offer) => {
              const cardData = offerToCardData(offer);
              const status = statusMap[offer.id];
              const isProcessing = processingId === offer.id;
              const fromUser = offer.from_username ?? offer.from_name ?? 'unknown';
              const offeredAt = offer.offered_at ? offer.offered_at.slice(0, 10) : '';

              return (
                <View key={offer.id} style={[styles.offerBlock, { borderColor: c.border }]}>
                  <Text style={[styles.offerMeta, { color: c.muted, fontFamily: fonts.dmMono }]}>
                    {`[${offeredAt}] @${fromUser} offers:`}
                  </Text>
                  <Text style={[styles.offerTokenLine, { color: c.text, fontFamily: fonts.dmMono }]}>
                    {`Token #${cardData.tokenNumber} · ${cardData.varietyName.toUpperCase()}`}
                  </Text>
                  <Text style={[styles.offerAmountLine, { color: c.muted, fontFamily: fonts.dmMono }]}>
                    {`CA$${(cardData.amountCents / 100).toLocaleString('en-CA', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`}
                    {offer.note ? ` · "${offer.note}"` : ''}
                  </Text>

                  <View style={styles.cardRow}>
                    <TokenCard data={cardData} small />
                  </View>

                  {status ? (
                    <Text style={[styles.statusText, { color: c.accent, fontFamily: fonts.dmMono }]}>
                      {status}
                    </Text>
                  ) : (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        onPress={() => handleAccept(offer)}
                        disabled={isProcessing}
                        activeOpacity={0.75}
                        style={styles.actionBtn}
                      >
                        <Text style={[styles.acceptBtn, { color: c.accent, fontFamily: fonts.dmMono }]}>
                          {isProcessing ? 'processing…' : '> ACCEPT_'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDecline(offer)}
                        disabled={isProcessing}
                        activeOpacity={0.75}
                        style={styles.actionBtn}
                      >
                        <Text style={[styles.declineBtn, { color: c.muted, fontFamily: fonts.dmMono }]}>
                          {'> DECLINE_'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={[styles.divider, { backgroundColor: c.border }]} />
                </View>
              );
            })
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
  title: { flex: 1, textAlign: 'center', fontSize: 14, letterSpacing: 0.5 },
  headerSpacer: { width: 40 },
  body: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: SPACING.sm,
  },
  empty: {
    fontSize: 13,
    marginTop: SPACING.md,
  },
  offerBlock: {
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
  },
  offerMeta: {
    fontSize: 12,
  },
  offerTokenLine: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  offerAmountLine: {
    fontSize: 12,
  },
  cardRow: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  actionBtn: {
    paddingVertical: 4,
  },
  acceptBtn: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  declineBtn: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  statusText: {
    fontSize: 13,
    letterSpacing: 0.3,
    marginTop: SPACING.xs,
  },
});
