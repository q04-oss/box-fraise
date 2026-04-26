import React, { useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  RefreshControl, StyleSheet, ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePanel, FraiseEvent } from '../../context/PanelContext';
import { useColors, fonts, SPACING } from '../../theme';
import { fetchEvents, fetchMyClaims, getMemberToken } from '../../lib/api';

const SHEET_NAME = 'main-sheet';

function statusLabel(ev: FraiseEvent): string {
  if (ev.status === 'confirmed')     return 'confirmed';
  if (ev.status === 'threshold_met') return 'going ahead';
  return 'open';
}

function EventRow({ ev, isClaimed, onPress }: { ev: FraiseEvent; isClaimed: boolean; onPress: () => void }) {
  const c = useColors();
  const pct = Math.min(100, Math.round((ev.seats_claimed / ev.min_seats) * 100));
  const seatsLeft = ev.max_seats - ev.seats_claimed;
  const isReady = ev.status !== 'open';

  return (
    <TouchableOpacity
      style={[styles.row, { borderTopColor: c.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.rowLeft}>
        <Text style={[styles.rowBiz, { color: c.muted }]} numberOfLines={1}>
          {ev.business_name}
        </Text>
        <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={2}>
          {ev.title}
        </Text>
        {ev.description ? (
          <Text style={[styles.rowDesc, { color: c.muted }]} numberOfLines={2}>
            {ev.description}
          </Text>
        ) : null}
        <View style={[styles.progressBar, { backgroundColor: c.border }]}>
          <View style={[
            styles.progressFill,
            { width: `${pct}%` as any, backgroundColor: isReady ? '#27AE60' : c.text },
          ]} />
        </View>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowPrice, { color: c.text }]}>1 credit</Text>
        <Text style={[styles.rowSeats, { color: seatsLeft <= 3 ? '#C0392B' : c.muted }]}>
          {seatsLeft > 0 ? `${seatsLeft} left` : 'full'}
        </Text>
        <View style={[
          styles.badge,
          { borderColor: isReady ? (ev.status === 'confirmed' ? c.text : '#27AE60') : c.border },
        ]}>
          <Text style={[
            styles.badgeText,
            { color: isClaimed ? c.text : isReady ? (ev.status === 'confirmed' ? c.text : '#27AE60') : c.muted },
          ]}>
            {isClaimed ? 'claimed' : statusLabel(ev)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomePanel() {
  const { showPanel, setActiveEvent, events, setEvents, claims, setClaims, member } = usePanel();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = React.useState(false);

  const claimedEventIds = new Set(claims.map(cl => cl.event_id));

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [evs] = await Promise.all([
        fetchEvents(),
        getMemberToken().then(t => t ? fetchMyClaims().then(setClaims) : null),
      ]);
      setEvents(evs);
    } catch {}
    setRefreshing(false);
  }, []);

  const openEvent = (ev: FraiseEvent) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveEvent(ev);
    showPanel('event-detail', { event: ev });
    setTimeout(() => TrueSheet.resize(SHEET_NAME, 1), 200);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.panelBg }}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 16 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.muted} />
      }
    >
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: c.muted }]}>fraise</Text>
        <Text style={[styles.headline, { color: c.text }]}>
          experiences that only happen{'\n'}when enough people want them.
        </Text>
      </View>

      {events.length === 0 ? (
        <Text style={[styles.empty, { color: c.muted }]}>no open events right now.</Text>
      ) : (
        <View>
          {events.map(ev => (
            <EventRow
              key={ev.id}
              ev={ev}
              isClaimed={claimedEventIds.has(ev.id)}
              onPress={() => openEvent(ev)}
            />
          ))}
          <View style={[styles.lastBorder, { borderBottomColor: c.border }]} />
        </View>
      )}

      {!member && (
        <TouchableOpacity
          style={[styles.authNudge, { backgroundColor: c.card, borderColor: c.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            showPanel('account');
            setTimeout(() => TrueSheet.resize(SHEET_NAME, 2), 350);
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.authNudgeText, { color: c.text }]}>
            sign in to claim spots →
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: SPACING.md },
  header: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
  eyebrow: {
    fontSize: 10,
    fontFamily: fonts.dmMono,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  headline: {
    fontSize: 15,
    fontFamily: fonts.dmMono,
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: SPACING.md,
  },
  lastBorder: { borderBottomWidth: StyleSheet.hairlineWidth },
  rowLeft: { flex: 1, gap: 4 },
  rowBiz: {
    fontSize: 10,
    fontFamily: fonts.dmMono,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  rowTitle: { fontSize: 14, fontFamily: fonts.dmMono, fontWeight: '500' },
  rowDesc: { fontSize: 11, fontFamily: fonts.dmMono, lineHeight: 16 },
  progressBar: {
    height: 3,
    borderRadius: 9999,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: { height: '100%', borderRadius: 9999 },
  rowRight: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 4,
    paddingTop: 16,
    flexShrink: 0,
  },
  rowPrice: { fontSize: 13, fontFamily: fonts.dmMono },
  rowSeats: { fontSize: 10, fontFamily: fonts.dmMono, letterSpacing: 0.5 },
  badge: {
    borderWidth: 1,
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: fonts.dmMono,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  empty: {
    fontSize: 13,
    fontFamily: fonts.dmMono,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  authNudge: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    borderRadius: 12,
    borderWidth: 1,
    padding: SPACING.md,
    alignItems: 'center',
  },
  authNudgeText: {
    fontSize: 12,
    fontFamily: fonts.dmMono,
    letterSpacing: 0.5,
  },
});
