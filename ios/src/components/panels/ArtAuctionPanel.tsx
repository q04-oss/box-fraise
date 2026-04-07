import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePanel } from '../../context/PanelContext';
import { useColors, fonts, SPACING } from '../../theme';
import { fetchArtAuctions, fetchArtAuction, placeArtBid } from '../../lib/api';

function formatCountdown(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h`;
  }
  return `${h}h ${m}m`;
}

function formatCAD(cents: number): string {
  return `CA$${(cents / 100).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── Auction detail view ──────────────────────────────────────────────────────

function AuctionDetail({ auctionId, onBack }: { auctionId: number; onBack: () => void }) {
  const c = useColors();
  const [auction, setAuction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [bidding, setBidding] = useState(false);
  const [bidPlaced, setBidPlaced] = useState(false);

  useEffect(() => {
    fetchArtAuction(auctionId)
      .then(setAuction)
      .catch(() => setAuction(null))
      .finally(() => setLoading(false));
  }, [auctionId]);

  const highBid = auction?.bids?.[0]?.amount_cents ?? null;

  const handleBid = async () => {
    const dollars = parseFloat(bidAmount);
    if (isNaN(dollars) || dollars <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid dollar amount.');
      return;
    }
    const cents = Math.round(dollars * 100);
    setBidding(true);
    try {
      await placeArtBid(auctionId, cents);
      setBidPlaced(true);
      setBidAmount('');
      // Refresh
      const updated = await fetchArtAuction(auctionId).catch(() => auction);
      setAuction(updated);
    } catch (err: any) {
      if (err?.error === 'below_reserve') {
        Alert.alert('Below reserve', `Must meet reserve of ${formatCAD(err.reserve_price_cents)}.`);
      } else if (err?.error === 'bid_too_low') {
        Alert.alert('Bid too low', `Current high bid is ${formatCAD(err.current_high_cents)}.`);
      } else {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    } finally {
      setBidding(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  if (!auction) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.md }}>
        <Text style={[{ color: c.muted, fontFamily: fonts.dmSans }]}>Auction not found.</Text>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={{ marginTop: SPACING.md }}>
          <Text style={[{ color: c.accent, fontFamily: fonts.dmMono, fontSize: 13 }]}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.detailBody} showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={{ marginBottom: SPACING.md }}>
        <Text style={[{ color: c.accent, fontFamily: fonts.dmMono, fontSize: 13 }]}>← All auctions</Text>
      </TouchableOpacity>

      {auction.artwork_media_url ? (
        <Image
          source={{ uri: auction.artwork_media_url }}
          style={styles.detailImage}
          resizeMode="cover"
        />
      ) : null}

      <Text style={[styles.detailTitle, { color: c.text, fontFamily: fonts.playfair }]}>
        {auction.artwork_title}
      </Text>
      {auction.artist_name ? (
        <Text style={[styles.detailArtist, { color: c.muted, fontFamily: fonts.dmMono }]}>
          {auction.artist_name}
        </Text>
      ) : null}
      {auction.pitch_abstract ? (
        <Text style={[styles.detailAbstract, { color: c.muted, fontFamily: fonts.dmSans }]}>
          {auction.pitch_abstract}
        </Text>
      ) : null}
      {auction.artwork_description ? (
        <Text style={[styles.detailDesc, { color: c.text, fontFamily: fonts.dmSans }]}>
          {auction.artwork_description}
        </Text>
      ) : null}

      <View style={[styles.metaRow, { borderColor: c.border }]}>
        <View style={styles.metaCell}>
          <Text style={[styles.metaLabel, { color: c.muted, fontFamily: fonts.dmMono }]}>RESERVE</Text>
          <Text style={[styles.metaValue, { color: c.text, fontFamily: fonts.playfair }]}>
            {formatCAD(auction.reserve_price_cents)}
          </Text>
        </View>
        <View style={styles.metaCell}>
          <Text style={[styles.metaLabel, { color: c.muted, fontFamily: fonts.dmMono }]}>HIGH BID</Text>
          <Text style={[styles.metaValue, { color: c.text, fontFamily: fonts.playfair }]}>
            {highBid != null ? formatCAD(highBid) : '—'}
          </Text>
        </View>
        <View style={styles.metaCell}>
          <Text style={[styles.metaLabel, { color: c.muted, fontFamily: fonts.dmMono }]}>ENDS</Text>
          <Text style={[styles.metaValue, { color: c.accent, fontFamily: fonts.dmMono, fontSize: 13 }]}>
            {formatCountdown(auction.ends_at)}
          </Text>
        </View>
      </View>

      {auction.status === 'active' && (
        <View style={[styles.bidForm, { borderColor: c.border }]}>
          {bidPlaced && (
            <Text style={[styles.bidSuccess, { color: '#34C759', fontFamily: fonts.dmMono }]}>
              Bid placed
            </Text>
          )}
          <Text style={[styles.bidLabel, { color: c.muted, fontFamily: fonts.dmMono }]}>PLACE BID (CA$)</Text>
          <View style={styles.bidRow}>
            <TextInput
              style={[styles.bidInput, { color: c.text, fontFamily: fonts.dmSans, borderColor: c.border }]}
              placeholder="0.00"
              placeholderTextColor={c.muted}
              value={bidAmount}
              onChangeText={setBidAmount}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.bidBtn, { backgroundColor: bidAmount.length > 0 ? c.accent : c.card, borderColor: c.border }]}
              onPress={handleBid}
              disabled={bidding || bidAmount.length === 0}
              activeOpacity={0.8}
            >
              {bidding ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={[styles.bidBtnText, { fontFamily: fonts.dmMono, color: bidAmount.length > 0 ? '#FFFFFF' : c.muted }]}>
                  BID
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {auction.bids && auction.bids.length > 0 && (
        <>
          <Text style={[styles.bidsHeader, { color: c.muted, fontFamily: fonts.dmMono }]}>BID HISTORY</Text>
          {auction.bids.map((bid: any, i: number) => (
            <View key={String(bid.id)} style={[styles.bidHistoryRow, { borderBottomColor: c.border }]}>
              <Text style={[styles.bidHistoryAmount, { color: c.text, fontFamily: fonts.playfair }]}>
                {formatCAD(bid.amount_cents)}
              </Text>
              <Text style={[styles.bidHistoryDate, { color: c.muted, fontFamily: fonts.dmMono }]}>
                {formatDate(bid.created_at)}
              </Text>
            </View>
          ))}
        </>
      )}

      <View style={{ height: SPACING.xl }} />
    </ScrollView>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function ArtAuctionPanel() {
  const { goBack } = usePanel();
  const c = useColors();
  const insets = useSafeAreaInsets();

  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    fetchArtAuctions()
      .then(setAuctions)
      .catch(() => setAuctions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={selectedId != null ? () => setSelectedId(null) : goBack} activeOpacity={0.7}>
          <Text style={[styles.back, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text, fontFamily: fonts.dmMono }]}>ART AUCTIONS</Text>
        <View style={{ width: 28 }} />
      </View>

      {selectedId != null ? (
        <AuctionDetail auctionId={selectedId} onBack={() => setSelectedId(null)} />
      ) : loading ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: SPACING.xl }} />
      ) : auctions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: c.muted, fontFamily: fonts.dmSans }]}>
            No active auctions at the moment.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {auctions.map(item => (
            <TouchableOpacity
              key={String(item.id)}
              style={[styles.auctionCard, { borderColor: c.border, backgroundColor: c.card }]}
              onPress={() => setSelectedId(item.id)}
              activeOpacity={0.8}
            >
              {item.artwork_media_url ? (
                <Image
                  source={{ uri: item.artwork_media_url }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              ) : null}
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { color: c.text, fontFamily: fonts.playfair }]} numberOfLines={1}>
                  {item.artwork_title}
                </Text>
                {item.artist_name ? (
                  <Text style={[styles.cardArtist, { color: c.muted, fontFamily: fonts.dmMono }]}>
                    {item.artist_name}
                  </Text>
                ) : null}
                <View style={styles.cardMeta}>
                  <Text style={[styles.cardReserve, { color: c.muted, fontFamily: fonts.dmMono }]}>
                    Reserve {formatCAD(item.reserve_price_cents)}
                  </Text>
                  <Text style={[styles.cardCountdown, { color: c.accent, fontFamily: fonts.dmMono }]}>
                    {formatCountdown(item.ends_at)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
          <View style={{ height: SPACING.xl }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingTop: 16, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { fontSize: 28 },
  headerTitle: { fontSize: 14, letterSpacing: 2 },
  list: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  auctionCard: {
    borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
    marginBottom: SPACING.md, overflow: 'hidden',
  },
  cardImage: { width: '100%', height: 200 },
  cardBody: { padding: SPACING.sm, gap: 4 },
  cardTitle: { fontSize: 20 },
  cardArtist: { fontSize: 11, letterSpacing: 1 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  cardReserve: { fontSize: 11, letterSpacing: 0.5 },
  cardCountdown: { fontSize: 12, letterSpacing: 0.5 },
  // Detail view
  detailBody: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md },
  detailImage: { width: '100%', height: 280, borderRadius: 12, marginBottom: SPACING.md },
  detailTitle: { fontSize: 28, marginBottom: 4 },
  detailArtist: { fontSize: 11, letterSpacing: 1, marginBottom: SPACING.sm },
  detailAbstract: { fontSize: 13, lineHeight: 20, opacity: 0.7, marginBottom: SPACING.sm },
  detailDesc: { fontSize: 15, lineHeight: 22, marginBottom: SPACING.md },
  metaRow: {
    flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10, marginBottom: SPACING.md,
  },
  metaCell: { flex: 1, padding: SPACING.sm, alignItems: 'center' },
  metaLabel: { fontSize: 9, letterSpacing: 1.5, marginBottom: 4 },
  metaValue: { fontSize: 18 },
  bidForm: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 12,
    padding: SPACING.sm, marginBottom: SPACING.md, gap: SPACING.xs,
  },
  bidLabel: { fontSize: 9, letterSpacing: 1.5 },
  bidSuccess: { fontSize: 12, letterSpacing: 1, marginBottom: 4 },
  bidRow: { flexDirection: 'row', gap: SPACING.xs },
  bidInput: {
    flex: 1, fontSize: 18, borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8, paddingHorizontal: SPACING.sm, paddingVertical: 10,
  },
  bidBtn: {
    borderRadius: 8, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING.md, paddingVertical: 10, justifyContent: 'center',
  },
  bidBtnText: { fontSize: 13, letterSpacing: 1 },
  bidsHeader: { fontSize: 9, letterSpacing: 1.5, marginBottom: SPACING.sm },
  bidHistoryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: SPACING.sm, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bidHistoryAmount: { fontSize: 17 },
  bidHistoryDate: { fontSize: 11, letterSpacing: 0.3 },
});
