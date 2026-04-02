import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl,
} from 'react-native';
import { usePanel } from '../../context/PanelContext';
import { fetchGreenhouses } from '../../lib/api';
import { useColors, fonts, SPACING } from '../../theme';

function BlinkingCursor() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setVisible(v => !v), 500);
    return () => clearInterval(id);
  }, []);
  return <Text style={{ opacity: visible ? 1 : 0 }}>_</Text>;
}

interface ProgressBarProps {
  percent: number; // 0–100
  accentColor: string;
  borderColor: string;
}

function ProgressBar({ percent, accentColor, borderColor }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View style={[styles.progressTrack, { borderColor }]}>
      <View
        style={[
          styles.progressFill,
          { width: `${clamped}%` as any, backgroundColor: accentColor },
        ]}
      />
    </View>
  );
}

function fmtCents(cents: number): string {
  return `CA$${(cents / 100).toLocaleString('en-CA', { maximumFractionDigits: 0 })}`;
}

export default function GreenhousesPanel() {
  const { goBack, showPanel } = usePanel();
  const c = useColors();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [greenhouses, setGreenhouses] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const data = await fetchGreenhouses();
      setGreenhouses(data);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const fundingGreenhouses = greenhouses.filter(g => g.status === 'funding');
  const openGreenhouses = greenhouses.filter(g => g.status === 'open');

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backBtnText, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.headerPrompt, { color: c.accent }]}>{'> '}</Text>
          <Text style={[styles.headerTitle, { color: c.text }]}>{'greenhouses'}</Text>
          {loading && <BlinkingCursor />}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />
        }
      >
        <Text style={[styles.separator, { color: c.border }]}>{'────────────────────────────────────'}</Text>

        {/* FUNDING section */}
        {fundingGreenhouses.length > 0 && (
          <>
            <Text style={[styles.sectionHeader, { color: c.muted }]}>{'FUNDING'}</Text>
            {fundingGreenhouses.map((g, i) => {
              const goal: number = g.funding_goal_cents ?? 0;
              const funded: number = g.funded_cents ?? 0;
              const pct = goal > 0 ? (funded / goal) * 100 : 0;
              return (
                <View key={g.id ?? i}>
                  <Text style={[styles.ghName, { color: c.text }]}>
                    {(g.name ?? '').toUpperCase()}
                  </Text>
                  <ProgressBar percent={pct} accentColor={c.accent} borderColor={c.border} />
                  <Text style={[styles.ghMeta, { color: c.muted }]}>
                    {`${fmtCents(funded)} / ${fmtCents(goal)} · ${Math.round(pct)}%`}
                  </Text>
                  <TouchableOpacity
                    style={styles.actionLine}
                    onPress={() => showPanel('greenhouse-detail', { greenhouseId: g.id, mode: 'fund' })}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.actionText, { color: c.accent }]}>{'> fund this greenhouse_'}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.separator, { color: c.border }]}>{'────────────────────────────────────'}</Text>
                </View>
              );
            })}
          </>
        )}

        {/* OPEN section */}
        {openGreenhouses.length > 0 && (
          <>
            <Text style={[styles.sectionHeader, { color: c.muted }]}>{'OPEN'}</Text>
            {openGreenhouses.map((g, i) => {
              const founderHandle = g.founder_handle ? `@${g.founder_handle}` : null;
              const founderFrom: number | null = g.founder_from_year ?? null;
              const founderTo: number | null = g.founder_to_year ?? null;
              const termYears = founderFrom != null && founderTo != null ? founderTo - founderFrom : null;
              return (
                <View key={g.id ?? i}>
                  <Text style={[styles.ghName, { color: c.text }]}>
                    {(g.name ?? '').toUpperCase()}
                  </Text>
                  {founderHandle && (
                    <Text style={[styles.ghMeta, { color: c.muted }]}>
                      {[
                        `Founded by ${founderHandle}`,
                        termYears != null ? `${termYears}-year term` : null,
                        founderTo != null ? `ends ${founderTo}` : null,
                      ].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={styles.actionLine}
                    onPress={() => showPanel('greenhouse-detail', { greenhouseId: g.id })}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.actionText, { color: c.accent }]}>{'> view_'}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.separator, { color: c.border }]}>{'────────────────────────────────────'}</Text>
                </View>
              );
            })}
          </>
        )}

        {!loading && greenhouses.length === 0 && (
          <Text style={[styles.emptyText, { color: c.muted }]}>{'> no greenhouses listed._'}</Text>
        )}

        <View style={{ height: 40 }} />
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
  headerTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerPrompt: { fontFamily: fonts.dmMono, fontSize: 12, letterSpacing: 1 },
  headerTitle: { fontFamily: fonts.dmMono, fontSize: 11, letterSpacing: 1.5, flex: 1 },
  headerSpacer: { width: 40 },

  body: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, gap: 6 },
  separator: { fontFamily: fonts.dmMono, fontSize: 11, marginVertical: 4 },
  sectionHeader: { fontFamily: fonts.dmMono, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },

  progressTrack: {
    height: 4,
    borderRadius: 2,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressFill: { height: '100%', borderRadius: 2 },

  ghName: { fontFamily: fonts.dmMono, fontSize: 13, letterSpacing: 1, marginBottom: 2 },
  ghMeta: { fontFamily: fonts.dmMono, fontSize: 11 },
  actionLine: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  actionText: { fontFamily: fonts.dmMono, fontSize: 12 },
  emptyText: { fontFamily: fonts.dmMono, fontSize: 12 },
});
