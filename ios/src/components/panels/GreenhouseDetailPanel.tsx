import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { usePanel } from '../../context/PanelContext';
import { fetchGreenhouse, fundGreenhouse } from '../../lib/api';
import { useColors, fonts, SPACING } from '../../theme';
import { ProvenanceTokenCard } from '../ProvenanceTokenCard';
import type { ProvenanceLedgerEntry } from '../ProvenanceTokenCard';

function BlinkingCursor() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setVisible(v => !v), 500);
    return () => clearInterval(id);
  }, []);
  return <Text style={{ opacity: visible ? 1 : 0 }}>_</Text>;
}

function fmtCents(cents: number): string {
  return `CA$${(cents / 100).toLocaleString('en-CA', { maximumFractionDigits: 0 })}`;
}

interface ProgressBarProps {
  percent: number;
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

const YEAR_OPTIONS: Array<3 | 5 | 10> = [3, 5, 10];

export default function GreenhouseDetailPanel() {
  const { goBack, panelData, showPanel } = usePanel();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const c = useColors();

  const greenhouseId: number | null = panelData?.greenhouseId ?? null;
  const initialMode: 'fund' | 'view' = panelData?.mode ?? 'view';

  const [loading, setLoading] = useState(true);
  const [greenhouse, setGreenhouse] = useState<any>(null);
  const [mode, setMode] = useState<'fund' | 'view'>(initialMode);
  const [selectedYears, setSelectedYears] = useState<3 | 5 | 10 | null>(null);
  const [funding, setFunding] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ name: string; years: number } | null>(null);

  const load = useCallback(async () => {
    if (!greenhouseId) { setLoading(false); return; }
    try {
      const data = await fetchGreenhouse(greenhouseId);
      setGreenhouse(data);
      // If already funded, show view mode
      if (data?.founding_patron_id != null && initialMode === 'fund') {
        setMode('view');
      }
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [greenhouseId, initialMode]);

  useEffect(() => { load(); }, [load]);

  const handleFund = async () => {
    if (!greenhouseId || !selectedYears || funding) return;
    setFunding(true);
    try {
      const result = await fundGreenhouse(greenhouseId, selectedYears);
      const { error: initErr } = await initPaymentSheet({
        paymentIntentClientSecret: result.client_secret,
        merchantDisplayName: 'Maison Fraise',
      });
      if (initErr) throw new Error(initErr.message);
      const { error: payErr } = await presentPaymentSheet();
      if (payErr) {
        if (payErr.code !== 'Canceled') {
          Alert.alert('Payment failed', 'Please try again.');
        }
        return;
      }
      setSuccessInfo({ name: greenhouse?.name ?? '', years: selectedYears });
      await load();
    } catch (e: any) {
      Alert.alert('Could not fund greenhouse', e.message ?? 'Please try again.');
    } finally {
      setFunding(false);
    }
  };

  // Parse provenance ledger from JSON string or array
  function parseLedger(raw: any): ProvenanceLedgerEntry[] {
    if (!raw) return [];
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!Array.isArray(parsed)) return [];
      return parsed as ProvenanceLedgerEntry[];
    } catch {
      return [];
    }
  }

  const isAlreadyFounded = !!greenhouse?.founding_patron_id;
  const fundingGoalCents: number = greenhouse?.funding_goal_cents ?? 0;
  const fundedCents: number = greenhouse?.funded_cents ?? 0;
  const fundPct = fundingGoalCents > 0 ? (fundedCents / fundingGoalCents) * 100 : 0;

  const provenanceToken = greenhouse?.provenance_token ?? null;
  const ledger: ProvenanceLedgerEntry[] = parseLedger(provenanceToken?.provenance_ledger);
  const tokenId: number = provenanceToken?.id ?? 1;

  const founderHandle = greenhouse?.founder_handle ?? null;
  const founderFromYear = greenhouse?.founder_from_year ?? null;
  const founderToYear = greenhouse?.founder_to_year ?? null;
  const foundingYears: number | null =
    founderFromYear != null && founderToYear != null
      ? founderToYear - founderFromYear
      : null;

  const headerTitle = mode === 'fund' ? 'fund a greenhouse' : (greenhouse?.name ?? 'greenhouse').toLowerCase();

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backBtnText, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.headerPrompt, { color: c.accent }]}>{'> '}</Text>
          <Text style={[styles.headerTitle, { color: c.text }]} numberOfLines={1}>
            {headerTitle}
          </Text>
          {loading && <BlinkingCursor />}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={[styles.separator, { color: c.border }]}>{'────────────────────────────────'}</Text>

        {loading && (
          <ActivityIndicator color={c.accent} style={{ marginTop: 20 }} />
        )}

        {!loading && greenhouse && mode === 'view' && (
          <>
            {/* Location and description */}
            {greenhouse.location && (
              <Text style={[styles.location, { color: c.muted }]}>{greenhouse.location}</Text>
            )}
            {greenhouse.description ? (
              <Text style={[styles.description, { color: c.text }]}>{greenhouse.description}</Text>
            ) : null}

            <Text style={[styles.separator, { color: c.border }]}>{'────────────────────────────────'}</Text>

            {/* Status */}
            <Text style={[styles.statusLine, { color: c.text }]}>
              {'STATUS: '}
              <Text style={{ color: c.accent }}>{'OPEN'}</Text>
            </Text>
            {founderHandle && (
              <Text style={[styles.founderLine, { color: c.muted }]}>
                {`Founded by @${founderHandle}`}
                {foundingYears != null ? ` · ${foundingYears}-year term` : ''}
                {founderToYear != null ? ` · ends ${founderToYear}` : ''}
              </Text>
            )}

            {/* Provenance token */}
            {provenanceToken && (
              <>
                <Text style={[styles.separator, { color: c.border }]}>{'────────────────────────────────'}</Text>
                <Text style={[styles.sectionHeader, { color: c.muted }]}>{'PROVENANCE'}</Text>
                <Text style={[styles.separator, { color: c.border }]}>{'────────────────────────────────'}</Text>
                <ProvenanceTokenCard
                  greenhouseName={greenhouse.name ?? ''}
                  greenhouseLocation={greenhouse.location ?? ''}
                  ledger={ledger}
                  tokenId={tokenId}
                />
              </>
            )}
          </>
        )}

        {!loading && greenhouse && mode === 'fund' && (
          <>
            {/* Success state */}
            {successInfo && (
              <>
                <Text style={[styles.successLine, { color: c.text }]}>
                  {'OK: greenhouse founded_'}
                </Text>
                <Text style={[styles.successMeta, { color: c.muted }]}>
                  {`    ${successInfo.name} · ${successInfo.years}-year term`}
                </Text>
                <Text style={[styles.successMeta, { color: c.muted }]}>
                  {'    Provenance token minted.'}
                </Text>
                <Text style={[styles.separator, { color: c.border }]}>{'────────────────────────────────'}</Text>
              </>
            )}

            {/* Already funded notice */}
            {isAlreadyFounded && !successInfo && (
              <Text style={[styles.mutedNotice, { color: c.muted }]}>
                {'This greenhouse has been founded.'}
              </Text>
            )}

            {/* Fund form */}
            {!isAlreadyFounded && !successInfo && (
              <>
                <Text style={[styles.ghName, { color: c.text }]}>
                  {(greenhouse.name ?? '').toUpperCase()}
                </Text>
                {greenhouse.description ? (
                  <Text style={[styles.description, { color: c.muted }]}>
                    {greenhouse.description}
                  </Text>
                ) : null}

                <Text style={[styles.goalLine, { color: c.muted }]}>
                  {`Funding goal: ${fmtCents(fundingGoalCents)}`}
                </Text>
                <ProgressBar percent={fundPct} accentColor={c.accent} borderColor={c.border} />
                <Text style={[styles.fundedLine, { color: c.muted }]}>
                  {`${fmtCents(fundedCents)} raised · ${Math.round(fundPct)}%`}
                </Text>

                <Text style={[styles.separator, { color: c.border }]}>{'────────────────────────────────'}</Text>
                <Text style={[styles.sectionHeader, { color: c.muted }]}>{'FOUNDING TERM'}</Text>
                <Text style={[styles.termNote, { color: c.muted }]}>
                  {'Minimum 3 years. You become the founding\npatron for your chosen term. Your name\nexists only on the platform record.'}
                </Text>

                <View style={styles.yearOptions}>
                  {YEAR_OPTIONS.map(yr => {
                    const isSelected = selectedYears === yr;
                    return (
                      <TouchableOpacity
                        key={yr}
                        style={[
                          styles.yearRow,
                          { borderColor: isSelected ? c.accent : c.border },
                        ]}
                        onPress={() => setSelectedYears(yr)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.yearRowText, { color: isSelected ? c.accent : c.text }]}>
                          {`> found for ${yr} years`}
                        </Text>
                        <Text style={[styles.yearRowAmount, { color: isSelected ? c.accent : c.muted }]}>
                          {`${fmtCents(fundingGoalCents)}_`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.termNote, { color: c.muted }]}>
                  {'Note: price is the same regardless of term.'}
                </Text>

                <Text style={[styles.separator, { color: c.border }]}>{'────────────────────────────────'}</Text>

                {selectedYears != null && (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.confirmRow,
                        { borderColor: c.accent, opacity: funding ? 0.6 : 1 },
                      ]}
                      onPress={handleFund}
                      disabled={funding}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.confirmText, { color: c.accent }]}>
                        {funding ? '…' : '> CONFIRM FOUNDING_'}
                      </Text>
                    </TouchableOpacity>
                    <Text style={[styles.termSmall, { color: c.muted }]}>
                      {'Annual · paid in full · irrevocable.'}
                    </Text>
                  </>
                )}
              </>
            )}
          </>
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
  sectionHeader: { fontFamily: fonts.dmMono, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' },

  location: { fontFamily: fonts.dmMono, fontSize: 12 },
  description: { fontFamily: fonts.dmMono, fontSize: 12, lineHeight: 18 },
  statusLine: { fontFamily: fonts.dmMono, fontSize: 12, letterSpacing: 1 },
  founderLine: { fontFamily: fonts.dmMono, fontSize: 11 },

  ghName: { fontFamily: fonts.dmMono, fontSize: 13, letterSpacing: 1 },
  goalLine: { fontFamily: fonts.dmMono, fontSize: 11, marginTop: 4 },
  fundedLine: { fontFamily: fonts.dmMono, fontSize: 11 },
  termNote: { fontFamily: fonts.dmMono, fontSize: 11, lineHeight: 17 },
  termSmall: { fontFamily: fonts.dmMono, fontSize: 11 },

  progressTrack: {
    height: 4,
    borderRadius: 2,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressFill: { height: '100%', borderRadius: 2 },

  yearOptions: { gap: 4 },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
  },
  yearRowText: { fontFamily: fonts.dmMono, fontSize: 12 },
  yearRowAmount: { fontFamily: fonts.dmMono, fontSize: 12 },

  confirmRow: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  confirmText: { fontFamily: fonts.dmMono, fontSize: 13, letterSpacing: 1 },

  successLine: { fontFamily: fonts.dmMono, fontSize: 13, letterSpacing: 1 },
  successMeta: { fontFamily: fonts.dmMono, fontSize: 12 },

  mutedNotice: { fontFamily: fonts.dmMono, fontSize: 12 },
});
