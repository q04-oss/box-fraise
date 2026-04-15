import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  RefreshControl, StyleSheet, ActivityIndicator, FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { usePanel, Variety, Business } from '../../context/PanelContext';
import { fetchVarieties, fetchTodayStats, fetchBatchStatus } from '../../lib/api';
import { useColors, fonts, SPACING } from '../../theme';
import { STRAWBERRIES } from '../../data/seed';

const SHEET_NAME = 'main-sheet';

function formatHarvestDate(iso: string): string {
  const d = new Date(iso);
  const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'good morning';
  if (h >= 12 && h < 17) return 'good afternoon';
  if (h >= 17 && h < 22) return 'good evening';
  return 'good night';
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function HomePanel() {
  const {
    setVarieties, setActiveLocation, varieties, activeLocation,
    businesses, sheetHeight, setPanelData, jumpToPanel, showPanel,
    order, setOrder, userCoords,
  } = usePanel();

  const now = new Date();
  const otherLocations = businesses.filter((b: any) => {
    if (b.id === activeLocation?.id) return false;
    if (b.type === 'collection') return true;
    if (b.type === 'popup') {
      if (!b.launched_at) return false;
      const d = new Date(b.launched_at); d.setHours(23, 59, 59, 999);
      return d >= now;
    }
    return false;
  });

  const c = useColors();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [todayStats, setTodayStats] = useState<{ pickups_today: number; active_locations: number; varieties_today: number } | null>(null);
  const [initials, setInitials] = useState('');
  const isCollapsed = sheetHeight < 110;
  const hasFetched = useRef(false);
  const greetingText = getGreeting();

  const todayLabel = now.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
  const month = now.getMonth() + 1;
  const season = month >= 3 && month <= 5 ? 'spring'
    : month >= 6 && month <= 8 ? 'summer'
    : month >= 9 && month <= 11 ? 'autumn'
    : 'winter';

  useEffect(() => {
    AsyncStorage.getItem('display_name').then(name => {
      if (!name) return;
      const parts = name.trim().split(/\s+/);
      setInitials(
        parts.length >= 2
          ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
          : name.slice(0, 2).toUpperCase()
      );
    });
  }, []);

  const discoverLocations = useMemo(() => {
    const cutoff = new Date();
    const valid = businesses.filter((b: Business) => {
      if (!b.lat || !b.lng) return false;
      if (b.type === 'collection') return true;
      if (b.type === 'popup') {
        if (!b.launched_at) return false;
        const d = new Date(b.launched_at); d.setHours(23, 59, 59, 999);
        return d >= cutoff;
      }
      return false;
    });
    if (!userCoords) return valid;
    return [...valid].sort((a, b) =>
      haversineKm(userCoords.latitude, userCoords.longitude, a.lat, a.lng) -
      haversineKm(userCoords.latitude, userCoords.longitude, b.lat, b.lng)
    );
  }, [businesses, userCoords]);

  const formatDist = (b: Business): string | null => {
    if (!userCoords) return null;
    const km = haversineKm(userCoords.latitude, userCoords.longitude, b.lat, b.lng);
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  };

  const handleLocationSelect = (b: Business) => {
    setActiveLocation(b);
    setOrder({ location_id: b.id, location_name: b.name });
  };

  const loadVarieties = async () => {
    if (hasFetched.current || varieties.length > 0) { setLoading(false); return; }
    hasFetched.current = true;
    setFetchError(false);
    setLoading(true);
    try {
      const vars: any[] = await fetchVarieties();
      const merged = vars.map((v: any) => {
        const seed = STRAWBERRIES.find(s => s.name === v.name);
        return { ...(seed ?? {}), ...v, harvestDate: v.harvest_date ?? seed?.harvestDate };
      });
      setVarieties(merged);
    } catch {
      hasFetched.current = false;
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVarieties();
    fetchTodayStats().then(setTodayStats).catch(() => {});
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    hasFetched.current = true;
    setFetchError(false);
    try {
      const vars: any[] = await fetchVarieties();
      const merged = vars.map((v: any) => {
        const seed = STRAWBERRIES.find(s => s.name === v.name);
        return { ...(seed ?? {}), ...v, harvestDate: v.harvest_date ?? seed?.harvestDate };
      });
      setVarieties(merged);
    } catch {
      hasFetched.current = false;
      setFetchError(true);
    } finally {
      setRefreshing(false);
    }
  };

  const handleVarietyPress = (v: Variety) => {
    setPanelData({ openOrder: true, preselectedVariety: { id: v.id, name: v.name, price_cents: v.price_cents } });
    jumpToPanel('terminal');
    setTimeout(() => TrueSheet.present(SHEET_NAME, 1), 350);
  };

  const [batchStatus, setBatchStatus] = useState<Record<number, { queued_boxes: number; min_quantity: number }>>({});

  useEffect(() => {
    if (!activeLocation?.id) { setBatchStatus({}); return; }
    let cancelled = false;
    fetchBatchStatus(activeLocation.id).then(rows => {
      if (cancelled) return;
      const map: Record<number, { queued_boxes: number; min_quantity: number }> = {};
      rows.forEach(r => { map[r.variety_id] = { queued_boxes: r.queued_boxes, min_quantity: r.min_quantity }; });
      setBatchStatus(map);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [activeLocation?.id]);

  const bizVarieties = activeLocation
    ? varieties.filter((v: any) => (v.variety_type ?? 'strawberry') === 'strawberry')
    : [];

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg }]}>

      {/* Collapsed strip */}
      <TouchableOpacity
        style={styles.strip}
        activeOpacity={activeLocation ? 0.6 : 1}
        onPress={() => {
          if (!activeLocation) return;
          setPanelData({ openOrder: true });
          jumpToPanel('terminal');
          setTimeout(() => TrueSheet.present(SHEET_NAME, 1), 350);
        }}
      >
        <Text style={[styles.stripBrand, { color: c.text }]}>
          {activeLocation ? `box fraise × ${activeLocation.name.toLowerCase()}` : 'box fraise'}
        </Text>
      </TouchableOpacity>

      {!isCollapsed && !activeLocation && (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
        >
          {/* Header: greeting + avatar */}
          <View style={styles.coldHeader}>
            <Text style={[styles.greeting, { color: c.text }]}>{greetingText}</Text>
            <TouchableOpacity
              style={[styles.avatar, { backgroundColor: c.cardDark }]}
              onPress={() => {
                setPanelData({ resetOrder: true });
                jumpToPanel('terminal');
                setTimeout(() => TrueSheet.resize(SHEET_NAME, 1), 350);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.avatarInitials, { color: c.text }]}>{initials || '❋'}</Text>
            </TouchableOpacity>
          </View>

          {/* Location cards */}
          {discoverLocations.map(b => {
            const dist = formatDist(b);
            const meta = [(b as any).neighbourhood ?? (b as any).city, b.hours].filter(Boolean).join('  ·  ');
            return (
              <TouchableOpacity
                key={b.id}
                style={[styles.locCard, { borderBottomColor: c.border }]}
                onPress={() => handleLocationSelect(b)}
                activeOpacity={0.75}
              >
                <View style={styles.locCardBody}>
                  <Text style={[styles.locCardName, { color: c.text }]}>{b.name}</Text>
                  {!!meta && <Text style={[styles.locCardMeta, { color: c.muted }]}>{meta}</Text>}
                  {!!dist && <Text style={[styles.locCardDist, { color: c.muted }]}>{dist}</Text>}
                </View>
                <Text style={[styles.locCardArrow, { color: c.muted }]}>→</Text>
              </TouchableOpacity>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {!isCollapsed && !!activeLocation && (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
        >
          {/* ── Location meta ── */}
          <View style={styles.locationMeta}>
            <View style={styles.locationMetaRow}>
              <Text style={[styles.locationMetaText, { color: c.muted, flex: 1 }]} numberOfLines={1}>
                {[
                  activeLocation.type === 'popup' ? 'popup' : null,
                  activeLocation.address ?? activeLocation.neighbourhood ?? null,
                  activeLocation.type === 'popup' && activeLocation.launched_at
                    ? (activeLocation.hours ?? new Date(activeLocation.launched_at).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' }))
                    : todayLabel,
                ].filter(Boolean).join('  ·  ')}
              </Text>
            </View>
            {order.order_id && order.location_id === activeLocation.id && (
              <Text style={[styles.orderPlaced, { color: c.accent }]}>order placed</Text>
            )}
          </View>

          {/* ── Shop identity ── */}
          {!!activeLocation.description && (
            <View style={styles.identityBlock}>
              <Text style={[styles.description, { color: c.muted }]}>{activeLocation.description}</Text>
            </View>
          )}

          {/* ── Location switcher ── */}
          {otherLocations.length > 0 && (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={otherLocations}
              keyExtractor={b => String(b.id)}
              contentContainerStyle={styles.switcherRow}
              renderItem={({ item: b }) => (
                <TouchableOpacity
                  onPress={() => { setActiveLocation(b); setOrder({ location_id: b.id, location_name: b.name }); }}
                  activeOpacity={0.7}
                  style={[styles.switcherChip, { borderColor: c.border }]}
                >
                  <Text style={[styles.switcherChipText, { color: c.muted }]}>{b.name}</Text>
                </TouchableOpacity>
              )}
            />
          )}

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          {/* ── Today's varieties ── */}
          <View style={styles.varietiesBlock}>
            {loading ? (
              <ActivityIndicator color={c.accent} style={{ marginVertical: 32 }} />
            ) : fetchError ? (
              <TouchableOpacity onPress={loadVarieties} activeOpacity={0.7} style={styles.retryRow}>
                <Text style={[styles.retryText, { color: c.muted }]}>could not load — tap to retry</Text>
              </TouchableOpacity>
            ) : bizVarieties.length === 0 ? (
              <Text style={[styles.nothingText, { color: c.muted }]}>nothing ready today</Text>
            ) : (
              bizVarieties.map((v, idx) => {
                const freshColor = v.freshnessColor ?? c.accent;
                return (
                  <React.Fragment key={v.id}>
                    {idx > 0 && <View style={[styles.varietyDivider, { backgroundColor: c.border }]} />}
                    <TouchableOpacity
                      style={styles.varietyBlock}
                      onPress={() => handleVarietyPress(v)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.varietyTopRow}>
                        <Text style={[styles.varietyName, { color: c.text }]}>{v.name}</Text>
                        <Text style={[styles.varietyPrice, { color: c.text }]}>
                          CA${(v.price_cents / 100).toFixed(0)}
                        </Text>
                      </View>

                      <View style={styles.provenanceRow}>
                        {v.farm && (
                          <Text style={[styles.farm, { color: c.muted }]}>{v.farm}</Text>
                        )}
                        {v.farm && v.harvestDate && (
                          <Text style={[styles.provenanceDot, { color: c.border }]}>·</Text>
                        )}
                        {v.harvestDate && (
                          <Text style={[styles.harvest, { color: c.muted }]}>récolte {formatHarvestDate(v.harvestDate)}</Text>
                        )}
                        {(v.farm || v.harvestDate) && (
                          <Text style={[styles.provenanceDot, { color: c.border }]}>·</Text>
                        )}
                        <View style={[styles.freshDot, { backgroundColor: freshColor }]} />
                        {v.avg_rating != null && (v.rating_count ?? 0) > 0 && (
                          <>
                            <Text style={[styles.provenanceDot, { color: c.border }]}>·</Text>
                            <Text style={[styles.rating, { color: '#FFD700' }]}>★ {v.avg_rating.toFixed(1)}</Text>
                          </>
                        )}
                      </View>

                      {v.description && (
                        <Text style={[styles.varietyDesc, { color: c.muted }]}>{v.description}</Text>
                      )}

                      <View style={styles.varietyBottomRow}>
                        <View style={styles.batchBarWrap}>
                          <View style={[styles.batchBarTrack, { backgroundColor: c.border }]}>
                            <View style={[styles.batchBarFill, { backgroundColor: c.accent, width: `${Math.min(100, ((batchStatus[v.id]?.queued_boxes ?? 0) / (batchStatus[v.id]?.min_quantity ?? 4)) * 100)}%` }]} />
                          </View>
                          <Text style={[styles.batchBarLabel, { color: c.muted }]}>
                            {batchStatus[v.id]?.queued_boxes ?? 0} of {batchStatus[v.id]?.min_quantity ?? 4} queued
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  strip: { alignItems: 'center', paddingTop: 28, paddingBottom: 20 },
  stripBrand: { fontSize: 13, fontFamily: fonts.playfair, letterSpacing: 0.3 },
  scroll: { flex: 1 },

  // Cold-open
  coldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: 4,
    paddingBottom: SPACING.lg,
  },
  greeting: { fontSize: 20, fontFamily: fonts.playfair },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontSize: 13, fontFamily: fonts.dmMono, letterSpacing: 0.5 },
  locCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  locCardBody: { flex: 1, gap: 3 },
  locCardName: { fontSize: 16, fontFamily: fonts.playfair },
  locCardMeta: { fontSize: 11, fontFamily: fonts.dmMono, letterSpacing: 0.4 },
  locCardDist: { fontSize: 11, fontFamily: fonts.dmMono, letterSpacing: 0.4 },
  locCardArrow: { fontSize: 16, fontFamily: fonts.dmSans, paddingLeft: SPACING.sm },

  // Location meta
  locationMeta: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: 4, gap: 4 },
  locationMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  locationMetaText: { fontSize: 11, fontFamily: fonts.dmMono, letterSpacing: 0.5 },
  orderPlaced: { fontSize: 10, fontFamily: fonts.dmMono, letterSpacing: 1.5 },

  // Shop identity
  identityBlock: { paddingHorizontal: SPACING.md, paddingTop: 6, paddingBottom: SPACING.md, gap: 6 },
  description: { fontSize: 13, fontFamily: fonts.dmSans, lineHeight: 20, fontStyle: 'italic' },

  // Location switcher
  switcherRow: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, gap: 8, flexDirection: 'row' },
  switcherChip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  switcherChipText: { fontSize: 10, fontFamily: fonts.dmMono, letterSpacing: 1 },

  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: SPACING.md },

  // Varieties
  varietiesBlock: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, gap: 0 },
  varietyDivider: { height: StyleSheet.hairlineWidth, marginVertical: SPACING.md },
  varietyBlock: { gap: 8 },
  varietyTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  varietyName: { fontSize: 24, fontFamily: fonts.playfair, flex: 1 },
  varietyPrice: { fontSize: 14, fontFamily: fonts.dmMono },
  provenanceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  farm: { fontSize: 11, fontFamily: fonts.dmMono },
  harvest: { fontSize: 11, fontFamily: fonts.dmMono },
  provenanceDot: { fontSize: 10, fontFamily: fonts.dmMono },
  freshDot: { width: 6, height: 6, borderRadius: 3 },
  rating: { fontSize: 10, fontFamily: fonts.dmMono },
  varietyDesc: { fontSize: 13, fontFamily: fonts.dmSans, lineHeight: 20, fontStyle: 'italic' },
  varietyBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 },
  retryRow: { paddingVertical: 16 },
  retryText: { fontSize: 12, fontFamily: fonts.dmSans, fontStyle: 'italic' },
  nothingText: { fontSize: 13, fontFamily: fonts.dmSans, fontStyle: 'italic', paddingVertical: 8 },
  batchBarWrap: { flex: 1, gap: 3, marginHorizontal: 12 },
  batchBarTrack: { height: 2, borderRadius: 1, overflow: 'hidden' },
  batchBarFill: { height: 2, borderRadius: 1 },
  batchBarLabel: { fontSize: 10, fontFamily: fonts.dmMono, letterSpacing: 0.5 },
});
